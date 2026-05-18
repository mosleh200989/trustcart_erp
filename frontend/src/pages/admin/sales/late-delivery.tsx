import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import FormInput from '@/components/admin/FormInput';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import { getOrderStatusLabel, getOrderStatusColor } from '@/utils/orderStatus';
import { FaSearch, FaFilter, FaTimes, FaEye, FaStickyNote, FaExternalLinkAlt, FaCheck } from 'react-icons/fa';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDhakaDateString } from '@/utils/dhakaDate';

interface SalesOrder {
  id: number;
  salesOrderNumber?: string;
  sales_order_number?: string;
  order_number?: string;

  customerName?: string | null;
  customer_name?: string | null;
  customerPhone?: string | null;
  customer_phone?: string | null;

  status?: string;

  shippedAt?: string | null;
  shipped_at?: string | null;
  deliveredAt?: string | null;
  delivered_at?: string | null;
  cancelledAt?: string | null;
  cancelled_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;

  courierCompany?: string | null;
  courier_company?: string | null;
  courierOrderId?: string | null;
  courier_order_id?: string | null;
  trackingId?: string | null;
  tracking_id?: string | null;

  notes?: string | null;
  courier_notes?: string | null;
  internal_notes?: string | null;
  late_delivery_note?: string | null;
  cancelled_order_note?: string | null;
  rider_instructions?: string | null;

  order_source?: string | null;
  order_source_display?: string | null;

  items?: { productName: string | null; productNameBn?: string | null; variantName?: string | null; quantity: number }[];

  createdAt?: string;
  created_at?: string;
  order_date?: string;
  orderDate?: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
];

const CANCELLED_STATUS_OPTIONS = [
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const COURIER_COMPANY_OPTIONS = [
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'pathao', label: 'Pathao' },
  { value: 'redx', label: 'RedX' },
  { value: 'paperfly', label: 'Paperfly' },
];

const MANUAL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'admin_cancelled', label: 'Order Rejected' },
];

