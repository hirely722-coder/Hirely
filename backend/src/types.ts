export interface Company {
  id: string;
  name: string;
  contactPerson: string;
  openJobs: number;
  status: 'Active' | 'Inactive';
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  recContact: string;
  industry?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  foundedYear?: string;
  tier?: 'Tier 1' | 'Tier 2' | 'Tier 3';
  linkedInUrl?: string;
  importId?: string;
}

export interface Job {
  id: string;
  title: string;
  companyId: string | null;
  companyName: string | null;
  experience: string;
  location: string;
  applicationsCount: number;
  status: 'Open' | 'Closed';
  description: string;
  requiredSkills: string[];
  salary: string;
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  department?: string;
  urgency?: 'Urgent' | 'High' | 'Medium' | 'Low';
  recruiterName?: string;
  importId?: string;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  experience: string;
  skills: string[];
  currentCompany: string;
  status: 'Pool' | 'Applied' | 'Screening' | 'Shortlisted' | 'Interview' | 'Selected' | 'Offer Sent' | 'Joined';
  aiMatchScore: number;
  resumeText: string;
  resumeFileName?: string;
  education: string;
  address: string;
  notes: string;
  appliedDate: string;
  designation?: string;
  gender?: 'Male' | 'Female' | 'Other';
  city?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  importId?: string;
  customFields?: Record<string, any>;
}

export interface JobCandidate {
  id: string;
  jobId: string;
  candidateId: string;
  stage: 'Applied' | 'Screening' | 'Shortlisted' | 'Interview' | 'Selected' | 'Offer Sent' | 'Joined';
  addedDate: string;
  userId: string;
  candidate?: Candidate;
  totalAgencyFee?: number;
  amountPaid?: number;
  paymentDueDate?: string;
  paymentNotes?: string;
  paymentStatus?: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
}

export interface Task {
  id: string;
  type: 'Call' | 'Email' | 'Follow Up' | 'Interview' | 'Document';
  title: string;
  candidateId?: string;
  candidateName?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Completed';
  dueDate: string;
  description?: string;
  notes?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  importId?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  lastUpdated: string;
  variables: string[];
  audience?: 'Candidate' | 'Company';
  importId?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  user: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Recruiter' | 'HR Executive' | 'Viewer';
  status: 'Active' | 'Pending' | 'Disabled';
  lastLogin: string;
  department?: string;
  message?: string;
}

export interface EmailConfig {
  provider: 'Gmail' | 'Outlook' | 'SMTP' | 'Microsoft 365';
  smtpHost?: string;
  port?: string;
  username?: string;
  password?: string;
  encryption?: 'None' | 'SSL' | 'TLS';
  isConnected?: boolean;
  resumeNotificationEnabled?: boolean;
  resumeNotificationEmail?: string;
  telegramChatId?: string | null;
  telegramToken?: string | null;
  telegramNotificationEnabled?: boolean;
}

export interface CommunicationLog {
  id: string;
  candidateId: string;
  type: 'Email' | 'WhatsApp' | 'Call' | 'Interview' | 'Follow-up';
  date: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Completed';
  sentBy: string;
  subject: string;
  message: string;
}

export interface CustomFieldDefinition {
  id: string;
  entityType: 'candidate' | 'company' | 'job';
  name: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  options?: string[];
  isRequired: boolean;
}
