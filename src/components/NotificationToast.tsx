import React from 'react';
import { Bell, CheckCircle2, X, Edit3 } from 'lucide-react';
import { NtfyEventPayload } from '../types';

interface ToastProps {
  notification: NtfyEventPayload | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<ToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  const isTaskAssigned = notification.event_type === 'TASK_ASSIGNED';
  const isStatusChanged = notification.event_type === 'STATUS_CHANGED';
  const isTaskUpdated = notification.event_type === 'TASK_UPDATED';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl flex items-start space-x-3 text-slate-800">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${
          isTaskAssigned ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
          isTaskUpdated ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
          'bg-blue-50 text-blue-600 border border-blue-100'
        }`}>
          {isTaskAssigned ? <Bell className="w-5 h-5" /> : 
           isTaskUpdated ? <Edit3 className="w-5 h-5" /> :
           <CheckCircle2 className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              {isTaskAssigned ? 'কাজ অ্যাসাইন করা হয়েছে' :
               isTaskUpdated ? 'কাজ পরিমার্জন করা হয়েছে' :
               'কাজের স্ট্যাটাস আপডেট'}
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-700 font-medium mt-1 truncate">
            {notification.title}
          </p>

          {isStatusChanged && (
            <div className="mt-2 flex items-center text-xs text-slate-500 space-x-2">
              <span className="font-semibold text-slate-700">{notification.user}</span>
              <span>স্ট্যাটাস পরিবর্তন করেছেন:</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase text-[10px]">
                {notification.new_status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
