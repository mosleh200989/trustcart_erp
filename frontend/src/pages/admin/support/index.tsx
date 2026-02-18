import { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';

interface SupportTicket {
  id: number;
  customerId: string;
  customerEmail: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  severity?: string;
  supportGroup?: string;
  firstResponseDueAt?: string | null;
  resolutionDueAt?: string | null;
  resolvedAt?: string | null;
  slaBreached?: boolean;
  assignedTo: number | null;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSupport() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [routingOptions, setRoutingOptions] = useState<{ groups: string[]; severities: string[] }>({
    groups: ['general', 'billing', 'delivery', 'account', 'technical'],
    severities: ['low', 'medium', 'high', 'critical'],
  });

  useEffect(() => {
    fetchTickets();
    fetchRoutingOptions();
  }, []);

  const fetchRoutingOptions = async () => {
    try {
      const res = await apiClient.get('/support/routing/options');
      if (res?.data?.groups && res?.data?.severities) {
        setRoutingOptions(res.data);
      }
    } catch {
      // keep defaults
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/support/all');
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.response || '');
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setReplyText('');
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    try {
      await apiClient.put(`/support/${selectedTicket.id}/reply`, {
        response: replyText,
        status: 'in_progress'
      });
      await fetchTickets();
      closeModal();
    } catch (error) {
      console.error('Error replying to ticket:', error);
      toast.error('Failed to send reply');
    }
  };

  const updateStatus = async (ticketId: number, newStatus: string) => {
    try {
      await apiClient.put(`/support/${ticketId}/status`, { status: newStatus });
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        closeModal();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const updatePriority = async (ticketId: number, newPriority: string) => {
    try {
      await apiClient.put(`/support/${ticketId}/priority`, { priority: newPriority });
      await fetchTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const updateRouting = async (ticketId: number, patch: { supportGroup?: string; severity?: string }) => {
    try {
      await apiClient.put(`/support/${ticketId}/routing`, patch);
      await fetchTickets();
    } catch (error) {
      console.error('Error updating routing:', error);
      toast.error('Failed to update routing');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
    return true;
  });

  const fmtDateTime = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
  };

  const slaBadge = (ticket: SupportTicket) => {
    if (ticket.slaBreached) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.open;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: any = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };
    return colors[priority] || colors.low;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <button
            onClick={fetchTickets}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        {loading ? (
          <div className="text-center py-8">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tickets found</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{ticket.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{ticket.customerEmail}</div>
                      {ticket.customerId && (
                        <div className="text-xs text-gray-500">ID: {ticket.customerId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{ticket.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={ticket.priority}
                        onChange={(e) => updatePriority(ticket.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded border-0 ${getPriorityBadge(ticket.priority)}`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={ticket.supportGroup || 'general'}
                        onChange={(e) => updateRouting(ticket.id, { supportGroup: e.target.value })}
                        className="px-2 py-1 text-xs font-semibold rounded border border-gray-200"
                      >
                        {routingOptions.groups.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={ticket.severity || 'medium'}
                        onChange={(e) => updateRouting(ticket.id, { severity: e.target.value })}
                        className="px-2 py-1 text-xs font-semibold rounded border border-gray-200"
                      >
                        {routingOptions.severities.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openTicketDetails(ticket)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {ticket.status !== 'closed' && (
                        <button
                          onClick={() => updateStatus(ticket.id, 'closed')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Ticket #{selectedTicket.id}</h2>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityBadge(selectedTicket.priority)}`}>
                        {selectedTicket.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${slaBadge(selectedTicket)}`}>
                        {selectedTicket.slaBreached ? 'SLA BREACHED' : 'SLA OK'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                      <div>
                        <div className="text-xs text-gray-500">Support Group</div>
                        <div className="font-medium">{selectedTicket.supportGroup || 'general'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Severity</div>
                        <div className="font-medium">{selectedTicket.severity || 'medium'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">First Response Due</div>
                        <div className="font-medium">{fmtDateTime(selectedTicket.firstResponseDueAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Resolution Due</div>
                        <div className="font-medium">{fmtDateTime(selectedTicket.resolutionDueAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Responded At</div>
                        <div className="font-medium">{fmtDateTime(selectedTicket.respondedAt)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Resolved At</div>
                        <div className="font-medium">{fmtDateTime(selectedTicket.resolvedAt)}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium">{selectedTicket.customerEmail}</span>
                    </div>
                    {selectedTicket.customerId && (
                      <div>
                        <span className="text-gray-600">Customer ID:</span>
                        <span className="ml-2 font-medium">{selectedTicket.customerId}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedTicket.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Updated:</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedTicket.updatedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ticket Content */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Subject</h3>
                  <p className="text-gray-800">{selectedTicket.subject}</p>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Customer Message</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                {/* Admin Response */}
                {selectedTicket.response && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Your Response</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-800 whitespace-pre-wrap">{selectedTicket.response}</p>
                      {selectedTicket.respondedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Responded at: {new Date(selectedTicket.respondedAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">
                      {selectedTicket.response ? 'Update Response' : 'Send Response'}
                    </h3>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={5}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-between">
                  <div className="flex gap-2">
                    {selectedTicket.status === 'open' && (
                      <button
                        onClick={() => updateStatus(selectedTicket.id, 'in_progress')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Mark In Progress
                      </button>
                    )}
                    {selectedTicket.status === 'in_progress' && (
                      <button
                        onClick={() => updateStatus(selectedTicket.id, 'resolved')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <button
                        onClick={() => updateStatus(selectedTicket.id, 'closed')}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    {selectedTicket.status !== 'closed' && (
                      <button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Send Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
