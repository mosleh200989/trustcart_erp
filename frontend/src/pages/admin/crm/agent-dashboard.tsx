import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { 
  FaPhone, FaWhatsapp, FaSms, FaEnvelope, FaFire, FaChartLine, FaCheckCircle, FaClock, 
  FaMoneyBillWave, FaDollarSign, FaStickyNote, FaCalendarAlt, FaCheckDouble, FaThumbsUp, FaThumbsDown,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import apiClient, { auth, users as usersApi } from '@/services/api';
import AdminOrderDetailsModal from '@/components/AdminOrderDetailsModal';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getTelephonySocket, type IncomingCallPayload } from '@/services/telephonySocket';
import { useToast } from '@/contexts/ToastContext';

interface CallTask {
  id: number;
  customer_id: string;
  priority: 'hot' | 'warm' | 'cold';
  call_reason: string;
  recommended_product_id?: number;
  status: string;
  scheduled_time?: string;
  notes?: string;
}

type AgentStatus = 'online' | 'on_call' | 'break' | 'offline';
type MicStatus = 'unknown' | 'granted' | 'denied';
type CallUiStatus = 'idle' | 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed';

interface SuggestedScriptResponse {
  taskId: number;
  scriptKey: string;
  opening: string[];
  main: {
    title: string;
    goal: string;
    lines: string[];
  };
  objectionHandling: Array<{ objection: string; reply: string }>;
  ending: string[];
  context?: any;
}

interface NextAction {
  action: string;
  priority: string;
  message: string;
  task?: CallTask;
  customer_intel?: any;
  recommendations?: any[];
  products_to_push?: string[];
}

interface DashboardStats {
  today_tasks: number;
  hot_leads: number;
  warm_leads: number;
  pending: number;
  completed: number;
  performance: any;
  tasks: CallTask[];
}

interface AssignedCustomer {
  id: number | string;
  name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  priority?: string;
  lifecycleStage?: string;
  createdAt?: string;
  last_contact_date?: string;
}

interface PaginatedCustomers {
  data: AssignedCustomer[];
  total: number;
}

interface CommissionSummary {
  agentId: number;
  agentName: string;
  totalSales: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  totalOrders: number;
  currentMonthCommission: number;
  currentMonthSales: number;
  currentMonthOrders: number;
}

interface CommissionSettings {
  configured: boolean;
  commissionType?: string;
  fixedAmount?: number | null;
  percentageRate?: number | null;
  minOrderValue?: number;
  maxCommission?: number | null;
  message?: string;
}

interface CommissionRecord {
  id: number;
  salesOrderId: number;
  orderAmount: number;
  commissionAmount: number;
  commissionType: string;
  status: string;
  createdAt: string;
}

// Filter types for leads
type FilterCalledStatus = 'all' | 'called' | 'not_called';
type FilterOutcome = 'all' | 'positive' | 'negative' | 'neutral' | 'no_answer';

// Helper function to format last called date
const formatLastCalled = (dateStr?: string | null): { text: string; color: string } => {
  if (!dateStr) return { text: 'Never', color: 'text-red-600' };
  
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const callDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - callDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return { text: 'Today', color: 'text-green-600 font-semibold' };
  if (diffDays === 1) return { text: 'Yesterday', color: 'text-blue-600' };
  if (diffDays === 2) return { text: '2 days ago', color: 'text-yellow-600' };
  if (diffDays <= 7) return { text: `${diffDays} days ago`, color: 'text-orange-600' };
  if (diffDays <= 14) return { text: '1 week ago', color: 'text-orange-700' };
  if (diffDays <= 30) return { text: `${Math.floor(diffDays / 7)} weeks ago`, color: 'text-red-500' };
  return { text: `${Math.floor(diffDays / 30)} months ago`, color: 'text-red-600' };
};

