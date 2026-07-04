import React, { useState, useEffect } from 'react';
import { X, Users, Database } from 'lucide-react';
import { Candidate } from '../types';
import AnimatedModal from './AnimatedModal';

interface CandidateFormModalProps {
  isOpenAdd: boolean;
  onCloseAdd: () => void;
  isOpenEdit: boolean;
  onCloseEdit: () => void;
  formName: string;
  setFormName: (name: string) => void;
  formEmail: string;
  setFormEmail: (email: string) => void;
  formPhone: string;
  setFormPhone: (phone: string) => void;
  formExperience: string;
  setFormExperience: (exp: string) => void;
  formCurrentCompany: string;
  setFormCurrentCompany: (company: string) => void;
  formDesignation: string;
  setFormDesignation: (des: string) => void;
  formSkillsText: string;
  setFormSkillsText: (skills: string) => void;
  formEducation: string;
  setFormEducation: (edu: string) => void;
  formAddress: string;
  setFormAddress: (addr: string) => void;
  formGender: 'Male' | 'Female' | 'Other';
  setFormGender: (gender: 'Male' | 'Female' | 'Other') => void;
  formCity: string;
  setFormCity: (city: string) => void;
  formExpectedSalary: string;
  setFormExpectedSalary: (salary: string) => void;
  formStatus: Candidate['status'];
  setFormStatus: (status: Candidate['status']) => void;
  customFieldDefinitions: any[];
  formCustomFields: Record<string, any>;
  setFormCustomFields: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  formNotes: string;
  setFormNotes: (notes: string) => void;
  handleSaveAdd: (e: React.FormEvent) => void;
  handleSaveEdit: (e: React.FormEvent) => void;
  showEditModal: Candidate | null;
}

export function CandidateFormModal({
  isOpenAdd,
  onCloseAdd,
  isOpenEdit,
  onCloseEdit,
  formName,
  setFormName,
  formEmail,
  setFormEmail,
  formPhone,
  setFormPhone,
  formExperience,
  setFormExperience,
  formCurrentCompany,
  setFormCurrentCompany,
  formDesignation,
  setFormDesignation,
  formSkillsText,
  setFormSkillsText,
  formEducation,
  setFormEducation,
  formAddress,
  setFormAddress,
  formGender,
  setFormGender,
  formCity,
  setFormCity,
  formExpectedSalary,
  setFormExpectedSalary,
  formStatus,
  setFormStatus,
  customFieldDefinitions,
  formCustomFields,
  setFormCustomFields,
  formNotes,
  setFormNotes,
  handleSaveAdd,
  handleSaveEdit,
  showEditModal
}: CandidateFormModalProps) {
  const [addOpen, setAddOpen] = useState(isOpenAdd);
  const [editOpen, setEditOpen] = useState(isOpenEdit);

  useEffect(() => {
    setAddOpen(isOpenAdd);
  }, [isOpenAdd]);

  useEffect(() => {
    setEditOpen(isOpenEdit);
  }, [isOpenEdit]);

  const handleCloseAdd = () => {
    setAddOpen(false);
    setTimeout(onCloseAdd, 200);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setTimeout(onCloseEdit, 200);
  };

  const renderFormFields = () => {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidate Name *</label>
          <input
            type="text"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="E.g., Clara Oswald"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address *</label>
          <input
            type="email"
            required
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="clara@outlook.com"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number *</label>
          <input
            type="text"
            required
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Years of Experience</label>
          <input
            type="text"
            value={formExperience}
            onChange={(e) => setFormExperience(e.target.value)}
            placeholder="E.g., 5 Years"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Current Company</label>
          <input
            type="text"
            value={formCurrentCompany}
            onChange={(e) => setFormCurrentCompany(e.target.value)}
            placeholder="E.g., Framer / Freelance"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Designation</label>
          <input
            type="text"
            value={formDesignation}
            onChange={(e) => setFormDesignation(e.target.value)}
            placeholder="E.g., Senior Software Engineer"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Technical Skills (Comma separated) *</label>
          <input
            type="text"
            required
            value={formSkillsText}
            onChange={(e) => setFormSkillsText(e.target.value)}
            placeholder="React, TypeScript, Figma, Tailwind CSS"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Highest Education</label>
          <input
            type="text"
            value={formEducation}
            onChange={(e) => setFormEducation(e.target.value)}
            placeholder="E.g., B.A. RISD"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Address / Location</label>
          <input
            type="text"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder="E.g., San Francisco, CA"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Gender</label>
          <select
            value={formGender}
            onChange={(e: any) => setFormGender(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">City (For Filtering)</label>
          <input
            type="text"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
            placeholder="E.g., San Francisco"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Expected Salary</label>
          <input
            type="text"
            value={formExpectedSalary}
            onChange={(e) => setFormExpectedSalary(e.target.value)}
            placeholder="E.g., $140,000"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Pipeline Stage</label>
          <select
            value={formStatus}
            onChange={(e: any) => setFormStatus(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="Applied">Applied</option>
            <option value="Screening">Screening</option>
            <option value="Interview">Interview</option>
            <option value="Selected">Selected</option>
            <option value="Joined">Joined</option>
          </select>
        </div>

        {customFieldDefinitions.length > 0 && (
          <div className="col-span-2 border-t border-slate-100 pt-4 space-y-3 animate-scale-up">
            <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <Database className="h-4 w-4 text-blue-600 animate-pulse" />
              Additional Custom Fields
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {customFieldDefinitions.map((def) => {
                const value = formCustomFields[def.key] ?? '';
                const handleChange = (val: any) => {
                  setFormCustomFields(prev => ({ ...prev, [def.key]: val }));
                };

                return (
                  <div key={def.id} className={def.type === 'text' || def.type === 'dropdown' ? 'col-span-2 sm:col-span-1' : ''}>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      {def.name} {def.isRequired && ' *'}
                    </label>
                    {def.type === 'dropdown' ? (
                      <select
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        required={def.isRequired}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      >
                        <option value="">Select option...</option>
                        {(def.options || []).map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : def.type === 'boolean' ? (
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!value}
                          onChange={(e) => handleChange(e.target.checked)}
                          required={def.isRequired}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-slate-700">Yes / Confirmed</span>
                      </label>
                    ) : def.type === 'date' ? (
                      <input
                        type="date"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        required={def.isRequired}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    ) : def.type === 'number' ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        required={def.isRequired}
                        placeholder={`Enter ${def.name}...`}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        required={def.isRequired}
                        placeholder={`Enter ${def.name}...`}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Screening/Interview Notes</label>
          <textarea
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Enter any screening feedback or notes for other recruiting panel members..."
            rows={2}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ADD CANDIDATE MODAL */}
      <AnimatedModal isOpen={addOpen} onClose={handleCloseAdd}>
        {(animate) => (
          <div 
            className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                Add New Candidate Profile
              </h2>
              <button onClick={handleCloseAdd} className="text-slate-400 hover:text-slate-605 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-[11px] text-slate-400 font-sans mb-2">Please fill in details below to register the candidate profile in the ATS index.</p>
              {renderFormFields()}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseAdd}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        )}
      </AnimatedModal>

      {/* EDIT CANDIDATE MODAL */}
      <AnimatedModal isOpen={editOpen && !!showEditModal} onClose={handleCloseEdit}>
        {(animate) => {
          if (!showEditModal) return null;
          return (
            <div 
              className={`bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-500" />
                  Edit Profile: {showEditModal.name}
                </h2>
                <button onClick={handleCloseEdit} className="text-slate-400 hover:text-slate-605 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {renderFormFields()}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          );
        }}
      </AnimatedModal>
    </>
  );
}
