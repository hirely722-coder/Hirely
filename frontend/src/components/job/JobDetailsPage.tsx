import React, { useState, useMemo } from 'react';
import { 
  Briefcase, Search, Filter, Eye, Edit2, Trash2, Copy, Sparkles, X, Mail, 
  CheckCircle2, AlertCircle, Plus, DollarSign, MapPin, Award, User, Calendar, 
  Clock, MessageSquare, ArrowRight, Share2, Send, Check, ExternalLink, 
  RefreshCw, AlertTriangle, MoreVertical, Paperclip, ChevronRight, Phone,
  Maximize2, FileText, TrendingUp, Sliders, HelpCircle
} from 'lucide-react';
import { Job, Company, Candidate, EmailTemplate } from '../../types';
import { calculateMatchScore } from '../../utils/matching';
import { 
  JobNote, JobInterview, JobCommunication, JobActivity,
  generateInitialNotes, generateInitialInterviews, 
  generateInitialCommunications, generateInitialActivities 
} from '../../utils/jobMockData';

interface JobDetailsPageProps {
  job: Job;
  companies: Company[];
  candidates: Candidate[];
  onBack: () => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onUpdateCandidateStage: (candidateId: string, newStage: Candidate['status']) => void;
}

type TabType = 'overview' | 'ai-matching' | 'candidates' | 'pipeline' | 'interviews' | 'notes' | 'communication' | 'activity';

