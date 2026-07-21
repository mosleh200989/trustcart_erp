import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import AdminDateInput from '@/components/admin/AdminDateInput';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { FaEye, FaUsers, FaGlobe, FaExchangeAlt } from 'react-icons/fa';
import { CALL_OUTCOME_OPTIONS, type CallOutcomeValue, ORDER_REJECTION_REASON_OPTIONS } from '@/constants/adminOptions';

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
  lastOrderDate?: string | null;
  lastDeliveryDate?: string | null;
  tier: string | null;
  tierAssignedAt?: string | null;
  soCount: number;
  legCount: number;
  scheduledAssignmentId?: number | null;
  scheduledAssignmentAction?: 'assign' | 'unassign' | null;
  scheduledAssignmentStatus?: string | null;
  scheduledAssignmentAt?: string | null;
  scheduledAssignmentAgentId?: number | null;
  scheduledAssignmentAgentName?: string | null;
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

interface ProductSuggestionOption {
  key: string;
  label: string;
}

const ROWS_OPTIONS = [30, 50, 100, 200, 500, 750, 1000, 2000];
const VIEWED_LEADS_STORAGE_KEY = 'sales-manager-leads-viewed-at';
const VIEWED_LEAD_TTL_MS = 24 * 60 * 60 * 1000;
type LastCallFilter = 'all' | 'called_today' | 'called_yesterday' | 'called_1week' | 'called_2weeks' | 'called_3weeks' | 'called_1month' | 'called_2months' | 'called_3months_plus' | 'never';
type CallOutcomeFilter = '' | CallOutcomeValue;

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

const formatDhakaDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' });
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

