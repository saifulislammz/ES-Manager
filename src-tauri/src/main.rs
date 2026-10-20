// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let timestamp = chrono::Local::now().to_rfc3339();
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let msg = format!(
            "[{}] CRASH / PANIC DETECTED:\nError: {}\nLocation: {}\nOS: Windows\n\n",
            timestamp, payload, location
        );

        // 1. Try writing to AppData first (always writable on Windows)
        if let Some(appdata) = std::env::var_os("APPDATA") {
            let log_dir = std::path::PathBuf::from(appdata).join("com.esmanager.desktop");
            let _ = std::fs::create_dir_all(&log_dir);
            let log_file = log_dir.join("crash.log");
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(log_file)
            {
                use std::io::Write;
                let _ = file.write_all(msg.as_bytes());
            }
        }

        // 2. Also try writing to current directory if writable
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("crash.log")
            .and_then(|mut f| {
                use std::io::Write;
                f.write_all(msg.as_bytes())
            });
    }));

    es_manager_lib::run();
}
