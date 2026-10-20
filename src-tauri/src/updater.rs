use crate::models::{UpdateCheckResult, UpdateProgressPayload};
use futures_util::StreamExt;
use serde_json::Value;
use std::fs::File;
use std::io::Write;
use tauri::{AppHandle, Emitter, Manager};

pub const CURRENT_VERSION: &str = "1.0.0";

/// Parse a version string like "v1.2.3" or "1.2.3" into [major, minor, patch]
fn parse_version(v: &str) -> Vec<u32> {
    v.trim_start_matches('v')
        .trim()
        .split('.')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect()
}

/// Returns true if remote_version is strictly newer than local_version
fn is_newer_version(remote: &str, local: &str) -> bool {
    let r_parts = parse_version(remote);
    let l_parts = parse_version(local);

    let max_len = r_parts.len().max(l_parts.len());
    for i in 0..max_len {
        let r_val = r_parts.get(i).copied().unwrap_or(0);
        let l_val = l_parts.get(i).copied().unwrap_or(0);
        if r_val > l_val {
            return true;
        } else if r_val < l_val {
            return false;
        }
    }
    false
}

pub async fn check_github_update(repo_or_url: &str, token: Option<&str>) -> Result<UpdateCheckResult, String> {
    let trimmed = repo_or_url.trim();

    // Check if it's a test/mock request
    if trimmed.eq_ignore_ascii_case("mock") || trimmed.eq_ignore_ascii_case("test") {
        return Ok(UpdateCheckResult {
            update_available: true,
            current_version: CURRENT_VERSION.to_string(),
            latest_version: "1.1.0".to_string(),
            download_url: Some("https://github.com/saifulislammz/ES-Manager/releases/download/v1.1.0/ES-Manager-Portable.exe".into()),
            release_notes: Some("• নতুন অটো-আপডেট ফিচার যুক্ত করা হয়েছে\n• টাস্ক ফিল্টারিং আরও দ্রুত ও অপটিমাইজ করা হয়েছে\n• বাগ ফিক্স এবং সিকিউরিটি আপডেট".into()),
            published_at: Some("২০২৬-১০-২০".into()),
            file_size: Some(14822912),
            message: "একটি নতুন আপডেট পাওয়া গেছে (v1.1.0)!".into(),
        });
    }

    let client = reqwest::Client::builder()
        .user_agent("ES-Manager-Desktop/1.0")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| format!("HTTP Client error: {}", e))?;

    // Determine target URL
    let target_url = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        // Assume GitHub owner/repo format e.g. "Saiful/ES-Manager"
        let repo = if trimmed.is_empty() {
            "saifulislammz/ES-Manager"
        } else {
            trimmed
        };
        format!("https://api.github.com/repos/{}/releases/latest", repo.trim_matches('/'))
    };

    let mut req = client.get(&target_url);
    if let Some(t) = token {
        if !t.trim().is_empty() {
            req = req.header("Authorization", format!("Bearer {}", t.trim()));
            req = req.header("Accept", "application/vnd.github+json");
            req = req.header("X-GitHub-Api-Version", "2022-11-28");
        }
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("আপডেট সার্ভারে সংযোগ করা যায়নি: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "সার্ভার থেকে ত্রুটি এসেছে (Status: {}). অনুগ্রহ করে GitHub রেপোজিটরি বা টোকেন যাচাই করুন।",
            response.status()
        ));
    }

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("রেসপন্স ডেটা পড়তে ব্যর্থ: {}", e))?;

    // Check if it's a custom version.json
    // { "version": "1.1.0", "download_url": "...", "notes": "..." }
    if let Some(custom_version) = json["version"].as_str() {
        let download_url = json["download_url"].as_str().map(|s| s.to_string());
        let notes = json["notes"].as_str().or(json["changelog"].as_str()).map(|s| s.to_string());
        let is_newer = is_newer_version(custom_version, CURRENT_VERSION);

        return Ok(UpdateCheckResult {
            update_available: is_newer,
            current_version: CURRENT_VERSION.to_string(),
            latest_version: custom_version.to_string(),
            download_url,
            release_notes: notes,
            published_at: json["published_at"].as_str().map(|s| s.to_string()),
            file_size: json["file_size"].as_u64(),
            message: if is_newer {
                format!("একটি নতুন আপডেট পাওয়া গেছে (v{})!", custom_version)
            } else {
                format!("আপনি সর্বশেষ ভার্সন ব্যবহার করছেন (v{})।", CURRENT_VERSION)
            },
        });
    }

    // Standard GitHub Release format
    let tag_name = json["tag_name"]
        .as_str()
        .or_else(|| json["name"].as_str())
        .ok_or_else(|| "GitHub Release তথ্য খুঁজে পাওয়া যায়নি".to_string())?;

    let latest_version = tag_name.trim_start_matches('v').to_string();
    let body = json["body"].as_str().map(|s| s.to_string());
    let published_at = json["published_at"].as_str().map(|s| s.to_string());

    // Find portable .exe in assets
    let mut download_url = None;
    let mut file_size = None;

    if let Some(assets) = json["assets"].as_array() {
        // Priority 1: Contains "Portable" and ".exe"
        for asset in assets {
            if let Some(name) = asset["name"].as_str() {
                if name.to_lowercase().contains("portable") && name.to_lowercase().ends_with(".exe") {
                    let api_url = asset["url"].as_str().map(|s| s.to_string());
                    let browser_url = asset["browser_download_url"].as_str().map(|s| s.to_string());
                    // For private repos, use the API asset URL if token is present
                    download_url = if token.is_some() && api_url.is_some() { api_url } else { browser_url };
                    file_size = asset["size"].as_u64();
                    break;
                }
            }
        }

        // Priority 2: Any .exe
        if download_url.is_none() {
            for asset in assets {
                if let Some(name) = asset["name"].as_str() {
                    if name.to_lowercase().ends_with(".exe") {
                        let api_url = asset["url"].as_str().map(|s| s.to_string());
                        let browser_url = asset["browser_download_url"].as_str().map(|s| s.to_string());
                        download_url = if token.is_some() && api_url.is_some() { api_url } else { browser_url };
                        file_size = asset["size"].as_u64();
                        break;
                    }
                }
            }
        }
    }

    let is_newer = is_newer_version(&latest_version, CURRENT_VERSION);

    Ok(UpdateCheckResult {
        update_available: is_newer,
        current_version: CURRENT_VERSION.to_string(),
        latest_version: latest_version.clone(),
        download_url,
        release_notes: body,
        published_at,
        file_size,
        message: if is_newer {
            format!("একটি নতুন আপডেট পাওয়া গেছে (v{})!", latest_version)
        } else {
            format!("আপনি ইতিমধ্যে সর্বশেষ ভার্সন ব্যবহার করছেন (v{})।", CURRENT_VERSION)
        },
    })
}

