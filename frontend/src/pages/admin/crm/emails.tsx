import { useState, useEffect } from 'react';
import { Plus, Send, Mail, Eye, MousePointerClick, Reply, X, Search, Filter } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { format } from 'date-fns';
import { apiUrl } from '@/config/backend';

interface Email {
  id: number;
  customer: { id: number; name: string };
  subject: string;
  body: string;
  toAddress: string;
  sentAt: string;
  opened: boolean;
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  clicked: boolean;
  clickedLinks?: string[];
  replied: boolean;
  repliedAt?: string;
  bounced: boolean;
  templateUsed?: string;
}

const EmailCampaigns = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [stats, setStats] = useState({ sent: 0, opened: 0, clicked: 0, replied: 0, openRate: 0, clickRate: 0 });

  useEffect(() => {
    fetchEmails();
    fetchStats();
  }, [filterStatus]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/emails'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch emails:', response.statusText);
        setEmails([]);
        return;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setEmails(data);
      } else {
        console.error('Emails API returned non-array:', data);
        setEmails([]);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/emails/stats'), {
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

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'opened') return matchesSearch && email.opened;
    if (filterStatus === 'clicked') return matchesSearch && email.clicked;
    if (filterStatus === 'replied') return matchesSearch && email.replied;
    if (filterStatus === 'bounced') return matchesSearch && email.bounced;
    
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
              <p className="text-sm text-gray-600 mt-1">Send and track email campaigns to customers</p>
            </div>
            <button
              onClick={() => setShowEmailModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Send Email
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-blue-700 font-medium">Sent</p>
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.sent || emails.length}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-green-700 font-medium">Opened</p>
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.opened || emails.filter(e => e.opened).length}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-purple-700 font-medium">Clicked</p>
                <MousePointerClick className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.clicked || emails.filter(e => e.clicked).length}</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-orange-700 font-medium">Replied</p>
                <Reply className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{stats.replied || emails.filter(e => e.replied).length}</p>
            </div>

            <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
              <p className="text-sm text-teal-700 font-medium mb-1">Open Rate</p>
              <p className="text-2xl font-bold text-teal-900">
                {emails.length > 0 ? ((emails.filter(e => e.opened).length / emails.length) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <p className="text-sm text-indigo-700 font-medium mb-1">Click Rate</p>
              <p className="text-2xl font-bold text-indigo-900">
                {emails.length > 0 ? ((emails.filter(e => e.clicked).length / emails.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Emails</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="replied">Replied</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>
        </div>

        {/* Email List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEmails.map(email => (
                <div key={email.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{email.subject}</h3>
                        <div className="flex items-center gap-2">
                          {email.opened && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Opened {email.openCount}x
                            </span>
                          )}
                          {email.clicked && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <MousePointerClick className="w-3 h-3" /> Clicked
                            </span>
                          )}
                          {email.replied && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Reply className="w-3 h-3" /> Replied
                            </span>
                          )}
                          {email.bounced && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              Bounced
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-1">
                        To: <span className="font-medium">{email.customer.name}</span> ({email.toAddress})
                      </p>
                      <p className="text-sm text-gray-500">
                        Sent: {format(new Date(email.sentAt), 'MMM dd, yyyy h:mm a')}
                      </p>
                      {email.templateUsed && (
                        <p className="text-xs text-gray-500 mt-1">Template: {email.templateUsed}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Body Preview */}
                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-sm text-gray-700 line-clamp-2">{email.body}</p>
                  </div>

                  {/* Tracking Details */}
                  {(email.firstOpenedAt || (email?.clickedLinks?.length as number) > 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                      {email.firstOpenedAt && (
                        <p>First opened: {format(new Date(email.firstOpenedAt), 'MMM dd, h:mm a')}</p>
                      )}
                      {email.lastOpenedAt && email.openCount > 1 && (
                        <p>Last opened: {format(new Date(email.lastOpenedAt), 'MMM dd, h:mm a')}</p>
                      )}
                      {email.clickedLinks && email.clickedLinks.length > 0 && (
                        <p>Clicked links: {email.clickedLinks.join(', ')}</p>
                      )}
                      {email.repliedAt && (
                        <p>Replied: {format(new Date(email.repliedAt), 'MMM dd, h:mm a')}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredEmails.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No emails found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <EmailModal
            onClose={() => setShowEmailModal(false)}
            onSave={() => {
              setShowEmailModal(false);
              fetchEmails();
              fetchStats();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Email Creation Modal
const EmailModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    subject: '',
    body: '',
    templateUsed: '',
  });
  const [customers, setCustomers] = useState<any[]>([]);

  const templates = [
    { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to TrustCart!', body: 'Dear {{name}},\n\nWelcome to TrustCart! We are excited to have you on board.\n\nBest regards,\nTrustCart Team' },
    { id: 'follow-up', name: 'Follow-up', subject: 'Following up on our conversation', body: 'Hi {{name}},\n\nI wanted to follow up on our recent conversation about {{topic}}.\n\nLooking forward to hearing from you.\n\nBest regards' },
    { id: 'quote', name: 'Quote Sent', subject: 'Your Quote is Ready', body: 'Dear {{name}},\n\nPlease find attached your quote. We look forward to working with you.\n\nBest regards' },
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/customers?limit=100'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const customer = customers.find(c => c.id === parseInt(formData.customerId));
      setFormData({
        ...formData,
        subject: template.subject,
        body: template.body.replace('{{name}}', customer?.name || ''),
        templateUsed: template.name,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === parseInt(formData.customerId));
    
    try {
      const token = localStorage.getItem('authToken');
      await fetch(apiUrl('/crm/emails'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: parseInt(formData.customerId),
          subject: formData.subject,
          body: formData.body,
          toAddress: customer?.email || '',
          templateUsed: formData.templateUsed,
          sentAt: new Date().toISOString(),
        }),
      });
      onSave();
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Send Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={formData.templateUsed}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Custom Email</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Email subject..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Email body..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Email
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

export default EmailCampaigns;
