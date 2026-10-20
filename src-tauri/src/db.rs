use crate::models::{AppSettings, Task, User};
use chrono::Utc;
use rusqlite::{params, Connection, Result};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

const PASSWORD_SALT: &str = "es_manager_secure_salt_2026";

pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", password, PASSWORD_SALT).as_bytes());
    hex::encode(hasher.finalize())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let computed = hash_password(password);
    computed == hash
}

pub fn init_db(db_path: PathBuf) -> Result<Connection> {
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let conn = Connection::open(db_path)?;

    // Enable WAL mode for high concurrency & speed
    let _ = conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

    // Create users table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
            created_at TEXT NOT NULL
        );",
        [],
    )?;

    // Create tasks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
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
            updated_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
        );",
        [],
    )?;

    // Create settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
        [],
    )?;

    // Create high-performance indexes
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
         CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_date);
         CREATE INDEX IF NOT EXISTS idx_tasks_synced ON tasks(synced);
         CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);"
    )?;

    // Seed default admin if no users exist
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users;", [], |row| row.get(0))?;
    if user_count == 0 {
        let admin_id = uuid::Uuid::new_v4().to_string();
        let admin_hash = hash_password("admin123");
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5);",
            params![admin_id, "admin", admin_hash, "admin", now],
        )?;
    }

    // Set default ntfy topic if not set
    let ntfy_topic: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'ntfy_topic';",
            [],
            |r| r.get(0),
        )
        .ok();

    if ntfy_topic.is_none() {
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('ntfy_topic', 'es_manager_tasks_channel');",
            [],
        )?;
    }

    Ok(conn)
}

// User Operations
pub fn create_user(conn: &Connection, username: &str, password: &str, role: &str) -> Result<User> {
    let id = uuid::Uuid::new_v4().to_string();
    let password_hash = hash_password(password);
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5);",
        params![id, username, password_hash, role, now],
    )?;

    Ok(User {
        id,
        username: username.to_string(),
        password_hash,
        role: role.to_string(),
        created_at: now,
    })
}

pub fn authenticate_user(conn: &Connection, username: &str, password: &str) -> Result<Option<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?1;",
    )?;

    let mut rows = stmt.query(params![username])?;
    if let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let uname: String = row.get(1)?;
        let stored_hash: String = row.get(2)?;
        let role: String = row.get(3)?;
        let created_at: String = row.get(4)?;

        if verify_password(password, &stored_hash) {
            return Ok(Some(User {
                id,
                username: uname,
                password_hash: stored_hash,
                role,
                created_at,
            }));
        }
    }
    Ok(None)
}

pub fn get_all_users(conn: &Connection) -> Result<Vec<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, username, password_hash, role, created_at FROM users ORDER BY created_at ASC;",
    )?;
    let user_iter = stmt.query_map([], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            role: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    let mut users = Vec::new();
    for u in user_iter {
        users.push(u?);
    }
    Ok(users)
}

