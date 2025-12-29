import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import Link from 'next/link';
import { FaFileExport, FaTags, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface Customer {
  id: number;
  uuid: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  tier?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCustomers();
  }, [tierFilter, currentPage]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (tierFilter) params.tier = tierFilter;
      
      const res = await apiClient.get('/customers', { params });
      const data = Array.isArray(res.data) ? res.data : [];
      setCustomers(data);
      
      // If backend provides pagination metadata
      if (res.data && typeof res.data === 'object' && 'items' in res.data) {
        setCustomers(res.data.items || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(Math.ceil((res.data.total || 0) / itemsPerPage));
      } else {
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to load customers', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.name} ${customer.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || 
           customer.email?.toLowerCase().includes(search) ||
           customer.company?.toLowerCase().includes(search);
  });

  const toggleSelectCustomer = (id: number) => {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleExport = () => {
    const dataToExport = selectedCustomers.length > 0
      ? customers.filter(c => selectedCustomers.includes(c.id))
      : filteredCustomers;

    const csv = [
      ['ID', 'Name', 'Email', 'Phone', 'Company', 'Tier', 'Total Orders', 'Total Spent'].join(','),
      ...dataToExport.map(c => [
        c.id,
        `${c.name} ${c.lastName}`,
        c.email,
        c.phone,
        c.company || '',
        c.tier || '',
        c.totalOrders || 0,
        c.totalSpent || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkTag = async () => {
    const tag = prompt('Enter tag name:');
    if (!tag || selectedCustomers.length === 0) return;

    try {
      await apiClient.post('/customers/bulk-tag', {
        customerIds: selectedCustomers,
        tag,
      });
      alert(`Tagged ${selectedCustomers.length} customers`);
      setSelectedCustomers([]);
    } catch (error) {
      console.error('Failed to tag customers', error);
      alert('Failed to tag customers');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedCustomers.length} customers?`)) return;

    try {
      await apiClient.post('/customers/bulk-delete', {
        customerIds: selectedCustomers,
      });
      alert(`Deleted ${selectedCustomers.length} customers`);
      setSelectedCustomers([]);
      loadCustomers();
    } catch (error) {
      console.error('Failed to delete customers', error);
      alert('Failed to delete customers');
    }
  };

  const getTierBadgeColor = (tier?: string) => {
    const colors: Record<string, string> = {
      platinum: 'bg-purple-100 text-purple-800',
      gold: 'bg-yellow-100 text-yellow-800',
      silver: 'bg-gray-100 text-gray-800',
      bronze: 'bg-orange-100 text-orange-800',
    };
    return colors[tier?.toLowerCase() || 'bronze'] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">CRM Customers</h1>
          <div className="flex gap-2">
            {selectedCustomers.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FaFileExport /> Export ({selectedCustomers.length})
                </button>
                <button
                  onClick={handleBulkTag}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <FaTags /> Tag
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <FaTrash /> Delete
                </button>
              </>
            )}
            <button
              onClick={handleExport}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <FaFileExport /> Export All
            </button>
            <Link 
              href="/admin/customers/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Customer
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Search by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Tier</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="">All Tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => toggleSelectCustomer(customer.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.name} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">ID: {customer.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {customer.company || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{customer.email}</div>
                          <div className="text-gray-500">{customer.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTierBadgeColor(customer.tier)}`}>
                          {customer.tier || 'Bronze'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {customer.totalOrders || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        ${(customer.totalSpent || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/crm/customer/${customer.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} 
              {totalCount > 0 && ` (${totalCount} total customers)`}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <FaChevronLeft /> Previous
              </button>
              <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
