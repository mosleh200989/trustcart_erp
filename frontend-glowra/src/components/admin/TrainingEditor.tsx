import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaSave, FaTrash } from 'react-icons/fa';

interface TrainingEditorProps {
  value: any;
  onChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

interface ScriptLine {
  speaker: string;
  line: string;
}

interface RolePlay {
  title: string;
  trainingGoal: string[];
  script: ScriptLine[];
  notes: string[];
}

export default function TrainingEditor({ value, onChange, onSave, onCancel, saving }: TrainingEditorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [training, setTraining] = useState<any>(value || { rolePlays: [] });

  useEffect(() => {
    setTraining(value || { rolePlays: [] });
  }, [value]);

  const rolePlays: RolePlay[] = training.rolePlays || [];

  const updateTraining = (newRolePlays: RolePlay[]) => {
    const updated = { ...training, rolePlays: newRolePlays };
    setTraining(updated);
    onChange(updated);
  };

  const updateRolePlay = (index: number, field: keyof RolePlay, newValue: any) => {
    const updated = [...rolePlays];
    updated[index] = { ...updated[index], [field]: newValue };
    updateTraining(updated);
  };

  const addRolePlay = () => {
    const newRolePlay: RolePlay = {
      title: 'New Role Play',
      trainingGoal: [],
      script: [],
      notes: [],
    };
    const updated = [...rolePlays, newRolePlay];
    updateTraining(updated);
    setActiveIndex(updated.length - 1);
  };

  const deleteRolePlay = (index: number) => {
    if (!confirm('Are you sure you want to delete this role play?')) return;
    const updated = rolePlays.filter((_, i) => i !== index);
    updateTraining(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
  };

  const addScriptLine = () => {
    const current = rolePlays[activeIndex];
    if (!current) return;
    const updated = [...(current.script || []), { speaker: 'Agent', line: '' }];
    updateRolePlay(activeIndex, 'script', updated);
  };

  const updateScriptLine = (lineIndex: number, field: 'speaker' | 'line', newValue: string) => {
    const current = rolePlays[activeIndex];
    if (!current) return;
    const updated = [...current.script];
    updated[lineIndex] = { ...updated[lineIndex], [field]: newValue };
    updateRolePlay(activeIndex, 'script', updated);
  };

  const removeScriptLine = (lineIndex: number) => {
    const current = rolePlays[activeIndex];
    if (!current) return;
    const updated = current.script.filter((_, i) => i !== lineIndex);
    updateRolePlay(activeIndex, 'script', updated);
  };

  const currentRolePlay = rolePlays[activeIndex];

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-bold">Edit Training Role Plays</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Role play list */}
        <div className="w-56 border-r bg-gray-50 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {rolePlays.map((rp, index) => (
              <div
                key={index}
                className={`flex items-center group ${
                  activeIndex === index ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => setActiveIndex(index)}
                  className="flex-1 text-left px-4 py-3 text-sm truncate"
                >
                  {rp.title || `Role Play ${index + 1}`}
                </button>
                <button
                  onClick={() => deleteRolePlay(index)}
                  className={`px-2 py-1 mr-2 opacity-0 group-hover:opacity-100 ${
                    activeIndex === index ? 'text-white hover:text-red-200' : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  <FaTrash size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addRolePlay}
            className="m-2 px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center justify-center gap-1 hover:bg-green-700"
          >
            <FaPlus size={12} /> Add Role Play
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentRolePlay ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={currentRolePlay.title || ''}
                  onChange={(e) => updateRolePlay(activeIndex, 'title', e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Role play title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Training Goals (one per line)</label>
                <textarea
                  value={(currentRolePlay.trainingGoal || []).join('\n')}
                  onChange={(e) => {
                    const goals = e.target.value.split('\n').filter(line => line.trim());
                    updateRolePlay(activeIndex, 'trainingGoal', goals);
                  }}
                  className="w-full border rounded-lg p-2 h-24"
                  placeholder="Enter each training goal on a new line..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Script Dialogue</label>
                  <button
                    onClick={addScriptLine}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <FaPlus size={12} /> Add Line
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(currentRolePlay.script || []).map((line, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <select
                        value={line.speaker || 'Agent'}
                        onChange={(e) => updateScriptLine(index, 'speaker', e.target.value)}
                        className="border rounded p-2 text-sm w-28"
                      >
                        <option value="Agent">Agent</option>
                        <option value="Customer">Customer</option>
                        <option value="Trainer">Trainer</option>
                      </select>
                      <input
                        type="text"
                        value={line.line || ''}
                        onChange={(e) => updateScriptLine(index, 'line', e.target.value)}
                        className="flex-1 border rounded p-2 text-sm"
                        placeholder="Dialogue line..."
                      />
                      <button
                        onClick={() => removeScriptLine(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <FaTimes size={14} />
                      </button>
                    </div>
                  ))}
                  {(currentRolePlay.script || []).length === 0 && (
                    <p className="text-gray-400 text-sm italic">No script lines yet. Click "Add Line" to start.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (one per line)</label>
                <textarea
                  value={(currentRolePlay.notes || []).join('\n')}
                  onChange={(e) => {
                    const notes = e.target.value.split('\n').filter(line => line.trim());
                    updateRolePlay(activeIndex, 'notes', notes);
                  }}
                  className="w-full border rounded-lg p-2 h-24"
                  placeholder="Enter notes, one per line..."
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No role plays yet. Click "Add Role Play" to create one.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <FaSave size={14} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
