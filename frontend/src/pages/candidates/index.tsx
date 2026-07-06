import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/context/AppContext';
import CandidatesView from '@/components/CandidatesView';
import { Candidate, Task, CommunicationLog } from '@/types';

export default function CandidatesPage() {
  const router = useRouter();
  const {
    candidates,
    jobs,
    communicationLogs,
    emailConfig,
    handleAddCandidate,
    handleUpdateCandidate,
    handleDeleteCandidate,
    handleAddTask,
    handleAddCommunicationLog,
    addActivityLog,
    showToast,
    setEmailComposeCandidate,
    setEmailComposePreselectedJob,
    setWhatsappComposeCandidate,
    setWhatsappComposePreselectedJob,
    setScheduleInterviewCandidate,
    setAddTaskCandidate,
    isLoading
  } = useApp();

  const [openResumeOnLoad, setOpenResumeOnLoad] = useState(false);

  useEffect(() => {
    if (router.query.upload === 'true') {
      setOpenResumeOnLoad(true);
      // clean URL query
      const { upload: _, ...rest } = router.query;
      router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query.upload, router.pathname]);

  const triggerAutoTask = (candidate: Candidate, triggerType: string) => {
    let taskTitle = '';
    let taskType: Task['type'] = 'Call';
    let priority: Task['priority'] = 'Medium';
    let daysFromNow = 1;

    if (triggerType === 'email_sent') {
      taskTitle = `Follow up with ${candidate.name} regarding sent email`;
      taskType = 'Email';
      priority = 'Medium';
      daysFromNow = 3;
    } else if (triggerType === 'whatsapp_sent') {
      taskTitle = `Check WhatsApp response from ${candidate.name}`;
      taskType = 'Follow Up';
      priority = 'Low';
      daysFromNow = 1;
    } else if (triggerType === 'interview_scheduled') {
      taskTitle = `Collect interview feedback for ${candidate.name}`;
      taskType = 'Interview';
      priority = 'High';
      daysFromNow = 1;
    } else if (triggerType === 'candidate_selected') {
      taskTitle = `Draft contract and offer sheet for ${candidate.name}`;
      taskType = 'Document';
      priority = 'High';
      daysFromNow = 3;
    } else if (triggerType === 'followup_added') {
      taskTitle = `Review screening or follow up notes: ${candidate.name}`;
      taskType = 'Call';
      priority = 'Medium';
      daysFromNow = 3;
    }

    const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newTask: Task = {
      id: 't_' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: taskType,
      title: taskTitle,
      candidateId: candidate.id,
      candidateName: candidate.name,
      priority,
      status: 'Pending',
      dueDate
    };

    handleAddTask(newTask);
    addActivityLog('Candidate', `Auto-created task: "${taskTitle}" due on ${dueDate}.`);
  };

  const handleOpenCSVImport = () => {
    router.push('/candidates?import=true&type=candidates');
  };

  return (
    <CandidatesView
      candidates={candidates}
      onAddCandidate={handleAddCandidate}
      onEditCandidate={handleUpdateCandidate}
      isLoading={isLoading}
      onDeleteCandidate={handleDeleteCandidate}
      openResumeUploadOnLoad={openResumeOnLoad}
      communicationLogs={communicationLogs}
      onAddCommunicationLog={handleAddCommunicationLog}
      emailConfig={emailConfig}
      jobs={jobs}
      onAddTask={handleAddTask}
      setNotifications={() => {}} // dummy updater
      showToast={showToast}
      triggerAutoTask={triggerAutoTask}
      onComposeEmail={(c, job) => {
        setEmailComposeCandidate(c);
        setEmailComposePreselectedJob(job || null);
      }}
      onComposeWhatsApp={(c, job) => {
        setWhatsappComposeCandidate(c);
        setWhatsappComposePreselectedJob(job || null);
      }}
      onScheduleInterview={(c) => setScheduleInterviewCandidate(c)}
      onAddTaskForCandidate={(c) => setAddTaskCandidate(c)}
      onOpenCSVImport={handleOpenCSVImport}
    />
  );
}
