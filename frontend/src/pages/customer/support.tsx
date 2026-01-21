import { useEffect, useState } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import { auth, support } from '@/services/api';

interface SupportTicket {
  id: number;
  customerId: string | null;
  customerEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: number | null;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const data = await support.list();
        if (data && Array.isArray(data)) {
          setTickets(data);
        }
      } catch (e) {
        console.error('Error loading support tickets:', e);
      }
    };

    loadTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        subject,
        message,
        priority,
      };

      const created = await support.create(payload);
      setTickets((prev) => [created, ...prev]);
      setSubject('');
      setMessage('');
      setPriority('medium');
      setInfo('Support ticket created successfully.');
    } catch (e) {
      console.error('Error creating support ticket:', e);
      setError('Failed to create support ticket.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const normalized = status === 'in_progress' ? 'in-progress' : status;
    const classes = {
      open: 'bg-blue-100 text-blue-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return classes[normalized as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeClass = (priority: string) => {
    const classes = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-gray-600 text-sm">
          Create a new support ticket and track your requests.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Order issue, account question, etc."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm h-24 resize-vertical focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Describe your issue in detail"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Create Ticket'}
          </button>
        </form>

        {/* Tickets List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Tickets</h2>
          
          {tickets.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center">
              <p className="text-gray-500">No support tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white border rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">#{ticket.id} - {ticket.subject}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                    className="w-full sm:w-auto px-3 py-2 sm:py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    {selectedTicket?.id === ticket.id ? 'Hide' : 'View'}
                  </button>
                </div>

                {selectedTicket?.id === ticket.id && (
                  <div className="border-t pt-3 space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Your Message:</h4>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{ticket.message}</p>
                    </div>

                    {ticket.response && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h4 className="font-semibold text-green-800 text-sm mb-2">Support Response:</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{ticket.response}</p>
                        {ticket.respondedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Responded: {new Date(ticket.respondedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {!ticket.response && ticket.status !== 'closed' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          Our support team will respond to your ticket soon.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}

