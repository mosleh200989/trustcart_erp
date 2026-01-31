import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl } from '@/config/backend';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FaPhone, FaFire, FaCheckCircle, FaClock, FaList, FaCalendarDay, 
  FaPlay, FaSearch, FaFilter, FaTimes, FaInfoCircle,
  FaThermometerHalf, FaSnowflake, FaRedo, FaChevronDown, FaChevronUp,
  FaTasks, FaExclamationTriangle, FaEdit, FaCalendarAlt, FaSortAmountDown, FaShoppingCart, FaEye
} from 'react-icons/fa';
import Link from 'next/link';
import { format, isToday, isTomorrow, isPast, isThisWeek, addDays, startOfDay } from 'date-fns';
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
  tags?: string[];
  completedAt?: string;
  createdAt?: string;
  assignedTo?: number;
  assignedBy?: number;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

type FilterPriority = '' | 'low' | 'medium' | 'high' | 'urgent';
type FilterStatus = '' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
type FilterDue = '' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'upcoming' | 'no_date';
type SortBy = 'dueDate' | 'priority' | 'status' | 'createdAt';

export default function AllTasksPage() {
  const toast = useToast();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  
  // Order Details Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [dueFilter, setDueFilter] = useState<FilterDue>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Stats
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
  });

  // Categories from tasks
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tasks.forEach(t => t.category && cats.add(t.category));
    return Array.from(cats).sort();
  }, [tasks]);

  useEffect(() => {
    if (authUser?.id) {
      loadTasks();
    }
  }, [authUser?.id]);

  const loadTasks = async () => {
    if (!authUser?.id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Fetch all tasks assigned to current user
      const response = await fetch(apiUrl(`/crm/tasks?assignedTo=${authUser.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const taskList = Array.isArray(data) ? data : [];
        setTasks(taskList);
        
        // Calculate stats
        const now = new Date();
        const overdueCount = taskList.filter((t: CrmTask) => {
          if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(23, 59, 59, 999);
          return dueDate < now;
        }).length;
        
        setStats({
          total: taskList.length,
          pending: taskList.filter((t: CrmTask) => t.status === 'pending').length,
          inProgress: taskList.filter((t: CrmTask) => t.status === 'in_progress').length,
          completed: taskList.filter((t: CrmTask) => t.status === 'completed').length,
          cancelled: taskList.filter((t: CrmTask) => t.status === 'cancelled').length,
          overdue: overdueCount,
        });
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
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
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

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

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          task.title?.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search) ||
          task.customer?.name?.toLowerCase().includes(search) ||
          task.category?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) return false;
      
      // Status filter
      if (statusFilter && task.status !== statusFilter) return false;
      
      // Category filter
      if (categoryFilter && task.category !== categoryFilter) return false;
      
      // Due date filter
      if (dueFilter) {
        const now = new Date();
        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
        
        switch (dueFilter) {
          case 'overdue':
            if (!taskDue || task.status === 'completed' || task.status === 'cancelled') return false;
            taskDue.setHours(23, 59, 59, 999);
            if (taskDue >= now) return false;
            break;
          case 'today':
            if (!taskDue || !isToday(taskDue)) return false;
            break;
          case 'tomorrow':
            if (!taskDue || !isTomorrow(taskDue)) return false;
            break;
          case 'this_week':
            if (!taskDue || !isThisWeek(taskDue)) return false;
            break;
          case 'upcoming':
            if (!taskDue) return false;
            const weekFromNow = addDays(startOfDay(now), 7);
            if (taskDue < now || taskDue > weekFromNow) return false;
            break;
          case 'no_date':
            if (taskDue) return false;
            break;
        }
      }
      
      return true;
    });
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_VALUE;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_VALUE;
          comparison = dateA - dateB;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4);
          break;
        case 'status':
          const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };
          comparison = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
          break;
        case 'createdAt':
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = createdB - createdA;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [tasks, searchTerm, priorityFilter, statusFilter, categoryFilter, dueFilter, sortBy, sortOrder]);

  // Pagination
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(start, start + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
    setDueFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || priorityFilter || statusFilter || dueFilter || categoryFilter;

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

  const isTaskOverdue = (task: CrmTask) => {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') return false;
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < new Date();
  };

  const getDueDateLabel = (task: CrmTask) => {
    if (!task.dueDate) return null;
    const dueDate = new Date(task.dueDate);
    
    if (isTaskOverdue(task)) {
      return { text: 'Overdue', color: 'text-red-600 bg-red-50' };
    }
    if (isToday(dueDate)) {
      return { text: 'Due Today', color: 'text-blue-600 bg-blue-50' };
    }
    if (isTomorrow(dueDate)) {
      return { text: 'Due Tomorrow', color: 'text-orange-600 bg-orange-50' };
    }
    return null;
  };

  // Task Row Component
  const TaskRow = ({ task }: { task: CrmTask }) => {
    const isOverdue = isTaskOverdue(task);
    const dueLabel = getDueDateLabel(task);
    
    return (
      <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {getPriorityIcon(task.priority)}
              <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityBadge(task.priority)}`}>
                {task.priority?.toUpperCase()}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(task.status)}`}>
                {task.status?.replace('_', ' ').toUpperCase()}
              </span>
              {dueLabel && (
                <span className={`px-2 py-0.5 text-xs rounded font-medium ${dueLabel.color}`}>
                  {dueLabel.text}
                </span>
              )}
              {task.category && (
                <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-800">
                  {task.category}
                </span>
              )}
            </div>
            
            <div className="font-medium text-gray-900 truncate">{task.title}</div>
            
            {task.description && (
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</div>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              {task.customer && (
                <span>Customer: <span className="text-gray-700">{task.customer.name}</span></span>
              )}
              {task.assigner && (
                <span>From: <span className="text-gray-700">{task.assigner.name}</span></span>
              )}
              {task.dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  <FaClock size={12} />
                  {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                  {task.dueTime && ` at ${task.dueTime}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.customer && (
              <button
                onClick={() => handleViewOrder(task.customer!.id)}
                className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center gap-1"
                title="View Order"
              >
                <FaShoppingCart size={10} /> Order
              </button>
            )}
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
                <FaCheckCircle size={10} /> Done
              </button>
            )}
            <Link
              href={`/admin/crm/tasks?edit=${task.id}`}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 flex items-center gap-1"
            >
              <FaEdit size={10} />
            </Link>
          </div>
        </div>
      </div>
    );
  };

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
              <FaTasks className="text-blue-600" />
              All Tasks
            </h1>
            <p className="text-gray-600 mt-1">
              Manage all your assigned tasks
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
              onClick={loadTasks}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              <FaRedo className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/admin/telephony/today-tasklist"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Today's Tasks
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-blue-300 ${!statusFilter ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-yellow-300 ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-blue-300 ${statusFilter === 'in_progress' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => { setStatusFilter('in_progress'); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-green-300 ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => { setStatusFilter('completed'); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-red-300 ${dueFilter === 'overdue' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => { setDueFilter('overdue'); setStatusFilter(''); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <FaExclamationTriangle className="text-red-500" /> Overdue
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </div>
          <div 
            className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:ring-2 hover:ring-blue-300 ${dueFilter === 'today' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => { setDueFilter('today'); setStatusFilter(''); setCurrentPage(1); }}
          >
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <FaCalendarDay className="text-blue-500" /> Due Today
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate))).length}
            </div>
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
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              
              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value as FilterPriority); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All</option>
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
                  onChange={(e) => { setStatusFilter(e.target.value as FilterStatus); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                <select
                  value={dueFilter}
                  onChange={(e) => { setDueFilter(e.target.value as FilterDue); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All</option>
                  <option value="overdue">⚠️ Overdue</option>
                  <option value="today">📅 Today</option>
                  <option value="tomorrow">📆 Tomorrow</option>
                  <option value="this_week">📆 This Week</option>
                  <option value="upcoming">🗓️ Next 7 Days</option>
                  <option value="no_date">❓ No Date</option>
                </select>
              </div>
              
              {categories.length > 0 && (
                <div className="min-w-[130px]">
                  <label className="block text-xs text-gray-600 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border rounded text-sm"
                  >
                    <option value="">All</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="min-w-[130px]">
                <label className="block text-xs text-gray-600 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border rounded text-sm flex items-center gap-1 hover:bg-gray-50"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <FaSortAmountDown className={sortOrder === 'desc' ? 'rotate-180' : ''} />
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </button>
              
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

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {paginatedTasks.length} of {filteredTasks.length} tasks
            {hasActiveFilters && ` (filtered from ${tasks.length} total)`}
          </span>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {paginatedTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FaInfoCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results.'
                  : 'You don\'t have any tasks assigned yet.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            paginatedTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded text-sm ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrderId && (
        <AdminOrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          onUpdate={loadTasks}
        />
      )}
    </AdminLayout>
  );
}
