import React, { useEffect, useMemo, useState } from 'react';
import Router from 'next/router';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth } from '@/services/api';
import apiClient from '@/services/api';
import {
  clearPendingReferralAttribution,
  getPendingReferralAttribution,
  setPendingReferralAttribution,
} from '@/utils/referralAttribution';
import { getAuthReturnPath } from '@/utils/authReturnPath';
import { FaArrowLeft } from 'react-icons/fa';

export default function CustomerRegister() {
  const router = useRouter();
  const referralFromQuery = useMemo(() => {
    const raw = router.query?.ref;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [router.query]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!referralFromQuery) return;
    setPendingReferralAttribution({ code: referralFromQuery, channel: 'share_link' });
  }, [referralFromQuery]);

  const activeReferral = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getPendingReferralAttribution();
  }, [referralFromQuery]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const trimmedFullName = name.trim();
      const nameParts = trimmedFullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || trimmedFullName;
      const lastName = nameParts.slice(1).join(' ') || '';

      const pendingReferral = getPendingReferralAttribution();
      
      await apiClient.post('/customers/public', {
        name: firstName,
        lastName,
        email: email.trim() ? email.trim() : null,
        phone: phone.trim(),
        password,
        customerType: 'new',
        status: 'active',
        ...(pendingReferral?.code
          ? {
              ref: pendingReferral.code,
              referralChannel: pendingReferral.channel || 'web',
            }
          : null),
      });
      
      setSuccess(true);
      clearPendingReferralAttribution();
      setTimeout(() => {
        Router.push('/customer/login');
      }, 2000);
    } catch (err: any) {
      console.log("Registration Error:", err);
      setError(err?.response?.data?.message || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <button
          type="button"
          onClick={() => router.push(getAuthReturnPath('/products'))}
          className="group mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-600"
        >
          <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600 mb-2">TrustCart ERP</h1>
          <p className="text-gray-600">Create Customer Account</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            Registration successful! Redirecting to login...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {activeReferral?.code && !success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
            Referral applied: <span className="font-semibold">{activeReferral.code}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Full Name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Email Address"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Phone Number"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Password"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2 text-sm">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Password Again"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link href="/customer/login" className="text-orange-600 font-semibold hover:underline">
              Login here
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
  );
}
