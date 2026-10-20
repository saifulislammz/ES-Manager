import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Task } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800">
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-bold text-slate-900">
            কাজটি মুছে ফেলতে চান?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            আপনি কি নিশ্চিত যে নিচের কাজটি মুছে ফেলতে চান? মুছে ফেলার পর এটি পুনরায় পুনরুদ্ধার করা সম্ভব হবে না।
          </p>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mt-3">
            <p className="text-xs font-semibold text-slate-800 line-clamp-2">
              {task.title}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <span>অ্যাসাইন করা: {task.assigned_to.join(', ')}</span>
              <span>•</span>
              <span>ডেডলাইন: {task.deadline_date}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
