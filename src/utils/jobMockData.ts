import { Job, Candidate } from '../types';

export interface JobNote {
  id: string;
  jobId: string;
  author: string;
  timestamp: string;
  text: string;
}

export interface JobInterview {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  date: string;
  time: string;
  interviewer: string;
  round: string;
  status: 'Scheduled' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'Feedback Pending';
  feedback?: string;
}

export interface JobCommunication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  type: 'Email' | 'WhatsApp' | 'Call' | 'Interview' | 'Follow-up';
  date: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Completed';
  sentBy: string;
  subject: string;
  message: string;
  recipient: string;
}

export interface JobActivity {
  id: string;
  jobId: string;
  timestamp: string;
  type: string;
  description: string;
  user: string;
}

// Generates high-quality initial notes for the preloaded jobs
export function generateInitialNotes(jobs: Job[]): JobNote[] {
  const notesList: JobNote[] = [
    {
      id: 'n_1',
      jobId: 'j1', // Senior React Dev at Airbnb
      author: 'Sarah Jenkins (Recruiter)',
      timestamp: '2026-06-25 10:15 AM',
      text: 'Client emphasized they want someone who is obsessed with product engineering and pixel-perfection. Framer Motion experience is a huge plus.'
    },
    {
      id: 'n_2',
      jobId: 'j1',
      author: 'Michael Chang (Lead)',
      timestamp: '2026-06-26 02:30 PM',
      text: 'Emily Watson passed the screening session with flying colors. Very comfortable with Tailwind configuration and complex state managers.'
    },
    {
      id: 'n_3',
      jobId: 'j2', // Staff Full Stack at Stripe
      author: 'Sarah Jenkins (Recruiter)',
      timestamp: '2026-06-24 09:00 AM',
      text: 'Stripe Billing team needs deep understanding of PostgreSQL concurrency, locking mechanisms, and robust idempotent API design.'
    },
    {
      id: 'n_4',
      jobId: 'j3', // Product Designer at Linear
      author: 'Sophia Chen (Linear HR)',
      timestamp: '2026-06-25 04:00 PM',
      text: 'Tuomas Artman specifically requested to see high-fidelity HTML/CSS interactive mockups. Pure Figma layout designers are likely to be rejected.'
    }
  ];

  // Fallbacks for dynamically created jobs
  jobs.forEach(job => {
    if (!notesList.some(n => n.jobId === job.id)) {
      notesList.push({
        id: `n_dyn_${job.id}_1`,
        jobId: job.id,
        author: 'Sarah Jenkins (Recruiter)',
        timestamp: new Date().toLocaleString(),
        text: `Opening created for ${job.title} at ${job.companyName}. Recommended salary alignment: ${job.salary}. Seeking skills: ${job.requiredSkills.join(', ')}.`
      });
    }
  });

  return notesList;
}

// Generates initial scheduled interviews for the preloaded jobs
export function generateInitialInterviews(jobs: Job[], candidates: Candidate[]): JobInterview[] {
  const interviews: JobInterview[] = [
    {
      id: 'int_1',
      jobId: 'j1', // Airbnb
      candidateId: 'can1', // Emily Watson
      candidateName: 'Emily Watson',
      date: '2026-06-29',
      time: '11:00 AM',
      interviewer: 'Marc Lou (Frontend Architect)',
      round: 'Technical Architecture & Coding',
      status: 'Scheduled',
      feedback: 'Pending technical panel review'
    },
    {
      id: 'int_2',
      jobId: 'j1',
      candidateId: 'can2', // Marcus Brody
      candidateName: 'Marcus Brody',
      date: '2026-06-26',
      time: '03:00 PM',
      interviewer: 'Sophia Chen (Airbnb HR)',
      round: 'Initial Screening',
      status: 'Completed',
      feedback: 'Excellent communicator. Confirmed salary expectations of $175,000. Approved for Technical Panel.'
    },
    {
      id: 'int_3',
      jobId: 'j2', // Stripe Staff Eng
      candidateId: 'can3', // Sarah Connor
      candidateName: 'Sarah Connor',
      date: '2026-06-30',
      time: '10:00 AM',
      interviewer: 'David Miller (Director of Engineering)',
      round: 'System Design & Concurrency',
      status: 'Scheduled',
      feedback: 'Stripe payment flow scenarios.'
    }
  ];

  // Dynamically add matches if we need additional list elements
  return interviews;
}

