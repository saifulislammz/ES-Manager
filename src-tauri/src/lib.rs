pub mod commands;
pub mod db;
pub mod models;
pub mod ntfy;
pub mod turso;
pub mod updater;

use commands::*;
use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));

            let db_path = app_data_dir.join("es_manager.db");

            let conn = init_db(db_path).expect("Failed to initialize SQLite database");

            let ntfy_topic = db::get_app_settings(&conn)
                .map(|s| s.ntfy_topic)
                .unwrap_or_else(|_| "es_manager_tasks_channel".to_string());

            let db_state = DbState {
                conn: Mutex::new(conn),
            };

            app.manage(db_state);

            let app_handle = app.handle().clone();
            ntfy::spawn_ntfy_listener(app_handle, ntfy_topic);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            create_user,
            get_users,
            create_task,
            get_tasks,
            update_task_status,
            update_task,
            delete_task,
            get_settings,
            save_settings,
            sync_now,
            send_test_notification,
            update_profile,
            admin_update_user,
            admin_delete_user,
            check_for_updates,
            apply_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
