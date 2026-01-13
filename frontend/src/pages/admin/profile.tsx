import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import { users as usersAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Profile = {
  id: number;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export default function AdminProfilePage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const me = await usersAPI.me();
        setProfile(me);
        setForm({
          name: me?.name || '',
          lastName: me?.lastName || '',
          phone: me?.phone || '',
          avatarUrl: me?.avatarUrl || '',
          password: '',
          confirmPassword: '',
        });
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (form.password || form.confirmPassword) {
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError('Password and confirm password do not match');
          return;
        }
      }

      const payload: any = {
        name: form.name,
        lastName: form.lastName,
        phone: form.phone || null,
        avatarUrl: form.avatarUrl || null,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const updated = await usersAPI.updateMe(payload);
      setProfile(updated);
      setForm((p) => ({ ...p, password: '', confirmPassword: '' }));

      // Refresh /auth/me so sidebar/header reflect new values.
      await refresh();

      setSuccess('Profile updated successfully');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600 mt-1">Update your admin profile information.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-4 text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Email changes are disabled for safety.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                <input
                  value={form.avatarUrl}
                  onChange={(e) => setForm((p) => ({ ...p, avatarUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Change password</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
