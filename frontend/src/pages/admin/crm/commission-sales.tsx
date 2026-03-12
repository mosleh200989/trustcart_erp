import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { FaSearch, FaFileExcel, FaFilePdf, FaCheck, FaTimes } from 'react-icons/fa';
import apiClient from '@/services/api';
import { ORDER_STATUS_MAP, getOrderStatusLabel, getOrderStatusColor } from '@/utils/orderStatus';

interface CommissionSale {
  commissionId: number;
  agentId: number;
  agentName: string;
  customerId: number;
  orderId: number;
  salesOrderNumber: string;
  orderDate: string;
  orderStatus: string;
  totalAmount: number;
  deliveryCharge: number;
  codAmount: number;
  discountAmount: number;
  courierCompany: string | null;
  courierOrderId: string | null;
  trackingId: string | null;
  paymentStatus: string;
  customerName: string | null;
  customerPhone: string | null;
  commissionRate: number;
  commissionAmount: number;
  commissionType: string;
  commissionStatus: string;
  approvedAt: string | null;
  paidAt: string | null;
  products: string;
}

interface Agent {
  id: number;
  name: string;
}

function getTodayDateString() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

export default function CommissionSalesPage() {
  const toast = useToast();
  const router = useRouter();

  const [sales, setSales] = useState<CommissionSale[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const [searchText, setSearchText] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pre-fill agent filter from URL query param
  useEffect(() => {
    if (router.isReady && router.query.agentId) {
      setAgentFilter(String(router.query.agentId));
    }
  }, [router.isReady, router.query.agentId]);

  // Order details modal
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Inline editing state: { [orderId-field]: value }
  const [editingCell, setEditingCell] = useState<{ orderId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (orderId: number, field: string, currentValue: number) => {
    setEditingCell({ orderId, field });
    setEditValue(String(currentValue));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const numVal = parseFloat(editValue);
    if (isNaN(numVal) || numVal < 0) {
      toast.error('Please enter a valid number');
      return;
    }
    try {
      await apiClient.put(`/crm/commissions/sales/${editingCell.orderId}`, {
        [editingCell.field]: numVal,
      });
      // Update local state
      setSales((prev) =>
        prev.map((s) =>
          s.orderId === editingCell.orderId
            ? { ...s, [editingCell.field]: numVal }
            : s
        )
      );
      toast.success('Updated successfully');
    } catch {
      toast.error('Failed to update');
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const loadSales = useCallback(async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const ps = pageSize ?? itemsPerPage;
      const params: any = { page: p, limit: ps };

      if (statusFilter) params.status = statusFilter;
      if (agentFilter) params.agentId = agentFilter;
      if (commissionStatusFilter) params.commissionStatus = commissionStatusFilter;
      if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;
      if (monthFilter) {
        const [y, m] = monthFilter.split('-');
        params.startDate = `${y}-${m}-01`;
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        params.endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (searchText.trim()) params.search = searchText.trim();

      const response = await apiClient.get('/crm/commissions/sales', { params });
      const data = response.data;
      setSales(data.data || []);
      setTotalCount(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / ps));
      if (data.agents && agents.length === 0) {
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load commission sales:', error);
      toast.error('Failed to load commission sales data');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, statusFilter, agentFilter, commissionStatusFilter, paymentStatusFilter, monthFilter, startDate, endDate, searchText]);

  useEffect(() => {
    loadSales(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, agentFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSelectedRowIds([]);
    loadSales(1, itemsPerPage);
  };

  const handleViewOrder = (row: CommissionSale) => {
    setSelectedOrderId(row.orderId);
    setShowOrderDetails(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'orderDate',
      label: 'Date',
      sortable: true,
      render: (_: any, row: CommissionSale) => {
        const raw = row.orderDate;
        if (!raw) return '-';
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '-';
        const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
        return (
          <div>
            <div>{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
          </div>
        );
      },
    },
    {
      key: 'courierOrderId',
      label: 'Courier ID',
      sortable: true,
      render: (_: any, row: CommissionSale) => (
        <span className="text-sm text-blue-600 font-medium">{row.courierOrderId || '-'}</span>
      ),
    },
    {
      key: 'orderStatus',
      label: 'Status',
      render: (_: any, row: CommissionSale) => {
        const color = getOrderStatusColor(row.orderStatus);
        return (
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${color}`}>
            {getOrderStatusLabel(row.orderStatus)}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      sortable: true,
      render: (_: any, row: CommissionSale) => (
        <span className="text-sm font-medium">৳{row.totalAmount.toFixed(0)}</span>
      ),
    },
    {
      key: 'commissionAmount',
      label: 'Total Commission',
      sortable: true,
      render: (_: any, row: CommissionSale) => {
        const isEditing = editingCell?.orderId === row.orderId && editingCell?.field === 'commissionAmount';
        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
              <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEditing(); }} autoFocus className="w-20 border border-blue-400 rounded px-1 py-0.5 text-sm focus:outline-none" />
              <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><FaCheck size={12} /></button>
              <button onClick={cancelEditing} className="text-red-500 hover:text-red-700"><FaTimes size={12} /></button>
            </div>
          );
        }
        return (
          <span className="text-sm font-semibold text-green-700 cursor-pointer hover:bg-green-50 px-1 py-0.5 rounded" onClick={() => startEditing(row.orderId, 'commissionAmount', row.commissionAmount)} title="Click to edit">৳{row.commissionAmount.toFixed(0)}</span>
        );
      },
    },
    {
      key: 'products',
      label: 'Products',
      render: (_: any, row: CommissionSale) => {
        if (!row.products) return <span className="text-sm">-</span>;
        const items = row.products.split(':::');
        return (
          <div className="text-sm" style={{ width: '150px', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
            {items.map((item, i) => {
              const parts = item.split('|||');
              const name = (parts[0] || '').trim();
              const qty = Math.round(parseFloat(parts[1] || '1'));
              return (
                <div key={i} className={i > 0 ? 'mt-1 pt-1 border-t border-gray-100' : ''}>
                  {name} <span className="text-[10px] text-gray-400">(x{qty})</span>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'agentName',
      label: 'Agent',
      render: (_: any, row: CommissionSale) => (
        <span className="text-sm">{row.agentName || '-'}</span>
      ),
    },

    {
      key: 'paymentStatus',
      label: 'Is Paid',
      render: (_: any, row: CommissionSale) => (
        <span className={`text-sm font-medium ${row.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
          {row.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-blue-600 text-2xl">💰</span>
            <h1 className="text-2xl font-bold text-blue-700">Commission Sales</h1>
          </div>
          <p className="text-gray-500 text-sm">
            View all orders with commission data. You can filter by status, agent, dates, and more.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(ORDER_STATUS_MAP).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agent</label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Commission Status</label>
              <select
                value={commissionStatusFilter}
                onChange={(e) => setCommissionStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); if (e.target.value) { setStartDate(''); setEndDate(''); } }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); if (e.target.value) setMonthFilter(''); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); if (e.target.value) setMonthFilter(''); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
            >
              <FaSearch size={12} /> Search
            </button>
          </div>
        </div>

        {/* Table Controls */}
        <div className="mb-3 flex items-center justify-between">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
              setSelectedRowIds([]);
            }}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Search:</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Courier ID or Order #"
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={sales}
          loading={loading}
          selection={{
            selectedRowIds,
            onChange: setSelectedRowIds,
            getRowId: (row: CommissionSale) => row.orderId,
          }}
          onView={handleViewOrder}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => {
            setCurrentPage(p);
            setSelectedRowIds([]);
          }}
        />

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => loadSales()}
          />
        )}
      </div>
    </AdminLayout>
  );
}
