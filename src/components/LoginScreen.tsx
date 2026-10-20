import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { Shield, User as UserIcon, Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [username, setUsername] = useState(role === 'admin' ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    if (newRole === 'admin') {
      setUsername('admin');
    } else {
      setUsername('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('ইউজারনেম এবং পাসওয়ার্ড দিন');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await api.login(username.trim(), password.trim());
      if (role === 'admin' && user.role !== 'admin') {
        setError('এই অ্যাকাউন্টটির অ্যাডমিন সুবিধা নেই। অনুগ্রহ করে ইউজার হিসেবে লগইন করুন।');
        setLoading(false);
        return;
      }
      onLoginSuccess(user);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Decorative subtle ambient circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[480px] h-[320px] bg-emerald-100/60 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/3 w-[360px] h-[240px] bg-teal-100/40 blur-[80px] pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding with new custom logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/app-icon.svg"
            alt="ES-Manager Logo"
            className="w-16 h-16 rounded-2xl shadow-xl shadow-emerald-600/25 mb-4 object-contain"
          />
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            ES-Manager
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            হাই-পারফরম্যান্স পোর্টেবল টাস্ক ম্যানেজমেন্ট সফটওয়্যার
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('user')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                role === 'user'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>User Login</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-600 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ব্যবহারকারীর নাম (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'admin' ? 'admin' : 'ব্যবহারকারীর নাম লিখুন'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 mt-2"
            >
              <span>{loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
