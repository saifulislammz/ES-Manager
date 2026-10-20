import { invoke } from '@tauri-apps/api/core';
import { User, Task, AppSettings, SyncResult, UserRole, TaskPriority, UpdateCheckResult } from '../types';

export const api = {
  // Authentication
  login: async (username: string, password: string): Promise<User> => {
    return await invoke<User>('login', { username, password });
  },

  // Users
  createUser: async (username: string, password: string, role: UserRole): Promise<User> => {
    return await invoke<User>('create_user', { username, password, role });
  },

  getUsers: async (): Promise<User[]> => {
    return await invoke<User[]>('get_users');
  },

  updateProfile: async (params: {
    userId: string;
    currentPassword?: string;
    newUsername?: string;
    newPassword?: string;
  }): Promise<User> => {
    return await invoke<User>('update_profile', {
      userId: params.userId,
      currentPassword: params.currentPassword || null,
      newUsername: params.newUsername || null,
      newPassword: params.newPassword || null,
    });
  },

  adminUpdateUser: async (params: {
    userId: string;
    newUsername?: string;
    newPassword?: string;
  }): Promise<User> => {
    return await invoke<User>('admin_update_user', {
      userId: params.userId,
      newUsername: params.newUsername || null,
      newPassword: params.newPassword || null,
    });
  },

  adminDeleteUser: async (userId: string): Promise<void> => {
    await invoke('admin_delete_user', { userId });
  },

  // Tasks
  createTask: async (params: {
    title: string;
    description: string;
    assignedTo: string[];
    assignedBy: string;
    deadlineDate: string;
    deadlineTime: string;
    priority: TaskPriority;
  }): Promise<Task> => {
    return await invoke<Task>('create_task', {
      title: params.title,
      description: params.description,
      assignedTo: params.assignedTo,
      assignedBy: params.assignedBy,
      deadlineDate: params.deadlineDate,
      deadlineTime: params.deadlineTime,
      priority: params.priority,
    });
  },

  getTasks: async (forUser?: string): Promise<Task[]> => {
    return await invoke<Task[]>('get_tasks', { forUser: forUser || null });
  },

  updateTaskStatus: async (
    taskId: string,
    newStatus: string,
    username: string,
    taskTitle: string
  ): Promise<void> => {
    await invoke('update_task_status', {
      taskId,
      newStatus,
      username,
      taskTitle,
    });
  },

  updateTask: async (params: {
    taskId: string;
    title: string;
    description: string;
    assignedTo: string[];
    deadlineDate: string;
    deadlineTime: string;
    priority: TaskPriority;
  }): Promise<void> => {
    await invoke('update_task', {
      taskId: params.taskId,
      title: params.title,
      description: params.description,
      assignedTo: params.assignedTo,
      deadlineDate: params.deadlineDate,
      deadlineTime: params.deadlineTime,
      priority: params.priority,
    });
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await invoke('delete_task', { taskId });
  },

  // Settings & Sync
  getSettings: async (): Promise<AppSettings> => {
    return await invoke<AppSettings>('get_settings');
  },

  saveSettings: async (settings: {
    tursoUrl: string;
    tursoToken: string;
    ntfyTopic: string;
    githubRepo: string;
    githubToken: string;
  }): Promise<void> => {
    await invoke('save_settings', {
      tursoUrl: settings.tursoUrl,
      tursoToken: settings.tursoToken,
      ntfyTopic: settings.ntfyTopic,
      githubRepo: settings.githubRepo,
      githubToken: settings.githubToken,
    });
  },

  syncNow: async (): Promise<SyncResult> => {
    return await invoke<SyncResult>('sync_now');
  },

  sendTestNotification: async (): Promise<string> => {
    return await invoke<string>('send_test_notification');
  },

  // Software Update
  checkForUpdates: async (): Promise<UpdateCheckResult> => {
    return await invoke<UpdateCheckResult>('check_for_updates');
  },

  applyUpdate: async (downloadUrl: string): Promise<string> => {
    return await invoke<string>('apply_update', { downloadUrl });
  },
};
