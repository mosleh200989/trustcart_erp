import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../layouts/AdminLayout';
import api from '../../../../services/api';
import { useToast } from '@/contexts/ToastContext';
import { 
  User, Mail, Phone, Building2, MapPin, Calendar, 
  DollarSign, TrendingUp, Activity, FileText, CheckSquare,
  Video, MessageSquare, Tag, Clock, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const CustomerView = () => {
  const toast = useToast();
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logType, setLogType] = useState<'call' | 'email' | 'sms'>('call');
  const [logSubject, setLogSubject] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logOutcome, setLogOutcome] = useState('');
  const [logDuration, setLogDuration] = useState<string>('');
  const [logSaving, setLogSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const openLogModal = (type: 'call' | 'email' | 'sms') => {
    setLogType(type);
    setLogSubject('');
    setLogDescription('');
    setLogOutcome('');
    setLogDuration('');
    setLogModalOpen(true);
  };

  const submitLog = async () => {
    if (!id) return;
    try {
      setLogSaving(true);
      await api.post('/crm/activities', {
        type: logType,
        customerId: Number(id),
        subject: logSubject || undefined,
        description: logDescription || undefined,
        outcome: logOutcome || undefined,
        duration: logDuration ? Number(logDuration) : undefined,
        completedAt: new Date().toISOString(),
      });
      setLogModalOpen(false);
      await fetchCustomerData();
      setActiveTab('activity');
    } catch (error) {
      console.error('Failed to log activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLogSaving(false);
    }
  };

  const fetchCustomerData = async () => {
    try {
      const [
        customerRes,
        activitiesRes,
        dealsRes,
        tasksRes,
        meetingsRes,
        quotesRes,
        emailsRes
      ] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/crm/activities?customerId=${id}`),
        api.get(`/crm/deals?customerId=${id}`),
        api.get(`/crm/tasks?customerId=${id}`),
        api.get(`/crm/meetings?customerId=${id}`),
        api.get(`/crm/quotes?customerId=${id}`),
        api.get(`/crm/emails?customerId=${id}`)
      ]);

      setCustomer(customerRes.data);
      setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
      setDeals(dealsRes.data);
      setTasks(tasksRes.data);
      setMeetings(meetingsRes.data);
      setQuotes(quotesRes.data);
      setEmails(emailsRes.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Customer Not Found</h2>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity Timeline', icon: Activity },
    { id: 'deals', label: 'Deals', icon: TrendingUp },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'emails', label: 'Emails', icon: Mail },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Customer Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {customer.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {customer.name} {customer.lastName}
                </h1>
                <div className="flex items-center space-x-4 mt-2 text-gray-600">
                  {customer.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.company && (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      {customer.company}
                    </div>
                  )}
                </div>
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mt-2">
                    {customer.tags.map((tag: string) => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => openLogModal('call')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <Phone className="h-4 w-4 mr-2" />
                Log Call
              </button>
              <button
                onClick={() => openLogModal('email')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <Mail className="h-4 w-4 mr-2" />
                Log Email
              </button>
              <button
                onClick={() => openLogModal('sms')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Log SMS
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Open Deals</div>
              <div className="text-2xl font-bold text-blue-800">
                {deals.filter((d: any) => d.status === 'open').length}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Total Value</div>
              <div className="text-2xl font-bold text-green-800">
                ${deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Open Tasks</div>
              <div className="text-2xl font-bold text-purple-800">
                {tasks.filter((t: any) => t.status !== 'completed').length}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600 font-medium">Activities</div>
              <div className="text-2xl font-bold text-orange-800">
                {activities.length}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm transition
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab customer={customer} />}
            {activeTab === 'activity' && <ActivityTab activities={activities} />}
            {activeTab === 'deals' && <DealsTab deals={deals} />}
            {activeTab === 'tasks' && <TasksTab tasks={tasks} />}
            {activeTab === 'meetings' && <MeetingsTab meetings={meetings} />}
            {activeTab === 'quotes' && <QuotesTab quotes={quotes} />}
            {activeTab === 'emails' && <EmailsTab emails={emails} />}
          </div>
        </div>

        {logModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-800 capitalize">Log {logType}</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => (logSaving ? null : setLogModalOpen(false))}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm text-gray-600">Subject</label>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={logSubject}
                    onChange={(e) => setLogSubject(e.target.value)}
                    placeholder="Short summary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Notes</label>
                  <textarea
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    rows={4}
                    value={logDescription}
                    onChange={(e) => setLogDescription(e.target.value)}
                    placeholder="What happened?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600">Outcome</label>
                    <input
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      value={logOutcome}
                      onChange={(e) => setLogOutcome(e.target.value)}
                      placeholder="e.g. connected / no_answer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Duration (sec)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      placeholder="Optional"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={logSaving}
                  onClick={() => setLogModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={logSaving}
                  onClick={submitLog}
                >
                  {logSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Tab Components
const OverviewTab = ({ customer }: any) => (
  <div className="grid grid-cols-2 gap-6">
    <div>
      <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
      <dl className="space-y-3">
        <div>
          <dt className="text-sm text-gray-500">Email</dt>
          <dd className="text-sm font-medium">{customer.email || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Phone</dt>
          <dd className="text-sm font-medium">{customer.phone || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Company</dt>
          <dd className="text-sm font-medium">{customer.company || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Address</dt>
          <dd className="text-sm font-medium">{customer.address || 'N/A'}</dd>
        </div>
      </dl>
    </div>
    <div>
      <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
      <dl className="space-y-3">
        <div>
          <dt className="text-sm text-gray-500">Customer Since</dt>
          <dd className="text-sm font-medium">
            {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Lead Source</dt>
          <dd className="text-sm font-medium">{customer.source || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm text-gray-500">Status</dt>
          <dd className="text-sm font-medium">
            <span className={`px-2 py-1 rounded-full text-xs ${
              customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {customer.status || 'Active'}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
);

const ActivityTab = ({ activities }: any) => (
  <div className="space-y-4">
    {activities.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No activities yet</p>
    ) : (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        {activities.map((activity: any, index: number) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-10 pb-6"
          >
            <div className="absolute left-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-800">{activity.type}{activity.subject ? `: ${activity.subject}` : ''}</h4>
                  {activity.outcome && (
                    <p className="text-xs text-gray-500 mt-1">Outcome: {activity.outcome}{activity.duration ? ` • ${activity.duration}s` : ''}</p>
                  )}
                  {activity.description && <p className="text-sm text-gray-600 mt-1">{activity.description}</p>}
                  {activity.recordingUrl && (
                    <audio className="mt-3 w-full" controls src={activity.recordingUrl} />
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

const DealsTab = ({ deals }: any) => (
  <div className="space-y-4">
    {deals.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No deals yet</p>
    ) : (
      deals.map((deal: any) => (
        <div key={deal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-gray-800">{deal.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{deal.stage}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">${deal.value?.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{deal.probability}% probability</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className={`px-2 py-1 rounded-full ${
              deal.status === 'open' ? 'bg-blue-100 text-blue-800' :
              deal.status === 'won' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {deal.status}
            </span>
            {deal.expectedCloseDate && (
              <span className="text-gray-500">
                Expected close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);

const TasksTab = ({ tasks }: any) => (
  <div className="space-y-4">
    {tasks.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No tasks yet</p>
    ) : (
      tasks.map((task: any) => (
        <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <div className="flex items-start space-x-3">
            <CheckSquare className={`h-5 w-5 ${task.status === 'completed' ? 'text-green-500' : 'text-gray-400'}`} />
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                {task.dueDate && (
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full ${
                  task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

const MeetingsTab = ({ meetings }: any) => (
  <div className="space-y-4">
    {meetings.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No meetings yet</p>
    ) : (
      meetings.map((meeting: any) => (
        <div key={meeting.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(meeting.startTime).toLocaleString()}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)} minutes
                </div>
                {meeting.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {meeting.location}
                  </div>
                )}
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${
              meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
              meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {meeting.status}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);

const QuotesTab = ({ quotes }: any) => (
  <div className="space-y-4">
    {quotes.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No quotes yet</p>
    ) : (
      quotes.map((quote: any) => (
        <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-gray-800">{quote.quoteNumber}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Valid until: {new Date(quote.validUntil).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                {quote.currency} {quote.total?.toLocaleString()}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {quote.status}
              </span>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

const EmailsTab = ({ emails }: any) => (
  <div className="space-y-4">
    {emails.length === 0 ? (
      <p className="text-center text-gray-500 py-8">No emails yet</p>
    ) : (
      emails.map((email: any) => (
        <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">{email.subject}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{email.body}</p>
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                <span>{new Date(email.sentAt).toLocaleString()}</span>
                {email.opened && <span className="text-green-600">Opened</span>}
                {email.clicked && <span className="text-blue-600">Clicked</span>}
                {email.replied && <span className="text-purple-600">Replied</span>}
              </div>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

export default CustomerView;