const getApiErrorMessage = (error: any, fallback: string) => {
  const message = error?.response?.data?.message || error?.message || fallback;
  return Array.isArray(message) ? message.join(', ') : String(message);
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

interface SalesManagerLeadAssignmentProps {
  foreignOnly?: boolean;
  title?: string;
  description?: string;
  totalLabel?: string;
}

const SalesManagerLeadAssignment = ({
  foreignOnly = false,
  title = 'Lead Assignment',
  description = 'Select leads and assign them directly to agents',
  totalLabel = 'total leads',
}: SalesManagerLeadAssignmentProps = {}) => {
  const toast = useToast();

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersPending, setFiltersPending] = useState(false);
  const [leadLoadError, setLeadLoadError] = useState('');
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [productSuggestionOptions, setProductSuggestionOptions] = useState<ProductSuggestionOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sourceNumberFilter, setSourceNumberFilter] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [tlFilter, setTlFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [lastOrderStartFilter, setLastOrderStartFilter] = useState('');
  const [lastOrderEndFilter, setLastOrderEndFilter] = useState('');
  const [deliveryStartFilter, setDeliveryStartFilter] = useState('');
  const [deliveryEndFilter, setDeliveryEndFilter] = useState('');
  const [tierUpdatedFromFilter, setTierUpdatedFromFilter] = useState('');
  const [tierUpdatedToFilter, setTierUpdatedToFilter] = useState('');
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
  const [orderRejectedReasonFilter, setOrderRejectedReasonFilter] = useState('');
  const [scheduledAssignmentStatusFilter, setScheduledAssignmentStatusFilter] = useState('');
  const [scheduledAssignmentActionFilter, setScheduledAssignmentActionFilter] = useState('');
  const [scheduledAssignmentAgentFilter, setScheduledAssignmentAgentFilter] = useState('');
  const [scheduledFromFilter, setScheduledFromFilter] = useState('');
  const [scheduledToFilter, setScheduledToFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(200);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAgent, setBulkAgent] = useState<number | ''>('');
  const [bulkScheduleAt, setBulkScheduleAt] = useState('');
  const [assigning, setAssigning] = useState(false);

  // View (order) modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [viewedLeads, setViewedLeads] = useState<Record<string, number>>({});

  // Single assign modal
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);
  const [assignModalAgent, setAssignModalAgent] = useState<number | ''>('');
  const [assignModalScheduleAt, setAssignModalScheduleAt] = useState('');
  const [assigningSingle, setAssigningSingle] = useState(false);
  const [unassignModalLead, setUnassignModalLead] = useState<Lead | null>(null);
  const [unassignModalScheduleAt, setUnassignModalScheduleAt] = useState('');
  const [unassigningSingle, setUnassigningSingle] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadsAbortRef = useRef<AbortController | null>(null);
  const lastFilterSignatureRef = useRef('');
  const hasLoadedInitialLeads = useRef(false);
  const pageRef = useRef(page);
  const leadsRequestRef = useRef(0);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const filterSignature = useMemo(
    () => JSON.stringify({
      search,
      sourceNumberFilter,
      assignmentStatus,
      tierFilter,
      tlFilter,
      agentFilter,
      lifecycleFilter,
      productFilter,
      lastOrderStartFilter,
      lastOrderEndFilter,
      deliveryStartFilter,
      deliveryEndFilter,
      tierUpdatedFromFilter,
      tierUpdatedToFilter,
      assignedFromFilter,
      assignedToFilter,
      addressFilter,
      noteSearchFilter,
      segmentFilter,
      rejectedStatusFilter,
      lastCallFilter,
      tagFilter,
      callOutcomeFilter,
      productSuggestionFilter,
      orderRejectedReasonFilter,
      scheduledAssignmentStatusFilter,
      scheduledAssignmentActionFilter,
      scheduledAssignmentAgentFilter,
      scheduledFromFilter,
      scheduledToFilter,
      rowsPerPage,
      foreignOnly,
    }),
    [search, sourceNumberFilter, assignmentStatus, tierFilter, tlFilter, agentFilter, lifecycleFilter, productFilter, lastOrderStartFilter, lastOrderEndFilter, deliveryStartFilter, deliveryEndFilter, tierUpdatedFromFilter, tierUpdatedToFilter, assignedFromFilter, assignedToFilter, addressFilter, noteSearchFilter, segmentFilter, rejectedStatusFilter, lastCallFilter, tagFilter, callOutcomeFilter, productSuggestionFilter, orderRejectedReasonFilter, scheduledAssignmentStatusFilter, scheduledAssignmentActionFilter, scheduledAssignmentAgentFilter, scheduledFromFilter, scheduledToFilter, rowsPerPage, foreignOnly],
  );

  const fetchLeads = useCallback(async (pg = 1, options?: { silent?: boolean }) => {
    const requestId = ++leadsRequestRef.current;
    leadsAbortRef.current?.abort();
    const abortController = new AbortController();
    leadsAbortRef.current = abortController;
    setLeadLoadError('');
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFiltersPending(false);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(rowsPerPage),
      });
      if (foreignOnly) params.set('foreignOnly', 'true');
      if (search) params.set('search', search);
      if (foreignOnly && sourceNumberFilter.trim()) params.set('sourceNumber', sourceNumberFilter.trim());
      if (assignmentStatus) params.set('assignmentStatus', assignmentStatus);
      if (tierFilter) params.set('tier', tierFilter);
      if (tlFilter) params.set('supervisor', tlFilter);
      if (agentFilter) params.set('agent', agentFilter);
      if (lifecycleFilter) params.set('lifecycleStage', lifecycleFilter);
      if (productFilter) params.set('productName', productFilter);
      if (lastOrderStartFilter) params.set('lastOrderDateStart', lastOrderStartFilter);
      if (lastOrderEndFilter) params.set('lastOrderDateEnd', lastOrderEndFilter);
      if (deliveryStartFilter) params.set('deliveryDateStart', deliveryStartFilter);
      if (deliveryEndFilter) params.set('deliveryDateEnd', deliveryEndFilter);
      if (tierUpdatedFromFilter) params.set('tierUpdatedFrom', tierUpdatedFromFilter);
      if (tierUpdatedToFilter) params.set('tierUpdatedTo', tierUpdatedToFilter);
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
      if (orderRejectedReasonFilter.trim()) params.set('orderRejectedReason', orderRejectedReasonFilter.trim());
      if (scheduledAssignmentStatusFilter) params.set('scheduledAssignmentStatus', scheduledAssignmentStatusFilter);
      if (scheduledAssignmentActionFilter) params.set('scheduledAssignmentAction', scheduledAssignmentActionFilter);
      if (scheduledAssignmentAgentFilter) params.set('scheduledAgent', scheduledAssignmentAgentFilter);
      if (scheduledFromFilter) params.set('scheduledFrom', scheduledFromFilter);
      if (scheduledToFilter) params.set('scheduledTo', scheduledToFilter);

      const res = await api.get(`/crm/data-analyst/unassigned-leads?${params}`, {
        signal: abortController.signal,
      });
      if (requestId !== leadsRequestRef.current) return;
      const nextTotal = res.data.total || 0;
      const nextTotalPages = Math.max(1, res.data.totalPages || 1);
      if (nextTotal > 0 && pg > nextTotalPages) {
        await fetchLeads(nextTotalPages, options);
        return;
      }
      setLeads(res.data.items || []);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      setPage(pg);
      setSelected(new Set());
    } catch (error: any) {
      if (requestId !== leadsRequestRef.current) return;
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
      const message = error?.response?.data?.message || error?.message || 'Failed to load leads';
      setLeadLoadError(String(message));
      toast.error('Failed to load leads');
    } finally {
      if (requestId === leadsRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
        setFiltersPending(false);
      }
      if (leadsAbortRef.current === abortController) leadsAbortRef.current = null;
    }
  }, [search, sourceNumberFilter, assignmentStatus, tierFilter, tlFilter, agentFilter, lifecycleFilter, productFilter, lastOrderStartFilter, lastOrderEndFilter, deliveryStartFilter, deliveryEndFilter, tierUpdatedFromFilter, tierUpdatedToFilter, assignedFromFilter, assignedToFilter, addressFilter, noteSearchFilter, segmentFilter, rejectedStatusFilter, lastCallFilter, tagFilter, callOutcomeFilter, productSuggestionFilter, orderRejectedReasonFilter, scheduledAssignmentStatusFilter, scheduledAssignmentActionFilter, scheduledAssignmentAgentFilter, scheduledFromFilter, scheduledToFilter, rowsPerPage, foreignOnly, toast]);

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

  const fetchProductSuggestionOptions = useCallback(async () => {
    try {
      const res = await api.get('/products/admin/suggestion-options');
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProductSuggestionOptions(rows.map((row: any) => ({
        key: String(row.suggestionOptionKey || `${row.productId || row.id}::${row.suggestionVariantName || ''}`),
        label: String(row.suggestionOptionLabel || row.name_en || row.name_bn || `Product #${row.productId || row.id}`),
      })));
    } catch (error) {
      console.error('Failed to load product suggestion options:', error);
      setProductSuggestionOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchTeamLeaders();
    fetchAgents();
  }, [fetchTeamLeaders, fetchAgents]);

  useEffect(() => {
    if (!hasLoadedInitialLeads.current) {
      hasLoadedInitialLeads.current = true;
      lastFilterSignatureRef.current = filterSignature;
      fetchLeads(1);
      return;
    }
    if (filtersTimer.current) clearTimeout(filtersTimer.current);
    const filtersChanged = lastFilterSignatureRef.current !== filterSignature;
    if (filtersChanged) setFiltersPending(true);
    filtersTimer.current = setTimeout(() => {
      if (filtersChanged) {
        lastFilterSignatureRef.current = filterSignature;
        fetchLeads(1, { silent: true });
      } else {
        fetchLeads(pageRef.current, { silent: true });
      }
    }, 250);
    return () => {
      if (filtersTimer.current) clearTimeout(filtersTimer.current);
    };
  }, [fetchLeads, filterSignature]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchProductSuggestionOptions();
  }, [fetchProductSuggestionOptions]);

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

  const refreshCurrentPage = useCallback(async () => {
    await fetchLeads(pageRef.current, { silent: true });
  }, [fetchLeads]);

  const refreshCurrentPageSafely = useCallback(() => {
    void refreshCurrentPage().catch((error) => {
      console.error('Lead list refresh failed after action:', error);
      toast.warning('Saved, but the lead list refresh failed. Please refresh manually if needed.');
    });
  }, [refreshCurrentPage, toast]);

  const applyAssignedLeadsLocally = useCallback((customerIds: number[], agentId: number) => {
    const ids = new Set(customerIds);
    const agent = agents.find(a => a.id === agentId);
    const agentName = agent?.name || `Agent #${agentId}`;

    if (assignmentStatus === 'unassigned') {
      setLeads(prev => prev.filter(lead => !ids.has(lead.id)));
      setTotal(prev => Math.max(0, prev - ids.size));
    } else {
      setLeads(prev => prev.map(lead => (
        ids.has(lead.id)
          ? { ...lead, assigned_to: agentId, assignedAgentName: agentName, leadStatus: 'assigned' }
          : lead
      )));
    }

    setSelected(prev => new Set([...prev].filter(id => !ids.has(id))));
  }, [agents, assignmentStatus]);

  const applyUnassignedLeadsLocally = useCallback((customerIds: number[]) => {
    const ids = new Set(customerIds);

    if (assignmentStatus === 'assigned') {
      setLeads(prev => prev.filter(lead => !ids.has(lead.id)));
      setTotal(prev => Math.max(0, prev - ids.size));
    } else {
      setLeads(prev => prev.map(lead => (
        ids.has(lead.id)
          ? { ...lead, assigned_to: null, assignedAgentName: null, leadStatus: 'unassigned' }
          : lead
      )));
    }

    setSelected(prev => new Set([...prev].filter(id => !ids.has(id))));
  }, [assignmentStatus]);

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
      const customerIds = Array.from(selected);
      await api.post('/crm/data-analyst/assign-leads', {
        customerIds,
        agentId: Number(bulkAgent),
      });
      const agentName = agents.find(a => a.id === Number(bulkAgent))?.name || '';
      toast.success(`${selected.size} lead(s) assigned to ${agentName}`);
      applyAssignedLeadsLocally(customerIds, Number(bulkAgent));
      setBulkAgent('');
      refreshCurrentPageSafely();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Assignment failed'));
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkScheduleAssign = async () => {
    if (selected.size === 0 || !bulkAgent || !bulkScheduleAt) {
      toast.error('Select leads, an agent, and a schedule date/time');
      return;
    }
    setAssigning(true);
    try {
      await api.post('/crm/data-analyst/schedule-lead-assignment', {
        customerIds: Array.from(selected),
        action: 'assign',
        agentId: Number(bulkAgent),
        scheduledAt: bulkScheduleAt,
      });
      const agentName = agents.find(a => a.id === Number(bulkAgent))?.name || '';
      toast.success(`${selected.size} lead(s) scheduled to assign to ${agentName}`);
      setBulkAgent('');
      setBulkScheduleAt('');
      setSelected(new Set());
      refreshCurrentPageSafely();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to schedule assignment'));
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
      applyAssignedLeadsLocally([assignModalLead.id], Number(assignModalAgent));
      setAssignModalLead(null);
      setAssignModalAgent('');
      refreshCurrentPageSafely();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Assignment failed'));
    } finally {
      setAssigningSingle(false);
    }
  };

  const handleSingleScheduleAssign = async () => {
    if (!assignModalLead || !assignModalAgent || !assignModalScheduleAt) return;
    setAssigningSingle(true);
    try {
      await api.post('/crm/data-analyst/schedule-lead-assignment', {
        customerIds: [assignModalLead.id],
        action: 'assign',
        agentId: Number(assignModalAgent),
        scheduledAt: assignModalScheduleAt,
      });
      const agentName = agents.find(a => a.id === Number(assignModalAgent))?.name || '';
      toast.success(`Scheduled assignment to ${agentName}`);
      setAssignModalLead(null);
      setAssignModalAgent('');
      setAssignModalScheduleAt('');
      refreshCurrentPageSafely();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Failed to schedule assignment'));
    } finally {
      setAssigningSingle(false);
    }
  };

  // Single unassign (sales manager level — removes supervisor assignment)
  const handleUnassign = async (lead: Lead) => {
    if (!confirm(`Unassign lead "${lead.name || ''} ${lead.lastName || ''}" from their agent now?`)) return;
    try {
      await api.post('/crm/data-analyst/unassign-leads', {
        customerIds: [lead.id],
      });
      toast.success('Lead unassigned successfully');
      applyUnassignedLeadsLocally([lead.id]);
      refreshCurrentPageSafely();
    } catch {
      toast.error('Failed to unassign lead');
    }
  };

  const handleSingleScheduleUnassign = async () => {
    if (!unassignModalLead || !unassignModalScheduleAt) return;
    setUnassigningSingle(true);
    try {
      await api.post('/crm/data-analyst/schedule-lead-assignment', {
        customerIds: [unassignModalLead.id],
        action: 'unassign',
        scheduledAt: unassignModalScheduleAt,
      });
      toast.success('Scheduled unassign successfully');
      setUnassignModalLead(null);
      setUnassignModalScheduleAt('');
      refreshCurrentPageSafely();
    } catch {
      toast.error('Failed to schedule unassign');
    } finally {
      setUnassigningSingle(false);
    }
  };

  // Bulk unassign
  const handleBulkUnassign = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Unassign ${selected.size} selected lead(s) from their agents?`)) return;
    setAssigning(true);
    try {
      const customerIds = Array.from(selected);
      const res = await api.post('/crm/data-analyst/unassign-leads', {
        customerIds,
      });
      const result = (res as any)?.data;
      toast.success(`Bulk unassign completed! ${result?.unassigned || selected.size} lead(s) unassigned.`);
      applyUnassignedLeadsLocally(customerIds);
      refreshCurrentPageSafely();
    } catch {
      toast.error('Failed to bulk unassign leads');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkScheduleUnassign = async () => {
    if (selected.size === 0 || !bulkScheduleAt) {
      toast.error('Select leads and a schedule date/time');
      return;
    }
    setAssigning(true);
    try {
      await api.post('/crm/data-analyst/schedule-lead-assignment', {
        customerIds: Array.from(selected),
        action: 'unassign',
        scheduledAt: bulkScheduleAt,
      });
      toast.success(`${selected.size} lead(s) scheduled to unassign`);
      setBulkScheduleAt('');
      setSelected(new Set());
      refreshCurrentPageSafely();
    } catch {
      toast.error('Failed to schedule bulk unassign');
    } finally {
      setAssigning(false);
    }
  };

  const personName = (name?: string | null, fallback = 'Unassigned') => (
    name ? <span className="text-xs text-gray-800 font-medium">{name}</span> : <span className="text-gray-400 text-xs">{fallback}</span>
  );

  const formatScheduleDateTime = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tableUpdating = refreshing || filtersPending;
  const statusText = filtersPending ? 'Waiting to apply filters...' : refreshing ? 'Applying filters...' : '';

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-[1800px] px-0 py-2 sm:px-4 sm:py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{description}</p>
          </div>
          <div className="text-sm text-gray-500">
            {total.toLocaleString()} {totalLabel}
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

            {foreignOnly && (
              <FilterField label="Source Number">
                <input
                  type="search"
                  inputMode="tel"
                  placeholder="Search country code or number..."
                  value={sourceNumberFilter}
                  onChange={e => setSourceNumberFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </FilterField>
            )}

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
                <option value="rejected">Rejected</option>
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
                <option value="called_2months">Called 2 Months Ago</option>
                <option value="called_3months_plus">Called 3+ Months Ago</option>
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
                lockOnSelect
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              />
            </FilterField>

            <FilterField label="Product Suggestion" className="xl:col-span-2">
              <select
                value={productSuggestionFilter}
                onChange={e => setProductSuggestionFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All suggestion states</option>
                <option value="__none__">No suggestion yet</option>
                <option value="__any__">All products with suggestion</option>
                {productSuggestionOptions.length > 0 && (
                  <option disabled value="__separator__">-- Shortlisted products --</option>
                )}
                {productSuggestionOptions.map(option => (
                  <option key={option.key} value={option.label}>{option.label}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Order Rejected Reason" className="xl:col-span-2">
              <select
                value={orderRejectedReasonFilter}
                onChange={e => setOrderRejectedReasonFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Reasons</option>
                {ORDER_REJECTION_REASON_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Last Order Start Date">
              <AdminDateInput
                value={lastOrderStartFilter}
                onValueChange={setLastOrderStartFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Last Order End Date">
              <AdminDateInput
                value={lastOrderEndFilter}
                onValueChange={setLastOrderEndFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Delivery Start Date">
              <AdminDateInput
                value={deliveryStartFilter}
                onValueChange={setDeliveryStartFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Delivery End Date">
              <AdminDateInput
                value={deliveryEndFilter}
                onValueChange={setDeliveryEndFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Tier Updated From">
              <AdminDateInput
                value={tierUpdatedFromFilter}
                onValueChange={setTierUpdatedFromFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Tier Updated To">
              <AdminDateInput
                value={tierUpdatedToFilter}
                onValueChange={setTierUpdatedToFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Assigned Start Date">
              <AdminDateInput
                value={assignedFromFilter}
                onValueChange={setAssignedFromFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Assigned End Date">
              <AdminDateInput
                value={assignedToFilter}
                onValueChange={setAssignedToFilter}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Scheduled Status">
              <select
                value={scheduledAssignmentStatusFilter}
                onChange={e => setScheduledAssignmentStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Scheduled Statuses</option>
                <option value="pending">Pending Scheduled</option>
                <option value="none">No Pending Schedule</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="any">Any Schedule History</option>
              </select>
            </FilterField>

            <FilterField label="Scheduled Action">
              <select
                value={scheduledAssignmentActionFilter}
                onChange={e => setScheduledAssignmentActionFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Scheduled Actions</option>
                <option value="assign">Assign</option>
                <option value="unassign">Unassign</option>
              </select>
            </FilterField>

            <FilterField label="Scheduled Agent">
              <select
                value={scheduledAssignmentAgentFilter}
                onChange={e => setScheduledAssignmentAgentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Scheduled Agents</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Scheduled Start">
              <input
                type="datetime-local"
                value={scheduledFromFilter}
                onChange={e => setScheduledFromFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </FilterField>

            <FilterField label="Scheduled End">
              <input
                type="datetime-local"
                value={scheduledToFilter}
                onChange={e => setScheduledToFilter(e.target.value)}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <PageSizeSelector
              label="Rows"
              value={rowsPerPage}
              onChange={setRowsPerPage}
              options={ROWS_OPTIONS}
            />
            {tableUpdating && (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                <span className="h-3 w-3 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                {statusText}
              </div>
            )}
            <button
              onClick={() => fetchLeads(1, { silent: true })}
              disabled={tableUpdating}
              className="min-h-11 w-full rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {tableUpdating ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-5 [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto [&>input]:w-full sm:[&>input]:w-auto [&>select]:w-full sm:[&>select]:w-auto">
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
            <input
              type="datetime-local"
              value={bulkScheduleAt}
              onChange={e => setBulkScheduleAt(e.target.value)}
              className="border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              title="Schedule date and time"
            />
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
              onClick={handleBulkScheduleAssign}
              disabled={assigning || !bulkAgent || !bulkScheduleAt}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Schedule Assign
            </button>
            <button
              onClick={handleBulkScheduleUnassign}
              disabled={assigning || !bulkScheduleAt}
              className="bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Schedule Unassign
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          {tableUpdating && !loading && (
            <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-indigo-100 bg-white/95 px-5 py-2 text-sm font-medium text-indigo-700 shadow-sm">
              <span className="h-4 w-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
              {statusText}
            </div>
          )}
          {leadLoadError && !loading && leads.length > 0 && !tableUpdating && (
            <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-700">
              <span>Could not refresh leads. The table is still showing the previous result.</span>
              <button
                onClick={() => fetchLeads(page)}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
              Loading leads…
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto transition-opacity ${tableUpdating ? 'opacity-55 pointer-events-none' : 'opacity-100'}`}>
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
                      {foreignOnly && (
                        <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Foreign Number</th>
                      )}
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier Updated</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Analyst</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Leader</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Agent</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled</th>
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
                          {formatDhakaDate(lead.lastDeliveryDate)}
                        </td>
                        {foreignOnly && (
                          <td className="py-3 px-3 text-sm text-gray-800 whitespace-nowrap">
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              {lead.source || 'N/A'}
                            </span>
                          </td>
                        )}
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
                        <td className="py-3 px-3 text-sm text-gray-700 whitespace-nowrap">
                          {lead.tierAssignedAt ? formatDhakaDate(lead.tierAssignedAt) : <span className="text-gray-300 text-xs">N/A</span>}
                        </td>
                        <td className="py-3 px-3">
                          {personName(lead.dataAnalystName)}
                          {lead.assigned_at && <div className="text-[11px] text-gray-400">{formatDhakaDate(lead.assigned_at)}</div>}
                        </td>
                        <td className="py-3 px-3">{personName(lead.teamLeaderName)}</td>
                        <td className="py-3 px-3">{personName(lead.assignedAgentName)}</td>
                        <td className="py-3 px-3 text-xs">
                          {lead.scheduledAssignmentId ? (
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold capitalize ${
                                lead.scheduledAssignmentAction === 'assign'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {lead.scheduledAssignmentAction}
                              </span>
                              <div className="text-gray-700">{formatScheduleDateTime(lead.scheduledAssignmentAt)}</div>
                              {lead.scheduledAssignmentAction === 'assign' && (
                                <div className="text-gray-500">
                                  To: {lead.scheduledAssignmentAgentName || `Agent #${lead.scheduledAssignmentAgentId}`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm">
                          {(() => {
                            const lastCall = formatLastCalled(lead.last_contact_date);
                            return (
                              <>
                                <div className={lastCall.className}>{lastCall.text}</div>
                                {lead.last_contact_date && (
                                  <div className="text-[11px] text-gray-400">
                                    {formatScheduleDateTime(lead.last_contact_date)}
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
                              onClick={() => { setAssignModalLead(lead); setAssignModalAgent(''); setAssignModalScheduleAt(''); }}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                            >
                              {lead.assigned_to ? 'Reassign' : 'Assign'}
                            </button>
                            {lead.assigned_to && (
                              <>
                                <button
                                  onClick={() => handleUnassign(lead)}
                                  className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700"
                                >
                                  Unassign
                                </button>
                                <button
                                  onClick={() => { setUnassignModalLead(lead); setUnassignModalScheduleAt(''); }}
                                  className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700"
                                >
                                  Schedule Unassign
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                    {leadLoadError && leads.length === 0 ? (
                      <tr>
                        <td colSpan={foreignOnly ? 13 : 12} className="text-center py-16">
                          <div className="font-semibold text-red-600">Failed to load leads</div>
                          <div className="mt-1 text-sm text-gray-500">{leadLoadError}</div>
                          <button
                            onClick={() => fetchLeads(page)}
                            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ) : leads.length === 0 && (
                      <tr>
                        <td colSpan={foreignOnly ? 13 : 12} className="text-center py-16 text-gray-400">
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

              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date &amp; Time</label>
              <input
                type="datetime-local"
                value={assignModalScheduleAt}
                onChange={e => setAssignModalScheduleAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 mb-5"
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAssignModalLead(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSingleScheduleAssign}
                  disabled={assigningSingle || !assignModalAgent || !assignModalScheduleAt}
                  className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Schedule
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

      {/* Single Schedule Unassign Modal */}
      {unassignModalLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Unassign</h3>
              <button
                onClick={() => { setUnassignModalLead(null); setUnassignModalScheduleAt(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                x
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-lg p-3 mb-5">
                <div className="font-medium text-gray-900 text-sm">
                  {[unassignModalLead.name, unassignModalLead.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="text-sm text-gray-500">{unassignModalLead.phone}</div>
                <div className="text-xs text-indigo-600 mt-1">
                  Currently: {unassignModalLead.assignedAgentName || `Agent #${unassignModalLead.assigned_to}`}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date &amp; Time</label>
              <input
                type="datetime-local"
                value={unassignModalScheduleAt}
                onChange={e => setUnassignModalScheduleAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 mb-5"
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setUnassignModalLead(null); setUnassignModalScheduleAt(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSingleScheduleUnassign}
                  disabled={unassigningSingle || !unassignModalScheduleAt}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {unassigningSingle ? 'Scheduling...' : 'Schedule Unassign'}
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
