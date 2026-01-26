import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient, { auth } from '@/services/api';
import { 
  FaPhone, FaFire, FaCheckCircle, FaClock, FaList, FaCalendarDay, 
  FaUserClock, FaPlay, FaSearch, FaFilter, FaTimes, FaInfoCircle,
  FaThermometerHalf, FaSnowflake, FaRedo, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import Link from 'next/link';

interface CallTask {
  id: number;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  priority: 'hot' | 'warm' | 'cold';
  call_reason: string;
  recommended_product_id?: number;
  recommended_product_name?: string;
  status: string;
  scheduled_time?: string;
  task_date?: string;
  notes?: string;
  created_at?: string;
  assigned_agent_id?: number;
}

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  hot: number;
  warm: number;
  cold: number;
}

type FilterPriority = '' | 'hot' | 'warm' | 'cold';
type FilterStatus = '' | 'pending' | 'in_progress' | 'completed' | 'failed';

export default function TodayTasklistPage() {
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<CallTask[]>([]);
  const [followUps, setFollowUps] = useState<CallTask[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<CallTask[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    tasks: true,
    followUps: true,
    assignments: true,
  });

  // Stats
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    hot: 0,
    warm: 0,
    cold: 0,
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
    loadTodayData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      
      // Load today's tasks and dashboard data
      const [dashboardRes, tasksRes] = await Promise.all([
        apiClient.get('/crm/automation/agent/me/dashboard'),
        apiClient.get('/crm/automation/tasks/today'),
      ]);
      
      const dashboardData = dashboardRes.data;
      const allTasks: CallTask[] = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      
      // Separate tasks by type
      const today = new Date().toISOString().split('T')[0];
      
      // All tasks for today
      setTasks(allTasks);
      
      // Follow-ups (tasks with scheduled_time for today or call_reason includes 'follow')
      const followUpTasks = allTasks.filter(t => 
        t.call_reason?.toLowerCase().includes('follow') ||
        t.call_reason?.toLowerCase().includes('reminder') ||
        (t.scheduled_time && t.scheduled_time.includes(today))
      );
      setFollowUps(followUpTasks);
      
      // Today's new assignments (created today)
      const todayCreated = allTasks.filter(t => 
        t.created_at && t.created_at.includes(today)
      );
      setTodayAssignments(todayCreated);
      
      // Calculate stats
      setStats({
        total: allTasks.length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        inProgress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        failed: allTasks.filter(t => t.status === 'failed').length,
        hot: allTasks.filter(t => t.priority === 'hot').length,
        warm: allTasks.filter(t => t.priority === 'warm').length,
        cold: allTasks.filter(t => t.priority === 'cold').length,
      });
      
    } catch (error) {
      console.error('Failed to load today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: string) => {
    try {
      await apiClient.put(`/crm/automation/tasks/${taskId}/status`, { status });
      await loadTodayData(); // Reload data
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

  // Filter tasks based on search and filters
  const filterTasks = (taskList: CallTask[]) => {
    return taskList.filter(task => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          task.customer_name?.toLowerCase().includes(search) ||
          task.customer_phone?.toLowerCase().includes(search) ||
          task.customer_id?.toLowerCase().includes(search) ||
          task.call_reason?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) return false;
      
      // Status filter
      if (statusFilter && task.status !== statusFilter) return false;
      
      return true;
    });
  };

  const filteredTasks = useMemo(() => filterTasks(tasks), [tasks, searchTerm, priorityFilter, statusFilter]);
  const filteredFollowUps = useMemo(() => filterTasks(followUps), [followUps, searchTerm, priorityFilter, statusFilter]);
  const filteredAssignments = useMemo(() => filterTasks(todayAssignments), [todayAssignments, searchTerm, priorityFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = searchTerm || priorityFilter || statusFilter;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'hot': return <FaFire className="text-red-500" />;
      case 'warm': return <FaThermometerHalf className="text-orange-500" />;
      case 'cold': return <FaSnowflake className="text-blue-500" />;
      default: return <FaThermometerHalf className="text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      hot: 'bg-red-100 text-red-800 border-red-200',
      warm: 'bg-orange-100 text-orange-800 border-orange-200',
      cold: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const TaskCard = ({ task }: { task: CallTask }) => (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getPriorityIcon(task.priority)}
            <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityBadge(task.priority)}`}>
              {task.priority?.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded ${getStatusBadge(task.status)}`}>
              {task.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          <div className="font-medium text-gray-900">
            {task.customer_name || `Customer ${task.customer_id}`}
          </div>
          
          {task.customer_phone && (
            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <FaPhone className="text-gray-400" size={12} />
              {task.customer_phone}
            </div>
          )}
          
          <div className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Reason:</span> {task.call_reason}
          </div>
          
          {task.recommended_product_name && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Recommended:</span> {task.recommended_product_name}
            </div>
          )}
          
          {task.scheduled_time && (
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <FaClock size={12} />
              Scheduled: {new Date(task.scheduled_time).toLocaleTimeString()}
            </div>
          )}
          
          {task.notes && (
            <div className="text-sm text-gray-500 mt-1 italic">
              {task.notes}
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2 ml-4">
          {task.status === 'pending' && (
            <>
              <Link 
                href={`/admin/crm/agent-dashboard?startTask=${task.id}`}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
              >
                <FaPlay size={10} /> Start Call
              </Link>
              <button
                onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                In Progress
              </button>
            </>
          )}
          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Complete
              </button>
              <button
                onClick={() => handleUpdateTaskStatus(task.id, 'failed')}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Failed
              </button>
            </>
          )}
          {(task.status === 'completed' || task.status === 'failed') && (
            <button
              onClick={() => handleUpdateTaskStatus(task.id, 'pending')}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
            >
              <FaRedo size={10} /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const TaskSection = ({ 
    title, 
    icon, 
    tasks: sectionTasks, 
    sectionKey,
    emptyMessage 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    tasks: CallTask[];
    sectionKey: keyof typeof expandedSections;
    emptyMessage: string;
  }) => (
    <div className="bg-white rounded-lg shadow">
      <div 
        className="px-4 py-3 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            {sectionTasks.length}
          </span>
        </div>
        {expandedSections[sectionKey] ? <FaChevronUp /> : <FaChevronDown />}
      </div>
      
      {expandedSections[sectionKey] && (
        <div className="p-4">
          {sectionTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaInfoCircle className="mx-auto mb-2" size={24} />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sectionTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
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
              href="/admin/crm/agent-dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Full Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1"><FaFire className="text-red-500" /> Hot</div>
            <div className="text-2xl font-bold text-red-600">{stats.hot}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1"><FaThermometerHalf className="text-orange-500" /> Warm</div>
            <div className="text-2xl font-bold text-orange-600">{stats.warm}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500 flex items-center gap-1"><FaSnowflake className="text-blue-500" /> Cold</div>
            <div className="text-2xl font-bold text-blue-600">{stats.cold}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
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
                    placeholder="Customer name, phone, reason..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded text-sm"
                  />
                </div>
              </div>
              
              <div className="min-w-[150px]">
                <label className="block text-xs text-gray-600 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">🌡️ Warm</option>
                  <option value="cold">❄️ Cold</option>
                </select>
              </div>
              
              <div className="min-w-[150px]">
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
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                >
                  <FaTimes /> Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task Sections */}
        <div className="space-y-6">
          {/* All Today's Tasks */}
          <TaskSection
            title="All Today's Tasks"
            icon={<FaList className="text-blue-600" />}
            tasks={filteredTasks}
            sectionKey="tasks"
            emptyMessage="No tasks for today. Great job!"
          />
          
          {/* Follow-ups */}
          <TaskSection
            title="Follow-ups & Reminders"
            icon={<FaUserClock className="text-orange-600" />}
            tasks={filteredFollowUps}
            sectionKey="followUps"
            emptyMessage="No follow-ups scheduled for today."
          />
          
          {/* Today's New Assignments */}
          <TaskSection
            title="Today's New Assignments"
            icon={<FaCalendarDay className="text-green-600" />}
            tasks={filteredAssignments}
            sectionKey="assignments"
            emptyMessage="No new assignments today."
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/crm/agent-dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <FaPhone /> Open Softphone
            </Link>
            <Link
              href="/admin/crm/leads"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              View All Leads
            </Link>
            <Link
              href="/admin/crm/customers"
              className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              View All Customers
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
    </AdminLayout>
  );
}
