import React, { useState } from 'react';
import { User, Task } from '../types';
import { api } from '../services/api';
import { AdminEditUserModal } from './AdminEditUserModal';
import { 
  X, 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  User as UserIcon, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface UsersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  tasks: Task[];
  currentUserId: string;
  onOpenCreateUser: () => void;
  onRefreshUsers: () => void;
  onRefreshTasks: () => void;
}

export const UsersListModal: React.FC<UsersListModalProps> = ({
  isOpen,
  onClose,
  users,
  tasks,
  currentUserId,
  onOpenCreateUser,
  onRefreshUsers,
  onRefreshTasks,
}) => {
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.adminDeleteUser(userToDelete.id);
      onRefreshUsers();
      onRefreshTasks();
      setUserToDelete(null);
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setDeleteError(err);
      } else if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError('ইউজার মুছতে ব্যর্থ হয়েছে');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">ব্যবহারকারী ব্যবস্থাপনা</h3>
                <p className="text-xs text-slate-500">
                  সকল ব্যবহারকারীদের ইউজারনেম পরিবর্তন, পাসওয়ার্ড রিসেট ও কাজের পরিসংখ্যান
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

          {/* Toolbar: Search & Add User */}
          <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ইউজারনেম দিয়ে খুঁজুন..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateUser();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center space-x-2 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>নতুন ইউজার তৈরি করুন</span>
            </button>
          </div>

          {/* Delete Error Banner */}
          {deleteError && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          {/* Users Table / List */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="py-3 px-4">ব্যবহারকারী</th>
                  <th className="py-3 px-4">রোল</th>
                  <th className="py-3 px-4 text-center">মোট কাজ</th>
                  <th className="py-3 px-4 text-center">চলমান/পেন্ডিং</th>
                  <th className="py-3 px-4 text-center">সম্পন্ন</th>
                  <th className="py-3 px-4 text-right">যোগদানের তারিখ</th>
                  <th className="py-3 px-4 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      কোনো ব্যবহারকারী খুঁজে পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userTasks = tasks.filter(t => t.assigned_to.some(name => name.trim().toLowerCase() === u.username.trim().toLowerCase()));
                    const total = userTasks.length;
                    const active = userTasks.filter(t => t.status !== 'completed').length;
                    const completed = userTasks.filter(t => t.status === 'completed').length;
                    const isAdmin = u.role === 'admin';
                    const isSelf = u.id === currentUserId;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isAdmin ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span>@{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                                আপনি
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAdmin 
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isAdmin ? 'অ্যাডমিন' : 'ইউজার'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {total}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                            <Clock className="w-3 h-3" />
                            <span>{active}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{completed}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">
                          <div className="flex items-center justify-end space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{u.created_at ? u.created_at.split('T')[0] : 'N/A'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              title="ইউজারনেম বা পাসওয়ার্ড পরিবর্তন করুন"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(u)}
                                title="ইউজার অ্যাকাউন্ট মুছে ফেলুন"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 mt-4">
            <span>মোট ইউজার: <strong className="text-slate-800">{users.length}</strong> জন</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>

      {/* Admin Edit User Modal */}
      {editingUser && (
        <AdminEditUserModal
          isOpen={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={() => {
            onRefreshUsers();
            onRefreshTasks();
          }}
        />
      )}

      {/* Delete User Confirm Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">ইউজার মুছুন</h3>
                <p className="text-xs text-slate-500">@{userToDelete.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারীকে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