const CANCELLED_MANUAL_STATUS_OPTIONS = [
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const INITIAL_FILTERS = {
  q: '',
  courierCompany: '',
  shippedFrom: '',
  shippedTo: '',
  status: '',
};

type SalesFollowupMode = 'late-delivery' | 'cancelled-orders';

const MODE_CONFIG = {
  'late-delivery': {
    title: 'Late Delivery',
    description: 'Orders shipped but not delivered within the SLA',
    endpoint: '/sales/late-deliveries',
    dateColumnLabel: 'Sent At',
    dateFromLabel: 'Shipped From',
    dateToLabel: 'Shipped To',
    emptyLoadMessage: 'Failed to load late deliveries:',
    notePayloadKey: 'lateDeliveryNote',
    noteField: (row: SalesOrder) => row.late_delivery_note || row.internal_notes || '',
    dateField: (row: SalesOrder) => row.shippedAt ?? row.shipped_at ?? null,
    statusOptions: STATUS_OPTIONS,
    manualStatusOptions: MANUAL_STATUS_OPTIONS,
    allowStatusUpdate: true,
  },
  'cancelled-orders': {
    title: 'Cancelled Orders',
    description: 'Cancelled and returned sales orders that need follow-up notes',
    endpoint: '/sales/cancelled-orders',
    dateColumnLabel: 'Cancelled At',
    dateFromLabel: 'Cancelled From',
    dateToLabel: 'Cancelled To',
    emptyLoadMessage: 'Failed to load cancelled orders:',
    notePayloadKey: 'cancelledOrderNote',
    noteField: (row: SalesOrder) => row.cancelled_order_note || '',
    dateField: (row: SalesOrder) => row.cancelledAt ?? row.cancelled_at ?? row.updatedAt ?? row.updated_at ?? row.createdAt ?? row.created_at ?? row.order_date ?? row.orderDate ?? null,
    statusOptions: CANCELLED_STATUS_OPTIONS,
    manualStatusOptions: CANCELLED_MANUAL_STATUS_OPTIONS,
    allowStatusUpdate: false,
  },
} as const;

function formatDateTime(raw: any) {
  if (!raw) return { date: '-', time: '' };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  const date = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function getDaysSinceShipped(shippedAt: any): number | null {
  if (!shippedAt) return null;
  const d = new Date(shippedAt);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getCourierTrackingUrl(courierCompany: string | null | undefined, trackingId: string | null | undefined, courierOrderId?: string | null): string | null {
  const company = (courierCompany || '').toLowerCase().trim();
  if (company.includes('steadfast')) {
    if (!courierOrderId) return null;
    return `https://steadfast.com.bd/user/consignment/${courierOrderId}`;
  }
  if (!trackingId) return null;
  if (company.includes('pathao')) {
    return `https://merchant.pathao.com/courier/orders/${encodeURIComponent(trackingId)}?isShowingActive=1`;
  }
  if (company.includes('redx')) {
    return `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`;
  }
  return null;
}

// Format note with timestamp and agent name
function formatNoteWithMeta(noteText: string, agentName: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });
  return `[${dateStr} ${timeStr} - ${agentName}]\n${noteText.trim()}`;
}

// Parse note to extract just the text content (without meta header)
function parseNoteContent(fullNote: string | null | undefined): string {
  if (!fullNote) return '';
  const match = fullNote.match(/^\[.*?\]\n([\s\S]*)$/);
  return match ? match[1].trim() : fullNote.trim();
}

// Parse note meta (date/agent) from the header
function parseNoteMeta(fullNote: string | null | undefined): { date: string; agent: string } | null {
  if (!fullNote) return null;
  const match = fullNote.match(/^\[(.*?)\s*-\s*(.*?)\]\n/);
  if (!match) return null;
  return { date: match[1].trim(), agent: match[2].trim() };
}

export function SalesFollowupOrdersPage({ mode = 'late-delivery' }: { mode?: SalesFollowupMode }) {
  const config = MODE_CONFIG[mode];
  const toast = useToast();
  const { user: authUser } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Dedicated search state with debounce
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(val);
      setCurrentPage(1);
    }, 280);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<number, boolean>>({});
  // Status editing
  const [savingStatus, setSavingStatus] = useState<Record<number, boolean>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(config.endpoint);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(config.emptyLoadMessage, e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Save internal note for an order
  const handleSaveNote = useCallback(async (orderId: number) => {
    const noteText = editingNotes[orderId];
    if (noteText === undefined) return;

    setSavingNotes((prev) => ({ ...prev, [orderId]: true }));
    try {
      const agentName = authUser?.name || 'Agent';
      const formattedNote = noteText.trim() ? formatNoteWithMeta(noteText, agentName) : '';
      await apiClient.put(`/order-management/${orderId}/notes`, {
        [config.notePayloadKey]: formattedNote || null,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, [config.notePayloadKey === 'lateDeliveryNote' ? 'late_delivery_note' : 'cancelled_order_note']: formattedNote || null } : o,
        ),
      );
      setEditingNotes((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      toast.success('Note saved');
    } catch (e) {
      console.error('Failed to save note:', e);
      toast.error('Failed to save note');
    } finally {
      setSavingNotes((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [editingNotes, toast, authUser, config.notePayloadKey]);

  // Handle status change
  const handleStatusChange = useCallback(async (orderId: number, newStatus: string) => {
    setSavingStatus((prev) => ({ ...prev, [orderId]: true }));
    try {
      await apiClient.put(`/sales/${orderId}`, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      toast.success(`Status updated to ${getOrderStatusLabel(newStatus)}`);
    } catch (e) {
      console.error('Failed to update status:', e);
      toast.error('Failed to update status');
    } finally {
      setSavingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  }, [toast]);

  const filtered = useMemo(() => {
    const normalize = (v: any) => (v ?? '').toString().toLowerCase().trim();
    const includes = (field: any, needle: string) => {
      const n = normalize(needle);
      if (!n) return true;
      return normalize(field).includes(n);
    };

    const dateKey = (v: any): string => {
      if (!v) return '';
      if (v instanceof Date && !Number.isNaN(v.getTime())) return getDhakaDateString(v);
      const s = String(v);
      if (s.length >= 10) return s.slice(0, 10);
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return '';
      return getDhakaDateString(d);
    };
    const inDateRange = (field: any, from: string, to: string) => {
      const fromKey = dateKey(from);
      const toKey = dateKey(to);
      if (!fromKey && !toKey) return true;
      const valueKey = dateKey(field);
      if (!valueKey) return false;
      const fromOk = fromKey ? valueKey >= fromKey : true;
      const toOk = toKey ? valueKey <= toKey : true;
      return fromOk && toOk;
    };

    return orders.filter((o) => {
      const customerName = o.customerName ?? o.customer_name ?? '';
      const customerPhone = o.customerPhone ?? o.customer_phone ?? '';
      const courierCompany = o.courierCompany ?? o.courier_company ?? '';
      const relevantDate = config.dateField(o);

      // Always-visible search bar
      const sq = normalize(searchQuery);
      if (sq) {
        const orderNum = o.salesOrderNumber ?? o.sales_order_number ?? o.order_number ?? '';
        const courierId = o.courierOrderId ?? o.courier_order_id ?? '';
        const trackId = o.trackingId ?? o.tracking_id ?? '';
        const haystack = [
          o.id, orderNum, customerName, customerPhone,
          courierCompany, courierId, trackId,
          o.status, o.notes, o.internal_notes,
        ].map((v) => normalize(v)).join(' ');
        if (!haystack.includes(sq)) return false;
      }

      // Filter panel (q field removed, kept for old compatibility)
      const q = normalize(filters.q);
      if (q) {
        const haystack = [o.id, customerName, customerPhone, courierCompany, o.status, o.notes, o.internal_notes]
          .map((v) => normalize(v))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      if (filters.status && normalize(o.status) !== normalize(filters.status)) return false;
      if (!includes(courierCompany, filters.courierCompany)) return false;
      if (!inDateRange(relevantDate, filters.shippedFrom, filters.shippedTo)) return false;

      return true;
    });
  }, [orders, filters, searchQuery, config]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'customer_phone',
      label: 'Phone',
      render: (_: any, row: SalesOrder) => {
        const phone = row.customerPhone ?? row.customer_phone ?? '-';
        return <span className="text-gray-700">{phone}</span>;
      },
    },
    {
      key: 'courierOrderId',
      label: 'Courier ID',
      render: (_: any, row: SalesOrder) => {
        const cid = row.courierOrderId ?? row.courier_order_id;
        if (!cid) return <span className="text-gray-400">-</span>;
        const trackingUrl = getCourierTrackingUrl(
          row.courierCompany ?? row.courier_company,
          row.trackingId ?? row.tracking_id,
          row.courierOrderId ?? row.courier_order_id,
        );
        if (trackingUrl) {
          return (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {cid}
              <FaExternalLinkAlt className="text-[10px]" />
            </a>
          );
        }
        return <span>{cid}</span>;
      },
    },
    {
      key: 'courier',
      label: 'Courier',
      render: (_: any, row: SalesOrder) => {
        const company = row.courierCompany ?? row.courier_company ?? '-';
        const colorMap: Record<string, string> = {
          steadfast: 'bg-blue-100 text-blue-800',
          pathao: 'bg-red-100 text-red-800',
          redx: 'bg-orange-100 text-orange-800',
        };
        const key = (company || '').toLowerCase().trim();
        const cls = Object.entries(colorMap).find(([k]) => key.includes(k))?.[1] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {company}
          </span>
        );
      },
    },
    {
      key: 'shippedAt',
      label: config.dateColumnLabel,
      render: (_: any, row: SalesOrder) => {
        const raw = config.dateField(row);
        const { date, time } = formatDateTime(raw);
        const days = mode === 'late-delivery' ? getDaysSinceShipped(raw) : null;
        return (
          <div>
            <div>{date}</div>
            <div className="text-xs text-gray-500">{time}</div>
            {days !== null && (
              <div className={`text-xs font-semibold mt-0.5 ${days > 5 ? 'text-red-600' : days > 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                {days} day{days !== 1 ? 's' : ''} ago
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      label: 'Products',
      render: (_: any, row: SalesOrder) => {
        const items = row.items ?? [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="max-w-[220px]">
            {items.slice(0, 3).map((item, i) => (
              <div key={i} className="text-xs text-gray-700 truncate" title={`${item.productNameBn || item.productName || 'Unknown'}${item.variantName ? ` (${item.variantName})` : ''} x${item.quantity}`}>
                <span className="font-medium">{item.quantity}x</span>{' '}
                {item.productNameBn || item.productName || 'Unknown'}{item.variantName ? ` (${item.variantName})` : ''}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs text-blue-600 font-medium">+{items.length - 3} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'order_source',
      label: 'Source',
      render: (_: any, row: SalesOrder) => {
        const display = row.order_source_display || '-';
        const source = row.order_source || '';
        const isAdmin = source === 'admin_panel' || source === 'agent_dashboard';
        const colorClass = isAdmin
          ? 'bg-purple-100 text-purple-800'
          : source === 'landing_page'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-green-100 text-green-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
            {display}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: SalesOrder) => {
        const currentStatus = row.status || '';
        const isSaving = savingStatus[row.id] || false;
        if (!config.allowStatusUpdate) {
          return (
            <span className={`inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-semibold ${getOrderStatusColor(currentStatus)}`}>
              {getOrderStatusLabel(currentStatus)}
            </span>
          );
        }

        return (
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            disabled={isSaving}
            className={`text-xs font-semibold rounded-lg px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${getOrderStatusColor(currentStatus)} ${isSaving ? 'opacity-50' : ''}`}
          >
            {!config.manualStatusOptions.find((o) => o.value === currentStatus) && (
              <option value={currentStatus}>{getOrderStatusLabel(currentStatus)}</option>
            )}
            {config.manualStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      className: 'min-w-[220px]',
      render: (_: any, row: SalesOrder) => {
        const fullNote = config.noteField(row) || '';
        const meta = parseNoteMeta(fullNote);
        const isEditing = editingNotes[row.id] !== undefined;
        const isSaving = savingNotes[row.id] || false;
        const currentContent = parseNoteContent(fullNote);

        if (isEditing) {
          return (
            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editingNotes[row.id] ?? ''}
                onChange={(e) => setEditingNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={2}
                placeholder="Add a note..."
                disabled={isSaving}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => handleSaveNote(row.id)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <FaCheck size={8} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingNotes((prev) => { const next = { ...prev }; delete next[row.id]; return next; })}
                  disabled={isSaving}
                  className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            className="max-w-[220px] cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setEditingNotes((prev) => ({ ...prev, [row.id]: currentContent }));
            }}
            title="Click to edit note"
          >
            {fullNote ? (
              <div>
                {meta && (
                  <div className="text-[10px] text-gray-400 mb-0.5">
                    {meta.date} — {meta.agent}
                  </div>
                )}
                <div className="flex items-start gap-1">
                  <FaStickyNote className="text-yellow-500 mt-0.5 flex-shrink-0" size={12} />
                  <span className="text-xs text-gray-700 line-clamp-2">{currentContent}</span>
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-xs group-hover:text-blue-500 transition-colors">
                + Add note
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Details',
      render: (_: any, row: SalesOrder) => (
        <button
          type="button"
          onClick={() => {
            setSelectedOrderId(row.id);
            setShowOrderDetails(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <FaEye size={12} />
          Details
        </button>
      ),
    },
  ];

  const activeFilterCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'q' && String(v).trim() !== '')
    .length;

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{config.title}</h1>
            <p className="text-gray-600 mt-1">
              {config.description}
              {!loading && <span className="ml-2 text-sm font-medium text-gray-500">({filtered.length} order{filtered.length !== 1 ? 's' : ''})</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FaFilter size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Always-visible Search Bar ── */}
        <div className="mb-4">
          <div className="relative max-w-2xl">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by order number, customer name, phone, courier ID, tracking ID…"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                aria-label="Clear search"
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-500" size={14} />
                <h2 className="text-sm font-semibold text-gray-700">Filter Orders</h2>
                {activeFilterCount > 0 && (
                  <span className="text-xs text-gray-500">({activeFilterCount} active)</span>
                )}
              </div>
              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FaTimes size={10} />
                Clear All
              </button>
            </div>

            <div className="p-5">
              {/* Filter grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormInput
                  label="Order Status"
                  name="status"
                  type="select"
                  value={filters.status}
                  onChange={handleFilterChange}
                  options={config.statusOptions}
                />
                <FormInput
                  label="Courier Company"
                  name="courierCompany"
                  type="select"
                  value={filters.courierCompany}
                  onChange={handleFilterChange}
                  options={COURIER_COMPANY_OPTIONS}
                />
                <FormInput label={config.dateFromLabel} name="shippedFrom" type="date" value={filters.shippedFrom} onChange={handleFilterChange} />
                <FormInput label={config.dateToLabel} name="shippedTo" type="date" value={filters.shippedTo} onChange={handleFilterChange} />
              </div>
            </div>
          </div>
        )}

        {/* Page size */}
        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={paginated}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <AdminOrderDetailsModal
            orderId={selectedOrderId}
            onClose={() => {
              setShowOrderDetails(false);
              setSelectedOrderId(null);
            }}
            onUpdate={() => load()}
          />
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminSalesLateDelivery() {
  return <SalesFollowupOrdersPage mode="late-delivery" />;
}
