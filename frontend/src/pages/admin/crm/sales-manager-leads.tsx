import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { FaEye, FaUsers, FaGlobe, FaExchangeAlt } from 'react-icons/fa';

interface Lead {
  id: number;
  name: string;
  lastName: string;
  email: string | null;
  phone: string;
  priority: string | null;
  customerType: string;
  lifecycleStage: string;
  assigned_supervisor_id: number | null;
  assigned_to: number | null;
  assigned_by?: number | null;
  assigned_at?: string | null;
  assignedAgentName?: string | null;
  teamLeaderId?: number | null;
  teamLeaderName?: string | null;
  dataAnalystName?: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  source: string | null;
  total_spent: number;
  createdAt: string;
  last_contact_date: string | null;
  lastDeliveryDate?: string | null;
  tier: string | null;
  soCount: number;
  legCount: number;
}

interface TeamLeader {
  id: number;
  name: string;
  email: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
  teamLeaderId?: number | null;
}

interface CustomerTag {
  id: string;
  name: string;
  color?: string | null;
}

const ROWS_OPTIONS = [30, 50, 100, 200, 500, 750, 1000, 2000];
const VIEWED_LEADS_STORAGE_KEY = 'sales-manager-leads-viewed-at';
const VIEWED_LEAD_TTL_MS = 24 * 60 * 60 * 1000;
type LastCallFilter = 'all' | 'called_today' | 'called_yesterday' | 'called_1week' | 'called_2weeks' | 'called_3weeks' | 'called_1month' | 'never';
type CallOutcomeFilter = '' | 'connected' | 'order_placed' | 'callback_requested' | 'no_answer' | 'unreachable' | 'busy' | 'not_interested';

const CALL_OUTCOME_OPTIONS: Array<{ value: Exclude<CallOutcomeFilter, ''>; label: string }> = [
  { value: 'connected', label: 'Connected - Spoke with customer' },
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'unreachable', label: 'Unreachable' },
  { value: 'busy', label: 'Busy / Line Engaged' },
  { value: 'not_interested', label: 'Not Interested' },
];

const formatLastCalled = (dateStr?: string | null): { text: string; className: string } => {
  if (!dateStr) return { text: 'Never', className: 'text-red-600 font-medium' };
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { text: 'Invalid date', className: 'text-gray-400' };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const callDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { text: 'Today', className: 'text-green-700 font-semibold' };
  if (diffDays === 1) return { text: 'Yesterday', className: 'text-blue-600' };
  if (diffDays < 7) return { text: `${diffDays} days ago`, className: 'text-orange-600' };
  if (diffDays < 14) return { text: '1 week ago', className: 'text-orange-700' };
  if (diffDays < 28) return { text: `${Math.floor(diffDays / 7)} weeks ago`, className: 'text-red-500' };
  return { text: `${Math.floor(diffDays / 30)} months ago`, className: 'text-red-600' };
};

const TIER_COLORS: Record<string, string> = {
  tier_1: 'bg-emerald-100 text-emerald-700',
  tier_2: 'bg-sky-100 text-sky-700',
  tier_3: 'bg-slate-100 text-slate-700',
  tier_4: 'bg-amber-100 text-amber-700',
  tier_5: 'bg-orange-100 text-orange-700',
  tier_6: 'bg-red-100 text-red-700',
  rejected: 'bg-rose-100 text-rose-800',
};

const getSegment = (lead: Lead): { label: string; className: string; Icon: React.ElementType } | null => {
  const so = lead.soCount ?? 0;
  const leg = lead.legCount ?? 0;
  if (so > 0 && leg === 0) return { label: 'New', className: 'bg-blue-100 text-blue-700 border border-blue-200', Icon: FaUsers };
  if (leg > 0 && so === 0) return { label: 'Legacy', className: 'bg-amber-100 text-amber-700 border border-amber-200', Icon: FaGlobe };
  if (so > 0 && leg > 0) return { label: 'Converted', className: 'bg-green-100 text-green-700 border border-green-200', Icon: FaExchangeAlt };
  return null;
};

