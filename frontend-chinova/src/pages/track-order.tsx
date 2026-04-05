import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import ElectroNavbar from '@/components/ElectroNavbar';
import ElectroFooter from '@/components/ElectroFooter';
import apiClient from '@/services/api';
import {
  FaClock,
  FaTruck,
  FaBoxOpen,
  FaClipboardList,
  FaSearch,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import { HiOutlineClipboardCheck } from 'react-icons/hi';

const ORDER_STATUSES = [
  { key: 'ordered', label: 'Ordered', sublabel: 'Order placed', icon: HiOutlineClipboardCheck },
  { key: 'processing', label: 'Processing', sublabel: 'Preparing', icon: FaClock },
  { key: 'under_delivery', label: 'Under Delivery', sublabel: 'On Courier', icon: FaTruck },
  { key: 'delivered', label: 'Delivered', sublabel: 'Completed', icon: FaBoxOpen },
];

const STATUS_INDEX_MAP: Record<string, number> = {
  ordered: 0, pending: 0, confirmed: 0, in_review: 0,
  processing: 1, preparing: 1, sent: 1,
  shipped: 2, under_delivery: 2, out_for_delivery: 2, in_transit: 2, hold: 2,
  delivered: 3, completed: 3, delivered_approval_pending: 3,
  partial_delivered: 3, partial_delivered_approval_pending: 3,
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '';
  return new Date(raw).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TrackingEvent {
  status: string;
  location: string | null;
  remarks: string | null;
  trackingMessage: string | null;
  updatedAt: string;
}

interface TrackingResult {
  id: number;
  salesOrderNumber: string;
  status: string;
  courierCompany: string | null;
  courierStatus: string | null;
  trackingId: string;
  totalAmount: number;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingAddress: string | null;
  trackingHistory: TrackingEvent[];
}

export default function TrackOrder() {
  const [trackingId, setTrackingId] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = trackingId.trim();
    if (!id) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const res = await apiClient.get(`/sales/public/track/${encodeURIComponent(id)}`);
      setResult(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('No order found for this tracking ID. Please check and try again.');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const orderStatus = result?.status?.toLowerCase() ?? 'ordered';
  const currentStatusIndex = useMemo(() => STATUS_INDEX_MAP[orderStatus] ?? 0, [orderStatus]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ElectroNavbar />

      <div className="bg-gray-100 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-orange-500">Home</Link> / <span className="text-gray-900 font-semibold">Track Order</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Track Your Order</h1>
          <p className="text-gray-600">Enter your order number or tracking ID to check delivery status</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter Order Number or Tracking ID"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-8 py-3 rounded-lg font-bold transition w-full sm:w-auto"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FaClipboardList className="text-red-400 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Order Not Found</h2>
            <p className="text-gray-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !result && !searched && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <FaTruck className="text-gray-300 text-6xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Enter Your Order Details</h2>
            <p className="text-gray-500">Enter your order number (e.g. LEG-20260313-25) or courier tracking ID to see delivery status</p>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Order Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Order #{result.salesOrderNumber || result.id}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Placed on {formatDate(result.createdAt)}
                  </p>
                  {result.courierCompany && (
                    <p className="text-sm text-gray-500">
                      Courier: <span className="font-medium text-gray-700">{result.courierCompany}</span>
                      {result.trackingId && <> &middot; Tracking: <span className="font-medium text-gray-700">{result.trackingId}</span></>}
                    </p>
                  )}
                </div>
                <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold text-lg">
                  ৳{Number(result.totalAmount || 0).toFixed(0)}
                </div>
              </div>
            </div>

            {/* Order Status Progress */}
            <div className="px-4 sm:px-6 py-6 sm:py-8 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                Delivery Status
                {result.courierStatus && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({result.courierStatus})
                  </span>
                )}
              </h3>
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {ORDER_STATUSES.map((status, index) => {
                  const Icon = status.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isActive = index === currentStatusIndex;
                  const isLast = index === ORDER_STATUSES.length - 1;

                  return (
                    <React.Fragment key={status.key}>
                      <div className="flex flex-col items-center text-center flex-shrink-0">
                        <div
                          className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-1 sm:mb-2 transition-all ${
                            isCompleted
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Icon className={`text-lg sm:text-2xl ${isActive ? 'animate-pulse' : ''}`} />
                        </div>
                        <span
                          className={`text-[10px] sm:text-sm font-semibold ${
                            isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          {status.label}
                        </span>
                        <span className="text-[9px] sm:text-xs text-gray-500 max-w-[60px] sm:max-w-[90px]">
                          {status.sublabel}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={`flex-1 h-1 sm:h-1.5 mx-1 sm:mx-2 rounded-full ${
                            index < currentStatusIndex ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Location Info */}
            {result.shippingAddress && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaMapMarkerAlt className="text-orange-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Delivery Address</div>
                    <div className="font-semibold text-gray-800">
                      {result.shippingAddress}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking History Timeline */}
            {result.trackingHistory && result.trackingHistory.length > 0 && (
              <div className="px-6 py-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tracking History</h3>
                <div className="space-y-0">
                  {result.trackingHistory.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            index === 0 ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                        {index < result.trackingHistory.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 min-h-[32px]" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-4">
                        <div className="font-semibold text-gray-800 text-sm">
                          {event.trackingMessage || event.status || 'Status Update'}
                        </div>
                        {event.remarks && (
                          <div className="text-sm text-gray-600">{event.remarks}</div>
                        )}
                        {event.location && (
                          <div className="text-xs text-gray-500">{event.location}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {formatDate(event.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No tracking history yet */}
            {(!result.trackingHistory || result.trackingHistory.length === 0) && (
              <div className="px-6 py-6 text-center text-gray-500 text-sm">
                No detailed tracking updates yet. Please check back later.
              </div>
            )}
          </div>
        )}
      </div>

      <ElectroFooter />
    </div>
  );
}