pub fn get_user_by_id(conn: &Connection, id: &str) -> Result<Option<User>> {
    let mut stmt = conn.prepare(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?1;",
    )?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(User {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            role: row.get(3)?,
            created_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn verify_user_password(conn: &Connection, user_id: &str, password: &str) -> Result<bool> {
    let mut stmt = conn.prepare("SELECT password_hash FROM users WHERE id = ?1;")?;
    let mut rows = stmt.query(params![user_id])?;
    if let Some(row) = rows.next()? {
        let stored_hash: String = row.get(0)?;
        Ok(verify_password(password, &stored_hash))
    } else {
        Ok(false)
    }
}

pub fn update_user_credentials(
    conn: &Connection,
    user_id: &str,
    new_username: Option<&str>,
    new_password: Option<&str>,
) -> std::result::Result<User, String> {
    let user = get_user_by_id(conn, user_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "ব্যবহারকারী খুঁজে পাওয়া যায়নি (User not found)".to_string())?;

    let old_username = user.username.clone();
    let mut updated_username = old_username.clone();

    // 1. Username update
    if let Some(new_u) = new_username {
        let trimmed_new_u = new_u.trim();
        if trimmed_new_u.is_empty() {
            return Err("ইউজারনেম খালি হতে পারে না (Username cannot be empty)".into());
        }

        if !trimmed_new_u.eq_ignore_ascii_case(&old_username) {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(?1) AND id != ?2;",
                    params![trimmed_new_u, user_id],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;

            if count > 0 {
                return Err("এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হচ্ছে (Username already taken)".into());
            }

            conn.execute(
                "UPDATE users SET username = ?1 WHERE id = ?2;",
                params![trimmed_new_u, user_id],
            )
            .map_err(|e| e.to_string())?;

            // Cascade username changes in tasks table (assigned_to JSON)
            let mut stmt = conn
                .prepare("SELECT id, assigned_to FROM tasks;")
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    let id: String = row.get(0)?;
                    let assigned_to_str: String = row.get(1)?;
                    Ok((id, assigned_to_str))
                })
                .map_err(|e| e.to_string())?;

            let mut tasks_to_update = Vec::new();
            for item in rows {
                if let Ok((id, json_str)) = item {
                    if let Ok(mut list) = serde_json::from_str::<Vec<String>>(&json_str) {
                        let mut changed = false;
                        for name in list.iter_mut() {
                            if name.eq_ignore_ascii_case(&old_username) {
                                *name = trimmed_new_u.to_string();
                                changed = true;
                            }
                        }
                        if changed {
                            tasks_to_update.push((id, serde_json::to_string(&list).unwrap_or(json_str)));
                        }
                    }
                }
            }

            for (tid, new_json) in tasks_to_update {
                let _ = conn.execute(
                    "UPDATE tasks SET assigned_to = ?1, synced = 0 WHERE id = ?2;",
                    params![new_json, tid],
                );
            }

            // Cascade username changes in assigned_by
            let _ = conn.execute(
                "UPDATE tasks SET assigned_by = ?1, synced = 0 WHERE LOWER(assigned_by) = LOWER(?2);",
                params![trimmed_new_u, old_username],
            );

            updated_username = trimmed_new_u.to_string();
        }
    }

    // 2. Password update
    if let Some(new_p) = new_password {
        let trimmed_new_p = new_p.trim();
        if !trimmed_new_p.is_empty() {
            if trimmed_new_p.len() < 4 {
                return Err("পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে (Password must be at least 4 characters)".into());
            }
            let new_hash = hash_password(trimmed_new_p);
            conn.execute(
                "UPDATE users SET password_hash = ?1 WHERE id = ?2;",
                params![new_hash, user_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(User {
        id: user.id,
        username: updated_username,
        password_hash: String::new(),
        role: user.role,
        created_at: user.created_at,
    })
}

pub fn delete_user_by_id(conn: &Connection, user_id: &str) -> std::result::Result<(), String> {
    let user = get_user_by_id(conn, user_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "ব্যবহারকারী খুঁজে পাওয়া যায়নি (User not found)".to_string())?;

    if user.role == "admin" {
        let admin_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users WHERE role = 'admin';", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if admin_count <= 1 {
            return Err("একমাত্র অ্যাডমিন অ্যাকাউন্টটি মুছে ফেলা যাবে না (Cannot delete the only admin)".into());
        }
    }

    conn.execute("DELETE FROM users WHERE id = ?1;", params![user_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Task Operations
pub fn create_task(conn: &Connection, task: &Task) -> Result<()> {
    let assigned_to_json = serde_json::to_string(&task.assigned_to).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO tasks (id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at, synced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12);",
        params![
            task.id,
            task.title,
            task.description,
            assigned_to_json,
            task.assigned_by,
            task.deadline_date,
            task.deadline_time,
            task.status,
            task.priority,
            task.created_at,
            task.updated_at,
            if task.synced { 1 } else { 0 },
        ],
    )?;
    Ok(())
}

pub fn get_tasks(conn: &Connection, for_user: Option<&str>) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at, synced FROM tasks ORDER BY created_at DESC;",
    )?;

    let task_iter = stmt.query_map([], |row| {
        let assigned_to_str: String = row.get(3)?;
        let assigned_to: Vec<String> = serde_json::from_str(&assigned_to_str).unwrap_or_default();
        let synced_int: i32 = row.get(11)?;

        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            assigned_to,
            assigned_by: row.get(4)?,
            deadline_date: row.get(5)?,
            deadline_time: row.get(6)?,
            status: row.get(7)?,
            priority: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            synced: synced_int == 1,
        })
    })?;

    let mut tasks = Vec::new();
    for t in task_iter {
        let task = t?;
        if let Some(username) = for_user {
            // Check if user is in assigned_to list
            if task.assigned_to.iter().any(|u| u.eq_ignore_ascii_case(username)) {
                tasks.push(task);
            }
        } else {
            tasks.push(task);
        }
    }
    Ok(tasks)
}

pub fn update_task_status(conn: &Connection, task_id: &str, new_status: &str) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = ?2, synced = 0 WHERE id = ?3;",
        params![new_status, now, task_id],
    )?;
    Ok(())
}

