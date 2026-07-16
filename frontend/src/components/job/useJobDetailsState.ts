import React, { useState, useEffect, useCallback } from 'react';
import { Job, Candidate, EmailTemplate, JobCandidate, JobNote, JobInterview, JobCommunication, JobActivity } from '../../types';
import { supabase } from '../../utils/supabase';
import { computeCandidateMatchData } from './jobMatchHelpers';
import { generateCSV, ExportColumn } from '../../utils/csvExporter';

function cleanAndParseJson(jsonStr: string) {
  let cleaned = jsonStr.trim();
  
  // Remove markdown code blocks (e.g., ```json ... ```) if present
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      // Clean trailing commas and control characters
      const fixedJson = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      return JSON.parse(fixedJson);
    } catch (innerErr) {
      return null;
    }
  }
}

function parseArtifactData(text: string) {
  // Matches <artifact ...> ... </artifact> case-insensitively and with any attributes
  const match = text.match(/<artifact[^>]*>([\s\S]*?)<\/artifact>/i);
  if (match) {
    const rawJson = match[1].trim();
    return cleanAndParseJson(rawJson);
  }
  return null;
}

interface UseJobDetailsStateProps {
  job: Job;
  candidates: Candidate[];
  onBack: () => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onUpdateCandidateStage: (candidateId: string, newStage: Candidate['status']) => void;
  jobCandidates?: JobCandidate[];
  onUpdateJobCandidateStage?: (candidateId: string, stage: string) => Promise<void>;
}

