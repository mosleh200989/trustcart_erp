import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl } from '@/config/backend';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FaPhone, FaFire, FaCheckCircle, FaClock, FaList, FaCalendarDay, 
  FaUserClock, FaPlay, FaSearch, FaFilter, FaTimes, FaInfoCircle,
  FaThermometerHalf, FaSnowflake, FaRedo, FaChevronDown, FaChevronUp,
  FaTasks, FaUserPlus, FaExclamationTriangle, FaEdit, FaEye, FaShoppingCart,
  FaStickyNote, FaCalendarAlt, FaCheckDouble, FaThumbsUp, FaThumbsDown
} from 'react-icons/fa';
import Link from 'next/link';
import { format } from 'date-fns';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import apiClient from '@/services/api';

// CRM Task interface
interface CrmTask {
  id: number;
  title: string;
  description?: string;
  customer?: { id: number; name: string };
  assignee?: { id: number; name: string };
  assigner?: { id: number; name: string };
  dueDate?: string;
  dueTime?: string;
  priority: string;
  category?: string;
  status: string;
  assignedTo?: number;
  assignedBy?: number;
}

// Lead interface
interface Lead {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  leadStatus?: string;
  assignedAt?: string;
  assigned_at?: string;
  assignedTo?: number;
  assigned_to?: number;
  createdAt?: string;
  created_at?: string;
  lastOrderDate?: string;
  totalOrders?: number;
  total_orders?: number;
  totalSpent?: number;
  total_spent?: number;
}

interface Stats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalLeads: number;
  newLeadsToday: number;
}

type FilterPriority = '' | 'low' | 'medium' | 'high' | 'urgent';
type FilterStatus = '' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
type FilterCalledStatus = '' | 'called' | 'not_called';
type FilterOutcome = '' | 'positive' | 'negative' | 'neutral' | 'no_answer';

