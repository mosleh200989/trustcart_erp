import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaUndo, FaSpinner, FaCheckCircle, FaTimesCircle, FaCalendarAlt, FaBarcode } from 'react-icons/fa';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface ReturnResult {
  courierOrderId: string;
  success: boolean;
  orderId?: number;
  message?: string;
}

export default function CourierReturnOrdersPage() {
  const toast = useToast();
  const [returnDate, setReturnDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [courierIdsText, setCourierIdsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ReturnResult[] | null>(null);

  const courierIds = courierIdsText
    .split('\n')
    .map((id) => id.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!returnDate) {
      toast.error('Please select a return date');
      return;
    }
    if (courierIds.length === 0) {
      toast.error('Please enter at least one Courier ID');
      return;
    }

    setSubmitting(true);
    setResults(null);
    try {
      const res = await apiClient.post('/sales/courier-returns', {
        courierOrderIds: courierIds,
        returnDate,
      });
      const body = res.data;
      if (body && Array.isArray(body.results)) {
        setResults(body.results);
        const successCount = body.results.filter((r: ReturnResult) => r.success).length;
        const failCount = body.results.filter((r: ReturnResult) => !r.success).length;
        if (failCount === 0) {
          toast.success(`All ${successCount} orders marked as returned`);
        } else if (successCount === 0) {
          toast.error(`Failed to process all ${failCount} courier IDs`);
        } else {
          toast.success(`${successCount} returned, ${failCount} failed`);
        }
      } else {
        toast.success('Courier returns processed');
      }
    } catch (err: any) {
      console.error('Failed to submit courier returns:', err);
      const msg = err?.response?.data?.message || 'Failed to process courier returns';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setCourierIdsText('');
    setResults(null);
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FaUndo className="text-orange-500" />
            Courier Return Orders
          </h1>
          <p className="text-gray-600 mt-1">
            Mark orders as returned by entering courier IDs
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-5">
            {/* Return Date */}
            <div>
              <label htmlFor="returnDate" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <FaCalendarAlt className="text-gray-400" size={14} />
                Return Date
              </label>
              <input
                id="returnDate"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full md:w-64 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Courier IDs */}
            <div>
              <label htmlFor="courierIds" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <FaBarcode className="text-gray-400" size={14} />
                Courier IDs
                <span className="text-xs font-normal text-gray-400">(one per line)</span>
              </label>
              <textarea
                id="courierIds"
                value={courierIdsText}
                onChange={(e) => setCourierIdsText(e.target.value)}
                placeholder={"Enter courier IDs, one per line:\nCON-123456\nCON-789012\nCON-345678"}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono"
                rows={8}
                required
              />
              {courierIds.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {courierIds.length} courier ID{courierIds.length !== 1 ? 's' : ''} entered
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || courierIds.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaUndo size={14} />
                    Mark as Returned
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Results
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({results.filter((r) => r.success).length} success, {results.filter((r) => !r.success).length} failed)
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-3 ${r.success ? 'bg-green-50/50' : 'bg-red-50/50'}`}
                >
                  {r.success ? (
                    <FaCheckCircle className="text-green-500 flex-shrink-0" size={16} />
                  ) : (
                    <FaTimesCircle className="text-red-500 flex-shrink-0" size={16} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-mono font-medium text-gray-800">{r.courierOrderId}</span>
                    {r.orderId && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Order #{r.orderId})
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${r.success ? 'text-green-700' : 'text-red-700'}`}>
                    {r.message || (r.success ? 'Returned' : 'Failed')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
