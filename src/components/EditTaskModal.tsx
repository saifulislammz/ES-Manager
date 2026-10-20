import React, { useState, useEffect } from 'react';
import { User, Task, TaskPriority } from '../types';
import { api } from '../services/api';
import { 
  X, 
  Save, 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Check,
  Edit3
} from 'lucide-react';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  users: User[];
  onTaskUpdated: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  users,
  onTaskUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setSelectedUsers(task.assigned_to);
      setDeadlineDate(task.deadline_date);
      setDeadlineTime(task.deadline_time);
      setPriority(task.priority);
      setError(null);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const toggleUser = (username: string) => {
    setSelectedUsers(prev => 
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const selectAllUsers = () => {
    const userNames = users.filter(u => u.role === 'user').map(u => u.username);
    if (selectedUsers.length === userNames.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(userNames);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('কাজের শিরোনাম আবশ্যক (Task title is required)');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('কমপক্ষে একজন ব্যবহারকারী নির্বাচন করুন (Select at least one user)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateTask({
        taskId: task.id,
        title: title.trim(),
        description: description.trim(),
        assignedTo: selectedUsers,
        deadlineDate,
        deadlineTime,
        priority,
      });

      onTaskUpdated();
      onClose();
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('টাস্ক আপডেটে সমস্যা হয়েছে');
      }
    } finally {
      setLoading(false);
    }
  };

  const generalUsers = users.filter(u => u.role === 'user');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">কাজ সম্পাদনা ও পরিমার্জন করুন</h3>
              <p className="text-xs text-slate-500">টাস্কের বিবরণ, ডেডলাইন বা নিয়োজিত ইউজার পরিবর্তন করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              কাজের শিরোনাম (Task Title) *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="কাজের শিরোনাম লিখুন"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              কাজের বিবরণ (Task Description)
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="কাজের বিস্তারিত তথ্য..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors resize-none"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Assign To (Multi-user selector) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>কাকে কাজ দিচ্ছেন? (Assign To Users) *</span>
              </label>
              {generalUsers.length > 1 && (
                <button
                  type="button"
                  onClick={selectAllUsers}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold underline"
                >
                  {selectedUsers.length === generalUsers.length ? 'সব আনচেক করুন' : 'সবাইকে নির্বাচন করুন'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
              {generalUsers.map((u) => {
                const isSelected = selectedUsers.includes(u.username);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.username)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">@{u.username}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-1.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>ডেডলাইন তারিখ (Deadline Date) *</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>ডেডলাইন সময় (Deadline Time) *</span>
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              গুরুত্ব (Priority)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                const labels: Record<TaskPriority, string> = {
                  low: 'স্বাভাবিক (Low)',
                  medium: 'মধ্যম (Medium)',
                  high: 'জরুরি (High)',
                };
                const activeColors: Record<TaskPriority, string> = {
                  low: 'bg-slate-200 border-slate-400 text-slate-800 shadow-sm',
                  medium: 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm',
                  high: 'bg-rose-100 border-rose-400 text-rose-800 shadow-sm',
                };
                const defaultColors: Record<TaskPriority, string> = {
                  low: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                  medium: 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50/50',
                  high: 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50/50',
                };

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      priority === p ? activeColors[p] : defaultColors[p]
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2 disabled:opacity-60 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
