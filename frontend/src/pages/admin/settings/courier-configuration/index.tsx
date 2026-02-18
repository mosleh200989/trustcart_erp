import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import FormInput from '@/components/admin/FormInput';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import apiClient from '@/services/api';

interface CourierConfiguration {
  id: number;
  companyname?: string | null;
  username?: string | null;
  apiKey?: string | null;
  token?: string | null;
  refreshToken?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const normalizeOptionalString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default function AdminCourierConfigurationPage() {
  const [configs, setConfigs] = useState<CourierConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    companyname: '',
    username: '',
    password: '',
    apiKey: '',
    token: '',
    refreshToken: '',
    isActive: true,
  });

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/settings/couriers');
      setConfigs(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load courier configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const columns = useMemo(
    () => [
      { key: 'companyname', label: 'Company' },
      { key: 'username', label: 'Username' },
      {
        key: 'apiKey',
        label: 'API Key',
        render: (value: any) => (value ? String(value) : '-'),
      },
      {
        key: 'token',
        label: 'Token',
        render: (value: any) => (value ? String(value).slice(0, 12) + '…' : '-'),
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        render: (value: any) => (value ? String(value).slice(0, 12) + '…' : '-'),
      },
      {
        key: 'isActive',
        label: 'Active',
        render: (value: any) => (value ? 'Yes' : 'No'),
      },
      {
        key: 'updatedAt',
        label: 'Updated',
        render: (value: any) => {
          if (!value) return '-';
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
        },
      },
    ],
    [],
  );

  const onTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      companyname: normalizeOptionalString(form.companyname),
      username: normalizeOptionalString(form.username),
      password: normalizeOptionalString(form.password),
      apiKey: normalizeOptionalString(form.apiKey),
      token: normalizeOptionalString(form.token),
      refreshToken: normalizeOptionalString(form.refreshToken),
      isActive: form.isActive,
    };

    try {
      await apiClient.post('/settings/couriers', payload);
      setForm({
        companyname: '',
        username: '',
        password: '',
        apiKey: '',
        token: '',
        refreshToken: '',
        isActive: true,
      });
      setIsModalOpen(false);
      await loadConfigs();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save courier configuration');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Courier Configuration</h1>
              <p className="text-sm text-gray-600 mt-1">Add courier credentials and tokens for integrations.</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
            >
              Add Courier
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {String(error)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Configured Couriers</h2>
          <DataTable columns={columns} data={configs} loading={loading} />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="Add Courier Configuration"
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="courier-config-form"
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {String(error)}
            </div>
          )}

          <form id="courier-config-form" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Company Name"
                name="companyname"
                value={form.companyname}
                onChange={onTextChange}
                placeholder="e.g. Steadfast / Pathao"
              />
              <FormInput label="Username" name="username" value={form.username} onChange={onTextChange} />
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={onTextChange}
              />
              <FormInput label="API Key" name="apiKey" value={form.apiKey} onChange={onTextChange} />
              <FormInput label="Token" name="token" value={form.token} onChange={onTextChange} />
              <FormInput
                label="Refresh Token"
                name="refreshToken"
                value={form.refreshToken}
                onChange={onTextChange}
              />
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active
              </label>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
