use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String, // "admin" or "user"
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafeUser {
    pub id: String,
    pub username: String,
    pub role: String,
    pub created_at: String,
}

impl From<User> for SafeUser {
    fn from(u: User) -> Self {
        SafeUser {
            id: u.id,
            username: u.username,
            role: u.role,
            created_at: u.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub assigned_to: Vec<String>, // Usernames
    pub assigned_by: String,      // Admin username
    pub deadline_date: String,    // YYYY-MM-DD
    pub deadline_time: String,    // HH:MM
    pub status: String,           // "pending", "in_progress", "completed"
    pub priority: String,         // "low", "medium", "high"
    pub created_at: String,
    pub updated_at: String,
    pub synced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub turso_url: String,
    pub turso_token: String,
    pub ntfy_topic: String,
    pub github_repo: String,
    pub admin_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
    pub published_at: Option<String>,
    pub file_size: Option<u64>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProgressPayload {
    pub percent: f64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub pushed_tasks: usize,
    pub pulled_tasks: usize,
    pub is_online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NtfyEventPayload {
    pub event_type: String, // "TASK_ASSIGNED" | "STATUS_CHANGED"
    pub task_id: String,
    pub title: String,
    pub assigned_to: Option<Vec<String>>,
    pub assigned_by: Option<String>,
    pub deadline_date: Option<String>,
    pub deadline_time: Option<String>,
    pub user: Option<String>,
    pub new_status: Option<String>,
}
