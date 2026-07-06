import React, { useState, useMemo } from 'react';
import { Company, Job, Candidate } from '../../types';
import { 
  Contact, CompanyDocument, Note, CommunicationLog, CompanyActivity,
  generateInitialContacts, generateInitialDocuments, generateInitialNotes,
  generateInitialCommunications, generateInitialActivities
} from '../../utils/companyMockData';

interface UseCompanyStateProps {
  company: Company;
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

export function useCompanyState({
  company,
  jobs,
  candidates,
  onEditCompany,
  onEditCandidate,
  onAddJob,
  onEditJob,
  onDeleteJob,
  onComposeEmail,
  onComposeWhatsApp
}: UseCompanyStateProps) {
  // Tab selector
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'candidates' | 'contacts' | 'documents' | 'notes' | 'communication' | 'activity' | 'ai_insights'>('overview');
  
  // Local Workspace Search Query
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Local state for client-specific lists
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
  const [newJobExp, setNewJobExp] = useState('Mid (3-5 Years)');
  const [newJobSalary, setNewJobSalary] = useState('₹120,000 - ₹150,000');
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

  // Candidates submitted to this company
  const companyCandidates = useMemo(() => {
    return candidates.filter(cand => {
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
      setShowUploadDocModal(false);
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

  return {
    activeTab,
    setActiveTab,
    workspaceSearch,
    setWorkspaceSearch,
    contacts,
    setContacts,
    documents,
    setDocuments,
    notes,
    setNotes,
    communications,
    setCommunications,
    activities,
    setActivities,
    showSubmitModal,
    setShowSubmitModal,
    showAddContactModal,
    setShowAddContactModal,
    showAddJobModal,
    setShowAddJobModal,
    showAddNoteModal,
    setShowAddNoteModal,
    showUploadDocModal,
    setShowUploadDocModal,
    showEmailModal,
    setShowEmailModal,
    showWhatsAppModal,
    setShowWhatsAppModal,
    newContactName,
    setNewContactName,
    newContactEmail,
    setNewContactEmail,
    newContactPhone,
    setNewContactPhone,
    newContactRole,
    setNewContactRole,
    newContactDept,
    setNewContactDept,
    newContactIsPrimary,
    setNewContactIsPrimary,
    newJobTitle,
    setNewJobTitle,
    newJobLocation,
    setNewJobLocation,
    newJobExp,
    setNewJobExp,
    newJobSalary,
    setNewJobSalary,
    newJobDesc,
    setNewJobDesc,
    newJobSkills,
    setNewJobSkills,
    newNoteContent,
    setNewNoteContent,
    dragActive,
    setDragActive,
    composerEmailTo,
    setComposerEmailTo,
    composerEmailSubject,
    setComposerEmailSubject,
    composerEmailBody,
    setComposerEmailBody,
    selectedCompanyTemplateId,
    setSelectedCompanyTemplateId,
    composerWATo,
    setComposerWATo,
    composerWABody,
    setComposerWABody,
    selectedCandidateIds,
    setSelectedCandidateIds,
    primaryContact,
    companyJobs,
    companyCandidates,
    toast,
    setToast,
    showLocalToast,
    handleDrag,
    handleDrop,
    addActivity,
    addCommunication,
    handleAddContactSubmit,
    handleAddJobSubmit,
    handleAddNoteSubmit,
    handleManualUpload,
    triggerEmailCompany,
    triggerWhatsAppCompany,
    handleSendEmail,
    handleSendWhatsApp,
    handleFinishSubmission
  };
}
