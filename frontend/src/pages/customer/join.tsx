import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PhoneInput from '@/components/PhoneInput';
import apiClient from '@/services/api';
import { FaLeaf, FaTruck, FaHeart, FaShieldAlt, FaCheckCircle, FaShoppingCart } from 'react-icons/fa';

export default function CustomerJoin() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    profession: '',
    dateOfBirth: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || formData.name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload: Record<string, any> = {
        name: firstName,
        lastName,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        profession: formData.profession.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        customerType: 'new',
        status: 'active',
        lifecycleStage: 'lead',
        referredChannel: 'pickup_truck',
      };

      await apiClient.post('/customers/public', payload);
      setSuccess(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (success) {
    return (
      <>
        <Head>
          <title>Welcome to TrustCart!</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-orange-50 px-4">
          <div className="max-w-md w-full text-center py-16">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
              <FaCheckCircle className="text-green-500 text-4xl" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Welcome to TrustCart!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Thank you for registering! You're now part of our organic family. 
              We'll keep you updated with the freshest deals and offers.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 mb-6">
              <p className="font-semibold mb-1">Want full access?</p>
              <p>
                Visit <span className="font-bold">trustcart.com.bd</span> and register with the same phone
                number to enjoy online ordering, loyalty rewards, and more!
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-500/25 transition-all active:scale-[0.98]"
            >
              <FaShoppingCart />
              Continue Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── Registration form ──
  return (
    <>
      <Head>
        <title>TrustCart – Join Our Organic Family</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
        {/* ─── Hero / Brand Section ─── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-green-500 to-orange-500 text-white">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />

          <div className="relative max-w-lg mx-auto px-6 py-10 text-center">
            <img
              src="/trust-cart-logo-main.png"
              alt="TrustCart"
              className="h-16 mx-auto mb-4 brightness-0 invert drop-shadow-lg"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Fresh. Organic. Delivered.
            </h1>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-sm mx-auto">
              TrustCart brings you the finest organic groceries straight from trusted 
              farms to your doorstep — now available right from our pickup truck!
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-5">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full">
                <FaLeaf className="text-green-200" /> 100% Organic
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full">
                <FaTruck className="text-orange-200" /> Farm Fresh
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full">
                <FaHeart className="text-red-200" /> Healthy Living
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full">
                <FaShieldAlt className="text-blue-200" /> Quality Assured
              </span>
            </div>
          </div>
        </div>

        {/* ─── Form Section ─── */}
        <div className="max-w-2xl mx-auto px-4 -mt-4 pb-10 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Form header */}
            <div className="px-6 pt-6 pb-2 text-center">
              <h2 className="text-xl font-bold text-gray-800">Join Our Organic Family</h2>
              <p className="text-sm text-gray-500 mt-1">
                Quick registration — takes less than a minute!
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  name="phone"
                  value={formData.phone}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  required
                  placeholder="01XXXXXXXXX"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House, Road, Area, City"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition resize-none"
                />
              </div>

              {/* Profession */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Profession
                </label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  placeholder="e.g. Doctor, Engineer, Teacher"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-green-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering…
                  </span>
                ) : (
                  'Register Now'
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-gray-400 leading-relaxed">
                By registering, you agree to receive updates and offers from TrustCart.
                You can register a full account later with the same phone number.
              </p>
            </div>
          </div>

          {/* Bottom branding */}
          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} TrustCart – Your Trusted Organic Grocery Partner
          </p>
        </div>
      </div>
    </>
  );
}
