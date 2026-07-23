import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Company, Job, Candidate, Contact, CompanyDocument, Note, CompanyActivity, CommunicationLog, ActivityLog } from '../../types';
import { supabase } from '../../utils/supabase';

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
  const [currentUserName, setCurrentUserName] = useState('Recruiter');

  // Resolve current user's display name from Supabase session
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Recruiter';
        setCurrentUserName(name);
      }
    });
  }, []);
  
  // Local Workspace Search Query
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // Local state for client-specific lists synced with the database
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [activities, setActivities] = useState<CompanyActivity[]>([]);

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

  // Toast Notification state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const showLocalToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Fetching Functions ---
  const fetchContacts = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/company_contacts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data.filter((item: any) => item.companyId === company.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  }, [company.id]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/company_documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((item: any) => item.companyId === company.id) : [];
        const mapped = filtered.map((doc: any) => ({
          ...doc,
          dateAdded: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        setDocuments(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [company.id]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/company_notes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data.filter((item: any) => item.companyId === company.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }, [company.id]);

  const fetchCommunications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/communication_logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((item: any) => item.companyId === company.id) : [];
        const mapped = filtered.map((comm: any) => ({
          ...comm,
          body: comm.message || comm.body || ''
        }));
        setCommunications(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch communications:', err);
    }
  }, [company.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/activity_logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((item: any) => item.companyId === company.id) : [];
        const mapped = filtered.map((act: any) => ({
          id: act.id,
          type: act.type,
          description: act.description,
          date: act.timestamp ? new Date(act.timestamp).toISOString().replace('T', ' ').slice(0, 16) : new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: act.userName || act.user || 'Unassigned'
        }));
        setActivities(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, [company.id]);

  useEffect(() => {
    fetchContacts();
    fetchDocuments();
    fetchNotes();
    fetchCommunications();
    fetchActivities();
  }, [fetchContacts, fetchDocuments, fetchNotes, fetchCommunications, fetchActivities]);

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

  const uploadDocument = async (file: File) => {
    try {
      const filePath = `${company.id}/${Date.now()}_${file.name}`;
      
      // Upload to Supabase Storage Bucket (requires bucket: company-documents)
      const { data, error } = await supabase.storage
        .from('company-documents')
        .upload(filePath, file);

      if (error) throw error;

      // Save Metadata to public.company_documents
      const newDoc = {
        companyId: company.id,
        title: file.name,
        type: file.name.endsWith('.pdf') ? 'Agreement' : 'JD',
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        filePath: data.path
      };

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/company_documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newDoc)
      });

      if (!res.ok) throw new Error('Failed to save document metadata');

      showLocalToast(`✓ Uploaded "${file.name}" successfully!`, 'success');
      await fetchDocuments();
      await addActivity(`Uploaded document: ${file.name}`);
    } catch (err: any) {
      console.error(err);
      showLocalToast(`Failed to upload document: ${err.message}`, 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadDocument(e.dataTransfer.files[0]);
    }
  };

  // Helper loggers (Write audit trails to database)
  const addActivity = async (desc: string, user: string = currentUserName) => {
    const newAct = {
      companyId: company.id,
      type: 'Update',
      description: desc,
      userName: user,
      timestamp: new Date().toISOString()
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch('/api/activity_logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newAct)
      });
      await fetchActivities();
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const addCommunication = async (type: CommunicationLog['type'], status: CommunicationLog['status'], recipient: string, subject: string, body?: string) => {
    const newComm = {
      companyId: company.id,
      type,
      status,
      sentBy: currentUserName,
      recipient,
      subject,
      message: body || '',
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch('/api/communication_logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newComm)
      });
      await fetchCommunications();
    } catch (err) {
      console.error('Failed to log communication:', err);
    }
  };

  // Add Contact Form Handler
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactEmail) return;

    const newCon = {
      companyId: company.id,
      name: newContactName,
      designation: newContactRole || 'HR Consultant',
      department: newContactDept,
      email: newContactEmail,
      phone: newContactPhone || '+1 (555) 000-0000',
      isPrimary: newContactIsPrimary
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // If we mark this contact as primary, we must first unmark any existing primary contacts
      if (newContactIsPrimary) {
        const primaries = contacts.filter(c => c.isPrimary);
        for (const prim of primaries) {
          await fetch(`/api/company_contacts/${prim.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ ...prim, isPrimary: false })
          });
        }
      }

      const res = await fetch('/api/company_contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newCon)
      });

      if (!res.ok) throw new Error('Failed to create contact');

      showLocalToast(`✓ Added contact ${newContactName}!`, 'success');
      await fetchContacts();
      await addActivity(`Added client contact: ${newContactName} (${newContactRole})`);
    } catch (err: any) {
      console.error(err);
      showLocalToast('Failed to add contact', 'error');
    }
    
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
  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent) return;

    const newN = {
      companyId: company.id,
      content: newNoteContent,
      author: currentUserName,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/company_notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newN)
      });

      if (!res.ok) throw new Error('Failed to create note');

      showLocalToast('✓ Added private recruitment note!', 'success');
      await fetchNotes();
      await addActivity(`Added private note: "${newNoteContent.slice(0, 30)}..."`);
    } catch (err: any) {
      console.error(err);
      showLocalToast('Failed to add note', 'error');
    }

    setNewNoteContent('');
    setShowAddNoteModal(false);
  };

  // Manual File Upload handler
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadDocument(e.target.files[0]);
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
      setComposerEmailBody(`Hi ${name},\n\nI hope your week is going well.\n\nI wanted to share a quick update regarding our sourcing pipeline for your active positions at ${company.name}.\n\nBest regards,\n${currentUserName}\nHirly Recruitment Partner`);
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
