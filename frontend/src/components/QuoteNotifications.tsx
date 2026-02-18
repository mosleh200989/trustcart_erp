// Quote Notifications
import { useEffect, useState } from 'react';
import { FaBell, FaTimes, FaFileInvoice, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { BACKEND_ORIGIN } from '@/config/backend';

interface Notification {
  id: number;
  type: 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_rejected' | 'quote_expired';
  message: string;
  quoteId: number;
  quoteNumber: string;
  timestamp: string;
  read: boolean;
}

export default function QuoteNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load notifications from localStorage
    const stored = localStorage.getItem('quoteNotifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n: Notification) => !n.read).length);
    }

    // Set up polling for new notifications (every 30 seconds)
    const pollInterval = setInterval(() => {
      checkForNewNotifications();
    }, 30000);

    // Set up WebSocket connection for real-time updates (if available)
    connectWebSocket();

    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const connectWebSocket = () => {
    // WebSocket implementation for real-time notifications
    // This would connect to your backend WebSocket server
    try {
      const backend = new URL(BACKEND_ORIGIN);
      const protocol = backend.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${backend.host}/ws/notifications`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        addNotification(notification);
      };

      ws.onerror = () => {
        // Fallback to polling if WebSocket fails
        console.log('WebSocket connection failed, using polling');
      };
    } catch (error) {
      console.log('WebSocket not available, using polling');
    }
  };

  const checkForNewNotifications = async () => {
    try {
      // Check for new quote status changes
      const lastCheck = localStorage.getItem('lastNotificationCheck');
      const timestamp = lastCheck || new Date(Date.now() - 3600000).toISOString();

      // This would be an API call to get new notifications
      // For now, we'll simulate with localStorage
      const response = await fetch(`/api/crm/quotes/notifications?since=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      }).catch(() => null);

      if (response && response.ok) {
        const newNotifications = await response.json();
        newNotifications.forEach((n: Notification) => addNotification(n));
      }

      localStorage.setItem('lastNotificationCheck', new Date().toISOString());
    } catch (error) {
      console.error('Failed to check notifications', error);
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('quoteNotifications', JSON.stringify(updated));
      setUnreadCount(updated.filter((n) => !n.read).length);
      return updated;
    });

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TrustCart CRM', {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem('quoteNotifications', JSON.stringify(updated));
      setUnreadCount(updated.filter((n) => !n.read).length);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem('quoteNotifications', JSON.stringify(updated));
      setUnreadCount(0);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('quoteNotifications');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'quote_accepted':
        return <FaCheckCircle className="text-green-500" />;
      case 'quote_rejected':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaFileInvoice className="text-blue-500" />;
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
      >
        <FaBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Quote Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaBell className="text-4xl mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                          Quote #{notification.quoteNumber}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(notification.timestamp).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to add a notification programmatically
export function addQuoteNotification(
  type: Notification['type'],
  quoteId: number,
  quoteNumber: string,
  message: string
) {
  const notification: Notification = {
    id: Date.now(),
    type,
    message,
    quoteId,
    quoteNumber,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const stored = localStorage.getItem('quoteNotifications');
  const existing = stored ? JSON.parse(stored) : [];
  const updated = [notification, ...existing].slice(0, 50);
  localStorage.setItem('quoteNotifications', JSON.stringify(updated));

  // Trigger a custom event to update the UI
  window.dispatchEvent(new CustomEvent('newQuoteNotification', { detail: notification }));
}

