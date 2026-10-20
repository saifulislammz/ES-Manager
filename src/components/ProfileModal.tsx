import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { 
  X, 
  User as UserIcon, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onProfileUpdated: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [username, setUsername] = useState(currentUser.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('ইউজারনেম খালি হতে পারে না (Username is required)');
      return;
    }

    const trimmedNewPassword = newPassword.trim();
    const isChangingPassword = trimmedNewPassword.length > 0;

    if (isChangingPassword) {
      if (!currentPassword.trim()) {
        setError('পাসওয়ার্ড পরিবর্তনের জন্য বর্তমান পাসওয়ার্ড প্রদান করুন');
        return;
      }
      if (trimmedNewPassword.length < 4) {
        setError('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে');
        return;
      }
      if (trimmedNewPassword !== confirmPassword.trim()) {
        setError('নতুন পাসওয়ার্ড দুটি মিলছে না');
        return;
      }
    } else if (trimmedUsername === currentUser.username) {
      setError('কোনো পরিবর্তন করা হয়নি');
      return;
    }

    setLoading(true);

    try {
      const updated = await api.updateProfile({
        userId: currentUser.id,
        currentPassword: isChangingPassword ? currentPassword.trim() : undefined,
        newUsername: trimmedUsername !== currentUser.username ? trimmedUsername : undefined,
        newPassword: isChangingPassword ? trimmedNewPassword : undefined,
      });

      setSuccess('প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
      onProfileUpdated(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('প্রোফাইল আপডেট করতে সমস্যা হয়েছে');
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 flex flex-col space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isAdmin ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                প্রোফাইল ও পাসওয়ার্ড পরিবর্তন
              </h3>
              <p className="text-xs text-slate-500">
                আপনার ইউজারনেম এবং লগইন পাসওয়ার্ড পরিবর্তন করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Username */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              ইউজারনেম (Username)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="নতুন ইউজারনেম লিখুন"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              ইউজারনেম পরিবর্তন করলে আপনার পূর্বের কাজের তথ্য স্বয়ংক্রিয়ভাবে আপডেট হবে।
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold mb-3">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>পাসওয়ার্ড পরিবর্তন (ঐচ্ছিক)</span>
            </div>

            {/* Current Password */}
            <div className="mb-3">
              <label className="block font-medium text-slate-600 mb-1">
                বর্তমান পাসওয়ার্ড (Current Password)
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label className="block font-medium text-slate-600 mb-1">
                নতুন পাসওয়ার্ড (New Password)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="নতুন গোপন পাসওয়ার্ড (কমপক্ষে ৪ অক্ষর)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ডটি লিখুন"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
