import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck, Calendar, ClipboardList, Clock } from 'lucide-react';
import apiClient from '@/services/api';

interface CrmNotif {
  id: number;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  task_assigned: {
    icon: <ClipboardList className="w-4 h-4" />,
    color: 'text-blue-500',
  },
  followup_assigned: {
    icon: <Calendar className="w-4 h-4" />,
    color: 'text-yellow-500',
  },
  followup_due: {
    icon: <Clock className="w-4 h-4" />,
    color: 'text-red-500',
  },
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CrmNotifications() {
  const [notifications, setNotifications] = useState<CrmNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevUnreadRef = useRef<number>(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get<CrmNotif[]>('/crm/notifications');
      const data = res.data ?? [];
      setNotifications(data);

      // Browser notification for newly arrived unread items
      const unread = data.filter((n) => !n.is_read).length;
      if (unread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
        if (Notification.permission === 'granted') {
          new Notification('CRM — New Notification', {
            body: `You have ${unread} unread notifications.`,
            icon: '/favicon.ico',
          });
        }
      }
      prevUnreadRef.current = unread;
    } catch {
      // Silently ignore network errors
    }
  }, []);

  // Initial fetch + 30-second polling
  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  // Request browser notification permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (notif: CrmNotif) => {
    if (notif.is_read) return;
    try {
      await apiClient.patch(`/crm/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
      prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await apiClient.post('/crm/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      prevUnreadRef.current = 0;
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        title="CRM Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
              CRM Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[360px] divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG['task_assigned'];
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleMarkRead(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      notif.is_read
                        ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                        : 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50'
                    }`}
                  >
                    {/* Icon */}
                    <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${notif.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