const LIFECYCLE_COLORS: Record<string, string> = {
  lead: 'bg-violet-100 text-violet-700',
  customer: 'bg-emerald-100 text-emerald-700',
};

const getFreshViewedLeads = (stored: Record<string, number>, now = Date.now()) => {
  return Object.fromEntries(
    Object.entries(stored).filter(([, viewedAt]) => now - viewedAt < VIEWED_LEAD_TTL_MS),
  );
};

const isLeadRecentlyViewed = (viewedLeads: Record<string, number>, customerId: number) => {
  const viewedAt = viewedLeads[String(customerId)];
  return Boolean(viewedAt && Date.now() - viewedAt < VIEWED_LEAD_TTL_MS);
};

const FilterField = ({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</span>
    {children}
  </label>
);

const SalesManagerLeadAssignment = () => {
  const toast = useToast();

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [tlFilter, setTlFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [deliveryStartFilter, setDeliveryStartFilter] = useState('');
  const [deliveryEndFilter, setDeliveryEndFilter] = useState('');
  const [assignedFromFilter, setAssignedFromFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [noteSearchFilter, setNoteSearchFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'' | 'new' | 'legacy' | 'mixed'>('');
  const [rejectedStatusFilter, setRejectedStatusFilter] = useState<'non_rejected' | 'rejected' | 'all'>('non_rejected');
  const [lastCallFilter, setLastCallFilter] = useState<LastCallFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [callOutcomeFilter, setCallOutcomeFilter] = useState<CallOutcomeFilter>('');
  const [productSuggestionFilter, setProductSuggestionFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(200);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAgent, setBulkAgent] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);

  // View (order) modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [viewedLeads, setViewedLeads] = useState<Record<string, number>>({});

  // Single assign modal
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);
  const [assignModalAgent, setAssignModalAgent] = useState<number | ''>('');
  const [assigningSingle, setAssigningSingle] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async (pg = 1, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(rowsPerPage),
      });
      if (search) params.set('search', search);
      if (assignmentStatus) params.set('assignmentStatus', assignmentStatus);
      if (tierFilter) params.set('tier', tierFilter);
      if (tlFilter) params.set('supervisor', tlFilter);
      if (agentFilter) params.set('agent', agentFilter);
      if (lifecycleFilter) params.set('lifecycleStage', lifecycleFilter);
      if (productFilter) params.set('productName', productFilter);
      if (deliveryStartFilter) params.set('deliveryDateStart', deliveryStartFilter);
      if (deliveryEndFilter) params.set('deliveryDateEnd', deliveryEndFilter);
      if (assignedFromFilter) params.set('assignedFrom', assignedFromFilter);
      if (assignedToFilter) params.set('assignedToDate', assignedToFilter);
      if (addressFilter.trim()) params.set('address', addressFilter.trim());
      if (noteSearchFilter.trim()) params.set('noteSearch', noteSearchFilter.trim());
      if (segmentFilter) params.set('orderSegment', segmentFilter);
      if (rejectedStatusFilter !== 'non_rejected') params.set('rejectedStatus', rejectedStatusFilter);
      if (lastCallFilter !== 'all') params.set('calledStatus', lastCallFilter);
      if (tagFilter) params.set('tagId', tagFilter);
      if (callOutcomeFilter) params.set('callOutcome', callOutcomeFilter);
      if (productSuggestionFilter.trim()) params.set('productSuggestion', productSuggestionFilter.trim());

      const res = await api.get(`/crm/data-analyst/unassigned-leads?${params}`);
      setLeads(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(pg);
      setSelected(new Set());
    } catch {
      toast.error('Failed to load leads');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [search, assignmentStatus, tierFilter, tlFilter, agentFilter, lifecycleFilter, productFilter, deliveryStartFilter, deliveryEndFilter, assignedFromFilter, assignedToFilter, addressFilter, noteSearchFilter, segmentFilter, rejectedStatusFilter, lastCallFilter, tagFilter, callOutcomeFilter, productSuggestionFilter, rowsPerPage, toast]);

  const fetchTeamLeaders = useCallback(async () => {
    try {
      const res = await api.get('/crm/sales-manager/team-leaders');
      setTeamLeaders(res.data || []);
    } catch {
      toast.error('Failed to load team leaders');
    }
  }, [toast]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await api.get('/crm/data-analyst/agents');
      setAgents(res.data || []);
    } catch {
      toast.error('Failed to load agents');
    }
  }, [toast]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await api.get('/crm/data-analyst/customer-tags');
      setTags(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load customer tags:', error);
      setTags([]);
    }
  }, []);

  useEffect(() => {
    fetchLeads(1);
    fetchTeamLeaders();
    fetchAgents();
  }, [fetchLeads, fetchTeamLeaders, fetchAgents]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(VIEWED_LEADS_STORAGE_KEY) || '{}');
      const freshViewedLeads = getFreshViewedLeads(parsed && typeof parsed === 'object' ? parsed : {});
      setViewedLeads(freshViewedLeads);
      localStorage.setItem(VIEWED_LEADS_STORAGE_KEY, JSON.stringify(freshViewedLeads));
    } catch {
      localStorage.removeItem(VIEWED_LEADS_STORAGE_KEY);
    }
  }, []);

  const markLeadViewed = useCallback((customerId: number) => {
    setViewedLeads(prev => {
      const next = getFreshViewedLeads({ ...prev, [String(customerId)]: Date.now() });
      localStorage.setItem(VIEWED_LEADS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
    }, 400);
  };

  // Selection helpers
  const allSelected = leads.length > 0 && selected.size === leads.length;
  const someSelected = selected.size > 0 && selected.size < leads.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map(l => l.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleViewOrder = async (customerId: number) => {
    markLeadViewed(customerId);
    try {
      const response = await api.get(`/order-management/customer/${customerId}/orders`);
      const orders = response.data?.data || response.data || [];
      if (orders.length > 0) {
        setSelectedOrderId(orders[0].id);
        setShowOrderModal(true);
      } else {
        toast.error('No orders found for this customer');
      }
    } catch {
      toast.error('Failed to fetch customer orders');
    }
  };

  const handleBulkAssign = async () => {
    if (selected.size === 0 || !bulkAgent) {
      toast.error('Select at least one lead and an agent');
      return;
    }
    setAssigning(true);
    try {
      await api.post('/crm/data-analyst/assign-leads', {
        customerIds: Array.from(selected),
        agentId: Number(bulkAgent),
      });
      const agentName = agents.find(a => a.id === Number(bulkAgent))?.name || '';
      toast.success(`${selected.size} lead(s) assigned to ${agentName}`);
      setBulkAgent('');
      await fetchLeads(page, { silent: true });
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleSingleAssign = async () => {
    if (!assignModalLead || !assignModalAgent) return;
    setAssigningSingle(true);
    try {
      await api.post('/crm/data-analyst/assign-leads', {
        customerIds: [assignModalLead.id],
        agentId: Number(assignModalAgent),
      });
      const agentName = agents.find(a => a.id === Number(assignModalAgent))?.name || '';
      toast.success(`Assigned to ${agentName}`);
      setAssignModalLead(null);
      setAssignModalAgent('');
      await fetchLeads(page, { silent: true });
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigningSingle(false);
    }
  };

  // Single unassign (sales manager level — removes supervisor assignment)
  const handleUnassign = async (lead: Lead) => {
    if (!confirm(`Unassign lead "${lead.name || ''} ${lead.lastName || ''}" from their agent?`)) return;
    try {
      await api.post('/crm/data-analyst/unassign-leads', {
        customerIds: [lead.id],
      });
      toast.success('Lead unassigned successfully');
      await fetchLeads(page, { silent: true });
    } catch {
      toast.error('Failed to unassign lead');
    }
  };

  // Bulk unassign
  const handleBulkUnassign = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Unassign ${selected.size} selected lead(s) from their agents?`)) return;
    setAssigning(true);
    try {
      const res = await api.post('/crm/data-analyst/unassign-leads', {
        customerIds: Array.from(selected),
      });
      const result = (res as any)?.data;
      toast.success(`Bulk unassign completed! ${result?.unassigned || selected.size} lead(s) unassigned.`);
      setSelected(new Set());
      await fetchLeads(page, { silent: true });
    } catch {
      toast.error('Failed to bulk unassign leads');
    } finally {
      setAssigning(false);
    }
  };

  const personName = (name?: string | null, fallback = 'Unassigned') => (
    name ? <span className="text-xs text-gray-800 font-medium">{name}</span> : <span className="text-gray-400 text-xs">{fallback}</span>
  );

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a
                href="/admin/crm/sales-manager-dashboard"
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Data Analyst
              </a>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Assignment</h1>
            <p className="text-gray-500 text-sm mt-0.5">Select leads and assign them directly to agents</p>
          </div>
          <div className="text-sm text-gray-500">
            {total.toLocaleString()} total leads
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
            <FilterField label="Customer Search">
            {/* Search */}
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            </FilterField>

            {/* Assignment Status */}
            <FilterField label="Assignment Status">
              <select
                value={assignmentStatus}
                onChange={e => setAssignmentStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All (Assigned &amp; Unassigned)</option>
                <option value="unassigned">Unassigned</option>
                <option value="assigned">Assigned</option>
              </select>
            </FilterField>

            {/* Team Leader filter */}
            <FilterField label="Team Leader">
              <select
                value={tlFilter}
                onChange={e => setTlFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Team Leaders</option>
                {teamLeaders.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Agent">
              <select
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Agents</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </FilterField>

            {/* Tier filter */}
            <FilterField label="Tier">
              <select
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Tiers</option>
                <option value="tier_1">Tier 1 - Highest Value</option>
                <option value="tier_2">Tier 2</option>
                <option value="tier_3">Tier 3</option>
                <option value="tier_4">Tier 4</option>
                <option value="tier_5">Tier 5</option>
                <option value="tier_6">Tier 6 - Highest Risk</option>
              </select>
            </FilterField>

            {/* Lifecycle filter */}
            <FilterField label="Lifecycle Stage">
              <select
                value={lifecycleFilter}
                onChange={e => setLifecycleFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Stages</option>
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
              </select>
            </FilterField>

            {/* Customer Segment filter */}
            <FilterField label="Customer Segment">
            <div className="relative">
              <select
                value={segmentFilter}
                onChange={e => setSegmentFilter(e.target.value as '' | 'new' | 'legacy' | 'mixed')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 appearance-none pr-8 font-medium ${
                  segmentFilter === 'new'
                    ? 'border-blue-400 bg-blue-50 text-blue-800'
                    : segmentFilter === 'legacy'
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : segmentFilter === 'mixed'
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <option value="">All Segments</option>
                <option value="new">🔵 New (SO- orders only)</option>
                <option value="legacy">🟡 Legacy (LEG- orders only)</option>
                <option value="mixed">🟢 Converted (SO- &amp; LEG-)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                {segmentFilter === 'new' && <FaUsers className="text-blue-500" size={12} />}
                {segmentFilter === 'legacy' && <FaGlobe className="text-amber-500" size={12} />}
                {segmentFilter === 'mixed' && <FaExchangeAlt className="text-green-500" size={12} />}
              </div>
            </div>
            </FilterField>

            {/* Rejected Status filter */}
            <FilterField label="Rejected Status">
              <select
                value={rejectedStatusFilter}
                onChange={e => setRejectedStatusFilter(e.target.value as 'non_rejected' | 'rejected' | 'all')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 ${
                  rejectedStatusFilter === 'rejected'
                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                    : rejectedStatusFilter === 'all'
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Customers</option>
                <option value="non_rejected">Non-Rejected</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </FilterField>

            {/* Last Call filter */}
            <FilterField label="Last Call">
              <select
                value={lastCallFilter}
                onChange={e => setLastCallFilter(e.target.value as LastCallFilter)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Last Calls</option>
                <option value="called_today">Called Today</option>
                <option value="called_yesterday">Called Yesterday</option>
                <option value="called_1week">Called 1 Week Ago</option>
                <option value="called_2weeks">Called 2 Weeks Ago</option>
                <option value="called_3weeks">Called 3 Weeks Ago</option>
                <option value="called_1month">Called 1 Month Ago</option>
                <option value="never">Never Called</option>
              </select>
            </FilterField>

            {/* Product search — Bengali + English */}
            <FilterField label="Customer Tag">
              <select
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Call Log Outcome">
              <select
                value={callOutcomeFilter}
                onChange={e => setCallOutcomeFilter(e.target.value as CallOutcomeFilter)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Outcomes</option>
                {CALL_OUTCOME_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Product Search" className="xl:col-span-2">
              <ProductAutocomplete
                value={productFilter}
                onChange={val => setProductFilter(val)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              />
            </FilterField>

            <FilterField label="Product Suggestion" className="xl:col-span-2">
              <input
                type="text"
                placeholder="Search product suggestion..."
                value={productSuggestionFilter}
                onChange={e => setProductSuggestionFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Delivery Start Date">
              <input
                type="date"
                value={deliveryStartFilter}
                onChange={e => setDeliveryStartFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Delivery End Date">
              <input
                type="date"
                value={deliveryEndFilter}
                onChange={e => setDeliveryEndFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Assigned Start Date">
              <input
                type="date"
                value={assignedFromFilter}
                onChange={e => setAssignedFromFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Assigned End Date">
              <input
                type="date"
                value={assignedToFilter}
                onChange={e => setAssignedToFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Address Search">
              <input
                type="text"
                placeholder="Address, city, district..."
                value={addressFilter}
                onChange={e => setAddressFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Call Note Search">
              <input
                type="text"
                placeholder="Search call notes..."
                value={noteSearchFilter}
                onChange={e => setNoteSearchFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows:</span>
              <select
                value={rowsPerPage}
                onChange={e => setRowsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {ROWS_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchLeads(1)}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-4">
            <span className="text-indigo-800 font-semibold text-sm">
              {selected.size} lead{selected.size !== 1 ? 's' : ''} selected
            </span>
            <select
              value={bulkAgent}
              onChange={e => setBulkAgent(e.target.value ? Number(e.target.value) : '')}
              className="border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[220px]"
            >
              <option value="">Select Agent...</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={assigning || !bulkAgent}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {assigning ? 'Assigning…' : `Assign ${selected.size} Lead${selected.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={handleBulkUnassign}
              disabled={assigning}
              className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {assigning ? 'Unassigning…' : `Unassign ${selected.size} Lead${selected.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-indigo-600 text-sm hover:underline"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
              Loading leads…
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 pl-4 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected; }}
                          onChange={toggleAll}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Analyst</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Leader</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Agent</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Call</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(lead => {
                      const viewed = isLeadRecentlyViewed(viewedLeads, lead.id);
                      return (
                        <tr
                          key={lead.id}
                          className={`hover:bg-gray-50 transition-colors ${selected.has(lead.id) ? 'bg-indigo-50/60' : ''}`}
                        >
                        <td className="py-3 pl-4 pr-2">
                          <input
                            type="checkbox"
                            checked={selected.has(lead.id)}
                            onChange={() => toggleOne(lead.id)}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-gray-900 text-sm">
                            {[lead.name, lead.lastName].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{lead.phone || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">#{lead.id}</div>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 whitespace-nowrap">
                          {lead.lastDeliveryDate ? new Date(lead.lastDeliveryDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }) : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {(() => {
                            const seg = getSegment(lead);
                            if (!seg) return <span className="text-gray-300 text-xs">—</span>;
                            const Icon = seg.Icon;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${seg.className}`}>
                                <Icon size={10} />{seg.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {lead.tier ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[lead.tier] || 'bg-gray-100 text-gray-600'}`}>
                              {lead.tier}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {personName(lead.dataAnalystName)}
                          {lead.assigned_at && <div className="text-[11px] text-gray-400">{new Date(lead.assigned_at).toLocaleDateString()}</div>}
                        </td>
                        <td className="py-3 px-3">{personName(lead.teamLeaderName)}</td>
                        <td className="py-3 px-3">{personName(lead.assignedAgentName)}</td>
                        <td className="py-3 px-3 text-sm">
                          {(() => {
                            const lastCall = formatLastCalled(lead.last_contact_date);
                            return (
                              <>
                                <div className={lastCall.className}>{lastCall.text}</div>
                                {lead.last_contact_date && (
                                  <div className="text-[11px] text-gray-400">
                                    {new Date(lead.last_contact_date).toLocaleDateString()}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewOrder(lead.id)}
                              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-colors ${
                                viewed
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              <FaEye size={12} /> {viewed ? 'Viewed' : 'View'}
                            </button>
                            <button
                              onClick={() => { setAssignModalLead(lead); setAssignModalAgent(''); }}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                            >
                              {lead.assigned_to ? 'Reassign' : 'Assign'}
                            </button>
                            {lead.assigned_to && (
                              <button
                                onClick={() => handleUnassign(lead)}
                                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                              >
                                Unassign
                              </button>
                            )}
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-16 text-gray-400">
                          No leads found. Try adjusting your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages} &bull; {total.toLocaleString()} total
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => fetchLeads(page - 1)}
                      className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      ← Previous
                    </button>
                    {/* Page numbers (show up to 7 around current) */}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = Math.max(1, page - 3) + i;
                      if (pg > totalPages) return null;
                      return (
                        <button
                          key={pg}
                          onClick={() => fetchLeads(pg)}
                          className={`px-3 py-1.5 rounded-lg border text-sm ${pg === page ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'}`}
                        >
                          {pg}
                        </button>
                      );
                    })}
                    <button
                      disabled={page >= totalPages}
                      onClick={() => fetchLeads(page + 1)}
                      className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                    <span className="text-sm text-gray-500 ml-2 flex items-center gap-1">
                      Go to
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        defaultValue={page}
                        key={page}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Math.max(1, Math.min(totalPages, Number((e.target as HTMLInputElement).value) || 1));
                            fetchLeads(val);
                          }
                        }}
                        className="w-16 px-2 py-1 border rounded text-sm text-center"
                      />
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => { setShowOrderModal(false); setSelectedOrderId(null); }}
          onUpdate={() => fetchLeads(page)}
        />
      )}

      {/* Single Assign Modal */}
      {assignModalLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {assignModalLead.assigned_to ? 'Reassign Lead' : 'Assign Lead'}
              </h3>
              <button onClick={() => setAssignModalLead(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-lg p-3 mb-5">
                <div className="font-medium text-gray-900 text-sm">
                  {[assignModalLead.name, assignModalLead.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="text-sm text-gray-500">{assignModalLead.phone}</div>
                {assignModalLead.assigned_to && (
                  <div className="text-xs text-indigo-600 mt-1">
                    Currently: {assignModalLead.assignedAgentName || `Agent #${assignModalLead.assigned_to}`}
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
              <select
                value={assignModalAgent}
                onChange={e => setAssignModalAgent(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 mb-5"
              >
                <option value="">Choose Agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAssignModalLead(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSingleAssign}
                  disabled={assigningSingle || !assignModalAgent}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigningSingle ? 'Assigning…' : 'Assign Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default SalesManagerLeadAssignment;
