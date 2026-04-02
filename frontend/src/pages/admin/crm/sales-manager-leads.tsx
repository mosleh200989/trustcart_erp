import React, { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import api from '../../../services/api';
import { useToast } from '@/contexts/ToastContext';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import ProductAutocomplete from '@/components/admin/ProductAutocomplete';
import { FaEye } from 'react-icons/fa';

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
  city: string | null;
  district: string | null;
  source: string | null;
  total_spent: number;
  createdAt: string;
  last_contact_date: string | null;
  tier: string | null;
}

interface TeamLeader {
  id: number;
  name: string;
  email: string;
}

const ROWS_OPTIONS = [200, 500, 750, 1000, 2000];

const TIER_COLORS: Record<string, string> = {
  silver: 'bg-gray-100 text-gray-700',
  gold: 'bg-amber-100 text-amber-700',
  platinum: 'bg-indigo-100 text-indigo-700',
  vip: 'bg-purple-100 text-purple-700',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  lead: 'bg-violet-100 text-violet-700',
  customer: 'bg-emerald-100 text-emerald-700',
};

const SalesManagerLeadAssignment = () => {
  const toast = useToast();

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [tlFilter, setTlFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(200);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTL, setBulkTL] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);

  // View (order) modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Single assign modal
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);
  const [assignModalTL, setAssignModalTL] = useState<number | ''>('');
  const [assigningSingle, setAssigningSingle] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(rowsPerPage),
      });
      if (search) params.set('search', search);
      if (assignmentStatus) params.set('assignmentStatus', assignmentStatus);
      if (tierFilter) params.set('tier', tierFilter);
      if (tlFilter) params.set('supervisor', tlFilter);
      if (lifecycleFilter) params.set('lifecycleStage', lifecycleFilter);
      if (productFilter) params.set('productName', productFilter);

      const res = await api.get(`/crm/sales-manager/unassigned-leads?${params}`);
      setLeads(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(pg);
      setSelected(new Set());
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, assignmentStatus, tierFilter, tlFilter, lifecycleFilter, productFilter, rowsPerPage, toast]);

  const fetchTeamLeaders = useCallback(async () => {
    try {
      const res = await api.get('/crm/sales-manager/team-leaders');
      setTeamLeaders(res.data || []);
    } catch {
      toast.error('Failed to load team leaders');
    }
  }, [toast]);

  useEffect(() => {
    fetchLeads(1);
    fetchTeamLeaders();
  }, [fetchLeads, fetchTeamLeaders]);

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
    if (selected.size === 0 || !bulkTL) {
      toast.error('Select at least one lead and a team leader');
      return;
    }
    setAssigning(true);
    try {
      await api.post('/crm/sales-manager/assign-leads', {
        customerIds: Array.from(selected),
        teamLeaderId: Number(bulkTL),
      });
      const tlName = teamLeaders.find(t => t.id === Number(bulkTL))?.name || '';
      toast.success(`${selected.size} lead(s) assigned to ${tlName}`);
      setBulkTL('');
      fetchLeads(page);
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleSingleAssign = async () => {
    if (!assignModalLead || !assignModalTL) return;
    setAssigningSingle(true);
    try {
      await api.post('/crm/sales-manager/assign-leads', {
        customerIds: [assignModalLead.id],
        teamLeaderId: Number(assignModalTL),
      });
      const tlName = teamLeaders.find(t => t.id === Number(assignModalTL))?.name || '';
      toast.success(`Assigned to ${tlName}`);
      setAssignModalLead(null);
      setAssignModalTL('');
      fetchLeads(page);
    } catch {
      toast.error('Assignment failed');
    } finally {
      setAssigningSingle(false);
    }
  };

  // Single unassign (sales manager level — removes supervisor assignment)
  const handleUnassign = async (lead: Lead) => {
    if (!confirm(`Unassign lead "${lead.name || ''} ${lead.lastName || ''}" from their team leader?`)) return;
    try {
      await api.post('/crm/sales-manager/unassign-leads', {
        customerIds: [lead.id],
      });
      toast.success('Lead unassigned successfully');
      fetchLeads(page);
    } catch {
      toast.error('Failed to unassign lead');
    }
  };

  // Bulk unassign
  const handleBulkUnassign = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Unassign ${selected.size} selected lead(s) from their team leaders?`)) return;
    setAssigning(true);
    try {
      const res = await api.post('/crm/sales-manager/unassign-leads', {
        customerIds: Array.from(selected),
      });
      const result = (res as any)?.data;
      toast.success(`Bulk unassign completed! ${result?.unassigned || selected.size} lead(s) unassigned.`);
      setSelected(new Set());
      fetchLeads(page);
    } catch {
      toast.error('Failed to bulk unassign leads');
    } finally {
      setAssigning(false);
    }
  };

  const supervisorName = (id: number | null) => {
    if (!id) return <span className="text-gray-400 text-xs">Unassigned</span>;
    const tl = teamLeaders.find(t => t.id === id);
    return <span className="text-xs text-indigo-700 font-medium">{tl?.name || `TL #${id}`}</span>;
  };

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
                ← Sales Manager
              </a>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Assignment</h1>
            <p className="text-gray-500 text-sm mt-0.5">Select leads and assign them to team leaders</p>
          </div>
          <div className="text-sm text-gray-500">
            {total.toLocaleString()} total leads
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            {/* Assignment Status */}
            <select
              value={assignmentStatus}
              onChange={e => setAssignmentStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All (Assigned &amp; Unassigned)</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>

            {/* Team Leader filter */}
            <select
              value={tlFilter}
              onChange={e => setTlFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Team Leaders</option>
              {teamLeaders.map(tl => (
                <option key={tl.id} value={tl.id}>{tl.name}</option>
              ))}
            </select>

            {/* Tier filter */}
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Tiers</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="vip">VIP</option>
            </select>

            {/* Lifecycle filter */}
            <select
              value={lifecycleFilter}
              onChange={e => setLifecycleFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Stages</option>
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
            </select>

            {/* Product search — Bengali + English */}
            <div className="xl:col-span-2">
              <ProductAutocomplete
                value={productFilter}
                onChange={val => setProductFilter(val)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
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
              value={bulkTL}
              onChange={e => setBulkTL(e.target.value ? Number(e.target.value) : '')}
              className="border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white min-w-[220px]"
            >
              <option value="">Select Team Leader…</option>
              {teamLeaders.map(tl => (
                <option key={tl.id} value={tl.id}>{tl.name}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={assigning || !bulkTL}
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
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leads.map(lead => (
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
                          <div className="text-xs text-gray-400">#{lead.id}</div>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 whitespace-nowrap">{lead.phone || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          {lead.tier ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[lead.tier] || 'bg-gray-100 text-gray-600'}`}>
                              {lead.tier}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">{supervisorName(lead.assigned_supervisor_id)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewOrder(lead.id)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                            >
                              <FaEye size={12} /> View
                            </button>
                            <button
                              onClick={() => { setAssignModalLead(lead); setAssignModalTL(''); }}
                              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                            >
                              {lead.assigned_supervisor_id ? 'Reassign' : 'Assign'}
                            </button>
                            {lead.assigned_supervisor_id && (
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
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-16 text-gray-400">
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
                {assignModalLead.assigned_supervisor_id ? 'Reassign Lead' : 'Assign Lead'}
              </h3>
              <button onClick={() => setAssignModalLead(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-lg p-3 mb-5">
                <div className="font-medium text-gray-900 text-sm">
                  {[assignModalLead.name, assignModalLead.lastName].filter(Boolean).join(' ')}
                </div>
                <div className="text-sm text-gray-500">{assignModalLead.phone}</div>
                {assignModalLead.assigned_supervisor_id && (
                  <div className="text-xs text-indigo-600 mt-1">
                    Currently: {teamLeaders.find(t => t.id === assignModalLead.assigned_supervisor_id)?.name || `TL #${assignModalLead.assigned_supervisor_id}`}
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">Select Team Leader</label>
              <select
                value={assignModalTL}
                onChange={e => setAssignModalTL(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 mb-5"
              >
                <option value="">— Choose Team Leader —</option>
                {teamLeaders.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
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
                  disabled={assigningSingle || !assignModalTL}
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
