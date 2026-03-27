import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { inventoryDashboard } from '@/services/api';
import Link from 'next/link';
import {
  FaBoxes, FaMoneyBillWave, FaExclamationTriangle, FaTimesCircle,
  FaClock, FaTruck, FaArrowUp, FaArrowDown, FaSync, FaChartBar,
  FaBell, FaClipboardList,
} from 'react-icons/fa';

const movementTypeBadge: Record<string, { label: string; color: string }> = {
  receipt: { label: 'Receipt', color: 'bg-green-100 text-green-800' },
  sales_dispatch: { label: 'Sales Dispatch', color: 'bg-blue-100 text-blue-800' },
  sales_return: { label: 'Sales Return', color: 'bg-purple-100 text-purple-800' },
  transfer_in: { label: 'Transfer In', color: 'bg-cyan-100 text-cyan-800' },
  transfer_out: { label: 'Transfer Out', color: 'bg-orange-100 text-orange-800' },
  adjustment_increase: { label: 'Adj +', color: 'bg-lime-100 text-lime-800' },
  adjustment_decrease: { label: 'Adj -', color: 'bg-red-100 text-red-800' },
};

export default function InventoryDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await inventoryDashboard.getKpis();
      setData(result);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const kpis = data?.kpis || {};

  const kpiCards = [
    { label: 'Total Products', value: kpis.totalProducts || 0, icon: FaBoxes, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Stock Value', value: `৳${(kpis.stockValue || 0).toLocaleString()}`, icon: FaMoneyBillWave, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Low Stock', value: kpis.lowStockItems || 0, icon: FaExclamationTriangle, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/inventory/alerts' },
    { label: 'Out of Stock', value: kpis.outOfStock || 0, icon: FaTimesCircle, color: 'text-red-600', bg: 'bg-red-50', link: '/admin/inventory/alerts' },
    { label: 'Expiring (7d)', value: kpis.expiringSoon || 0, icon: FaClock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Pending POs', value: kpis.pendingPOs || 0, icon: FaTruck, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaChartBar className="text-blue-600" /> Inventory Dashboard
          </h1>
          <div className="flex gap-2">
            <Link href="/admin/inventory/alerts" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <FaBell /> Alerts
            </Link>
            <Link href="/admin/inventory/reorder-rules" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <FaClipboardList /> Reorder Rules
            </Link>
            <button onClick={loadDashboard} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card) => {
            const Card = (
              <div key={card.label} className={`${card.bg} rounded-xl p-4 border`}>
                <div className="flex items-center gap-3">
                  <card.icon className={`text-2xl ${card.color}`} />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                </div>
              </div>
            );
            return card.link ? <Link key={card.label} href={card.link}>{Card}</Link> : <div key={card.label}>{Card}</div>;
          })}
        </div>

        {loading && !data ? (
          <div className="text-center py-12 text-gray-400">Loading dashboard...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movement Chart (simplified bar representation) */}
            <div className="bg-white rounded-xl shadow p-5 border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaChartBar className="text-blue-500" /> Stock Movements (30 days)
              </h2>
              {(data?.movementChart || []).length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No movement data available</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {(data?.movementChart || []).slice(-15).map((d: any) => {
                    const maxVal = Math.max(...(data?.movementChart || []).map((m: any) => Math.max(Number(m.inbound), Number(m.outbound))), 1);
                    return (
                      <div key={d.date} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-gray-500 shrink-0">{d.date?.slice(5)}</span>
                        <div className="flex-1 flex gap-1">
                          <div className="bg-green-400 h-4 rounded" style={{ width: `${(Number(d.inbound) / maxVal) * 100}%` }} title={`In: ${d.inbound}`} />
                          <div className="bg-red-400 h-4 rounded" style={{ width: `${(Number(d.outbound) / maxVal) * 100}%` }} title={`Out: ${d.outbound}`} />
                        </div>
                        <span className="w-16 text-right text-green-700">+{d.inbound}</span>
                        <span className="w-16 text-right text-red-700">-{d.outbound}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block" /> Inbound</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded inline-block" /> Outbound</span>
                  </div>
                </div>
              )}
            </div>

            {/* Low Stock Alert Table */}
            <div className="bg-white rounded-xl shadow p-5 border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-500" /> Low Stock Items
              </h2>
              {(data?.topLowStock || []).length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No low stock items</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="pb-2">Product</th>
                        <th className="pb-2 text-right">Available</th>
                        <th className="pb-2 text-right">Reorder Pt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.topLowStock || []).map((item: any) => (
                        <tr key={item.product_id} className="border-b last:border-0">
                          <td className="py-2">
                            <div className="font-medium text-gray-800">{item.product_name || `#${item.product_id}`}</div>
                            {item.sku && <div className="text-xs text-gray-400">{item.sku}</div>}
                          </td>
                          <td className={`py-2 text-right font-semibold ${Number(item.available) === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {item.available}
                          </td>
                          <td className="py-2 text-right text-gray-500">{item.reorder_point}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expiring Batches */}
            <div className="bg-white rounded-xl shadow p-5 border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaClock className="text-yellow-500" /> Expiring Batches
              </h2>
              {(data?.expiringBatches || []).length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No batches expiring soon</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(data?.expiringBatches || []).map((b: any) => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={b.id} className="flex justify-between items-center p-2 rounded bg-gray-50 text-sm">
                        <div>
                          <span className="font-medium">{b.product_name || `Product #${b.product_id}`}</span>
                          <span className="text-xs text-gray-400 ml-2">Batch: {b.batch_number}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {daysLeft === 0 ? 'Expired' : `${daysLeft}d left`}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">{b.remaining_quantity} units</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Movements */}
            <div className="bg-white rounded-xl shadow p-5 border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaArrowUp className="text-green-500" /><FaArrowDown className="text-red-500" /> Recent Movements
              </h2>
              {(data?.recentMovements || []).length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No recent movements</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {(data?.recentMovements || []).map((m: any) => {
                    const badge = movementTypeBadge[m.movement_type] || { label: m.movement_type, color: 'bg-gray-100 text-gray-800' };
                    return (
                      <div key={m.id} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                          <span className="text-gray-700">{m.product_name || `#${m.product_id}`}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{m.quantity}</span>
                          <span className="text-xs text-gray-400 ml-2">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Stock Levels', href: '/admin/inventory/stock-levels', icon: FaBoxes },
            { label: 'Reports', href: '/admin/inventory/reports', icon: FaChartBar },
            { label: 'Adjustments', href: '/admin/inventory/adjustments', icon: FaClipboardList },
            { label: 'Transfers', href: '/admin/inventory/transfers', icon: FaTruck },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors">
              <link.icon className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
