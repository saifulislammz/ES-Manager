import { Task } from '../types';

export interface UrgencyInfo {
  text: string;
  badgeClass: string;
  isOverdue: boolean;
  isToday: boolean;
}

export function getTaskUrgency(task: Task): UrgencyInfo {
  if (task.status === 'completed') {
    return {
      text: 'সম্পন্ন',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isOverdue: false,
      isToday: false,
    };
  }

  if (!task.deadline_date) {
    return {
      text: 'কোনো ডেডলাইন নেই',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      isOverdue: false,
      isToday: false,
    };
  }

  const now = new Date();
  const deadlineStr = task.deadline_time 
    ? `${task.deadline_date}T${task.deadline_time}:00`
    : `${task.deadline_date}T23:59:59`;
  
  const deadline = new Date(deadlineStr);

  // If invalid date fallback
  if (isNaN(deadline.getTime())) {
    return {
      text: task.deadline_date,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      isOverdue: false,
      isToday: false,
    };
  }

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineMidnight = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const diffDays = Math.round((deadlineMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (deadline < now) {
    return {
      text: 'মেয়াদ শেষ',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
      isOverdue: true,
      isToday: diffDays === 0,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'আজকে শেষ',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
      isOverdue: false,
      isToday: true,
    };
  }

  if (diffDays === 1) {
    return {
      text: 'আগামীকাল',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
      isOverdue: false,
      isToday: false,
    };
  }

  return {
    text: `${diffDays} দিন বাকি`,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
    isOverdue: false,
    isToday: false,
  };
}
