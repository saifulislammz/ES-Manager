export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string[]; // usernames
  assigned_by: string;   // admin username
  deadline_date: string; // YYYY-MM-DD
  deadline_time: string; // HH:MM
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface AppSettings {
  turso_url: string;
  turso_token: string;
  ntfy_topic: string;
  github_repo: string;
  admin_configured: boolean;
}

export interface UpdateCheckResult {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  download_url?: string;
  release_notes?: string;
  published_at?: string;
  file_size?: number;
  message: string;
}

export interface UpdateProgressPayload {
  percent: number;
  downloaded_bytes: number;
  total_bytes: number;
  status: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  pushed_tasks: number;
  pulled_tasks: number;
  is_online: boolean;
}

export interface NtfyEventPayload {
  event_type: 'TASK_ASSIGNED' | 'STATUS_CHANGED' | 'TASK_UPDATED' | 'TEST_NOTIFICATION';
  task_id: string;
  title: string;
  assigned_to?: string[];
  assigned_by?: string;
  deadline_date?: string;
  deadline_time?: string;
  user?: string;
  new_status?: string;
}
