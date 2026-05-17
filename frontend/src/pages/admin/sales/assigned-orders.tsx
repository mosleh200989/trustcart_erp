import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaEye, FaSync, FaUserCheck, FaUserEdit, FaUserSlash } from 'react-icons/fa';
import AdminLayout from '@/layouts/AdminLayout';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import DataTable from '@/components/admin/DataTable';
import FormInput from '@/components/admin/FormInput';
import Modal from '@/components/admin/Modal';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/services/api';
import { getOrderStatusColor, getOrderStatusLabel } from '@/utils/orderStatus';
import { wrapCustomerName } from '@/utils/wrapCustomerName';

const INITIAL_FILTERS = {
  q: '',
  startDate: '',
  endDate: '',
  assignment: '',
  todayOnly: false,
};

interface AssignedOrder {
  id: number;
  sales_order_number?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  total_amount?: number;
  status: string;
  order_date?: string;
  created_at?: string;
  shipping_address?: string | null;
  order_source?: string | null;
  order_source_display?: string | null;
  assigned_to?: number | null;
  assigned_to_name?: string | null;
  assigned_by_name?: string | null;
  assigned_at?: string | null;
  items?: { productName: string; productNameBn?: string | null; variantName?: string | null; quantity: number }[];
}

interface AgentOption {
  id: number;
  name: string;
  email?: string;
  inMyTeam?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AssignedOrdersPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [assignmentOrder, setAssignmentOrder] = useState<AssignedOrder | null>(null);
  const [isBulkAssignmentOpen, setIsBulkAssignmentOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);

  const canViewAssignedOrders = hasPermission('view-assigned-orders');
  const canManageAssignedOrders = hasPermission('manage-assigned-orders');

