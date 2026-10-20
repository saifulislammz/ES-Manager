import { useState, useEffect, useCallback } from 'react';
import { User, Task, NtfyEventPayload } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { SettingsPage } from './components/SettingsPage';
import { ProfileModal } from './components/ProfileModal';
import { NotificationToast } from './components/NotificationToast';
import { listen } from '@tauri-apps/api/event';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('es_manager_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeNotification, setActiveNotification] = useState<NtfyEventPayload | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTasks(
        currentUser?.role === 'user' ? currentUser.username : undefined
      );
      setTasks(data);
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        fetchUsers();
      }
      fetchTasks();
    }
  }, [currentUser, fetchUsers, fetchTasks]);

  // Listen for real-time ntfy events via Tauri event listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<NtfyEventPayload>('ntfy-event', (event) => {
          const payload = event.payload;
          setActiveNotification(payload);

          // Auto refresh task list
          fetchTasks();
          if (currentUser?.role === 'admin') {
            fetchUsers();
          }

          // Auto clear toast after 6 seconds
          setTimeout(() => {
            setActiveNotification((curr) => (curr === payload ? null : curr));
          }, 6000);
        });
      } catch (err) {
        console.warn('Could not setup Tauri event listener (running in browser?):', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [currentUser, fetchTasks, fetchUsers]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('es_manager_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('es_manager_user');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncNow();
      setIsOnline(res.is_online);
      fetchTasks();
    } catch {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-700">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(prev => !prev)}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        isOnline={isOnline}
      />

      {/* Main Content: SettingsPage or Dashboard */}
      <main className="flex-1 overflow-y-auto">
        {isSettingsOpen ? (
          <SettingsPage
            user={currentUser}
            onBack={() => setIsSettingsOpen(false)}
            onSyncComplete={(res) => {
              setIsOnline(res.is_online);
              fetchTasks();
            }}
          />
        ) : currentUser.role === 'admin' ? (
          <AdminDashboard
            currentUser={currentUser}
            users={users}
            tasks={tasks}
            onRefreshTasks={fetchTasks}
            onRefreshUsers={fetchUsers}
          />
        ) : (
          <UserDashboard
            currentUser={currentUser}
            tasks={tasks}
            onRefreshTasks={fetchTasks}
          />
        )}
      </main>

      {/* Profile & Password Change Modal (Both Admin and User) */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem('es_manager_user', JSON.stringify(updated));
            fetchTasks();
            if (updated.role === 'admin') {
              fetchUsers();
            }
          }}
        />
      )}

      {/* Real-time Notification Toast */}
      <NotificationToast
        notification={activeNotification}
        onClose={() => setActiveNotification(null)}
      />
    </div>
  );
}

export default App;
