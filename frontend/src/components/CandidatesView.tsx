import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, 
  Eye, Edit2, Trash2, Mail, Phone, MessageSquare, Plus, FileText, 
  Sparkles, X, Upload, CheckCircle, HelpCircle, Loader2, Calendar, MapPin, Building2, GraduationCap, Clock, ArrowLeft, Briefcase 
} from 'lucide-react';
import { Candidate, CommunicationLog, EmailConfig, Job, Task } from '../types';
import { calculateMatchScore, isSkillMatch } from '../utils/matching';

interface CandidatesViewProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  openResumeUploadOnLoad?: boolean;
  communicationLogs: CommunicationLog[];
  onAddCommunicationLog: (log: CommunicationLog) => void;
  emailConfig: EmailConfig;
  jobs: Job[];
  onAddTask: (task: Task) => void;
  setNotifications: React.Dispatch<React.SetStateAction<{ id: string; text: string; time: string; read: boolean }[]>>;
  showToast: (text: string, type: 'success' | 'error') => void;
  triggerAutoTask: (candidate: Candidate, triggerType: 'email_sent' | 'whatsapp_sent' | 'interview_scheduled' | 'candidate_selected' | 'followup_added') => void;
  onComposeEmail: (candidate: Candidate, preselectedJob?: Job) => void;
  onComposeWhatsApp: (candidate: Candidate, preselectedJob?: Job) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onAddTaskForCandidate: (candidate: Candidate) => void;
  onOpenCSVImport?: (type: 'companies' | 'jobs' | 'candidates') => void;
}

