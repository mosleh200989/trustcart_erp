import { useState, useEffect } from 'react';
import { Plus, Filter, Search, Calendar, User, CheckCircle, Circle, Clock, AlertCircle, X, ChevronDown, Edit2, Trash2, Users } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { format } from 'date-fns';
import { apiUrl } from '@/config/backend';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface TeamMember {
  id: number;
  userId: number;
  teamLeaderId: number;
  teamType: string;
  isActive: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Task {
  id: number;
  title: string;
  description?: string;
  customer?: { id: number; name: string };
  deal?: { id: number; name: string };
  assignee?: { id: number; name: string };
  assigner?: { id: number; name: string };
  dueDate?: string;
  dueTime?: string;
  priority: string;
  category?: string;
  tags: string[];
  status: string;
  completedAt?: string;
  assignedTo?: number;
  assignedBy?: number;
}

const TaskManagement = () => {
  const { user: authUser, roles } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0, overdue: 0 });

  // Get current user's role slug from auth context
  const currentUserRoleSlug = roles?.[0]?.slug || authUser?.roleSlug || '';
  
  // Check if current user is a team leader or admin (can assign tasks)
  const isTeamLeaderOrAdmin = () => {
    const slug = currentUserRoleSlug.toLowerCase();
    return slug.includes('team-leader') || 
           slug.includes('team_leader') || 
           slug === 'sales-team-leader' ||
           slug === 'admin' ||
           slug === 'super-admin' ||
           slug.includes('manager') ||
           teamMembers.length > 0; // Fallback: if they have team members, they're a leader
  };

  useEffect(() => {
    if (authUser?.id) {
      console.log('Auth user:', authUser);
      console.log('User roles:', roles);
      console.log('Role slug:', currentUserRoleSlug);
      fetchTeamMembers();
      fetchTasks();
      fetchStats();
    }
  }, [authUser?.id, filterStatus, filterPriority, filterAssignee]);

  const fetchTeamMembers = async () => {
    if (!authUser?.id) return;
    
    try {
      const token = localStorage.getItem('authToken');
      // Fetch team members under this team leader
      const response = await fetch(apiUrl(`/lead-management/team-member/list/${authUser.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch team members:', response.statusText);
        setTeamMembers([]);
        return;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        // Also fetch user details for each team member
        const membersWithUsers = await Promise.all(
          data.map(async (member: TeamMember) => {
            try {
              const userResponse = await fetch(apiUrl(`/users/${member.userId}`), {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userResponse.ok) {
                const userData = await userResponse.json();
                return { ...member, user: userData };
              }
              return member;
            } catch {
              return member;
            }
          })
        );
        setTeamMembers(membersWithUsers);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchTasks = async () => {
    if (!authUser?.id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      
      const isLeader = isTeamLeaderOrAdmin();
      console.log('Is Team Leader/Admin:', isLeader, 'Role slug:', currentUserRoleSlug, 'Team Members Count:', teamMembers.length);
      
      // For team leaders, get tasks they created for their team
      // For regular team members, get tasks assigned to them
      if (isLeader) {
        params.append('assignedBy', authUser.id.toString());
      } else {
        // Regular team members see tasks assigned TO them
        params.append('assignedTo', authUser.id.toString());
      }
      
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterAssignee) params.append('assignedTo', filterAssignee);

      console.log('Fetching tasks with params:', params.toString());
      
      const response = await fetch(apiUrl(`/crm/tasks?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch tasks:', response.statusText);
        setTasks([]);
        return;
      }
      
      const data = await response.json();
      console.log('Tasks API response:', data);
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error('Tasks API returned non-array:', data);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!authUser?.id) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      if (isTeamLeaderOrAdmin()) {
        // Team leaders see stats for tasks they created
        params.append('assignedBy', authUser.id.toString());
      } else {
        // Regular team members get stats for tasks assigned to them
        params.append('userId', authUser.id.toString());
      }
      
      const response = await fetch(apiUrl(`/crm/tasks/stats?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch stats:', response.statusText);
        return;
      }
      
      const data = await response.json();
      if (data && typeof data === 'object') {
        setStats(data);
      } else {
        console.error('Stats API returned invalid data:', data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
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
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await fetch(apiUrl(`/crm/tasks/${taskId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.assignee?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'urgent': return 'text-red-700 bg-red-100 border-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
      case 'in-progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'overdue': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const groupedTasks = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    'in_progress': filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                {isTeamLeaderOrAdmin() 
                  ? 'Assign and manage tasks for your team members'
                  : 'Organize and track your tasks'
                }
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTask(null);
                setShowTaskModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-700 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inProgress}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.completed}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-700 font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.overdue}</p>
            </div>
          </div>

          {/* Team Members Info (for Team Leaders) */}
          {isTeamLeaderOrAdmin() && teamMembers.length > 0 && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-700 font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Your Team Members ({teamMembers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {teamMembers.map(member => (
                  <span key={member.id} className="px-3 py-1 bg-white rounded-full text-sm text-purple-700 border border-purple-200">
                    {member.user?.name || `User #${member.userId}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              >
                List
              </button>
              <button
                onClick={() => setView('board')}
                className={`px-4 py-2 rounded-lg ${view === 'board' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              >
                Board
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                {isTeamLeaderOrAdmin() && teamMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Team Members</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.userId}>
                          {member.user?.name || `User #${member.userId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterStatus('');
                      setFilterPriority('');
                      setFilterAssignee('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : view === 'list' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">{task.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {task.assignee ? (
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <span className="text-sm font-medium text-blue-600">
                                  {task.assignee.name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {task.dueDate ? (
                            <div className="flex items-center text-sm text-gray-700">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                              {task.dueTime && <span className="ml-1 text-gray-500">{task.dueTime}</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No due date</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded border capitalize ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(task.status)}
                            <span className="ml-2 text-sm text-gray-700 capitalize">{task.status.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-1 text-gray-500 hover:text-blue-600"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No tasks found</p>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setShowTaskModal(true);
                    }}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first task
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(groupedTasks).map(([status, statusTasks]) => (
                <div key={status} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 capitalize flex items-center justify-between">
                      {status.replace('_', ' ')}
                      <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                        {statusTasks.length}
                      </span>
                    </h3>
                  </div>
                  <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                    {statusTasks.map(task => (
                      <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditTask(task)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        )}
                        {task.dueDate && (
                          <p className="text-xs text-gray-500 flex items-center mb-2">
                            <Calendar className="w-3 h-3 mr-1" />
                            {format(new Date(task.dueDate), 'MMM dd')}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className={`px-2 py-1 text-xs font-medium rounded border capitalize ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.assignee && (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center" title={task.assignee.name}>
                              <span className="text-xs font-medium text-blue-600">
                                {task.assignee.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {statusTasks.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">No tasks</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Modal */}
        {showTaskModal && (
          <TaskModal
            task={editingTask}
            teamMembers={teamMembers}
            isTeamLeader={isTeamLeaderOrAdmin()}
            currentUserId={Number(authUser?.id) || 0}
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
            }}
            onSave={() => {
              setShowTaskModal(false);
              setEditingTask(null);
              fetchTasks();
              fetchStats();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Task Creation/Edit Modal
interface TaskModalProps {
  task: Task | null;
  teamMembers: TeamMember[];
  isTeamLeader: boolean;
  currentUserId: number;
  onClose: () => void;
  onSave: () => void;
}

const TaskModal = ({ task, teamMembers, isTeamLeader, currentUserId, onClose, onSave }: TaskModalProps) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignedTo: task?.assignedTo?.toString() || task?.assignee?.id?.toString() || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    dueTime: task?.dueTime || '',
    priority: task?.priority || 'medium',
    category: task?.category || '',
    tags: task?.tags?.join(', ') || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
    if (!isTeamLeader) {
      fetchAllUsers();
    }
  }, [isTeamLeader]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/customers?limit=100'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/users'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.warning('Task title is required');
      return;
    }

    if (isTeamLeader && !formData.assignedTo) {
      toast.warning('Please select a team member to assign this task');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : currentUserId,
        dueDate: formData.dueDate || null,
        dueTime: formData.dueTime || null,
        priority: formData.priority,
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      };

      if (task) {
        // Update existing task
        await fetch(apiUrl(`/crm/tasks/${task.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new task
        await fetch(apiUrl('/crm/tasks'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine which users to show in the dropdown
  const assignableUsers = isTeamLeader 
    ? teamMembers.map(m => ({ id: m.userId, name: m.user?.name || `User #${m.userId}`, teamType: m.teamType }))
    : allUsers;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Task details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isTeamLeader ? 'Assign To Team Member *' : 'Assign To'}
            </label>
            <select
              required={isTeamLeader}
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isTeamLeader ? 'Select Team Member' : 'Select User'}</option>
              {assignableUsers.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.teamType ? `(${user.teamType})` : ''}
                </option>
              ))}
            </select>
            {isTeamLeader && (
              <p className="text-xs text-gray-500 mt-1">
                You can only assign tasks to your team members ({teamMembers.length} available)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="follow_up">Follow Up</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="documentation">Documentation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="urgent, follow-up, important"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskManagement;
