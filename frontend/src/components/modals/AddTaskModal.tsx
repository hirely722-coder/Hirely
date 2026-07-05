import React, { useState, useEffect } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { Candidate, Task } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface AddTaskModalProps {
  candidate: Candidate;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function AddTaskModal({
  candidate,
  onClose,
  onAddTask,
  showToast
}: AddTaskModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 200);
  };

  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<Task['type']>('Call');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);
    setTaskTitle(`Follow up with ${candidate.name}`);
  }, [candidate]);

  const handleSubmit = () => {
    if (!taskTitle.trim() || !dueDate) {
      showToast('❌ Please complete all task fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const task: Task = {
        id: 't_' + Date.now(),
        type: taskType,
        title: taskTitle,
        candidateId: candidate.id,
        candidateName: candidate.name,
        priority: priority,
        status: 'Pending',
        dueDate: dueDate
      };

      onAddTask(task);
      showToast('✓ Task created successfully!', 'success');
      handleClose();
    }, 500);
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose}>
      {(animate) => (
        <div 
          className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden transition-all duration-200 transform ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Create Custom Task</h3>
                <p className="text-[10px] text-slate-404 font-mono font-bold">Linked candidate: {candidate.name}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 text-slate-404 hover:text-slate-655 rounded cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5 text-xs font-sans">
            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Task Description / Title</label>
              <input 
                type="text" 
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Conduct second round coding assessment"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Task Type</label>
                <select 
                  value={taskType} 
                  onChange={(e) => setTaskType(e.target.value as Task['type'])}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                >
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Interview">Interview</option>
                  <option value="Document">Document</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Priority</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider mb-1 font-bold">Due Date</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
            <button 
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-655 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer select-none font-sans"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
}
