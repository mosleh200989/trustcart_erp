import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient, { auth } from '@/services/api';
import { 
  FaPlus, FaSearch, FaFilter, FaTimes, FaPhone, FaCalendarAlt, 
  FaClock, FaCheckCircle, FaSpinner, FaEdit, FaTrash,
  FaChevronDown, FaFire, FaThermometerHalf, FaSnowflake, FaInfoCircle, FaEye,
  FaWhatsapp, FaSms, FaEnvelope
} from 'react-icons/fa';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';

interface FollowUp {
  id: number;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  priority: 'hot' | 'warm' | 'cold';
  call_reason: string;
  notes?: string;
  status: string;
  scheduled_time?: string;
  task_date?: string;
  created_at?: string;
  assigned_agent_id?: number;
}

interface Customer {
  id: number;
  name?: string;
  full_name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
}

type FilterPriority = '' | 'hot' | 'warm' | 'cold';
type FilterStatus = '' | 'pending' | 'in_progress' | 'completed' | 'failed';
type FilterDateRange = '' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'next_month' | 'overdue' | 'all';

export default function MyFollowupsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<FilterDateRange>('');
  const [specificDate, setSpecificDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Order Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Log Call Modal (unified call action - like Agent Dashboard)
  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [selectedFollowUpForLog, setSelectedFollowUpForLog] = useState<FollowUp | null>(null);
  const [logCallOutcome, setLogCallOutcome] = useState<'connected' | 'no_answer' | 'busy' | 'callback_requested' | 'not_interested' | 'order_placed' | ''>('');
  const [logCallNotes, setLogCallNotes] = useState('');
  const [logCallFollowUpDate, setLogCallFollowUpDate] = useState('');
  const [logCallFollowUpTime, setLogCallFollowUpTime] = useState('');
  const [savingLogCall, setSavingLogCall] = useState(false);
  
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    priority: 'warm' as 'hot' | 'warm' | 'cold',
    call_reason: 'Follow-up Call',
    notes: '',
    scheduled_time: '',
    task_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.getCurrentUser();
        const id = Number((me as any)?.id);
        if (!id) throw new Error('Unable to resolve agent id');
        setAgentId(id);
      } catch (err) {
        console.error('Failed to load current user', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!agentId) return;
    loadFollowUps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, dateRangeFilter, specificDate]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      // Load follow-up tasks assigned to the current agent
      const dateRangeParam = dateRangeFilter || 'all';
      let url = `/crm/automation/tasks/my-followups?dateRange=${dateRangeParam}`;
      if (specificDate) {
        url += `&specificDate=${specificDate}`;
      }
      const res = await apiClient.get(url);
      const tasks: FollowUp[] = Array.isArray(res.data) ? res.data : [];
      
      setFollowUps(tasks);
    } catch (error) {
      console.error('Failed to load follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  // View customer's latest order in modal
  const handleViewOrder = async (customerId: string) => {
    try {
      // Fetch customer's orders
      const res = await apiClient.get(`/order-management/customer/${customerId}/orders`);
      const orders = res.data || [];
      if (orders.length > 0) {
        // Open modal with the most recent order
        setSelectedOrderId(orders[0].id);
        setShowOrderModal(true);
      } else {
        toast.warning('No orders found for this customer');
      }
    } catch (err) {
      console.error('Failed to fetch customer orders:', err);
      toast.error('Failed to load customer orders');
    }
  };

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }
    
    try {
      setSearchingCustomers(true);
      const res = await apiClient.get(`/customers?search=${encodeURIComponent(query)}&limit=10`);
      const data = res.data;
      setCustomers(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to search customers:', error);
      setCustomers([]);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    searchCustomers(value);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id.toString(),
      customer_name: customer.full_name || customer.name || '',
      customer_phone: customer.mobile || customer.phone || '',
    });
    setCustomerSearch(customer.full_name || customer.name || '');
    setShowCustomerDropdown(false);
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.warning('Please select a customer');
      return;
    }
    
    try {
      setSaving(true);
      
      // Create a new task through the CRM automation API
      await apiClient.post('/crm/automation/tasks/generate', {
        customer_id: parseInt(formData.customer_id),
        priority: formData.priority,
        call_reason: formData.call_reason,
        notes: formData.notes,
        scheduled_time: formData.scheduled_time || null,
        task_date: formData.task_date,
      });
      
      toast.success('Follow-up added successfully!');
      setShowAddModal(false);
      resetForm();
      await loadFollowUps();
    } catch (error: any) {
      console.error('Failed to add follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFollowUp) return;
    
    try {
      setSaving(true);
      
      await apiClient.put(`/crm/automation/tasks/${selectedFollowUp.id}/status`, {
        status: formData.notes ? 'in_progress' : selectedFollowUp.status,
        notes: formData.notes,
      });
      
      toast.success('Follow-up updated successfully!');
      setShowEditModal(false);
      setSelectedFollowUp(null);
      await loadFollowUps();
    } catch (error: any) {
      console.error('Failed to update follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to update follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (followUp: FollowUp, newStatus: string) => {
    try {
      await apiClient.put(`/crm/automation/tasks/${followUp.id}/status`, { status: newStatus });
      await loadFollowUps();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      priority: 'warm',
      call_reason: 'Follow-up Call',
      notes: '',
      scheduled_time: '',
      task_date: new Date().toISOString().split('T')[0],
    });
    setCustomerSearch('');
    setCustomers([]);
  };

  const openEditModal = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setFormData({
      customer_id: followUp.customer_id,
      customer_name: followUp.customer_name || '',
      customer_phone: followUp.customer_phone || '',
      priority: followUp.priority,
      call_reason: followUp.call_reason,
      notes: followUp.notes || '',
      scheduled_time: followUp.scheduled_time || '',
      task_date: followUp.task_date || new Date().toISOString().split('T')[0],
    });
    setShowEditModal(true);
  };

  // Filter follow-ups
  const filteredFollowUps = followUps.filter(followUp => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        followUp.customer_name?.toLowerCase().includes(search) ||
        followUp.customer_phone?.toLowerCase().includes(search) ||
        followUp.customer_id?.toLowerCase().includes(search) ||
        followUp.call_reason?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    
    // Priority filter
    if (priorityFilter && followUp.priority !== priorityFilter) return false;
    
    // Status filter
    if (statusFilter && followUp.status !== statusFilter) return false;
    
    // Date range filter (client-side additional filtering)
    if (dateRangeFilter && dateRangeFilter !== 'all') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const taskDate = followUp.task_date ? new Date(followUp.task_date) : new Date(followUp.created_at || '');
      taskDate.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - now.getDay()));
      
      const startOfNextWeek = new Date(endOfWeek);
      startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);
      
      switch (dateRangeFilter) {
        case 'today':
          if (taskDate.getTime() !== now.getTime()) return false;
          break;
        case 'tomorrow':
          if (taskDate.getTime() !== tomorrow.getTime()) return false;
          break;
        case 'this_week':
          if (taskDate < now || taskDate > endOfWeek) return false;
          break;
        case 'next_week':
          if (taskDate < startOfNextWeek || taskDate > endOfNextWeek) return false;
          break;
        case 'overdue':
          if (taskDate >= now) return false;
          break;
      }
    }
    
    // Specific date filter
    if (specificDate) {
      const taskDate = followUp.task_date ? new Date(followUp.task_date) : null;
      if (!taskDate) return false;
      const filterDate = new Date(specificDate);
      if (taskDate.toDateString() !== filterDate.toDateString()) return false;
    }
    
    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
    setDateRangeFilter('');
    setSpecificDate('');
  };

  const hasActiveFilters = searchTerm || priorityFilter || statusFilter || dateRangeFilter || specificDate;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'hot': return <FaFire className="text-red-500" />;
      case 'warm': return <FaThermometerHalf className="text-orange-500" />;
      case 'cold': return <FaSnowflake className="text-blue-500" />;
      default: return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // Open Log Call Modal
  const openLogCallModal = (followUp: FollowUp) => {
    setSelectedFollowUpForLog(followUp);
    setLogCallOutcome('');
    setLogCallNotes('');
    setLogCallFollowUpDate('');
    setLogCallFollowUpTime('');
    setShowLogCallModal(true);
  };

  // Handle Log Call submission (similar to Agent Dashboard)
  const handleSubmitLogCall = async () => {
    if (!selectedFollowUpForLog) return;

    // Validate required fields
    if (!logCallNotes.trim()) {
      toast.warning('Please enter call notes');
      return;
    }
    if (!logCallOutcome) {
      toast.warning('Please select a call outcome');
      return;
    }

    setSavingLogCall(true);
    try {
      const customerId = selectedFollowUpForLog.customer_id;

      // 1. Mark as called
      await apiClient.post(`/crm/automation/customer/${customerId}/mark-called`, {
        notes: logCallNotes
      });

      // 2. Save notes to customer
      await apiClient.put(`/customers/${customerId}`, {
        notes: logCallNotes,
        last_contact_date: new Date().toISOString()
      });

      // 3. Create engagement record with outcome
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(customerId),
        engagement_type: 'call',
        status: 'completed',
        message_content: logCallNotes,
        metadata: {
          outcome: logCallOutcome,
          notes: logCallNotes,
          follow_up_scheduled: !!logCallFollowUpDate,
          original_task_id: selectedFollowUpForLog.id
        }
      });

      // 4. Update lead status based on outcome
      const leadStatus = logCallOutcome === 'order_placed' ? 'converted'
        : logCallOutcome === 'connected' ? 'qualified'
        : logCallOutcome === 'callback_requested' ? 'follow_up'
        : logCallOutcome === 'not_interested' ? 'not_interested'
        : logCallOutcome === 'no_answer' || logCallOutcome === 'busy' ? 'no_answer'
        : 'contacted';

      await apiClient.put(`/customers/${customerId}`, {
        leadStatus: leadStatus
      });

      // 5. Update current task status to completed
      const taskStatus = logCallOutcome === 'no_answer' || logCallOutcome === 'busy' ? 'failed' : 'completed';
      await apiClient.put(`/crm/automation/tasks/${selectedFollowUpForLog.id}/status`, {
        status: taskStatus,
        notes: logCallNotes
      });

      // 6. If follow-up date is set, create a new follow-up task
      if (logCallFollowUpDate) {
        const followUpDateTime = logCallFollowUpTime
          ? `${logCallFollowUpDate}T${logCallFollowUpTime}:00`
          : `${logCallFollowUpDate}T09:00:00`;

        await apiClient.post('/crm/automation/tasks', {
          customer_id: String(customerId),
          priority: selectedFollowUpForLog.priority || 'warm',
          call_reason: 'Follow-up Call',
          notes: `Follow-up from call on ${new Date().toLocaleDateString()}. Previous outcome: ${logCallOutcome}`,
          scheduled_time: logCallFollowUpTime || '09:00',
          task_date: logCallFollowUpDate
        });

        await apiClient.put(`/customers/${customerId}`, {
          next_follow_up: followUpDateTime
        });
      }

      toast.success('Call logged successfully!');
      setShowLogCallModal(false);
      setSelectedFollowUpForLog(null);
      await loadFollowUps();
    } catch (error: any) {
      console.error('Failed to save call action:', error);
      toast.error(error?.response?.data?.message || 'Failed to log call');
    } finally {
      setSavingLogCall(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Follow-ups</h1>
            <p className="text-gray-600 mt-1">Manage your customer follow-up calls and reminders</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add Follow-up
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by customer name, phone, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter />
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">🌡️ Warm</option>
                  <option value="cold">❄️ Cold</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => {
                    setDateRangeFilter(e.target.value as FilterDateRange);
                    if (e.target.value) setSpecificDate('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                  <option value="this_month">This Month</option>
                  <option value="next_month">Next Month</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              
              {/* Specific Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specific Date</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    if (e.target.value) setDateRangeFilter('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className={`w-full px-4 py-2 rounded-lg transition-all ${
                    hasActiveFilters
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <FaTimes className="inline mr-2" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaPhone className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Follow-ups</p>
                <p className="text-2xl font-bold text-gray-800">{filteredFollowUps.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaClock className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredFollowUps.filter(f => f.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaSpinner className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredFollowUps.filter(f => f.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <FaCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-800">
                  {filteredFollowUps.filter(f => f.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-ups List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="text-center py-12">
              <FaPhone className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500">No follow-ups found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add your first follow-up
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFollowUps.map((followUp) => {
                    const rawPhone = String(followUp.customer_phone || '').trim();
                    const waPhone = rawPhone.replace(/[^0-9]/g, '');
                    const email = String(followUp.customer_email || '').trim();

                    return (
                      <tr key={followUp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{followUp.customer_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">ID: {followUp.customer_id}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{rawPhone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            followUp.priority === 'hot' ? 'bg-red-100 text-red-700' :
                            followUp.priority === 'warm' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {followUp.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800">{followUp.call_reason}</div>
                          {followUp.notes && (
                            <div className="text-xs text-gray-500 truncate max-w-[150px]" title={followUp.notes}>{followUp.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-800">{formatDate(followUp.task_date || followUp.scheduled_time)}</div>
                          {followUp.scheduled_time && (
                            <div className="text-xs text-gray-500">{formatTime(followUp.scheduled_time)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={followUp.status}
                            onChange={(e) => handleStatusChange(followUp, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadge(followUp.status)} border-0 cursor-pointer`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              onClick={() => handleViewOrder(followUp.customer_id)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                              View
                            </button>

                            <a
                              href={rawPhone ? `tel:${rawPhone}` : undefined}
                              aria-disabled={!rawPhone}
                              title={rawPhone ? 'Call' : 'No phone'}
                              className={`p-1.5 rounded border ${rawPhone ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                              onClick={(e) => { if (!rawPhone) e.preventDefault(); }}
                            >
                              <FaPhone size={12} />
                            </a>

                            <a
                              href={waPhone ? `https://wa.me/${waPhone}` : undefined}
                              target="_blank"
                              rel="noreferrer"
                              aria-disabled={!waPhone}
                              title={waPhone ? 'WhatsApp' : 'No phone'}
                              className={`p-1.5 rounded border ${waPhone ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                              onClick={(e) => { if (!waPhone) e.preventDefault(); }}
                            >
                              <FaWhatsapp size={12} />
                            </a>

                            <a
                              href={rawPhone ? `sms:${rawPhone}` : undefined}
                              aria-disabled={!rawPhone}
                              title={rawPhone ? 'SMS' : 'No phone'}
                              className={`p-1.5 rounded border ${rawPhone ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                              onClick={(e) => { if (!rawPhone) e.preventDefault(); }}
                            >
                              <FaSms size={12} />
                            </a>

                            <a
                              href={email ? `mailto:${email}` : undefined}
                              aria-disabled={!email}
                              title={email ? 'Email' : 'No email'}
                              className={`p-1.5 rounded border ${email ? 'border-purple-200 text-purple-700 hover:bg-purple-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                              onClick={(e) => { if (!email) e.preventDefault(); }}
                            >
                              <FaEnvelope size={12} />
                            </a>

                            {/* Log Call Button - Opens unified modal with outcome, notes, and optional follow-up */}
                            <button
                              type="button"
                              onClick={() => openLogCallModal(followUp)}
                              title="Log Call"
                              className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 text-xs font-medium"
                            >
                              <FaPhone size={10} /> Log Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Add New Follow-up</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddFollowUp} className="p-6 space-y-4">
              {/* Customer Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={handleCustomerSearchChange}
                    onFocus={() => customers.length > 0 && setShowCustomerDropdown(true)}
                    placeholder="Search customer by name or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchingCustomers ? (
                      <div className="p-3 text-center text-gray-500">
                        <FaSpinner className="animate-spin inline mr-2" />
                        Searching...
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors"
                        >
                          <p className="font-medium text-gray-800">{customer.full_name || customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.mobile || customer.phone || customer.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {formData.customer_id && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ Selected: {formData.customer_name} ({formData.customer_phone})
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hot">🔥 Hot - Urgent</option>
                  <option value="warm">🌡️ Warm - Normal</option>
                  <option value="cold">❄️ Cold - Low Priority</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={formData.call_reason}
                  onChange={(e) => setFormData({ ...formData, call_reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Follow-up Call">Follow-up Call</option>
                  <option value="Reminder Call">Reminder Call</option>
                  <option value="Callback Request">Callback Request</option>
                  <option value="Order Follow-up">Order Follow-up</option>
                  <option value="Payment Follow-up">Payment Follow-up</option>
                  <option value="Feedback Call">Feedback Call</option>
                  <option value="Product Inquiry">Product Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Schedule Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.task_date}
                    onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                  <input
                    type="time"
                    value={formData.scheduled_time ? formData.scheduled_time.split('T')[1]?.substring(0, 5) : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      scheduled_time: e.target.value ? `${formData.task_date}T${e.target.value}:00` : ''
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes about this follow-up..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.customer_id}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Add Follow-up'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Follow-up Modal */}
      {showEditModal && selectedFollowUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Edit Follow-up</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFollowUp(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateFollowUp} className="p-6 space-y-4">
              {/* Customer Info (Read-only) */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium text-gray-800">{selectedFollowUp.customer_name}</p>
                <p className="text-sm text-gray-500">{selectedFollowUp.customer_phone}</p>
              </div>

              {/* Current Status */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Status</p>
                    <p className="font-medium capitalize">{selectedFollowUp.status.replace('_', ' ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(selectedFollowUp.priority)}
                    <span className="capitalize">{selectedFollowUp.priority}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Add notes about this follow-up call..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFollowUp(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Update Follow-up'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          onUpdate={loadFollowUps}
        />
      )}

      {/* Log Call Modal (Unified Call Action - like Agent Dashboard) */}
      {showLogCallModal && selectedFollowUpForLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FaPhone className="text-green-600" />
              Log Call
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Customer: <strong>{selectedFollowUpForLog.customer_name || `Customer #${selectedFollowUpForLog.customer_id}`}</strong>
              {selectedFollowUpForLog.customer_phone && <span className="ml-2 text-gray-500">({selectedFollowUpForLog.customer_phone})</span>}
            </p>
            
            <div className="space-y-4">
              {/* Call Outcome - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Outcome <span className="text-red-500">*</span>
                </label>
                <select
                  value={logCallOutcome}
                  onChange={(e) => setLogCallOutcome(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select outcome...</option>
                  <option value="connected">Connected - Spoke with customer</option>
                  <option value="order_placed">Order Placed</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy / Line Engaged</option>
                  <option value="not_interested">Not Interested</option>
                </select>
              </div>

              {/* Call Notes - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Call Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={logCallNotes}
                  onChange={(e) => setLogCallNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Describe the conversation, customer feedback, interests, concerns..."
                  required
                />
              </div>

              {/* Schedule Follow-up - Optional */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-500" />
                  Schedule Next Follow-up <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={logCallFollowUpDate}
                      onChange={(e) => setLogCallFollowUpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Date"
                    />
                  </div>
                  <div>
                    <input
                      type="time"
                      value={logCallFollowUpTime}
                      onChange={(e) => setLogCallFollowUpTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Time"
                    />
                  </div>
                </div>
                {logCallFollowUpDate && (
                  <p className="text-xs text-blue-600 mt-1">
                    A new follow-up task will be created for {logCallFollowUpDate}
                    {logCallFollowUpTime && ` at ${logCallFollowUpTime}`}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitLogCall}
                disabled={savingLogCall || !logCallNotes.trim() || !logCallOutcome}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingLogCall ? 'Saving...' : <><FaCheckCircle /> Save Call Log</>}
              </button>
              <button
                onClick={() => {
                  setShowLogCallModal(false);
                  setSelectedFollowUpForLog(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
