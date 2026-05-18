import { useEffect, useState } from 'react';
import { FaSave, FaShieldAlt } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface OrderGuardSettings {
  id: number;
  isActive: boolean;
  windowMinutes: number;
  blockNoteHtml: string;
}

export default function OrderGuardSettingsPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-order-guard');
  const [settings, setSettings] = useState<OrderGuardSettings | null>(null);
  const [form, setForm] = useState({ isActive: true, windowMinutes: 10, blockNoteHtml: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/order-guard-settings');
      setSettings(res.data);
      setForm({
        isActive: Boolean(res.data?.isActive),
        windowMinutes: Number(res.data?.windowMinutes || 10),
        blockNoteHtml: res.data?.blockNoteHtml || '',
      });
    } catch {
      toast.error('Failed to load Order Guard settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('You do not have permission to manage Order Guard');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        isActive: form.isActive,
        windowMinutes: Math.max(1, Math.round(Number(form.windowMinutes || 1))),
        blockNoteHtml: form.blockNoteHtml,
      };
      const res = await apiClient.put('/order-guard-settings', payload);
      setSettings(res.data);
      toast.success('Order Guard settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save Order Guard settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
              <FaShieldAlt className="text-blue-600" />
              Order Guard
            </h1>
            <p className="mt-1 text-gray-600">Prevent duplicate website and landing page orders from the same IP within a configured time window.</p>
          </div>
          {settings && (
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${form.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {form.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-10 text-center shadow">Loading settings...</div>
        ) : (
          <form onSubmit={saveSettings} className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    disabled={!canManage}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">Enable Order Guard</span>
                    <span className="block text-xs text-gray-500">Apply duplicate protection to website and landing-page orders.</span>
                  </span>
                </label>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Duplicate Window (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={form.windowMinutes}
                    disabled={!canManage}
                    onChange={(e) => setForm((prev) => ({ ...prev, windowMinutes: Number(e.target.value) }))}
                    className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <RichTextEditor
                label="Customer Note"
                value={form.blockNoteHtml}
                onChange={(value) => canManage && setForm((prev) => ({ ...prev, blockNoteHtml: value }))}
                placeholder="Write the message customers will see when duplicate ordering is blocked..."
              />

              <div className="mt-5">
                <div className="mb-2 text-sm font-medium text-gray-700">Preview</div>
                <div
                  className="prose max-w-none rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
                  dangerouslySetInnerHTML={{ __html: form.blockNoteHtml || '<p>No note configured.</p>' }}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canManage || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSave />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
