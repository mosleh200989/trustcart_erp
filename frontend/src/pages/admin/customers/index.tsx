import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import { FaFilter, FaPlus, FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';
import PhoneInput, { validateBDPhone } from '@/components/PhoneInput';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  status: string;
  created_at: string;
  createdAt?: string;
  isActive?: boolean;
  tier?: string;
  segment?: string;
  source?: string;
  sourceType?: string;
  sourceLabel?: string;
  landingPageSlug?: string;
  assignedTo?: number | null;
  assignedSupervisorId?: number | null;
  agentName?: string | null;
  teamLeaderName?: string | null;
}

interface Agent {
  id: number;
  name: string;
  lastName?: string;
  status?: string;
}

interface LandingPageOption {
  id: number;
  title: string;
  slug: string;
}

const titleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeCustomer = (customer: any): Customer => {
  const status = customer?.status || (customer?.isActive === false ? 'inactive' : 'active');

  return {
    id: Number(customer?.id),
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || customer?.district || '',
    status,
    created_at: customer?.created_at || customer?.createdAt || '',
    createdAt: customer?.createdAt,
    isActive: customer?.isActive,
    tier: customer?.tier || '',
    segment: customer?.segment || '',
    source: customer?.source || '',
    sourceType: customer?.sourceType || '',
    sourceLabel: customer?.sourceLabel || '',
    landingPageSlug: customer?.landingPageSlug || '',
    assignedTo: customer?.assignedTo ?? null,
    assignedSupervisorId: customer?.assignedSupervisorId ?? null,
    agentName: customer?.agentName || null,
    teamLeaderName: customer?.teamLeaderName || null,
  };
};

