import React, { useState } from 'react';
import { Mail, Search, FileText, Calendar, Plus, X, Eye, Edit2, Trash2, Check, Copy, ChevronDown } from 'lucide-react';
import { EmailTemplate } from '../types';
import Portal from './Portal';

interface TemplatesViewProps {
  templates: EmailTemplate[];
  onAddTemplate: (temp: EmailTemplate) => void;
  onEditTemplate: (temp: EmailTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function TemplatesView({
  templates,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate
}: TemplatesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(templates[0] || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<EmailTemplate | null>(null);

  // Audience Tabs
  const [activeAudience, setActiveAudience] = useState<'Candidate' | 'Company'>('Candidate');

  // Form States
  const [formName, setFormName] = useState('');
  const [formAudience, setFormAudience] = useState<'Candidate' | 'Company'>('Candidate');
  const [formCategory, setFormCategory] = useState('Outreach');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formVariables, setFormVariables] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const CATEGORIES = ["Screening", "Interview", "Offer", "Follow-up", "Rejection", "General", "Submission", "Outreach"];

  const [copied, setCopied] = useState(false);

  // Filter templates based on Search and Audience
  const filteredTemplates = (templates || []).filter(t => {
    if (!t) return false;
    const isMatchingAudience = (t.audience || 'Candidate') === activeAudience;
    const isMatchingSearch = (t.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                             (t.category || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    return isMatchingAudience && isMatchingSearch;
  });

  const startAdd = () => {
    setFormName('');
    setFormAudience(activeAudience);
    setFormCategory('General');
    setFormSubject('');
    setFormBody('');
    setFormVariables(activeAudience === 'Candidate' ? 'candidate_name, job_title, company_name' : 'contact_person, candidate_name, job_title, company_name');
    setIsCategoryDropdownOpen(false);
    setShowAddModal(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSubject) return;

    let variablesDetected = formVariables
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (variablesDetected.length === 0) {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(formBody)) !== null) {
        if (!variablesDetected.includes(match[1])) {
          variablesDetected.push(match[1]);
        }
      }
    }

    const newTemp: EmailTemplate = {
      id: 'temp_' + Date.now(),
      name: formName,
      audience: formAudience,
      category: formCategory,
      subject: formSubject,
      body: formBody,
      lastUpdated: new Date().toISOString().split('T')[0],
      variables: variablesDetected.length > 0 ? variablesDetected : ['candidate_name', 'job_title', 'company_name']
    };

    onAddTemplate(newTemp);
    setSelectedTemplate(newTemp);
    setShowAddModal(false);
  };

  const startEdit = (temp: EmailTemplate) => {
    setFormName(temp.name);
    setFormAudience(temp.audience || 'Candidate');
    setFormCategory(temp.category);
    setFormSubject(temp.subject);
    setFormBody(temp.body);
    setFormVariables(temp.variables ? temp.variables.join(', ') : 'candidate_name, job_title, company_name');
    setIsCategoryDropdownOpen(false);
    setShowEditModal(temp);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    let variablesDetected = formVariables
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (variablesDetected.length === 0) {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(formBody)) !== null) {
        if (!variablesDetected.includes(match[1])) {
          variablesDetected.push(match[1]);
        }
      }
    }

    const updated: EmailTemplate = {
      ...showEditModal,
      name: formName,
      audience: formAudience,
      category: formCategory,
      subject: formSubject,
      body: formBody,
      lastUpdated: new Date().toISOString().split('T')[0],
      variables: variablesDetected.length > 0 ? variablesDetected : showEditModal.variables
    };

    onEditTemplate(updated);
    if (selectedTemplate?.id === updated.id) {
      setSelectedTemplate(updated);
    }
    setShowEditModal(null);
  };

