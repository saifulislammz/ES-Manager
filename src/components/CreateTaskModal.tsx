import React, { useState } from 'react';
import { User, Task, TaskPriority } from '../types';
import { api } from '../services/api';
import { 
  X, 
  Send, 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Check 
} from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onTaskCreated: (task: Task) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const today = new Date().toISOString().split('T')[0];
  const [deadlineDate, setDeadlineDate] = useState(today);
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      const task = await api.createTask({
        title: title.trim(),
        description: description.trim(),
        assignedTo: selectedUsers,
        assignedBy: currentUser.username,
        deadlineDate,
        deadlineTime,
        priority,
      });

      onTaskCreated(task);
      setTitle('');
      setDescription('');
      setSelectedUsers([]);
      onClose();
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('টাস্ক তৈরিতে সমস্যা হয়েছে');
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">নতুন কাজ এসাইন করুন</h3>
              <p className="text-xs text-slate-500">এক বা একাধিক ইউজারকে ডেডলাইন সহ কাজ দিন</p>
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
              placeholder="যেমন: ক্লায়েন্ট ইনভয়েস জেনারেট ও চেক করা"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              কাজের বিবরণ (Task Description / Details)
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="কাজের বিস্তারিত বিবরণ বা প্রয়োজনীয় লিংক..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors resize-none"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Assign To (Multi-user selector) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>কাকে কাজ দিচ্ছেন? (Assign To Users) *</span>
              </label>
              {generalUsers.length > 1 && (
                <button
                  type="button"
                  onClick={selectAllUsers}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold underline"
                >
                  {selectedUsers.length === generalUsers.length ? 'সব আনচেক করুন' : 'সবাইকে নির্বাচন করুন'}
                </button>
              )}
            </div>

            {generalUsers.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                এখনও কোনো ইউজার তৈরি করা হয়নি। প্রথমে ইউজার ম্যানেজমেন্ট থেকে ইউজার তৈরি করুন।
              </div>
            ) : (
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
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">@{u.username}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-1.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1.5">
              নির্বাচিত: <strong className="text-emerald-700">{selectedUsers.length} জন</strong>
            </p>
          </div>

          {/* Date Picker & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>ডেডলাইন তারিখ (Deadline Date) *</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                min={today}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>ডেডলাইন সময় (Deadline Time) *</span>
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
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

          {/* Action buttons */}
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
              disabled={loading || generalUsers.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-2 disabled:opacity-60 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'পাঠানো হচ্ছে...' : 'কাজ এসাইন ও সেন্ড করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