export default function CandidatesView({
  candidates,
  onAddCandidate,
  onEditCandidate,
  onDeleteCandidate,
  openResumeUploadOnLoad = false,
  communicationLogs = [],
  onAddCommunicationLog,
  emailConfig,
  jobs,
  onAddTask,
  setNotifications,
  showToast,
  triggerAutoTask,
  onComposeEmail,
  onComposeWhatsApp,
  onScheduleInterview,
  onAddTaskForCandidate,
  onOpenCSVImport
}: CandidatesViewProps) {
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
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Form Fields State Additions
  const [formDesignation, setFormDesignation] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [formCity, setFormCity] = useState('');
  const [formExpectedSalary, setFormExpectedSalary] = useState('');

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

  // Compute open jobs ranked by skill overlap with selected candidate
  const matchedJobs = useMemo(() => {
    if (!selectedCandidate || !jobs) return [];
    
    const candidateSkills = selectedCandidate.skills || [];
    
    return jobs
      .filter(job => job.status === 'Open')
      .map(job => {
        const requiredSkills = job.requiredSkills || [];
        
        // Find skills that match
        const matchingSkills: string[] = [];
        requiredSkills.forEach(rs => {
          const hasMatch = candidateSkills.some(cs => isSkillMatch(cs, rs));
          if (hasMatch) {
            matchingSkills.push(rs);
          }
        });

        const matchScore = calculateMatchScore(selectedCandidate, job);

        return {
          ...job,
          matchingSkills,
          matchScore
        };
      })
      // Strictly filter out completely unrelated jobs (matchScore <= 15%)
      .filter(item => item.matchScore > 15)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedCandidate, jobs]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(openResumeUploadOnLoad);
  const [showEditModal, setShowEditModal] = useState<Candidate | null>(null);
  
  // Bulk Resume Parsing States & Types
  interface BulkResumeItem {
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

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

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formSkillsText, setFormSkillsText] = useState('');
  const [formCurrentCompany, setFormCurrentCompany] = useState('');
  const [formStatus, setFormStatus] = useState<Candidate['status']>('Applied');
  const [formEducation, setFormEducation] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [activeTab, setActiveTab] = useState<'profile' | 'resume' | 'timeline' | 'communication'>('profile');

  // Sample Resume Templates for Quick One-Click Recruiter Testing
  const SAMPLE_RESUMES = [
    {
      label: "Figma UI/UX Designer Profile",
      text: `CLARA OSWALD
clara.o@outlook.com | +1 (555) 789-3344 | San Francisco, CA
EXPERIENCE:
Product Designer at Framer (4 Years)
- Crafted visual drag-and-drop playground systems.
- Managed user research sprints and design-to-code components.
EDUCATION:
Rhode Island School of Design (RISD) - B.A. in Graphic Design
SKILLS: Figma, UI/UX, Prototyping, HTML/CSS, React, Motion Design`
    },
    {
      label: "Full Stack NodeJS & React Profile",
      text: `DEVIN PATEL
devin.patel@devin.codes | +1 (555) 234-9988 | Austin, TX
SUMMARY:
Full-stack engineer with 5 years of experience deploying scalable microservices on AWS and React administration dashboards.
EXPERIENCE:
Full Stack Developer at Retool (3 Years)
- Built internal query sandboxes and browser compilation tools.
EDUCATION:
University of Texas at Austin - B.S. in Computer Engineering
SKILLS: React, TypeScript, Node.js, AWS, Kubernetes, Docker, PostgreSQL`
    }
  ];

  // Utility to parse salary string into numbers for range filtering
  const parseSalary = (salaryStr: string | undefined): number => {
    if (!salaryStr) return 0;
    const cleanStr = salaryStr.replace(/[^0-9]/g, '');
    return parseInt(cleanStr) || 0;
  };

  const designationsList = useMemo(() => {
    const list = new Set<string>();
    candidates.forEach(c => {
      if (c.designation) {
        list.add(c.designation);
      }
    });
    return ['All', ...Array.from(list)];
  }, [candidates]);

  const citiesList = useMemo(() => {
    const list = new Set<string>();
    candidates.forEach(c => {
      if (c.city) {
        list.add(c.city);
      } else if (c.address) {
        const parts = c.address.split(',');
        if (parts.length > 0) {
          const possibleCity = parts[0].trim();
          if (possibleCity && possibleCity.length < 30) {
            list.add(possibleCity);
          }
        }
      }
    });
    return ['All', ...Array.from(list)];
  }, [candidates]);

  // Filtering & Sorting Logic
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(candidate => {
        const matchesSearch = 
          candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (candidate.skills || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
          candidate.currentCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (candidate.designation || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'All' || candidate.status === statusFilter;

        // 1. Designation Filter
        const matchesDesignation = designationFilter === 'All' || candidate.designation === designationFilter;

        // 2. Gender Filter
        const matchesGender = genderFilter === 'All' || candidate.gender === genderFilter;

        // 3. City Filter
        const matchesCity = cityFilter === 'All' || 
          candidate.city === cityFilter || 
          (candidate.address && candidate.address.toLowerCase().includes(cityFilter.toLowerCase()));

        // 4. Salary Filter
        let matchesSalary = true;
        if (salaryFilter !== 'All') {
          const salaryVal = parseSalary(candidate.expectedSalary);
          if (salaryFilter === 'Under $100k') {
            matchesSalary = salaryVal > 0 && salaryVal < 100000;
          } else if (salaryFilter === '$100k - $150k') {
            matchesSalary = salaryVal >= 100000 && salaryVal <= 150000;
          } else if (salaryFilter === '$150k - $200k') {
            matchesSalary = salaryVal >= 150000 && salaryVal <= 200000;
          } else if (salaryFilter === 'Over $200k') {
            matchesSalary = salaryVal > 200000;
          }
        }

        // 5. Education Filter
        let matchesEducation = true;
        if (educationFilter !== 'All') {
          const eduLower = (candidate.education || '').toLowerCase();
          if (educationFilter === "Bachelor's Degree") {
            matchesEducation = eduLower.includes('b.s.') || eduLower.includes('b.a.') || eduLower.includes('bachelor');
          } else if (educationFilter === "Master's Degree") {
            matchesEducation = eduLower.includes('m.s.') || eduLower.includes('m.a.') || eduLower.includes('master');
          } else if (educationFilter === 'PhD') {
            matchesEducation = eduLower.includes('phd') || eduLower.includes('ph.d.');
          } else if (educationFilter === 'Bootcamp') {
            matchesEducation = eduLower.includes('bootcamp');
          }
        }

        // 6. Experience Filter
        let matchesExperience = true;
        if (experienceFilter !== 'All') {
          const expVal = parseInt(candidate.experience) || 0;
          if (experienceFilter === 'Entry (0-2 Years)') {
            matchesExperience = expVal <= 2;
          } else if (experienceFilter === 'Mid (3-5 Years)') {
            matchesExperience = expVal >= 3 && expVal <= 5;
          } else if (experienceFilter === 'Senior (6-8 Years)') {
            matchesExperience = expVal >= 6 && expVal <= 8;
          } else if (experienceFilter === 'Lead / Staff (9+ Years)') {
            matchesExperience = expVal >= 9;
          }
        }

        // 7. Score Filter (aiMatchScore)
        let matchesScore = true;
        if (scoreFilter !== 'All') {
          const score = candidate.aiMatchScore || 0;
          if (scoreFilter === 'Excellent (90%+)') {
            matchesScore = score >= 90;
          } else if (scoreFilter === 'Strong (80%-89%)') {
            matchesScore = score >= 80 && score < 90;
          } else if (scoreFilter === 'Good (70%-79%)') {
            matchesScore = score >= 70 && score < 80;
          } else if (scoreFilter === 'Fair (Below 70%)') {
            matchesScore = score < 70;
          }
        }

        // 8. Skills Count Filter
        let matchesSkillsCount = true;
        if (skillsCountFilter !== 'All') {
          const count = (candidate.skills || []).length;
          if (skillsCountFilter === '1-3 Skills') {
            matchesSkillsCount = count >= 1 && count <= 3;
          } else if (skillsCountFilter === '4-6 Skills') {
            matchesSkillsCount = count >= 4 && count <= 6;
          } else if (skillsCountFilter === '7+ Skills') {
            matchesSkillsCount = count >= 7;
          }
        }

        // 9. Resume Filter
        let matchesResume = true;
        if (resumeAttachedFilter !== 'All') {
          const hasResume = !!candidate.resumeText || !!candidate.resumeFileName;
          if (resumeAttachedFilter === 'With Resume') {
            matchesResume = hasResume;
          } else if (resumeAttachedFilter === 'No Resume') {
            matchesResume = !hasResume;
          }
        }

        return matchesSearch && matchesStatus && matchesDesignation && matchesGender && matchesCity && matchesSalary && matchesEducation && matchesExperience && matchesScore && matchesSkillsCount && matchesResume;
      })
      .sort((a, b) => {
        let valA: any = a.name;
        let valB: any = b.name;

        if (sortBy === 'score') {
          valA = a.aiMatchScore;
          valB = b.aiMatchScore;
          // Scores should sort descending by default
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        } else if (sortBy === 'experience') {
          valA = parseInt(a.experience) || 0;
          valB = parseInt(b.experience) || 0;
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        if (sortOrder === 'asc') {
          return valA.toString().localeCompare(valB.toString());
        } else {
          return valB.toString().localeCompare(valA.toString());
        }
      });
  }, [candidates, searchTerm, statusFilter, sortBy, sortOrder, designationFilter, genderFilter, cityFilter, salaryFilter, educationFilter, experienceFilter, scoreFilter, skillsCountFilter, resumeAttachedFilter]);

  const paginatedCandidates = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredCandidates, currentPage]);

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;

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
      status: formStatus,
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
      expectedSalary: formExpectedSalary || undefined
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
      expectedSalary: formExpectedSalary || undefined
    };

    onEditCandidate(updated);
    if (selectedCandidate?.id === updated.id) {
      setSelectedCandidate(updated);
    }
    setShowEditModal(null);
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormExperience('');
    setFormSkillsText('');
    setFormCurrentCompany('');
    setFormStatus('Applied');
    setFormEducation('');
    setFormAddress('');
    setFormNotes('');
    setResumeText('');
    setFormResumeFileName('');
    setFormDesignation('');
    setFormGender('Male');
    setFormCity('');
    setFormExpectedSalary('');
    setUploadedFile(null);
    setParsingStep('');
    setParseError(null);
    setBulkItems([]);
    setReviewItem(null);
  };

  // Call backend Express router to parse all pending/error resumes in bulk with Gemini
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
        const formData = new FormData();
        formData.append('file', item.file);

        const response = await fetch('/api/ai/parse-resume', {
          method: 'POST',
          body: formData
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
      // Generate unique IDs and unique scores
      const mockScore = Math.floor(Math.random() * 20) + 75;
      
      const newCandidate: Candidate = {
        id: 'can_' + (Date.now() + idx + Math.floor(Math.random() * 1000)),
        name: data.name,
        email: data.email,
        phone: data.phone,
        experience: data.experience || '1 Year',
        skills: data.skills,
        currentCompany: data.currentCompany || 'Independent',
        status: 'Applied',
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

  // Quick Action triggers
  const triggerWhatsApp = (cand: Candidate) => {
    onComposeWhatsApp(cand);
  };

  const triggerEmail = (cand: Candidate) => {
    onComposeEmail(cand);
  };

  const handleCopyText = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      showToast(`✓ ${label} copied to clipboard!`, 'success');
    } catch (err) {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast(`✓ ${label} copied to clipboard!`, 'success');
    }
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

  return (
    <div className="space-y-6 animate-fade-in" id="candidates-view">
      {selectedCandidate ? (
        /* ==================== CANDIDATE FULL DETAILS VIEW (NEW PAGE VIEW) ==================== */
        <div className="space-y-6" id="candidate-detail-page">
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
                className="text-xs border border-slate-250 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans font-semibold text-slate-700 cursor-pointer shadow-sm"
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

            <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <div className="text-center md:text-right">
                <p className="text-[10px] font-mono uppercase text-slate-400">Gemini Match Score</p>
                <div className="flex items-center justify-center md:justify-end gap-1.5 mt-1">
                  <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span className={`font-mono font-bold text-lg ${
                    selectedCandidate.aiMatchScore >= 90 ? 'text-emerald-600' :
                    selectedCandidate.aiMatchScore >= 75 ? 'text-blue-600' :
                    'text-slate-600'
                  }`}>
                    {selectedCandidate.aiMatchScore}%
                  </span>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
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
                    onDeleteCandidate(selectedCandidate.id);
                    setSelectedCandidate(null);
                    showToast('✓ Candidate deleted successfully.', 'success');
                  }}
                  className="p-2 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-lg bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Delete Candidate"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Two-Column Details Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Profile and Resume Contents */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4">Professional Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                    <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Current Co.</p>
                      <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.currentCompany || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Experience</p>
                      <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.experience}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                    <GraduationCap className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Education</p>
                      <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.education || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">Location</p>
                      <p className="text-xs text-slate-900 font-semibold mt-0.5">{selectedCandidate.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100">
                  <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Candidate Skills</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(selectedCandidate.skills || []).map((s, id) => (
                      <span key={id} className="px-2.5 py-1 bg-slate-100 border border-slate-200/60 text-slate-700 rounded-md font-medium text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
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
                            
                            {/* Match score pill */}
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
                              {job.matchingSkills.map((sk, sIdx) => (
                                <span key={sIdx} className="px-1.5 py-0.25 bg-emerald-50 text-emerald-700 border border-emerald-100/60 rounded text-[9px] font-semibold">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Quick Send buttons for this job */}
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
                  <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Recruiter Assessment & Notes</h2>
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
                    <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Extracted Resume Contents</h2>
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
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Hiring Quick Actions</h2>
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
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Candidate Progress Log</h2>
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
                  <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Outreach History</h2>
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
      ) : (
        /* ==================== CANDIDATES LIST VIEW (DEFAULT FULL-WIDTH) ==================== */
        <>
          {/* Page Title & primary actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight font-sans">Candidates</h1>
              <p className="text-sm text-slate-500 mt-1">Review applicant profiles, qualifications, and automated match criteria.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
              {onOpenCSVImport && (
                <button 
                  onClick={() => onOpenCSVImport('candidates')}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer bg-white"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  Import CSV/Excel
                </button>
              )}
              
              <button 
                onClick={() => { resetForm(); setShowUploadModal(true); }}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer bg-white"
              >
                <Upload className="h-3.5 w-3.5" />
                Import Resume
              </button>
              
              {/* Primary Action Button */}
              <button 
                onClick={startAddManually}
                className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Candidate
              </button>
            </div>
          </div>

          {/* Filters & search bars */}
          <div className="space-y-3 bg-white p-4 border border-slate-200/80 rounded-xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, company, designation, or key skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-white font-sans text-slate-700 font-medium"
                >
                  <option value="All">All Pipeline Stages</option>
                  <option value="Applied">Applied</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interview</option>
                  <option value="Selected">Selected</option>
                  <option value="Offer Sent">Offer Sent</option>
                  <option value="Joined">Joined</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowFiltersPanel(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border rounded-lg transition-all cursor-pointer ${
                    showFiltersPanel 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Advanced Filters
                  {(designationFilter !== 'All' || genderFilter !== 'All' || cityFilter !== 'All' || salaryFilter !== 'All' || educationFilter !== 'All' || experienceFilter !== 'All' || scoreFilter !== 'All' || skillsCountFilter !== 'All' || resumeAttachedFilter !== 'All') && (
                    <span className="ml-1 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[9px] font-bold">
                      {[designationFilter, genderFilter, cityFilter, salaryFilter, educationFilter, experienceFilter, scoreFilter, skillsCountFilter, resumeAttachedFilter].filter(f => f !== 'All').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced filters collapsible block */}
            {showFiltersPanel && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl animate-fade-in text-xs mt-2">
                {/* Designation Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Designation</label>
                  <select
                    value={designationFilter}
                    onChange={(e) => setDesignationFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    {designationsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Gender</label>
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* City Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">City / Location</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    {citiesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Salary Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Expected Salary</label>
                  <select
                    value={salaryFilter}
                    onChange={(e) => setSalaryFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">Any Salary</option>
                    <option value="Under $100k">Under $100k</option>
                    <option value="$100k - $150k">$100k - $150k</option>
                    <option value="$150k - $200k">$150k - $200k</option>
                    <option value="Over $200k">Over $200k</option>
                  </select>
                </div>

                {/* Education Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Education Level</label>
                  <select
                    value={educationFilter}
                    onChange={(e) => setEducationFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">Any Education</option>
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Bootcamp">Bootcamp</option>
                  </select>
                </div>

                {/* Experience Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Experience Range</label>
                  <select
                    value={experienceFilter}
                    onChange={(e) => setExperienceFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">Any Experience</option>
                    <option value="Entry (0-2 Years)">Entry (0-2 Years)</option>
                    <option value="Mid (3-5 Years)">Mid (3-5 Years)</option>
                    <option value="Senior (6-8 Years)">Senior (6-8 Years)</option>
                    <option value="Lead / Staff (9+ Years)">Lead / Staff (9+ Years)</option>
                  </select>
                </div>

                {/* Match Score Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">AI Match Score</label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">All Scores</option>
                    <option value="Excellent (90%+)">&ge; 90% Match</option>
                    <option value="Strong (80%-89%)">80% - 89% Match</option>
                    <option value="Good (70%-79%)">70% - 79% Match</option>
                    <option value="Fair (Below 70%)">&lt; 70% Match</option>
                  </select>
                </div>

                {/* Skills Volume Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Tech Skills Count</label>
                  <select
                    value={skillsCountFilter}
                    onChange={(e) => setSkillsCountFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">Any Skills Count</option>
                    <option value="1-3 Skills">1 to 3 Skills</option>
                    <option value="4-6 Skills">4 to 6 Skills</option>
                    <option value="7+ Skills">7+ Skills</option>
                  </select>
                </div>

                {/* Resume Status Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">Resume Attached</label>
                  <select
                    value={resumeAttachedFilter}
                    onChange={(e) => setResumeAttachedFilter(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white font-sans text-slate-700"
                  >
                    <option value="All">Any Status</option>
                    <option value="With Resume">Has Resume Text/File</option>
                    <option value="No Resume">No Resume</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-5 flex justify-end gap-2 pt-2 border-t border-slate-200/50 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDesignationFilter('All');
                      setGenderFilter('All');
                      setCityFilter('All');
                      setSalaryFilter('All');
                      setEducationFilter('All');
                      setExperienceFilter('All');
                      setScoreFilter('All');
                      setSkillsCountFilter('All');
                      setResumeAttachedFilter('All');
                      setStatusFilter('All');
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100/50 cursor-pointer transition-all"
                  >
                    <X className="h-3 w-3" />
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Candidates Full Width Grid Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-mono text-slate-400 uppercase">
                    <th 
                      onClick={() => handleSort('name')}
                      className="p-4 font-medium cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                    >
                      <div className="flex items-center gap-1">
                        Candidate Name
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 font-medium">Contact</th>
                    <th 
                      onClick={() => handleSort('experience')}
                      className="p-4 font-medium cursor-pointer hover:bg-slate-100/50 hover:text-slate-700"
                    >
                      <div className="flex items-center gap-1">
                        Experience
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 font-medium">Current Company</th>
                    <th className="p-4 font-medium">Pipeline Stage</th>
                    <th 
                      onClick={() => handleSort('score')}
                      className="p-4 font-medium cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 text-center"
                    >
                      <div className="flex items-center justify-center gap-1">
                        AI Match
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No candidates match your search. Click "Import Resume" to add one!
                      </td>
                    </tr>
                  ) : (
                    paginatedCandidates.map((candidate) => {
                      return (
                        <tr 
                          key={candidate.id}
                          onClick={() => setSelectedCandidate(candidate)}
                          className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase font-sans">
                                {candidate.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-950 font-sans">{candidate.name}</p>
                                {candidate.designation && (
                                  <p className="text-[10px] text-blue-600 font-semibold font-sans leading-none mt-0.5">{candidate.designation}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {(candidate.skills || []).slice(0, 3).map((sk, id) => (
                                    <span key={id} className="text-[9px] px-1.5 py-0.25 bg-slate-100 text-slate-500 rounded font-medium">
                                      {sk}
                                    </span>
                                  ))}
                                  {(candidate.skills || []).length > 3 && (
                                    <span className="text-[8px] text-slate-400">+{(candidate.skills || []).length - 3}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <p className="text-slate-900 font-medium text-xs">{candidate.email}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="font-mono">{candidate.phone}</span>
                                {candidate.gender && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase">{candidate.gender}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono font-medium text-slate-700 text-xs">{candidate.experience}</div>
                            {candidate.education && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5" title={candidate.education}>
                                {candidate.education}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">
                            <div className="font-semibold text-xs text-slate-700">{candidate.currentCompany}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                              {candidate.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {candidate.city}
                                </span>
                              )}
                              {candidate.expectedSalary && (
                                <span className="font-mono text-[9px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.25 rounded font-semibold shrink-0">
                                  {candidate.expectedSalary}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium ${
                              candidate.status === 'Applied' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              candidate.status === 'Screening' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              candidate.status === 'Shortlisted' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              candidate.status === 'Interview' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              candidate.status === 'Selected' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              candidate.status === 'Offer Sent' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {candidate.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 font-mono font-semibold text-[10px] rounded-full ${
                              candidate.aiMatchScore >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              candidate.aiMatchScore >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {candidate.aiMatchScore}%
                            </span>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => onComposeEmail(candidate)}
                                title="Email Candidate"
                                className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => onComposeWhatsApp(candidate)}
                                title="WhatsApp Message"
                                className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => startEdit(candidate)}
                                title="Edit Profile"
                                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  onDeleteCandidate(candidate.id);
                                  showToast('✓ Candidate deleted successfully.', 'success');
                                }}
                                title="Delete Profile"
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
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

            {/* Pagination bar */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>{Math.min(filteredCandidates.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredCandidates.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredCandidates.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono">{currentPage} / {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk AI Resume Parser & Extractor Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-2xl w-full overflow-hidden animate-slide-up">
            
            {reviewItem ? (
              /* Inline Review/Edit Form for a single parsed item */
              <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                    <Edit2 className="h-4 w-4 text-blue-600" />
                    Review Extracted Details: {reviewItem.file.name}
                  </h2>
                  <button onClick={() => setReviewItem(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <p className="text-[11px] text-slate-400 font-sans">
                    Verify and adjust the fields parsed by Gemini before importing.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidate Name *</label>
                      <input
                        type="text"
                        required
                        value={reviewItem.extractedData?.name || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), name: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        value={reviewItem.extractedData?.email || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), email: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.phone || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), phone: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Years of Experience</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.experience || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), experience: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Current Company</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.currentCompany || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), currentCompany: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Skills (Comma-separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(reviewItem.extractedData?.skills) ? reviewItem.extractedData.skills.join(', ') : reviewItem.extractedData?.skills || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), skills: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Education</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.education || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), education: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Address / Location</label>
                      <input
                        type="text"
                        value={reviewItem.extractedData?.address || ''}
                        onChange={(e) => setReviewItem({
                          ...reviewItem,
                          extractedData: { ...(reviewItem.extractedData || {}), address: e.target.value } as any
                        })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setReviewItem(null)}
                    className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Back to List
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveReviewItem(reviewItem.extractedData)}
                    className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Main Bulk Upload & Status List View */
              <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                    Bulk AI Resume Parser & Extractor
                  </h2>
                  <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Info Notification */}
                  <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start gap-2 leading-relaxed">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Gemini Bulk Extraction Engine</p>
                      <p className="mt-0.5">Upload multiple resume files (PDF, PNG, JPG, or TXT). Gemini parses them in sequence to reconstruct history, skills, contact fields, and let you review and bulk import them seamlessly.</p>
                    </div>
                  </div>

                  {/* Multi File Drop Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50/30' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,image/png,image/jpeg,image/jpg,text/plain"
                      multiple
                      onChange={handleFileChange}
                    />
                    <Upload className="h-8 w-8 text-slate-400 animate-bounce" />
                    <p className="text-xs font-medium text-slate-700 mt-3">Drag and drop your candidate resume files here</p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports PDF, PNG, JPEG, JPG, or TXT formats (Upload multiple files at once)</p>
                    <button
                      type="button"
                      className="mt-4 px-3 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      Browse Files
                    </button>
                  </div>

                  {/* File List */}
                  {bulkItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider font-mono">
                          Files Selected ({bulkItems.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setBulkItems([])}
                          className="text-[10px] text-red-600 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {bulkItems.map((item) => (
                          <div
                            key={item.id}
                            className={`border rounded-lg p-3 text-xs transition-colors ${
                              item.status === 'parsing' 
                                ? 'bg-blue-50/20 border-blue-200' 
                                : item.status === 'success' 
                                  ? 'bg-emerald-50/10 border-emerald-100' 
                                  : item.status === 'error' 
                                    ? 'bg-red-50/10 border-red-100' 
                                    : 'bg-slate-50/30 border-slate-200/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <FileText className={`h-4 w-4 shrink-0 ${
                                  item.status === 'success' ? 'text-emerald-500' : 'text-slate-400'
                                }`} />
                                <div className="overflow-hidden">
                                  <p className="font-semibold text-slate-700 truncate">{item.file.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {(item.file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Status badge */}
                                {item.status === 'pending' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
                                    Ready
                                  </span>
                                )}
                                {item.status === 'parsing' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Parsing
                                  </span>
                                )}
                                {item.status === 'success' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Parsed ✓
                                  </span>
                                )}
                                {item.status === 'error' && (
                                  <span 
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100 cursor-help"
                                    title={item.errorMessage}
                                  >
                                    Error ✗
                                  </span>
                                )}

                                {/* Action Buttons */}
                                {item.status === 'success' && item.extractedData && (
                                  <button
                                    type="button"
                                    onClick={() => setReviewItem(item)}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 rounded text-[10px] font-semibold transition-all cursor-pointer"
                                  >
                                    Review
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeBulkItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
                                  title="Remove"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Summary info for parsed item */}
                            {item.status === 'success' && item.extractedData && (
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                                <div>
                                  <strong className="text-slate-700 font-medium">Extracted:</strong> {item.extractedData.name} ({item.extractedData.email || 'No email'})
                                </div>
                                <div className="truncate max-w-[200px]">
                                  {item.extractedData.experience} • {item.extractedData.currentCompany}
                                </div>
                              </div>
                            )}

                            {/* Error text */}
                            {item.status === 'error' && item.errorMessage && (
                              <div className="mt-1.5 text-[9px] text-red-600 font-mono">
                                Error: {item.errorMessage}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parsing Live Step Progress Bar */}
                  {isParsing && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-700">{parsingStep}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full w-2/3 animate-[shimmer_1.5s_infinite]" />
                      </div>
                      <p className="text-[10px] text-slate-400">Gemini is structuring skills, education, experience, and contact info in parallel.</p>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                      {parseError}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-slate-50">
                  <div>
                    {bulkItems.some(i => i.status === 'success') && (
                      <span className="text-xs text-slate-500 font-sans font-medium">
                        ✓ {bulkItems.filter(i => i.status === 'success').length} files parsed successfully. Ready to import.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    
                    {bulkItems.some(i => i.status === 'pending' || i.status === 'error') && (
                      <button
                        type="button"
                        disabled={isParsing}
                        onClick={handleParseBulkResumes}
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Parse All with AI
                          </>
                        )}
                      </button>
                    )}

                    {bulkItems.some(i => i.status === 'success') && (
                      <button
                        type="button"
                        disabled={isParsing}
                        onClick={handleImportAllSuccess}
                        className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Import {bulkItems.filter(i => i.status === 'success').length} Candidates
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Add Candidate Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                Review Candidate Profile Info
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-[11px] text-slate-400 font-sans mb-2">Please verify extracted fields below before registering the candidate profile in the ATS index.</p>
              
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Candidate Form Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-950 font-sans flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-500" />
                Edit Profile: {showEditModal.name}
              </h2>
              <button onClick={() => setShowEditModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Candidate Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Years of Experience</label>
                  <input
                    type="text"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Current Company</label>
                  <input
                    type="text"
                    value={formCurrentCompany}
                    onChange={(e) => setFormCurrentCompany(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Designation</label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Highest Education</label>
                  <input
                    type="text"
                    value={formEducation}
                    onChange={(e) => setFormEducation(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Address / Location</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Expected Salary</label>
                  <input
                    type="text"
                    value={formExpectedSalary}
                    onChange={(e) => setFormExpectedSalary(e.target.value)}
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

                <div className="col-span-2">
                  <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Screening/Interview Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
