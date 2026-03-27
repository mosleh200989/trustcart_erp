import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { stockAlerts } from '@/services/api';
import {
  FaBell, FaExclamationTriangle, FaTimesCircle, FaInfoCircle,
  FaCheck, FaCheckDouble, FaFilter, FaSync, FaEye,
} from 'react-icons/fa';

const severityConfig: Record<string, { icon: any; color: string; bg: string }> = {
  critical: { icon: FaTimesCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  warning: { icon: FaExclamationTriangle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  info: { icon: FaInfoCircle, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
};

const alertTypeLabels: Record<string, string> = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstock: 'Overstock',
  expiry_warning: 'Expiry Warning',
  expiry_critical: 'Expired',
  reorder_triggered: 'Auto Reorder',
};

export default function InventoryAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning'>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [resolveModal, setResolveModal] = useState<{ id: number; message: string } | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockAlerts.list(filter === 'unread');
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleMarkRead = async (id: number) => {
    try {
      await stockAlerts.markRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await stockAlerts.markAllRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    try {
      await stockAlerts.resolve(resolveModal.id, resolveNotes);
      setAlerts((prev) => prev.map((a) => (a.id === resolveModal.id ? { ...a, is_resolved: true, is_read: true } : a)));
      setResolveModal(null);
      setResolveNotes('');
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  const filtered = alerts.filter((a) => {
    if (!showResolved && a.is_resolved) return false;
    if (filter === 'critical' && a.severity !== 'critical') return false;
    if (filter === 'warning' && a.severity !== 'warning') return false;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.is_read && !a.is_resolved).length;

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBell className="text-orange-500" /> Inventory Alerts
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          <div className="flex gap-2">
            <button onClick={handleMarkAllRead} className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded flex items-center gap-1">
              <FaCheckDouble /> Mark All Read
            </button>
            <button onClick={loadAlerts} className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded flex items-center gap-1">
              <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <FaFilter className="text-gray-400" />
          {(['all', 'unread', 'critical', 'warning'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
          <label className="flex items-center gap-1 text-xs text-gray-500 ml-4">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading alerts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FaCheck className="text-green-400 text-4xl mx-auto mb-2" />
            <p className="text-gray-400">No alerts to show</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((alert) => {
              const sev = severityConfig[alert.severity] || severityConfig.info;
              const Icon = sev.icon;
              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 flex items-start gap-3 transition-colors ${sev.bg} ${!alert.is_read ? 'ring-2 ring-offset-1 ring-blue-200' : ''} ${alert.is_resolved ? 'opacity-60' : ''}`}
                >
                  <Icon className={`text-xl mt-0.5 shrink-0 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${alert.severity === 'critical' ? 'bg-red-200 text-red-800' : alert.severity === 'warning' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                        {alertTypeLabels[alert.alert_type] || alert.alert_type}
                      </span>
                      {!alert.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      {alert.is_resolved && <span className="text-xs text-green-600 font-medium">Resolved</span>}
                    </div>
                    <p className="text-sm text-gray-800 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                    {alert.resolution_notes && (
                      <p className="text-xs text-green-700 mt-1 italic">Resolution: {alert.resolution_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!alert.is_read && (
                      <button onClick={() => handleMarkRead(alert.id)} title="Mark read" className="p-1.5 text-blue-500 hover:bg-blue-100 rounded">
                        <FaEye />
                      </button>
                    )}
                    {!alert.is_resolved && (
                      <button
                        onClick={() => setResolveModal({ id: alert.id, message: alert.message })}
                        title="Resolve"
                        className="p-1.5 text-green-500 hover:bg-green-100 rounded"
                      >
                        <FaCheck />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Resolve Alert</h3>
            <p className="text-sm text-gray-600 mb-4">{resolveModal.message}</p>
            <textarea
              className="w-full border rounded-lg p-2 text-sm mb-4"
              rows={3}
              placeholder="Resolution notes (optional)"
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setResolveModal(null); setResolveNotes(''); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={handleResolve} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