// Generates initial communications logs
export function generateInitialCommunications(jobs: Job[], candidates: Candidate[]): JobCommunication[] {
  return [
    {
      id: 'comm_1',
      jobId: 'j1',
      candidateId: 'can1',
      candidateName: 'Emily Watson',
      type: 'Email',
      date: '2026-06-27 09:30 AM',
      status: 'Sent',
      sentBy: 'Sarah Jenkins',
      subject: 'Interview Schedule confirmation - Airbnb Senior React opening',
      message: 'Hi Emily,\n\nWe are excited to move you to the next step. Your technical panel interview has been scheduled with Marc Lou on Monday June 29 at 11:00 AM PST. Good luck!\n\nBest,\nSarah',
      recipient: 'emily.watson@gmail.com'
    },
    {
      id: 'comm_2',
      jobId: 'j1',
      candidateId: 'can1',
      candidateName: 'Emily Watson',
      type: 'WhatsApp',
      date: '2026-06-26 11:15 AM',
      status: 'Delivered',
      sentBy: 'Sarah Jenkins',
      subject: 'WhatsApp Alert',
      message: 'Hello Emily! This is Sarah from RecruitFlow. I just sent you the Calendar Invite link for Mondays architecture panel. Let me know if you received it.',
      recipient: '+1 (555) 123-9876'
    },
    {
      id: 'comm_3',
      jobId: 'j2',
      candidateId: 'can3',
      candidateName: 'Sarah Connor',
      type: 'Email',
      date: '2026-06-25 02:00 PM',
      status: 'Sent',
      sentBy: 'Michael Chang',
      subject: 'Stripe Staff Full-Stack Position - Initial Outreach',
      message: 'Dear Sarah,\n\nYour profile in distributed systems and transaction processing looks exemplary. Let us schedule a brief 15-minute call to discuss Stripes Billing team opening.\n\nWarm regards,\nMichael',
      recipient: 'sarah.connor@protonmail.com'
    }
  ];
}

// Generates initial chronological activities for the job positions
export function generateInitialActivities(jobs: Job[]): JobActivity[] {
  const activities: JobActivity[] = [
    {
      id: 'act_1',
      jobId: 'j1',
      timestamp: '2026-06-24 09:00 AM',
      type: 'Job Created',
      description: 'Senior React Developer job posting published to board.',
      user: 'Sarah Jenkins'
    },
    {
      id: 'act_2',
      jobId: 'j1',
      timestamp: '2026-06-25 11:00 AM',
      type: 'Candidate Added',
      description: 'Candidate Emily Watson submitted for client review.',
      user: 'Sarah Jenkins'
    },
    {
      id: 'act_3',
      jobId: 'j1',
      timestamp: '2026-06-26 03:00 PM',
      type: 'Interview Scheduled',
      description: 'Technical Architecture & Coding scheduled for Emily Watson with Marc Lou.',
      user: 'Michael Chang'
    },
    {
      id: 'act_4',
      jobId: 'j2',
      timestamp: '2026-06-24 02:15 PM',
      type: 'Job Created',
      description: 'Staff Full-Stack Engineer job posting published for Stripe Billing.',
      user: 'Sarah Jenkins'
    }
  ];

  // Dynamic additions
  jobs.forEach(job => {
    if (!activities.some(a => a.jobId === job.id)) {
      activities.push({
        id: `act_dyn_${job.id}_1`,
        jobId: job.id,
        timestamp: new Date().toLocaleString(),
        type: 'Job Created',
        description: `Job posting for ${job.title} at ${job.companyName} initialized.`,
        user: 'Sarah Jenkins'
      });
    }
  });

  return activities;
}
