use crate::db::{get_unsynced_tasks, mark_task_synced, upsert_remote_task};
use crate::models::{SyncResult, Task};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct TursoStatement {
    sql: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    args: Vec<serde_json::Value>,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum TursoRequest {
    #[serde(rename = "execute")]
    Execute { stmt: TursoStatement },
    #[serde(rename = "close")]
    Close,
}

#[derive(Serialize)]
struct TursoPipelineBody {
    requests: Vec<TursoRequest>,
}

#[derive(Deserialize, Debug)]
struct TursoResponse {
    results: Option<Vec<TursoResult>>,
}

#[derive(Deserialize, Debug)]
struct TursoResult {
    response: Option<TursoExecuteResponse>,
}

#[derive(Deserialize, Debug)]
struct TursoExecuteResponse {
    result: Option<TursoQueryResult>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct TursoQueryResult {
    cols: Option<Vec<TursoCol>>,
    rows: Option<Vec<Vec<serde_json::Value>>>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct TursoCol {
    name: String,
}

fn normalize_turso_url(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches('/');
    if trimmed.starts_with("libsql://") {
        format!("https://{}", &trimmed[9..])
    } else if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        format!("https://{}", trimmed)
    } else {
        trimmed.to_string()
    }
}

pub async fn sync_with_turso(
    conn: &std::sync::Mutex<Connection>,
    turso_url: &str,
    turso_token: &str,
) -> SyncResult {
    if turso_url.trim().is_empty() {
        return SyncResult {
            success: true,
            message: "Local mode: Turso URL not configured".to_string(),
            pushed_tasks: 0,
            pulled_tasks: 0,
            is_online: false,
        };
    }

    let base_url = normalize_turso_url(turso_url);
    let pipeline_url = format!("{}/v2/pipeline", base_url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build();

    let client = match client {
        Ok(c) => c,
        Err(e) => {
            return SyncResult {
                success: false,
                message: format!("HTTP Client init error: {}", e),
                pushed_tasks: 0,
                pulled_tasks: 0,
                is_online: false,
            };
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    if !turso_token.trim().is_empty() {
        if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", turso_token.trim())) {
            headers.insert(AUTHORIZATION, val);
        }
    }

    // 1. Ensure remote tables exist
    let init_sql = "CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_to TEXT NOT NULL,
        assigned_by TEXT NOT NULL,
        deadline_date TEXT NOT NULL,
        deadline_time TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );";

    let init_req = TursoPipelineBody {
        requests: vec![
            TursoRequest::Execute {
                stmt: TursoStatement {
                    sql: init_sql.to_string(),
                    args: vec![],
                },
            },
            TursoRequest::Close,
        ],
    };

    let init_res = client
        .post(&pipeline_url)
        .headers(headers.clone())
        .json(&init_req)
        .send()
        .await;

    if let Err(e) = init_res {
        return SyncResult {
            success: false,
            message: format!("Offline / Connection error to Turso: {}", e),
            pushed_tasks: 0,
            pulled_tasks: 0,
            is_online: false,
        };
    }

    // 2. Push unsynced tasks to Turso
    let unsynced_tasks = {
        let lock = match conn.lock() {
            Ok(l) => l,
            Err(_) => {
                return SyncResult {
                    success: false,
                    message: "Database lock error".to_string(),
                    pushed_tasks: 0,
                    pulled_tasks: 0,
                    is_online: true,
                };
            }
        };
        get_unsynced_tasks(&lock).unwrap_or_default()
    };

    let mut pushed_count = 0;
    for task in &unsynced_tasks {
        let assigned_to_json = serde_json::to_string(&task.assigned_to).unwrap_or_else(|_| "[]".to_string());
        let upsert_sql = "INSERT INTO tasks (id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                assigned_to = excluded.assigned_to,
                deadline_date = excluded.deadline_date,
                deadline_time = excluded.deadline_time,
                status = excluded.status,
                priority = excluded.priority,
                updated_at = excluded.updated_at;";

        let args = vec![
            serde_json::Value::String(task.id.clone()),
            serde_json::Value::String(task.title.clone()),
            serde_json::Value::String(task.description.clone()),
            serde_json::Value::String(assigned_to_json),
            serde_json::Value::String(task.assigned_by.clone()),
            serde_json::Value::String(task.deadline_date.clone()),
            serde_json::Value::String(task.deadline_time.clone()),
            serde_json::Value::String(task.status.clone()),
            serde_json::Value::String(task.priority.clone()),
            serde_json::Value::String(task.created_at.clone()),
            serde_json::Value::String(task.updated_at.clone()),
        ];

        let push_req = TursoPipelineBody {
            requests: vec![
                TursoRequest::Execute {
                    stmt: TursoStatement {
                        sql: upsert_sql.to_string(),
                        args,
                    },
                },
                TursoRequest::Close,
            ],
        };

        if let Ok(res) = client
            .post(&pipeline_url)
            .headers(headers.clone())
            .json(&push_req)
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(lock) = conn.lock() {
                    let _ = mark_task_synced(&lock, &task.id);
                    pushed_count += 1;
                }
            }
        }
    }

    // 3. Pull tasks from Turso
    let pull_req = TursoPipelineBody {
        requests: vec![
            TursoRequest::Execute {
                stmt: TursoStatement {
                    sql: "SELECT id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at FROM tasks;".to_string(),
                    args: vec![],
                },
            },
            TursoRequest::Close,
        ],
    };

    let mut pulled_count = 0;
    if let Ok(res) = client
        .post(&pipeline_url)
        .headers(headers)
        .json(&pull_req)
        .send()
        .await
    {
        if res.status().is_success() {
            if let Ok(turso_res) = res.json::<TursoResponse>().await {
                if let Some(results) = turso_res.results {
                    if let Some(first) = results.into_iter().next() {
                        if let Some(exec) = first.response {
                            if let Some(q_res) = exec.result {
                                if let Some(rows) = q_res.rows {
                                    if let Ok(lock) = conn.lock() {
                                        for row in rows {
                                            if row.len() >= 11 {
                                                let id = row[0].as_str().unwrap_or("").to_string();
                                                let title = row[1].as_str().unwrap_or("").to_string();
                                                let desc = row[2].as_str().unwrap_or("").to_string();
                                                let assigned_str = row[3].as_str().unwrap_or("[]");
                                                let assigned_to: Vec<String> = serde_json::from_str(assigned_str).unwrap_or_default();
                                                let assigned_by = row[4].as_str().unwrap_or("").to_string();
                                                let deadline_date = row[5].as_str().unwrap_or("").to_string();
                                                let deadline_time = row[6].as_str().unwrap_or("").to_string();
                                                let status = row[7].as_str().unwrap_or("pending").to_string();
                                                let priority = row[8].as_str().unwrap_or("medium").to_string();
                                                let created_at = row[9].as_str().unwrap_or("").to_string();
                                                let updated_at = row[10].as_str().unwrap_or("").to_string();

                                                let task = Task {
                                                    id,
                                                    title,
                                                    description: desc,
                                                    assigned_to,
                                                    assigned_by,
                                                    deadline_date,
                                                    deadline_time,
                                                    status,
                                                    priority,
                                                    created_at,
                                                    updated_at,
                                                    synced: true,
                                                };
                                                if upsert_remote_task(&lock, &task).is_ok() {
                                                    pulled_count += 1;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    SyncResult {
        success: true,
        message: format!("Sync complete: {} pushed, {} pulled/synced", pushed_count, pulled_count),
        pushed_tasks: pushed_count,
        pulled_tasks: pulled_count,
        is_online: true,
    }
}
