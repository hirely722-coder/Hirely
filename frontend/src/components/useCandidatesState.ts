import React, { useState, useEffect, useRef } from 'react';
import { Candidate, CommunicationLog, EmailConfig, Job, Task } from '../types';
import { supabase } from '../utils/supabase';
import { processPdfFile } from '../utils/pdfParser';

interface UseCandidatesStateProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  openResumeUploadOnLoad?: boolean;
  onAddCommunicationLog: (log: CommunicationLog) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
  triggerAutoTask: (candidate: Candidate, triggerType: 'email_sent' | 'whatsapp_sent' | 'interview_scheduled' | 'candidate_selected' | 'followup_added') => void;
}

export interface BulkResumeItem {
  id: string;
  file: File;
  status: 'pending' | 'parsing' | 'success' | 'error';
  errorMessage?: string;
  extractedData?: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: string;
    education: string;
    currentCompany: string;
    address: string;
    resumeTextSummary: string;
  };
}

export function useCandidatesState({
  candidates,
  onAddCandidate,
  onEditCandidate,
  onDeleteCandidate,
  openResumeUploadOnLoad = false,
  onAddCommunicationLog,
  showToast,
  triggerAutoTask
}: UseCandidatesStateProps) {
  // Navigation & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'experience'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Advanced Filters State
  const [designationFilter, setDesignationFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [salaryFilter, setSalaryFilter] = useState<string>('All');
  const [educationFilter, setEducationFilter] = useState<string>('All');
  const [experienceFilter, setExperienceFilter] = useState<string>('All');
  const [scoreFilter, setScoreFilter] = useState<string>('All');
  const [skillsCountFilter, setSkillsCountFilter] = useState<string>('All');
  const [resumeAttachedFilter, setResumeAttachedFilter] = useState<string>('All');
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Form Fields State Additions
  const [formDesignation, setFormDesignation] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formCity, setFormCity] = useState('');
  const [formExpectedSalary, setFormExpectedSalary] = useState('');
  const [formCustomFields, setFormCustomFields] = useState<Record<string, any>>({});

  // Dynamic Columns Configuration state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hirely_candidate_columns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return ['name', 'contact', 'experience', 'currentCompany', 'status'];
  });
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateNotes, setCandidateNotes] = useState('');

  useEffect(() => {
    if (selectedCandidate) {
      setCandidateNotes(selectedCandidate.notes || '');
    }
  }, [selectedCandidate?.id]);

  const handleSaveNotes = () => {
    if (!selectedCandidate) return;
    const updated = { ...selectedCandidate, notes: candidateNotes };
    onEditCandidate(updated);
    setSelectedCandidate(updated);
    showToast('✓ Assessment notes updated!', 'success');
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(openResumeUploadOnLoad);
  const [showEditModal, setShowEditModal] = useState<Candidate | null>(null);

  const [bulkItems, setBulkItems] = useState<BulkResumeItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [reviewItem, setReviewItem] = useState<BulkResumeItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume form states for manual / single review additions
  const [resumeText, setResumeText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsingStep, setParsingStep] = useState<string>('');
  const [formResumeFileName, setFormResumeFileName] = useState('');

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('');
  const [formCurrentCompany, setFormCurrentCompany] = useState('');
  const [formStatus, setFormStatus] = useState<Candidate['status']>('Pool');
  const [formEducation, setFormEducation] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const addFilesToBulk = (files: FileList) => {
    const newItems: BulkResumeItem[] = Array.from(files).map(file => ({
      id: 'bulk_' + Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending'
    }));
    setBulkItems(prev => [...prev, ...newItems]);
  };

  const removeBulkItem = (id: string) => {
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToBulk(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      addFilesToBulk(e.target.files);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormExperience('');
    setFormSkillsText('');
    setFormCurrentCompany('');
    setFormStatus('Pool');
    setFormEducation('');
    setFormAddress('');
    setFormNotes('');
    setResumeText('');
    setFormResumeFileName('');
    setFormDesignation('');
    setFormGender('Male');
    setFormCity('');
    setFormExpectedSalary('');
    setFormCustomFields({});
    setUploadedFile(null);
    setParsingStep('');
    setParseError(null);
    setBulkItems([]);
    setReviewItem(null);
  };

  const handleSort = (field: 'name' | 'score' | 'experience') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const startAddManually = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    // Generate random AI score if not pre-parsed (e.g. 70 - 95)
    const mockScore = Math.floor(Math.random() * 25) + 70;

    const newCandidate: Candidate = {
      id: 'can_' + Date.now(),
      name: formName,
      email: formEmail,
      phone: formPhone,
      experience: formExperience || '0 Years',
      skills: formSkillsText.split(',').map(s => s.trim()).filter(Boolean),
      currentCompany: formCurrentCompany || 'Independent',
      status: 'Pool',
      aiMatchScore: mockScore,
      resumeText: resumeText || `${formName} manual entry profile.`,
      resumeFileName: formResumeFileName || (uploadedFile ? uploadedFile.name : undefined),
      education: formEducation,
      address: formAddress,
      notes: formNotes,
      appliedDate: new Date().toISOString().split('T')[0],
      designation: formDesignation || undefined,
      gender: formGender || undefined,
      city: formCity || undefined,
      expectedSalary: formExpectedSalary || undefined,
      customFields: formCustomFields
    };

    onAddCandidate(newCandidate);
    setShowAddModal(false);
    resetForm();
  };

  const startEdit = (candidate: Candidate) => {
    setFormName(candidate.name);
    setFormEmail(candidate.email);
    setFormPhone(candidate.phone);
    setFormExperience(candidate.experience);
    setFormSkillsText((candidate.skills || []).join(', '));
    setFormCurrentCompany(candidate.currentCompany);
    setFormStatus(candidate.status);
    setFormEducation(candidate.education);
    setFormAddress(candidate.address);
    setFormNotes(candidate.notes);
    setResumeText(candidate.resumeText);
    setFormResumeFileName(candidate.resumeFileName || '');
    setFormDesignation(candidate.designation || '');
    setFormGender(candidate.gender || 'Male');
    setFormCity(candidate.city || '');
    setFormExpectedSalary(candidate.expectedSalary || '');
    setFormCustomFields(candidate.customFields || {});
    setShowEditModal(candidate);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    const updated: Candidate = {
      ...showEditModal,
      name: formName,
      email: formEmail,
      phone: formPhone,
      experience: formExperience,
      skills: formSkillsText.split(',').map(s => s.trim()).filter(Boolean),
      currentCompany: formCurrentCompany,
      status: formStatus,
      education: formEducation,
      address: formAddress,
      notes: formNotes,
      resumeText: resumeText,
      resumeFileName: formResumeFileName || showEditModal.resumeFileName,
      designation: formDesignation || undefined,
      gender: formGender || undefined,
      city: formCity || undefined,
      expectedSalary: formExpectedSalary || undefined,
      customFields: formCustomFields
    };

    onEditCandidate(updated);
    if (selectedCandidate?.id === updated.id) {
      setSelectedCandidate(updated);
    }
    setShowEditModal(null);
  };

  // Call backend Express router to parse all pending/error resumes in bulk with Hirly
  const handleParseBulkResumes = async () => {
    const itemsToParse = bulkItems.filter(item => item.status === 'pending' || item.status === 'error');
    if (itemsToParse.length === 0) return;

    setIsParsing(true);
    setParseError(null);

    // Parse each resume sequentially
    for (let index = 0; index < itemsToParse.length; index++) {
      const item = itemsToParse[index];
      setParsingStep(`Parsing: "${item.file.name}" (${index + 1}/${itemsToParse.length})...`);
      
      // Update item status to 'parsing'
      setBulkItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'parsing' } : p));
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Browser-side PDF text extraction and OCR fallback
        let uploadFile: File | Blob = item.file;
        let uploadFileName = item.file.name;

        if (item.file.type === 'application/pdf' || item.file.name.endsWith('.pdf')) {
          const parsedResult = await processPdfFile(item.file);
          uploadFile = parsedResult.file;
          uploadFileName = parsedResult.fileName;
        }

        const formData = new FormData();
        formData.append('file', uploadFile, uploadFileName);

        const response = await fetch('/api/ai/parse-resume', {
          method: 'POST',
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Failed to call parsing route.');
        }

        const result = await response.json();
        const extracted = result.data;

        // Update item status to 'success' with extractedData
        setBulkItems(prev => prev.map(p => p.id === item.id ? { 
          ...p, 
          status: 'success',
          extractedData: {
            name: extracted.name || item.file.name.replace(/\.[^/.]+$/, ""),
            email: extracted.email || '',
            phone: extracted.phone || '',
            skills: Array.isArray(extracted.skills) ? extracted.skills : [],
            experience: extracted.experience || '1 Year',
            education: extracted.education || '',
            currentCompany: extracted.currentCompany || 'Independent',
            address: extracted.address || '',
            resumeTextSummary: extracted.resumeTextSummary || `${extracted.name}'s parsed resume.`
          }
        } : p));

      } catch (err: any) {
        console.error('Error parsing file:', item.file.name, err);
        setBulkItems(prev => prev.map(p => p.id === item.id ? { 
          ...p, 
          status: 'error',
          errorMessage: err.message || 'Error occurred while contacting the parsing server.' 
        } : p));
      }
    }

    setIsParsing(false);
    setParsingStep('');
    showToast('✓ Bulk parsing session completed!', 'success');
  };

  // Import all successfully parsed candidates in bulk
  const handleImportAllSuccess = () => {
    const successItems = bulkItems.filter(item => item.status === 'success' && item.extractedData);
    if (successItems.length === 0) {
      showToast('No successfully parsed resumes to import', 'error');
      return;
    }

    let importCount = 0;
    successItems.forEach((item, idx) => {
      const data = item.extractedData!;
      const mockScore = Math.floor(Math.random() * 20) + 75;
      
      const newCandidate: Candidate = {
        id: 'can_' + (Date.now() + idx + Math.floor(Math.random() * 1000)),
        name: data.name,
        email: data.email,
        phone: data.phone,
        experience: data.experience || '1 Year',
        skills: data.skills,
        currentCompany: data.currentCompany || 'Independent',
        status: 'Pool',
        aiMatchScore: mockScore,
        resumeText: data.resumeTextSummary || `${data.name}'s uploaded profile.`,
        resumeFileName: item.file.name,
        education: data.education,
        address: data.address,
        notes: '',
        appliedDate: new Date().toISOString().split('T')[0]
      };

      onAddCandidate(newCandidate);
      importCount++;
    });

    showToast(`✓ Successfully imported ${importCount} candidates in bulk!`, 'success');
    setBulkItems([]);
    setShowUploadModal(false);
  };

  const handleSaveReviewItem = (updatedData: any) => {
    if (!reviewItem) return;
    setBulkItems(prev => prev.map(p => p.id === reviewItem.id ? { 
      ...p, 
      extractedData: {
        ...p.extractedData,
        ...updatedData,
        skills: typeof updatedData.skills === 'string' 
          ? updatedData.skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
          : updatedData.skills
      } 
    } : p));
    setReviewItem(null);
    showToast('✓ Candidate details updated!', 'success');
  };

  const handleLogCompletedCall = (cand: Candidate) => {
    const logId = 'log_' + Date.now();
    const newLog: CommunicationLog = {
      id: logId,
      candidateId: cand.id,
      type: 'Call',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Completed',
      sentBy: 'Sarah Jenkins',
      subject: 'Candidate Phone Screen Completed',
      message: 'Brief telephonic screening completed. Candidate confirmed current availability, Notice Period, and matching salary expectations.'
    };
    onAddCommunicationLog(newLog);
    triggerAutoTask(cand, 'followup_added');
    showToast(`✓ Completed call logged for ${cand.name}!`, 'success');
  };

  return {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    designationFilter, setDesignationFilter,
    genderFilter, setGenderFilter,
    cityFilter, setCityFilter,
    salaryFilter, setSalaryFilter,
    educationFilter, setEducationFilter,
    experienceFilter, setExperienceFilter,
    scoreFilter, setScoreFilter,
    skillsCountFilter, setSkillsCountFilter,
    resumeAttachedFilter, setResumeAttachedFilter,
    customFieldFilters, setCustomFieldFilters,
    showFiltersPanel, setShowFiltersPanel,
    formDesignation, setFormDesignation,
    formGender, setFormGender,
    formCity, setFormCity,
    formExpectedSalary, setFormExpectedSalary,
    formCustomFields, setFormCustomFields,
    visibleColumns, setVisibleColumns,
    showColumnCustomizer, setShowColumnCustomizer,
    selectedCandidate, setSelectedCandidate,
    candidateNotes, setCandidateNotes,
    showAddModal, setShowAddModal,
    showUploadModal, setShowUploadModal,
    showEditModal, setShowEditModal,
    bulkItems, setBulkItems,
    isParsing, setIsParsing,
    parseError, setParseError,
    dragActive, setDragActive,
    reviewItem, setReviewItem,
    resumeText, setResumeText,
    uploadedFile, setUploadedFile,
    parsingStep, setParsingStep,
    formResumeFileName, setFormResumeFileName,
    formName, setFormName,
    formEmail, setFormEmail,
    formPhone, setFormPhone,
    formExperience, setFormExperience,
    formSkillsText, setFormSkillsText,
    formCurrentCompany, setFormCurrentCompany,
    formStatus, setFormStatus,
    formEducation, setFormEducation,
    formAddress, setFormAddress,
    formNotes, setFormNotes,
    currentPage, setCurrentPage,
    itemsPerPage,
    fileInputRef,
    
    handleSaveNotes,
    removeBulkItem,
    handleDrag,
    handleDrop,
    handleFileChange,
    resetForm,
    handleSort,
    startAddManually,
    handleSaveAdd,
    startEdit,
    handleSaveEdit,
    handleParseBulkResumes,
    handleImportAllSuccess,
    handleSaveReviewItem,
    handleLogCompletedCall
  };
}
