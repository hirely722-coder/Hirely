import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Square, Trash2, Plus, Calendar, Clock, AlertCircle, 
  CheckCircle2, User, Mail, Phone, X, Search, ClipboardList, 
  ChevronDown, ChevronUp, MessageSquare, FileText, Check, Sparkles
} from 'lucide-react';
import { Task, Candidate } from '../types';
import Portal from './Portal';
import { SearchableDropdown } from './SearchableDropdown';

interface TasksViewProps {
  tasks: Task[];
  candidates: Candidate[];
  onAddTask: (task: Task) => void;
  onToggleTaskStatus: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onComposeEmail?: (candidate: Candidate) => void;
  isLoading?: boolean;
}

import { ExportCsvButton } from './ui/ExportCsvButton';
import { ExportColumn } from '../utils/csvExporter';

const tasksExportColumns: ExportColumn<Task>[] = [
  { header: 'Task Title', key: 'title' },
  { header: 'Task Type', key: 'type' },
  { header: 'Priority', key: 'priority' },
  { header: 'Status', key: 'status' },
  { header: 'Due Date', key: 'dueDate' },
  { header: 'Linked Candidate', key: 'candidateName', transform: (val) => val || 'N/A' },
  { header: 'Description', key: 'description', transform: (val) => val || '' },
  { header: 'Notes', key: 'notes', transform: (val) => val || '' }
];