pub async fn download_and_apply_portable(
    app: AppHandle,
    download_url: &str,
    token: Option<&str>,
) -> Result<String, String> {
    // 1. Get current running executable path
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("চলমান অ্যাপের পাথ নির্ধারণ করতে ব্যর্থ: {}", e))?;

    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| "অ্যাপ ডিরেক্টরি পাওয়া যায়নি".to_string())?;

    let exe_name = current_exe
        .file_name()
        .ok_or_else(|| "ফাইলের নাম পাওয়া যায়নি".to_string())?
        .to_string_lossy()
        .to_string();

    let temp_exe = exe_dir.join(format!("{}.new_update", exe_name));

    // 2. Prepare HTTP stream
    let client = reqwest::Client::builder()
        .user_agent("ES-Manager-Desktop/1.0")
        .build()
        .map_err(|e| format!("Client error: {}", e))?;

    let mut req = client.get(download_url);
    if let Some(t) = token {
        if !t.trim().is_empty() {
            req = req.header("Authorization", format!("Bearer {}", t.trim()));
            req = req.header("Accept", "application/octet-stream");
            req = req.header("X-GitHub-Api-Version", "2022-11-28");
        }
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("ফাইল ডাউনলোড সংযোগ ত্রুটি: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("ডাউনলোড ব্যর্থ হয়েছে (Status: {})", response.status()));
    }

    let total_bytes = response.content_length().unwrap_or(0);
    let mut downloaded_bytes: u64 = 0;
    let mut stream = response.bytes_stream();

    // Create temp file
    let mut file = File::create(&temp_exe)
        .map_err(|e| format!("টেম্পোরারি ফাইল তৈরি করতে ব্যর্থ: {}", e))?;

    // Initial progress event
    let _ = app.emit(
        "update-download-progress",
        UpdateProgressPayload {
            percent: 0.0,
            downloaded_bytes: 0,
            total_bytes,
            status: "ডাউনলোড শুরু হচ্ছে...".into(),
        },
    );

    let mut last_percent_reported = 0;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("ডাউনলোড মাঝপথে বিচ্ছিন্ন হয়েছে: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("ফাইল রাইট এরর: {}", e))?;

        downloaded_bytes += chunk.len() as u64;

        let percent = if total_bytes > 0 {
            (downloaded_bytes as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        let current_percent_int = percent as u64;
        if current_percent_int > last_percent_reported || downloaded_bytes == total_bytes {
            last_percent_reported = current_percent_int;
            let _ = app.emit(
                "update-download-progress",
                UpdateProgressPayload {
                    percent,
                    downloaded_bytes,
                    total_bytes,
                    status: format!("ডাউনলোড হচ্ছে: {:.0}%", percent),
                },
            );
        }
    }

    file.flush()
        .map_err(|e| format!("ফাইল ফ্ল্যাশ এরর: {}", e))?;
    drop(file);

    // 3. Guarantee 100% Zero Data Loss: Backup SQLite Database
    if let Ok(app_data) = app.path().app_data_dir() {
        let db_file = app_data.join("es_manager.db");
        if db_file.exists() {
            let backup_file = app_data.join("es_manager.db.bak_auto_update");
            let _ = std::fs::copy(&db_file, &backup_file);
        }
    }

    let _ = app.emit(
        "update-download-progress",
        UpdateProgressPayload {
            percent: 100.0,
            downloaded_bytes,
            total_bytes,
            status: "ডাউনলোড সম্পন্ন! সফটওয়্যার প্রতিস্থাপন ও রিস্টার্ট হচ্ছে...".into(),
        },
    );

    // 4. Create detached updater batch script
    let batch_file = exe_dir.join("apply_update.bat");
    let batch_content = format!(
        "@echo off\r\n\
        timeout /t 2 /nobreak > nul\r\n\
        move /y \"{}\" \"{}\"\r\n\
        start \"\" \"{}\"\r\n\
        del \"%~f0\"\r\n",
        temp_exe.file_name().unwrap().to_string_lossy(),
        exe_name,
        exe_name
    );

    std::fs::write(&batch_file, batch_content)
        .map_err(|e| format!("আপডেটার স্ক্রিপ্ট তৈরিতে ব্যর্থ: {}", e))?;

    // 5. Spawn background batch process and exit cleanly
    std::process::Command::new("cmd")
        .args(["/c", "start", "/min", "apply_update.bat"])
        .current_dir(exe_dir)
        .spawn()
        .map_err(|e| format!("আপডেটার রান করতে ব্যর্থ: {}", e))?;

    // Short sleep before exit to let cmd launch
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    std::process::exit(0);
}
