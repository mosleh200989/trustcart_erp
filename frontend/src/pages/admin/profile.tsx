import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import PasswordInput from '@/components/common/PasswordInput';
import { users as usersAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageToCloudinary, validateImageFile } from '@/utils/cloudinary';
import { FaCamera, FaUser, FaMoneyBillWave, FaLock } from 'react-icons/fa';

const PAYMENT_METHODS = [
  { value: '', label: 'Select payment method' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const MFS_METHODS = ['bkash', 'nagad', 'rocket'];

type Profile = {
  id: number;
  name?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  paymentMethod?: string | null;
  paymentPhone?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  bankAccountNumber?: string | null;
  bankBranchName?: string | null;
};

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, roles, refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    phone: '',
    avatarUrl: '',
    paymentMethod: '',
    paymentPhone: '',
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankBranchName: '',
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
          paymentMethod: me?.paymentMethod || '',
          paymentPhone: me?.paymentPhone || '',
          bankName: me?.bankName || '',
          bankAccountHolder: me?.bankAccountHolder || '',
          bankAccountNumber: me?.bankAccountNumber || '',
          bankBranchName: me?.bankBranchName || '',
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(null);
      const result = await uploadImageToCloudinary(file);
      setForm((p) => ({ ...p, avatarUrl: result.url }));
      setSuccess('Image uploaded. Click "Save changes" to apply.');
    } catch (err: any) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

      // Validate bank transfer fields
      if (form.paymentMethod === 'bank_transfer') {
        if (!form.bankName.trim() || !form.bankAccountHolder.trim() || !form.bankAccountNumber.trim() || !form.bankBranchName.trim()) {
          setError('For bank transfer, bank name, account holder name, account number and branch name are mandatory.');
          return;
        }
      }

      // Validate MFS phone
      if (MFS_METHODS.includes(form.paymentMethod) && !form.paymentPhone.trim()) {
        setError(`Please enter your ${PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.label} phone number.`);
        return;
      }

      const payload: any = {
        name: form.name,
        lastName: form.lastName,
        phone: form.phone || null,
        avatarUrl: form.avatarUrl || null,
        paymentMethod: form.paymentMethod || null,
        paymentPhone: MFS_METHODS.includes(form.paymentMethod) ? (form.paymentPhone || null) : null,
        bankName: form.paymentMethod === 'bank_transfer' ? (form.bankName || null) : null,
        bankAccountHolder: form.paymentMethod === 'bank_transfer' ? (form.bankAccountHolder || null) : null,
        bankAccountNumber: form.paymentMethod === 'bank_transfer' ? (form.bankAccountNumber || null) : null,
        bankBranchName: form.paymentMethod === 'bank_transfer' ? (form.bankBranchName || null) : null,
      };

      if (form.password) {
        payload.password = form.password;
      }

      const updated = await usersAPI.updateMe(payload);
      setProfile(updated);
      setForm((p) => ({ ...p, password: '', confirmPassword: '' }));

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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600 mt-1">Update your profile information and preferences.</p>
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
          <div className="space-y-6">
            {/* Avatar & Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaUser className="text-blue-600" /> Personal Information
              </h2>

              {/* Avatar Upload */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    {form.avatarUrl ? (
                      <img
                        src={form.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-gray-400 text-3xl" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 w-24 h-24 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <FaCamera className="text-white text-lg" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Profile Photo</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadingAvatar ? 'Uploading…' : 'Click on the photo to change. JPEG, PNG, WebP (max 20MB)'}
                  </p>
                  {form.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, avatarUrl: '' }))}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    value={
                      (roles && roles.length > 0)
                        ? roles.map((r) => r.name || r.slug).join(', ')
                        : (user as any)?.roleSlug || ''
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Payment Preferences */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600" /> Payment Preference
              </h2>
              <p className="text-sm text-gray-500 mb-4">Set your preferred payment method for salary or commission payouts.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* MFS phone number */}
                {MFS_METHODS.includes(form.paymentMethod) && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.label} Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.paymentPhone}
                      onChange={(e) => setForm((p) => ({ ...p, paymentPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                )}

                {/* Bank transfer fields */}
                {form.paymentMethod === 'bank_transfer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name <span className="text-red-500">*</span></label>
                      <input
                        value={form.bankName}
                        onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="e.g. Dutch-Bangla Bank"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name <span className="text-red-500">*</span></label>
                      <input
                        value={form.bankAccountHolder}
                        onChange={(e) => setForm((p) => ({ ...p, bankAccountHolder: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="Full name as on bank account"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number <span className="text-red-500">*</span></label>
                      <input
                        value={form.bankAccountNumber}
                        onChange={(e) => setForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name <span className="text-red-500">*</span></label>
                      <input
                        value={form.bankBranchName}
                        onChange={(e) => setForm((p) => ({ ...p, bankBranchName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="e.g. Gulshan Branch"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaLock className="text-orange-500" /> Change Password
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <PasswordInput
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    inputClassName="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <PasswordInput
                    value={form.confirmPassword}
                    onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    inputClassName="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving || uploadingAvatar}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
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