export default function TasksView({
  tasks,
  candidates,
  onAddTask,
  onToggleTaskStatus,
  onUpdateTask,
  onDeleteTask,
  onComposeEmail,
  isLoading = false
}: TasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('All');

  // Form states for creating a new simplified task
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<Task['type']>('Call');
  const [formPriority, setFormPriority] = useState<Task['priority']>('Medium');
  const [formCandidateId, setFormCandidateId] = useState('');
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Defined categories for grouping
  const categories: { type: Task['type']; label: string; icon: React.ComponentType<any>; color: string; border: string; bg: string }[] = [
    { type: 'Call', label: 'Call Agendas', icon: Phone, color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50/40' },
    { type: 'Email', label: 'Email Schedules', icon: Mail, color: 'text-indigo-600', border: 'border-indigo-100', bg: 'bg-indigo-50/40' },
    { type: 'Interview', label: 'Interview Preps', icon: Calendar, color: 'text-amber-600', border: 'border-amber-100', bg: 'bg-amber-50/40' },
    { type: 'Document', label: 'Doc Verification', icon: FileText, color: 'text-teal-600', border: 'border-teal-100', bg: 'bg-teal-50/40' },
    { type: 'Follow Up', label: 'General Follow Ups', icon: Clock, color: 'text-purple-600', border: 'border-purple-100', bg: 'bg-purple-50/40' }
  ];

  // Helper to determine if a task is overdue
  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  // Filter tasks based on search text, priority, and selected category tab
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      if (!task) return false;
      const priorityMatches = filterPriority === 'All' || task.priority === filterPriority;
      const categoryTabMatches = selectedCategoryTab === 'All' || task.type === selectedCategoryTab;
      const textMatches = searchQuery.trim() === '' || 
        (task.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
        (task.candidateName || '').toLowerCase().includes((searchQuery || '').toLowerCase());
      return priorityMatches && categoryTabMatches && textMatches;
    });
  }, [tasks, filterPriority, selectedCategoryTab, searchQuery]);

  // Group tasks by category type for the "Category-wise Task List" section
  const groupedTasks = useMemo(() => {
    const groups: Record<Task['type'], Task[]> = {
      Call: [],
      Email: [],
      Interview: [],
      Document: [],
      'Follow Up': []
    };

    filteredTasks.forEach(task => {
      if (groups[task.type]) {
        groups[task.type].push(task);
      } else {
        groups['Follow Up'].push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const pending = (tasks || []).filter(t => t && t.status === 'Pending').length;
    const completed = (tasks || []).filter(t => t && t.status === 'Completed').length;
    return { pending, completed, total: (tasks || []).length };
  }, [tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const matchedCand = candidates.find(c => c.id === formCandidateId);

    const newTask: Task = {
      id: 't_' + Date.now(),
      type: formType,
      title: formTitle,
      candidateId: formCandidateId || undefined,
      candidateName: matchedCand ? matchedCand.name : undefined,
      priority: formPriority,
      status: 'Pending',
      dueDate: formDueDate,
      subtasks: []
    };

    onAddTask(newTask);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormType('Call');
    setFormPriority('Medium');
    setFormCandidateId('');
    setFormDueDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="tasks-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Tasks & Category Agendas
          </h1>
          <p className="text-xs text-slate-500 mt-1">Simple, categorized lists with essential candidate contacts. No bloated tabs or extra notes.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <ExportCsvButton
            data={filteredTasks}
            columns={tasksExportColumns}
            filename="tasks_report"
            permission="candidates.export"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-xs cursor-pointer"
          />
          <button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>
      </div>

      {/* Minimal Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-3 border border-slate-200/60 rounded-xl">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Pending</p>
          <p className="text-lg font-bold text-slate-950 mt-1 flex items-center gap-1.5">
            {stats.pending}
            {stats.pending > 0 && <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />}
          </p>
        </div>
        <div className="bg-white p-3 border border-slate-200/60 rounded-xl">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Completed</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white p-3 border border-slate-200/60 rounded-xl">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-slate-700 mt-1">{stats.total}</p>
        </div>
      </div>

      {/* Simplified Filters Control bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Top category-wise tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <button 
              onClick={() => setSelectedCategoryTab('All')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${selectedCategoryTab === 'All' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              All Categories
            </button>
            {categories.map(cat => {
              const Icon = cat.icon;
              const count = tasks.filter(t => t.type === cat.type).length;
              return (
                <button
                  key={cat.type}
                  onClick={() => setSelectedCategoryTab(cat.type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                    selectedCategoryTab === cat.type 
                      ? `${cat.bg} ${cat.color} ${cat.border} font-bold shadow-xs` 
                      : 'bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{cat.type} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Priority Option dropdown */}
          <div className="w-36">
            <SearchableDropdown
              label="Priority"
              options={[
                { value: 'All', label: 'All Priorities' },
                { value: 'High', label: '🔴 High' },
                { value: 'Medium', label: '🟡 Medium' },
                { value: 'Low', label: '🟢 Low' }
              ]}
              value={filterPriority}
              onChange={setFilterPriority}
            />
          </div>

        </div>

        {/* Minimal Search box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task title or linked candidate name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grouped Category-Wise Tasks Block */}
      <div className="space-y-6">
        {categories
          .filter(cat => selectedCategoryTab === 'All' || selectedCategoryTab === cat.type)
          .map(cat => {
            const list = groupedTasks[cat.type] || [];
            if (list.length === 0 && selectedCategoryTab !== 'All') {
              return (
                <div key={cat.type} className="bg-white border border-slate-150 rounded-xl p-8 text-center text-slate-400 shadow-xs">
                  <ClipboardList className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No tasks in {cat.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click "Create Task" to append one instantly.</p>
                </div>
              );
            }
            if (list.length === 0) return null; // Hide categories without matching items when viewing "All"

            const Icon = cat.icon;

            return (
              <div key={cat.type} className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
                {/* Category Header */}
                <div className={`px-4 py-2.5 border-b border-slate-100 flex items-center justify-between ${cat.bg}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.color}`} />
                    <h2 className="text-xs font-bold text-slate-800 font-sans tracking-tight">{cat.label}</h2>
                    {isLoading ? (
                      <span className="bg-slate-100/60 block h-4 w-8 rounded-full animate-pulse" />
                    ) : (
                      <span className="bg-white px-2 py-0.25 text-[9px] font-mono font-bold text-slate-500 rounded-full border border-slate-100">
                        {list.length} {list.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Simplified list of tasks under this category */}
                <div className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-pulse">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="h-4 w-4 rounded bg-slate-100 shrink-0 mt-0.5" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3.5 w-48 bg-slate-200 rounded" />
                            <div className="flex gap-2">
                              <div className="h-2.5 w-16 bg-slate-100 rounded" />
                              <div className="h-2.5 w-24 bg-slate-100 rounded" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          <div className="h-5 w-12 bg-slate-200 rounded" />
                          <div className="h-5 w-5 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ))
                  ) : list.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs italic">
                      No active schedules for this module.
                    </div>
                  ) : (
                    list.map(task => {
                    const isCompleted = task.status === 'Completed';
                    const overdue = isOverdue(task.dueDate, task.status);
                    const linkedCand = task.candidateId ? candidates.find(c => c.id === task.candidateId) : null;

                    return (
                      <div 
                        key={task.id}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors ${isCompleted ? 'bg-slate-50/30' : 'hover:bg-slate-50/20'}`}
                      >
                        {/* Left section: Checkbox, Title, Badges */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button 
                            onClick={() => onToggleTaskStatus(task.id)}
                            className="text-slate-300 hover:text-blue-600 transition-colors shrink-0 mt-0.5"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className={`text-xs font-bold text-slate-950 font-sans ${isCompleted ? 'line-through text-slate-400 font-normal' : ''}`}>
                                {task.title}
                              </p>

                              {overdue && (
                                <span className="px-1.5 py-0.25 text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 rounded-sm flex items-center gap-0.5 font-mono animate-pulse shrink-0">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  OVERDUE
                                </span>
                              )}

                              <span className={`px-1.5 py-0.25 font-mono uppercase font-bold rounded text-[8px] shrink-0 ${
                                task.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-100' :
                                task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                {task.priority}
                              </span>

                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                Due: {task.dueDate}
                              </span>
                            </div>

                            {/* Essential Candidate Info Block (ONLY necessary candidate details, no extra notes/logs) */}
                            {linkedCand ? (
                              <div className="mt-2 inline-flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-lg p-1.5 max-w-md">
                                <div className="h-5 w-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                  <User className="h-3 w-3 text-blue-500" />
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                  <span className="font-bold text-slate-700">{linkedCand.name}</span>
                                  {linkedCand.currentCompany && ` • ${linkedCand.currentCompany}`}
                                  {linkedCand.experience && ` (${linkedCand.experience} exp)`}
                                </div>
                                
                                {/* Quick micro contact links */}
                                <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                                  <button 
                                    onClick={() => {
                                      if (onComposeEmail) {
                                        onComposeEmail(linkedCand);
                                      } else {
                                        window.open(`mailto:${linkedCand.email}`);
                                      }
                                    }}
                                    className="p-1 hover:bg-indigo-100 hover:text-indigo-700 rounded transition-colors text-slate-400 cursor-pointer"
                                    title={`Email ${linkedCand.name}`}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </button>
                                  <a 
                                    href={
                                      typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                                        ? `https://wa.me/${linkedCand.phone.replace(/[^0-9]/g, '')}`
                                        : `https://web.whatsapp.com/send?phone=${linkedCand.phone.replace(/[^0-9]/g, '')}`
                                    } 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors text-slate-400"
                                    title={`WhatsApp ${linkedCand.name}`}
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            ) : task.candidateName ? (
                              <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 text-slate-500">
                                <User className="h-3 w-3 text-slate-400" />
                                <span>{task.candidateName}</span>
                              </div>
                            ) : null}

                          </div>
                        </div>

                        {/* Right section: Simple Delete Button */}
                        <div className="flex items-center gap-1 justify-end shrink-0">
                          <button 
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>
            );
          })}

        {/* Catch-all empty state if no matching tasks */}
        {filteredTasks.length === 0 && (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-slate-400 shadow-xs">
            <ClipboardList className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold mt-3">No matching tasks found</p>
            <p className="text-[10px] text-slate-400 mt-1">Try resetting your filters or changing search query terms.</p>
          </div>
        )}
      </div>

      {/* Simple Create Task Modal */}
      {showAddModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-150 bg-slate-50 shrink-0">
              <h2 className="text-xs font-bold text-slate-950 font-sans flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                Create New Simplified Task
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="E.g., Follow up on signed offer letter"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Task Category</label>
                    <select
                      value={formType}
                      onChange={(e: any) => setFormType(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="Call">📞 Call Agenda</option>
                      <option value="Email">✉️ Email Schedule</option>
                      <option value="Follow Up">⏱️ Follow Up</option>
                      <option value="Interview">👥 Interview Prep</option>
                      <option value="Document">📄 Doc Collection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e: any) => setFormPriority(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Link Candidate Profile</label>
                    <select
                      value={formCandidateId}
                      onChange={(e) => setFormCandidateId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- No candidate linked --</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Add Task
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
