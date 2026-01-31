import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import PasswordInput from '@/components/common/PasswordInput';
import PhoneInput, { validateBDPhone } from '@/components/PhoneInput';
import apiClient from '@/services/api';
import {
  clearPendingReferralAttribution,
  getPendingReferralAttribution,
  setPendingReferralAttribution,
} from '@/utils/referralAttribution';
import { getAuthReturnPath } from '@/utils/authReturnPath';
import { FaArrowLeft } from 'react-icons/fa';

export default function Register() {
  const router = useRouter();
  const toast = useToast();
  const referralFromQuery = useMemo(() => {
    const raw = router.query?.ref;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [router.query]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!referralFromQuery) return;
    setPendingReferralAttribution({ code: referralFromQuery, channel: 'share_link' });
  }, [referralFromQuery]);

  const activeReferral = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getPendingReferralAttribution();
  }, [referralFromQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!validateBDPhone(formData.phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || formData.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const pendingReferral = getPendingReferralAttribution();

      const response = await apiClient.post('/customers/public', {
        name: firstName,
        lastName,
        email: formData.email.trim() ? formData.email.trim() : null,
        phone: formData.phone.trim(),
        password: formData.password,
        customerType: 'new',
        status: 'active',
        ...(pendingReferral?.code
          ? {
              ref: pendingReferral.code,
              referralChannel: pendingReferral.channel || 'web',
            }
          : null),
      });

      if (response.data) {
        clearPendingReferralAttribution();
        toast.success('Registration successful! Please login as a customer.');
        router.push('/customer/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <button
            type="button"
            onClick={() => router.push(getAuthReturnPath('/products'))}
            className="group mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2"
          >
            <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Customer Registration</h2>
          <p className="text-sm text-center text-gray-500 mb-6">
            For customer accounts only. Admin will create supplier and staff users.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {activeReferral?.code && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4 text-sm">
              Referral applied: <span className="font-semibold">{activeReferral.code}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Phone *</label>
              <PhoneInput
                name="phone"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                required
                placeholder="1712345678"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Password *</label>
              <PasswordInput
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                inputClassName="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <small className="text-xs text-gray-500">Minimum 6 characters</small>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Confirm Password *</label>
              <PasswordInput
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                inputClassName="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-bold transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/customer/login" className="text-orange-500 font-semibold hover:text-orange-600">
                Customer Login
              </Link>
            </p>

            <div className="mt-4">
              <Link
                href="/products"
                className="inline-flex items-center justify-center w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <ElectroFooter />
    </div>
  );
}