  const loadOrders = useCallback(async (page = currentPage, pageSize = itemsPerPage, nextFilters = filters) => {
    if (!canViewAssignedOrders) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(pageSize),
      };
      if (nextFilters.q.trim()) params.q = nextFilters.q.trim();
      if (nextFilters.startDate) params.startDate = nextFilters.startDate;
      if (nextFilters.endDate) params.endDate = nextFilters.endDate;
      if (nextFilters.assignment) params.assignment = nextFilters.assignment;
      if (nextFilters.todayOnly) params.todayOnly = 'true';

      const response = await apiClient.get('/sales/assigned-orders', { params });
      const body = response.data;
      setOrders(Array.isArray(body?.data) ? body.data : []);
      setTotalPages(body?.totalPages ?? 1);
      setTotalCount(body?.total ?? 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load assigned orders');
      setOrders([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [canViewAssignedOrders, currentPage, filters, itemsPerPage, toast]);

  const loadAgents = useCallback(async () => {
    if (!canViewAssignedOrders) return;
    try {
      const response = await apiClient.get('/sales/assignment-agents');
      setAgents(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load agents');
    }
  }, [canViewAssignedOrders, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(currentPage, itemsPerPage, filters);
    }, filters.q.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [currentPage, filters, itemsPerPage, loadOrders]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFilters((prev) => ({ ...prev, [target.name]: value }));
    setCurrentPage(1);
    setSelectedRowIds([]);
  };

  const openAssignmentModal = (order: AssignedOrder) => {
    setAssignmentOrder(order);
    setSelectedAgentId(order.assigned_to ? String(order.assigned_to) : '');
  };

  const closeAssignmentModal = () => {
    setAssignmentOrder(null);
    setIsBulkAssignmentOpen(false);
    setSelectedAgentId('');
  };

  const selectedOrders = useMemo(() => {
    const selectedSet = new Set(selectedRowIds.map((id) => Number(id)));
    return orders.filter((order) => selectedSet.has(order.id));
  }, [orders, selectedRowIds]);

  const openBulkAssignmentModal = () => {
    if (!canManageAssignedOrders) {
      toast.error('You do not have permission to manage assigned orders');
      return;
    }
    if (selectedOrders.length === 0) {
      toast.warning('Select at least one order');
      return;
    }
    setAssignmentOrder(null);
    setSelectedAgentId('');
    setIsBulkAssignmentOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignmentOrder && !isBulkAssignmentOpen) return;
    if (!canManageAssignedOrders) {
      toast.error('You do not have permission to manage assigned orders');
      return;
    }
    if (!selectedAgentId) {
      toast.warning('Select an agent first');
      return;
    }

    setSavingAssignment(true);
    try {
      if (assignmentOrder) {
        await apiClient.put(`/sales/assigned-orders/${assignmentOrder.id}/assign`, {
          agentId: Number(selectedAgentId),
          expectedAssignedTo: assignmentOrder.assigned_to ?? null,
          allowReassign: Boolean(assignmentOrder.assigned_to),
        });
        toast.success(assignmentOrder.assigned_to ? 'Assignment updated' : 'Order assigned');
      } else {
        const results = await Promise.allSettled(
          selectedOrders.map((order) =>
            apiClient.put(`/sales/assigned-orders/${order.id}/assign`, {
              agentId: Number(selectedAgentId),
              expectedAssignedTo: order.assigned_to ?? null,
              allowReassign: Boolean(order.assigned_to),
            }),
          ),
        );
        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedCount = results.length - successCount;
        if (failedCount > 0) {
          toast.warning(`Assigned ${successCount} order(s). Failed: ${failedCount}. Refreshing queue.`);
        } else {
          toast.success(`Assigned ${successCount} order(s)`);
        }
        setSelectedRowIds([]);
      }
      closeAssignmentModal();
      await loadOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save assignment');
      await loadOrders();
    } finally {
      setSavingAssignment(false);
    }
  };

  useEffect(() => {
    setSelectedRowIds([]);
  }, [currentPage, itemsPerPage]);

  const unassignOrder = async (order: AssignedOrder) => {
    if (!order.assigned_to) return;
    if (!confirm(`Unassign order ${order.sales_order_number || order.order_number || order.id}?`)) return;

    try {
      await apiClient.put(`/sales/assigned-orders/${order.id}/unassign`, {
        expectedAssignedTo: order.assigned_to,
      });
      toast.success('Order unassigned');
      await loadOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to unassign order');
      await loadOrders();
    }
  };

  const bulkUnassignOrders = async () => {
    if (!canManageAssignedOrders) {
      toast.error('You do not have permission to manage assigned orders');
      return;
    }
    const assignedSelectedOrders = selectedOrders.filter((order) => order.assigned_to);
    if (assignedSelectedOrders.length === 0) {
      toast.warning('Select at least one assigned order');
      return;
    }
    if (!confirm(`Unassign ${assignedSelectedOrders.length} selected order(s)?`)) return;

    const results = await Promise.allSettled(
      assignedSelectedOrders.map((order) =>
        apiClient.put(`/sales/assigned-orders/${order.id}/unassign`, {
          expectedAssignedTo: order.assigned_to,
        }),
      ),
    );
    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (failedCount > 0) {
      toast.warning(`Unassigned ${successCount} order(s). Failed: ${failedCount}. Refreshing queue.`);
    } else {
      toast.success(`Unassigned ${successCount} order(s)`);
    }
    setSelectedRowIds([]);
    await loadOrders();
  };

  const stats = useMemo(() => {
    const assigned = orders.filter((order) => order.assigned_to).length;
    return {
      total: totalCount,
      currentPageAssigned: assigned,
      currentPageUnassigned: orders.length - assigned,
    };
  }, [orders, totalCount]);

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'order_date',
      label: 'Date',
      render: (_: any, row: AssignedOrder) => (
        <div>
          <div>{formatDate(row.order_date || row.created_at)}</div>
          {row.created_at && <div className="text-xs text-gray-500">{formatDate(row.created_at)}</div>}
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      className: 'min-w-[190px] !whitespace-normal',
      render: (_: any, row: AssignedOrder) => (
        <div>
          <div className="font-medium text-gray-900">{wrapCustomerName(row.customer_name || 'Guest')}</div>
          {row.customer_phone && <div className="text-xs text-gray-500">{row.customer_phone}</div>}
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Products',
      className: 'min-w-[220px] !whitespace-normal',
      render: (_: any, row: AssignedOrder) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-gray-400">No items</span>;
        return (
          <div className="space-y-1 text-xs">
            {items.map((item, index) => (
              <div key={index} className="leading-snug">
                {item.productNameBn || item.productName}{item.variantName ? ` (${item.variantName})` : ''} <span className="text-gray-500">x{item.quantity}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (value: any) => {
        const amount = Number(value || 0);
        return `৳${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getOrderStatusColor(value)}`}>
          {getOrderStatusLabel(value)}
        </span>
      ),
    },
    {
      key: 'order_source_display',
      label: 'Source',
      render: (_: any, row: AssignedOrder) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.order_source === 'landing_page' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
          {row.order_source_display || (row.order_source === 'landing_page' ? 'Landing Page' : 'Website')}
        </span>
      ),
    },
    {
      key: 'assigned_to_name',
      label: 'Assigned To',
      className: 'min-w-[170px]',
      render: (_: any, row: AssignedOrder) => row.assigned_to ? (
        <div>
          <div className="font-medium text-gray-900">{row.assigned_to_name || `User #${row.assigned_to}`}</div>
          {row.assigned_by_name && <div className="text-xs text-gray-500">by {row.assigned_by_name}</div>}
          {row.assigned_at && <div className="text-xs text-gray-500">{formatDate(row.assigned_at)}</div>}
        </div>
      ) : (
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Unassigned</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: AssignedOrder) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelectedOrderId(row.id)}
            className="rounded p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
            title="View"
          >
            <FaEye size={15} />
          </button>
          <button
            type="button"
            onClick={() => openAssignmentModal(row)}
            disabled={!canManageAssignedOrders}
            className="rounded p-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-35"
            title={row.assigned_to ? 'Update assignment' : 'Assign'}
          >
            {row.assigned_to ? <FaUserEdit size={15} /> : <FaUserCheck size={15} />}
          </button>
          <button
            type="button"
            onClick={() => unassignOrder(row)}
            disabled={!row.assigned_to || !canManageAssignedOrders}
            className="rounded p-2 text-red-600 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-35"
            title="Unassign"
          >
            <FaUserSlash size={15} />
          </button>
        </div>
      ),
    },
  ];

  if (!canViewAssignedOrders) {
    return (
      <AdminLayout>
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-gray-800">Assigned Orders</h1>
          <p className="mt-2 text-gray-600">You do not have permission to view this panel.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Assigned Orders</h1>
            <p className="mt-1 text-gray-600">Assign website and landing page orders to sales agents before approval.</p>
          </div>
          <button
            type="button"
            onClick={() => loadOrders()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <FaSync />
            Refresh
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-700">
              Selected: <span className="font-semibold">{selectedRowIds.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openBulkAssignmentModal}
                disabled={!canManageAssignedOrders || selectedRowIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaUserCheck />
                Bulk Assign
              </button>
              <button
                type="button"
                onClick={bulkUnassignOrders}
                disabled={!canManageAssignedOrders || selectedRowIds.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaUserSlash />
                Bulk Unassign
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Waiting Assignment</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Assigned On This Page</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{stats.currentPageAssigned}</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Unassigned On This Page</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{stats.currentPageUnassigned}</div>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
              <p className="text-sm text-gray-500">Showing processing website and landing page orders waiting for assignment.</p>
            </div>
            <div className="flex items-center gap-3">
              <PageSizeSelector
                value={itemsPerPage}
                onChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setCurrentPage(1);
                }}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <FormInput
                label="Search"
                name="q"
                value={filters.q}
                onChange={handleFilterChange}
                placeholder="Order, customer, phone, address"
              />
            </div>
            <div>
              <label htmlFor="todayOnly" className="block text-sm font-medium text-gray-700">
                Today Only
              </label>
              <div className="mt-1 flex h-10 items-center rounded-md border border-gray-300 bg-white px-3 shadow-sm">
                <label className="flex items-center gap-2 text-sm text-gray-700" htmlFor="todayOnly">
                  <input
                    id="todayOnly"
                    type="checkbox"
                    name="todayOnly"
                    checked={filters.todayOnly}
                    onChange={handleFilterChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  Today
                </label>
              </div>
            </div>
            <FormInput
              label="Assignment"
              name="assignment"
              type="select"
              value={filters.assignment}
              onChange={handleFilterChange}
              selectPlaceholder="All"
              options={[
                { value: 'unassigned', label: 'Unassigned' },
                { value: 'assigned', label: 'Assigned' },
              ]}
            />
            <FormInput
              label="Start Date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
            <FormInput
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={orders}
          selection={{
            selectedRowIds,
            onChange: setSelectedRowIds,
            getRowId: (row: AssignedOrder) => row.id,
          }}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {selectedOrderId != null && (
          <AdminOrderDetailsModal
            onClose={() => setSelectedOrderId(null)}
            onUpdate={() => loadOrders()}
            orderId={selectedOrderId}
          />
        )}

        <Modal
          isOpen={assignmentOrder != null || isBulkAssignmentOpen}
          onClose={closeAssignmentModal}
          title={isBulkAssignmentOpen ? 'Bulk Assign Orders' : assignmentOrder?.assigned_to ? 'Update Assignment' : 'Assign Order'}
          footer={
            <>
              <button
                type="button"
                onClick={closeAssignmentModal}
                disabled={savingAssignment}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAssignment}
                disabled={savingAssignment || !selectedAgentId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAssignment ? 'Saving...' : 'Save Assignment'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">{isBulkAssignmentOpen ? 'Selected Orders' : 'Order'}</div>
              <div className="font-semibold text-gray-900">
                {isBulkAssignmentOpen
                  ? `${selectedOrders.length} order(s)`
                  : assignmentOrder?.sales_order_number || assignmentOrder?.order_number || assignmentOrder?.id}
              </div>
              {!isBulkAssignmentOpen && (
                <div className="mt-1 text-sm text-gray-600">
                  Current: {assignmentOrder?.assigned_to_name || 'Unassigned'}
                </div>
              )}
            </div>

            <FormInput
              label="Agent"
              name="agentId"
              type="select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              selectPlaceholder="Select agent"
              options={agents.map((agent) => ({
                value: agent.id,
                label: agent.inMyTeam ? agent.name : `${agent.name} (other team)`,
              }))}
            />

            <p className="text-sm text-gray-500">
              The system checks the current assignment before saving. If another Team Leader changed it first, this action will ask you to refresh.
            </p>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
