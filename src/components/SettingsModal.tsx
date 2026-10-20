import React, { useState, useEffect } from 'react';
import { AppSettings, SyncResult } from '../types';
import { api } from '../services/api';
import { 
  X, 
  Settings, 
  Cloud, 
  Bell, 
  Save, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (result: SyncResult) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    turso_url: '',
    turso_token: '',
    ntfy_topic: 'es_manager_tasks_channel',
    github_repo: 'saiful/ES-Manager',
    admin_configured: true,
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingNtfy, setTestingNtfy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await api.saveSettings({
        tursoUrl: settings.turso_url.trim(),
        tursoToken: settings.turso_token.trim(),
        ntfyTopic: settings.ntfy_topic.trim() || 'es_manager_tasks_channel',
        githubRepo: settings.github_repo.trim() || 'saiful/ES-Manager',
      });
      setStatusMessage({ text: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (err: unknown) {
      setStatusMessage({ text: 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে: ' + String(err), isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setStatusMessage(null);
    try {
      const res = await api.syncNow();
      setStatusMessage({
        text: res.message,
        isError: !res.success,
      });
      if (onSyncComplete) onSyncComplete(res);
    } catch (err: unknown) {
      setStatusMessage({ text: 'সিঙ্ক ব্যর্থ: ' + String(err), isError: true });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestNtfy = async () => {
    setTestingNtfy(true);
    setStatusMessage(null);
    try {
      const msg = await api.sendTestNotification();
      setStatusMessage({ text: msg });
    } catch (err: unknown) {
      setStatusMessage({ text: 'নোটিফিকেশন পাঠানো যায়নি: ' + String(err), isError: true });
    } finally {
      setTestingNtfy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">সফটওয়্যার সেটিংস ও ইন্টিগ্রেশন</h3>
              <p className="text-xs text-slate-500">Turso ক্লাউড ডাটাবেস ও ntfy.sh পুশ নোটিফিকেশন কনফিগার করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center space-x-2 animate-in fade-in ${
            statusMessage.isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {statusMessage.isError ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 mt-5">
          {/* Turso Cloud Database */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Turso ক্লাউড ডাটাবেস (turso.tech)
                </h4>
              </div>
              <a
                href="https://turso.tech"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-600 hover:underline flex items-center space-x-1 font-semibold"
              >
                <span>turso.tech</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              ডাটা ইউজার ও অ্যাডমিনের কম্পিউটারে সম্পূর্ণ অফলাইনে সেভ থাকবে এবং ইন্টারনেট সংযোগ থাকলে ক্লাউডে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Turso Database URL
              </label>
              <input
                type="text"
                value={settings.turso_url}
                onChange={(e) => setSettings({ ...settings, turso_url: e.target.value })}
                placeholder="https://your-db-org.turso.io"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Turso Auth Token
              </label>
              <input
                type="password"
                value={settings.turso_token}
                onChange={(e) => setSettings({ ...settings, turso_token: e.target.value })}
                placeholder="eyJhbGciOi..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই ক্লাউড সিঙ্ক করুন'}</span>
              </button>
            </div>
          </div>

          {/* ntfy.sh Real-time Notifications */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-teal-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  ntfy.sh পুশ নোটিফিকেশন চ্যানেল
                </h4>
              </div>
              <a
                href="https://ntfy.sh"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-600 hover:underline flex items-center space-x-1 font-semibold"
              >
                <span>ntfy.sh</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500">
              টাস্ক এসাইন ও স্ট্যাটাস চেঞ্জের রিয়েলটাইম পুশ ও উইন্ডোজ ডেস্কটপ নোটিফিকেশন পাঠাতে ব্যবহৃত হয়।
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                ntfy Topic Name (টপিক নাম)
              </label>
              <input
                type="text"
                value={settings.ntfy_topic}
                onChange={(e) => setSettings({ ...settings, ntfy_topic: e.target.value })}
                placeholder="es_manager_tasks_channel"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleTestNtfy}
                disabled={testingNtfy}
                className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingNtfy ? 'পাঠানো হচ্ছে...' : 'উইন্ডোজ টেস্ট নোটিফিকেশন পাঠান'}</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              বন্ধ করুন
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 disabled:opacity-60 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
