import { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, Search, Clock, Users, Video, MapPin, CheckCircle, X } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';

interface Meeting {
  id: number;
  title: string;
  customer?: { id: number; name: string };
  deal?: { id: number; name: string };
  organizer: { id: number; name: string };
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  status: string;
  attendees?: number[];
}

const MeetingScheduler = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [currentWeek]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/crm/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch meetings:', response.statusText);
        setMeetings([]);
        return;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setMeetings(data);
      } else {
        console.error('Meetings API returned non-array:', data);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentWeek), i));

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return format(meetingDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meeting Scheduler</h1>
              <p className="text-sm text-gray-600 mt-1">Schedule and manage customer meetings</p>
            </div>
            <button
              onClick={() => setShowMeetingModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule Meeting
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">Scheduled</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {meetings.filter(m => m.status === 'scheduled').length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-700 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {meetings.filter(m => m.status === 'completed').length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-700 font-medium">This Week</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {meetings.filter(m => {
                  const meetingDate = new Date(m.startTime);
                  return meetingDate >= weekDays[0] && meetingDate <= weekDays[6];
                }).length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-orange-700 font-medium">Today</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {getMeetingsForDay(new Date()).length}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-lg ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
            >
              List View
            </button>
            <div className="flex-1"></div>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 font-medium text-gray-700">
              {format(weekDays[0], 'MMM dd')} - {format(weekDays[6], 'MMM dd, yyyy')}
            </span>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : view === 'calendar' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {weekDays.map((day, idx) => (
                  <div key={idx} className="bg-white">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">{format(day, 'EEE')}</p>
                      <p className="text-2xl font-bold text-gray-900">{format(day, 'd')}</p>
                    </div>
                    <div className="p-2 min-h-[300px] space-y-2">
                      {getMeetingsForDay(day).map(meeting => (
                        <div key={meeting.id} className="bg-blue-50 border border-blue-200 rounded p-2 hover:shadow-md transition-shadow cursor-pointer">
                          <p className="text-xs font-medium text-blue-900 mb-1">{meeting.title}</p>
                          <p className="text-xs text-blue-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(meeting.startTime), 'h:mm a')}
                          </p>
                          {meeting.customer && (
                            <p className="text-xs text-blue-600 mt-1">{meeting.customer.name}</p>
                          )}
                          {meeting.meetingLink && (
                            <Video className="w-3 h-3 text-blue-600 mt-1" />
                          )}
                        </div>
                      ))}
                      {getMeetingsForDay(day).length === 0 && (
                        <button
                          onClick={() => {
                            setSelectedDate(day);
                            setShowMeetingModal(true);
                          }}
                          className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-xs text-gray-400 hover:border-blue-400 hover:text-blue-600"
                        >
                          + Add Meeting
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map(meeting => (
                <div key={meeting.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(meeting.status)}`}>
                          {meeting.status}
                        </span>
                      </div>
                      {meeting.customer && (
                        <p className="text-gray-600 mb-1">Customer: <span className="font-medium">{meeting.customer.name}</span></p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {format(new Date(meeting.startTime), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {meeting.location}
                          </span>
                        )}
                        {meeting.meetingLink && (
                          <span className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            Video Meeting
                          </span>
                        )}
                      </div>
                      {meeting.agenda && (
                        <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">{meeting.agenda}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {meetings.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No meetings scheduled</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meeting Modal */}
        {showMeetingModal && (
          <MeetingModal
            selectedDate={selectedDate}
            onClose={() => {
              setShowMeetingModal(false);
              setSelectedDate(null);
            }}
            onSave={() => {
              setShowMeetingModal(false);
              setSelectedDate(null);
              fetchMeetings();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Meeting Creation Modal
const MeetingModal = ({ selectedDate, onClose, onSave }: { selectedDate: Date | null; onClose: () => void; onSave: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    dealId: '',
    startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    startTime: '',
    endTime: '',
    timezone: 'UTC',
    location: '',
    meetingLink: '',
    agenda: '',
  });
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:3001/api/customers?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.startDate}T${formData.endTime}`);

      await fetch('http://localhost:3001/api/crm/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          customerId: formData.customerId ? parseInt(formData.customerId) : undefined,
          dealId: formData.dealId ? parseInt(formData.dealId) : undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          timezone: formData.timezone,
          location: formData.location,
          meetingLink: formData.meetingLink,
          agenda: formData.agenda,
        }),
      });
      onSave();
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Schedule Meeting</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Product Demo Meeting"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
                <option value="CST">CST</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Office, Conference Room A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
              <input
                type="url"
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://zoom.us/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agenda</label>
            <textarea
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Meeting agenda and topics to discuss..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Schedule Meeting
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

export default MeetingScheduler;
