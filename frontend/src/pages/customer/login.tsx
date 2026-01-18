import React, { useState } from 'react';
import Router from 'next/router';
import Link from 'next/link';
import { auth } from '@/services/api';
import { getAuthReturnPath } from '@/utils/authReturnPath';
import { FaArrowLeft } from 'react-icons/fa';

export default function CustomerLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await auth.login(identifier, password);
      if (data && data.accessToken) {
        const roleSlug = data?.user?.roleSlug as string | undefined;

        if (roleSlug !== 'customer-account') {
          setError('This login is only for customer accounts.');
          return;
        }

        localStorage.setItem('authToken', data.accessToken);
        Router.push('/customer/dashboard');
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
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <button
          type="button"
          onClick={() => Router.push(getAuthReturnPath('/products'))}
          className="group mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-600"
        >
          <FaArrowLeft className="text-xs transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-600 mb-2">TrustCart ERP</h1>
          <p className="text-gray-600">Customer Login</p>
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
              Email or Phone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Email or Phone"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter Your Password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-2">
            Don't have an account?{' '}
            <Link href="/customer/register" className="text-orange-600 font-semibold hover:underline">
              Register here 
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

          <p className="text-xs text-gray-500">
            Customer portal access for customer accounts only.
          </p>
        </div>
      </div>
    </div>
  );
}
