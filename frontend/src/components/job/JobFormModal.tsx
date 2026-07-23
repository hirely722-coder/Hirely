import React, { useState, useEffect } from 'react';
import { X, Briefcase } from 'lucide-react';
import Portal from '../Portal';
import { Job, Company } from '../../types';
import { useApp } from '../../context/AppContext';

const EXPERIENCE_OPTIONS = ['Entry (0-2 Years)', 'Mid (3-5 Years)', 'Senior (5+ Years)', 'Lead / Staff (9+ Years)'];
const SALARY_OPTIONS = ['₹50,000 - ₹80,000', '₹80,000 - ₹120,000', '₹120,000 - ₹150,000', '₹150,000 - ₹180,000', '₹180,000 - ₹220,000', 'Over ₹220,000'];

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (job: Job) => Promise<void>;
  job?: Job | null;
  companies: Company[];
  teamMembers: any[];
}

export default function JobFormModal({
  isOpen,
  onClose,
  onSubmit,
  job,
  companies,
  teamMembers
}: JobFormModalProps) {
  const { user } = useApp();
  const [formTitle, setFormTitle] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formExperience, setFormExperience] = useState('5+ Years');
  const [formLocation, setFormLocation] = useState('San Francisco, CA / Hybrid');
  const [formDescription, setFormDescription] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('React, TypeScript, Tailwind CSS');
  const [formSalary, setFormSalary] = useState('₹150,000 - ₹180,000');
  const [formStatus, setFormStatus] = useState<'Open' | 'Closed'>('Open');
  const [formEmploymentType, setFormEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Internship'>('Full-time');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formUrgency, setFormUrgency] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [formRecruiterName, setFormRecruiterName] = useState(user?.name || '');

  // Load draft or initial job properties
  useEffect(() => {
    if (job) {
      setFormTitle(job.title);
      setFormCompanyId(job.companyId || '');
      setFormExperience(job.experience);
      setFormLocation(job.location);
      setFormDescription(job.description || '');
      setFormSkillsText(job.requiredSkills.join(', '));
      setFormSalary(job.salary);
      setFormStatus(job.status);
      setFormEmploymentType(job.employmentType || 'Full-time');
      setFormDepartment(job.department || 'Engineering');
      setFormUrgency(job.urgency || 'Medium');
      setFormRecruiterName(job.recruiterName || user?.name || '');
    } else {
      const rawDraft = localStorage.getItem('hirely_job_form_draft');
      if (rawDraft && isOpen) {
        try {
          const draft = JSON.parse(rawDraft);
          setFormTitle(draft.title || '');
          setFormCompanyId(draft.companyId || companies[0]?.id || '');
          setFormExperience(draft.experience || '5+ Years');
          setFormLocation(draft.location || 'San Francisco, CA / Hybrid');
          setFormDescription(draft.description || '');
          setFormSkillsText(draft.skillsText || 'React, TypeScript, Tailwind CSS');
          setFormSalary(draft.salary || '₹150,000 - ₹180,000');
          setFormStatus(draft.status || 'Open');
          setFormEmploymentType(draft.employmentType || 'Full-time');
          setFormDepartment(draft.department || 'Engineering');
          setFormUrgency(draft.urgency || 'Medium');
          setFormRecruiterName(draft.recruiterName || user?.name || '');
          return;
        } catch (e) {
          console.error('Failed to parse job form draft', e);
        }
      }
      setFormTitle('');
      setFormCompanyId(companies[0]?.id || '');
      setFormExperience('5+ Years');
      setFormLocation('San Francisco, CA / Hybrid');
      setFormDescription('');
      setFormSkillsText('React, TypeScript, Tailwind CSS');
      setFormSalary('₹150,000 - ₹180,000');
      setFormStatus('Open');
      setFormEmploymentType('Full-time');
      setFormDepartment('Engineering');
      setFormUrgency('Medium');
      setFormRecruiterName(user?.name || '');
    }
  }, [job, companies, isOpen, user]);

  // Save creation draft to localStorage when states change
  useEffect(() => {
    if (!job && isOpen) {
      const draft = {
        title: formTitle,
        companyId: formCompanyId,
        experience: formExperience,
        location: formLocation,
        description: formDescription,
        skillsText: formSkillsText,
        salary: formSalary,
        status: formStatus,
        employmentType: formEmploymentType,
        department: formDepartment,
        urgency: formUrgency,
        recruiterName: formRecruiterName
      };
      localStorage.setItem('hirely_job_form_draft', JSON.stringify(draft));
    }
  }, [
    job, isOpen, formTitle, formCompanyId, formExperience, formLocation,
    formDescription, formSkillsText, formSalary, formStatus,
    formEmploymentType, formDepartment, formUrgency, formRecruiterName
  ]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;

    const selectedComp = companies.find(c => c.id === formCompanyId);
    const companyNameVal = selectedComp ? selectedComp.name : 'None';
    const companyIdVal = selectedComp ? selectedComp.id : null;

    const jobPayload: Job = {
      id: job?.id || 'j_' + Date.now(),
      title: formTitle,
      companyId: companyIdVal,
      companyName: companyNameVal,
      experience: formExperience,
      location: formLocation,
      applicationsCount: job?.applicationsCount || 0,
      status: formStatus,
      description: formDescription,
      requiredSkills: formSkillsText.split(',').map(s => s.trim()).filter(Boolean),
      salary: formSalary,
      employmentType: formEmploymentType,
      department: formDepartment,
      urgency: formUrgency,
      recruiterName: formRecruiterName || user?.name || ''
    };

    await onSubmit(jobPayload);
    localStorage.removeItem('hirely_job_form_draft');
  };

  return (
    <Portal>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up text-slate-700">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2 className="text-sm font-bold text-slate-950 font-sans flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-slate-500" />
              {job ? `Edit Job: ${job.title}` : 'Add New Job Position'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="E.g., Senior Full-Stack Developer"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Partner Company *</label>
                <select
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="">None</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Experience</label>
                <select
                  value={EXPERIENCE_OPTIONS.includes(formExperience) ? formExperience : 'Custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Custom') {
                      setFormExperience('');
                    } else {
                      setFormExperience(val);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="Entry (0-2 Years)">Entry (0-2 Years)</option>
                  <option value="Mid (3-5 Years)">Mid (3-5 Years)</option>
                  <option value="Senior (5+ Years)">Senior (5+ Years)</option>
                  <option value="Lead / Staff (9+ Years)">Lead / Staff (9+ Years)</option>
                  <option value="Custom">Custom...</option>
                </select>
                {!EXPERIENCE_OPTIONS.includes(formExperience) && (
                  <input
                    type="text"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    placeholder="Enter custom experience (e.g., 6+ Years)"
                    className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Salary Range</label>
                <select
                  value={SALARY_OPTIONS.includes(formSalary) ? formSalary : 'Custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Custom') {
                      setFormSalary('');
                    } else {
                      setFormSalary(val);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="₹50,000 - ₹80,000">₹50,000 - ₹80,000</option>
                  <option value="₹80,000 - ₹120,000">₹80,000 - ₹120,000</option>
                  <option value="₹120,000 - ₹150,000">₹120,000 - ₹150,000</option>
                  <option value="₹150,000 - ₹180,000">₹150,000 - ₹180,000</option>
                  <option value="₹180,000 - ₹220,000">₹180,000 - ₹220,000</option>
                  <option value="Over ₹220,000">Over ₹220,000</option>
                  <option value="Custom">Custom...</option>
                </select>
                {!SALARY_OPTIONS.includes(formSalary) && (
                  <input
                    type="text"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    placeholder="Enter custom salary range (e.g., ₹250k - ₹300k)"
                    className="w-full mt-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="E.g., Remote (US) / San Francisco, CA"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                />
              </div>

              {job && (
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Job Status</label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Employment Type</label>
                <select
                  value={formEmploymentType}
                  onChange={(e: any) => setFormEmploymentType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Department</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="E.g., Engineering, Marketing"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Urgency Level</label>
                <select
                  value={formUrgency}
                  onChange={(e: any) => setFormUrgency(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Assigned Recruiter</label>
                <select
                  value={formRecruiterName}
                  onChange={(e) => setFormRecruiterName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-white"
                >
                  <option value="">Select Recruiter...</option>
                  {teamMembers.map((tm: any) => (
                    <option key={tm.id} value={tm.name}>{tm.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Required Skills (Comma separated) *</label>
                <input
                  type="text"
                  required
                  value={formSkillsText}
                  onChange={(e) => setFormSkillsText(e.target.value)}
                  placeholder="React, TypeScript, Tailwind CSS, PostgreSQL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Position Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe core job responsibilities, company growth, and team mission..."
                  rows={4}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-sm transition-colors"
              >
                {job ? 'Save Changes' : 'Publish Opening'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
