import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface Quote {
  id: number;
  quoteNumber: string;
  customerId: number;
  totalAmount: number;
  status: string;
  version: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  createdAt: string;
}

export default function QuoteApprovalsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingQuotes();
  }, []);

  const loadPendingQuotes = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Quote[]>('/crm/quotes/pending-approvals');
      const data = Array.isArray(res.data) ? res.data : [];
      setQuotes(data);
    } catch (error) {
      console.error('Failed to load pending quotes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (quoteId: number) => {
    const comments = prompt('Approval comments (optional):');
    try {
      await apiClient.post(`/crm/quotes/${quoteId}/approve`, { comments });
      loadPendingQuotes();
      alert('Quote approved successfully');
    } catch (error) {
      console.error('Failed to approve quote', error);
      alert('Failed to approve quote');
    }
  };

  const handleReject = async (quoteId: number) => {
    const comments = prompt('Rejection reason:');
    if (!comments) return;

    try {
      await apiClient.post(`/crm/quotes/${quoteId}/reject-approval`, { comments });
      loadPendingQuotes();
      alert('Quote rejected');
    } catch (error) {
      console.error('Failed to reject quote', error);
      alert('Failed to reject quote');
    }
  };

  const handleDownloadPDF = async (quoteId: number) => {
    try {
      const res = await apiClient.post(`/crm/quotes/${quoteId}/generate-pdf`, {}, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${quoteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download PDF');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Quote Approvals</h1>

        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No pending approvals
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{quote.quoteNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Customer #{quote.customerId}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">${quote.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">v{quote.version}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPDF(quote.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleApprove(quote.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(quote.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
