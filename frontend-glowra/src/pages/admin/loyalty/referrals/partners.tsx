import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

type Partner = {
  id: string;
  code: string;
  partner_type: string;
  name?: string | null;
  is_active: boolean;
  created_at?: string;
};

export default function AdminReferralPartners() {
  const toast = useToast();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<any>({ code: '', partner_type: 'influencer', name: '', is_active: true });

  const [reportCode, setReportCode] = useState<string>('');
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/loyalty/referral-partners?includeInactive=true');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load partners', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ code: '', partner_type: 'influencer', name: '', is_active: true });
  };

  const startEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      code: p.code ?? '',
      partner_type: p.partner_type ?? 'influencer',
      name: p.name ?? '',
      is_active: Boolean(p.is_active),
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        code: String(form.code || '').trim(),
        partner_type: String(form.partner_type || 'influencer').trim(),
        name: form.name ? String(form.name) : null,
        is_active: Boolean(form.is_active),
      };

      if (editing?.id) {
        await apiClient.put(`/loyalty/referral-partners/${editing.id}`, payload);
      } else {
        await apiClient.post('/loyalty/referral-partners', payload);
      }

      await load();
      resetForm();
      toast.success('Partner saved successfully');
    } catch (e) {
      console.error('Failed to save partner', e);
      toast.error('Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async (code: string) => {
    try {
      setReportLoading(true);
      const res = await apiClient.get(`/loyalty/referral-partners/${encodeURIComponent(code)}/report?limit=50`);
      setReport(res.data);
    } catch (e) {
      console.error('Failed to load report', e);
      setReport(null);
      toast.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Partners</h1>
            <p className="text-sm text-gray-600">Influencer/community codes + performance reporting</p>
          </div>
          <Link href="/admin/loyalty/referrals" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Partners</div>
              <button
                onClick={load}
                className="text-sm px-3 py-2 rounded border hover:bg-gray-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No partners found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2">Code</th>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Active</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.code}</td>
                        <td className="px-4 py-2 text-gray-700">{p.partner_type}</td>
                        <td className="px-4 py-2 text-gray-700">{p.name || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {p.is_active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setReportCode(p.code);
                              loadReport(p.code);
                            }}
                            className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
                          >
                            Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <div className="font-semibold">{editing ? 'Edit partner' : 'New partner'}</div>
            </div>
            <div className="p-4 space-y-3">
              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Code</div>
                <input
                  value={form.code}
                  onChange={(e) => setForm((prev: any) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. NILOY10"
                />
              </label>

              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Type</div>
                <select
                  value={form.partner_type}
                  onChange={(e) => setForm((prev: any) => ({ ...prev, partner_type: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="influencer">Influencer</option>
                  <option value="community">Community</option>
                  <option value="agent">Agent</option>
                  <option value="affiliate">Affiliate</option>
                </select>
              </label>

              <label className="block">
                <div className="text-xs text-gray-600 mb-1">Name</div>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="(optional)"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm((prev: any) => ({ ...prev, is_active: e.target.checked }))}
                />
                Active
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={save}
                  disabled={saving || !String(form.code || '').trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 disabled:bg-gray-400"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={resetForm} className="px-3 py-2 rounded border hover:bg-gray-50">
                  Clear
                </button>
              </div>

              <div className="border-t pt-4">
                <div className="font-semibold mb-2">Quick report</div>
                <div className="flex gap-2">
                  <input
                    value={reportCode}
                    onChange={(e) => setReportCode(e.target.value.toUpperCase())}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Partner code"
                  />
                  <button
                    className="px-3 py-2 rounded border hover:bg-gray-50"
                    disabled={reportLoading || !reportCode}
                    onClick={() => loadReport(reportCode)}
                  >
                    {reportLoading ? 'Loading…' : 'Load'}
                  </button>
                </div>

                {report ? (
                  <div className="mt-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-600">Invited</div>
                        <div className="font-bold">{report.funnel?.invited ?? 0}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-600">Completed</div>
                        <div className="font-bold">{report.funnel?.completed ?? 0}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-600">Orders</div>
                        <div className="font-bold">{report.revenue?.order_count ?? 0}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-xs text-gray-600">Revenue</div>
                        <div className="font-bold">৳{Math.round(report.revenue?.total_revenue ?? 0)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Attribution is based on referral_events.partner_code.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
