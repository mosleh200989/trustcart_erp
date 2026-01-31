import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Send, Download, CheckCircle, XCircle, Clock, Edit, Trash2, X, FileText } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
// import { addQuoteNotification } from '@/components/QuoteNotifications'; // DISABLED
import { format } from 'date-fns';

interface Quote {
  id: number;
  quoteNumber: string;
  customer: { id: number; name: string };
  deal?: { id: number; name: string };
  validUntil: string;
  lineItems: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  notes?: string;
}

const QuoteManagement = () => {
  const toast = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [filterStatus]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;

      const response = await apiClient.get('/crm/quotes', { params });
      const data = Array.isArray(response.data) ? response.data : [];
      
      // Check for status changes and trigger notifications
      if (quotes.length > 0) {
        data.forEach((newQuote: Quote) => {
          const oldQuote = quotes.find(q => q.id === newQuote.id);
          if (oldQuote && oldQuote.status !== newQuote.status) {
            const messages: Record<string, string> = {
              sent: `Quote ${newQuote.quoteNumber} has been sent to ${newQuote.customer.name}`,
              viewed: `Quote ${newQuote.quoteNumber} was viewed by ${newQuote.customer.name}`,
              accepted: `🎉 Quote ${newQuote.quoteNumber} was accepted by ${newQuote.customer.name}!`,
              rejected: `Quote ${newQuote.quoteNumber} was rejected by ${newQuote.customer.name}`,
            };
            
            const message = messages[newQuote.status] || `Quote ${newQuote.quoteNumber} status changed to ${newQuote.status}`;
            /* DISABLED - Quote Notifications
            addQuoteNotification(
              `quote_${newQuote.status}` as any,
              newQuote.id,
              newQuote.quoteNumber,
              message
            );
            */
          }
        });
      }
      
      setQuotes(data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsSent = async (id: number) => {
    try {
      await apiClient.patch(`/crm/quotes/${id}/send`);
      const quote = quotes.find(q => q.id === id);
      if (quote) {
        /* DISABLED - Quote Notifications
        addQuoteNotification(
          'quote_sent',
          quote.id,
          quote.quoteNumber,
          `Quote ${quote.quoteNumber} has been sent to ${quote.customer.name}`
        );
        */
      }
      fetchQuotes();
    } catch (error) {
      console.error('Error marking quote as sent:', error);
    }
  };

  const downloadPDF = async (id: number) => {
    try {
      const response = await apiClient.get(`/crm/quotes/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'accepted': return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote Management</h1>
              <p className="text-sm text-gray-600 mt-1">Create and manage sales quotes</p>
            </div>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Quote
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-medium">Draft</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {quotes.filter(q => q.status === 'draft').length}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Sent</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {quotes.filter(q => q.status === 'sent').length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700 font-medium">Accepted</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {quotes.filter(q => q.status === 'accepted').length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Total Value</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                ${quotes.reduce((sum, q) => sum + q.total, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Quotes List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredQuotes.map(quote => (
                <div key={quote.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{quote.quoteNumber}</h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border flex items-center gap-1 ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-1">Customer: <span className="font-medium">{quote.customer.name}</span></p>
                      {quote.deal && (
                        <p className="text-sm text-gray-500">Deal: {quote.deal.name}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-2">
                        Valid Until: {format(new Date(quote.validUntil), 'MMM dd, yyyy')}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${quote.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{quote.currency}</p>
                      <div className="mt-3 text-xs text-gray-500">
                        {quote.sentAt && <p>Sent: {format(new Date(quote.sentAt), 'MMM dd')}</p>}
                        {quote.viewedAt && <p>Viewed: {format(new Date(quote.viewedAt), 'MMM dd')}</p>}
                        {quote.acceptedAt && <p>Accepted: {format(new Date(quote.acceptedAt), 'MMM dd')}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Line Items Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items ({quote.lineItems?.length || 0}):</p>
                    <div className="space-y-1">
                      {quote.lineItems?.slice(0, 3).map((item: any, idx: number) => (
                        <p key={idx} className="text-sm text-gray-600">
                          {item.name} - {item.quantity} × ${item.unitPrice}
                        </p>
                      ))}
                      {quote.lineItems?.length > 3 && (
                        <p className="text-sm text-gray-500">+{quote.lineItems.length - 3} more items</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedQuote(quote)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                    {quote.status === 'draft' && (
                      <button
                        onClick={() => markAsSent(quote.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                      >
                        <Send className="w-4 h-4" /> Send to Customer
                      </button>
                    )}
                    <button 
                      onClick={() => downloadPDF(quote.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm flex items-center gap-1">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  </div>
                </div>
              ))}
              {filteredQuotes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No quotes found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quote Modal */}
        {showQuoteModal && (
          <QuoteModal
            onClose={() => setShowQuoteModal(false)}
            onSave={() => {
              setShowQuoteModal(false);
              fetchQuotes();
            }}
          />
        )}

        {/* Quote Detail Modal */}
        {selectedQuote && (
          <QuoteDetailModal
            quote={selectedQuote}
            onClose={() => setSelectedQuote(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Quote Creation Modal
const QuoteModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    dealId: '',
    validUntil: '',
    paymentTerms: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([
    { name: '', quantity: 1, unitPrice: 0, description: '' }
  ]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/customers', { params: { limit: 100 } });
      const data = Array.isArray(response.data) ? response.data : [];
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { name: '', quantity: 1, unitPrice: 0, description: '' }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { subtotal, tax, total } = calculateTotals();
    
    try {
      await apiClient.post('/crm/quotes', {
        ...formData,
        customerId: parseInt(formData.customerId),
        dealId: formData.dealId ? parseInt(formData.dealId) : undefined,
        lineItems,
        subtotal,
        tax,
        total,
      });
      onSave();
    } catch (error) {
      console.error('Error creating quote:', error);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Create New Quote</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
              <input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Line Items *</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Item name"
                        required
                        value={item.name}
                        onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Unit Price"
                        required
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="font-medium text-gray-700">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax (10%):</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <textarea
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Payment due within 30 days"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or terms..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Quote
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Quote Detail Modal
const QuoteDetailModal = ({ quote, onClose }: { quote: Quote; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Quote Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quote Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Quote Number</p>
              <p className="font-semibold text-gray-900">{quote.quoteNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(quote.status)}`}>
                {quote.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold text-gray-900">{quote.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valid Until</p>
              <p className="font-semibold text-gray-900">{format(new Date(quote.validUntil), 'MMM dd, yyyy')}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Price</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {quote.lineItems?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">${item.unitPrice}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-medium">${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax:</span>
              <span className="font-medium">${quote.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Discount:</span>
              <span className="font-medium">-${quote.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
              <span>Total:</span>
              <span>${quote.total.toFixed(2)} {quote.currency}</span>
            </div>
          </div>

          {quote.notes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded">{quote.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'sent': return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'accepted': return 'bg-green-100 text-green-700 border-green-300';
    case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export default QuoteManagement;