  const triggerCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="templates-view">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">Email Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Review standard candidate outreaches, scheduling templates, and offer drafts.</p>
        </div>
        <button 
          onClick={startAdd}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Audience Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => {
            setActiveAudience('Candidate');
            const first = templates.find(t => (t.audience || 'Candidate') === 'Candidate');
            if (first) setSelectedTemplate(first);
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeAudience === 'Candidate'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          👤 Candidate Templates
        </button>
        <button
          onClick={() => {
            setActiveAudience('Company');
            const first = templates.find(t => t.audience === 'Company');
            if (first) setSelectedTemplate(first);
          }}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeAudience === 'Company'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏢 Company / Client Templates
        </button>
      </div>

      {/* Grid Layout: Templates List on Left, Previewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Templates List Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center shadow-xs">
            <Search className="h-4 w-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs border-none focus:outline-none bg-transparent"
            />
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-mono text-slate-400 uppercase">
                  <th className="p-4 font-medium">Template Name</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium font-mono text-center">Last Updated</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No templates found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map((temp) => {
                    const isSelected = selectedTemplate?.id === temp.id;
                    return (
                      <tr 
                        key={temp.id}
                        onClick={() => setSelectedTemplate(temp)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-950 font-sans">{temp.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium border border-slate-200">
                            {temp.category}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-slate-400">{temp.lastUpdated}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedTemplate(temp)}
                              title="Preview Template"
                              className="p-1 text-slate-400 hover:text-slate-900"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => startEdit(temp)}
                              title="Edit"
                              className="p-1 text-slate-400 hover:text-blue-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => onDeleteTemplate(temp.id)}
                              title="Delete"
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Template Previewer Panel - Right Column */}
        <div className="lg:col-span-1">
          {selectedTemplate ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-5 animate-fade-in" id="template-detail-panel">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">PREVIEWING TEMPLATE</span>
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight mt-0.5">{selectedTemplate.name}</h2>
                </div>
                <button 
                  onClick={() => startEdit(selectedTemplate)}
                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Edit Template"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Email Subject</p>
                <p className="text-xs font-semibold text-slate-900 bg-slate-50 p-2.5 rounded border border-slate-100">
                  {selectedTemplate.subject}
                </p>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Email Body</p>
                <div className="text-xs bg-slate-950 text-slate-100 p-4 rounded-lg font-mono whitespace-pre-wrap leading-relaxed shadow-inner max-h-72 overflow-y-auto border border-slate-800">
                  {selectedTemplate.body}
                </div>
              </div>

              {/* Dynamic Variables reference list */}
              <div>
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2">Available Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.variables.map((v, i) => (
                    <span 
                      key={i} 
                      onClick={() => triggerCopy(`{{${v}}}`)}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100/50 rounded cursor-pointer hover:bg-blue-100 transition-all"
                      title="Click to copy variable to clipboard"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 leading-normal">Variables inside your template body will automatically resolve dynamically during active email outbox dispatching.</p>
              </div>

              {/* Copy Template Content Button */}
              <button
                onClick={() => triggerCopy(selectedTemplate.body)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Template Body
                  </>
                )}
              </button>

            </div>
          ) : (
            <div className="h-full bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center text-slate-400 min-h-64">
              <Mail className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-medium mt-3">No template selected.</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-40">Choose a template from the list to preview formatted headers, bodies, and custom replacement variables.</p>
            </div>
          )}
        </div>

      </div>

      {/* Create Modal */}
      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up relative">
            <div className="flex items-start justify-between pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create template</h2>
                <p className="text-xs text-slate-500 mt-1">Define a reusable email template with merge variables.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="space-y-5 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Recipient Audience</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormAudience('Candidate');
                      setFormVariables('candidate_name, job_title, company_name');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold ${
                      formAudience === 'Candidate'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/10'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    👤 Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormAudience('Company');
                      setFormVariables('contact_person, candidate_name, job_title, company_name');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold ${
                      formAudience === 'Company'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/10'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Company / Client
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Initial Screening Call"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-left font-medium text-slate-700 cursor-pointer h-[34px]"
                  >
                    <span>{formCategory}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  {isCategoryDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsCategoryDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-20 max-h-60 overflow-y-auto">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormCategory(cat);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-medium transition-colors ${formCategory === cat ? 'bg-blue-50/50 text-blue-600' : ''}`}
                          >
                            <span>{cat}</span>
                            {formCategory === cat && (
                              <Check className="h-3.5 w-3.5 text-blue-600 font-bold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Subject <span className="text-[10px] font-normal text-slate-400 ml-1">(supports {"{{variables}}"})</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Screening Call - {{job_title}} at {{company_name}}"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Body <span className="text-[10px] font-normal text-slate-400 ml-1">(supports {"{{variables}}"})</span>
                </label>
                <textarea
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Hi {{candidate_name}},  Thank you for..."
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white leading-relaxed font-sans font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Variables <span className="text-[10px] font-normal text-slate-400 ml-1">(comma separated, without braces)</span>
                </label>
                <input
                  type="text"
                  value={formVariables}
                  onChange={(e) => setFormVariables(e.target.value)}
                  placeholder="candidate_name, job_title, company_name"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Create template
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up relative">
            <div className="flex items-start justify-between pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit template</h2>
                <p className="text-xs text-slate-500 mt-1">Define a reusable email template with merge variables.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-5 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Recipient Audience</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormAudience('Candidate');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold ${
                      formAudience === 'Candidate'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/10'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    👤 Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormAudience('Company');
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold ${
                      formAudience === 'Company'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/10'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Company / Client
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Initial Screening Call"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">Category</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-left font-medium text-slate-700 cursor-pointer h-[34px]"
                  >
                    <span>{formCategory}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  {isCategoryDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsCategoryDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-20 max-h-60 overflow-y-auto">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormCategory(cat);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-medium transition-colors ${formCategory === cat ? 'bg-blue-50/50 text-blue-600' : ''}`}
                          >
                            <span>{cat}</span>
                            {formCategory === cat && (
                              <Check className="h-3.5 w-3.5 text-blue-600 font-bold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Subject <span className="text-[10px] font-normal text-slate-400 ml-1">(supports {"{{variables}}"})</span>
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Screening Call - {{job_title}} at {{company_name}}"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Body <span className="text-[10px] font-normal text-slate-400 ml-1">(supports {"{{variables}}"})</span>
                </label>
                <textarea
                  required
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Hi {{candidate_name}},  Thank you for..."
                  rows={6}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white leading-relaxed font-sans font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Variables <span className="text-[10px] font-normal text-slate-400 ml-1">(comma separated, without braces)</span>
                </label>
                <input
                  type="text"
                  value={formVariables}
                  onChange={(e) => setFormVariables(e.target.value)}
                  placeholder="candidate_name, job_title, company_name"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-5 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

    </div>
  );
}
