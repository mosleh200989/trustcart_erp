import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaCog, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUsers, FaChartLine, FaMoneyBillWave } from 'react-icons/fa';

interface CommissionSettings {
  id: number;
  settingType: string;
  agentId: number | null;
  agent?: { id: number; name: string; lastName: string };
  commissionType: string;
  fixedAmount: number;
  percentageRate: number;
  minOrderValue: number;
  maxCommission: number | null;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  notes: string | null;
  createdAt: string;
}

interface CommissionRecord {
  id: number;
  agentId: number;
  agentName: string;
  customerId: number;
  salesOrderId: number;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  commissionType: string;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface CommissionReport {
  agentId: number;
  agentName: string;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
}

interface User {
  id: number;
  name: string;
  lastName?: string;
  last_name?: string;
  email: string;
}

export default function CommissionSettingsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'commissions' | 'report'>('settings');
  const [settings, setSettings] = useState<CommissionSettings[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commissionsTotal, setCommissionsTotal] = useState(0);
  const [report, setReport] = useState<CommissionReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for settings
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    settingType: 'global',
    agentId: '',
    commissionType: 'fixed',
    fixedAmount: '50',
    percentageRate: '5',
    minOrderValue: '0',
    maxCommission: '',
    isActive: true,
    effectiveFrom: '',
    effectiveUntil: '',
    notes: '',
  });

  // Filters for commissions
  const [commissionStatus, setCommissionStatus] = useState('');
  const [commissionAgentId, setCommissionAgentId] = useState('');
  const [commissionPage, setCommissionPage] = useState(1);

  // Report filters
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Bulk selection
  const [selectedCommissions, setSelectedCommissions] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissions();
    } else if (activeTab === 'report') {
      loadReport();
    }
  }, [activeTab, commissionStatus, commissionAgentId, commissionPage, reportStartDate, reportEndDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, usersRes] = await Promise.all([
        apiClient.get('/crm/commissions/settings'),
        apiClient.get('/users'),
      ]);

      setSettings(Array.isArray(settingsRes.data) ? settingsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const params: any = { page: commissionPage, limit: 20 };
      if (commissionStatus) params.status = commissionStatus;
      if (commissionAgentId) params.agentId = commissionAgentId;

      const res = await apiClient.get('/crm/commissions', { params });
      setCommissions(Array.isArray(res.data?.data) ? res.data.data : []);
      setCommissionsTotal(res.data?.total || 0);
    } catch (err: any) {
      console.error('Failed to load commissions', err);
    }
  };

  const loadReport = async () => {
    try {
      const params: any = {};
      if (reportStartDate) params.startDate = reportStartDate;
      if (reportEndDate) params.endDate = reportEndDate;

      const res = await apiClient.get('/crm/commissions/report', { params });
      setReport(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Failed to load report', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        settingType: formData.settingType,
        commissionType: formData.commissionType,
        fixedAmount: parseFloat(formData.fixedAmount) || 0,
        percentageRate: parseFloat(formData.percentageRate) || 0,
        minOrderValue: parseFloat(formData.minOrderValue) || 0,
        maxCommission: formData.maxCommission ? parseFloat(formData.maxCommission) : null,
        isActive: formData.isActive,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveUntil: formData.effectiveUntil || null,
        notes: formData.notes || null,
      };

      if (formData.settingType === 'agent_specific' && formData.agentId) {
        payload.agentId = parseInt(formData.agentId);
      }

      await apiClient.post('/crm/commissions/settings', payload);
      await loadData();
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (setting: CommissionSettings) => {
    setEditingId(setting.id);
    setFormData({
      settingType: setting.settingType,
      agentId: setting.agentId?.toString() || '',
      commissionType: setting.commissionType,
      fixedAmount: setting.fixedAmount?.toString() || '0',
      percentageRate: setting.percentageRate?.toString() || '0',
      minOrderValue: setting.minOrderValue?.toString() || '0',
      maxCommission: setting.maxCommission?.toString() || '',
      isActive: setting.isActive,
      effectiveFrom: setting.effectiveFrom?.split('T')[0] || '',
      effectiveUntil: setting.effectiveUntil?.split('T')[0] || '',
      notes: setting.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this commission setting?')) return;

    try {
      await apiClient.delete(`/crm/commissions/settings/${id}`);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete setting');
    }
  };

  const handleApprove = async (commissionId: number) => {
    try {
      await apiClient.put(`/crm/commissions/${commissionId}/approve`);
      await loadCommissions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to approve commission');
    }
  };

  const handleMarkPaid = async (commissionId: number) => {
    try {
      await apiClient.put(`/crm/commissions/${commissionId}/paid`);
      await loadCommissions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleCancel = async (commissionId: number) => {
    const reason = prompt('Enter reason for cancellation:');
    if (!reason) return;

    try {
      await apiClient.put(`/crm/commissions/${commissionId}/cancel`, { reason });
      await loadCommissions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel commission');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedCommissions.length === 0) {
      alert('Please select commissions to approve');
      return;
    }

    try {
      const res = await apiClient.post('/crm/commissions/bulk-approve', {
        commissionIds: selectedCommissions,
      });
      alert(`Successfully approved ${res.data.approvedCount} commissions`);
      setSelectedCommissions([]);
      await loadCommissions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to bulk approve');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      settingType: 'global',
      agentId: '',
      commissionType: 'fixed',
      fixedAmount: '50',
      percentageRate: '5',
      minOrderValue: '0',
      maxCommission: '',
      isActive: true,
      effectiveFrom: '',
      effectiveUntil: '',
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Commission Management</h1>
            <p className="text-gray-600 mt-1">Manage agent commission settings and view earnings</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCog className="inline mr-2" />
              Commission Settings
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'commissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaMoneyBillWave className="inline mr-2" />
              All Commissions
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'report'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaChartLine className="inline mr-2" />
              Commission Report
            </button>
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Add Settings Button */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FaPlus /> Add Commission Setting
              </button>
            )}

            {/* Settings Form */}
            {showForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {editingId ? 'Edit Commission Setting' : 'New Commission Setting'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Setting Type
                      </label>
                      <select
                        value={formData.settingType}
                        onChange={(e) => setFormData({ ...formData, settingType: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="global">Global (All Agents)</option>
                        <option value="agent_specific">Agent Specific</option>
                      </select>
                    </div>

                    {formData.settingType === 'agent_specific' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Agent
                        </label>
                        <select
                          value={formData.agentId}
                          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                          required
                        >
                          <option value="">Select agent...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.lastName || u.last_name || ''} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commission Type
                      </label>
                      <select
                        value={formData.commissionType}
                        onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="fixed">Fixed Amount per Sale</option>
                        <option value="percentage">Percentage of Sale</option>
                      </select>
                    </div>

                    {formData.commissionType === 'fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fixed Amount (৳)
                        </label>
                        <input
                          type="number"
                          value={formData.fixedAmount}
                          onChange={(e) => setFormData({ ...formData, fixedAmount: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    )}

                    {formData.commissionType === 'percentage' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Percentage Rate (%)
                        </label>
                        <input
                          type="number"
                          value={formData.percentageRate}
                          onChange={(e) => setFormData({ ...formData, percentageRate: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Order Value (৳)
                      </label>
                      <input
                        type="number"
                        value={formData.minOrderValue}
                        onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Commission Cap (৳)
                      </label>
                      <input
                        type="number"
                        value={formData.maxCommission}
                        onChange={(e) => setFormData({ ...formData, maxCommission: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        min="0"
                        step="0.01"
                        placeholder="No limit"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective From
                      </label>
                      <input
                        type="date"
                        value={formData.effectiveFrom}
                        onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective Until
                      </label>
                      <input
                        type="date"
                        value={formData.effectiveUntil}
                        onChange={(e) => setFormData({ ...formData, effectiveUntil: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                        Active
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      <FaSave /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Settings Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">Commission Settings</h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Cap</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {settings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No commission settings configured
                      </td>
                    </tr>
                  ) : (
                    settings.map((setting) => (
                      <tr key={setting.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            setting.settingType === 'global'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {setting.settingType === 'global' ? 'Global' : 'Agent Specific'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {setting.agent
                            ? `${setting.agent.name} ${setting.agent.lastName || ''}`
                            : setting.settingType === 'global' ? 'All Agents' : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {setting.commissionType === 'fixed'
                            ? `৳${setting.fixedAmount} per sale`
                            : `${setting.percentageRate}% of sale`}
                        </td>
                        <td className="px-6 py-4 text-sm">৳{setting.minOrderValue}</td>
                        <td className="px-6 py-4 text-sm">
                          {setting.maxCommission ? `৳${setting.maxCommission}` : 'No limit'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            setting.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {setting.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(setting)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(setting.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
              <select
                value={commissionStatus}
                onChange={(e) => { setCommissionStatus(e.target.value); setCommissionPage(1); }}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={commissionAgentId}
                onChange={(e) => { setCommissionAgentId(e.target.value); setCommissionPage(1); }}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">All Agents</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.lastName || u.last_name || ''}
                  </option>
                ))}
              </select>

              {selectedCommissions.length > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve Selected ({selectedCommissions.length})
                </button>
              )}
            </div>

            {/* Commissions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCommissions(
                              commissions.filter((c) => c.status === 'pending').map((c) => c.id)
                            );
                          } else {
                            setSelectedCommissions([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No commission records found
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {c.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedCommissions.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommissions([...selectedCommissions, c.id]);
                                } else {
                                  setSelectedCommissions(selectedCommissions.filter((id) => id !== c.id));
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">{c.agentName}</td>
                        <td className="px-6 py-4 text-sm">#{c.salesOrderId}</td>
                        <td className="px-6 py-4 text-sm">৳{c.orderAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">
                          ৳{c.commissionAmount.toFixed(2)}
                          <span className="text-xs text-gray-500 ml-1">
                            ({c.commissionType === 'percentage' ? `${c.commissionRate}%` : 'fixed'})
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {c.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(c.id)}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleCancel(c.id)}
                                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {c.status === 'approved' && (
                              <button
                                onClick={() => handleMarkPaid(c.id)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {commissionsTotal > 20 && (
                <div className="p-4 border-t flex justify-center gap-2">
                  <button
                    onClick={() => setCommissionPage((p) => Math.max(1, p - 1))}
                    disabled={commissionPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">Page {commissionPage}</span>
                  <button
                    onClick={() => setCommissionPage((p) => p + 1)}
                    disabled={commissions.length < 20}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                />
              </div>
              <button
                onClick={loadReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-auto"
              >
                Generate Report
              </button>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">Commission Report by Agent</h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No commission data for selected period
                      </td>
                    </tr>
                  ) : (
                    report.map((r) => (
                      <tr key={r.agentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{r.agentName || `Agent #${r.agentId}`}</td>
                        <td className="px-6 py-4 text-sm">{r.totalOrders}</td>
                        <td className="px-6 py-4 text-sm">৳{parseFloat(String(r.totalSales || 0)).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">
                          ৳{parseFloat(String(r.totalCommission || 0)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-yellow-600">
                          ৳{parseFloat(String(r.pendingCommission || 0)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600">
                          ৳{parseFloat(String(r.approvedCommission || 0)).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600">
                          ৳{parseFloat(String(r.paidCommission || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
