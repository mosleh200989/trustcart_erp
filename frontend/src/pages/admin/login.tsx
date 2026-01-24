import React, { useState } from 'react';
import Router from 'next/router';
import Link from 'next/link';
import apiClient, { auth } from '../../services/api';
import { getAuthReturnPath } from '@/utils/authReturnPath';
import { FaArrowLeft } from 'react-icons/fa';
import PasswordInput from '@/components/common/PasswordInput';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await auth.login(email, password);
      if (data && data.accessToken) {
        const roleSlug = data?.user?.roleSlug as string | undefined;

        // Prevent customer/supplier accounts from logging into the admin panel
        if (roleSlug === 'customer-account' || roleSlug === 'supplier-account') {
          setError('Customer and supplier accounts cannot access the admin panel. Please use the dedicated portal login.');
          return;
        }

        localStorage.setItem('authToken', data.accessToken);
        Router.push('/admin/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <button
          type="button"
          onClick={() => Router.push(getAuthReturnPath('/'))}
          className="group mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-green-700"
        >
          <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <img src="/trust-cart-logo-main.png" alt="TrustCart ERP" className="h-20 mx-auto mb-4" />
          <p className="text-gray-600">Admin Login</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="admin@trustcart.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center mb-2">Demo Credentials:</p>
          <p className="text-xs text-gray-700 text-center">
            Email: admin@trustcart.com<br />
            Password: admin123
          </p>
        </div>

        {/* Customer Login Link */}
        <div className="mt-4 text-center text-xs text-gray-600">
          Customer account?{' '}
          <Link href="/customer/login" className="text-green-600 font-semibold hover:text-green-700">
            Go to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
