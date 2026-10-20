import React, { useState, useMemo } from 'react';
import { User, Task, TaskStatus } from '../types';
import { api } from '../services/api';
import { getTaskUrgency } from '../utils/taskUtils';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Play, 
  Search,
  CheckCircle,
  Sparkles,
  LayoutGrid,
  List,
  Columns,
  ArrowUpDown,
  CalendarDays,
  Flame,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface UserDashboardProps {
  currentUser: User;
  tasks: Task[];
  onRefreshTasks: () => void;
}

type ViewMode = 'grid' | 'list' | 'board';
type QuickFilter = 'all' | 'today' | 'high_priority' | 'overdue';
type SortBy = 'deadline_asc' | 'deadline_desc' | 'priority' | 'newest';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  tasks,
  onRefreshTasks,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('deadline_asc');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleUpdateStatus = async (task: Task, newStatus: TaskStatus) => {
    setUpdatingTaskId(task.id);
    try {
      await api.updateTaskStatus(task.id, newStatus, currentUser.username, task.title);
      onRefreshTasks();
    } catch {
      alert('স্ট্যাটাস আপডেটে সমস্যা হয়েছে');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Stats
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks
      .filter(task => {
        // Search
        const matchesSearch = !query ||
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query);

        // Status Filter
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

        // Quick Urgency Filter
        const urgency = getTaskUrgency(task);
        let matchesQuick = true;
        if (quickFilter === 'today') {
          matchesQuick = urgency.isToday && task.status !== 'completed';
        } else if (quickFilter === 'high_priority') {
          matchesQuick = task.priority === 'high';
        } else if (quickFilter === 'overdue') {
          matchesQuick = urgency.isOverdue && task.status !== 'completed';
        }

        return matchesSearch && matchesStatus && matchesQuick;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline_asc') {
          const dateA = a.deadline_date ? `${a.deadline_date}T${a.deadline_time || '23:59'}` : '9999';
          const dateB = b.deadline_date ? `${b.deadline_date}T${b.deadline_time || '23:59'}` : '9999';
          return dateA.localeCompare(dateB);
        } else if (sortBy === 'deadline_desc') {
          const dateA = a.deadline_date ? `${a.deadline_date}T${a.deadline_time || '00:00'}` : '';
          const dateB = b.deadline_date ? `${b.deadline_date}T${b.deadline_time || '00:00'}` : '';
          return dateB.localeCompare(dateA);
        } else if (sortBy === 'priority') {
          const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        } else {
          return b.created_at.localeCompare(a.created_at);
        }
      });
  }, [tasks, searchQuery, statusFilter, quickFilter, sortBy]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            স্বাগতম, {currentUser.username}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            আপনার জন্য নির্ধারিত কাজগুলোর তালিকা ও ডেডলাইন নিচে দেখুন। কাজ শুরু ও সম্পন্ন করতে স্ট্যাটাস আপডেট করুন।
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>রিয়েলটাইম পুশ সক্রিয়</span>
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">মোট কাজ</div>
          <p className="text-2xl font-extrabold text-slate-900">{totalTasks}</p>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">পেন্ডিং কাজ</div>
          <p className="text-2xl font-extrabold text-amber-800">{pendingTasks}</p>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">চলমান কাজ</div>
          <p className="text-2xl font-extrabold text-blue-800">{inProgressTasks}</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">সম্পন্ন কাজ</div>
          <p className="text-2xl font-extrabold text-emerald-800">{completedTasks}</p>
        </div>
      </div>

      {/* Control Toolbar: Search, Filters, Sort & View Mode */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Row 1: Search, Sort & View Mode Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কাজের শিরোনাম বা বিবরণ দিয়ে খুঁজুন..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Selector Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-emerald-600 font-medium appearance-none cursor-pointer"
              >
                <option value="deadline_asc">⏳ ডেডলাইন (নিকটবর্তী আগে)</option>
                <option value="deadline_desc">⌛ ডেডলাইন (দূরবর্তী আগে)</option>
                <option value="priority">🔥 জরুরি কাজ আগে</option>
                <option value="newest">🆕 নতুন কাজ আগে</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="গ্রিড ভিউ"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="লিস্ট / টেবিল ভিউ"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                title="কানবান বোর্ড ভিউ"
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Columns className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status Tabs & Quick Urgency Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              সব ({totalTasks})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              পেন্ডিং ({pendingTasks})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'in_progress' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              চলমান ({inProgressTasks})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              সম্পন্ন ({completedTasks})
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setQuickFilter(quickFilter === 'today' ? 'all' : 'today')}
              className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
                quickFilter === 'today'
                  ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>আজকের কাজ</span>
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'high_priority' ? 'all' : 'high_priority')}
              className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
                quickFilter === 'high_priority'
                  ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>জরুরি কাজ</span>
            </button>

            <button
              onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
              className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
                quickFilter === 'overdue'
                  ? 'bg-rose-200 border-rose-400 text-rose-900 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>মেয়াদ শেষ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Content: Grid / List / Board */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">কোনো কাজ খুঁজে পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {totalTasks === 0 
              ? 'আপনার জন্য বর্তমানে কোনো কাজ নির্ধারিত নেই। অ্যাডমিন নতুন কাজ এসাইন করলে নোটিফিকেশন পাবেন।' 
              : 'নির্বাচিত ফিল্টারের সাথে কোনো কাজ পাওয়া যায়নি। অন্য ফিল্টার নির্বাচন করুন।'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ---------------- LIST / TABLE VIEW ---------------- */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4">কাজের শিরোনাম ও বিবরণ</th>
                  <th className="py-3 px-4">অগ্রাধিকার</th>
                  <th className="py-3 px-4">ডেডলাইন</th>
                  <th className="py-3 px-4 text-right">স্ট্যাটাস অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const urgency = getTaskUrgency(task);
                  const isPending = task.status === 'pending';
                  const isInProgress = task.status === 'in_progress';
                  const isUpdating = updatingTaskId === task.id;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          isInProgress ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPending ? 'bg-amber-500' :
                            isInProgress ? 'bg-blue-500' :
                            'bg-emerald-500'
                          }`} />
                          {isPending ? 'পেন্ডিং' : isInProgress ? 'চলমান' : 'সম্পন্ন'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 min-w-[280px]">
                        <h4 className="font-bold text-slate-900 line-clamp-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          অ্যাসাইনার: @{task.assigned_by}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                          task.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {task.priority === 'high' ? 'জরুরি' : task.priority === 'medium' ? 'মধ্যম' : 'সাধারণ'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-700 font-semibold">{task.deadline_date} {task.deadline_time}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${urgency.badgeClass}`}>
                            {urgency.text}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending && (
                          <button
                            onClick={() => handleUpdateStatus(task, 'in_progress')}
                            disabled={isUpdating}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center space-x-1 transition-all"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>কাজ শুরু করুন</span>
                          </button>
                        )}
                        {isInProgress && (
                          <button
                            onClick={() => handleUpdateStatus(task, 'completed')}
                            disabled={isUpdating}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center space-x-1 transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>সম্পন্ন করুন</span>
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(task, 'in_progress')}
                            disabled={isUpdating}
                            title="পুনরায় চালু করুন"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'board' ? (
        /* ---------------- KANBAN BOARD VIEW ---------------- */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map((colStatus) => {
            const colTasks = filteredTasks.filter(t => t.status === colStatus);
            const colTitle = colStatus === 'pending' ? 'পেন্ডিং (Pending)' : colStatus === 'in_progress' ? 'চলমান (In Progress)' : 'সম্পন্ন (Completed)';
            const headerColor = colStatus === 'pending' ? 'border-amber-400 bg-amber-50/60 text-amber-800' : colStatus === 'in_progress' ? 'border-blue-400 bg-blue-50/60 text-blue-800' : 'border-emerald-400 bg-emerald-50/60 text-emerald-800';

            return (
              <div key={colStatus} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col space-y-3">
                <div className={`p-3 rounded-xl border-l-4 shadow-sm flex items-center justify-between ${headerColor}`}>
                  <h3 className="font-bold text-xs uppercase tracking-wider">{colTitle}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 font-extrabold text-xs shadow-xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      কোনো কাজ নেই
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const urgency = getTaskUrgency(task);
                      const isUpdating = updatingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs text-slate-900 line-clamp-2">{task.title}</h4>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                              task.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {task.priority === 'high' ? 'জরুরি' : task.priority === 'medium' ? 'মধ্যম' : 'সাধারণ'}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className={`px-2 py-0.5 rounded-md border ${urgency.badgeClass}`}>
                              {urgency.text}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              @{task.assigned_by}
                            </span>
                          </div>

                          {/* Quick Action Button in Card */}
                          <div className="pt-1">
                            {colStatus === 'pending' && (
                              <button
                                onClick={() => handleUpdateStatus(task, 'in_progress')}
                                disabled={isUpdating}
                                className="w-full py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center space-x-1 transition-all"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>কাজ শুরু করুন</span>
                              </button>
                            )}
                            {colStatus === 'in_progress' && (
                              <button
                                onClick={() => handleUpdateStatus(task, 'completed')}
                                disabled={isUpdating}
                                className="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center space-x-1 transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>সম্পন্ন করুন</span>
                              </button>
                            )}
                            {colStatus === 'completed' && (
                              <div className="text-center text-[11px] text-emerald-600 font-bold flex items-center justify-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>কাজটি সম্পন্ন হয়েছে</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------------- MODERN CARDS GRID VIEW ---------------- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const urgency = getTaskUrgency(task);
            const isPending = task.status === 'pending';
            const isInProgress = task.status === 'in_progress';
            const isCompleted = task.status === 'completed';
            const isUpdating = updatingTaskId === task.id;

            return (
              <div
                key={task.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Status & Priority */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      isInProgress ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPending ? 'bg-amber-500' :
                        isInProgress ? 'bg-blue-500' :
                        'bg-emerald-500'
                      }`} />
                      {isPending ? 'পেন্ডিং' : isInProgress ? 'চলমান' : 'সম্পন্ন'}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${urgency.badgeClass}`}>
                        {urgency.text}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        task.priority === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {task.priority === 'high' ? 'জরুরি' : task.priority === 'medium' ? 'মধ্যম' : 'সাধারণ'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-1.5 group-hover:text-emerald-700 transition-colors">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Deadline info */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5 text-teal-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{task.deadline_date}</span>
                      <Clock className="w-3.5 h-3.5 ml-1 text-teal-600" />
                      <span>{task.deadline_time}</span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      অ্যাসাইনার: @{task.assigned_by}
                    </span>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="pt-1 flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(task, 'in_progress')}
                        disabled={isUpdating}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>কাজ শুরু করুন</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        onClick={() => handleUpdateStatus(task, 'completed')}
                        disabled={isUpdating}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>কাজ সম্পন্ন হয়েছে</span>
                      </button>
                    )}

                    {isCompleted && (
                      <div className="flex-1 py-2 px-3 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>সম্পন্ন</span>
                        </span>
                        <button
                          onClick={() => handleUpdateStatus(task, 'in_progress')}
                          disabled={isUpdating}
                          className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          পুনরায় চালু করুন
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