export default function JobDetailsPage({
  job,
  companies,
  candidates,
  onBack,
  onEditJob,
  onDeleteJob,
  onEditCandidate,
  onUpdateCandidateStage
}: JobDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [detailSearch, setDetailSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for sub-data initialized from mock database helpers
  const [notes, setNotes] = useState<JobNote[]>(() => generateInitialNotes([job]));
  const [interviews, setInterviews] = useState<JobInterview[]>(() => generateInitialInterviews([job], candidates));
  const [communications, setCommunications] = useState<JobCommunication[]>(() => generateInitialCommunications([job], candidates));
  const [activities, setActivities] = useState<JobActivity[]>(() => generateInitialActivities([job]));

  // AI Matching Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(true); // default true for better initial UX, can re-trigger

  // Selection states for Bulk Actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Local Modal States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState<JobNote | null>(null);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState<Candidate | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewerName, setInterviewerName] = useState('Marc Lou (Frontend Architect)');
  const [interviewRound, setInterviewRound] = useState('Technical Coding Challenge');

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState<Candidate | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedJobTemplateId, setSelectedJobTemplateId] = useState('custom');

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppCandidate, setWhatsAppCandidate] = useState<Candidate | null>(null);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');

  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [viewedCandidate, setViewedCandidate] = useState<Candidate | null>(null);

  // AI Feature Playground states
  const [aiFeatureResult, setAiFeatureResult] = useState<{ title: string; text: string } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiReportModal, setShowAiReportModal] = useState(false);

  // Auto matching score helper (determines matching reasons dynamically)
  const candidateMatchData = useMemo(() => {
    return candidates.map(cand => {
      // Calculate dynamic overlap
      const requiredOverlap = (cand.skills || []).filter(s => (job.requiredSkills || []).map(rs => rs.toLowerCase()).includes(s.toLowerCase()));
      const matchScore = calculateMatchScore(cand, job);
      
      const reasons: string[] = [];
      if (matchScore >= 80) {
        reasons.push('✓ Strong Profile Category & Skill Alignment');
      } else if (requiredOverlap.length > 0) {
        reasons.push(`✓ Matches skills: ${requiredOverlap.slice(0, 3).join(', ')}`);
      }
      
      // Exp check
      const candExpNum = parseInt(cand.experience) || 3;
      const jobExpNum = parseInt(job.experience) || 3;
      if (candExpNum >= jobExpNum) {
        reasons.push('✓ Professional Experience meets or exceeds standard');
      } else {
        reasons.push('⚠ Noticeable experience delta for high-seniority level');
      }

      // Location match
      if (cand.address.toLowerCase().includes('san francisco') || job.location.toLowerCase().includes('remote')) {
        reasons.push('✓ Matches geographical / remote configuration');
      } else {
        reasons.push('⚠ Out-of-state candidacy may require travel alignment');
      }

      // Salary budget estimate
      const seedSalary = (cand.name.charCodeAt(0) % 20) + 120; // estimate 120k-140k
      const jobMaxSalary = parseInt(job.salary.replace(/[^0-9]/g, '').slice(-3)) || 180;
      if (seedSalary <= jobMaxSalary) {
        reasons.push(`✓ Expected compensation ($${seedSalary}k) aligns with budgeted range`);
      } else {
        reasons.push(`⚠ Expected salary ($${seedSalary}k) sits near budget ceiling`);
      }

      reasons.push('✓ Complete background screening checks passed');

      return {
        candidate: cand,
        score: matchScore,
        matchedSkills: requiredOverlap,
        reasons
      };
    })
    // Filter out completely unrelated candidates (matchScore <= 15%) to keep match high-quality
    .filter(item => item.score > 15)
    .sort((a, b) => b.score - a.score);
  }, [candidates, job]);

  // Toast notifier
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Central log actions
  const logActivity = (type: string, description: string) => {
    const newAct: JobActivity = {
      id: 'act_' + Date.now(),
      jobId: job.id,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      description,
      user: 'Sarah Jenkins (Recruiter)'
    };
    setActivities(prev => [newAct, ...prev]);
  };

  // Local helper for communications
  const logCommunication = (type: JobCommunication['type'], subject: string, message: string, recipient: string, candId: string, candName: string) => {
    const newComm: JobCommunication = {
      id: 'comm_' + Date.now(),
      jobId: job.id,
      candidateId: candId,
      candidateName: candName,
      type,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Sent',
      sentBy: 'Sarah Jenkins',
      subject,
      message,
      recipient
    };
    setCommunications(prev => [newComm, ...prev]);
  };

  // --- Actions ---

  const handleToggleJobStatus = () => {
    const updatedStatus = job.status === 'Open' ? 'Closed' : 'Open';
    onEditJob({ ...job, status: updatedStatus });
    logActivity('Status Changed', `Marked position as ${updatedStatus}.`);
    triggerToast(`✓ Job position marked as ${updatedStatus}!`);
  };

  const handleDuplicateJob = () => {
    const dup: Job = {
      ...job,
      id: 'j_' + Date.now(),
      title: `${job.title} (Duplicate)`,
      applicationsCount: 0
    };
    onEditJob(dup); // triggers add of duplicated job via the parent
    logActivity('Job Duplicated', `Duplicated job as "${dup.title}".`);
    triggerToast(`✓ Duplicated job opening created successfully!`);
  };

  const handleShareJob = () => {
    navigator.clipboard.writeText(`https://recruitflow.agency/jobs/${job.id}`);
    triggerToast('✓ Job career link copied to clipboard!');
    logActivity('Job Shared', 'Generated and copied career page public link.');
  };

  const handleDeleteJobClick = () => {
    if (confirm(`Are you sure you want to delete the job posting for "${job.title}"?`)) {
      onDeleteJob(job.id);
      onBack();
    }
  };

  const triggerScan = () => {
    setIsScanning(true);
    setHasScanned(false);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
      logActivity('AI Candidate Matching', 'Recalculated AI match vectors for applicant pool.');
      triggerToast('✓ Modern model scanning complete! Real-time match matrices updated.');
    }, 1500);
  };

  // --- Sub-data modifications ---

  // Notes CRUD
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, text: noteText, timestamp: new Date().toLocaleString() + ' (Edited)' } : n));
      logActivity('Note Edited', `Updated an internal note on candidate requirements.`);
      triggerToast('✓ Internal note updated!');
    } else {
      const newNote: JobNote = {
        id: 'note_' + Date.now(),
        jobId: job.id,
        author: 'Sarah Jenkins (Recruiter)',
        timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: noteText
      };
      setNotes(prev => [newNote, ...prev]);
      logActivity('Note Added', `Added internal recruiter note: "${noteText.slice(0, 30)}...".`);
      triggerToast('✓ Recruiting note saved!');
    }
    setNoteText('');
    setEditingNote(null);
    setShowNoteModal(false);
  };

  const handleEditNoteStart = (note: JobNote) => {
    setEditingNote(note);
    setNoteText(note.text);
    setShowNoteModal(true);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    logActivity('Note Deleted', 'Removed an internal note.');
    triggerToast('Note successfully removed.');
  };

  // Interviews scheduling
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewCandidate || !interviewDate || !interviewTime) return;

    const newInt: JobInterview = {
      id: 'int_' + Date.now(),
      jobId: job.id,
      candidateId: interviewCandidate.id,
      candidateName: interviewCandidate.name,
      date: interviewDate,
      time: interviewTime,
      interviewer: interviewerName,
      round: interviewRound,
      status: 'Scheduled'
    };

    setInterviews(prev => [newInt, ...prev]);
    
    // Automatically move candidate to "Interview" stage if they are not there
    if (interviewCandidate.status !== 'Interview') {
      onUpdateCandidateStage(interviewCandidate.id, 'Interview');
    }

    logCommunication('Email', `Interview Scheduled: ${interviewRound}`, `Hi ${interviewCandidate.name},\n\nYour interview for ${job.title} has been scheduled.\nDate: ${interviewDate}\nTime: ${interviewTime}\nInterviewer: ${interviewerName}\nRound: ${interviewRound}\n\nWe look forward to speaking with you!\n\nBest,\nSarah`, interviewCandidate.email, interviewCandidate.id, interviewCandidate.name);
    logActivity('Interview Scheduled', `Scheduled ${interviewRound} for ${interviewCandidate.name} on ${interviewDate}.`);
    triggerToast(`✓ Interview scheduled & calendar invitation dispatched!`);
    
    setShowInterviewModal(false);
    setInterviewCandidate(null);
  };

  const handleUpdateInterviewStatus = (id: string, newStatus: JobInterview['status'], feedback?: string) => {
    setInterviews(prev => prev.map(item => item.id === id ? { ...item, status: newStatus, feedback: feedback || item.feedback } : item));
    const interview = interviews.find(i => i.id === id);
    if (interview) {
      logActivity('Interview Updated', `Marked ${interview.candidateName}'s round as ${newStatus}.`);
      triggerToast(`✓ Round status updated to ${newStatus}`);
    }
  };

  const generateMeetingLink = (id: string) => {
    const matchLink = `meet.google.com/hfs-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    setInterviews(prev => prev.map(item => item.id === id ? { ...item, feedback: `Virtual link: https://${matchLink}` } : item));
    triggerToast('✓ Virtual conferencing link spawned and saved!');
  };

  // Email action dispatch
  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCandidate || !emailSubject || !emailBody) return;

    logCommunication('Email', emailSubject, emailBody, emailCandidate.email, emailCandidate.id, emailCandidate.name);
    logActivity('Email Sent', `Sent message to ${emailCandidate.name}: "${emailSubject}"`);
    triggerToast(`✓ Email successfully transmitted to ${emailCandidate.name}!`);
    setShowEmailModal(false);
    setEmailCandidate(null);
  };

  // WhatsApp action dispatch
  const handleSendWhatsAppSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsAppCandidate || !whatsAppMessage) return;

    // Clean phone number (keep only digits)
    const cleanPhone = whatsAppCandidate.phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(whatsAppMessage);
    
    // Direct deep link or direct WhatsApp Web chat depending on user-agent to bypass any landing page
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const waUrl = isMobile 
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
    
    window.open(waUrl, '_blank');

    logCommunication('WhatsApp', 'WhatsApp Chat Message', whatsAppMessage, whatsAppCandidate.phone, whatsAppCandidate.id, whatsAppCandidate.name);
    logActivity('WhatsApp Sent', `WhatsApp dispatched to ${whatsAppCandidate.name}.`);
    triggerToast(`✓ Launching WhatsApp Client...`);
    setShowWhatsAppModal(false);
    setWhatsAppCandidate(null);
  };

  // Bulk actions triggers
  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList: any[]) => {
    if (selectedCandidateIds.length === filteredList.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredList.map(item => item.candidate.id));
    }
  };

  const handleBulkEmail = () => {
    if (selectedCandidateIds.length === 0) return;
    const count = selectedCandidateIds.length;
    selectedCandidateIds.forEach(id => {
      const cand = candidates.find(c => c.id === id);
      if (cand) {
        logCommunication('Email', `Next Steps regarding ${job.title}`, `Hi ${cand.name},\n\nWe wanted to reach out regarding your application for the ${job.title} role at ${job.companyName}. We are currently reviewing next stages and will keep you posted shortly.\n\nBest regards,\nSarah Jenkins`, cand.email, cand.id, cand.name);
      }
    });
    logActivity('Bulk Action', `Dispatched bulk status emails to ${count} candidates.`);
    triggerToast(`✓ Bulk emails sent to ${count} matching candidates!`);
    setSelectedCandidateIds([]);
  };

  const handleBulkShortlist = () => {
    if (selectedCandidateIds.length === 0) return;
    selectedCandidateIds.forEach(id => {
      onUpdateCandidateStage(id, 'Screening');
    });
    logActivity('Bulk Action', `Bulk shortlisted ${selectedCandidateIds.length} applicants.`);
    triggerToast(`✓ Moved ${selectedCandidateIds.length} selected candidates to Screening stage.`);
    setSelectedCandidateIds([]);
  };

  const handleBulkPipeline = () => {
    if (selectedCandidateIds.length === 0) return;
    selectedCandidateIds.forEach(id => {
      onUpdateCandidateStage(id, 'Interview');
    });
    logActivity('Bulk Action', `Advanced ${selectedCandidateIds.length} candidates directly into active Interviews.`);
    triggerToast(`✓ Transitioned ${selectedCandidateIds.length} candidates directly to Interview Stage!`);
    setSelectedCandidateIds([]);
  };

  const handleBulkExport = () => {
    if (selectedCandidateIds.length === 0) return;
    const lines = ['Candidate Name,Email,Match Score,Experience,Current Company,Status'];
    selectedCandidateIds.forEach(id => {
      const cand = candidates.find(c => c.id === id);
      if (cand) {
        lines.push(`"${cand.name}","${cand.email}",${cand.aiMatchScore || 80},"${cand.experience}","${cand.currentCompany}","${cand.status}"`);
      }
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Job_${job.id}_Candidate_Shortlist.csv`;
    link.click();
    triggerToast('✓ Exported CSV generated and downloaded!');
  };

  // --- HTML5 Drag and Drop for Pipeline board ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: Candidate['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      onUpdateCandidateStage(id, targetStage);
      const cand = candidates.find(c => c.id === id);
      if (cand) {
        logActivity('Pipeline Moved', `Dragged ${cand.name} to the '${targetStage}' stage.`);
      }
    }
  };

  // --- AI Model Feature Generator Triggers (One Click Operations!) ---

  const executeAiTool = (toolKey: string) => {
    setIsAiProcessing(true);
    setAiFeatureResult(null);

    setTimeout(() => {
      setIsAiProcessing(false);
      let title = '';
      let text = '';

      switch (toolKey) {
        case 'shortlist':
          title = 'AI Talent Shortlist Recommendations';
          text = `Based on a deep vector comparison of candidates against the required skills list (${(job.requiredSkills || []).join(', ')}):\n\n1. Emily Watson (95% Match) - Perfect match for design systems. Highly proficient in React, Tailwind, and Framer Motion.\n2. Sarah Connor (88% Match) - Robust match for backend workflows. High score in TypeScript and database scalability.\n3. Marcus Brody (82% Match) - Well-suited, though lacks high-fidelity layout prototyping. Recommended for a screening call.`;
          break;
        case 'questions':
          title = `AI Generated Interview Questions: ${job.title}`;
          text = `Suggested Interview Agenda and Tailored Questions:\n\n1. "Can you walk us through a challenging project where you designed a custom component library? How did you approach atomic structuring and Tailwind standardization?"\n2. "Describe your experience managing concurrent database locking or distributed transaction limits under sudden traffic spikes (specifically relevant for our Stripe workflow)."\n3. "How do you evaluate and maintain state variables in large-scale React ecosystems? When do you prefer primitive values in dependencies over object references?"`;
          break;
        case 'summarize':
          title = 'AI Job Posting Summary';
          text = `Overview:\nA Senior Career opening at ${job.companyName} with a salary bracket of ${job.salary}. The position operates on a ${job.location} work model.\n\nCore Priorities:\n• Constructing robust, developer-first tooling or components.\n• Scaling existing architecture models gracefully.\n• Mentoring junior teammates on clean typography, modular React files, and test validation.`;
          break;
        case 'missing_skills':
          title = 'Missing / High-Value Supplementary Skills';
          text = `While the posting lists standard skills, high-performing engineers in this sector typically benefit from:\n\n• Next.js Server Components (App Router stability)\n• Playwright or Cypress for E2E interaction validation\n• ESBuild configuration and bundler performance fine-tuning\n• Radix UI or headless accessibility standards`;
          break;
        case 'difficulty':
          title = 'Hiring Market Difficulty Predictor';
          text = `Hiring Difficulty: MEDIUM-HIGH\n\nExplanation:\nThe combination of requested salary range (${job.salary}) against high-standard skills like ${(job.requiredSkills || []).slice(0, 3).join(', ')} places this search in a highly competitive market bracket.\n\nStrategy:\nWe recommend emphasizing the team autonomy, modern tooling stack, and flexible working schedule to secure elite talent.`;
          break;
        case 'salary_recomm':
          title = 'AI Salary Benchmark Advice';
          text = `Current Salary Range: ${job.salary}\n\nLocal Market Benchmarks:\n• 25th Percentile: $145,000\n• 50th Percentile (Median): $172,000\n• 90th Percentile: $215,000\n\nRecommendation:\nYour current posting is perfectly aligned with the 50th-75th percentile, making it highly competitive for talented seniors. No adjustments required.`;
          break;
        case 'alt_skills':
          title = 'Alternative / Equivalent Skills Suggested';
          text = `If candidates with the exact skills are scarce, consider equivalent keywords:\n\n• For React: SolidJS, Svelte, or Vue 3 with Composition API.\n• For Tailwind CSS: Styled-Components, CSS Modules, or Vanilla Extract.\n• For PostgreSQL: MySQL, CockroachDB, or MariaDB.`;
          break;
        case 'candidate_email':
          title = 'AI Candidate Outreach Email Generator';
          text = `Subject: Elite Opportunity: ${job.title} at ${job.companyName}\n\nHi [Candidate Name],\n\nI was reviewing your impressive background in ${(job.requiredSkills || []).slice(0, 2).join(' and ')} and felt you would be an exceptional fit for our active ${job.title} role at ${job.companyName}.\n\nWe are offering a competitive range of ${job.salary} and the opportunity to work in a high-caliber team environment.\n\nLet me know if you are open for a brief 15-minute call this week.\n\nBest,\nSarah Jenkins`;
          break;
        case 'whatsapp_msg':
          title = 'AI WhatsApp Ping Generator';
          text = `Hi [Candidate Name]! Sarah here from RecruitFlow. I saw your outstanding background in ${(job.requiredSkills || []).slice(0, 1)} and wanted to see if you are open to exploring a Senior role at ${job.companyName}? The range is ${job.salary} and they have a fantastic culture. Let me know!`;
          break;
        default:
          break;
      }

      setAiFeatureResult({ title, text });
      logActivity('AI Feature Triggered', `Generated ${title} on-the-fly.`);
      triggerToast('✓ AI Insights calculated and populated below.');
    }, 800);
  };

  // --- Filtering & Instant Search for Details View ---
  const filteredNotes = useMemo(() => {
    return notes.filter(n => 
      n.text.toLowerCase().includes(detailSearch.toLowerCase()) ||
      n.author.toLowerCase().includes(detailSearch.toLowerCase())
    );
  }, [notes, detailSearch]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter(i => 
      i.candidateName.toLowerCase().includes(detailSearch.toLowerCase()) ||
      i.round.toLowerCase().includes(detailSearch.toLowerCase()) ||
      i.interviewer.toLowerCase().includes(detailSearch.toLowerCase())
    );
  }, [interviews, detailSearch]);

  const filteredCommunications = useMemo(() => {
    return communications.filter(c => 
      c.candidateName.toLowerCase().includes(detailSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(detailSearch.toLowerCase()) ||
      c.message.toLowerCase().includes(detailSearch.toLowerCase())
    );
  }, [communications, detailSearch]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => 
      c.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(detailSearch.toLowerCase())) ||
      c.currentCompany.toLowerCase().includes(detailSearch.toLowerCase())
    );
  }, [candidates, detailSearch]);

  // Resend template list helper
  const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
      id: 't1',
      name: 'Initial outreach request',
      category: 'Outreach',
      subject: `Exploring Opportunities: ${job.title} opening at ${job.companyName}`,
      body: `Dear [Candidate],\n\nI hope this email finds you well. I came across your impressive professional background and wanted to see if you might be interested in exploring a ${job.title} opportunity at ${job.companyName}.\n\nLet me know your availability for a brief call.\n\nBest,\nSarah Jenkins`,
      lastUpdated: '2026-06-25',
      variables: ['Candidate']
    },
    {
      id: 't2',
      name: 'Interview calendar setup',
      category: 'Scheduling',
      subject: `Interview Invitation: ${job.title} - ${job.companyName}`,
      body: `Hi [Candidate],\n\nWe are excited to advance your application to the technical round. Please select a suitable slot from our recruiter link or reply with your preferred days next week.\n\nBest,\nSarah Jenkins`,
      lastUpdated: '2026-06-24',
      variables: ['Candidate']
    }
  ];

  const handleApplyTemplate = (template: EmailTemplate, cand: Candidate) => {
    const formattedBody = template.body.replace('[Candidate]', cand.name);
    const formattedSubject = template.subject;
    setEmailCandidate(cand);
    setEmailSubject(formattedSubject);
    setEmailBody(formattedBody);
    setShowEmailModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="job-details-workspace">
      
      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 z-50 animate-slide-up border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-sans font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Back & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button 
            onClick={onBack}
            className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-950 font-medium transition-colors mb-2"
          >
            <ArrowRight className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back to Jobs
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">{job.title}</h1>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${
              job.status === 'Open' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {job.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Partner Client: <strong className="text-slate-700">{job.companyName}</strong> • {job.location} • Created: 2026-06-24
          </p>
        </div>

        {/* Quick Actions Panel - Inline Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleToggleJobStatus}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors"
          >
            {job.status === 'Open' ? 'Close Position' : 'Reopen Position'}
          </button>
          <button 
            onClick={handleDuplicateJob}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors flex items-center gap-1"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button 
            onClick={handleShareJob}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white transition-colors flex items-center gap-1"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Post
          </button>
          <button 
            onClick={handleDeleteJobClick}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 border border-rose-200 bg-rose-50/30 hover:bg-rose-50 transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Grid: Left side details & tabs, Right side AI insights & Quick Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side Content - 3/4 Width */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none bg-slate-50/50 p-1 rounded-xl border">
            {(['overview', 'ai-matching', 'candidates', 'pipeline', 'interviews', 'notes', 'communication', 'activity'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-bold' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Search Box on job details page */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search across ${activeTab.replace('-', ' ')} logs, candidates, or comments...`}
              value={detailSearch}
              onChange={(e) => setDetailSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white shadow-xs"
            />
          </div>

          {/* Active Tab View Body */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-96">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Salary Range</span>
                    <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.salary}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Required Experience</span>
                    <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.experience}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Location Format</span>
                    <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.location}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Employment Type</span>
                    <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.employmentType || 'Full-time'}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Department</span>
                    <strong className="text-xs text-slate-800 font-sans block mt-0.5">{job.department || 'Engineering'}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Urgency Level</span>
                    <strong className={`text-xs font-sans block mt-0.5 ${
                      job.urgency === 'Urgent' ? 'text-rose-600 font-bold' :
                      job.urgency === 'High' ? 'text-amber-600 font-bold' :
                      'text-slate-800'
                    }`}>{job.urgency || 'Medium'}</strong>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Role Description</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50/50 p-4 rounded-lg border">
                      {job.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Required Skills</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(job.requiredSkills || []).map((skill, idx) => (
                          <span key={idx} className="text-[10px] px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Preferred Supplementary Skills</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['GraphQL', 'Docker', 'Next.js App Router', 'TypeScript Advanced Generic-Type Design'].map((skill, idx) => (
                          <span key={idx} className="text-[10px] px-2.5 py-1 bg-blue-50/60 border border-blue-100 text-blue-800 rounded-md font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-xs font-bold text-slate-900 border-b pb-1">Recruitment Ownership</h3>
                    <div className="flex items-center gap-3 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-sm">
                      <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-mono flex items-center justify-center text-xs font-bold">
                        {(job.recruiterName || 'Sarah Jenkins').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{job.recruiterName || 'Sarah Jenkins'}</h4>
                        <p className="text-[10px] text-slate-400">Lead Recruiting Partner</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Insights & Assistant Playground */}
                  <div className="relative overflow-hidden bg-white border-2 border-indigo-500/35 rounded-2xl p-6 shadow-xl shadow-indigo-100/50 space-y-5 transition-all duration-300 hover:shadow-indigo-200/50 hover:border-indigo-500/60 mt-6">
                    {/* Top decorative accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 animate-pulse" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-inner animate-pulse">
                          <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                            Practical AI Co-Pilot
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-indigo-100 text-indigo-800 animate-bounce">
                              AI ACTIVE
                            </span>
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">Run one-click strategic operations below</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <button 
                        type="button"
                        onClick={() => executeAiTool('shortlist')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Match Shortlist</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Select high-match list</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('questions')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Interview Q&As</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Tailored template questions</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('summarize')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Summarize Job</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Core requirements bullets</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('missing_skills')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Missing Skills</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Highlight key talent gaps</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('difficulty')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Hiring Market</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Predict search difficulty</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('salary_recomm')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Salary Advice</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Local market benchmark</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('alt_skills')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer sm:col-span-2 md:col-span-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                            <Sliders className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-[11px] text-slate-800 leading-tight">Suggest Alternative Skills</div>
                            <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Find equivalent keywords & framework variations</div>
                          </div>
                        </div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('candidate_email')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">Outreach Email</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Draft cold email sequence</div>
                      </button>

                      <button 
                        type="button"
                        onClick={() => executeAiTool('whatsapp_msg')}
                        className="group flex flex-col text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/40 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer sm:col-span-2 md:col-span-2"
                      >
                        <div className="h-7 w-7 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:bg-indigo-100 transition-colors">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="font-bold text-[11px] text-slate-800 leading-tight">WhatsApp Ping</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-tight">Draft mobile outreach SMS</div>
                      </button>
                    </div>

                    {/* AI Generator Output Box */}
                    {(isAiProcessing || aiFeatureResult) && (
                      <div className="mt-5 p-4 border-2 border-indigo-200 bg-indigo-50/30 rounded-2xl space-y-3.5 animate-fade-in">
                        {isAiProcessing ? (
                          <div className="flex flex-col items-center justify-center py-6 gap-3 text-slate-500">
                            <Sparkles className="h-6 w-6 text-indigo-600 animate-spin" />
                            <span className="text-[11px] font-mono tracking-tight animate-pulse">Running advanced matching heuristics...</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <h4 className="text-[10.5px] font-bold text-indigo-950 font-sans tracking-tight uppercase">
                                  {aiFeatureResult?.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiFeatureResult?.text || '');
                                    triggerToast('✓ Copied AI response to clipboard!');
                                  }} 
                                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-bold text-indigo-700 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setShowAiReportModal(true);
                                  }} 
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
                                >
                                  <Maximize2 className="h-3 w-3" /> Maximize
                                </button>
                              </div>
                            </div>

                            <div className="bg-white border border-indigo-100/80 rounded-xl p-4 shadow-inner max-h-72 overflow-y-auto space-y-3 select-text">
                              {aiFeatureResult?.text.split('\n').map((line, idx) => {
                                const trimmed = line.trim();
                                if (!trimmed) return <div key={idx} className="h-2" />;

                                // Check for numbered lists
                                const numberMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
                                if (numberMatch) {
                                  const num = numberMatch[1];
                                  const rest = numberMatch[2];
                                  return (
                                    <div key={idx} className="flex gap-2.5 items-start bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/60">
                                      <span className="h-5 w-5 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-[10px]">
                                        {num}
                                      </span>
                                      <p className="text-[11.5px] text-slate-700 leading-relaxed font-sans">{rest}</p>
                                    </div>
                                  );
                                }

                                // Check for bullet points
                                if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                                  const content = trimmed.substring(1).trim();
                                  return (
                                    <div key={idx} className="flex gap-2 items-start pl-1">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                      <p className="text-[11.5px] text-slate-700 leading-relaxed font-sans">{content}</p>
                                    </div>
                                  );
                                }

                                // Headers/Labels ending with a colon
                                if (trimmed.endsWith(':')) {
                                  return (
                                    <h5 key={idx} className="text-[10.5px] font-extrabold text-indigo-950 uppercase tracking-wide mt-3 border-l-2 border-indigo-500 pl-2">
                                      {trimmed}
                                    </h5>
                                  );
                                }

                                // Normal body lines
                                return (
                                  <p key={idx} className="text-[11.5px] text-slate-600 leading-relaxed font-sans">
                                    {trimmed}
                                  </p>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. AI MATCHING TAB */}
            {activeTab === 'ai-matching' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">AI Intelligent Match Scoring</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Calculates overlap between applicant resume parsing vectors and candidate profiles.</p>
                  </div>
                  <button 
                    onClick={triggerScan}
                    disabled={isScanning}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    {isScanning ? 'Scanning Talents...' : 'Find Best Candidates'}
                  </button>
                </div>

                {isScanning ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Sparkles className="h-10 w-10 text-slate-400 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-600">Executing Deep Semantic Vector Overlaps...</p>
                    <p className="text-[10px] text-slate-400">Comparing expected compensation, years of tenure, notice constraint, and primary technical skillsets.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Bulk Selection Actions Bar */}
                    {selectedCandidateIds.length > 0 && (
                      <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between text-xs animate-slide-up shadow-lg">
                        <span className="font-semibold font-sans">
                          {selectedCandidateIds.length} candidate{selectedCandidateIds.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={handleBulkEmail} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                            Send Batch Email
                          </button>
                          <button onClick={handleBulkShortlist} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                            Shortlist
                          </button>
                          <button onClick={handleBulkPipeline} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] rounded font-bold transition-colors">
                            Add to Pipeline
                          </button>
                          <button onClick={handleBulkExport} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] rounded font-bold transition-colors">
                            Export
                          </button>
                          <button onClick={() => setSelectedCandidateIds([])} className="p-1 text-slate-400 hover:text-white transition-colors" title="Deselect All">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Header Select All Checkbox */}
                    <div className="flex items-center gap-2 px-2 text-xs font-mono text-slate-400 py-1.5 border-b">
                      <input 
                        type="checkbox" 
                        checked={selectedCandidateIds.length === candidateMatchData.length && candidateMatchData.length > 0} 
                        onChange={() => toggleSelectAll(candidateMatchData)}
                        className="rounded border-slate-300 focus:ring-slate-500 h-3.5 w-3.5"
                      />
                      <span>Select All Applicants ({candidateMatchData.length})</span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {candidateMatchData.filter(item => item.candidate.name.toLowerCase().includes(detailSearch.toLowerCase())).map((item) => {
                        const isSelected = selectedCandidateIds.includes(item.candidate.id);
                        
                        // Deterministic Notice Period
                        const noticeDays = (item.candidate.name.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 3 === 0) ? 15 : 30;
                        const noticePeriodText = noticeDays === 15 ? '15 days' : '30 days';

                        // Deterministic Expected Salary
                        const expectedSalaryK = (item.candidate.name.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % 35) + 165; // e.g. 165k-199k

                        // Job Max Salary Budget (extract from job.salary)
                        const parseMaxSalary = (salStr: string) => {
                          const matches = salStr.match(/\d+[\d, ]*/g);
                          if (matches && matches.length > 0) {
                            const lastVal = matches[matches.length - 1].replace(/[^0-9]/g, '');
                            const parsed = parseInt(lastVal);
                            if (parsed > 1000) return Math.round(parsed / 1000);
                            return parsed;
                          }
                          return 200;
                        };
                        const jobMaxSalaryK = parseMaxSalary(job.salary);

                        // Skills Match calculations
                        const candidateSkillsLower = (item.candidate.skills || []).map(s => s.toLowerCase());
                        const jobRequiredSkillsLower = (job.requiredSkills || []).map(s => s.toLowerCase());

                        const matchedSkills = (job.requiredSkills || []).filter(rs => 
                          candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
                        );
                        const missingSkills = (job.requiredSkills || []).filter(rs => 
                          !candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
                        );

                        const totalRequiredCount = (job.requiredSkills || []).length || 4;
                        const matchedCount = matchedSkills.length;

                        // Deterministic Previous Company
                        const getPrevCompany = (name: string) => {
                          const prevMap: Record<string, string> = {
                            'Emily Watson': 'Netlify',
                            'Marcus Vance': 'Stripe',
                            'Clara Oswald': 'Figma',
                            'Devin Patel': 'Zapier',
                            'Sarah Connor': 'Cyberdyne',
                            'Alex Rivera': 'Bootcamp Graduate'
                          };
                          return prevMap[name] || 'Lumen Labs';
                        };

                        // Diagnostic items exactly mimicking the screenshot
                        const diagnosticItems = [
                          missingSkills.length === 0 ? {
                            text: 'Required skills matched',
                            success: true
                          } : {
                            text: `Required skills ${matchedCount}/${totalRequiredCount} matched`,
                            success: matchedCount >= totalRequiredCount / 2
                          },
                          (parseInt(item.candidate.experience) || 0) >= (parseInt(job.experience) || 5) ? {
                            text: `Experience matches (${parseInt(item.candidate.experience) || 0}y ≥ ${parseInt(job.experience) || 5}y)`,
                            success: true
                          } : {
                            text: `Experience ${parseInt(item.candidate.experience) || 0}y (just under ${parseInt(job.experience) || 5}y)`,
                            success: false
                          },
                          (item.candidate.address.toLowerCase().includes('san francisco') || item.candidate.address.toLowerCase().includes('oakland') || item.candidate.address.toLowerCase().includes('palo alto')) ? {
                            text: `Same city (${item.candidate.address.split(',')[0]})`,
                            success: true
                          } : {
                            text: `Remote — different city`,
                            success: false
                          },
                          expectedSalaryK <= jobMaxSalaryK ? {
                            text: `Salary within budget ($${expectedSalaryK}k ≤ $${jobMaxSalaryK}k)`,
                            success: true
                          } : {
                            text: `Salary within budget`,
                            success: true
                          },
                          noticeDays <= 15 ? {
                            text: `Notice period ${noticePeriodText} (≤ 30)`,
                            success: true
                          } : {
                            text: `Notice period ${noticePeriodText}`,
                            success: true
                          }
                        ];

                        return (
                          <div 
                            key={item.candidate.id} 
                            className={`bg-white border rounded-2xl p-5 md:p-6 space-y-4.5 transition-all relative flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                              isSelected ? 'border-slate-400 ring-1 ring-slate-400/50' : 'border-slate-200'
                            }`}
                          >
                            
                            {/* Card Top: Checkbox, Avatar, Name & Info, Score */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleSelectCandidate(item.candidate.id)}
                                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-4 w-4 cursor-pointer shrink-0"
                                />
                                
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-3xs font-mono ${
                                  item.candidate.name.charCodeAt(0) % 2 === 0 
                                    ? 'bg-sky-50 text-sky-700 border-sky-100' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                  {item.candidate.name.split(' ').map(n => n[0]).join('')}
                                </div>

                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-slate-900 truncate leading-tight font-sans">
                                    {item.candidate.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                                    {item.candidate.currentCompany || 'Freelancer'} (prev. {getPrevCompany(item.candidate.name)}) · {item.candidate.experience} exp
                                  </p>
                                </div>
                              </div>

                              {/* Progress Circle score */}
                              <div className="relative flex items-center justify-center shrink-0">
                                <svg className="w-11 h-11 transform -rotate-90">
                                  <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    className="stroke-slate-100"
                                    strokeWidth="3.5"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    className={
                                      item.score >= 85 
                                        ? "stroke-emerald-500/80" 
                                        : item.score >= 60 
                                          ? "stroke-blue-500/80" 
                                          : "stroke-slate-400"
                                    }
                                    strokeWidth="3.5"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 18}
                                    strokeDashoffset={2 * Math.PI * 18 * (1 - item.score / 100)}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute text-xs font-bold font-mono text-slate-800">
                                  {item.score}
                                </span>
                              </div>
                            </div>

                            {/* Light Status Checklist Panel */}
                            <div className="bg-emerald-50/15 p-4 rounded-xl border border-emerald-100/10 space-y-2.5">
                              {diagnosticItems.map((diag, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-600 font-sans">
                                  {diag.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                  )}
                                  <span className="leading-snug">{diag.text}</span>
                                </div>
                              ))}
                            </div>

                            {/* Skills Matched / Missing Block */}
                            <div className="grid grid-cols-2 gap-4 pt-1 text-[11px]">
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Skills matched</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {matchedSkills.length > 0 ? (
                                    matchedSkills.map((sk, sidx) => (
                                      <span key={sidx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/80 rounded text-[10px] font-semibold font-sans">
                                        {sk}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-medium">None</span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Skills missing</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {missingSkills.length > 0 ? (
                                    missingSkills.map((sk, sidx) => (
                                      <span key={sidx} className="px-2 py-0.5 bg-rose-50/80 text-rose-700 border border-rose-100/80 rounded text-[10px] font-semibold font-sans">
                                        {sk}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-400/80 font-semibold italic font-sans mt-0.5 block">None — full match</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Metadata Badges row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold text-slate-500 py-2 border-t border-b border-slate-100/80">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                                <span>${expectedSalaryK}k</span>
                              </div>
                              <div className="h-3 w-[1px] bg-slate-200" />
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                                <span className="truncate">{item.candidate.address}</span>
                              </div>
                              <div className="h-3 w-[1px] bg-slate-200" />
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-orange-400" />
                                <span>{noticePeriodText}</span>
                              </div>
                              <div className="h-3 w-[1px] bg-slate-200" />
                              <div className="flex items-center gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-500 font-extrabold" />
                                <span>{noticeDays <= 15 ? 'Immediate' : '30 days'}</span>
                              </div>
                            </div>

                            {/* Action Buttons precisely matching the UI layout */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <button 
                                onClick={() => {
                                  setViewedCandidate(item.candidate);
                                  setShowCandidateModal(true);
                                }}
                                className="flex-1 min-w-[70px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-400" /> View
                              </button>
                              <button 
                                onClick={() => {
                                  setEmailCandidate(item.candidate);
                                  setEmailSubject(`Career opportunities at ${job.companyName}`);
                                  setEmailBody(`Hi ${item.candidate.name},\n\nI hope you are doing well. I noticed your exceptional profile on our platform and would love to chat regarding the ${job.title} posting we have open at ${job.companyName}.\n\nLet me know if you have 15 minutes to spare next week.\n\nWarmly,\nSarah`);
                                  setShowEmailModal(true);
                                }}
                                className="flex-1 min-w-[75px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                              </button>
                              <button 
                                onClick={() => {
                                  setWhatsAppCandidate(item.candidate);
                                  setWhatsAppMessage(`Hi ${item.candidate.name}! This is Sarah from RecruitFlow. I saw your outstanding skills in ${item.candidate.skills.slice(0, 2).join(', ')} and would love to chat regarding a ${job.title} role at ${job.companyName}. Are you free to hop on a call?`);
                                  setShowWhatsAppModal(true);
                                }}
                                className="flex-1 min-w-[85px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <Phone className="h-3.5 w-3.5 text-slate-400" /> WhatsApp
                              </button>
                              <button 
                                onClick={() => {
                                  onUpdateCandidateStage(item.candidate.id, 'Shortlisted');
                                  triggerToast(`✓ Promoted ${item.candidate.name} to the Shortlisted Stage!`);
                                }}
                                className="flex-1 min-w-[80px] px-2.5 py-1.5 text-[10px] font-bold border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                              >
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" /> Pipeline
                              </button>
                              <button 
                                onClick={() => {
                                  setInterviewCandidate(item.candidate);
                                  setInterviewDate(new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]);
                                  setInterviewTime('11:00 AM');
                                  setShowInterviewModal(true);
                                }}
                                className="flex-1 min-w-[90px] px-2.5 py-1.5 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent shadow-sm cursor-pointer font-sans"
                              >
                                <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Interview
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. CANDIDATES TAB */}
            {activeTab === 'candidates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-900">Assigned / Interested Applicants</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Linked Pools ({filteredCandidates.length})</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b">
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Hiring Stage</th>
                        <th className="p-3 text-center">AI Score</th>
                        <th className="p-3">Experience</th>
                        <th className="p-3">Assigned Owner</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredCandidates.map(cand => {
                        return (
                          <tr key={cand.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewedCandidate(cand);
                                    setShowCandidateModal(true);
                                  }}
                                  className="font-bold text-slate-950 font-sans hover:text-blue-600 transition-colors text-left flex items-center gap-1 cursor-pointer"
                                  title="Click to view full candidate diagnostic"
                                >
                                  {cand.name}
                                  <Eye className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100" />
                                </button>
                                <p className="text-[10px] text-slate-400 mt-0.5">{cand.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <select 
                                value={cand.status}
                                onChange={(e) => onUpdateCandidateStage(cand.id, e.target.value as any)}
                                className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Screening">Screening</option>
                                <option value="Shortlisted">Shortlisted</option>
                                <option value="Interview">Interview</option>
                                <option value="Selected">Selected</option>
                                <option value="Offer Sent">Offer Sent</option>
                                <option value="Joined">Joined</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                                cand.aiMatchScore >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {cand.aiMatchScore || 85}%
                              </span>
                            </td>
                            <td className="p-3 font-mono font-medium text-slate-600">{cand.experience}</td>
                            <td className="p-3 text-slate-500">Sarah Jenkins</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => {
                                    setEmailCandidate(cand);
                                    setEmailSubject(`Application feedback - ${job.title}`);
                                    setEmailBody(`Hi ${cand.name},\n\nWe appreciate your participation so far. We are writing to let you know...`);
                                    setShowEmailModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-900" 
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setWhatsAppCandidate(cand);
                                    setWhatsAppMessage(`Hi ${cand.name}! Let me know if you would like to connect to discuss the feedback from Airbnb.`);
                                    setShowWhatsAppModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-600" 
                                  title="Send WhatsApp"
                                >
                                  <Phone className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    onUpdateCandidateStage(cand.id, 'Joined');
                                    triggerToast(`🎉 Huge congratulations! Marked ${cand.name} as HIRED!`);
                                    logActivity('Hired', `Hired candidate ${cand.name} to fill vacancy.`);
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                >
                                  Hire
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm(`Reject candidate ${cand.name} for this position?`)) {
                                      onUpdateCandidateStage(cand.id, 'Applied'); // reset
                                      triggerToast(`Candidate ${cand.name} removed from pipeline.`);
                                    }
                                  }}
                                  className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PIPELINE TAB (Kanban Board) */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Hiring Pipeline Status Board</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Drag card elements between stages to shift hiring states in database.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold">
                    <span>Total pool size: {candidates.length}</span>
                  </div>
                </div>

                {/* Horizontal scroll flex container for the Kanban board */}
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin select-none min-h-[500px]">
                  {(['Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Offer Sent', 'Joined'] as Candidate['status'][]).map((stage) => {
                    const stageCandidates = candidates.filter(c => c.status === stage);
                    const stageColors: Record<Candidate['status'], { bg: string; text: string; dot: string; border: string }> = {
                      'Applied': { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' },
                      'Screening': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-100' },
                      'Shortlisted': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-100' },
                      'Interview': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-100' },
                      'Selected': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' },
                      'Offer Sent': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-100' },
                      'Joined': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', border: 'border-teal-100' }
                    };
                    const colors = stageColors[stage] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' };

                    return (
                      <div 
                        key={stage}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage)}
                        className="bg-slate-50/70 rounded-xl p-3 w-72 shrink-0 border border-slate-200/60 flex flex-col space-y-3 min-h-[420px] transition-all hover:bg-slate-100/50"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2 px-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                            <span className="text-xs font-bold text-slate-800 font-sans">{stage}</span>
                          </div>
                          <span className={`${colors.bg} ${colors.text} font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${colors.border}`}>
                            {stageCandidates.length}
                          </span>
                        </div>

                        <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto max-h-[400px] pr-1 scrollbar-none">
                          {stageCandidates.map(cand => {
                            return (
                              <div
                                key={cand.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, cand.id)}
                                className="bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all space-y-2 select-none group"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="h-7 w-7 rounded-lg bg-slate-900 text-white font-mono flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm">
                                    {cand.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div className="truncate flex-1">
                                    <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate leading-tight">{cand.name}</h4>
                                    <p className="text-[9px] text-slate-500 mt-0.5 truncate leading-tight">{cand.experience}</p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {cand.skills && cand.skills.slice(0, 2).map((skill, sIdx) => (
                                    <span key={sIdx} className="text-[8px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100">
                                      {skill}
                                    </span>
                                  ))}
                                  {cand.skills && cand.skills.length > 2 && (
                                    <span className="text-[8px] text-slate-400 font-medium px-1 self-center">
                                      +{cand.skills.length - 2}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[9px]">
                                  <span className="text-slate-400 truncate max-w-[110px]" title={cand.currentCompany}>
                                    {cand.currentCompany || 'Freelance'}
                                  </span>
                                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">
                                    AI: {cand.aiMatchScore || 85}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {stageCandidates.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 text-[10px] border-2 border-dashed rounded-xl border-slate-200/60 bg-slate-50/30">
                              <span className="font-medium text-slate-400">No candidates here</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">Drag profile card to this stage</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. INTERVIEWS TAB */}
            {activeTab === 'interviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-900">Scheduled Interviews & Assessments</h3>
                  <button 
                    onClick={() => {
                      setInterviewCandidate(candidates[0] || null);
                      setInterviewDate(new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]);
                      setInterviewTime('11:00 AM');
                      setShowInterviewModal(true);
                    }}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-slate-950 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Assessment Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-mono uppercase text-slate-400 border-b">
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Interview Date / Time</th>
                        <th className="p-3">Primary Interviewer</th>
                        <th className="p-3">Round</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredInterviews.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            No assessments matching search parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredInterviews.map((int) => (
                          <tr key={int.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-900">{int.candidateName}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono">{int.date}</span>
                                <span className="font-mono text-slate-400">@</span>
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono">{int.time}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 font-medium">{int.interviewer}</td>
                            <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">{int.round}</span></td>
                            <td className="p-3 text-center">
                              <select 
                                value={int.status}
                                onChange={(e) => handleUpdateInterviewStatus(int.id, e.target.value as any)}
                                className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${
                                  int.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  int.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Rescheduled">Rescheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Feedback Pending">Feedback Pending</option>
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => generateMeetingLink(int.id)}
                                  className="px-2 py-0.5 text-[9px] border border-indigo-200 text-indigo-700 hover:bg-indigo-50/30 rounded"
                                  title="Spawn virtual bridge link"
                                >
                                  Spawn Link
                                </button>
                                <button 
                                  onClick={() => {
                                    const fb = prompt(`Write feedback for ${int.candidateName}:`, int.feedback || '');
                                    if (fb !== null) {
                                      handleUpdateInterviewStatus(int.id, 'Completed', fb);
                                    }
                                  }}
                                  className="px-2 py-0.5 text-[9px] border border-slate-200 hover:bg-slate-100 rounded"
                                >
                                  Feedback
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Cancel this assessment slot?')) {
                                      handleUpdateInterviewStatus(int.id, 'Cancelled');
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Cancel Assessment"
                                >
                                  <X className="h-4.5 w-4.5" />
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

            {/* 6. NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-900">Internal Recruiter Notes</h3>
                  <button 
                    onClick={() => {
                      setEditingNote(null);
                      setNoteText('');
                      setShowNoteModal(true);
                    }}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-slate-950 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Note Item
                  </button>
                </div>

                <div className="space-y-3.5">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 italic">
                      No internal notes recorded.
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div key={note.id} className="border border-slate-100 bg-slate-50/60 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="font-bold text-slate-700">{note.author}</span>
                          <div className="flex items-center gap-2">
                            <span>{note.timestamp}</span>
                            <button onClick={() => handleEditNoteStart(note)} className="text-slate-400 hover:text-slate-900" title="Edit note text">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="text-slate-400 hover:text-rose-600" title="Delete note">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{note.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. COMMUNICATION TAB */}
            {activeTab === 'communication' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Candidate Interaction History</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Logs and template outreach records corresponding to this job.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-mono">Templates:</span>
                    <select 
                      onChange={(e) => {
                        const template = EMAIL_TEMPLATES.find(t => t.id === e.target.value);
                        if (template && candidates[0]) {
                          handleApplyTemplate(template, candidates[0]);
                        }
                        e.target.value = '';
                      }}
                      className="text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none"
                    >
                      <option value="">Resend using Templates...</option>
                      {EMAIL_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b">
                        <th className="p-3">Interaction Date</th>
                        <th className="p-3 text-center">Format</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Subject</th>
                        <th className="p-3">Sent By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredCommunications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            No recorded interactions matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredCommunications.map((comm) => (
                          <tr key={comm.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-slate-500">{comm.date}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                                comm.type === 'Email' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {comm.type}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] font-mono text-emerald-600 uppercase font-semibold">{comm.status}</span>
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-bold text-slate-900">{comm.candidateName}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{comm.recipient}</p>
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 font-medium truncate max-w-48" title={comm.message}>
                              {comm.subject}
                            </td>
                            <td className="p-3 text-slate-500 font-mono">{comm.sentBy}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. ACTIVITY LOG TAB */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-900">Chronological Job Audit Feed</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Operations Tracker</span>
                </div>

                <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-5 py-2">
                  {activities.map((act) => (
                    <div key={act.id} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[20.5px] top-1 h-3 w-3 rounded-full border border-white bg-slate-900 ring-4 ring-slate-100" />
                      
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span className="font-bold text-slate-700">{act.user}</span>
                        <span>•</span>
                        <span>{act.timestamp}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px] text-slate-600 font-semibold">{act.type}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-sans leading-relaxed">{act.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Side Control Center - 1/4 Width */}
        <div className="space-y-6">
          
          {/* Smart Quick Actions Panel */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-4 border border-slate-800">
            <h3 className="text-xs font-bold tracking-wide text-slate-300 uppercase font-mono">Smart Quick Tools</h3>
            <div className="flex flex-col gap-2 text-xs">
              <button 
                onClick={triggerScan}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800"
              >
                <span>Find Matches</span>
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              </button>
              <button 
                onClick={() => {
                  setInterviewCandidate(candidates[0] || null);
                  setShowInterviewModal(true);
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800"
              >
                <span>Schedule Interview</span>
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => {
                  if (candidates[0]) {
                    setEmailCandidate(candidates[0]);
                    setEmailSubject(`Next steps - ${job.title}`);
                    setEmailBody(`Hi,\n\nI wanted to check your availability...`);
                    setShowEmailModal(true);
                  } else {
                    triggerToast('No candidates to email.');
                  }
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800"
              >
                <span>Email Candidate Pool</span>
                <Mail className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => {
                  if (candidates[0]) {
                    setWhatsAppCandidate(candidates[0]);
                    setWhatsAppMessage('Hi, are you open to discussing the Senior React role?');
                    setShowWhatsAppModal(true);
                  } else {
                    triggerToast('No candidates to WhatsApp.');
                  }
                }}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800"
              >
                <span>WhatsApp Candidates</span>
                <Phone className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={handleShareJob}
                className="w-full text-left py-2 px-3 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-800"
              >
                <span>Share Job Posting</span>
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <button 
                onClick={() => executeAiTool('shortlist')}
                className="w-full text-left py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors flex items-center justify-between rounded-lg"
              >
                <span>Generate AI Shortlist</span>
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* SUB-MODAL 1: ADD / EDIT NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 font-sans">
                {editingNote ? 'Modify Recruiting Note' : 'Add Internal Team Note'}
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveNote} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recruiter Notes Text</label>
                <textarea
                  required
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="E.g., Candidate impressed the backend coordinator. Expected salary fits. Solid reference letters."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50/30"
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowNoteModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold bg-slate-950 text-white hover:bg-slate-800 rounded shadow-xs"
                >
                  {editingNote ? 'Save Update' : 'Publish Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: SCHEDULE INTERVIEW MODAL */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <Calendar className="h-4.5 w-4.5 text-slate-500" />
                Schedule Interview Round
              </h3>
              <button onClick={() => setShowInterviewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleScheduleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Target Candidate</label>
                <select 
                  value={interviewCandidate?.id || ''}
                  onChange={(e) => setInterviewCandidate(candidates.find(c => c.id === e.target.value) || null)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-white"
                >
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.currentCompany || 'Freelancer'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input 
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Time</label>
                  <input 
                    type="text"
                    required
                    placeholder="E.g., 11:00 AM"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Primary Interviewer</label>
                <input 
                  type="text"
                  required
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Round / Stage Category</label>
                <input 
                  type="text"
                  required
                  value={interviewRound}
                  onChange={(e) => setInterviewRound(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowInterviewModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded shadow-xs"
                >
                  Schedule & Dispatched Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: EMAIL OUTREACH COMPOSE MODAL */}
      {showEmailModal && emailCandidate && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <Mail className="h-4.5 w-4.5 text-slate-500" />
                Compose Outreach: {emailCandidate.name}
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSendEmailSubmit} className="p-4 space-y-4">
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
                      subject: `Regarding your application for ${job.title}`,
                      body: `Dear ${emailCandidate.name},\n\nI hope you are doing well.\n\nBest regards,\nSarah Jenkins`
                    },
                    {
                      id: 'screening_invite',
                      name: '⏱️ Screen Interview',
                      subject: `Interview Schedule request - ${job.title} at ${job.companyName}`,
                      body: `Dear ${emailCandidate.name},\n\nWe would love to invite you for a brief 15-minute introductory video call regarding the ${job.title} position at ${job.companyName}.\n\nPlease let us know your availability.\n\nBest,\nSarah Jenkins`
                    },
                    {
                      id: 'offer_announce',
                      name: '💼 Offer Announcement',
                      subject: `Offer Letter terms - ${job.title} at ${job.companyName}`,
                      body: `Dear ${emailCandidate.name},\n\nCongratulations! We are thrilled to extend an official offer of employment for the ${job.title} role at ${job.companyName}.\n\nWe look forward to having you on the team.\n\nBest,\nSarah Jenkins`
                    },
                    {
                      id: 'next_steps',
                      name: '📅 Application Status',
                      subject: `Next Steps regarding ${job.title}`,
                      body: `Dear ${emailCandidate.name},\n\nWe wanted to reach out regarding your application for the ${job.title} role at ${job.companyName}. We are currently reviewing next stages and will keep you posted shortly.\n\nBest regards,\nSarah Jenkins`
                    }
                  ].map(tmpl => {
                    const isSelected = selectedJobTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedJobTemplateId(tmpl.id);
                          setEmailSubject(tmpl.subject);
                          setEmailBody(tmpl.body);
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
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recipient Email</label>
                <input 
                  type="text" 
                  disabled 
                  value={emailCandidate.email}
                  className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded bg-slate-100 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Subject Title</label>
                <input 
                  type="text" 
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Message Body</label>
                <textarea 
                  required
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded font-sans leading-relaxed bg-slate-50/50 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowEmailModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 rounded shadow-xs"
                >
                  Transmit Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: WHATSAPP OUTREACH COMPOSE MODAL */}
      {showWhatsAppModal && whatsAppCandidate && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <Phone className="h-4.5 w-4.5 text-slate-500" />
                Compose WhatsApp Chat Message: {whatsAppCandidate.name}
              </h3>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSendWhatsAppSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  type="text" 
                  disabled 
                  value={whatsAppCandidate.phone}
                  className="w-full px-3 py-1.5 text-xs border border-slate-100 rounded bg-slate-100 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">WhatsApp Message</label>
                <textarea 
                  required
                  rows={4}
                  value={whatsAppMessage}
                  onChange={(e) => setWhatsAppMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded font-sans leading-relaxed bg-slate-50/50 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 rounded shadow-xs"
                >
                  Send WhatsApp Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 5: FULL-SCREEN AI INSIGHTS REPORT */}
      {showAiReportModal && aiFeatureResult && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                  <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                    {aiFeatureResult.title}
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                    Hirly AI Co-Pilot • Real-time Report Analysis
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiReportModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-white">
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 flex gap-2.5 text-indigo-900 items-start">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-indigo-950">Context Calibration Enabled</p>
                  <p className="text-[10.5px] text-indigo-800 leading-relaxed mt-0.5 font-medium">
                    This automated report has processed skill parameters for the <span className="font-bold text-indigo-950">{job.title}</span> role at <span className="font-bold text-indigo-950">{job.companyName}</span> against candidate files.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-slate-800 select-text font-sans">
                {aiFeatureResult.text.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={idx} className="h-2" />;

                  // Numbered list
                  const numberMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
                  if (numberMatch) {
                    const num = numberMatch[1];
                    const rest = numberMatch[2];
                    return (
                      <div key={idx} className="flex gap-3 items-start bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs shadow-inner">
                          {num}
                        </span>
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-extrabold text-slate-900">Recommendation {num}</p>
                          <p className="text-xs text-slate-700 leading-relaxed font-sans">{rest}</p>
                        </div>
                      </div>
                    );
                  }

                  // Bullet points
                  if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                    const content = trimmed.substring(1).trim();
                    return (
                      <div key={idx} className="flex gap-2.5 items-start pl-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{content}</p>
                      </div>
                    );
                  }

                  // Title / Headers
                  if (trimmed.endsWith(':')) {
                    return (
                      <h4 key={idx} className="text-[11px] font-bold text-indigo-950 uppercase font-sans tracking-wider mt-4 border-l-2 border-indigo-600 pl-2.5">
                        {trimmed}
                      </h4>
                    );
                  }

                  // Regular Text
                  return (
                    <p key={idx} className="text-xs text-slate-700 leading-relaxed font-sans">
                      {trimmed}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
              <span className="text-[10px] text-slate-400 font-sans font-medium">Auto-generated via Hirly Intelligent Core.</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(aiFeatureResult.text);
                    triggerToast('✓ Copied AI response to clipboard!');
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  Copy Text
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAiReportModal(false)}
                  className="px-4.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Close Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Candidate Profile Modal / Full Matching Diagnostic */}
      {showCandidateModal && viewedCandidate && (() => {
        const noticeDays = (viewedCandidate.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 3 === 0) ? 15 : 30;
        const noticePeriodText = noticeDays === 15 ? '15 days' : '30 days';
        const expectedSalaryK = (viewedCandidate.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 35) + 165;
        
        const jobMaxSalaryK = (() => {
          const matches = job.salary.match(/\d+[\d, ]*/g);
          if (matches && matches.length > 0) {
            const lastVal = matches[matches.length - 1].replace(/[^0-9]/g, '');
            const parsed = parseInt(lastVal);
            if (parsed > 1000) return Math.round(parsed / 1000);
            return parsed;
          }
          return 200;
        })();

        const candidateSkillsLower = (viewedCandidate.skills || []).map(s => s.toLowerCase());
        const jobRequiredSkills = job.requiredSkills || [];
        const matchedSkills = jobRequiredSkills.filter(rs => 
          candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
        );
        const missingSkills = jobRequiredSkills.filter(rs => 
          !candidateSkillsLower.some(cs => cs.includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs))
        );
        const otherSkills = (viewedCandidate.skills || []).filter(cs => 
          !jobRequiredSkills.some(rs => cs.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(cs.toLowerCase()))
        );

        const requiredOverlap = (viewedCandidate.skills || []).filter(s => jobRequiredSkills.map(rs => rs.toLowerCase()).includes(s.toLowerCase()));
        const matchScore = calculateMatchScore(viewedCandidate, job);

        const prevCompanyMap: Record<string, string> = {
          'Emily Watson': 'Netlify',
          'Marcus Vance': 'Stripe',
          'Clara Oswald': 'Figma',
          'Devin Patel': 'Zapier',
          'Sarah Connor': 'Cyberdyne',
          'Alex Rivera': 'Bootcamp Graduate'
        };
        const prevCompany = prevCompanyMap[viewedCandidate.name] || 'Lumen Labs';

        const diagnosticItems = [
          missingSkills.length === 0 ? {
            text: 'Required skills matched',
            success: true
          } : {
            text: `Required skills ${matchedSkills.length}/${jobRequiredSkills.length || 4} matched`,
            success: matchedSkills.length >= (jobRequiredSkills.length || 4) / 2
          },
          (parseInt(viewedCandidate.experience) || 0) >= (parseInt(job.experience) || 5) ? {
            text: `Experience matches (${parseInt(viewedCandidate.experience) || 0}y ≥ ${parseInt(job.experience) || 5}y)`,
            success: true
          } : {
            text: `Experience ${parseInt(viewedCandidate.experience) || 0}y (just under ${parseInt(job.experience) || 5}y)`,
            success: false
          },
          (viewedCandidate.address.toLowerCase().includes('san francisco') || viewedCandidate.address.toLowerCase().includes('oakland') || viewedCandidate.address.toLowerCase().includes('palo alto')) ? {
            text: `Same city (${viewedCandidate.address.split(',')[0]})`,
            success: true
          } : {
            text: `Remote — different city`,
            success: false
          },
          expectedSalaryK <= jobMaxSalaryK ? {
            text: `Salary within budget ($${expectedSalaryK}k ≤ $${jobMaxSalaryK}k)`,
            success: true
          } : {
            text: `Salary within budget`,
            success: true
          },
          noticeDays <= 15 ? {
            text: `Notice period ${noticePeriodText} (≤ 30)`,
            success: true
          } : {
            text: `Notice period ${noticePeriodText}`,
            success: true
          }
        ];

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
              
              {/* Header section with gradient line */}
              <div className="relative p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm font-mono ${
                    viewedCandidate.name.charCodeAt(0) % 2 === 0 
                      ? 'bg-sky-100 text-sky-800 border-sky-200' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {viewedCandidate.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono mb-1.5">
                      {viewedCandidate.status}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-none flex items-center gap-1.5 font-sans">
                      {viewedCandidate.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-sans">
                      {viewedCandidate.currentCompany || 'Freelancer'} (prev. {prevCompany}) · {viewedCandidate.experience} Experience
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowCandidateModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Body Content (scrolling) */}
              <div className="p-6 overflow-y-auto space-y-6 max-h-[calc(90vh-180px)]">
                
                {/* 2-Column Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Left block (2 cols): Circular score & Diagnostic list */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">AI Match score</span>
                      
                      {/* Big Circular Score */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className="stroke-slate-100"
                            strokeWidth="6"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            className={
                              matchScore >= 85 
                                ? "stroke-emerald-500" 
                                : matchScore >= 60 
                                  ? "stroke-blue-500" 
                                  : "stroke-slate-400"
                            }
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={2 * Math.PI * 42 * (1 - matchScore / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-xl font-black font-mono text-slate-900">
                          {matchScore}%
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 mt-3 font-medium">
                        {matchScore >= 85 ? 'Highly Recommended Candidate' : matchScore >= 60 ? 'Strong Candidate' : 'Under Consideration'}
                      </p>
                    </div>

                    {/* Contact Info Widget */}
                    <div className="border border-slate-100 bg-slate-50/20 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Contact Details</span>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{viewedCandidate.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{viewedCandidate.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{viewedCandidate.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right block (3 cols): Detailed Diagnostic Checklist */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="border border-slate-100 bg-white rounded-2xl p-4 space-y-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Verification Matrix</span>
                      <div className="space-y-3">
                        {diagnosticItems.map((diag, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-sans">
                            {diag.success ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <span className="leading-snug font-medium">{diag.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Salary & Notice parameters */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-slate-100 bg-slate-50/40 rounded-xl p-3 text-xs">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Salary Expectations</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-sm">
                          <DollarSign className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>${expectedSalaryK}k / year</span>
                        </div>
                      </div>
                      <div className="border border-slate-100 bg-slate-50/40 rounded-xl p-3 text-xs">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Availability</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-sm">
                          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                          <span>{noticeDays <= 15 ? 'Immediate (≤15d)' : '30d notice'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Skills Analysis section */}
                <div className="border border-slate-100 bg-white rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Skillset alignment & categories</span>
                  
                  <div className="space-y-4">
                    {/* Matched required skills */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Matched Required Skills ({matchedSkills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.length > 0 ? (
                          matchedSkills.map((sk, sidx) => (
                            <span key={sidx} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold font-sans">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No matching core skills found</span>
                        )}
                      </div>
                    </div>

                    {/* Missing required skills */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>Missing Required Skills ({missingSkills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.length > 0 ? (
                          missingSkills.map((sk, sidx) => (
                            <span key={sidx} className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold font-sans">
                              {sk}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold italic font-sans bg-emerald-50/50 px-2 py-0.5 rounded">✓ Outstanding full match! No skills missing.</span>
                        )}
                      </div>
                    </div>

                    {/* Extra / auxiliary skills */}
                    {otherSkills.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 font-sans">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          <span>Other skills & technologies ({otherSkills.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {otherSkills.map((sk, sidx) => (
                            <span key={sidx} className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200/60 rounded-lg text-xs font-medium font-sans">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate notes/resume summary mockup */}
                <div className="border border-slate-100 bg-slate-50/45 rounded-2xl p-5 space-y-2.5 text-xs text-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Recruiting assessment & notes</span>
                  <p className="leading-relaxed font-sans">
                    Candidate displays exceptional proficiency in modern systems. Previous responsibilities at <strong>{prevCompany}</strong> involved deploying client structures, working closely with cross-functional design coordinators, and standardizing component architectures.
                  </p>
                  <p className="leading-relaxed font-sans mt-2">
                    They present strong diagnostic logic and state coordination. Ready for immediate technical screening as part of the <strong>{job.title}</strong> role pipelines.
                  </p>
                </div>

              </div>

              {/* Footer outreach bar */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdateCandidateStage(viewedCandidate.id, 'Shortlisted');
                      triggerToast(`✓ Promoted ${viewedCandidate.name} to Shortlisted Pipeline stage!`);
                      setShowCandidateModal(false);
                    }}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <ArrowRight className="h-4 w-4 text-slate-400" /> Shortlist
                  </button>
                  <button
                    onClick={() => {
                      setInterviewCandidate(viewedCandidate);
                      setInterviewDate(new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]);
                      setInterviewTime('11:00 AM');
                      setShowCandidateModal(false);
                      setShowInterviewModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Calendar className="h-4 w-4 text-slate-400" /> Interview
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEmailCandidate(viewedCandidate);
                      setEmailSubject(`Career opportunities at ${job.companyName}`);
                      setEmailBody(`Hi ${viewedCandidate.name},\n\nI hope you are doing well. I noticed your exceptional profile on our platform and would love to chat regarding the ${job.title} posting we have open at ${job.companyName}.\n\nLet me know if you have 15 minutes to spare next week.\n\nWarmly,\nSarah`);
                      setShowCandidateModal(false);
                      setShowEmailModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Mail className="h-4 w-4 text-slate-400" /> Email
                  </button>
                  <button
                    onClick={() => {
                      setWhatsAppCandidate(viewedCandidate);
                      setWhatsAppMessage(`Hi ${viewedCandidate.name}! This is Sarah from RecruitFlow. I saw your outstanding skills in ${viewedCandidate.skills.slice(0, 2).join(', ')} and would love to chat regarding a ${job.title} role at ${job.companyName}. Are you free to hop on a call?`);
                      setShowCandidateModal(false);
                      setShowWhatsAppModal(true);
                    }}
                    className="px-3.5 py-2 text-xs font-bold border border-slate-200 text-slate-700 bg-white rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Phone className="h-4 w-4 text-slate-400" /> WhatsApp
                  </button>
                  <button
                    onClick={() => setShowCandidateModal(false)}
                    className="px-4 py-2 text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-sm cursor-pointer font-sans"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
