import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface CustomDealStage {
  id: number;
  name: string;
  color: string;
  position: number;
  defaultProbability: number;
  isActive: boolean;
  isSystem: boolean;
  pipelineId: number;
  stageType: 'open' | 'won' | 'lost';
  autoMoveAfterDays?: number;
  requiredFields: string[];
}

interface SalesPipeline {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
  isActive: boolean;
  stages?: CustomDealStage[];
}

export default function PipelineSettingsPage() {
  const [pipelines, setPipelines] = useState<SalesPipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [stages, setStages] = useState<CustomDealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<CustomDealStage | null>(null);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadStages(selectedPipeline);
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<SalesPipeline[]>('/crm/pipelines');
      const data = Array.isArray(res.data) ? res.data : [];
      setPipelines(data);
      if (res.data && res.data.length > 0) {
        const defaultPipeline = res.data.find(p => p.isDefault) || res.data[0];
        setSelectedPipeline(defaultPipeline.id);
      }
    } catch (error) {
      console.error('Failed to load pipelines', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStages = async (pipelineId: number) => {
    try {
      const res = await apiClient.get<CustomDealStage[]>(`/crm/pipelines/${pipelineId}/stages`);
      const data = Array.isArray(res.data) ? res.data : [];
      setStages(data);
    } catch (error) {
      console.error('Failed to load stages', error);
      setStages([]);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedPipeline) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedStages = items.map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setStages(updatedStages);

    try {
      await apiClient.post(`/crm/pipelines/${selectedPipeline}/stages/reorder`, {
        stageOrders: updatedStages.map(s => ({ id: s.id, position: s.position })),
      });
    } catch (error) {
      console.error('Failed to reorder stages', error);
      loadStages(selectedPipeline);
    }
  };

  const handleSaveStage = async (stageData: Partial<CustomDealStage>) => {
    if (!selectedPipeline) return;

    try {
      if (editingStage) {
        await apiClient.put(`/crm/pipelines/stages/${editingStage.id}`, stageData);
      } else {
        await apiClient.post(`/crm/pipelines/stages`, {
          ...stageData,
          pipelineId: selectedPipeline,
        });
      }
      loadStages(selectedPipeline);
      setShowStageModal(false);
      setEditingStage(null);
    } catch (error) {
      console.error('Failed to save stage', error);
      alert('Failed to save stage');
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Are you sure you want to delete this stage?')) return;

    try {
      await apiClient.delete(`/crm/pipelines/stages/${stageId}`);
      if (selectedPipeline) loadStages(selectedPipeline);
    } catch (error) {
      console.error('Failed to delete stage', error);
      alert('Failed to delete stage. System stages cannot be deleted.');
    }
  };

  const handleSavePipeline = async (pipelineData: Partial<SalesPipeline>) => {
    try {
      const response = await apiClient.post('/crm/pipelines', pipelineData);
      if (response.status === 200 || response.status === 201) {
        await loadPipelines(); // Wait for pipelines to reload
        setShowPipelineModal(false);
      } else {
        alert('Failed to save pipeline');
      }
    } catch (error) {
      console.error('Failed to save pipeline', error);
      alert('Failed to save pipeline');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Pipeline Management</h1>
          <button
            onClick={() => setShowPipelineModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            New Pipeline
          </button>
        </div>

        {/* Pipeline Selector */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Pipeline</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            value={selectedPipeline || ''}
            onChange={(e) => setSelectedPipeline(Number(e.target.value))}
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name} {pipeline.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Stages Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Deal Stages</h2>
            <button
              onClick={() => {
                setEditingStage(null);
                setShowStageModal(true);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Stage
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {stages
                      .sort((a, b) => a.position - b.position)
                      .map((stage, index) => (
                        <Draggable key={stage.id} draggableId={String(stage.id)} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="border rounded-lg p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className="text-gray-400">☰</div>
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800">{stage.name}</div>
                                  <div className="text-sm text-gray-500">
                                    Probability: {stage.defaultProbability}% • Type: {stage.stageType}
                                    {stage.isSystem && <span className="ml-2 text-blue-600">(System)</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setShowStageModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded"
                                >
                                  Edit
                                </button>
                                {!stage.isSystem && (
                                  <button
                                    onClick={() => handleDeleteStage(stage.id)}
                                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Stage Modal */}
        {showStageModal && (
          <StageModal
            stage={editingStage}
            onSave={handleSaveStage}
            onClose={() => {
              setShowStageModal(false);
              setEditingStage(null);
            }}
          />
        )}

        {/* Pipeline Modal */}
        {showPipelineModal && (
          <PipelineModal
            onSave={handleSavePipeline}
            onClose={() => setShowPipelineModal(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function StageModal({
  stage,
  onSave,
  onClose,
}: {
  stage: CustomDealStage | null;
  onSave: (data: Partial<CustomDealStage>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    color: stage?.color || '#3B82F6',
    defaultProbability: stage?.defaultProbability || 50,
    stageType: stage?.stageType || 'open',
    autoMoveAfterDays: stage?.autoMoveAfterDays || undefined,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">{stage ? 'Edit Stage' : 'New Stage'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-10"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Probability (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.defaultProbability}
              onChange={(e) => setFormData({ ...formData, defaultProbability: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.stageType}
              onChange={(e) => setFormData({ ...formData, stageType: e.target.value as any })}
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto Move After (days)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.autoMoveAfterDays || ''}
              onChange={(e) => setFormData({ ...formData, autoMoveAfterDays: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function PipelineModal({
  onSave,
  onClose,
}: {
  onSave: (data: Partial<SalesPipeline>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">New Pipeline</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">
              Set as default pipeline
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