export default function TodayTasklistPage() {
  const toast = useToast();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>([]);
  const [allTasks, setAllTasks] = useState<CrmTask[]>([]);
  const [todayLeads, setTodayLeads] = useState<Lead[]>([]);
  
  // Order Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [calledFilter, setCalledFilter] = useState<FilterCalledStatus>('');
  const [outcomeFilter, setOutcomeFilter] = useState<FilterOutcome>('');
  const [showFilters, setShowFilters] = useState(false);

  // Action Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  
  // Form data for modals
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState<'positive' | 'negative' | 'neutral' | 'no_answer' | ''>('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  
  // Action loading states
  const [markingAsCalled, setMarkingAsCalled] = useState<number | null>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingOutcome, setSavingOutcome] = useState(false);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    crmTasks: true,
    leadsToday: true,
    overdue: true,
  });

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalLeads: 0,
    newLeadsToday: 0,
  });

  useEffect(() => {
    if (authUser?.id) {
      loadTodayData();
    }
  }, [authUser?.id]);

  const loadTodayData = async () => {
    if (!authUser?.id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all tasks and leads in parallel
      const [todayTasksRes, allTasksRes, leadsRes] = await Promise.all([
        // Tasks assigned to me, due today
        fetch(apiUrl(`/crm/tasks?assignedTo=${authUser.id}&dueToday=true`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // All tasks assigned to me
        fetch(apiUrl(`/crm/tasks?assignedTo=${authUser.id}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Leads/customers assigned to me
        fetch(apiUrl(`/customers?assigned_to=${authUser.id}&limit=100`), {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      // Process today's CRM Tasks
      if (todayTasksRes.ok) {
        const tasksData = await todayTasksRes.json();
        setCrmTasks(Array.isArray(tasksData) ? tasksData : []);
      }

      // Process all tasks for overdue calculation
      let allTasksList: CrmTask[] = [];
      if (allTasksRes.ok) {
        const allData = await allTasksRes.json();
        allTasksList = Array.isArray(allData) ? allData : [];
        setAllTasks(allTasksList);
        
        // Calculate stats
        const pendingCount = allTasksList.filter(t => t.status === 'pending').length;
        const completedCount = allTasksList.filter(t => t.status === 'completed').length;
        const overdueCount = allTasksList.filter(task => {
          if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(23, 59, 59, 999);
          return dueDate < new Date();
        }).length;
        
        setStats(prev => ({
          ...prev,
          totalTasks: allTasksList.length,
          pendingTasks: pendingCount,
          completedTasks: completedCount,
          overdueTasks: overdueCount,
        }));
      }

      // Process Leads assigned today
      if (leadsRes?.ok) {
        const leadsData = await leadsRes.json();
        const allLeads: Lead[] = Array.isArray(leadsData) ? leadsData : (leadsData.data || leadsData.customers || []);
        
        // Filter leads assigned today
        const todayAssigned = allLeads.filter((lead: Lead) => {
          const assignedDate = (lead.assignedAt || lead.assigned_at || '').split('T')[0];
          return assignedDate === today;
        });
        
        setTodayLeads(todayAssigned);
        setStats(prev => ({
          ...prev,
          totalLeads: allLeads.length,
          newLeadsToday: todayAssigned.length,
        }));
      }

    } catch (error) {
      console.error('Failed to load today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(apiUrl(`/crm/tasks/${taskId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      await loadTodayData();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter CRM tasks
  const filteredCrmTasks = useMemo(() => {
    return crmTasks.filter(task => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title?.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search) ||
          task.customer?.name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      return true;
    });
  }, [crmTasks, searchTerm, priorityFilter, statusFilter]);

  // Get overdue tasks from all tasks
  const overdueTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(23, 59, 59, 999);
      return dueDate < new Date();
    });
  }, [allTasks]);

  // View customer's latest order in modal
  const handleViewOrder = async (customerId: number) => {
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

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
    setCalledFilter('');
    setOutcomeFilter('');
  };

  const hasActiveFilters = searchTerm || priorityFilter || statusFilter || calledFilter || outcomeFilter;

  // ==================== LEAD ACTION HANDLERS ====================

  const handleMarkAsCalled = async (lead: Lead) => {
    setMarkingAsCalled(lead.id);
    try {
      await apiClient.post(`/crm/automation/customer/${lead.id}/mark-called`, {
        notes: 'Marked as called from Today Tasklist'
      });
      toast.success('Customer marked as called today!');
      await loadTodayData();
    } catch (error) {
      console.error('Failed to mark as called:', error);
      toast.error('Failed to mark customer as called');
    } finally {
      setMarkingAsCalled(null);
    }
  };

  const openFollowUpModal = (lead: Lead) => {
    setSelectedLead(lead);
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpNotes('');
    setShowFollowUpModal(true);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedLead || !followUpDate) {
      toast.warning('Please select a follow-up date');
      return;
    }
    
    setSavingFollowUp(true);
    try {
      // Combine date and time
      const followUpDateTime = followUpTime 
        ? `${followUpDate}T${followUpTime}:00` 
        : `${followUpDate}T09:00:00`;
      
      await apiClient.put(`/customers/${selectedLead.id}`, {
        next_follow_up: followUpDateTime
      });
      
      // Also track engagement
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLead.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: `Follow-up scheduled for ${followUpDate}${followUpTime ? ' at ' + followUpTime : ''}. ${followUpNotes}`,
        metadata: { follow_up_date: followUpDateTime, notes: followUpNotes }
      });
      
      toast.success('Follow-up scheduled successfully!');
      setShowFollowUpModal(false);
      setSelectedLead(null);
      await loadTodayData();
    } catch (error) {
      console.error('Failed to save follow-up:', error);
      toast.error('Failed to schedule follow-up');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const openNotesModal = (lead: Lead) => {
    setSelectedLead(lead);
    setCallNotes('');
    setShowNotesModal(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedLead || !callNotes.trim()) {
      toast.warning('Please enter some notes');
      return;
    }
    
    setSavingNotes(true);
    try {
      // Track engagement with notes
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLead.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: callNotes,
        metadata: { type: 'call_notes', notes: callNotes }
      });
      
      toast.success('Notes saved successfully!');
      setShowNotesModal(false);
      setSelectedLead(null);
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const openOutcomeModal = (lead: Lead) => {
    setSelectedLead(lead);
    setCallOutcome('');
    setOutcomeNotes('');
    setShowOutcomeModal(true);
  };

  const handleSaveOutcome = async () => {
    if (!selectedLead || !callOutcome) {
      toast.warning('Please select an outcome');
      return;
    }
    
    setSavingOutcome(true);
    try {
      // Update customer with outcome info
      const leadStatus = callOutcome === 'positive' ? 'qualified' 
        : callOutcome === 'negative' ? 'not_interested' 
        : callOutcome === 'no_answer' ? 'no_answer'
        : 'contacted';
      
      await apiClient.put(`/customers/${selectedLead.id}`, {
        leadStatus: leadStatus,
        last_contact_date: new Date().toISOString()
      });
      
      // Track engagement with outcome
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLead.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: `Call outcome: ${callOutcome}. ${outcomeNotes}`,
        metadata: { outcome: callOutcome, notes: outcomeNotes }
      });
      
      toast.success('Outcome saved successfully!');
      setShowOutcomeModal(false);
      setSelectedLead(null);
      await loadTodayData();
    } catch (error) {
      console.error('Failed to save outcome:', error);
      toast.error('Failed to save outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <FaFire className="text-red-500" />;
      case 'high': return <FaExclamationTriangle className="text-orange-500" />;
      case 'medium': return <FaThermometerHalf className="text-yellow-500" />;
      case 'low': return <FaSnowflake className="text-green-500" />;
      default: return <FaThermometerHalf className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // CRM Task Card Component
  const CrmTaskCard = ({ task, isOverdue = false }: { task: CrmTask; isOverdue?: boolean }) => (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getPriorityIcon(task.priority)}
            <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityBadge(task.priority)}`}>
              {task.priority?.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(task.status)}`}>
              {task.status?.replace('_', ' ').toUpperCase()}
            </span>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white">
                OVERDUE
              </span>
            )}
          </div>
          
          <div className="font-medium text-gray-900">{task.title}</div>
          
          {task.description && (
            <div className="text-sm text-gray-600 mt-1">{task.description}</div>
          )}
          
          {task.customer && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Customer:</span> {task.customer.name}
            </div>
          )}
          
          {task.assigner && (
            <div className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Assigned by:</span> {task.assigner.name}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <FaClock size={12} />
                Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                {task.dueTime && ` at ${task.dueTime}`}
              </span>
            )}
            {task.category && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{task.category}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {task.status === 'pending' && (
            <button
              onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <FaPlay size={10} /> Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
            >
              <FaCheckCircle size={10} /> Complete
            </button>
          )}
          <Link
            href={`/admin/crm/tasks?edit=${task.id}`}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 flex items-center gap-1"
          >
            <FaEdit size={10} /> Edit
          </Link>
        </div>
      </div>
    </div>
  );

  // Lead Card Component
  const LeadCard = ({ lead }: { lead: Lead }) => (
    <div className="bg-green-50 border rounded-lg p-4 hover:shadow-md transition-shadow border-green-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <FaUserPlus className="text-green-500" />
            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
              NEW LEAD ASSIGNED TODAY
            </span>
            {lead.leadStatus && (
              <span className={`px-2 py-0.5 text-xs rounded ${
                lead.leadStatus === 'qualified' || lead.leadStatus === 'positive' ? 'bg-green-100 text-green-800' :
                lead.leadStatus === 'not_interested' || lead.leadStatus === 'negative' ? 'bg-red-100 text-red-800' :
                lead.leadStatus === 'no_answer' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {(lead.leadStatus || '').toUpperCase().replace('_', ' ')}
              </span>
            )}
          </div>
          
          <div className="font-medium text-gray-900">
            {lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || `Customer #${lead.id}`}
          </div>
          
          {lead.phone && (
            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <FaPhone className="text-gray-400" size={12} />
              <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
            </div>
          )}
          
          {lead.email && (
            <div className="text-sm text-gray-600 mt-1">{lead.email}</div>
          )}
          
          {(lead.assignedAt || lead.assigned_at) && (
            <div className="text-sm text-gray-500 mt-2">
              Assigned: {format(new Date(lead.assignedAt || lead.assigned_at || ''), 'MMM dd, yyyy h:mm a')}
            </div>
          )}
          
          {((lead.totalOrders ?? lead.total_orders) !== undefined || (lead.totalSpent ?? lead.total_spent) !== undefined) && (
            <div className="flex gap-4 mt-2 text-sm">
              {(lead.totalOrders ?? lead.total_orders) !== undefined && (
                <span className="text-gray-600">Orders: {lead.totalOrders ?? lead.total_orders}</span>
              )}
              {(lead.totalSpent ?? lead.total_spent) !== undefined && (
                <span className="text-gray-600">Spent: ৳{(lead.totalSpent ?? lead.total_spent)?.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons Column */}
        <div className="flex flex-col gap-2 ml-4">
          {/* Row 1: Call & View Order */}
          <div className="flex gap-2">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
              >
                <FaPhone size={10} /> Call
              </a>
            )}
            {((lead.totalOrders ?? lead.total_orders) ?? 0) > 0 && (
              <button
                onClick={() => handleViewOrder(lead.id)}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center gap-1"
              >
                <FaShoppingCart size={10} /> Order
              </button>
            )}
          </div>
          
          {/* Row 2: Mark Called & Set Follow-up */}
          <div className="flex gap-2">
            <button
              onClick={() => handleMarkAsCalled(lead)}
              disabled={markingAsCalled === lead.id}
              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1 disabled:opacity-50"
            >
              {markingAsCalled === lead.id ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <FaCheckDouble size={10} />
              )}
              Called
            </button>
            <button
              onClick={() => openFollowUpModal(lead)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <FaCalendarAlt size={10} /> Follow-up
            </button>
          </div>
          
          {/* Row 3: Notes & Outcome */}
          <div className="flex gap-2">
            <button
              onClick={() => openNotesModal(lead)}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
            >
              <FaStickyNote size={10} /> Notes
            </button>
            <button
              onClick={() => openOutcomeModal(lead)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-1"
            >
              <FaThumbsUp size={10} /> Outcome
            </button>
          </div>
          
          {/* Row 4: View Details */}
          <button
            onClick={() => handleViewOrder(lead.id)}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 flex items-center gap-1 justify-center"
          >
            <FaEye size={10} /> View Details
          </button>
        </div>
      </div>
    </div>
  );

  // Section Component
  const TaskSection = ({ 
    title, 
    icon, 
    count,
    sectionKey,
    children,
    emptyMessage,
    badgeColor = 'bg-gray-100 text-gray-600'
  }: { 
    title: string; 
    icon: React.ReactNode; 
    count: number;
    sectionKey: keyof typeof expandedSections;
    children: React.ReactNode;
    emptyMessage: string;
    badgeColor?: string;
  }) => (
    <div className="bg-white rounded-lg shadow">
      <div 
        className="px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${badgeColor}`}>
            {count}
          </span>
        </div>
        {expandedSections[sectionKey] ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      
      {expandedSections[sectionKey] && (
        <div className="p-4">
          {count === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaInfoCircle className="mx-auto mb-2" size={24} />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FaCalendarDay className="text-blue-600" />
              Today's Tasklist
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded text-sm flex items-center gap-2 ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-50'}`}
            >
              <FaFilter />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
            <button
              onClick={loadTodayData}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              <FaRedo className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/admin/telephony/all-tasks"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              All Tasks
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Tasks Due Today</div>
            <div className="text-2xl font-bold text-blue-600">{crmTasks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {crmTasks.filter(t => t.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {crmTasks.filter(t => t.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {crmTasks.filter(t => t.status === 'completed').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <FaExclamationTriangle className="text-red-500" /> Overdue
            </div>
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <FaUserPlus className="text-green-500" /> New Leads
            </div>
            <div className="text-2xl font-bold text-green-600">{todayLeads.length}</div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-600 mb-1">Search</label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Task title, description, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              
              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">🔥 Urgent</option>
                  <option value="high">⚠️ High</option>
                  <option value="medium">📊 Medium</option>
                  <option value="low">❄️ Low</option>
                </select>
              </div>
              
              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Called Status</label>
                <select
                  value={calledFilter}
                  onChange={(e) => setCalledFilter(e.target.value as FilterCalledStatus)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All</option>
                  <option value="called">✅ Called</option>
                  <option value="not_called">❌ Not Called</option>
                </select>
              </div>

              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Outcome</label>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as FilterOutcome)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Outcomes</option>
                  <option value="positive">👍 Positive</option>
                  <option value="negative">👎 Negative</option>
                  <option value="neutral">➖ Neutral</option>
                  <option value="no_answer">📵 No Answer</option>
                </select>
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                >
                  <FaTimes /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task Sections */}
        <div className="space-y-6">
          {/* Overdue Tasks - Show first if any */}
          {overdueTasks.length > 0 && (
            <TaskSection
              title="⚠️ Overdue Tasks"
              icon={<FaExclamationTriangle className="text-red-600" />}
              count={overdueTasks.length}
              sectionKey="overdue"
              emptyMessage="No overdue tasks!"
              badgeColor="bg-red-100 text-red-800"
            >
              {overdueTasks.map(task => (
                <CrmTaskCard key={task.id} task={task} isOverdue={true} />
              ))}
            </TaskSection>
          )}

          {/* Today's CRM Tasks */}
          <TaskSection
            title="Tasks Due Today"
            icon={<FaTasks className="text-blue-600" />}
            count={filteredCrmTasks.length}
            sectionKey="crmTasks"
            emptyMessage="No tasks due today. Great job!"
            badgeColor="bg-blue-100 text-blue-800"
          >
            {filteredCrmTasks.map(task => (
              <CrmTaskCard key={task.id} task={task} />
            ))}
          </TaskSection>
          
          {/* Leads Assigned Today */}
          <TaskSection
            title="Leads Assigned Today"
            icon={<FaUserPlus className="text-green-600" />}
            count={todayLeads.length}
            sectionKey="leadsToday"
            emptyMessage="No new leads assigned today."
            badgeColor="bg-green-100 text-green-800"
          >
            {todayLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </TaskSection>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/telephony/all-tasks"
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <FaList /> View All Tasks
            </Link>
            <Link
              href="/admin/crm/tasks"
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              CRM Tasks
            </Link>
            <Link
              href="/admin/crm/customers"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              View Customers
            </Link>
            <Link
              href="/admin/telephony/calls"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Call Logs
            </Link>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          onUpdate={() => {}}
        />
      )}

      {/* Follow-Up Modal */}
      {showFollowUpModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FaCalendarAlt className="text-blue-600" />
              Schedule Follow-up
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a follow-up date for: <strong>{selectedLead.name || `Customer #${selectedLead.id}`}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date *</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Any notes for the follow-up..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveFollowUp}
                disabled={savingFollowUp || !followUpDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingFollowUp ? 'Saving...' : <>
                  <FaCalendarAlt /> Schedule Follow-up
                </>}
              </button>
              <button
                onClick={() => {
                  setShowFollowUpModal(false);
                  setSelectedLead(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FaStickyNote className="text-gray-600" />
              Add Call Notes
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add notes for: <strong>{selectedLead.name || `Customer #${selectedLead.id}`}</strong>
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Call Notes *</label>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Summarize the call... What was discussed? Any key points?"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes || !callNotes.trim()}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNotes ? 'Saving...' : <>
                  <FaStickyNote /> Save Notes
                </>}
              </button>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedLead(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Modal */}
      {showOutcomeModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FaThumbsUp className="text-indigo-600" />
              Set Call Outcome
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set outcome for: <strong>{selectedLead.name || `Customer #${selectedLead.id}`}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCallOutcome('positive')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      callOutcome === 'positive' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <FaThumbsUp className="text-xl text-green-600" />
                    <span className="text-sm font-medium">Positive</span>
                    <span className="text-xs text-gray-500">Interested / Order</span>
                  </button>
                  
                  <button
                    onClick={() => setCallOutcome('negative')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      callOutcome === 'negative' 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <FaThumbsDown className="text-xl text-red-600" />
                    <span className="text-sm font-medium">Negative</span>
                    <span className="text-xs text-gray-500">Not Interested</span>
                  </button>
                  
                  <button
                    onClick={() => setCallOutcome('neutral')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      callOutcome === 'neutral' 
                        ? 'border-gray-500 bg-gray-50 text-gray-700' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-xl">➖</span>
                    <span className="text-sm font-medium">Neutral</span>
                    <span className="text-xs text-gray-500">Undecided</span>
                  </button>
                  
                  <button
                    onClick={() => setCallOutcome('no_answer')}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      callOutcome === 'no_answer' 
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    <span className="text-xl">📵</span>
                    <span className="text-sm font-medium">No Answer</span>
                    <span className="text-xs text-gray-500">Didn't pick up</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Any additional details about the outcome..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveOutcome}
                disabled={savingOutcome || !callOutcome}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingOutcome ? 'Saving...' : <>
                  <FaCheckCircle /> Save Outcome
                </>}
              </button>
              <button
                onClick={() => {
                  setShowOutcomeModal(false);
                  setSelectedLead(null);
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
