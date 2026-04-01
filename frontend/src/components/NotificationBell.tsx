import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api/client';
import { Notification } from '../types';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.slice(0, 10));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    // SSE real-time notifications
    const token = localStorage.getItem('token');
    if (token) {
      const evtSource = new EventSource(`/api/sse/subscribe?token=${encodeURIComponent(token)}`);
      evtSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const notification = JSON.parse(e.data);
          setUnreadCount((c) => c + 1);
          setNotifications((prev) => [notification, ...prev].slice(0, 10));
        } catch {}
      });
      return () => {
        clearInterval(interval);
        evtSource.close();
      };
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (n: Notification) => {
    try {
      if (!n.read) {
        await api.put(`/notifications/${n.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      }
      if (n.linkUrl) {
        navigate(n.linkUrl);
        setOpen(false);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        title="Notifiche"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifiche</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}
                className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors">
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>Nessuna notifica</p>
            ) : (
              notifications.map((n) => (
                <button key={n.id} onClick={() => handleNotificationClick(n)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: !n.read ? 'rgba(99,102,241,0.07)' : 'transparent',
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                    <div className={!n.read ? '' : 'ml-4'}>
                      <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                      {n.body && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.body}</p>}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        {new Date(n.createdAt).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
