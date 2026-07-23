import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { CustomFieldDefinition } from '../../types';
import { useApp } from '../../context/AppContext';
import { Checkbox } from '../ui/Checkbox';

export function SettingsCustomFieldsTab() {
  const { candidates, customFieldDefinitions, handleAddCustomFieldDef, handleUpdateCustomFieldDef, handleDeleteCustomFieldDef } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDef, setEditingDef] = useState<CustomFieldDefinition | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<'text' | 'number' | 'date' | 'boolean' | 'dropdown'>('text');
  const [optionsText, setOptionsText] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const resetForm = () => {
    setName('');
    setKey('');
    setType('text');
    setOptionsText('');
    setIsRequired(false);
    setShowAddForm(false);
    setEditingDef(null);
  };

  const handleEditClick = (def: CustomFieldDefinition) => {
    setEditingDef(def);
    setName(def.name);
    setKey(def.key);
    setType(def.type);
    setOptionsText((def.options || []).join(', '));
    setIsRequired(def.isRequired);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    const parsedOptions = type === 'dropdown'
      ? optionsText.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const defPayload: CustomFieldDefinition = {
      id: editingDef ? editingDef.id : 'cf_' + Date.now(),
      entityType: 'candidate',
      name: name.trim(),
      key: key.trim().toLowerCase().replace(/\s+/g, '_'),
      type,
      options: parsedOptions,
      isRequired
    };

    if (editingDef) {
      await handleUpdateCustomFieldDef(defPayload);
    } else {
      await handleAddCustomFieldDef(defPayload);
    }
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 font-sans">Dynamic Custom Fields</h2>
          <p className="text-xs text-slate-500 mt-0.5">Define additional attributes to collect for candidates during manual entry or spreadsheet importing.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Custom Field
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-scale-up">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-550 font-mono tracking-wider">
              {editingDef ? 'Edit Custom Field' : 'New Custom Field'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-650 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Field Display Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Notice Period"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingDef) {
                    setKey(e.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_'));
                  }
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Database Key (snake_case)</label>
              <input
                type="text"
                required
                disabled={!!editingDef}
                placeholder="e.g. notice_period"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Input Field Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-8 px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="text">Text Input</option>
                <option value="number">Number Input</option>
                <option value="date">Date Picker</option>
                <option value="boolean">Checkbox / Toggle</option>
                <option value="dropdown">Dropdown Options</option>
              </select>
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={isRequired}
                  onCheckedChange={(checked) => setIsRequired(checked)}
                />
                <span className="text-xs font-semibold text-slate-705">Make this field mandatory</span>
              </label>
            </div>
          </div>

          {type === 'dropdown' && (
            <div className="animate-fade-in">
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Dropdown Options (comma-separated)</label>
              <input
                type="text"
                required
                placeholder="e.g. Immediate, 15 Days, 30 Days, 60 Days, 90 Days"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Separate each option values with a comma.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs animate-fade-in cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm text-xs cursor-pointer"
            >
              {editingDef ? 'Update Field' : 'Save Field'}
            </button>
          </div>
        </form>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-404 text-[10px] font-mono uppercase tracking-wider border-b border-slate-150 font-bold">
              <th className="p-3">Field Label Name</th>
              <th className="p-3">Database Key</th>
              <th className="p-3">Field Type</th>
              <th className="p-3">Validation</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {customFieldDefinitions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 italic font-sans">
                  No custom fields defined yet. Custom fields will appear here when added manually or suggested by AI during imports.
                </td>
              </tr>
            ) : (
              customFieldDefinitions.map((def) => (
                <tr key={def.id} className="hover:bg-slate-50/40">
                  <td className="p-3 font-semibold text-slate-900">{def.name}</td>
                  <td className="p-3 font-mono text-slate-500">{def.key}</td>
                  <td className="p-3">
                    <span className="capitalize px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] font-semibold">
                      {def.type}
                    </span>
                    {def.type === 'dropdown' && (
                      <span className="text-[10px] text-slate-400 ml-1.5 truncate max-w-[150px] inline-block align-middle font-sans">
                        ({(def.options || []).join(', ')})
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {def.isRequired ? (
                      <span className="text-rose-605 font-mono text-[9px] font-bold">MANDATORY</span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[9px]">Optional</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleEditClick(def)}
                      className="p-1 text-slate-404 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
                      title="Edit field settings"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const count = candidates.filter(c => c.customFields && c.customFields[def.key]).length;
                        const confirmMsg = count > 0 
                          ? `Warning: This field contains data in ${count} active candidate profiles. Deleting it will permanently erase those values. Are you sure?`
                          : `Are you sure you want to delete the custom field "${def.name}"?`;
                        if (window.confirm(confirmMsg)) {
                          handleDeleteCustomFieldDef(def.id);
                        }
                      }}
                      className="p-1 text-slate-404 hover:text-rose-600 hover:bg-slate-100 rounded cursor-pointer"
                      title="Delete field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
