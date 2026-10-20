use crate::db::{
    authenticate_user, create_task as db_create_task, create_user as db_create_user,
    delete_task as db_delete_task, delete_user_by_id, get_all_users, get_app_settings,
    get_tasks as db_get_tasks, save_app_settings, update_task_status as db_update_task_status,
    update_user_credentials, verify_user_password, DbState,
};
use crate::models::{AppSettings, NtfyEventPayload, SafeUser, SyncResult, Task, UpdateCheckResult};
use crate::ntfy::publish_ntfy;
use crate::turso::sync_with_turso;
use crate::updater::{check_github_update, download_and_apply_portable};
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn login(
    state: State<'_, DbState>,
    username: String,
    password: String,
) -> Result<SafeUser, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match authenticate_user(&conn, &username, &password) {
        Ok(Some(user)) => Ok(user.into()),
        Ok(None) => Err("ভুল ব্যবহারকারীর নাম অথবা পাসওয়ার্ড (Invalid username or password)".into()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

#[tauri::command]
pub fn create_user(
    state: State<'_, DbState>,
    username: String,
    password: String,
    role: String,
) -> Result<SafeUser, String> {
    if username.trim().is_empty() || password.trim().is_empty() {
        return Err("ব্যবহারকারীর নাম এবং পাসওয়ার্ড আবশ্যক (Username and password are required)".into());
    }
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    match db_create_user(&conn, username.trim(), password.trim(), &role) {
        Ok(user) => Ok(user.into()),
        Err(e) => {
            if e.to_string().contains("UNIQUE") {
                Err("এই ব্যবহারকারীর নামটি ইতিমধ্যে বিদ্যমান (Username already exists)".into())
            } else {
                Err(format!("Error creating user: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn get_users(state: State<'_, DbState>) -> Result<Vec<SafeUser>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let users = get_all_users(&conn).map_err(|e| e.to_string())?;
    Ok(users.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn create_task(
    state: State<'_, DbState>,
    title: String,
    description: String,
    assigned_to: Vec<String>,
    assigned_by: String,
    deadline_date: String,
    deadline_time: String,
    priority: String,
) -> Result<Task, String> {
    if title.trim().is_empty() {
        return Err("কাজের শিরোনাম আবশ্যক (Task title is required)".into());
    }
    if assigned_to.is_empty() {
        return Err("কমপক্ষে একজন ব্যবহারকারী নির্বাচন করুন (Select at least one user)".into());
    }

    let now = Utc::now().to_rfc3339();
    let task = Task {
        id: Uuid::new_v4().to_string(),
        title: title.trim().to_string(),
        description: description.trim().to_string(),
        assigned_to: assigned_to.clone(),
        assigned_by: assigned_by.clone(),
        deadline_date: deadline_date.clone(),
        deadline_time: deadline_time.clone(),
        status: "pending".to_string(),
        priority: if priority.is_empty() { "medium".to_string() } else { priority },
        created_at: now.clone(),
        updated_at: now,
        synced: false,
    };

    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db_create_task(&conn, &task).map_err(|e| e.to_string())?;
        get_app_settings(&conn).unwrap_or(AppSettings {
            turso_url: String::new(),
            turso_token: String::new(),
            ntfy_topic: "es_manager_tasks_channel".into(),
            github_repo: "saifulislammz/ES-Manager".into(),
            admin_configured: true,
        })
    };

    // Publish to ntfy in background
    let payload = NtfyEventPayload {
        event_type: "TASK_ASSIGNED".to_string(),
        task_id: task.id.clone(),
        title: task.title.clone(),
        assigned_to: Some(assigned_to),
        assigned_by: Some(assigned_by),
        deadline_date: Some(deadline_date),
        deadline_time: Some(deadline_time),
        user: None,
        new_status: None,
    };

    let topic = settings.ntfy_topic.clone();
    tauri::async_runtime::spawn(async move {
        let _ = publish_ntfy(
            &topic,
            "কাজ অ্যাসাইন করা হয়েছে",
            &payload.title,
            "high",
            "",
            &payload,
        ).await;
    });

    // Auto-sync to Turso if configured
    if !settings.turso_url.trim().is_empty() {
        let conn_ref = &state.conn;
        let _ = sync_with_turso(conn_ref, &settings.turso_url, &settings.turso_token).await;
    }

    Ok(task)
}

#[tauri::command]
pub fn get_tasks(
    state: State<'_, DbState>,
    for_user: Option<String>,
) -> Result<Vec<Task>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let tasks = db_get_tasks(&conn, for_user.as_deref()).map_err(|e| e.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub async fn update_task_status(
    state: State<'_, DbState>,
    task_id: String,
    new_status: String,
    username: String,
    task_title: String,
) -> Result<(), String> {
    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db_update_task_status(&conn, &task_id, &new_status).map_err(|e| e.to_string())?;
        get_app_settings(&conn).unwrap_or(AppSettings {
            turso_url: String::new(),
            turso_token: String::new(),
            ntfy_topic: "es_manager_tasks_channel".into(),
            github_repo: "saifulislammz/ES-Manager".into(),
            admin_configured: true,
        })
    };

    // Publish to ntfy
    let payload = NtfyEventPayload {
        event_type: "STATUS_CHANGED".to_string(),
        task_id,
        title: task_title.clone(),
        assigned_to: None,
        assigned_by: None,
        deadline_date: None,
        deadline_time: None,
        user: Some(username.clone()),
        new_status: Some(new_status.clone()),
    };

    let topic = settings.ntfy_topic.clone();
    tauri::async_runtime::spawn(async move {
        let _ = publish_ntfy(
            &topic,
            "⚡ টাস্ক স্ট্যাটাস আপডেট (Task Updated)",
            &format!("{} marked '{}' as {}", username, task_title, new_status),
            "default",
            "bell,check",
            &payload,
        ).await;
    });

    // Auto-sync to Turso
    if !settings.turso_url.trim().is_empty() {
        let conn_ref = &state.conn;
        let _ = sync_with_turso(conn_ref, &settings.turso_url, &settings.turso_token).await;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_task(state: State<'_, DbState>, task_id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db_delete_task(&conn, &task_id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<'_, DbState>) -> Result<AppSettings, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    get_app_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, DbState>,
    turso_url: String,
    turso_token: String,
    ntfy_topic: String,
    github_repo: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    save_app_settings(&conn, &turso_url, &turso_token, &ntfy_topic, &github_repo).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn sync_now(state: State<'_, DbState>) -> Result<SyncResult, String> {
    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        get_app_settings(&conn).map_err(|e| e.to_string())?
    };

    let result = sync_with_turso(&state.conn, &settings.turso_url, &settings.turso_token).await;
    Ok(result)
}

#[tauri::command]
pub async fn update_task(
    state: State<'_, DbState>,
    task_id: String,
    title: String,
    description: String,
    assigned_to: Vec<String>,
    deadline_date: String,
    deadline_time: String,
    priority: String,
) -> Result<(), String> {
    if title.trim().is_empty() {
        return Err("কাজের শিরোনাম আবশ্যক (Task title is required)".into());
    }
    if assigned_to.is_empty() {
        return Err("কমপক্ষে একজন ব্যবহারকারী নির্বাচন করুন (Select at least one user)".into());
    }

    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        crate::db::update_task(
            &conn,
            &task_id,
            title.trim(),
            description.trim(),
            &assigned_to,
            &deadline_date,
            &deadline_time,
            &priority,
        ).map_err(|e| e.to_string())?;

        get_app_settings(&conn).unwrap_or(AppSettings {
            turso_url: String::new(),
            turso_token: String::new(),
            ntfy_topic: "es_manager_tasks_channel".into(),
            github_repo: "saifulislammz/ES-Manager".into(),
            admin_configured: true,
        })
    };

    let payload = NtfyEventPayload {
        event_type: "TASK_UPDATED".to_string(),
        task_id: task_id.clone(),
        title: title.trim().to_string(),
        assigned_to: Some(assigned_to),
        assigned_by: None,
        deadline_date: Some(deadline_date),
        deadline_time: Some(deadline_time),
        user: None,
        new_status: None,
    };

    let topic = settings.ntfy_topic.clone();
    tauri::async_runtime::spawn(async move {
        let _ = publish_ntfy(
            &topic,
            "✏️ কাজ পরিমার্জন করা হয়েছে (Task Updated)",
            &format!("Task updated: {}", payload.title),
            "default",
            "memo,pencil",
            &payload,
        ).await;
    });

    if !settings.turso_url.trim().is_empty() {
        let conn_ref = &state.conn;
        let _ = sync_with_turso(conn_ref, &settings.turso_url, &settings.turso_token).await;
    }

    Ok(())
}

#[tauri::command]
pub async fn send_test_notification(state: State<'_, DbState>) -> Result<String, String> {
    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        get_app_settings(&conn).map_err(|e| e.to_string())?
    };

    // 1. Fire native Windows Desktop Toast immediately
    let _ = notify_rust::Notification::new()
        .appname("ES-Manager")
        .summary("🔔 ES-Manager টেস্ট নোটিফিকেশন")
        .body("অভিনন্দন! আপনার উইন্ডোজ ডেক্সটপ নোটিফিকেশন সিস্টেম সফলভাবে কাজ করছে।")
        .show();

    // 2. Publish to ntfy.sh
    let payload = NtfyEventPayload {
        event_type: "TEST_NOTIFICATION".to_string(),
        task_id: "test".into(),
        title: "ES-Manager Test Alert".into(),
        assigned_to: None,
        assigned_by: None,
        deadline_date: None,
        deadline_time: None,
        user: Some("Admin".into()),
        new_status: None,
    };

    let _ = publish_ntfy(
        &settings.ntfy_topic,
        "🔔 ES-Manager Test Notification",
        "Your real-time notification setup is working perfectly!",
        "high",
        "tada,sparkles",
        &payload,
    ).await;

    Ok("উইন্ডোজ ডেক্সটপ ও ক্লাউড নোটিফিকেশন সফলভাবে পাঠানো হয়েছে!".into())
}

#[tauri::command]
pub async fn update_profile(
    state: State<'_, DbState>,
    user_id: String,
    current_password: Option<String>,
    new_username: Option<String>,
    new_password: Option<String>,
) -> Result<SafeUser, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // If new password is provided, current password MUST be provided and verified
    if let Some(ref new_p) = new_password {
        if !new_p.trim().is_empty() {
            let cur_p = current_password.as_deref().unwrap_or("").trim();
            if cur_p.is_empty() {
                return Err("পাসওয়ার্ড পরিবর্তনের জন্য বর্তমান পাসওয়ার্ড প্রদান করুন (Current password is required)".into());
            }
            let valid = verify_user_password(&conn, &user_id, cur_p).map_err(|e| e.to_string())?;
            if !valid {
                return Err("বর্তমান পাসওয়ার্ডটি সঠিক নয় (Current password is incorrect)".into());
            }
        }
    }

    let updated = update_user_credentials(
        &conn,
        &user_id,
        new_username.as_deref(),
        new_password.as_deref(),
    )?;

    Ok(updated.into())
}

#[tauri::command]
pub async fn admin_update_user(
    state: State<'_, DbState>,
    user_id: String,
    new_username: Option<String>,
    new_password: Option<String>,
) -> Result<SafeUser, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let updated = update_user_credentials(
        &conn,
        &user_id,
        new_username.as_deref(),
        new_password.as_deref(),
    )?;
    Ok(updated.into())
}

#[tauri::command]
pub fn admin_delete_user(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    delete_user_by_id(&conn, &user_id)?;
    Ok(())
}

#[tauri::command]
pub async fn check_for_updates(state: State<'_, DbState>) -> Result<UpdateCheckResult, String> {
    let repo = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        get_app_settings(&conn)
            .map(|s| s.github_repo)
            .unwrap_or_else(|_| "saifulislammz/ES-Manager".into())
    };

    check_github_update(&repo).await
}

#[tauri::command]
pub async fn apply_update(app: tauri::AppHandle, download_url: String) -> Result<String, String> {
    download_and_apply_portable(app, &download_url).await
}


