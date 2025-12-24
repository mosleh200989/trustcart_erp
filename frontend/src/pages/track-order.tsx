import { useState } from 'react';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setMessage('Please enter a valid Order ID.');
      return;
    }
    setMessage('Order tracking is not fully implemented yet. Please contact support with your Order ID.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            Home / <span className="text-gray-900 font-semibold">Track Order</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Track Your Order</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter your Order ID"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition"
            >
              Track Order
            </button>
          </form>
          {message && (
            <p className="mt-4 text-sm text-gray-700">{message}</p>
          )}
        </div>
      </div>

      <ElectroFooter />
    </div>
  );
}