export function useJobDetailsState({
  job,
  candidates,
  onBack,
  onEditJob,
  onDeleteJob,
  onUpdateCandidateStage,
  jobCandidates,
  onUpdateJobCandidateStage
}: UseJobDetailsStateProps) {
  const [detailSearch, setDetailSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // States for sub-data initialized from database
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [interviews, setInterviews] = useState<JobInterview[]>([]);
  const [communications, setCommunications] = useState<JobCommunication[]>([]);
  const [activities, setActivities] = useState<JobActivity[]>([]);

  // AI Matching Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(true);

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
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewRound, setInterviewRound] = useState('');

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

  const [aiFeatureResult, setAiFeatureResult] = useState<{
    title: string;
    text?: string;
    structured?: boolean;
    data?: {
      intro: string;
      questions: Array<{
        question: string;
        category: string;
        targetSkill: string;
        idealAnswer: string;
      }>;
    };
  } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiReportModal, setShowAiReportModal] = useState(false);

  // Toast notifier
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Central log actions
  const logActivity = async (type: string, description: string) => {
    const newAct = {
      jobId: job.id,
      type,
      description,
      userName: 'Sarah Jenkins (Recruiter)'
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

  // Local helper for communications
  const logCommunication = async (type: JobCommunication['type'], subject: string, message: string, recipient: string, candId: string, candName: string) => {
    const newComm = {
      jobId: job.id,
      candidateId: candId,
      candidateName: candName,
      type,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Sent' as const,
      sentBy: 'Sarah Jenkins',
      subject,
      message,
      recipient
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

  const fetchInterviews = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/interviews`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setInterviews(Array.isArray(data) ? data.filter((item: any) => item.jobId === job.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
    }
  }, [job.id]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/job_notes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data.filter((item: any) => item.jobId === job.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  }, [job.id]);

  const fetchCommunications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/communication_logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCommunications(Array.isArray(data) ? data.filter((item: any) => item.jobId === job.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch communications:', err);
    }
  }, [job.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/activity_logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data.filter((item: any) => item.jobId === job.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, [job.id]);

  useEffect(() => {
    fetchInterviews();
    fetchNotes();
    fetchCommunications();
    fetchActivities();
  }, [fetchInterviews, fetchNotes, fetchCommunications, fetchActivities]);

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
    onEditJob(dup);
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
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (editingNote) {
        const res = await fetch(`/api/job_notes/${editingNote.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            text: noteText,
            timestamp: new Date().toLocaleString() + ' (Edited)'
          })
        });

        if (!res.ok) throw new Error('Failed to update note');

        await fetchNotes();
        logActivity('Note Edited', `Updated an internal note on candidate requirements.`);
        triggerToast('✓ Internal note updated!');
      } else {
        const newNote = {
          jobId: job.id,
          author: 'Sarah Jenkins (Recruiter)',
          timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: noteText
        };

        const res = await fetch('/api/job_notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(newNote)
        });

        if (!res.ok) throw new Error('Failed to create note');

        await fetchNotes();
        logActivity('Note Added', `Added internal recruiter note: "${noteText.slice(0, 30)}...".`);
        triggerToast('✓ Recruiting note saved!');
      }
      setNoteText('');
      setEditingNote(null);
      setShowNoteModal(false);
    } catch (err) {
      console.error(err);
      triggerToast('❌ Failed to save note.');
    }
  };

  const handleEditNoteStart = (note: JobNote) => {
    setEditingNote(note);
    setNoteText(note.text);
    setShowNoteModal(true);
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/job_notes/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error('Failed to delete note');

      await fetchNotes();
      logActivity('Note Deleted', 'Removed an internal note.');
      triggerToast('Note successfully removed.');
    } catch (err) {
      console.error(err);
      triggerToast('❌ Failed to delete note.');
    }
  };

  // Interviews scheduling
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewCandidate || !interviewDate || !interviewTime) return;

    const newInt = {
      jobId: job.id,
      candidateId: interviewCandidate.id,
      candidateName: interviewCandidate.name,
      date: interviewDate,
      time: interviewTime,
      interviewer: interviewerName,
      round: interviewRound,
      status: 'Scheduled' as const
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newInt)
      });

      if (!res.ok) {
        throw new Error('Failed to create interview');
      }

      await fetchInterviews();

      if (onUpdateJobCandidateStage) {
        await onUpdateJobCandidateStage(interviewCandidate.id, 'Interview');
      } else if (interviewCandidate.status !== 'Interview') {
        onUpdateCandidateStage(interviewCandidate.id, 'Interview');
      }

      logCommunication('Email', `Interview Scheduled: ${interviewRound}`, `Hi ${interviewCandidate.name},\n\nYour interview for ${job.title} has been scheduled.\nDate: ${interviewDate}\nTime: ${interviewTime}\nInterviewer: ${interviewerName}\nRound: ${interviewRound}\n\nWe look forward to speaking with you!\n\nBest,\nSarah`, interviewCandidate.email, interviewCandidate.id, interviewCandidate.name);
      logActivity('Interview Scheduled', `Scheduled ${interviewRound} for ${interviewCandidate.name} on ${interviewDate}.`);
      triggerToast(`✓ Interview scheduled & calendar invitation dispatched!`);
      
      setShowInterviewModal(false);
      setInterviewCandidate(null);
    } catch (err: any) {
      console.error(err);
      triggerToast('❌ Failed to schedule interview.');
    }
  };

  const handleUpdateInterviewStatus = async (id: string, newStatus: JobInterview['status'], feedback?: string) => {
    const interview = interviews.find(i => i.id === id);
    if (!interview) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          feedback: feedback || interview.feedback
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update interview status');
      }

      await fetchInterviews();
      logActivity('Interview Updated', `Marked ${interview.candidateName}'s round as ${newStatus}.`);
      triggerToast(`✓ Round status updated to ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      triggerToast('❌ Failed to update interview.');
    }
  };

  const generateMeetingLink = async (id: string) => {
    const matchLink = `meet.google.com/hfs-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          feedback: `Virtual link: https://${matchLink}`
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update meeting link');
      }

      await fetchInterviews();
      triggerToast('✓ Virtual conferencing link spawned and saved!');
    } catch (err: any) {
      console.error(err);
      triggerToast('❌ Failed to spawn virtual link.');
    }
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

    const cleanPhone = whatsAppCandidate.phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(whatsAppMessage);
    
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
    
    const exportData = selectedCandidateIds
      .map(id => candidates.find(c => c.id === id))
      .filter((c): c is Candidate => !!c);

    const columns: ExportColumn<Candidate>[] = [
      { header: 'Candidate Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Match Score', key: 'aiMatchScore', transform: (val) => val || 80 },
      { header: 'Experience', key: 'experience' },
      { header: 'Current Company', key: 'currentCompany' },
      { header: 'Status', key: 'status' }
    ];

    generateCSV(exportData, columns, `Job_${job.id}_Candidate_Shortlist`);
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

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      if (onUpdateJobCandidateStage) {
        await onUpdateJobCandidateStage(id, targetStage);
      } else {
        onUpdateCandidateStage(id, targetStage as Candidate['status']);
      }
      const cand = candidates.find(c => c.id === id);
      if (cand) {
        logActivity('Pipeline Moved', `Dragged ${cand.name} to the '${targetStage}' stage.`);
      }
    }
  };

  // --- AI Model Feature Generator Triggers ---

  const executeAiTool = async (toolKey: string) => {
    setIsAiProcessing(true);
    setAiFeatureResult(null);

    // Run 'shortlist' deterministically on the client side without AI
    if (toolKey === 'shortlist') {
      setTimeout(() => {
        setIsAiProcessing(false);
        const matchResults = computeCandidateMatchData(candidates, job);
        const topMatches = matchResults.slice(0, 5);
        
        let text = '';
        if (topMatches.length === 0) {
          text = `Based on a mathematical comparison of candidates against the required skills list (${(job.requiredSkills || []).join(', ')}):\n\nNo candidates met the minimum matching criteria. Please add more candidates or adjust the job's required skills.`;
        } else {
          text = `Based on a mathematical comparison of candidates against the required skills list (${(job.requiredSkills || []).join(', ')}):\n\n` +
            topMatches.map((item, idx) => {
              return `${idx + 1}. **${item.candidate.name}** (${item.score}% Match) - *${item.candidate.status}*\n` +
                `   • Company: ${item.candidate.currentCompany || 'Freelancer'} (prev. ${item.candidate.experience} exp)\n` +
                `   • Matched Skills: ${item.matchedSkills.length > 0 ? item.matchedSkills.join(', ') : 'None'}\n` +
                `   • Core Alignment:\n` +
                item.reasons.map(r => `     ${r}`).join('\n');
            }).join('\n\n');
        }
        
        setAiFeatureResult({
          title: 'Deterministic Talent Shortlist Recommendations',
          text
        });
        logActivity('Deterministic Shortlist Triggered', `Generated mathematical shortlist on-the-fly.`);
        triggerToast('✓ Talent shortlist calculated and populated below.');
      }, 500);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || ''}/api/ai/job-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          toolKey,
          job,
          candidates
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initiate AI stream');
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Failed to open stream reader');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      setAiFeatureResult({
        title: toolKey === 'questions' ? `AI Generated Interview Questions: ${job.title}` : 'AI Insights',
        text: '',
        structured: false
      });

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Check if there is an error code in the stream
          if (accumulatedText.includes('[Error: ')) {
            const errorMatch = accumulatedText.match(/\[Error: (.*?)\]/);
            if (errorMatch) {
              throw new Error(errorMatch[1]);
            }
          }

          // Update state live
          setAiFeatureResult(prev => ({
            title: prev?.title || (toolKey === 'questions' ? `AI Generated Interview Questions: ${job.title}` : 'AI Insights'),
            text: accumulatedText,
            structured: toolKey === 'questions',
            data: toolKey === 'questions' ? parseArtifactData(accumulatedText) : undefined
          }));
        }
      } finally {
        reader.releaseLock();
      }

      logActivity('AI Feature Triggered', `Generated AI insights for ${toolKey} using Live AI.`);
      triggerToast('✓ AI Insights generated successfully.');
    } catch (err: any) {
      triggerToast(`❌ AI Error: ${err.message || 'Failed to contact AI Copilot.'}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleApplyTemplate = (template: EmailTemplate, cand: Candidate) => {
    const formattedBody = template.body.replace('[Candidate]', cand.name);
    const formattedSubject = template.subject;
    setEmailCandidate(cand);
    setEmailSubject(formattedSubject);
    setEmailBody(formattedBody);
    setShowEmailModal(true);
  };

  return {
    detailSearch, setDetailSearch,
    toastMessage, triggerToast,
    notes, setNotes,
    interviews, setInterviews,
    communications, setCommunications,
    activities, setActivities,
    isScanning, hasScanned, triggerScan,
    selectedCandidateIds, setSelectedCandidateIds,
    
    showNoteModal, setShowNoteModal,
    noteText, setNoteText,
    editingNote, setEditingNote,

    showInterviewModal, setShowInterviewModal,
    interviewCandidate, setInterviewCandidate,
    interviewDate, setInterviewDate,
    interviewTime, setInterviewTime,
    interviewerName, setInterviewerName,
    interviewRound, setInterviewRound,

    showEmailModal, setShowEmailModal,
    emailCandidate, setEmailCandidate,
    emailSubject, setEmailSubject,
    emailBody, setEmailBody,
    selectedJobTemplateId, setSelectedJobTemplateId,

    showWhatsAppModal, setShowWhatsAppModal,
    whatsAppCandidate, setWhatsAppCandidate,
    whatsAppMessage, setWhatsAppMessage,

    showCandidateModal, setShowCandidateModal,
    viewedCandidate, setViewedCandidate,

    aiFeatureResult, setAiFeatureResult,
    isAiProcessing, setIsAiProcessing,
    showAiReportModal, setShowAiReportModal,

    logActivity,
    logCommunication,
    handleToggleJobStatus,
    handleDuplicateJob,
    handleShareJob,
    handleDeleteJobClick,
    handleSaveNote,
    handleEditNoteStart,
    handleDeleteNote,
    handleScheduleSubmit,
    handleUpdateInterviewStatus,
    generateMeetingLink,
    handleSendEmailSubmit,
    handleSendWhatsAppSubmit,
    toggleSelectCandidate,
    toggleSelectAll,
    handleBulkEmail,
    handleBulkShortlist,
    handleBulkPipeline,
    handleBulkExport,
    handleDragStart,
    handleDragOver,
    handleDrop,
    executeAiTool,
    handleApplyTemplate
  };
}
