import React, { useState, useEffect } from 'react';
import { User, AppSettings, SyncResult, UpdateCheckResult, UpdateProgressPayload } from '../types';
import { api } from '../services/api';
import { listen } from '@tauri-apps/api/event';
import { 
  ArrowLeft, 
  Cloud, 
  Bell, 
  Save, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ShieldCheck, 
  ExternalLink,
  Github,
  Laptop,
  CheckCircle,
  FileText,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onBack: () => void;
  onSyncComplete?: (result: SyncResult) => void;
}

type SettingsTab = 'update' | 'integration';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onBack,
  onSyncComplete,
}) => {
  const isAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>(isAdmin ? 'integration' : 'update');

  // Integration Settings State (Admin only)
  const [settings, setSettings] = useState<AppSettings>({
    turso_url: '',
    turso_token: '',
    ntfy_topic: 'es_manager_tasks_channel',
    github_repo: 'saifulislammz/ES-Manager',
    github_token: '',
    admin_configured: true,
  });

  const [showGithubToken, setShowGithubToken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingNtfy, setTestingNtfy] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  // Software Update State (Both Admin and User)
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateProgressPayload | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  // Listen for real-time download progress from Tauri
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        unlisten = await listen<UpdateProgressPayload>('update-download-progress', (event) => {
          setDownloadProgress(event.payload);
        });
      } catch (err) {
        console.warn('Progress listener error:', err);
      }
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setIntegrationStatus(null);

    try {
      await api.saveSettings({
        tursoUrl: settings.turso_url.trim(),
        tursoToken: settings.turso_token.trim(),
        ntfyTopic: settings.ntfy_topic.trim() || 'es_manager_tasks_channel',
        githubRepo: settings.github_repo.trim() || 'saifulislammz/ES-Manager',
        githubToken: (settings.github_token || '').trim(),
      });
      setIntegrationStatus({ text: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (err: unknown) {
      setIntegrationStatus({ text: 'সেটিংস সংরক্ষণ ব্যর্থ: ' + String(err), isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setIntegrationStatus(null);
    try {
      const res = await api.syncNow();
      setIntegrationStatus({
        text: res.message,
        isError: !res.success,
      });
      if (onSyncComplete) onSyncComplete(res);
    } catch (err: unknown) {
      setIntegrationStatus({ text: 'সিঙ্ক ব্যর্থ: ' + String(err), isError: true });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestNtfy = async () => {
    setTestingNtfy(true);
    setIntegrationStatus(null);
    try {
      const msg = await api.sendTestNotification();
      setIntegrationStatus({ text: msg });
    } catch (err: unknown) {
      setIntegrationStatus({ text: 'নোটিফিকেশন পাঠানো যায়নি: ' + String(err), isError: true });
    } finally {
      setTestingNtfy(false);
    }
  };

  // Check for updates
  const handleCheckUpdate = async (isTest = false) => {
    setCheckingUpdate(true);
    setUpdateError(null);
    setUpdateResult(null);

    try {
      if (isTest) {
        // Quick demo check
        await api.checkForUpdates().catch(() => null);
        setUpdateResult({
          update_available: true,
          current_version: "1.0.0",
          latest_version: "1.1.0",
          download_url: "mock://download-test",
          release_notes: "• নতুন ইন-অ্যাপ অটো-আপডেট ফিচার যুক্ত করা হয়েছে\n• টাস্ক ডিসপ্লে এবং ৩টি ভিউ মোড যুক্ত হয়েছে\n• দ্রুত ফিল্টারিং এবং ১০০% জিরো ডাটা লস নিশ্চিত করা হয়েছে\n• উইন্ডোজ ক্র্যাশ লগার অপটিমাইজেশন",
          published_at: "২০২৬-১০-২০",
          file_size: 14822912,
          message: "নতুন আপডেট পাওয়া গেছে (v1.1.0)!",
        });
      } else {
        const res = await api.checkForUpdates();
        setUpdateResult(res);
      }
    } catch (err: unknown) {
      setUpdateError(typeof err === 'string' ? err : String(err));
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Apply update
  const handleApplyUpdate = async () => {
    if (!updateResult?.download_url) return;

    if (updateResult.download_url.startsWith("mock://")) {
      // Simulate download progress for demo
      setDownloading(true);
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        setDownloadProgress({
          percent: p,
          downloaded_bytes: (p / 100) * 14822912,
          total_bytes: 14822912,
          status: p >= 100 
            ? 'ডাউনলোড সম্পন্ন! সফটওয়্যার প্রতিস্থাপন ও রিস্টার্ট হচ্ছে...' 
            : `ডাউনলোড হচ্ছে: ${p}%`,
        });
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            alert('সিমুলেশন টেস্ট সম্পন্ন! বাস্তব ক্ষেত্রে এই ধাপে পোর্টেবল EXE ফাইলটি স্বয়ংক্রিয়ভাবে রিপ্লেস হয়ে সফটওয়্যার রিস্টার্ট হয়।');
            setDownloading(false);
            setDownloadProgress(null);
          }, 1500);
        }
      }, 500);
      return;
    }

    setDownloading(true);
    setUpdateError(null);

    try {
      await api.applyUpdate(updateResult.download_url);
    } catch (err: unknown) {
      setUpdateError('আপডেট প্রয়োগ করতে ব্যর্থ: ' + String(err));
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shadow-sm flex items-center space-x-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ড্যাশবোর্ডে ফিরুন</span>
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              সফটওয়্যার সেটিংস
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                {user.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isAdmin 
                ? 'ক্লাউড ইন্টিগ্রেশন, নোটিফিকেশন এবং সফটওয়্যার আপডেট ম্যানেজমেন্ট' 
                : 'সফটওয়্যার ভার্সন তথ্য ও নতুন আপডেট অনুসন্ধান'}
            </p>
          </div>
        </div>

        {/* Current Version Pill */}
        <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 w-fit">
          <Laptop className="w-3.5 h-3.5 text-slate-500" />
          <span>বর্তমান ভার্সন: <strong>v1.0.0 (Portable)</strong></span>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sub-Menu Tabs */}
        <div className="space-y-2">
          {/* Software Update Tab (Visible to BOTH Admin and User) */}
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center space-x-3 ${
              activeTab === 'update'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className={`p-2 rounded-xl ${
              activeTab === 'update' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs block">সফটওয়্যার আপডেট</span>
              <span className="text-[10px] text-slate-400 block font-normal">
                GitHub থেকে আপডেট
              </span>
            </div>
          </button>

          {/* Integration Tab (Visible ONLY to Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('integration')}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center space-x-3 ${
                activeTab === 'integration'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className={`p-2 rounded-xl ${
                activeTab === 'integration' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs block">ক্লাউড ও ইন্টিগ্রেশন</span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Turso, ntfy ও রেপো সেটিংস
                </span>
              </div>
            </button>
          )}

          {/* Zero Data Loss Guarantee Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-2 mt-4 shadow-xs">
            <div className="flex items-center space-x-1.5 font-bold text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>১০০% জিরো ডাটা লস</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed font-normal">
              আপনার সমস্ত ইউজার, পাসওয়ার্ড ও কাজের রেকর্ড উইন্ডোজের নিরাপদ সিস্টেমে সেভ থাকে। সফটওয়্যার আপডেট বা ফাইল প্রতিস্থাপনে কোনো তথ্য হারাবে না।
            </p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-3">
          {/* ================= TAB 1: SOFTWARE UPDATE ================= */}
          {activeTab === 'update' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Download className="w-5 h-5 text-emerald-600" />
                    সফটওয়্যার আপডেট সেন্টার
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    GitHub থেকে সরাসরি নতুন রিলিজ চেক করুন ও এক ক্লিকে পোর্টেবল ভার্সন আপডেট করুন
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckUpdate(false)}
                    disabled={checkingUpdate || downloading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdate ? 'যাচাই করা হচ্ছে...' : 'আপডেট চেক করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCheckUpdate(true)}
                    disabled={checkingUpdate || downloading}
                    title="নতুন ভার্সন পাওয়ার সিমুলেশন টেস্ট করুন"
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    সিমুলেশন টেস্ট
                  </button>
                </div>
              </div>

              {/* Status & Alerts */}
              {updateError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">আপডেট অনুসন্ধানে ত্রুটি হয়েছে:</strong>
                    <span>{updateError}</span>
                  </div>
                </div>
              )}

              {/* Download Progress Bar */}
              {downloading && downloadProgress && (
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      {downloadProgress.status}
                    </span>
                    <span className="font-extrabold text-indigo-700">
                      {downloadProgress.percent.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full bg-indigo-200/70 rounded-full h-3 overflow-hidden p-0.5">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, downloadProgress.percent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-indigo-700 font-medium">
                    <span>
                      {formatFileSize(downloadProgress.downloaded_bytes)} / {formatFileSize(downloadProgress.total_bytes)}
                    </span>
                    <span>সফটওয়্যার ফাইল ব্যাকআপ ও অটো-রিস্টার্ট হবে</span>
                  </div>
                </div>
              )}

              {/* Update Check Results */}
              {updateResult && !downloading && (
                <div className="space-y-4">
                  {updateResult.update_available ? (
                    /* Update Available Card */
                    <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/30">
                            🚀
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">
                              নতুন আপডেট উপলব্ধ: <span className="text-emerald-700">v{updateResult.latest_version}</span>
                            </h4>
                            <p className="text-xs text-slate-500">
                              বর্তমান ভার্সন: v{updateResult.current_version} • {updateResult.published_at && `প্রকাশিত: ${updateResult.published_at}`}
                              {updateResult.file_size && ` • সাইজ: ${formatFileSize(updateResult.file_size)}`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyUpdate}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01]"
                        >
                          <Download className="w-4 h-4" />
                          <span>এখনই ডাউনলোড ও রিস্টার্ট করুন</span>
                        </button>
                      </div>

                      {/* Release Notes */}
                      {updateResult.release_notes && (
                        <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-1.5">
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-800">
                            <FileText className="w-3.5 h-3.5" />
                            নতুন কী কী যুক্ত করা হয়েছে (Changelog):
                          </span>
                          <pre className="font-sans text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                            {updateResult.release_notes}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Up to Date Card */
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">
                        সফটওয়্যারটি সম্পূর্ণরূপে আপ-টু-ডেট আছে!
                      </h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        আপনি সর্বশেষ সংস্করণ (v{updateResult.current_version}) ব্যবহার করছেন। কোনো নতুন আপডেট আসলে এখানে জানতে পারবেন।
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* System Architecture Specifications */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                  সিস্টেম বিবরণ ও ইনস্টলেশন তথ্য
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[11px]">প্যাকেজ টাইপ</span>
                    <strong className="text-slate-800 block">পোর্টেবল সিঙ্গেল এক্সিকিউটেবল (.exe)</strong>
                    <span className="text-[10px] text-slate-500">কোনো ইনস্টলেশন ছাড়াই পেনড্রাইভ বা যেকোনো ফোল্ডার থেকে চলে</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[11px]">ডাটাবেজ অবস্থান (Zero Data Loss)</span>
                    <strong className="text-slate-800 block">%APPDATA%\com.esmanager.desktop\</strong>
                    <span className="text-[10px] text-slate-500">অ্যাপ ফাইল যেখানেই থাকুক, ডাটাবেজ উইন্ডোজের নিরাপদ লোকেশনে অক্ষত থাকে</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: CLOUD & INTEGRATION (ADMIN ONLY) ================= */}
          {activeTab === 'integration' && isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-indigo-600" />
                  সিস্টেম ইন্টিগ্রেশন ও ক্লাউড কনফিগারেশন
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turso ক্লাউড ডাটাবেজ, ntfy পুশ চ্যানেল এবং GitHub আপডেট রেপোজিটরি সেটিংস
                </p>
              </div>

              {/* Status Message Alert */}
              {integrationStatus && (
                <div className={`p-4 rounded-xl text-xs flex items-center space-x-2.5 ${
                  integrationStatus.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}>
                  {integrationStatus.isError ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{integrationStatus.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
                {/* 1. Turso Cloud Section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-emerald-600" />
                      Turso ক্লাউড ডাটাবেজ (SQLite Sync)
                    </span>
                    <a
                      href="https://turso.tech"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>turso.tech</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Turso Database URL
                    </label>
                    <input
                      type="text"
                      value={settings.turso_url}
                      onChange={(e) => setSettings({ ...settings, turso_url: e.target.value })}
                      placeholder="e.g. libsql://your-db-org.turso.io"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Turso Auth Token
                    </label>
                    <input
                      type="password"
                      value={settings.turso_token}
                      onChange={(e) => setSettings({ ...settings, turso_token: e.target.value })}
                      placeholder="eyJhbGciOi..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* 2. ntfy.sh Section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-blue-600" />
                      ntfy.sh রিয়েলটাইম নোটিফিকেশন চ্যানেল
                    </span>
                    <a
                      href="https://ntfy.sh"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline flex items-center space-x-1 font-semibold"
                    >
                      <span>ntfy.sh</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ntfy Topic Name
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-mono">https://ntfy.sh/</span>
                      <input
                        type="text"
                        value={settings.ntfy_topic}
                        onChange={(e) => setSettings({ ...settings, ntfy_topic: e.target.value })}
                        placeholder="es_manager_tasks_channel"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. GitHub Repo for In-App Updates */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Github className="w-4 h-4 text-slate-800" />
                      GitHub আপডেট রেপোজিটরি (Update Source)
                    </span>
                    <span className="text-[10px] text-slate-400">Private Releases Supported</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      GitHub Repository (owner/repo বা URL)
                    </label>
                    <input
                      type="text"
                      value={settings.github_repo}
                      onChange={(e) => setSettings({ ...settings, github_repo: e.target.value })}
                      placeholder="e.g. saifulislammz/ES-Manager"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      ইউজাররা যখন 'আপডেট চেক করুন' বাটনে ক্লিক করবে, সফটওয়্যার এই রেপোজিটরির সর্বশেষ রিলিজ থেকে নতুন পোর্টেবল ফাইল ডাউনলোড করবে।
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        GitHub Token (Private Repository Access)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGithubToken(!showGithubToken)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                      >
                        {showGithubToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showGithubToken ? 'লুকান' : 'দেখান'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showGithubToken ? 'text' : 'password'}
                        value={settings.github_token || ''}
                        onChange={(e) => setSettings({ ...settings, github_token: e.target.value })}
                        placeholder="ghp_... অথবা gho_..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      রেপোজিটরি Private (গোপনীয়) হওয়ায় ইউজারদের সফটওয়্যার এই টোকেনের মাধ্যমে রিলিজ চেক ও রিলিজ ফাইল ডাউনলোড করতে পারবে।
                    </p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestNtfy}
                      disabled={testingNtfy}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testingNtfy ? 'পাঠানো হচ্ছে...' : 'টেস্ট নোটিফিকেশন'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
