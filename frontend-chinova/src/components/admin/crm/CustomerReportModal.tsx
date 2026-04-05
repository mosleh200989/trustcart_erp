import { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import { FaTimes, FaCalendarAlt, FaUsers, FaShoppingCart, FaDollarSign, FaChevronDown, FaChevronUp, FaFileExport } from 'react-icons/fa';

interface CustomerReportEntry {
  id: number;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  assignedTo: string | null;
  priority: string | null;
}

interface DateWiseEntry {
  date: string;
  newCustomers: number;
  totalOrders: number;
  revenue: number;
  customers: CustomerReportEntry[];
}

interface ReportData {
  summary: {
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
  };
  dateWise: DateWiseEntry[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerReportModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/crm/team/customer-report', {
        params: { from: dateFrom, to: dateTo },
      });
      setReportData((res as any)?.data || null);
    } catch (error) {
      console.error('Failed to fetch customer report', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'hot':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Hot</span>;
      case 'warm':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Warm</span>;
      case 'cold':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Cold</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">New</span>;
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows: string[] = ['Date,Customer Name,Phone,Email,Orders,Total Spent,Assigned To,Priority'];
    for (const entry of reportData.dateWise) {
      for (const c of entry.customers) {
        rows.push(
          `${entry.date},"${c.name}","${c.phone}","${c.email}",${c.orderCount},${c.totalSpent},"${c.assignedTo || 'Unassigned'}","${c.priority || 'new'}"`,
        );
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Date-Wise Customer Report</h2>
            <p className="text-sm text-gray-500">View customer registrations grouped by date</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Date Filters */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <FaCalendarAlt size={12} />
              {loading ? 'Loading...' : 'Generate'}
            </button>
            {reportData && reportData.dateWise.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <FaFileExport size={12} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading report...</span>
            </div>
          ) : !reportData ? (
            <div className="text-center py-12 text-gray-500">
              Select a date range and click Generate to view the report.
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <FaUsers className="mx-auto text-blue-600 mb-1" size={20} />
                  <div className="text-2xl font-bold text-blue-800">
                    {reportData.summary.totalCustomers}
                  </div>
                  <div className="text-xs text-blue-600">New Customers</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <FaShoppingCart className="mx-auto text-green-600 mb-1" size={20} />
                  <div className="text-2xl font-bold text-green-800">
                    {reportData.summary.totalOrders}
                  </div>
                  <div className="text-xs text-green-600">Total Orders</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <FaDollarSign className="mx-auto text-purple-600 mb-1" size={20} />
                  <div className="text-2xl font-bold text-purple-800">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </div>
                  <div className="text-xs text-purple-600">Total Revenue</div>
                </div>
              </div>

              {/* Date-wise Breakdown */}
              {reportData.dateWise.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No customer data found for the selected date range.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.dateWise.map((entry) => (
                    <div key={entry.date} className="border rounded-lg overflow-hidden">
                      {/* Date Header (clickable) */}
                      <button
                        onClick={() => toggleDate(entry.date)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">
                            {formatDate(entry.date)}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {entry.newCustomers} customer{entry.newCustomers !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {entry.totalOrders} order{entry.totalOrders !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {formatCurrency(entry.revenue)}
                          </span>
                        </div>
                        {expandedDates.has(entry.date) ? (
                          <FaChevronUp className="text-gray-500" size={14} />
                        ) : (
                          <FaChevronDown className="text-gray-500" size={14} />
                        )}
                      </button>

                      {/* Expanded Customer List */}
                      {expandedDates.has(entry.date) && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-t">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Customer
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Contact
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                  Orders
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                  Spent
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  Assigned To
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                  Priority
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {entry.customers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <div className="font-medium text-gray-900">{c.name}</div>
                                    <div className="text-xs text-gray-400">ID: {c.id}</div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="text-gray-700">{c.phone || '-'}</div>
                                    <div className="text-xs text-gray-400">{c.email || '-'}</div>
                                  </td>
                                  <td className="px-4 py-2 text-center font-medium text-gray-700">
                                    {c.orderCount}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-700">
                                    {formatCurrency(c.totalSpent)}
                                  </td>
                                  <td className="px-4 py-2">
                                    {c.assignedTo ? (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                        {c.assignedTo}
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                        Unassigned
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {getPriorityBadge(c.priority)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
