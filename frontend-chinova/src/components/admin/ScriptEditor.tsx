import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaSave } from 'react-icons/fa';

interface ScriptEditorProps {
  value: any;
  onChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const SCRIPT_SECTIONS = [
  { key: 'commonOpening', label: 'Common Opening' },
  { key: 'callEnding', label: 'Call Ending' },
  { key: 'A', label: 'Script A' },
  { key: 'B', label: 'Script B' },
  { key: 'C', label: 'Script C' },
  { key: 'D', label: 'Script D' },
  { key: 'E', label: 'Script E' },
  { key: 'winBack', label: 'Win Back' },
  { key: 'permanentDeclaration', label: 'Permanent Declaration' },
  { key: 'objectionHandling', label: 'Objection Handling' },
];

export default function ScriptEditor({ value, onChange, onSave, onCancel, saving }: ScriptEditorProps) {
  const [activeSection, setActiveSection] = useState('commonOpening');
  const [scripts, setScripts] = useState<any>(value || {});

  useEffect(() => {
    setScripts(value || {});
  }, [value]);

  const updateScript = (sectionKey: string, field: string, newValue: any) => {
    const updated = {
      ...scripts,
      [sectionKey]: {
        ...scripts[sectionKey],
        [field]: newValue,
      },
    };
    setScripts(updated);
    onChange(updated);
  };

  const updateLines = (sectionKey: string, field: string, text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    updateScript(sectionKey, field, lines);
  };

  const addObjection = () => {
    const current = scripts.objectionHandling?.items || [];
    updateScript('objectionHandling', 'items', [...current, { objection: '', reply: '' }]);
  };

  const updateObjection = (index: number, field: 'objection' | 'reply', newValue: string) => {
    const current = [...(scripts.objectionHandling?.items || [])];
    current[index] = { ...current[index], [field]: newValue };
    updateScript('objectionHandling', 'items', current);
  };

  const removeObjection = (index: number) => {
    const current = [...(scripts.objectionHandling?.items || [])];
    current.splice(index, 1);
    updateScript('objectionHandling', 'items', current);
  };

  const currentSection = scripts[activeSection] || {};
  const isSimpleSection = ['commonOpening', 'callEnding'].includes(activeSection);
  const isObjectionSection = activeSection === 'objectionHandling';
  const isAdvancedSection = !isSimpleSection && !isObjectionSection;

  return (
    <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-bold">Edit Call Script Playbook</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Section tabs */}
        <div className="w-48 border-r bg-gray-50 overflow-y-auto">
          {SCRIPT_SECTIONS.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`w-full text-left px-4 py-3 text-sm ${
                activeSection === section.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Simple sections: commonOpening, callEnding */}
          {isSimpleSection && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={currentSection.title || ''}
                  onChange={(e) => updateScript(activeSection, 'title', e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Section title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lines (one per line)</label>
                <textarea
                  value={(currentSection.lines || []).join('\n')}
                  onChange={(e) => updateLines(activeSection, 'lines', e.target.value)}
                  className="w-full border rounded-lg p-2 h-48"
                  placeholder="Enter each line on a new line..."
                />
              </div>
            </div>
          )}

          {/* Advanced sections: A, B, C, D, E, winBack, permanentDeclaration */}
          {isAdvancedSection && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={currentSection.title || ''}
                  onChange={(e) => updateScript(activeSection, 'title', e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Script title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Goal</label>
                <input
                  type="text"
                  value={currentSection.goal || ''}
                  onChange={(e) => updateScript(activeSection, 'goal', e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Script goal..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Style (comma-separated)</label>
                <input
                  type="text"
                  value={(currentSection.style || []).join(', ')}
                  onChange={(e) => updateScript(activeSection, 'style', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Friendly, Professional, Persuasive"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Script Lines (one per line)</label>
                <textarea
                  value={(currentSection.script || []).join('\n')}
                  onChange={(e) => updateLines(activeSection, 'script', e.target.value)}
                  className="w-full border rounded-lg p-2 h-48"
                  placeholder="Enter each script line on a new line..."
                />
              </div>
            </div>
          )}

          {/* Objection handling section */}
          {isObjectionSection && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={currentSection.title || ''}
                  onChange={(e) => updateScript(activeSection, 'title', e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="Section title..."
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Objections & Replies</label>
                  <button
                    onClick={addObjection}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    <FaPlus size={12} /> Add Objection
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(currentSection.items || []).map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-gray-500">Objection #{index + 1}</span>
                        <button
                          onClick={() => removeObjection(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes size={12} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={item.objection || ''}
                          onChange={(e) => updateObjection(index, 'objection', e.target.value)}
                          className="w-full border rounded p-2 text-sm"
                          placeholder="Customer objection..."
                        />
                        <textarea
                          value={item.reply || ''}
                          onChange={(e) => updateObjection(index, 'reply', e.target.value)}
                          className="w-full border rounded p-2 text-sm"
                          rows={2}
                          placeholder="Suggested reply..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Universal flow */}
      <div className="p-4 border-t bg-gray-50">
        <label className="block text-sm font-medium mb-1">Universal Flow (comma-separated steps)</label>
        <input
          type="text"
          value={(scripts.universal?.flow || []).join(' → ')}
          onChange={(e) => {
            const flow = e.target.value.split('→').map(s => s.trim()).filter(Boolean);
            const updated = { ...scripts, universal: { ...scripts.universal, flow } };
            setScripts(updated);
            onChange(updated);
          }}
          className="w-full border rounded-lg p-2"
          placeholder="e.g., Greeting → Introduction → Product Pitch → Closing"
        />
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
