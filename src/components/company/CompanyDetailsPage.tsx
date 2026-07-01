import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, Building2, Globe, Mail, Phone, MapPin, Plus, Edit2, Sparkles, 
  Trash, MessageSquare, Briefcase, Users, FileText, CheckCircle, Clock, 
  BarChart3, Upload, Download, Eye, Send, Search, Check, AlertCircle, Copy, HelpCircle, Star, Info, X, ExternalLink
} from 'lucide-react';
import { Company, Job, Candidate } from '../../types';
import { 
  Contact, CompanyDocument, Note, CommunicationLog, CompanyActivity,
  generateInitialContacts, generateInitialDocuments, generateInitialNotes,
  generateInitialCommunications, generateInitialActivities
} from '../../utils/companyMockData';
import SubmitCandidateModal from './SubmitCandidateModal';

interface CompanyDetailsPageProps {
  company: Company;
  onBack: () => void;
  jobs: Job[];
  candidates: Candidate[];
  onEditCompany: (company: Company) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onAddJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onComposeEmail?: (candidate: Candidate) => void;
  onComposeWhatsApp?: (candidate: Candidate) => void;
}

export default function CompanyDetailsPage({
  company,
  onBack,
  jobs,
  candidates,
  onEditCompany,
  onEditCandidate,
  onAddJob,
  onEditJob,
  onDeleteJob,
  onComposeEmail,
  onComposeWhatsApp
}: CompanyDetailsPageProps) {
  // Tab selector
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'candidates' | 'contacts' | 'documents' | 'notes' | 'communication' | 'activity' | 'ai_insights'>('overview');
  
  // Local Workspace Search Query (searches across everything!)
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Local state for client-specific tables (initialized on mount/change dynamically)
  const [contacts, setContacts] = useState<Contact[]>(() => generateInitialContacts(company));
  const [documents, setDocuments] = useState<CompanyDocument[]>(() => generateInitialDocuments(company));
  const [notes, setNotes] = useState<Note[]>(() => generateInitialNotes(company));
  const [communications, setCommunications] = useState<CommunicationLog[]>(() => generateInitialCommunications(company));
  const [activities, setActivities] = useState<CompanyActivity[]>(() => generateInitialActivities(company));

  // Modals visibility
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Form states
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactDept, setNewContactDept] = useState('Engineering');
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);

  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobLocation, setNewJobLocation] = useState('Remote');
  const [newJobExp, setNewJobExp] = useState('3-5 Years');
  const [newJobSalary, setNewJobSalary] = useState('$120k - $140k');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobSkills, setNewJobSkills] = useState('');

  const [newNoteContent, setNewNoteContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Email/WhatsApp target states
  const [composerEmailTo, setComposerEmailTo] = useState('');
  const [composerEmailSubject, setComposerEmailSubject] = useState('');
  const [composerEmailBody, setComposerEmailBody] = useState('');
  const [selectedCompanyTemplateId, setSelectedCompanyTemplateId] = useState('custom');

  const [composerWATo, setComposerWATo] = useState('');
  const [composerWABody, setComposerWABody] = useState('');

  // Bulk Candidates select list
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Find primary email contact
  const primaryContact = useMemo(() => {
    return contacts.find(c => c.isPrimary) || contacts[0] || { name: company.contactPerson, email: company.email, phone: company.phone };
  }, [contacts, company]);

  // Jobs belonging to this company
  const companyJobs = useMemo(() => {
    return jobs.filter(j => j.companyId === company.id);
  }, [jobs, company.id]);

  // Candidates submitted to this company (Candidates whose experience aligns or who are in state)
  const companyCandidates = useMemo(() => {
    // Let's filter candidates based on whether they match the company's jobs or are submitted
    return candidates.filter(cand => {
      // If candidate is Interview/Selected and has been associated, or as a general pool of talent submitted
      return cand.status === 'Interview' || cand.status === 'Selected' || cand.status === 'Screening';
    });
  }, [candidates]);

  // Toast Notification state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showLocalToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const newDoc: CompanyDocument = {
        id: `doc_${Date.now()}`,
        title: file.name,
        type: file.name.endsWith('.pdf') ? 'Agreement' : 'JD',
        dateAdded: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      };
      setDocuments(prev => [newDoc, ...prev]);
      
      // Log Activity
      addActivity(`Uploaded document: ${file.name}`, 'Sarah Jenkins');
      showLocalToast(`✓ Uploaded "${file.name}" successfully via mock Supabase Storage!`, 'success');
    }
  };

  // Helper loggers
  const addActivity = (desc: string, user: string = 'Sarah Jenkins') => {
    const newAct: CompanyActivity = {
      id: `act_${Date.now()}`,
      type: 'Update',
      description: desc,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const addCommunication = (type: CommunicationLog['type'], status: CommunicationLog['status'], recipient: string, subject: string, body?: string) => {
    const newComm: CommunicationLog = {
      id: `comm_${Date.now()}`,
      type,
      status,
      sentBy: 'Sarah Jenkins',
      recipient,
      subject,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      body
    };
    setCommunications(prev => [newComm, ...prev]);
  };

  // Add Contact Form Handler
  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactEmail) return;

    const newCon: Contact = {
      id: `con_${Date.now()}`,
      name: newContactName,
      designation: newContactRole || 'HR Consultant',
      department: newContactDept,
      email: newContactEmail,
      phone: newContactPhone || '+1 (555) 000-0000',
      isPrimary: newContactIsPrimary
    };

    if (newContactIsPrimary) {
      // Unmark other primary contacts
      setContacts(prev => prev.map(c => ({ ...c, isPrimary: false })).concat(newCon));
    } else {
      setContacts(prev => [...prev, newCon]);
    }

    addActivity(`Added client contact: ${newContactName} (${newContactRole})`);
    showLocalToast(`✓ Added contact ${newContactName}!`, 'success');
    
    // Reset Form
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactRole('');
    setNewContactIsPrimary(false);
    setShowAddContactModal(false);
  };

  // Add Job Form Handler
  const handleAddJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle) return;

    const newJ: Job = {
      id: `job_${Date.now()}`,
      title: newJobTitle,
      companyId: company.id,
      companyName: company.name,
      experience: newJobExp,
      location: newJobLocation,
      applicationsCount: 0,
      status: 'Open',
      description: newJobDesc || 'Standard requirements details and responsibilities specification.',
      requiredSkills: newJobSkills ? newJobSkills.split(',').map(s => s.trim()) : ['React', 'TypeScript', 'Tailwind CSS'],
      salary: newJobSalary
    };

    onAddJob(newJ);
    addActivity(`Created job posting: ${newJobTitle}`);
    showLocalToast(`✓ Successfully created vacancy for ${newJobTitle}!`, 'success');

    // Reset Form
    setNewJobTitle('');
    setNewJobDesc('');
    setNewJobSkills('');
    setShowAddJobModal(false);
  };

  // Add Note Handler
  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent) return;

    const newN: Note = {
      id: `note_${Date.now()}`,
      content: newNoteContent,
      author: 'Sarah Jenkins',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    setNotes(prev => [newN, ...prev]);
    addActivity(`Added private note: "${newNoteContent.slice(0, 30)}..."`);
    showLocalToast('✓ Added private recruitment note!', 'success');

    setNewNoteContent('');
    setShowAddNoteModal(false);
  };

  // Manual File Upload handler
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newDoc: CompanyDocument = {
        id: `doc_${Date.now()}`,
        title: file.name,
        type: 'Agreement',
        dateAdded: new Date().toISOString().split('T')[0],
        size: '1.4 MB'
      };
      setDocuments(prev => [newDoc, ...prev]);
      addActivity(`Uploaded file: ${file.name}`);
      showLocalToast(`✓ Uploaded document "${file.name}"!`, 'success');
    }
  };

  // Handle Dispatch Email Trigger
  const triggerEmailCompany = (recipientEmail: string = primaryContact.email, name: string = primaryContact.name) => {
    if (onComposeEmail) {
      const syntheticCandidate: Candidate = {
        id: 'comp_' + company.id,
        name: name,
        email: recipientEmail,
        phone: primaryContact.phone || '',
        skills: [],
        experience: '',
        education: '',
        currentCompany: company.name,
        status: 'Applied',
        aiMatchScore: 80,
        resumeText: '',
        address: '',
        notes: '',
        appliedDate: new Date().toISOString().split('T')[0]
      };
      onComposeEmail(syntheticCandidate);
    } else {
      setComposerEmailTo(recipientEmail);
      setComposerEmailSubject(`Hirly - Recruitment Partnership Update - ${company.name}`);
      setComposerEmailBody(`Hi ${name},\n\nI hope your week is going well.\n\nI wanted to share a quick update regarding our sourcing pipeline for your active positions at ${company.name}.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment Partner`);
      setShowEmailModal(true);
    }
  };

  // Handle WhatsApp Trigger
  const triggerWhatsAppCompany = (recipientPhone: string = primaryContact.phone, name: string = primaryContact.name) => {
    if (onComposeWhatsApp) {
      const syntheticCandidate: Candidate = {
        id: 'comp_' + company.id,
        name: name,
        email: primaryContact.email || '',
        phone: recipientPhone || '',
        skills: [],
        experience: '',
        education: '',
        currentCompany: company.name,
        status: 'Applied',
        aiMatchScore: 80,
        resumeText: '',
        address: '',
        notes: '',
        appliedDate: new Date().toISOString().split('T')[0]
      };
      onComposeWhatsApp(syntheticCandidate);
    } else {
      setComposerWATo(recipientPhone);
      setComposerWABody(`Hi ${name}, Sarah from Hirly - Recruitment here. Just wanted to follow up on the candidates we submitted yesterday!`);
      setShowWhatsAppModal(true);
    }
  };

  // Execute Local Email Send
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    addCommunication('Email', 'Sent', composerEmailTo, composerEmailSubject, composerEmailBody);
    addActivity(`Sent email to HR: "${composerEmailSubject}"`);
    showLocalToast(`✓ Email dispatched successfully to ${composerEmailTo}!`, 'success');
    setShowEmailModal(false);
  };

  // Execute Local WhatsApp Send
  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    addCommunication('WhatsApp', 'Delivered', composerWATo, 'WhatsApp Messenger Chat', composerWABody);
    addActivity(`Sent WhatsApp ping to ${composerWATo}`);
    showLocalToast(`✓ WhatsApp message sent to ${composerWATo}!`, 'success');
    setShowWhatsAppModal(false);
  };

  // Execute "Submit Candidate" finish trigger
  const handleFinishSubmission = (selectedCands: Candidate[], selectedJob: Job, emailText: string) => {
    addCommunication(
      'Submission', 
      'Sent', 
      primaryContact.email || `${company.name.toLowerCase()}@hr.com`, 
      `Candidate Submission - ${selectedJob.title}`, 
      emailText
    );
    addActivity(`Submitted ${selectedCands.map(c => c.name).join(', ')} to ${company.name} HR for ${selectedJob.title}`);
    showLocalToast(`✓ Successfully submitted ${selectedCands.length} candidate(s) to ${company.name}!`, 'success');
  };

  // Filters results based on Workspace-Wide Search Bar
  const filteredJobs = useMemo(() => {
    if (!workspaceSearch) return companyJobs;
    return companyJobs.filter(j => 
      j.title.toLowerCase().includes(workspaceSearch.toLowerCase()) || 
      j.location.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [companyJobs, workspaceSearch]);

  const filteredCandidates = useMemo(() => {
    if (!workspaceSearch) return companyCandidates;
    return companyCandidates.filter(c => 
      c.name.toLowerCase().includes(workspaceSearch.toLowerCase()) || 
      (c.skills || []).some(s => s.toLowerCase().includes(workspaceSearch.toLowerCase()))
    );
  }, [companyCandidates, workspaceSearch]);

  const filteredContacts = useMemo(() => {
    if (!workspaceSearch) return contacts;
    return contacts.filter(c => 
      c.name.toLowerCase().includes(workspaceSearch.toLowerCase()) || 
      c.designation.toLowerCase().includes(workspaceSearch.toLowerCase()) || 
      c.email.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [contacts, workspaceSearch]);

  const filteredNotes = useMemo(() => {
    if (!workspaceSearch) return notes;
    return notes.filter(n => n.content.toLowerCase().includes(workspaceSearch.toLowerCase()));
  }, [notes, workspaceSearch]);

  const filteredDocuments = useMemo(() => {
    if (!workspaceSearch) return documents;
    return documents.filter(d => d.title.toLowerCase().includes(workspaceSearch.toLowerCase()));
  }, [documents, workspaceSearch]);

  const filteredCommunications = useMemo(() => {
    if (!workspaceSearch) return communications;
    return communications.filter(c => 
      (c.subject && c.subject.toLowerCase().includes(workspaceSearch.toLowerCase())) || 
      c.recipient.toLowerCase().includes(workspaceSearch.toLowerCase())
    );
  }, [communications, workspaceSearch]);

  return (
    <div className="space-y-6 animate-fade-in" id="company-details-workspace">
      
      {/* Local Toast Toastbox */}
      {toast && (
        <div className="fixed top-5 right-5 z-60 bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-up text-xs font-semibold">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Back to Client Registry & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors font-sans"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Companies
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-400 font-mono">Workspace</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold">{company.name}</span>
      </div>

      {/* Client Meta Hero Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-xl text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/10">
            {company.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-950 font-sans tracking-tight">{company.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-bold font-mono ${
                company.status === 'Active' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {company.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{company.website.replace('https://', '')}</a>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {company.address || 'N/A'}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                Account: <strong className="font-bold text-slate-700">{company.recContact || 'Sarah Jenkins'}</strong>
              </span>
              {company.linkedInUrl && (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    <a href={company.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Company button */}
        <button 
          onClick={() => showLocalToast('Edit company features available inside the central registry.', 'error')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all font-sans"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>

      {/* QUICK ACTIONS BAR - ALWAYS VISIBLE */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1.5">Quick Actions</span>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowAddJobModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Add Job
          </button>
          
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Submit Candidate
          </button>

          <button 
            onClick={() => triggerEmailCompany()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            Email HR
          </button>

          <button 
            onClick={() => triggerWhatsAppCompany()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
            WhatsApp HR
          </button>

          <button 
            onClick={() => setShowAddContactModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Add Contact
          </button>

          <button 
            onClick={() => setShowUploadDocModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            Upload Doc
          </button>

          <button 
            onClick={() => setShowAddNoteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            Create Note
          </button>
        </div>
      </div>

      {/* SEARCH AND TAB NAVIGATION CONTROLS */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-slate-200 pb-1.5">
        {/* Workspace Search Filter */}
        <div className="relative w-full xl:w-80 order-2 xl:order-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search jobs, candidates, logs..."
            value={workspaceSearch}
            onChange={(e) => setWorkspaceSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-xs"
          />
        </div>

        {/* 9 Workspaces Simple Tab System */}
        <div className="flex flex-wrap gap-1 order-1 xl:order-2">
          {(['overview', 'jobs', 'candidates', 'contacts', 'documents', 'notes', 'communication', 'activity', 'ai_insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* WORKSPACE TAB CONTENT PANEL */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm min-h-96">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Highlight metrics bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Open Jobs</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{companyJobs.filter(j => j.status === 'Open').length}</span>
                </div>
                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Active Candidates</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{companyCandidates.length}</span>
                </div>
                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Interviews</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">3</span>
                </div>
                <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Placements</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block text-emerald-600">1</span>
                </div>
              </div>

              {/* Company Details Metadata Panel */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Info className="h-4.5 w-4.5 text-blue-500" />
                  Partnership Dossier
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Industry Focus</span>
                    <p className="font-semibold text-slate-800">{company.industry || 'Financial Technology & Enterprise SaaS'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Company Size</span>
                    <p className="font-semibold text-slate-800">
                      {company.companySize ? `${company.companySize} employees` : '500 - 1000 employees'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Founded Year</span>
                    <p className="font-semibold text-slate-800">{company.foundedYear || '2015'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Partnership Tier</span>
                    <p className="font-semibold text-slate-800">{company.tier || 'Tier 3 (Standard)'}</p>
                  </div>
                  {company.linkedInUrl && (
                    <div className="space-y-1 col-span-1 sm:col-span-2">
                      <span className="font-mono text-[10px] text-slate-400 uppercase">LinkedIn Profile</span>
                      <p className="font-semibold text-slate-800">
                        <a href={company.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          {company.linkedInUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Primary Contact Person</span>
                    <p className="font-semibold text-slate-800">{primaryContact.name} ({primaryContact.designation})</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">Registered Address</span>
                    <p className="font-semibold text-slate-800">{company.address || 'HQ: San Francisco, California'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account manager partner sidecard */}
            <div className="lg:col-span-1 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">PRIMARY CONTACT</h4>
              
              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-xs">{primaryContact.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{primaryContact.designation}</p>
                  <p className="text-[10px] text-blue-600 font-mono mt-1.5">{primaryContact.email}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => triggerEmailCompany(primaryContact.email, primaryContact.name)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                    title="Send Email"
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => triggerWhatsAppCompany(primaryContact.phone, primaryContact.name)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded"
                    title="Send WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Small Recent Communication feed */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">RECENT INTERACTIONS</p>
                <div className="space-y-2 text-[11px] text-slate-600">
                  {communications.slice(0, 2).map(comm => (
                    <div key={comm.id} className="flex gap-2 items-start p-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        comm.type === 'Email' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {comm.type}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{comm.subject}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{comm.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JOBS */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Client Vacancies ({filteredJobs.length})</h3>
              <button 
                onClick={() => setShowAddJobModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Job
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="p-4 font-bold">Job Title</th>
                    <th className="p-4 font-bold">Location</th>
                    <th className="p-4 font-bold">Experience</th>
                    <th className="p-4 font-bold text-center">Salary Range</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No jobs registered matching the search query.</td>
                    </tr>
                  ) : (
                    filteredJobs.map(job => (
                      <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{job.title}</p>
                          <div className="flex gap-1.5 mt-1">
                            {job.requiredSkills.map(skill => (
                              <span key={skill} className="px-1.5 py-0.25 bg-slate-100 text-[9px] text-slate-500 rounded font-mono">{skill}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-slate-500">{job.location}</td>
                        <td className="p-4 text-slate-500 font-mono text-[10px]">{job.experience}</td>
                        <td className="p-4 text-center font-mono text-blue-600 font-bold">{job.salary}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            job.status === 'Open' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => {
                                onEditJob({ ...job, status: job.status === 'Open' ? 'Closed' : 'Open' });
                                showLocalToast(`✓ Vacancy status modified!`, 'success');
                              }}
                              className="px-2 py-1 text-[10px] border border-slate-200 text-slate-600 rounded-md hover:border-blue-500 hover:text-blue-600 bg-white font-medium"
                            >
                              {job.status === 'Open' ? 'Close Job' : 'Open Job'}
                            </button>
                            <button 
                              onClick={() => {
                                const dup: Job = { ...job, id: `job_dup_${Date.now()}`, title: `${job.title} (Duplicate)` };
                                onAddJob(dup);
                                showLocalToast(`✓ Duplicated job opening!`, 'success');
                              }}
                              className="px-2 py-1 text-[10px] border border-slate-200 text-slate-600 rounded-md hover:border-blue-500 hover:text-blue-600 bg-white font-medium"
                            >
                              Duplicate
                            </button>
                            <button 
                              onClick={() => {
                                onDeleteJob(job.id);
                                showLocalToast(`✓ Deleted job opening.`, 'success');
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CANDIDATES */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-900">Submitted Candidate Profiles ({filteredCandidates.length})</h3>
                {selectedCandidateIds.length > 0 && (
                  <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                    {selectedCandidateIds.length} Selected
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Submit Candidate
                </button>
              </div>
            </div>

            {/* Bulk Actions Panel */}
            {selectedCandidateIds.length > 0 && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between text-xs animate-slide-up">
                <span className="font-semibold text-blue-900">Apply bulk actions on selected candidates:</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      showLocalToast(`✓ Mock email templates sent to ${selectedCandidateIds.length} candidate(s)!`, 'success');
                      setSelectedCandidateIds([]);
                    }}
                    className="px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 rounded-lg text-[10px] font-semibold"
                  >
                    Send Bulk Email
                  </button>
                  <button 
                    onClick={() => {
                      showLocalToast(`✓ Bulk WhatsApp alerts dispatched to ${selectedCandidateIds.length} candidate(s)!`, 'success');
                      setSelectedCandidateIds([]);
                    }}
                    className="px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 rounded-lg text-[10px] font-semibold"
                  >
                    Send Bulk WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      selectedCandidateIds.forEach(id => {
                        const cand = candidates.find(c => c.id === id);
                        if (cand) onEditCandidate({ ...cand, status: 'Selected' });
                      });
                      showLocalToast(`✓ Moved ${selectedCandidateIds.length} candidates to Selection stage!`, 'success');
                      setSelectedCandidateIds([]);
                    }}
                    className="px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[10px] font-bold"
                  >
                    Move Stage to Selected
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="p-4 w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onChange={(e) => {
                          setSelectedCandidateIds(e.target.checked ? filteredCandidates.map(c => c.id) : []);
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-slate-300"
                      />
                    </th>
                    <th className="p-4 font-bold">Candidate</th>
                    <th className="p-4 font-bold">Pipeline Stage</th>
                    <th className="p-4 font-bold text-center">AI Match Score</th>
                    <th className="p-4 font-bold">Assigned Recruiter</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No candidates currently submitted for client evaluation. Use "Submit Candidate" above to add profiles.</td>
                    </tr>
                  ) : (
                    filteredCandidates.map(cand => {
                      const isChecked = selectedCandidateIds.includes(cand.id);
                      return (
                        <tr key={cand.id} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-blue-50/20' : ''}`}>
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedCandidateIds(prev => 
                                  isChecked ? prev.filter(id => id !== cand.id) : [...prev, cand.id]
                                );
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-slate-300"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs">
                                {cand.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{cand.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cand.email} • {cand.experience}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={cand.status}
                              onChange={(e) => {
                                onEditCandidate({ ...cand, status: e.target.value as any });
                                addActivity(`Moved ${cand.name} pipeline stage to ${e.target.value}`);
                                showLocalToast(`✓ Stage updated for ${cand.name}!`, 'success');
                              }}
                              className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Screening">Screening</option>
                              <option value="Interview">Interview</option>
                              <option value="Selected">Selected</option>
                              <option value="Joined">Joined</option>
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              cand.aiMatchScore > 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              cand.aiMatchScore > 70 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {cand.aiMatchScore}%
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-medium">{company.recContact || 'Sarah Jenkins'}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => showLocalToast(`Profile summary of ${cand.name}: ${cand.resumeText || 'No custom details loaded.'}`, 'success')}
                                className="p-1 text-slate-400 hover:text-slate-900"
                                title="View Profile Snapshot"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => triggerEmailCompany(cand.email, cand.name)}
                                className="p-1 text-slate-400 hover:text-blue-600"
                                title="Email Candidate"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => triggerWhatsAppCompany(cand.phone, cand.name)}
                                className="p-1 text-slate-400 hover:text-emerald-600"
                                title="WhatsApp Candidate"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  onEditCandidate({ ...cand, status: 'Applied' });
                                  showLocalToast(`Removed submission for ${cand.name}`, 'error');
                                }}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="Remove Candidate Submission"
                              >
                                <Trash className="h-4 w-4" />
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
        )}

        {/* TAB 4: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Corporate Stakeholders & Contacts</h3>
              <button 
                onClick={() => setShowAddContactModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Contact
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map(con => (
                <div key={con.id} className="p-4 border border-slate-200 rounded-2xl bg-white relative hover:shadow-sm transition-all flex flex-col justify-between min-h-40">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {con.name}
                          {con.isPrimary && (
                            <span className="px-1.5 py-0.25 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[9px] font-bold">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{con.designation}</p>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider">{con.department}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-[11px] text-slate-600">
                      <p className="flex items-center gap-1.5 font-mono">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {con.email}
                      </p>
                      <p className="flex items-center gap-1.5 font-mono">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {con.phone}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => triggerEmailCompany(con.email, con.name)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded"
                        title="Email Contact"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => triggerWhatsAppCompany(con.phone, con.name)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 rounded"
                        title="WhatsApp Contact"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          setContacts(prev => prev.map(c => c.id === con.id ? { ...c, isPrimary: true } : { ...c, isPrimary: false }));
                          showLocalToast(`✓ Set ${con.name} as primary contact.`, 'success');
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 border border-slate-200 rounded text-slate-600 hover:border-blue-500 hover:text-blue-600"
                      >
                        Set Primary
                      </button>
                      <button 
                        onClick={() => {
                          setContacts(prev => prev.filter(c => c.id !== con.id));
                          showLocalToast(`Removed contact ${con.name}`, 'error');
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete Contact"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Stored Workspace Documents</h3>
              <button 
                onClick={() => setShowUploadDocModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Upload File
              </button>
            </div>

            {/* Custom file Dropzone mockup */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/30'
              }`}
            >
              <Upload className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 mt-2">Drag and drop agreement files, NDA, or JDs here</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Mock Supabase Storage upload, supporting up to 50MB</p>
              <label className="mt-4 inline-block">
                <span className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer">
                  Browse Files
                </span>
                <input type="file" onChange={handleManualUpload} className="hidden" />
              </label>
            </div>

            {/* Stored docs list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="p-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {doc.type}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs leading-tight">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Uploaded on {doc.dateAdded} • {doc.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => showLocalToast(`Downloading ${doc.title} from Supabase Storage bucket...`, 'success')}
                      className="p-1.5 text-slate-400 hover:text-slate-900 rounded hover:bg-slate-50"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setDocuments(prev => prev.filter(d => d.id !== doc.id));
                        showLocalToast(`Deleted ${doc.title}`, 'error');
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50"
                      title="Delete"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Internal Recruiter Notes</h3>
              <button 
                onClick={() => setShowAddNoteModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </button>
            </div>

            {/* Note form */}
            {showAddNoteModal && (
              <form onSubmit={handleAddNoteSubmit} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3 animate-slide-up">
                <p className="text-xs font-bold text-slate-800">Add recruiter partnership notes</p>
                <textarea 
                  rows={3}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter important hiring constraints, salary negotiability, or client feedback..."
                  className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddNoteModal(false)}
                    className="px-3 py-1 text-xs border border-slate-200 text-slate-600 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-3.5 py-1 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Notes view */}
            <div className="relative border-l border-slate-150 pl-5 ml-1.5 space-y-6">
              {filteredNotes.length === 0 ? (
                <p className="text-slate-400 text-xs pl-2 italic">No custom notes stored yet.</p>
              ) : (
                filteredNotes.map(n => (
                  <div key={n.id} className="relative group">
                    <div className="absolute -left-[24.5px] top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Created by <strong className="font-semibold text-slate-600">{n.author}</strong></span>
                        <span>{n.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: COMMUNICATION */}
        {activeTab === 'communication' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Communication Outbox History</h3>
            
            <div className="space-y-3.5">
              {filteredCommunications.length === 0 ? (
                <p className="text-slate-400 text-xs italic">No communication history logged.</p>
              ) : (
                filteredCommunications.map(comm => (
                  <div key={comm.id} className="p-4 border border-slate-200 rounded-xl bg-white flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] ${
                        comm.type === 'Email' ? 'bg-blue-50 text-blue-700' :
                        comm.type === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {comm.type.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{comm.subject || `${comm.type} Message`}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          To: <strong className="font-semibold text-slate-600">{comm.recipient}</strong> • Sent by {comm.sentBy}
                        </p>
                        {comm.body && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-2 font-mono whitespace-pre-wrap leading-normal">
                            {comm.body}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full text-right gap-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        comm.status === 'Sent' || comm.status === 'Delivered' || comm.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {comm.status}
                      </span>
                      
                      <button 
                        onClick={() => {
                          if (comm.type === 'Email') {
                            setComposerEmailTo(comm.recipient);
                            setComposerEmailSubject(comm.subject);
                            setComposerEmailBody(comm.body || '');
                            setShowEmailModal(true);
                          } else {
                            setComposerWATo(comm.recipient);
                            setComposerWABody(comm.body || '');
                            setShowWhatsAppModal(true);
                          }
                          showLocalToast('✓ Loaded previous template inside dispatch draft!', 'success');
                        }}
                        className="flex items-center gap-1 px-2 py-1 border border-slate-200 text-[10px] text-slate-600 rounded hover:border-blue-500 hover:text-blue-600 font-mono"
                      >
                        <Copy className="h-3 w-3" />
                        Reuse Template
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: ACTIVITY TIMELINE */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Client Activity Timeline</h3>
            
            <div className="relative border-l border-slate-150 pl-5 ml-1.5 space-y-6">
              {activities.map(act => (
                <div key={act.id} className="relative flex items-start gap-4">
                  <div className="absolute -left-[24.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{act.type}</p>
                    <p className="text-slate-600 mt-1">{act.description}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Performed by {act.user} on {act.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: AI INSIGHTS */}
        {activeTab === 'ai_insights' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 text-blue-900 rounded-2xl flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">AI Recruitment Sourcing Insights</p>
                <p className="text-xs text-blue-700 mt-0.5">Real-time stats tracking candidates throughput and client response metrics for {company.name}.</p>
              </div>
            </div>

            {/* Smart KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Average Hiring Time</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">18 Days</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono mt-1 block">↓ 4 Days from Avg</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Client Response Rate</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">92%</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono mt-1 block">Excellent Response</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Candidate Accept Rate</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">85%</span>
                <span className="text-[10px] text-blue-600 font-bold font-mono mt-1 block">Consistent Pipeline</span>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Average Match Score</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">84%</span>
                <span className="text-[10px] text-indigo-600 font-bold font-mono mt-1 block">High Quality Matches</span>
              </div>
            </div>

            {/* AI Smart Suggestions */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">SMART SUGGESTIONS FOR SARAH</p>
              
              <div className="space-y-2 text-xs">
                <div className="p-3.5 bg-amber-55/10 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">High experience constraint detected</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">"Your active vacancy for React Developer requires '7+ Years' experience, yielding very few high matching candidates. Consider lowering this threshold to 4+ Years."</p>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50/50 border border-blue-100 text-blue-900 rounded-xl flex items-start gap-2.5">
                  <Sparkles className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Excellent match candidate pool available</p>
                    <p className="text-[11px] text-blue-800 mt-0.5">"We analyzed your local talent database. 15 newly uploaded candidates match the requirements of open roles at ${company.name} perfectly."</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Dispatch Triggers */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2.5">
              <button 
                onClick={() => {
                  setShowSubmitModal(true);
                  showLocalToast('AI sourcing agent booted. Select a vacancy to search candidates.', 'success');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Find Best Candidates
              </button>
              <button 
                onClick={() => {
                  showLocalToast('✓ Candidate shortlist generated and copied to note timeline!', 'success');
                  const newN: Note = {
                    id: `shortlist_${Date.now()}`,
                    content: '🤖 [AI Generated Shortlist]\nRecommended Candidate Profiles for evaluation:\n- Emily Watson (95% Match) - Expert UI Engineer\n- Sarah Connor (88% Match) - Senior React Developer',
                    author: 'AI Recruiter',
                    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
                  };
                  setNotes(prev => [newN, ...prev]);
                }}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs"
              >
                Generate Candidate Shortlist
              </button>
              <button 
                onClick={() => showLocalToast('✓ Hiring Report PDF generated successfully!', 'success')}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-xs"
              >
                Generate Hiring Report
              </button>
            </div>
          </div>
        )}

      </div>

      {/* --- MODALS BLOCK --- */}

      {/* SUBMIT CANDIDATE MODAL */}
      <SubmitCandidateModal 
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        company={company}
        jobs={jobs}
        candidates={candidates}
        onEditCandidate={onEditCandidate}
        primaryContactEmail={primaryContact.email}
        onRecordSubmission={handleFinishSubmission}
      />

      {/* ADD CONTACT MODAL */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddContactSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Add New HR Contact</h4>
              <button type="button" onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Contact Name *</label>
                <input 
                  type="text" required value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="E.g. Jane Doe"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Designation</label>
                  <input 
                    type="text" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)}
                    placeholder="Talent Acquisition"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Department</label>
                  <select 
                    value={newContactDept} onChange={(e) => setNewContactDept(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Human Resources">HR / Recruiting</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Executive Office">Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Email *</label>
                <input 
                  type="email" required value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="jane.doe@company.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Phone Number</label>
                <input 
                  type="text" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input 
                  type="checkbox" checked={newContactIsPrimary} onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                  className="h-4.5 w-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 font-semibold select-none">Mark as primary account contact</span>
              </label>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={() => setShowAddContactModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg">
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD JOB MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddJobSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Create Open Job Opening</h4>
              <button type="button" onClick={() => setShowAddJobModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Job Title *</label>
                <input 
                  type="text" required value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="Senior React Developer, Staff QA Engineer..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Location</label>
                  <input 
                    type="text" value={newJobLocation} onChange={(e) => setNewJobLocation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Experience</label>
                  <input 
                    type="text" value={newJobExp} onChange={(e) => setNewJobExp(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Salary Range</label>
                  <input 
                    type="text" value={newJobSalary} onChange={(e) => setNewJobSalary(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Required Skills (Comma-separated)</label>
                <input 
                  type="text" value={newJobSkills} onChange={(e) => setNewJobSkills(e.target.value)}
                  placeholder="React, TypeScript, Redux, Node.js"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Job Description</label>
                <textarea 
                  rows={3} value={newJobDesc} onChange={(e) => setNewJobDesc(e.target.value)}
                  placeholder="Summarize the core mandates & credentials of the opening..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={() => setShowAddJobModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg">
                Create Vacancy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRIVATE NOTES MODAL */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddNoteSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Create Recruiter Note</h4>
              <button type="button" onClick={() => setShowAddNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5">
              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5">Private Partnership Log *</label>
              <textarea 
                rows={4} required value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter negotiable terms, candidate feedback, screening results..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button type="button" onClick={() => setShowAddNoteModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg">
                Save Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MOCK STORAGE UPLOAD MODAL */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Upload Workspace Document</h4>
              <button onClick={() => setShowUploadDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 bg-slate-50/20'
              }`}
            >
              <Upload className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 mt-2">Drag and drop file here</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Mock Supabase Storage upload, supporting up to 50MB</p>
              <label className="mt-4 inline-block">
                <span className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer">
                  Browse Files
                </span>
                <input type="file" onChange={(e) => {
                  handleManualUpload(e);
                  setShowUploadDocModal(false);
                }} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL COMPOSE MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendEmail} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase flex items-center gap-1.5">
                <Mail className="h-4.5 w-4.5 text-slate-500" />
                Dispatch Client Email
              </h4>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Quick Template Picker */}
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-blue-500" /> Select Outreach Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'custom',
                      name: '✏️ Custom (Blank)',
                      subject: `Hirly - Recruitment Partnership Update - ${company.name}`,
                      body: `Hi ${primaryContact.name || 'Team'},\n\nI hope this email finds you well.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment Partner`
                    },
                    {
                      id: 'sourcing_update',
                      name: '⏱️ Sourcing Update',
                      subject: `Hirly - Sourcing Pipeline Update for ${company.name}`,
                      body: `Hi ${primaryContact.name || 'Team'},\n\nI hope your week is going well.\n\nI wanted to share a quick update regarding our sourcing pipeline for your active positions at ${company.name}. We've got several high-potential prospects undergoing final assessments.\n\nBest regards,\nSarah Jenkins\nHirly Recruitment Partner`
                    },
                    {
                      id: 'shortlist_presentation',
                      name: '💼 Shortlist CVs',
                      subject: `Hirly - Selected Candidate Shortlist for ${company.name}`,
                      body: `Hi ${primaryContact.name || 'Team'},\n\nWe have completed our initial screening round and compiled a highly selective shortlist of premium candidates matching your active requirements.\n\nI've attached their vetted CVs and match details. Please let us know who you would like to advance to interviews.\n\nWarmly,\nSarah Jenkins\nHirly Recruitment Partner`
                    },
                    {
                      id: 'schedule_sync',
                      name: '📅 Schedule Sync',
                      subject: `Hirly - Quick Check-in Sync for ${company.name}`,
                      body: `Hi ${primaryContact.name || 'Team'},\n\nWould you be available for a brief 10-minute check-in sync this week to align on your hiring timeline and ongoing active roles?\n\nLooking forward to speaking with you.\n\nBest,\nSarah Jenkins\nHirly Recruitment Partner`
                    }
                  ].map(tmpl => {
                    const isSelected = selectedCompanyTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompanyTemplateId(tmpl.id);
                          setComposerEmailSubject(tmpl.subject);
                          setComposerEmailBody(tmpl.body);
                        }}
                        className={`p-2 rounded-xl border text-left transition-all text-xs font-medium ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold truncate">{tmpl.name}</div>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">Quick select style</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">To Contact Email</label>
                <input 
                  type="email" required value={composerEmailTo} onChange={(e) => setComposerEmailTo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Subject Line</label>
                <input 
                  type="text" required value={composerEmailSubject} onChange={(e) => setComposerEmailSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Email Body Draft</label>
                <textarea 
                  rows={8} required value={composerEmailBody} onChange={(e) => setComposerEmailBody(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-900 text-slate-100 font-sans"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Email channel verified
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowEmailModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg flex items-center gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Send Email
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* WHATSAPP COMPOSE MODAL */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-55 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendWhatsApp} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900 font-sans uppercase flex items-center gap-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
                Dispatch WhatsApp Alert
              </h4>
              <button type="button" onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Recipient Mobile</label>
                <input 
                  type="text" required value={composerWATo} onChange={(e) => setComposerWATo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">WhatsApp message text</label>
                <textarea 
                  rows={4} required value={composerWABody} onChange={(e) => setComposerWABody(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-slate-900 text-slate-100 font-sans"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                SMS Router active
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowWhatsAppModal(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg flex items-center gap-1">
                  <Send className="h-3.5 w-3.5" />
                  Send message
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