export default function AdminCustomers() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Array<number>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPageOption[]>([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [landingPageFilter, setLandingPageFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'active'
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [agentFilter, landingPageFilter]);

  // Clear selection when navigating to a different page
  useEffect(() => {
    setSelectedCustomerIds([]);
  }, [currentPage]);

  const loadFilterOptions = async () => {
    const [agentResult, landingPageResult] = await Promise.allSettled([
      apiClient.get('/crm/team/all-agents'),
      apiClient.get('/landing-pages'),
    ]);

    if (agentResult.status === 'fulfilled') {
      const rows = Array.isArray(agentResult.value.data) ? agentResult.value.data : [];
      setAgents(rows.filter((agent: Agent) => String(agent.status || 'active').toLowerCase() === 'active'));
    } else {
      try {
        const fallback = await apiClient.get('/crm/team/available-agents');
        const rows = Array.isArray(fallback.data) ? fallback.data : [];
        setAgents(rows.filter((agent: Agent) => String(agent.status || 'active').toLowerCase() === 'active'));
      } catch (error) {
        console.error('Failed to load agents:', error);
        setAgents([]);
      }
    }

    if (landingPageResult.status === 'fulfilled') {
      setLandingPages(Array.isArray(landingPageResult.value.data) ? landingPageResult.value.data : []);
    } else {
      console.error('Failed to load landing pages:', landingPageResult.reason);
      setLandingPages([]);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/customers', {
        params: {
          limit: 500,
          ...(agentFilter ? { agentId: agentFilter } : {}),
          ...(landingPageFilter ? { landingPageSlug: landingPageFilter } : {}),
        },
      });
      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : [];

      setCustomers(rows.map(normalizeCustomer).filter((customer: Customer) => Number.isFinite(customer.id)));
    } catch (error) {
      console.error('Failed to load customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => setSelectedCustomerIds([]);

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      status: customer.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleView = (customer: Customer) => {
    setModalMode('view');
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) return;

    try {
      await apiClient.delete(`/customers/${customer.id}`);
      setCustomers(customers.filter(c => c.id !== customer.id));
      toast.success('Customer deleted successfully');
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomerIds.length === 0) return;

    if (!confirm(`Delete ${selectedCustomerIds.length} selected customer(s)?`)) return;

    const failed: number[] = [];
    try {
      setLoading(true);
      for (const id of selectedCustomerIds) {
        try {
          await apiClient.delete(`/customers/${id}`);
        } catch {
          failed.push(id);
        }
      }
    } finally {
      await loadCustomers();
      setSelectedCustomerIds(failed);
      setLoading(false);
    }

    if (failed.length === 0) {
      toast.success('Selected customers deleted successfully');
    } else {
      toast.warning(`Some deletions failed. ${failed.length} customer(s) still selected.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBDPhone(formData.phone)) {
      toast.warning('Please enter a valid 10-digit phone number');
      return;
    }
    
    try {
      if (modalMode === 'add') {
        const response = await apiClient.post('/customers', formData);
        setCustomers([...customers, normalizeCustomer(response.data)]);
        toast.success('Customer added successfully');
      } else if (modalMode === 'edit' && selectedCustomer) {
        const response = await apiClient.put(`/customers/${selectedCustomer.id}`, formData);
        setCustomers(customers.map(c => c.id === selectedCustomer.id ? normalizeCustomer(response.data) : c));
        toast.success('Customer updated successfully');
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredCustomers = customers.filter(c => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [c.name, c.email, c.phone, c.tier, c.segment, c.sourceLabel, c.agentName, c.teamLeaderName].some((value) =>
      String(value || '').toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'tier',
      label: 'Tier',
      render: (value: string) => (
        <span className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {value ? titleCase(value) : 'No Tier'}
        </span>
      )
    },
    {
      key: 'segment',
      label: 'Segment',
      render: (value: string) => {
        const colors: Record<string, string> = {
          new: 'bg-blue-50 text-blue-700',
          legacy: 'bg-amber-50 text-amber-700',
          mixed: 'bg-green-50 text-green-700',
        };

        return (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[value] || 'bg-gray-100 text-gray-600'}`}>
            {value ? titleCase(value) : 'Unsegmented'}
          </span>
        );
      }
    },
    {
      key: 'sourceLabel',
      label: 'Source',
      render: (value: string, row: Customer) => {
        const sourceName = value || row.source || 'Unknown';
        const sourceType = row.sourceType || row.source || '';

        return (
          <div>
            <div className="font-medium text-gray-900">{sourceName}</div>
            {sourceType && (
              <div className="text-xs text-gray-500">{titleCase(sourceType)}</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'agentName',
      label: 'Assigned',
      render: (_value: string, row: Customer) => (
        <div>
          <div className="font-medium text-gray-900">{row.agentName || 'Unassigned'}</div>
          <div className="text-xs text-gray-500">
            TL: {row.teamLeaderName || 'Unassigned'}
          </div>
        </div>
      )
    },
  ];

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Customers Management</h1>
            <p className="text-gray-600 mt-1">Manage your customer database</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add New Customer
          </button>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_260px]">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedCustomerIds([]); setCurrentPage(1); }}
                placeholder="Search by name, phone, tier, segment, source or assignment..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={13} />
              <select
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(1);
                  setSelectedCustomerIds([]);
                }}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {[agent.name, agent.lastName].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={13} />
              <select
                value={landingPageFilter}
                onChange={(e) => {
                  setLandingPageFilter(e.target.value);
                  setCurrentPage(1);
                  setSelectedCustomerIds([]);
                }}
                className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Landing Pages</option>
                {landingPages.map((page) => (
                  <option key={page.id} value={page.slug}>
                    {page.title || page.slug}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedCustomerIds.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm font-medium">
              {selectedCustomerIds.length} customer(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-4 py-2 rounded bg-white border border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                Clear selection
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete selected
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <PageSizeSelector
            value={itemsPerPage}
            onChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1);
            }}
          />
        </div>

        <DataTable
          columns={columns}
          data={paginatedCustomers}
          loading={loading}
          selection={{
            selectedRowIds: selectedCustomerIds,
            onChange: (next) => setSelectedCustomerIds(next.map((x) => Number(x))),
            getRowId: (row) => Number(row?.id),
          }}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New Customer' : modalMode === 'edit' ? 'Edit Customer' : 'View Customer'}
          size="lg"
          footer={
            modalMode !== 'view' ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="customer-form"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  {modalMode === 'add' ? 'Create' : 'Update'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            )
          }
        >
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-gray-900">{selectedCustomer?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{selectedCustomer?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-gray-900">{selectedCustomer?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-gray-900">{selectedCustomer?.address || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <p className="mt-1 text-gray-900">{selectedCustomer?.city || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <PhoneInput
                    name="phone"
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    required
                    placeholder="01712345678"
                  />
                </div>
              </div>
              <FormInput
                label="Address"
                name="address"
                type="textarea"
                value={formData.address}
                onChange={handleInputChange}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
                <FormInput
                  label="Status"
                  name="status"
                  type="select"
                  value={formData.status}
                  onChange={handleInputChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />
              </div>
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
