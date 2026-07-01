import { Company, Job, Candidate } from '../types';

export interface Contact {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface CompanyDocument {
  id: string;
  title: string;
  type: 'JD' | 'Agreement' | 'NDA' | 'Invoice' | 'Offer';
  dateAdded: string;
  size: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface CommunicationLog {
  id: string;
  type: 'Email' | 'WhatsApp' | 'Call' | 'Meeting' | 'Submission';
  status: 'Sent' | 'Delivered' | 'Completed' | 'Failed';
  sentBy: string;
  recipient: string;
  subject: string;
  date: string;
  body?: string;
}

export interface CompanyActivity {
  id: string;
  type: string;
  description: string;
  date: string;
  user: string;
}

// AI Candidate Matching Algorithm based on Skills
export const getAIMatchScore = (candidate: Candidate, job: Job): number => {
  if (!job.requiredSkills || job.requiredSkills.length === 0) return 75;
  const candSkills = (candidate.skills || []).map(s => s.toLowerCase());
  const jobSkills = job.requiredSkills.map(s => s.toLowerCase());
  const matches = candSkills.filter(s => jobSkills.some(js => js.includes(s) || s.includes(js)));
  const percentage = Math.round((matches.length / jobSkills.length) * 40) + 55; // Base 55%, up to 95%
  return Math.min(percentage, 98);
};

export const generateInitialContacts = (company: Company): Contact[] => {
  return [
    {
      id: `con_1_${company.id}`,
      name: company.contactPerson || 'Sarah Connor',
      designation: 'VP of Engineering',
      department: 'Engineering',
      email: company.email || `${company.name.toLowerCase().replace(/\s/g, '')}@example.com`,
      phone: company.phone || '+1 (555) 019-2831',
      isPrimary: true
    },
    {
      id: `con_2_${company.id}`,
      name: 'Jane Miller',
      designation: 'Director of Talent Acquisition',
      department: 'Human Resources',
      email: `jane.m@${company.name.toLowerCase().replace(/\s/g, '')}.com`,
      phone: '+1 (555) 012-9844',
      isPrimary: false
    }
  ];
};

export const generateInitialDocuments = (company: Company): CompanyDocument[] => {
  return [
    {
      id: `doc_1_${company.id}`,
      title: `${company.name.replace(/\s/g, '_')}_Staffing_Agreement_Executed.pdf`,
      type: 'Agreement',
      dateAdded: '2026-06-15',
      size: '1.2 MB'
    },
    {
      id: `doc_2_${company.id}`,
      title: `Mutual_NDA_Hirly_Recruitment.pdf`,
      type: 'NDA',
      dateAdded: '2026-06-10',
      size: '420 KB'
    },
    {
      id: `doc_3_${company.id}`,
      title: `${company.name.replace(/\s/g, '_')}_Hiring_Forecast_Q3.docx`,
      type: 'JD',
      dateAdded: '2026-06-22',
      size: '2.4 MB'
    }
  ];
};

export const generateInitialNotes = (company: Company): Note[] => {
  return [
    {
      id: `note_1_${company.id}`,
      content: 'Hiring is urgent for open positions. The hiring manager is traveling in late July, so they want to complete all panel interviews before July 20th.',
      author: 'Sarah Jenkins',
      timestamp: '2026-06-25 10:14 AM'
    },
    {
      id: `note_2_${company.id}`,
      content: 'Base salary is negotiable up to $160,000 + equity for stellar candidates. They are willing to offer relocation assistance for the right talent.',
      author: 'Sarah Jenkins',
      timestamp: '2026-06-20 02:30 PM'
    },
    {
      id: `note_3_${company.id}`,
      content: 'Prefers candidates with strong background in Next.js, state management (Zustand/Redux), and custom layout animations.',
      author: 'Sarah Jenkins',
      timestamp: '2026-06-18 09:45 AM'
    }
  ];
};

export const generateInitialCommunications = (company: Company): CommunicationLog[] => {
  return [
    {
      id: `comm_1_${company.id}`,
      type: 'Email',
      status: 'Sent',
      sentBy: 'Sarah Jenkins',
      recipient: company.contactPerson,
      subject: `Introduction & Partnership Kickoff - ${company.name}`,
      date: '2026-06-15 11:00 AM',
      body: `Hi ${company.contactPerson},\n\nIt was a pleasure speaking with you today! We are excited to partner with ${company.name} and help build your team.\n\nBest,\nSarah`
    },
    {
      id: `comm_2_${company.id}`,
      type: 'Call',
      status: 'Completed',
      sentBy: 'Sarah Jenkins',
      recipient: company.contactPerson,
      subject: 'Reviewing job specs & alignment criteria',
      date: '2026-06-18 04:15 PM'
    },
    {
      id: `comm_3_${company.id}`,
      type: 'WhatsApp',
      status: 'Delivered',
      sentBy: 'Sarah Jenkins',
      recipient: company.contactPerson,
      subject: 'Confirming JD details',
      date: '2026-06-22 09:30 AM',
      body: 'Hi, thanks for sending over the updated requirements. We will kick off sourcing right away!'
    }
  ];
};

export const generateInitialActivities = (company: Company): CompanyActivity[] => {
  return [
    {
      id: `act_1_${company.id}`,
      type: 'Company Created',
      description: `Partnership profile initialized for ${company.name}.`,
      date: '2026-06-15 09:00 AM',
      user: 'Sarah Jenkins'
    },
    {
      id: `act_2_${company.id}`,
      type: 'Job Added',
      description: `Registered open position: Senior Frontend Engineer.`,
      date: '2026-06-16 02:30 PM',
      user: 'Sarah Jenkins'
    },
    {
      id: `act_3_${company.id}`,
      type: 'Candidate Submitted',
      description: `Submitted Emily Watson (AI Match Score: 95%) to ${company.name} HR team.`,
      date: '2026-06-22 11:45 AM',
      user: 'Sarah Jenkins'
    }
  ];
};