pub fn update_task(
    conn: &Connection,
    task_id: &str,
    title: &str,
    description: &str,
    assigned_to: &[String],
    deadline_date: &str,
    deadline_time: &str,
    priority: &str,
) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    let assigned_to_json = serde_json::to_string(assigned_to).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "UPDATE tasks SET 
            title = ?1, 
            description = ?2, 
            assigned_to = ?3, 
            deadline_date = ?4, 
            deadline_time = ?5, 
            priority = ?6, 
            updated_at = ?7, 
            synced = 0 
         WHERE id = ?8;",
        params![
            title,
            description,
            assigned_to_json,
            deadline_date,
            deadline_time,
            priority,
            now,
            task_id
        ],
    )?;
    Ok(())
}

pub fn delete_task(conn: &Connection, task_id: &str) -> Result<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1;", params![task_id])?;
    Ok(())
}

pub fn get_unsynced_tasks(conn: &Connection) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at, synced FROM tasks WHERE synced = 0;",
    )?;

    let task_iter = stmt.query_map([], |row| {
        let assigned_to_str: String = row.get(3)?;
        let assigned_to: Vec<String> = serde_json::from_str(&assigned_to_str).unwrap_or_default();
        let synced_int: i32 = row.get(11)?;

        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            assigned_to,
            assigned_by: row.get(4)?,
            deadline_date: row.get(5)?,
            deadline_time: row.get(6)?,
            status: row.get(7)?,
            priority: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            synced: synced_int == 1,
        })
    })?;

    let mut tasks = Vec::new();
    for t in task_iter {
        tasks.push(t?);
    }
    Ok(tasks)
}

pub fn mark_task_synced(conn: &Connection, task_id: &str) -> Result<()> {
    conn.execute("UPDATE tasks SET synced = 1 WHERE id = ?1;", params![task_id])?;
    Ok(())
}

pub fn upsert_remote_task(conn: &Connection, task: &Task) -> Result<()> {
    let assigned_to_json = serde_json::to_string(&task.assigned_to).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO tasks (id, title, description, assigned_to, assigned_by, deadline_date, deadline_time, status, priority, created_at, updated_at, synced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            assigned_to = excluded.assigned_to,
            deadline_date = excluded.deadline_date,
            deadline_time = excluded.deadline_time,
            status = excluded.status,
            priority = excluded.priority,
            updated_at = excluded.updated_at,
            synced = 1;",
        params![
            task.id,
            task.title,
            task.description,
            assigned_to_json,
            task.assigned_by,
            task.deadline_date,
            task.deadline_time,
            task.status,
            task.priority,
            task.created_at,
            task.updated_at,
        ],
    )?;
    Ok(())
}

// Settings Operations
pub fn get_app_settings(conn: &Connection) -> Result<AppSettings> {
    let mut turso_url = String::new();
    let mut turso_token = String::new();
    let mut ntfy_topic = "es_manager_tasks_channel".to_string();
    let mut github_repo = "saifulislammz/ES-Manager".to_string();
    let mut github_token = String::new();

    let mut stmt = conn.prepare("SELECT key, value FROM settings;")?;
    let rows = stmt.query_map([], |row| {
        let k: String = row.get(0)?;
        let v: String = row.get(1)?;
        Ok((k, v))
    })?;

    for r in rows {
        if let Ok((k, v)) = r {
            match k.as_str() {
                "turso_url" => turso_url = v,
                "turso_token" => turso_token = v,
                "ntfy_topic" => ntfy_topic = v,
                "github_repo" => github_repo = v,
                "github_token" => github_token = v,
                _ => {}
            }
        }
    }

    if github_token.trim().is_empty() {
        github_token = "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".to_string();
    }

    Ok(AppSettings {
        turso_url,
        turso_token,
        ntfy_topic,
        github_repo,
        github_token,
        admin_configured: true,
    })
}

pub fn save_app_settings(
    conn: &Connection,
    turso_url: &str,
    turso_token: &str,
    ntfy_topic: &str,
    github_repo: &str,
    github_token: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('turso_url', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1;",
        params![turso_url],
    )?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('turso_token', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1;",
        params![turso_token],
    )?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('ntfy_topic', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1;",
        params![ntfy_topic],
    )?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('github_repo', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1;",
        params![github_repo],
    )?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('github_token', ?1) ON CONFLICT(key) DO UPDATE SET value = ?1;",
        params![github_token],
    )?;
    Ok(())
}
