import React from 'react';
import { User } from '../types';
import { 
  LogOut, 
  Settings, 
  ShieldCheck, 
  User as UserIcon, 
  RefreshCw, 
  Cloud, 
  CloudOff 
} from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenProfile,
  onOpenSettings,
  onSync,
  isSyncing,
  isOnline,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-sm">
      {/* Brand logo & title */}
      <div className="flex items-center space-x-3">
        <img
          src="/app-icon.svg"
          alt="ES Logo"
          className="w-9 h-9 rounded-xl shadow-md shadow-emerald-600/20 object-contain"
        />
        <div>
          <h1 className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-2">
            ES-Manager
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              v1.0 Light
            </span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {user.role === 'admin' ? 'অ্যাডমিন ড্যাশবোর্ড' : 'ইউজার ড্যাশবোর্ড'}
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center space-x-3">
        {/* Sync Status Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          title={isOnline ? "Turso ক্লাউডের সাথে সিঙ্ক করুন" : "অফলাইন মোড (ক্লিক করে পুনরায় সিঙ্ক চেষ্টা করুন)"}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : isOnline ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className="hidden md:inline">
            {isSyncing ? 'সিঙ্ক হচ্ছে...' : isOnline ? 'Turso অনলাইন' : 'অফলাইন মোড'}
          </span>
        </button>

        {/* User Info & Profile Button */}
        <button
          type="button"
          onClick={onOpenProfile}
          title="প্রোফাইল ও পাসওয়ার্ড পরিবর্তন করতে ক্লিক করুন"
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-all cursor-pointer group text-left"
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {user.role === 'admin' ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block leading-tight group-hover:text-emerald-700 transition-colors">
              {user.username}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              {user.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'} • প্রোফাইল
            </span>
          </div>
        </button>

        {/* Settings Button (Available to both Admin and User) */}
        <button
          onClick={onOpenSettings}
          title={user.role === 'admin' ? "সেটিংস ও ইন্টিগ্রেশন" : "সফটওয়্যার আপডেট ও সেটিংস"}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="লগআউট"
          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
