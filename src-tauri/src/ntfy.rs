use crate::models::NtfyEventPayload;
use eventsource_stream::Eventsource;
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue};
use serde_json::Value;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt;

pub async fn publish_ntfy(
    topic: &str,
    title: &str,
    message: &str,
    priority: &str,
    tags: &str,
    payload: &NtfyEventPayload,
) -> Result<(), String> {
    if topic.trim().is_empty() {
        return Ok(());
    }

    let url = format!("https://ntfy.sh/{}", topic.trim());
    let client = reqwest::Client::new();

    let mut headers = HeaderMap::new();
    if let Ok(v) = HeaderValue::from_str(title) {
        headers.insert("Title", v);
    }
    if let Ok(v) = HeaderValue::from_str(priority) {
        headers.insert("Priority", v);
    }
    if let Ok(v) = HeaderValue::from_str(tags) {
        headers.insert("Tags", v);
    }

    let body = serde_json::to_string(payload).unwrap_or_else(|_| message.to_string());

    match client.post(&url).headers(headers).body(body).send().await {
        Ok(res) => {
            if res.status().is_success() {
                Ok(())
            } else {
                Err(format!("ntfy responded with status: {}", res.status()))
            }
        }
        Err(e) => Err(format!("ntfy request failed: {}", e)),
    }
}

pub fn spawn_ntfy_listener(app_handle: AppHandle, topic: String) {
    if topic.trim().is_empty() {
        return;
    }

    tauri::async_runtime::spawn(async move {
        let stream_url = format!("https://ntfy.sh/{}/sse", topic.trim());
        log::info!("Connecting to ntfy SSE stream: {}", stream_url);

        loop {
            let client = reqwest::Client::new();
            match client.get(&stream_url).send().await {
                Ok(response) => {
                    let mut stream = response.bytes_stream().eventsource();

                    while let Some(event_result) = stream.next().await {
                        match event_result {
                            Ok(event) => {
                                if event.event == "message" {
                                    if let Ok(parsed) = serde_json::from_str::<Value>(&event.data) {
                                        let message_text = parsed["message"].as_str().unwrap_or("");
                                        if let Ok(payload) = serde_json::from_str::<NtfyEventPayload>(message_text) {
                                            // Emit to frontend window
                                            let _ = app_handle.emit("ntfy-event", &payload);

                                            // Trigger Native Windows Desktop Notification via notify-rust and Tauri
                                            match payload.event_type.as_str() {
                                                "TASK_ASSIGNED" => {
                                                    let body = payload.title.clone();

                                                    let _ = notify_rust::Notification::new()
                                                        .appname("ES-Manager")
                                                        .summary("কাজ অ্যাসাইন করা হয়েছে")
                                                        .body(&body)
                                                        .show();

                                                    let _ = app_handle.notification()
                                                        .builder()
                                                        .title("কাজ অ্যাসাইন করা হয়েছে")
                                                        .body(&body)
                                                        .show();
                                                }
                                                "STATUS_CHANGED" => {
                                                    let user = payload.user.as_deref().unwrap_or("User");
                                                    let status = payload.new_status.as_deref().unwrap_or("Updated");
                                                    let status_bn = match status {
                                                        "pending" => "পেন্ডিং",
                                                        "in_progress" => "চলমান",
                                                        "completed" => "সম্পন্ন",
                                                        other => other,
                                                    };
                                                    let body = format!("{} স্ট্যাটাস পরিবর্তন করেছেন: {}", user, status_bn);

                                                    let _ = notify_rust::Notification::new()
                                                        .appname("ES-Manager")
                                                        .summary(&format!("⚡ টাস্ক আপডেট: {}", payload.title))
                                                        .body(&body)
                                                        .show();

                                                    let _ = app_handle.notification()
                                                        .builder()
                                                        .title(&format!("⚡ টাস্ক আপডেট: {}", payload.title))
                                                        .body(&body)
                                                        .show();
                                                }
                                                "TASK_UPDATED" => {
                                                    let body = format!("টাস্কটি পরিমার্জন করা হয়েছে: {}", payload.title);
                                                    let _ = notify_rust::Notification::new()
                                                        .appname("ES-Manager")
                                                        .summary("✏️ কাজ আপডেট করা হয়েছে")
                                                        .body(&body)
                                                        .show();
                                                }
                                                "TEST_NOTIFICATION" => {
                                                    let _ = notify_rust::Notification::new()
                                                        .appname("ES-Manager")
                                                        .summary("🔔 ES-Manager টেস্ট নোটিফিকেশন")
                                                        .body("অভিনন্দন! আপনার উইন্ডোজ ডেক্সটপ নোটিফিকেশন সঠিকভাবে কাজ করছে।")
                                                        .show();
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                log::warn!("ntfy SSE stream error: {}", e);
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("ntfy SSE connection failed: {}, retrying in 5s...", e);
                }
            }

            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    });
}
