import React from 'react';
import { 
  ArrowLeft, Edit2, Trash2, Mail, Phone, MessageSquare, Calendar, 
  MapPin, Building2, Clock, GraduationCap, Briefcase, Database, 
  FileText, CheckCircle2 
} from 'lucide-react';
import { Candidate, Job, CommunicationLog } from '../types';

interface CandidateDetailsViewProps {
  selectedCandidate: Candidate;
  setSelectedCandidate: (cand: Candidate | null) => void;
  jobs: Job[];
  matchedJobs: any[];
  customFieldDefinitions: any[];
  candidateNotes: string;
  setCandidateNotes: (text: string) => void;
  handleSaveNotes: () => void;
  onEditCandidate: (cand: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  communicationLogs: CommunicationLog[];
  onComposeEmail: (cand: Candidate, job?: Job) => void;
  onComposeWhatsApp: (cand: Candidate, job?: Job) => void;
  onScheduleInterview: (cand: Candidate) => void;
  handleLogCompletedCall: (cand: Candidate) => void;
  onAddTaskForCandidate: (cand: Candidate) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
  startEdit: (cand: Candidate) => void;
}

export function CandidateDetailsView({
  selectedCandidate,
  setSelectedCandidate,
  jobs,
  matchedJobs,
  customFieldDefinitions,
  candidateNotes,
  setCandidateNotes,
  handleSaveNotes,
  onEditCandidate,
  onDeleteCandidate,
  communicationLogs,
  onComposeEmail,
  onComposeWhatsApp,
  onScheduleInterview,
  handleLogCompletedCall,
  onAddTaskForCandidate,
  showToast,
  startEdit
}: CandidateDetailsViewProps) {
  const prevCompanyMap: Record<string, string> = {
    'Emily Watson': 'Netlify',
    'Marcus Vance': 'Stripe',
    'Clara Oswald': 'Figma',
    'Devin Patel': 'Zapier',
    'Sarah Connor': 'Cyberdyne',
    'Alex Rivera': 'Bootcamp Graduate'
  };
  const prevCompany = prevCompanyMap[selectedCandidate.name] || 'Lumen Labs';

  return (
    <div className="space-y-6 animate-fade-in" id="candidate-detail-page">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button 
          onClick={() => setSelectedCandidate(null)} 
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates List
        </button>

        <div className="flex items-center gap-2.5">
          <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Pipeline Stage:</label>
          <select
            value={selectedCandidate.status}
            onChange={(e) => {
              const updated = { ...selectedCandidate, status: e.target.value as Candidate['status'] };
              onEditCandidate(updated);
              setSelectedCandidate(updated);
              showToast(`✓ Pipeline stage updated to ${e.target.value}`, 'success');
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans font-semibold text-slate-700 cursor-pointer shadow-sm"
          >
            <option value="Applied">Applied</option>
            <option value="Screening">Screening</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview">Interview</option>
            <option value="Selected">Selected</option>
            <option value="Offer Sent">Offer Sent</option>
            <option value="Joined">Joined</option>
          </select>
        </div>
      </div>

      {/* Large Hero Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xl uppercase font-sans shadow-inner">
            {selectedCandidate.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
              {selectedCandidate.name}
              <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium ${
                selectedCandidate.status === 'Applied' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                selectedCandidate.status === 'Screening' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                selectedCandidate.status === 'Shortlisted' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                selectedCandidate.status === 'Interview' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                selectedCandidate.status === 'Selected' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                selectedCandidate.status === 'Offer Sent' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
                {selectedCandidate.status}
              </span>
            </h1>
            {selectedCandidate.designation && (
              <p className="text-xs font-semibold text-blue-600 mt-0.5">{selectedCandidate.designation}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{selectedCandidate.email}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono">{selectedCandidate.phone}</span>
              {selectedCandidate.gender && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">{selectedCandidate.gender}</span>
                </>
              )}
              {selectedCandidate.address && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {selectedCandidate.address}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
            <button 
              onClick={() => startEdit(selectedCandidate)}
              className="p-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Edit Candidate Profile"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
            <button 
              onClick={() => {
                if (confirm(`Delete candidate ${selectedCandidate.name} from ATS?`)) {
                  onDeleteCandidate(selectedCandidate.id);
                  setSelectedCandidate(null);
                  showToast('✓ Candidate deleted successfully.', 'success');
                }
              }}
              className="p-2 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-lg bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Delete Candidate"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
        </div>

      </div>

      {/* Two-Column Details Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Profile and Resume Contents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4">Professional Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Current Co.</p>
                  <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.currentCompany || 'N/A'}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Experience</p>
                  <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.experience}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                <GraduationCap className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Education</p>
                  <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.education || 'N/A'}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Location</p>
                  <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.address || 'N/A'}</p>
                </div>
              </div>
              {selectedCandidate.expectedSalary && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5 animate-fade-in">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">Expected Salary</p>
                    <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.expectedSalary}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-bold">Candidate Skills</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(selectedCandidate.skills || []).map((s, id) => (
                  <span key={id} className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-slate-700 rounded-md font-medium text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {selectedCandidate.customFields && Object.keys(selectedCandidate.customFields).length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5 font-bold text-slate-900">
                  <Database className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  Dynamic Attributes
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl">
                  {Object.entries(selectedCandidate.customFields).map(([k, v]) => {
                    const definition = customFieldDefinitions.find(d => d.key === k);
                    const labelName = definition ? definition.name : k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    
                    let displayValue = '';
                    if (typeof v === 'boolean') {
                      displayValue = v ? 'Yes' : 'No';
                    } else {
                      displayValue = String(v ?? '');
                    }

                    if (!displayValue.trim()) return null;

                    return (
                      <div key={k} className="space-y-0.5">
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">{labelName}</span>
                        <span className="text-xs font-semibold text-slate-800">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Matched Jobs Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in" id="matched-jobs-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Matched Open Jobs</h2>
              </div>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100/60">
                {matchedJobs.length} Positions
              </span>
            </div>
            
            {matchedJobs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                <p className="text-xs font-semibold">No active open positions match this candidate's skills.</p>
                <p className="text-[10px] text-slate-400 mt-1">Add new open job openings with matching required skills in the Jobs tab.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1 space-y-4">
                {matchedJobs.map((job, idx) => {
                  return (
                    <div key={job.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} space-y-3`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {job.companyName} • <span className="text-slate-400 font-normal">{job.location}</span>
                          </p>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border ${
                          job.matchScore >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : job.matchScore >= 40
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {job.matchScore}% Skill Match
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                        <div>Salary: <span className="font-semibold text-slate-700 font-sans">{job.salary || 'Competitive'}</span></div>
                        <div>Experience: <span className="font-semibold text-slate-700 font-sans">{job.experience}</span></div>
                      </div>

                      {job.matchingSkills.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wide font-mono mr-1">Matching:</span>
                          {job.matchingSkills.map((sk: string, sIdx: number) => (
                            <span key={sIdx} className="px-1.5 py-0.25 bg-emerald-50 text-emerald-700 border border-emerald-100/60 rounded text-[9px] font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => onComposeEmail(selectedCandidate, job)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg transition-all duration-150 cursor-pointer"
                        >
                          <Mail className="h-3 w-3" />
                          Email Job Details
                        </button>
                        <button
                          onClick={() => onComposeWhatsApp(selectedCandidate, job)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg transition-all duration-150 cursor-pointer"
                        >
                          <MessageSquare className="h-3 w-3" />
                          WhatsApp Job Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic Notes Editor */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Recruiter Assessment & Notes</h2>
              <span className="text-[10px] text-slate-400">Auto-saved to ATS profile</span>
            </div>
            <div className="space-y-3">
              <textarea
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
                placeholder="Record screening notes, phone call summaries, or specific evaluations here..."
                rows={4}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/30 font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>

          {/* Monospace Resume Preview */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-blue-600" />
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Extracted Resume Contents</h2>
              </div>
              {selectedCandidate.resumeFileName && (
                <div className="flex items-center gap-1.5 p-1 px-2.5 bg-blue-50 border border-blue-100 rounded-md text-[10px] text-blue-700">
                  <FileText className="h-3 w-3" />
                  <span className="font-semibold truncate max-w-40">{selectedCandidate.resumeFileName}</span>
                </div>
              )}
            </div>
            <pre className="text-xs font-mono text-slate-700 bg-slate-900 text-slate-100 p-5 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
              {selectedCandidate.resumeText}
            </pre>
          </div>

        </div>

        {/* Right Column: Timeline, Actions and Communications */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Hiring Quick Actions</h2>
            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => onComposeEmail(selectedCandidate)}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100/70 text-blue-700 border border-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                Compose Email
              </button>
              <button 
                onClick={() => onComposeWhatsApp(selectedCandidate)}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 border border-emerald-100 rounded-lg transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 animate-pulse" />
                WhatsApp Candidate
              </button>
              <button 
                onClick={() => onScheduleInterview(selectedCandidate)}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
                Schedule Interview
              </button>
              <button 
                onClick={() => handleLogCompletedCall(selectedCandidate)}
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Phone className="h-4 w-4" />
                Log Phone Screen
              </button>
              <button 
                onClick={() => onAddTaskForCandidate(selectedCandidate)}
                className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 hover:underline transition-colors cursor-pointer"
              >
                + Create Follow-up Task
              </button>
            </div>
          </div>

          {/* Progress Log Timeline */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Candidate Progress Log</h2>
            <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4 py-1">
              <div className="relative">
                <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white" />
                <p className="text-xs font-semibold text-slate-800">Advanced to {selectedCandidate.status} stage</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Applied: {selectedCandidate.appliedDate || 'June 27, 2026'}</p>
              </div>
            </div>
          </div>

          {/* Outreach Logs List */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider font-bold">Outreach History</h2>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                {communicationLogs.filter(log => log.candidateId === selectedCandidate.id).length} Logs
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {communicationLogs.filter(log => log.candidateId === selectedCandidate.id).length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-center text-slate-400">
                  <p className="text-xs font-medium">No previous logs found.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Actions triggered on this candidate will automatically record here.</p>
                </div>
              ) : (
                communicationLogs
                  .filter(log => log.candidateId === selectedCandidate.id)
                  .map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[9px] px-2 py-0.5 rounded uppercase font-bold border ${
                          log.type === 'Email' 
                            ? 'bg-red-50 text-red-700 border-red-100' 
                            : log.type === 'WhatsApp' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : log.type === 'Call'
                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                      </div>
                      <p className="font-semibold text-slate-800">{log.subject}</p>
                      <p className="text-slate-600 leading-relaxed text-[11px] bg-white p-2 border border-slate-100 rounded">{log.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>By: {log.sentBy}</span>
                        <span className="font-mono text-emerald-600 font-semibold uppercase">{log.status}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
