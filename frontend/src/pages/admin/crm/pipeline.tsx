import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Filter, Search, DollarSign, Calendar, User, Tag, TrendingUp, Eye, Edit, Trash2, X } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { apiUrl } from '@/config/backend';
import { useToast } from '@/contexts/ToastContext';

interface Deal {
  id: number;
  name: string;
  customer?: { id: number; name: string };
  owner?: { id: number; name: string };
  value: number;
  currency: string;
  probability: number;
  expectedCloseDate: string;
  stage: string;
  status: string;
  priority: string;
  tags: string[];
  description?: string;
}

interface Stage {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  probability: number;
  color: string;
  isClosed: boolean;
  isWon: boolean;
}

const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Draggable draggableId={deal.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg rotate-2' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 flex-1 mr-2">{deal.name}</h4>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700">
                    <Eye className="w-3 h-3 mr-2" /> View
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-gray-700">
                    <Edit className="w-3 h-3 mr-2" /> Edit
                  </button>
                  <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center text-sm text-red-600">
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {deal.customer && (
            <p className="text-sm text-gray-600 mb-2 flex items-center">
              <User className="w-3 h-3 mr-1" />
              {deal.customer.name}
            </p>
          )}

          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-green-600">
              {deal.currency} {deal.value.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">{deal.probability}% prob</span>
          </div>

          {deal.expectedCloseDate && (
            <p className="text-xs text-gray-500 flex items-center mb-2">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </p>
          )}

          {deal.owner && (
            <p className="text-xs text-gray-500 mb-2">Owner: {deal.owner.name}</p>
          )}

          {deal.tags && deal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {deal.tags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {deal.tags.length > 2 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  +{deal.tags.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className={`text-xs px-2 py-1 rounded ${
              deal.priority === 'high' ? 'bg-red-100 text-red-700' :
              deal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {deal.priority}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const Pipeline = () => {
  const toast = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<{ [key: string]: Deal[] }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [stats, setStats] = useState({ totalValue: 0, totalDeals: 0, avgProbability: 0 });

  useEffect(() => {
    fetchStages();
    fetchDeals();
    fetchStats();
  }, [filterOwner, filterPriority]);

  const fetchStages = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/deal-stages'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch stages:', response.statusText);
        setStages([]);
        return;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setStages(data.sort((a: Stage, b: Stage) => a.displayOrder - b.displayOrder));
      } else {
        console.error('Stages API returned non-array:', data);
        setStages([]);
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      setStages([]);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams();
      if (filterOwner) params.append('ownerId', filterOwner);
      if (filterPriority) params.append('priority', filterPriority);

      const response = await fetch(apiUrl(`/crm/deals?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch deals:', response.statusText);
        setDeals({});
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Deals API returned non-array:', data);
        setDeals({});
        setLoading(false);
        return;
      }

      // Group deals by stage
      const dealsByStage: { [key: string]: Deal[] } = {};
      stages.forEach(stage => {
        dealsByStage[stage.slug] = data.filter((d: Deal) => d.stage === stage.slug);
      });
      setDeals(dealsByStage);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/deals/pipeline-stats'), {
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

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;

    // Update local state
    const newDeals = { ...deals };
    const [movedDeal] = newDeals[sourceStage].splice(source.index, 1);
    movedDeal.stage = destStage;
    
    // Update probability based on new stage
    const newStage = stages.find(s => s.slug === destStage);
    if (newStage) {
      movedDeal.probability = newStage.probability;
    }

    newDeals[destStage].splice(destination.index, 0, movedDeal);
    setDeals(newDeals);

    // Update backend
    try {
      const token = localStorage.getItem('authToken');
      await fetch(apiUrl(`/crm/deals/${draggableId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: destStage, probability: movedDeal.probability }),
      });
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error updating deal:', error);
      // Revert on error
      fetchDeals();
    }
  };

  const filteredDeals = (stageDeals: Deal[]) => {
    if (!searchTerm) return stageDeals;
    return stageDeals.filter(deal =>
      (deal.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deal.customer?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your deals through the sales process</p>
            </div>
            <button
              onClick={() => setShowDealModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Pipeline Value</p>
                  <p className="text-2xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Active Deals</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalDeals}</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Avg Probability</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgProbability}%</p>
                </div>
                <Tag className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search deals or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <select
                    value={filterOwner}
                    onChange={(e) => setFilterOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Owners</option>
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
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilterOwner('');
                      setFilterPriority('');
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Board */}
        <div className="p-6 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 min-w-max">
                {stages.filter(s => !s.isClosed).map((stage) => (
                  <div key={stage.slug} className="flex-shrink-0 w-80">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                      {/* Stage Header */}
                      <div
                        className="p-4 border-b border-gray-200"
                        style={{ backgroundColor: `${stage.color}15` }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: stage.color }}
                          >
                            {deals[stage.slug]?.length || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          ${deals[stage.slug]?.reduce((sum, d) => sum + d.value, 0).toLocaleString() || 0}
                        </p>
                      </div>

                      {/* Deals List */}
                      <Droppable droppableId={stage.slug}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-3 min-h-[500px] max-h-[calc(100vh-400px)] overflow-y-auto ${
                              snapshot.isDraggingOver ? 'bg-blue-50' : ''
                            }`}
                          >
                            {filteredDeals(deals[stage.slug] || []).map((deal, index) => (
                              <DealCard key={deal.id} deal={deal} index={index} />
                            ))}
                            {provided.placeholder}
                            {filteredDeals(deals[stage.slug] || []).length === 0 && (
                              <p className="text-center text-gray-400 text-sm py-8">
                                No deals in this stage
                              </p>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>

        {/* Deal Modal */}
        {showDealModal && (
          <DealModal
            onClose={() => setShowDealModal(false)}
            onSave={() => {
              setShowDealModal(false);
              fetchDeals();
              fetchStats();
            }}
            stages={stages}
            toast={toast}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Deal Creation Modal Component
const DealModal = ({ onClose, onSave, stages, toast }: { onClose: () => void; onSave: () => void; stages: Stage[]; toast: ReturnType<typeof useToast> }) => {
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    value: '',
    stage: 'new',
    priority: 'medium',
    expectedCloseDate: '',
    description: '',
    tags: '',
  });
  const [customers, setCustomers] = useState<any[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(apiUrl('/crm/deals'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          customerId: parseInt(formData.customerId),
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        }),
      });
      
      if (response.ok) {
        onSave(); // Only call onSave after successful creation
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create deal: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Create New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Enterprise Software License"
            />
          </div>

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
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value *</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="10000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {stages.filter(s => !s.isClosed).map(stage => (
                  <option key={stage.slug} value={stage.slug}>{stage.name}</option>
                ))}
              </select>
            </div>

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
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="enterprise, renewal, upsell"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes about this deal..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Deal
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

export default Pipeline;