export default function AgentDashboard() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [meRoles, setMeRoles] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [selectedTask, setSelectedTask] = useState<CallTask | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([]);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState<string | null>(null);

  // Assigned leads filters
  const [leadsSearchTerm, setLeadsSearchTerm] = useState('');
  const [leadsPriorityFilter, setLeadsPriorityFilter] = useState('');
  const [leadsStageFilter, setLeadsStageFilter] = useState('');
  const [leadsCalledFilter, setLeadsCalledFilter] = useState<FilterCalledStatus>('all');
  const [leadsOutcomeFilter, setLeadsOutcomeFilter] = useState<FilterOutcome>('all');
  const [leadsPage, setLeadsPage] = useState(1);
  const leadsLimit = 20;

  // Tasks pagination
  const [tasksPage, setTasksPage] = useState(1);
  const tasksPerPage = 10;

  const [agentUsers, setAgentUsers] = useState<any[]>([]);
  const [selectedViewAgentId, setSelectedViewAgentId] = useState<number | null>(null);

  // Commission state
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<CommissionRecord[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);

  // Softphone UI state (UI-only; telephony initiation happens via backend)
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('online');
  const [micStatus, setMicStatus] = useState<MicStatus>('unknown');
  const [callStatus, setCallStatus] = useState<CallUiStatus>('idle');
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [suggestedScript, setSuggestedScript] = useState<SuggestedScriptResponse | null>(null);

  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [telephonyInfo, setTelephonyInfo] = useState<any>(null);

  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);

  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');

  // Mark as called state
  const [markingAsCalled, setMarkingAsCalled] = useState(false);
  const [calledToday, setCalledToday] = useState(false);

  // Unified Call Action Modal (combines Mark as Called, Follow-up, Notes, Outcome)
  const [showCallActionModal, setShowCallActionModal] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<AssignedCustomer | null>(null);
  const [callActionFollowUpDate, setCallActionFollowUpDate] = useState('');
  const [callActionFollowUpTime, setCallActionFollowUpTime] = useState('');
  const [callActionNotes, setCallActionNotes] = useState('');
  const [callActionOutcome, setCallActionOutcome] = useState<'connected' | 'no_answer' | 'busy' | 'callback_requested' | 'not_interested' | 'order_placed' | ''>('');
  const [savingCallAction, setSavingCallAction] = useState(false);
  const [markingLeadAsCalled, setMarkingLeadAsCalled] = useState<number | null>(null);

  // Legacy modals (keeping for backward compatibility if needed)
  const [showLeadFollowUpModal, setShowLeadFollowUpModal] = useState(false);
  const [showLeadNotesModal, setShowLeadNotesModal] = useState(false);
  const [showLeadOutcomeModal, setShowLeadOutcomeModal] = useState(false);
  const [leadFollowUpDate, setLeadFollowUpDate] = useState('');
  const [leadFollowUpTime, setLeadFollowUpTime] = useState('');
  const [leadFollowUpNotes, setLeadFollowUpNotes] = useState('');
  const [leadCallNotes, setLeadCallNotes] = useState('');
  const [leadCallOutcome, setLeadCallOutcome] = useState<'positive' | 'negative' | 'neutral' | 'no_answer' | ''>('');
  const [leadOutcomeNotes, setLeadOutcomeNotes] = useState('');
  const [savingLeadAction, setSavingLeadAction] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.getCurrentUser();
        const id = Number((me as any)?.id);
        if (!id) throw new Error('Unable to resolve agent id');
        setAgentId(id);
        setMeRoles(Array.isArray((me as any)?.roles) ? (me as any).roles : []);
      } catch (err) {
        console.error('Failed to load current user', err);
      }
    })();
  }, []);

  const canSelectAgent = useMemo(() => {
    const slugs = new Set(
      (meRoles || [])
        .map((r: any) => String(r?.slug || '').toLowerCase())
        .filter(Boolean),
    );
    return slugs.has('admin') || slugs.has('super-admin');
  }, [meRoles]);

  useEffect(() => {
    if (!canSelectAgent) return;
    (async () => {
      try {
        const all = await usersApi.list();
        const arr = Array.isArray(all) ? all : [];
        setAgentUsers(arr);
      } catch (err) {
        console.error('Failed to load users for agent selector', err);
        setAgentUsers([]);
      }
    })();
  }, [canSelectAgent]);

  useEffect(() => {
    if (!agentId) return;

    const q = router?.query?.agentId;
    const fromQuery = Array.isArray(q) ? q[0] : q;
    const parsed = fromQuery ? Number(fromQuery) : null;
    if (canSelectAgent && parsed && Number.isFinite(parsed)) {
      setSelectedViewAgentId(parsed);
      return;
    }
    if (Number.isFinite(Number(agentId))) {
      setSelectedViewAgentId(agentId);
    }
  }, [agentId, canSelectAgent, router?.query?.agentId]);

  useEffect(() => {
    if (!agentId) return;
    loadDashboard();
    loadCommissionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    if (!selectedViewAgentId) return;
    loadAssignedCustomers(selectedViewAgentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedViewAgentId]);

  useEffect(() => {
    // Load persisted presence + attach realtime screen-pop.
    const loadPresence = async () => {
      try {
        const res = await apiClient.get('/telephony/agents/me/status');
        const s = (res.data as any)?.status as AgentStatus;
        if (s) setAgentStatus(s);
      } catch {
        // ignore
      }
    };

    loadPresence();

    const socket = getTelephonySocket();
    const onIncoming = (payload: IncomingCallPayload) => {
      setIncomingCall(payload);
      setShowIncomingCallModal(true);
      const phone = String(payload?.call?.customerPhone || payload?.call?.fromNumber || '').trim();
      if (phone) setDialNumber(phone);
    };

    const onCallUpdated = (payload: any) => {
      const updated = payload?.call;
      if (!updated) return;

      if (telephonyInfo?.telephonyCallId && Number(updated.id) === Number(telephonyInfo.telephonyCallId)) {
        setTelephonyInfo((prev: any) => ({ ...(prev || {}), call: updated }));
      }

      if (agentId && updated?.agentUserId && Number(updated.agentUserId) === Number(agentId)) {
        if (updated?.status === 'answered') {
          setCallStatus('connected');
          setAgentStatus('on_call');
        }
        if (updated?.status === 'completed' || updated?.status === 'failed' || updated?.status === 'missed') {
          setCallStatus('ended');
          setAgentStatus('online');
        }
      }
    };

    const onPresence = (payload: any) => {
      if (agentId && payload?.userId && Number(payload.userId) === Number(agentId) && payload?.status) {
        setAgentStatus(payload.status);
      }
    };

    socket.on('incoming_call', onIncoming);
    socket.on('call_updated', onCallUpdated);
    socket.on('agent_presence', onPresence);

    return () => {
      socket.off('incoming_call', onIncoming);
      socket.off('call_updated', onCallUpdated);
      socket.off('agent_presence', onPresence);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, telephonyInfo?.telephonyCallId]);

  const updatePresence = async (status: AgentStatus) => {
    try {
      await apiClient.post('/telephony/agents/me/status', { status });
    } catch (err) {
      console.error('Failed to update agent presence', err);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, actionRes] = await Promise.all([
        apiClient.get('/crm/automation/agent/me/dashboard'),
        apiClient.get('/crm/automation/agent/me/next-action')
      ]);
      
      setStats(dashboardRes.data);
      setNextAction(actionRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedCustomers = async (viewAgentId: number, filters?: {
    search?: string;
    priority?: string;
    stage?: string;
    calledStatus?: FilterCalledStatus;
    outcome?: FilterOutcome;
    page?: number;
  }) => {
    try {
      setAssignedLoading(true);
      setAssignedError(null);
      const isMe = agentId && Number(viewAgentId) === Number(agentId);
      // If the viewer is NOT an admin/super-admin, always use the /me endpoint.
      // This avoids depending on roleSlug/teamLeaderId for a regular Sales Executive.
      const url = (!canSelectAgent || isMe)
        ? '/crm/team/agent/me/customers'
        : `/crm/team/agent/${viewAgentId}/customers`;
      
      const params: any = { 
        page: filters?.page || leadsPage, 
        limit: leadsLimit 
      };
      if (filters?.search || leadsSearchTerm) params.search = filters?.search || leadsSearchTerm;
      if (filters?.priority || leadsPriorityFilter) params.priority = filters?.priority || leadsPriorityFilter;
      if (filters?.stage || leadsStageFilter) params.stage = filters?.stage || leadsStageFilter;
      
      // Add new filters
      const calledStatus = filters?.calledStatus ?? leadsCalledFilter;
      const outcome = filters?.outcome ?? leadsOutcomeFilter;
      if (calledStatus && calledStatus !== 'all') params.calledStatus = calledStatus;
      if (outcome && outcome !== 'all') params.outcome = outcome;
      
      const res = await apiClient.get<PaginatedCustomers>(url, { params });
      const data = (res as any)?.data;
      const rows = Array.isArray(data?.data) ? data.data : [];
      const total = Number(data?.total || rows.length || 0);
      setAssignedCustomers(rows);
      setAssignedTotal(total);
    } catch (err) {
      console.error('Failed to load assigned customers', err);
      setAssignedCustomers([]);
      setAssignedTotal(0);
      const message = (err as any)?.response?.data?.message || (err as any)?.message || 'Failed to load assigned leads';
      setAssignedError(String(message));
    } finally {
      setAssignedLoading(false);
    }
  };

  const loadCommissionData = async () => {
    try {
      setCommissionLoading(true);
      const [summaryRes, settingsRes, commissionsRes] = await Promise.all([
        apiClient.get('/crm/commissions/my/summary'),
        apiClient.get('/crm/commissions/my/settings'),
        apiClient.get('/crm/commissions/my', { params: { limit: 5 } }),
      ]);
      setCommissionSummary(summaryRes.data);
      setCommissionSettings(settingsRes.data);
      setRecentCommissions(Array.isArray(commissionsRes.data?.data) ? commissionsRes.data.data : []);
    } catch (err) {
      console.error('Failed to load commission data', err);
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleStartCall = async (task: CallTask) => {
    try {
      // Update task status to in_progress
      await apiClient.put(`/crm/automation/tasks/${task.id}/status`, {
        status: 'in_progress'
      });
      
      // Get customer intelligence
      const intelRes = await apiClient.get(`/crm/automation/intelligence/${task.customer_id}`);
      const recommendationsRes = await apiClient.get(`/crm/automation/recommendations/${task.customer_id}`);

      // AI-style suggested script (rule-based on backend)
      const scriptRes = await apiClient.get(`/crm/automation/call-tasks/${task.id}/suggested-script`);
      
      setSelectedTask({
        ...task,
        customer_intel: intelRes.data,
        recommendations: recommendationsRes.data
      } as any);

      setSuggestedScript(scriptRes.data);
      setTelephonyInfo(null);
      setOutcome('');
      setNotes('');
      setFollowUpAt('');
      setCalledToday(false); // Reset called today state for new task

      const customerPhone = String(intelRes?.data?.phone || task.customer_id || '').trim();
      setDialNumber(customerPhone);
      setCallStatus('idle');
      setAgentStatus('online');
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(false);
      setCallSeconds(0);
      setShowCustomerModal(true);
      
      // Track engagement
      await apiClient.post('/crm/automation/engagement', {
        customer_id: task.customer_id,
        engagement_type: 'call',
        status: 'completed',
        agent_id: agentId ?? undefined
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const handleCompleteTask = async (outcome: string, notes: string) => {
    if (!selectedTask) return;
    
    try {
      await apiClient.put(`/crm/automation/tasks/${selectedTask.id}/status`, {
        status: 'completed',
        outcome,
        notes
      });
      
      setShowCustomerModal(false);
      loadDashboard();
      toast.success('Task completed successfully!');
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to complete task');
    }
  };

  const handleMarkAsCalled = async () => {
    if (!selectedTask) return;
    
    setMarkingAsCalled(true);
    try {
      await apiClient.post(`/crm/automation/customer/${selectedTask.customer_id}/mark-called`, {
        notes: notes || 'Customer called via softphone',
        taskId: selectedTask.id
      });
      
      setCalledToday(true);
      toast.success('Customer marked as called today!');
      loadDashboard();
    } catch (error) {
      console.error('Failed to mark as called:', error);
      toast.error('Failed to mark customer as called');
    } finally {
      setMarkingAsCalled(false);
    }
  };

  // ==================== LEAD ACTION HANDLERS ====================

  const handleMarkLeadAsCalled = async (lead: AssignedCustomer) => {
    setMarkingLeadAsCalled(Number(lead.id));
    try {
      await apiClient.post(`/crm/automation/customer/${lead.id}/mark-called`, {
        notes: 'Marked as called from Agent Dashboard'
      });
      toast.success('Customer marked as called today!');
      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId);
    } catch (error: any) {
      console.error('Failed to mark as called:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark customer as called');
    } finally {
      setMarkingLeadAsCalled(null);
    }
  };

  // Open unified call action modal
  const openCallActionModal = (lead: AssignedCustomer) => {
    setSelectedLeadForAction(lead);
    setCallActionFollowUpDate('');
    setCallActionFollowUpTime('');
    setCallActionNotes('');
    setCallActionOutcome('');
    setShowCallActionModal(true);
  };

  // Handle unified call action submission
  const handleSubmitCallAction = async () => {
    if (!selectedLeadForAction) return;
    
    // Validate required fields
    if (!callActionNotes.trim()) {
      toast.warning('Please enter call notes');
      return;
    }
    if (!callActionOutcome) {
      toast.warning('Please select a call outcome');
      return;
    }
    
    setSavingCallAction(true);
    try {
      // 1. Mark as called
      await apiClient.post(`/crm/automation/customer/${selectedLeadForAction.id}/mark-called`, {
        notes: callActionNotes
      });
      
      // 2. Save notes to customer
      await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
        notes: callActionNotes,
        last_contact_date: new Date().toISOString()
      });
      
      // 3. Create engagement record with outcome
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLeadForAction.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: callActionNotes,
        metadata: { 
          outcome: callActionOutcome, 
          notes: callActionNotes,
          follow_up_scheduled: !!callActionFollowUpDate
        }
      });
      
      // 4. Update lead status based on outcome
      const leadStatus = callActionOutcome === 'order_placed' ? 'converted'
        : callActionOutcome === 'connected' ? 'qualified'
        : callActionOutcome === 'callback_requested' ? 'follow_up'
        : callActionOutcome === 'not_interested' ? 'not_interested'
        : callActionOutcome === 'no_answer' || callActionOutcome === 'busy' ? 'no_answer'
        : 'contacted';
      
      await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
        leadStatus: leadStatus
      });
      
      // 5. If follow-up date is set, create a follow-up task
      if (callActionFollowUpDate) {
        const followUpDateTime = callActionFollowUpTime 
          ? `${callActionFollowUpDate}T${callActionFollowUpTime}:00` 
          : `${callActionFollowUpDate}T09:00:00`;
        
        await apiClient.post('/crm/automation/tasks', {
          customer_id: String(selectedLeadForAction.id),
          priority: selectedLeadForAction.priority || 'warm',
          call_reason: 'Follow-up Call',
          notes: `Follow-up from call on ${new Date().toLocaleDateString()}. Previous outcome: ${callActionOutcome}`,
          scheduled_time: callActionFollowUpTime || '09:00',
          task_date: callActionFollowUpDate
        });
        
        await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
          next_follow_up: followUpDateTime
        });
      }
      
      toast.success('Call logged successfully!');
      setShowCallActionModal(false);
      setSelectedLeadForAction(null);
      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId);
    } catch (error: any) {
      console.error('Failed to save call action:', error);
      toast.error(error?.response?.data?.message || 'Failed to log call');
    } finally {
      setSavingCallAction(false);
    }
  };

  const openLeadFollowUpModal = (lead: AssignedCustomer) => {
    setSelectedLeadForAction(lead);
    setLeadFollowUpDate('');
    setLeadFollowUpTime('');
    setLeadFollowUpNotes('');
    setShowLeadFollowUpModal(true);
  };

  const handleSaveLeadFollowUp = async () => {
    if (!selectedLeadForAction || !leadFollowUpDate) {
      toast.warning('Please select a follow-up date');
      return;
    }
    
    setSavingLeadAction(true);
    try {
      const followUpDateTime = leadFollowUpTime 
        ? `${leadFollowUpDate}T${leadFollowUpTime}:00` 
        : `${leadFollowUpDate}T09:00:00`;
      
      // Create a call task for the follow-up
      await apiClient.post('/crm/automation/tasks', {
        customer_id: String(selectedLeadForAction.id),
        priority: selectedLeadForAction.priority || 'warm',
        call_reason: 'Follow-up Call',
        notes: leadFollowUpNotes || `Follow-up scheduled for ${leadFollowUpDate}${leadFollowUpTime ? ' at ' + leadFollowUpTime : ''}`,
        scheduled_time: leadFollowUpTime || '09:00',
        task_date: leadFollowUpDate
      });
      
      await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
        next_follow_up: followUpDateTime
      });
      
      toast.success('Follow-up scheduled successfully!');
      setShowLeadFollowUpModal(false);
      setSelectedLeadForAction(null);
      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId);
    } catch (error: any) {
      console.error('Failed to save follow-up:', error);
      toast.error(error?.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setSavingLeadAction(false);
    }
  };

  const openLeadNotesModal = (lead: AssignedCustomer) => {
    setSelectedLeadForAction(lead);
    setLeadCallNotes('');
    setShowLeadNotesModal(true);
  };

  const handleSaveLeadNotes = async () => {
    if (!selectedLeadForAction || !leadCallNotes.trim()) {
      toast.warning('Please enter some notes');
      return;
    }
    
    setSavingLeadAction(true);
    try {
      // Save as call engagement with notes in metadata
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLeadForAction.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: leadCallNotes,
        metadata: { type: 'call_notes', notes: leadCallNotes }
      });
      
      // Also update customer notes field
      await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
        notes: leadCallNotes
      });
      
      toast.success('Notes saved successfully!');
      setShowLeadNotesModal(false);
      setSelectedLeadForAction(null);
    } catch (error: any) {
      console.error('Failed to save notes:', error);
      toast.error(error?.response?.data?.message || 'Failed to save notes');
    } finally {
      setSavingLeadAction(false);
    }
  };

  const openLeadOutcomeModal = (lead: AssignedCustomer) => {
    setSelectedLeadForAction(lead);
    setLeadCallOutcome('');
    setLeadOutcomeNotes('');
    setShowLeadOutcomeModal(true);
  };

  const handleSaveLeadOutcome = async () => {
    if (!selectedLeadForAction || !leadCallOutcome) {
      toast.warning('Please select an outcome');
      return;
    }
    
    setSavingLeadAction(true);
    try {
      const leadStatus = leadCallOutcome === 'positive' ? 'qualified' 
        : leadCallOutcome === 'negative' ? 'not_interested' 
        : leadCallOutcome === 'no_answer' ? 'no_answer'
        : 'contacted';
      
      await apiClient.put(`/customers/${selectedLeadForAction.id}`, {
        leadStatus: leadStatus,
        last_contact_date: new Date().toISOString()
      });
      
      await apiClient.post('/crm/automation/engagement', {
        customer_id: String(selectedLeadForAction.id),
        engagement_type: 'call',
        status: 'completed',
        message_content: `Call outcome: ${leadCallOutcome}. ${leadOutcomeNotes}`,
        metadata: { outcome: leadCallOutcome, notes: leadOutcomeNotes }
      });
      
      toast.success('Outcome saved successfully!');
      setShowLeadOutcomeModal(false);
      setSelectedLeadForAction(null);
      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId);
    } catch (error: any) {
      console.error('Failed to save outcome:', error);
      toast.error(error?.response?.data?.message || 'Failed to save outcome');
    } finally {
      setSavingLeadAction(false);
    }
  };

  const requestMicPermission = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicStatus('denied');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // stop immediately (UI permission check only)
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('granted');
    } catch {
      setMicStatus('denied');
    }
  };

  const formatTime = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleInitiateCall = async () => {
    if (!selectedTask) return;
    try {
      setCallStatus('initiating');
      setAgentStatus('on_call');
      updatePresence('on_call');
      await requestMicPermission();

      const res = await apiClient.post('/telephony/calls/initiate', {
        taskId: selectedTask.id,
        agentUserId: agentId,
      });
      setTelephonyInfo(res.data);
      // Without realtime events, we mark as connected after initiation.
      setCallStatus('connected');
      setCallSeconds(0);
    } catch (error) {
      console.error('Failed to initiate telephony call:', error);
      setCallStatus('failed');
      setAgentStatus('online');
      updatePresence('online');
    }
  };

  const handleEndCallUi = () => {
    setCallStatus('ended');
    setAgentStatus('online');
    updatePresence('online');
    setIsMuted(false);
    setIsOnHold(false);
    setIsRecording(false);
  };

  // Handle viewing order details for a customer
  const handleViewOrder = async (customerId: number | string) => {
    try {
      // Fetch customer's orders
      const response = await apiClient.get(`/order-management/customer/${customerId}/orders`);
      const orders = response.data?.data || response.data || [];
      if (orders.length > 0) {
        // Get the most recent order
        const latestOrder = orders[0];
        setSelectedOrderId(latestOrder.id);
        setShowOrderModal(true);
      } else {
        toast.warning('No orders found for this customer');
      }
    } catch (error: any) {
      console.error('Error fetching customer orders:', error);
      toast.error('Failed to fetch customer orders');
    }
  };

  useEffect(() => {
    if (!showCustomerModal) return;
    requestMicPermission();
  }, [showCustomerModal]);

  useEffect(() => {
    const shouldRun = callStatus === 'connected';
    if (!shouldRun) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  const customerIntel = (selectedTask as any)?.customer_intel;

  const customerSegmentLabel = useMemo(() => {
    const totalOrders = Number(customerIntel?.total_orders || 0);
    if (totalOrders <= 1) return 'New-1';
    if (totalOrders === 2) return 'Repeat-2';
    if (totalOrders === 3) return 'Repeat-3';
    if (totalOrders >= 8) return 'Permanent';
    return 'Regular';
  }, [customerIntel]);

  const isVip = useMemo(() => {
    const lifetimeValue = Number(customerIntel?.lifetime_value || 0);
    const avgOrderValue = Number(customerIntel?.avg_order_value || 0);
    return lifetimeValue >= 20000 || avgOrderValue >= 3000;
  }, [customerIntel]);

  // Paginated tasks
  const tasksTotalPages = useMemo(() => {
    return Math.ceil((stats?.tasks?.length || 0) / tasksPerPage);
  }, [stats?.tasks?.length, tasksPerPage]);

  const paginatedTasks = useMemo(() => {
    if (!stats?.tasks) return [];
    const start = (tasksPage - 1) * tasksPerPage;
    return stats.tasks.slice(start, start + tasksPerPage);
  }, [stats?.tasks, tasksPage, tasksPerPage]);

  const daysSinceLastOrder = Number(customerIntel?.days_since_last_order || 0);

  const getPriorityBadge = (priority: string) => {
    const colors = {
      hot: 'bg-red-100 text-red-800 border-red-300',
      warm: 'bg-orange-100 text-orange-800 border-orange-300',
      cold: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[priority as keyof typeof colors] || colors.cold;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'hot') return <FaFire className="text-red-500" />;
    if (priority === 'warm') return <FaClock className="text-orange-500" />;
    return <FaClock className="text-blue-500" />;
  };

  const getPriorityLabel = (priority: string) => {
    if (priority === 'cold') return 'SLEEP/DEAD';
    return priority.toUpperCase();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Agent Dashboard</h1>
            <p className="text-gray-600 mt-1">Your daily call tasks and performance</p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Tasks</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.today_tasks || 0}</p>
              </div>
              <FaChartLine className="text-4xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">🔥 Hot Leads</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.hot_leads || 0}</p>
              </div>
              <FaFire className="text-4xl text-red-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warm Leads</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.warm_leads || 0}</p>
              </div>
              <FaClock className="text-4xl text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.pending || 0}</p>
              </div>
              <FaClock className="text-4xl text-yellow-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.completed || 0}</p>
              </div>
              <FaCheckCircle className="text-4xl text-green-500" />
            </div>
          </div>
        </div>

        {/* Assigned Leads / Customers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Assigned Leads</h2>
              <p className="text-sm text-gray-600">All customers assigned to the Sales Executive</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canSelectAgent && (
                <select
                  value={selectedViewAgentId ?? ''}
                  onChange={(e) => setSelectedViewAgentId(e.target.value ? Number(e.target.value) : null)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select agent</option>
                  {agentUsers.map((u: any) => (
                    <option key={String(u?.id)} value={Number(u?.id)}>
                      {(u?.name || 'User')} {(u?.lastName || u?.last_name || '')} (ID: {u?.id})
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => (selectedViewAgentId ? loadAssignedCustomers(selectedViewAgentId) : undefined)}
                disabled={!selectedViewAgentId || assignedLoading}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
              >
                {assignedLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  value={leadsSearchTerm}
                  onChange={(e) => setLeadsSearchTerm(e.target.value)}
                  placeholder="Name, email, phone..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select
                  value={leadsPriorityFilter}
                  onChange={(e) => setLeadsPriorityFilter(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Priorities</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Sleep/Dead</option>
                  <option value="new">New</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                <select
                  value={leadsStageFilter}
                  onChange={(e) => setLeadsStageFilter(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Stages</option>
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Called Status</label>
                <select
                  value={leadsCalledFilter}
                  onChange={(e) => setLeadsCalledFilter(e.target.value as FilterCalledStatus)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="called">Called Today</option>
                  <option value="not_called">Not Called</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
                <select
                  value={leadsOutcomeFilter}
                  onChange={(e) => setLeadsOutcomeFilter(e.target.value as FilterOutcome)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Outcomes</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                  <option value="no_answer">No Answer</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setLeadsPage(1);
                    if (selectedViewAgentId) {
                      loadAssignedCustomers(selectedViewAgentId, {
                        search: leadsSearchTerm,
                        priority: leadsPriorityFilter,
                        stage: leadsStageFilter,
                        calledStatus: leadsCalledFilter,
                        outcome: leadsOutcomeFilter,
                        page: 1
                      });
                    }
                  }}
                  disabled={!selectedViewAgentId || assignedLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setLeadsSearchTerm('');
                    setLeadsPriorityFilter('');
                    setLeadsStageFilter('');
                    setLeadsCalledFilter('all');
                    setLeadsOutcomeFilter('all');
                    setLeadsPage(1);
                    if (selectedViewAgentId) {
                      loadAssignedCustomers(selectedViewAgentId, { page: 1 });
                    }
                  }}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="text-sm text-gray-600 mb-4">
              Total assigned: <span className="font-semibold">{assignedTotal}</span>
              {(leadsSearchTerm || leadsPriorityFilter || leadsStageFilter || leadsCalledFilter !== 'all' || leadsOutcomeFilter !== 'all') && (
                <span className="ml-2 text-blue-600">(filtered)</span>
              )}
            </div>

            {assignedError && (
              <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                {assignedError}
              </div>
            )}

            {assignedCustomers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No assigned customers found for this agent.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Called</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignedCustomers.map((c) => {
                      const fullName = [String(c?.name || '').trim(), String(c?.last_name || '').trim()]
                        .filter(Boolean)
                        .join(' ');

                      const rawPhone = String(c?.phone || '').trim();
                      const waPhone = rawPhone.replace(/[^0-9]/g, '');
                      const email = String(c?.email || '').trim();

                      return (
                        <tr key={String(c.id)} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{fullName || 'N/A'}</div>
                            <div className="text-xs text-gray-500">ID: {String(c.id)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{c.phone || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{c.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 capitalize">{(c.lifecycleStage as any) || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                              {c.priority || 'new'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const lastCalled = formatLastCalled(c.last_contact_date);
                              return (
                                <span className={`text-sm ${lastCalled.color}`}>
                                  {lastCalled.text}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {/* Row 1: View & Contact */}
                              <button
                                onClick={() => handleViewOrder(c.id)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                              >
                                View
                              </button>

                              <a
                                href={rawPhone ? `tel:${rawPhone}` : undefined}
                                aria-disabled={!rawPhone}
                                title={rawPhone ? 'Call' : 'No phone'}
                                className={`p-1.5 rounded border ${rawPhone ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                                onClick={(e) => {
                                  if (!rawPhone) e.preventDefault();
                                }}
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
                                onClick={(e) => {
                                  if (!waPhone) e.preventDefault();
                                }}
                              >
                                <FaWhatsapp size={12} />
                              </a>

                              <a
                                href={rawPhone ? `sms:${rawPhone}` : undefined}
                                aria-disabled={!rawPhone}
                                title={rawPhone ? 'SMS' : 'No phone'}
                                className={`p-1.5 rounded border ${rawPhone ? 'border-blue-200 text-blue-700 hover:bg-blue-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                                onClick={(e) => {
                                  if (!rawPhone) e.preventDefault();
                                }}
                              >
                                <FaSms size={12} />
                              </a>

                              <a
                                href={email ? `mailto:${email}` : undefined}
                                aria-disabled={!email}
                                title={email ? 'Email' : 'No email'}
                                className={`p-1.5 rounded border ${email ? 'border-purple-200 text-purple-700 hover:bg-purple-50' : 'border-gray-200 text-gray-300 cursor-not-allowed'}`}
                                onClick={(e) => {
                                  if (!email) e.preventDefault();
                                }}
                              >
                                <FaEnvelope size={12} />
                              </a>

                              {/* Log Call Button - Opens unified modal */}
                              <button
                                type="button"
                                onClick={() => openCallActionModal(c)}
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

            {/* Pagination for Assigned Customers */}
            {assignedTotal > leadsLimit && (
              <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((leadsPage - 1) * leadsLimit) + 1} - {Math.min(leadsPage * leadsLimit, assignedTotal)} of {assignedTotal} leads
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {leadsPage} of {Math.ceil(assignedTotal / leadsLimit)}
                  </span>
                  <button
                    onClick={() => {
                      const newPage = Math.max(1, leadsPage - 1);
                      setLeadsPage(newPage);
                      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId, { page: newPage });
                    }}
                    disabled={leadsPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                  >
                    <FaChevronLeft size={10} /> Previous
                  </button>
                  <button
                    onClick={() => {
                      const totalPages = Math.ceil(assignedTotal / leadsLimit);
                      const newPage = Math.min(totalPages, leadsPage + 1);
                      setLeadsPage(newPage);
                      if (selectedViewAgentId) loadAssignedCustomers(selectedViewAgentId, { page: newPage });
                    }}
                    disabled={leadsPage >= Math.ceil(assignedTotal / leadsLimit)}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                  >
                    Next <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Best Action Card */}
        {nextAction && nextAction.action !== 'no_tasks' && (
          <div className={`p-6 rounded-lg shadow-lg border-2 ${
            nextAction.priority === 'HIGH' ? 'bg-red-50 border-red-400' :
            nextAction.priority === 'MEDIUM' ? 'bg-orange-50 border-orange-400' :
            'bg-blue-50 border-blue-400'
          }`}>
            <div className="flex items-start gap-4">
              <div className="text-4xl">
                {nextAction.priority === 'HIGH' ? '🔥' : 
                 nextAction.priority === 'MEDIUM' ? '📞' : '📧'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  What To Do Next?
                </h2>
                <p className="text-lg text-gray-700 mb-4">{nextAction.message}</p>
                
                {nextAction.customer_intel && (
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Customer Info:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>📱 Phone: {nextAction.customer_intel.phone || 'N/A'}</div>
                      <div>💰 Lifetime Value: ৳{nextAction.customer_intel.lifetime_value || 0}</div>
                      <div>📦 Total Orders: {nextAction.customer_intel.total_orders || 0}</div>
                      <div>📅 Last Purchase: {nextAction.customer_intel.days_since_last_order || 0} days ago</div>
                    </div>
                  </div>
                )}
                
                {nextAction.products_to_push && nextAction.products_to_push.length > 0 && (
                  <div className="bg-white p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">🎯 Products to Push:</h3>
                    <ul className="list-disc list-inside text-sm">
                      {nextAction.products_to_push.map((product, idx) => (
                        <li key={idx} className="text-gray-700">{product}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {nextAction.task && (
                  <button
                    onClick={() => handleStartCall(nextAction.task!)}
                    className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
                  >
                    <FaPhone /> Start Call Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Call Task List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Today's Call List</h2>
            <p className="text-sm text-gray-600">Sorted by priority</p>
          </div>
          
          <div className="overflow-x-auto">
            {!stats?.tasks || stats.tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaCheckCircle className="text-5xl mx-auto mb-4 text-green-500" />
                <p className="text-lg">🎉 No pending tasks! Great job!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          {getPriorityLabel(task.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.customer_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.call_reason || 'Follow-up'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{task.scheduled_time || 'ASAP'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStartCall(task)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                          >
                            <FaPhone /> Call
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination for Tasks */}
            {stats?.tasks && stats.tasks.length > tasksPerPage && (
              <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((tasksPage - 1) * tasksPerPage) + 1} - {Math.min(tasksPage * tasksPerPage, stats.tasks.length)} of {stats.tasks.length} tasks
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {tasksPage} of {tasksTotalPages}
                  </span>
                  <button
                    onClick={() => setTasksPage(p => Math.max(1, p - 1))}
                    disabled={tasksPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                  >
                    <FaChevronLeft size={10} /> Previous
                  </button>
                  <button
                    onClick={() => setTasksPage(p => Math.min(tasksTotalPages, p + 1))}
                    disabled={tasksPage >= tasksTotalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                  >
                    Next <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Commission Summary Section - Moved to bottom */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FaMoneyBillWave /> My Commission
              </h2>
              <p className="text-green-100 text-sm">Your earnings from sales conversions</p>
            </div>
            <button
              onClick={loadCommissionData}
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-sm"
            >
              Refresh
            </button>
          </div>

          {commissionLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
          ) : commissionSummary ? (
            <>
              {/* Commission Rate Info */}
              {commissionSettings?.configured && (
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <div className="text-sm text-green-100 mb-1">Your Commission Rate</div>
                  <div className="text-lg font-bold">
                    {commissionSettings.commissionType === 'fixed' 
                      ? `৳${commissionSettings.fixedAmount} per sale`
                      : `${commissionSettings.percentageRate}% of each sale`}
                  </div>
                  {commissionSettings.minOrderValue && commissionSettings.minOrderValue > 0 && (
                    <div className="text-xs text-green-200 mt-1">
                      Min order value: ৳{commissionSettings.minOrderValue}
                    </div>
                  )}
                </div>
              )}

              {!commissionSettings?.configured && (
                <div className="bg-yellow-500/20 rounded-lg p-4 mb-4">
                  <div className="text-sm text-yellow-100">
                    <FaClock className="inline mr-1" /> Commission rates not yet configured. Contact your admin.
                  </div>
                </div>
              )}

              {/* Main Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">৳{commissionSummary.totalCommissionEarned.toFixed(0)}</div>
                  <div className="text-sm text-green-100">Total Earned</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">{commissionSummary.totalOrders}</div>
                  <div className="text-sm text-green-100">Sales Made</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">৳{commissionSummary.currentMonthCommission.toFixed(0)}</div>
                  <div className="text-sm text-green-100">This Month</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-3xl font-bold">{commissionSummary.currentMonthOrders}</div>
                  <div className="text-sm text-green-100">Orders This Month</div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-yellow-400/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">৳{commissionSummary.pendingCommission.toFixed(0)}</div>
                  <div className="text-xs text-yellow-100">Pending</div>
                </div>
                <div className="bg-blue-400/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">৳{commissionSummary.approvedCommission.toFixed(0)}</div>
                  <div className="text-xs text-blue-100">Approved</div>
                </div>
                <div className="bg-green-300/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">৳{commissionSummary.paidCommission.toFixed(0)}</div>
                  <div className="text-xs text-green-100">Paid Out</div>
                </div>
              </div>

              {/* Recent Commissions */}
              {recentCommissions.length > 0 && (
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-sm font-semibold mb-3">Recent Commission Records</div>
                  <div className="space-y-2">
                    {recentCommissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm bg-white/5 rounded p-2">
                        <div>
                          <span className="font-medium">Order #{c.salesOrderId}</span>
                          <span className="text-green-200 ml-2">৳{c.orderAmount.toFixed(0)} sale</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">+৳{c.commissionAmount.toFixed(0)}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            c.status === 'pending' ? 'bg-yellow-400/30' :
                            c.status === 'approved' ? 'bg-blue-400/30' :
                            c.status === 'paid' ? 'bg-green-300/30' :
                            'bg-red-400/30'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-green-100">
              No commission data available
            </div>
          )}
        </div>

        {/* Customer Detail Modal */}
        {showIncomingCallModal && incomingCall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Incoming Call</h2>
                  <p className="text-sm text-gray-600">{incomingCall?.call?.customerPhone || incomingCall?.call?.fromNumber || 'Unknown number'}</p>
                </div>
                <button
                  className="text-sm px-3 py-1 rounded border"
                  onClick={() => {
                    setShowIncomingCallModal(false);
                    setIncomingCall(null);
                  }}
                >
                  Close
                </button>
              </div>

              <div className="p-6 space-y-4">
                {incomingCall.customer ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <div className="text-sm font-semibold text-green-900">Known Caller</div>
                    <div className="text-sm text-green-900 mt-1">
                      {incomingCall.customer.name || 'Customer'} (#{incomingCall.customer.id})
                    </div>
                    <div className="text-xs text-green-900 mt-1">{incomingCall.customer.phone || ''} {incomingCall.customer.email ? `• ${incomingCall.customer.email}` : ''}</div>
                    <div className="mt-3">
                      <Link
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        href={`/admin/customers/${incomingCall.customer.id}`}
                      >
                        Open customer profile
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <div className="text-sm font-semibold text-yellow-900">Unknown Caller</div>
                    <div className="text-xs text-yellow-900 mt-1">No customer matched this phone number</div>
                  </div>
                )}

                <div className="text-xs text-gray-600">
                  Call ID: <span className="font-semibold text-gray-900">{incomingCall?.call?.id ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCustomerModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
              {/* Top Bar */}
              <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Web Softphone</h2>
                  <p className="text-sm text-gray-600">Task #{selectedTask.id} • Customer: {selectedTask.customer_id}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    agentStatus === 'on_call'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : agentStatus === 'break'
                      ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                      : agentStatus === 'offline'
                      ? 'bg-gray-50 text-gray-800 border-gray-200'
                      : 'bg-green-50 text-green-800 border-green-200'
                  }`}>
                    {agentStatus === 'on_call'
                      ? 'On Call'
                      : agentStatus === 'break'
                      ? 'Break'
                      : agentStatus === 'offline'
                      ? 'Offline'
                      : 'Online'}
                  </span>

                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    micStatus === 'granted'
                      ? 'bg-green-50 text-green-800 border-green-200'
                      : micStatus === 'denied'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    Mic: {micStatus}
                  </span>

                  <div className="text-sm text-gray-700 font-semibold">Timer: {formatTime(callSeconds)}</div>

                  <button
                    onClick={() => {
                      const next = agentStatus === 'break' ? 'online' : 'break';
                      setAgentStatus(next);
                      updatePresence(next);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    disabled={callStatus === 'connected' || callStatus === 'initiating'}
                  >
                    {agentStatus === 'break' ? 'Back Online' : 'Break'}
                  </button>
                </div>
              </div>

              {/* Main 3-column layout */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Customer Info Panel */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">Customer Info</h3>
                        <p className="text-xs text-gray-500">Auto screen-pop</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isVip && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
                            VIP
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                          {customerSegmentLabel}
                        </span>
                      </div>
                    </div>

                    {customerIntel ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Name</span>
                          <span className="font-semibold text-gray-800">
                            {customerIntel?.name} {customerIntel?.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Phone</span>
                          <span className="font-semibold text-gray-800">{customerIntel?.phone || selectedTask.customer_id}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Total Orders</span>
                          <span className="font-semibold text-gray-800">{customerIntel?.total_orders || 0}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Lifetime Value</span>
                          <span className="font-semibold text-gray-800">৳{customerIntel?.lifetime_value || 0}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Last Purchase</span>
                          <span className="font-semibold text-gray-800">{daysSinceLastOrder} days ago</span>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="text-xs font-semibold text-gray-700 mb-1">AI Alert</div>
                          <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
                            {daysSinceLastOrder >= 30 && <li>Inactive / Win-back candidate</li>}
                            {Number(customerIntel?.avg_order_value || 0) >= 3000 && <li>High average order value</li>}
                            {Number(customerIntel?.total_orders || 0) <= 1 && <li>New customer: build trust</li>}
                            {daysSinceLastOrder < 30 && <li>Refill reminder opportunity</li>}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Loading customer info...</div>
                    )}

                    {(selectedTask as any).recommendations && (selectedTask as any).recommendations.length > 0 && (
                      <div className="mt-4 bg-gray-50 border rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-800 mb-2">Recommended Products</div>
                        <ul className="space-y-2">
                          {(selectedTask as any).recommendations.slice(0, 5).map((rec: any, idx: number) => (
                            <li key={idx} className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                                rec.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {rec.priority}
                              </span>
                              <span className="font-semibold text-gray-800">{rec.recommended_product_name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Softphone Pad (Center) */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">Softphone</h3>
                        <p className="text-xs text-gray-500">Call control (browser UI)</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                        callStatus === 'connected'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : callStatus === 'initiating'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : callStatus === 'failed'
                          ? 'bg-red-50 text-red-800 border-red-200'
                          : callStatus === 'ended'
                          ? 'bg-gray-50 text-gray-700 border-gray-200'
                          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                      }`}>
                        {callStatus}
                      </span>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Dial</label>
                      <input
                        value={dialNumber}
                        onChange={(e) => setDialNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Customer phone"
                        disabled={callStatus === 'connected' || callStatus === 'initiating'}
                      />
                      {telephonyInfo?.mode === 'mock' && (
                        <div className="mt-2 text-xs text-gray-600">
                          Telephony: mock mode (set Bracknet env to go live)
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {['1','2','3','4','5','6','7','8','9','*','0','#'].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDialNumber((v) => `${v}${d}`)}
                          className="py-3 border rounded-lg hover:bg-gray-50 font-semibold"
                          disabled={callStatus === 'connected' || callStatus === 'initiating'}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      {callStatus !== 'connected' ? (
                        <button
                          onClick={handleInitiateCall}
                          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                          disabled={!dialNumber || callStatus === 'initiating' || agentStatus === 'break'}
                        >
                          <FaPhone /> Call
                        </button>
                      ) : (
                        <button
                          onClick={handleEndCallUi}
                          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                        >
                          Hangup
                        </button>
                      )}
                    </div>

                    {/* Mark as Called Today Button */}
                    <div className="mt-4">
                      {calledToday ? (
                        <div className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-lg font-semibold flex items-center justify-center gap-2 border border-green-300">
                          <FaCheckCircle /> Called Today ✓
                        </div>
                      ) : (
                        <button
                          onClick={handleMarkAsCalled}
                          disabled={markingAsCalled || callStatus === 'initiating'}
                          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {markingAsCalled ? (
                            <>
                              <span className="animate-spin">⏳</span> Marking...
                            </>
                          ) : (
                            <>
                              <FaCheckCircle /> Mark as Called Today
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <button
                        onClick={() => setIsMuted((v) => !v)}
                        className={`px-3 py-2 rounded-lg text-sm border ${isMuted ? 'bg-gray-100' : 'bg-white'}`}
                        disabled={callStatus !== 'connected'}
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => setIsOnHold((v) => !v)}
                        className={`px-3 py-2 rounded-lg text-sm border ${isOnHold ? 'bg-gray-100' : 'bg-white'}`}
                        disabled={callStatus !== 'connected'}
                      >
                        Hold
                      </button>
                      <button
                        onClick={() => setIsRecording((v) => !v)}
                        className={`px-3 py-2 rounded-lg text-sm border ${isRecording ? 'bg-gray-100' : 'bg-white'}`}
                        disabled={callStatus !== 'connected'}
                      >
                        Record
                      </button>
                    </div>

                    {telephonyInfo?.telephonyCallId && (
                      <div className="mt-4 text-xs text-gray-600 border-t pt-3">
                        <div>Telephony Call ID: {telephonyInfo.telephonyCallId}</div>
                        {telephonyInfo.externalCallId && <div>External Call ID: {telephonyInfo.externalCallId}</div>}
                      </div>
                    )}
                  </div>

                  {/* AI Script Panel */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">AI Script</h3>
                        <p className="text-xs text-gray-500">Suggested talking points</p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                        {suggestedScript?.scriptKey || 'default'}
                      </span>
                    </div>

                    {suggestedScript ? (
                      <div className="space-y-4">
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <div className="text-sm font-semibold text-gray-800">{suggestedScript.main.title}</div>
                          <div className="text-xs text-gray-600">Goal: {suggestedScript.main.goal}</div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Opening Line</div>
                          <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
                            {suggestedScript.opening.slice(0, 3).map((l, idx) => (
                              <li key={idx}>{l}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Main Script</div>
                          <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
                            {suggestedScript.main.lines.map((l, idx) => (
                              <li key={idx}>{l}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Objection Helper</div>
                          <div className="space-y-2">
                            {suggestedScript.objectionHandling.map((o, idx) => (
                              <div key={idx} className="border rounded-lg p-3">
                                <div className="text-xs font-semibold text-gray-700">{o.objection}</div>
                                <div className="text-sm text-gray-800">{o.reply}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Closing</div>
                          <ul className="text-sm text-gray-800 list-disc list-inside space-y-1">
                            {suggestedScript.ending.map((l, idx) => (
                              <li key={idx}>{l}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Loading suggested script...</div>
                    )}
                  </div>
                </div>

                {/* Bottom Panel: Outcome + Notes + Follow-up */}
                <div className="px-6 pb-6">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Call Notes & Outcome</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-1">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Outcome (required)</div>
                        <div className="space-y-2 text-sm">
                          {[
                            { v: 'order_placed', label: 'Ordered' },
                            { v: 'callback', label: 'Follow-up' },
                            { v: 'not_interested', label: 'Not Interested' },
                            { v: 'price_issue', label: 'Price Issue' },
                            { v: 'no_answer', label: 'No Response' },
                          ].map((o) => (
                            <label key={o.v} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="outcome"
                                value={o.v}
                                checked={outcome === o.v}
                                onChange={(e) => setOutcome(e.target.value)}
                              />
                              <span>{o.label}</span>
                            </label>
                          ))}
                        </div>

                        {outcome === 'callback' && (
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up time</label>
                            <input
                              type="datetime-local"
                              value={followUpAt}
                              onChange={(e) => setFollowUpAt(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">Saved into notes for now</div>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Write short notes (customer needs, objections, next steps)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-6 border-t flex gap-3">
                <button
                  onClick={() => {
                    const mergedNotes = `${notes || ''}${followUpAt ? `\n[Follow-up] ${followUpAt}` : ''}`.trim();
                    handleCompleteTask(outcome, mergedNotes);
                    handleEndCallUi();
                  }}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  disabled={!outcome}
                >
                  Complete Task
                </button>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    handleEndCallUi();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
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
            onUpdate={() => {
              loadDashboard();
            }}
          />
        )}

        {/* Unified Call Action Modal */}
        {showCallActionModal && selectedLeadForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaPhone className="text-green-600" />
                Log Call
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Customer: <strong>{selectedLeadForAction.name || `Customer #${selectedLeadForAction.id}`}</strong>
                {selectedLeadForAction.phone && <span className="ml-2 text-gray-500">({selectedLeadForAction.phone})</span>}
              </p>
              
              <div className="space-y-4">
                {/* Call Outcome - Required */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Call Outcome <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={callActionOutcome}
                    onChange={(e) => setCallActionOutcome(e.target.value as any)}
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
                    value={callActionNotes}
                    onChange={(e) => setCallActionNotes(e.target.value)}
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
                        value={callActionFollowUpDate}
                        onChange={(e) => setCallActionFollowUpDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Date"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={callActionFollowUpTime}
                        onChange={(e) => setCallActionFollowUpTime(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        placeholder="Time"
                      />
                    </div>
                  </div>
                  {callActionFollowUpDate && (
                    <p className="text-xs text-blue-600 mt-1">
                      A follow-up task will be created for {callActionFollowUpDate}
                      {callActionFollowUpTime && ` at ${callActionFollowUpTime}`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmitCallAction}
                  disabled={savingCallAction || !callActionNotes.trim() || !callActionOutcome}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCallAction ? 'Saving...' : <><FaCheckCircle /> Save Call Log</>}
                </button>
                <button
                  onClick={() => {
                    setShowCallActionModal(false);
                    setSelectedLeadForAction(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Follow-Up Modal */}
        {showLeadFollowUpModal && selectedLeadForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-600" />
                Schedule Follow-up
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Set follow-up for: <strong>{selectedLeadForAction.name || `Customer #${selectedLeadForAction.id}`}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date *</label>
                  <input
                    type="date"
                    value={leadFollowUpDate}
                    onChange={(e) => setLeadFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
                  <input
                    type="time"
                    value={leadFollowUpTime}
                    onChange={(e) => setLeadFollowUpTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={leadFollowUpNotes}
                    onChange={(e) => setLeadFollowUpNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Any notes for the follow-up..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveLeadFollowUp}
                  disabled={savingLeadAction || !leadFollowUpDate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingLeadAction ? 'Saving...' : <><FaCalendarAlt /> Schedule</>}
                </button>
                <button
                  onClick={() => {
                    setShowLeadFollowUpModal(false);
                    setSelectedLeadForAction(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Notes Modal */}
        {showLeadNotesModal && selectedLeadForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaStickyNote className="text-gray-600" />
                Add Call Notes
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Notes for: <strong>{selectedLeadForAction.name || `Customer #${selectedLeadForAction.id}`}</strong>
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Call Notes *</label>
                <textarea
                  value={leadCallNotes}
                  onChange={(e) => setLeadCallNotes(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Summarize the call... What was discussed?"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveLeadNotes}
                  disabled={savingLeadAction || !leadCallNotes.trim()}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingLeadAction ? 'Saving...' : <><FaStickyNote /> Save Notes</>}
                </button>
                <button
                  onClick={() => {
                    setShowLeadNotesModal(false);
                    setSelectedLeadForAction(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lead Outcome Modal */}
        {showLeadOutcomeModal && selectedLeadForAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FaThumbsUp className="text-indigo-600" />
                Set Call Outcome
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Outcome for: <strong>{selectedLeadForAction.name || `Customer #${selectedLeadForAction.id}`}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Call Outcome *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLeadCallOutcome('positive')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        leadCallOutcome === 'positive' 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <FaThumbsUp className="text-xl text-green-600" />
                      <span className="text-sm font-medium">Positive</span>
                    </button>
                    
                    <button
                      onClick={() => setLeadCallOutcome('negative')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        leadCallOutcome === 'negative' 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-gray-200 hover:border-red-300'
                      }`}
                    >
                      <FaThumbsDown className="text-xl text-red-600" />
                      <span className="text-sm font-medium">Negative</span>
                    </button>
                    
                    <button
                      onClick={() => setLeadCallOutcome('neutral')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        leadCallOutcome === 'neutral' 
                          ? 'border-gray-500 bg-gray-50 text-gray-700' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <span className="text-xl">➖</span>
                      <span className="text-sm font-medium">Neutral</span>
                    </button>
                    
                    <button
                      onClick={() => setLeadCallOutcome('no_answer')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                        leadCallOutcome === 'no_answer' 
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      <span className="text-xl">📵</span>
                      <span className="text-sm font-medium">No Answer</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={leadOutcomeNotes}
                    onChange={(e) => setLeadOutcomeNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Additional details..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveLeadOutcome}
                  disabled={savingLeadAction || !leadCallOutcome}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingLeadAction ? 'Saving...' : <><FaCheckCircle /> Save Outcome</>}
                </button>
                <button
                  onClick={() => {
                    setShowLeadOutcomeModal(false);
                    setSelectedLeadForAction(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
