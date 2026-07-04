import { Company, Job, Candidate, Task, EmailTemplate, ActivityLog, TeamMember, CommunicationLog } from './types';

export const initialCompanies: Company[] = [
  {
    id: 'c1',
    name: 'Stripe',
    contactPerson: 'David Miller',
    openJobs: 2,
    status: 'Active',
    email: 'david.miller@stripe.com',
    phone: '+1 (555) 234-5678',
    website: 'https://stripe.com',
    address: '510 Townsend St, San Francisco, CA 94103',
    notes: 'Key partner for developer operations. Excellent onboarding and responsive talent coordinators.',
    recContact: 'Sarah Jenkins'
  },
  {
    id: 'c2',
    name: 'Airbnb',
    contactPerson: 'Sophia Chen',
    openJobs: 1,
    status: 'Active',
    email: 'sophia.chen@airbnb.com',
    phone: '+1 (555) 876-5432',
    website: 'https://airbnb.com',
    address: '888 Brannan St, San Francisco, CA 94103',
    notes: 'Frequently looking for high-quality frontend engineers with strong design sensibilities.',
    recContact: 'Michael Chang'
  },
  {
    id: 'c3',
    name: 'Linear',
    contactPerson: 'Tuomas Artman',
    openJobs: 1,
    status: 'Active',
    email: 'tuomas@linear.app',
    phone: '+1 (555) 901-2345',
    website: 'https://linear.app',
    address: 'Remote / San Francisco',
    notes: 'Demands extreme attention to product craft, speed, and clean code. Keep bars exceptionally high.',
    recContact: 'Sarah Jenkins'
  },
  {
    id: 'c4',
    name: 'Vercel',
    contactPerson: 'Guillermo Rauch',
    openJobs: 0,
    status: 'Active',
    email: 'guillermo@vercel.com',
    phone: '+1 (555) 345-6789',
    website: 'https://vercel.com',
    address: 'Remote / New York',
    notes: 'Premium developer experience team. Candidates must excel in React ecosystem and performance.',
    recContact: 'Sarah Jenkins'
  },
  {
    id: 'c5',
    name: 'Retool',
    contactPerson: 'Alex Montgomery',
    openJobs: 1,
    status: 'Active',
    email: 'alex.m@retool.com',
    phone: '+1 (555) 456-7890',
    website: 'https://retool.com',
    address: '1550 Bryant St, San Francisco, CA 94103',
    notes: 'Fast-paced environment. Strong full-stack engineers preferred.',
    recContact: 'Michael Chang'
  }
];

export const initialJobs: Job[] = [
  {
    id: 'j1',
    title: 'Senior React Developer',
    companyId: 'c2',
    companyName: 'Airbnb',
    experience: '5+ Years',
    location: 'San Francisco, CA / Hybrid',
    applicationsCount: 4,
    status: 'Open',
    description: 'We are looking for a Senior React Developer to join our design systems team. You will build highly responsive, fully accessible components used by millions of users worldwide.',
    requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'GraphQL'],
    salary: '$160,000 - $190,000'
  },
  {
    id: 'j2',
    title: 'Staff Full-Stack Engineer',
    companyId: 'c1',
    companyName: 'Stripe',
    experience: '8+ Years',
    location: 'San Francisco, CA',
    applicationsCount: 3,
    status: 'Open',
    description: 'Join the Billing engineering team to design, architect, and scale payment infrastructure handling billions of requests daily. Deep knowledge of API design and distributed databases is a must.',
    requiredSkills: ['Ruby on Rails', 'Go', 'TypeScript', 'PostgreSQL', 'System Design'],
    salary: '$210,000 - $240,000'
  },
  {
    id: 'j3',
    title: 'Product Designer',
    companyId: 'c3',
    companyName: 'Linear',
    experience: '4+ Years',
    location: 'Remote (US/Europe)',
    applicationsCount: 2,
    status: 'Open',
    description: 'We are looking for a Product Designer with a heavy interest in engineering or high-fidelity prototyping. You will own entire feature cycles from concept, visuals, to interactive implementation.',
    requiredSkills: ['Figma', 'Prototyping', 'UI/UX', 'HTML/CSS', 'Product Strategy'],
    salary: '$140,000 - $170,000'
  },
  {
    id: 'j4',
    title: 'Senior Infrastructure Engineer',
    companyId: 'c1',
    companyName: 'Stripe',
    experience: '6+ Years',
    location: 'Remote (US)',
    applicationsCount: 2,
    status: 'Open',
    description: 'Help Stripe scale and maintain our Kubernetes clusters and multi-region AWS cloud infrastructure. Strong automation focus and background in Linux systems is required.',
    requiredSkills: ['AWS', 'Kubernetes', 'Terraform', 'Go', 'Docker'],
    salary: '$180,000 - $210,000'
  },
  {
    id: 'j5',
    title: 'Frontend Lead',
    companyId: 'c5',
    companyName: 'Retool',
    experience: '6+ Years',
    location: 'San Francisco, CA',
    applicationsCount: 1,
    status: 'Open',
    description: 'Own the user-facing editor experience. Implement high-performance canvas systems, drag-and-drop features, and custom browser sandbox layouts.',
    requiredSkills: ['React', 'TypeScript', 'Web Workers', 'Performance Optimization'],
    salary: '$175,000 - $205,000'
  }
];

export const initialCandidates: Candidate[] = [
  {
    id: 'can1',
    name: 'Emily Watson',
    phone: '+1 (555) 123-9876',
    email: 'emily.watson@gmail.com',
    experience: '6 Years',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Redux', 'Framer Motion'],
    currentCompany: 'Vercel',
    status: 'Interview',
    aiMatchScore: 95,
    resumeText: 'Emily Watson - Senior Frontend Engineer with 6 years of experience building modern React and Tailwind interfaces at Vercel. Strong focus on design systems, accessibility, and high performance.',
    education: 'B.S. in Computer Science - UC Berkeley',
    address: 'Oakland, CA',
    notes: 'Outstanding technical assessment. Very articulate during screening. Strong match for Airbnb design systems role.',
    appliedDate: '2026-06-15',
    designation: 'Senior Frontend Engineer',
    gender: 'Female',
    city: 'Oakland',
    expectedSalary: '$150,000',
    noticePeriod: '15 days'
  },
  {
    id: 'can2',
    name: 'Marcus Vance',
    phone: '+1 (555) 456-1122',
    email: 'm.vance@techcorp.io',
    experience: '9 Years',
    skills: ['Ruby on Rails', 'Go', 'PostgreSQL', 'System Design', 'Redis'],
    currentCompany: 'Coinbase',
    status: 'Screening',
    aiMatchScore: 88,
    resumeText: 'Marcus Vance - Staff Software Engineer. 9 years of background in fintech and backend scalability. Lead scaling efforts at Coinbase for transactional databases using Go and Ruby.',
    education: 'M.S. in Software Engineering - Stanford',
    address: 'Palo Alto, CA',
    notes: 'Solid backend engineer. Interested in Stripe Billing systems. Prefers hybrid or in-office.',
    appliedDate: '2026-06-18',
    designation: 'Staff Backend Engineer',
    gender: 'Male',
    city: 'Palo Alto',
    expectedSalary: '$220,000',
    noticePeriod: '30 days'
  },
  {
    id: 'can3',
    name: 'Clara Oswald',
    phone: '+1 (555) 789-3344',
    email: 'clara.o@outlook.com',
    experience: '4 Years',
    skills: ['Figma', 'UI/UX', 'Prototyping', 'HTML/CSS', 'React'],
    currentCompany: 'Framer',
    status: 'Selected',
    aiMatchScore: 92,
    resumeText: 'Clara Oswald - Product Designer with deep visual design skills and frontend coding knowledge. Formerly at Framer building visual playground components.',
    education: 'B.A. in Graphic Design - Rhode Island School of Design (RISD)',
    address: 'San Francisco, CA',
    notes: 'Exquisite portfolio. Fully understands Linear-grade product visual excellence. Selected for final offer draft.',
    appliedDate: '2026-06-12',
    designation: 'Product Designer',
    gender: 'Female',
    city: 'San Francisco',
    expectedSalary: '$140,000',
    noticePeriod: '15 days'
  },
  {
    id: 'can4',
    name: 'Devin Patel',
    phone: '+1 (555) 234-9988',
    email: 'devin.patel@devin.codes',
    experience: '5 Years',
    skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'Kubernetes'],
    currentCompany: 'Retool',
    status: 'Applied',
    aiMatchScore: 78,
    resumeText: 'Devin Patel - Full Stack Developer. Experienced with Node.js and React dashboards. Managing containerized microservices on AWS.',
    education: 'B.S. in Computer Engineering - UT Austin',
    address: 'Austin, TX',
    notes: 'Good generalist. Seeking fully remote work. Evaluating skill fit.',
    appliedDate: '2026-06-25',
    designation: 'Full Stack Engineer',
    gender: 'Male',
    city: 'Austin',
    expectedSalary: '$130,000',
    noticePeriod: '30 days'
  },
  {
    id: 'can5',
    name: 'Sarah Connor',
    phone: '+1 (555) 999-0011',
    email: 's.connor@cyberdyne.net',
    experience: '7 Years',
    skills: ['AWS', 'Kubernetes', 'Terraform', 'Python', 'Go', 'Docker'],
    currentCompany: 'HashiCorp',
    status: 'Interview',
    aiMatchScore: 91,
    resumeText: 'Sarah Connor - DevOps and Infrastructure Specialist. 7 years automating multi-cloud environments. Creator of several open-source Terraform provisioners.',
    education: 'B.S. in Information Systems - Georgia Tech',
    address: 'Atlanta, GA (Remote)',
    notes: 'Top tier platform engineer. Scheduled for AWS/Kubernetes system deep-dive session today.',
    appliedDate: '2026-06-20',
    designation: 'DevOps Lead',
    gender: 'Female',
    city: 'Atlanta',
    expectedSalary: '$180,000',
    noticePeriod: '15 days'
  },
  {
    id: 'can6',
    name: 'Alex Rivera',
    phone: '+1 (555) 303-4040',
    email: 'alex.rivera@hey.com',
    experience: '1 Year',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
    currentCompany: 'Internship',
    status: 'Applied',
    aiMatchScore: 45,
    resumeText: 'Alex Rivera - Junior Developer. Passionate about building layouts with Tailwind. Seeking entry level roles.',
    education: 'Bootcamp Graduate - General Assembly',
    address: 'San Jose, CA',
    notes: 'Needs mentorship. Potential candidate for future junior/intern pipelines.',
    appliedDate: '2026-06-26',
    designation: 'Junior Developer',
    gender: 'Other',
    city: 'San Jose',
    expectedSalary: '$85,000',
    noticePeriod: '30 days'
  }
];

export const initialTasks: Task[] = [
  {
    id: 't1',
    type: 'Interview',
    title: 'AWS Deep-Dive with Sarah Connor',
    candidateId: 'can5',
    candidateName: 'Sarah Connor',
    priority: 'High',
    status: 'Pending',
    dueDate: '2026-06-28',
    description: 'Verify cloud infrastructure & AWS scaling limits. Focus on ECS cluster autoscaling, custom VPC setups, IAM policies, and Terraform state patterns.',
    notes: 'Sarah has 4+ years on AWS. Specifically ask about her experience migrating databases under zero-downtime requirements.',
    subtasks: [
      { id: 'st1_1', title: 'Review AWS migration essay on her GitHub', completed: true },
      { id: 'st1_2', title: 'Formulate questions regarding database replication limits', completed: false },
      { id: 'st1_3', title: 'Share Google Meet bridge credentials', completed: false }
    ]
  },
  {
    id: 't2',
    type: 'Call',
    title: 'Screening Call: Devin Patel',
    candidateId: 'can4',
    candidateName: 'Devin Patel',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-06-29',
    description: 'Verify background, general salary expectations, and potential alignment with the financial software squad.',
    notes: 'Make sure to confirm if Devin is open to a hybrid work pattern (3 days on-site).',
    subtasks: [
      { id: 'st2_1', title: 'Confirm resume matches public LinkedIn history', completed: true },
      { id: 'st2_2', title: 'Verify he has the standard accounting qualifications', completed: true },
      { id: 'st2_3', title: 'Discuss salary benchmark and notice period options', completed: false }
    ]
  },
  {
    id: 't3',
    type: 'Follow Up',
    title: 'Offer Package Draft for Clara Oswald',
    candidateId: 'can3',
    candidateName: 'Clara Oswald',
    priority: 'High',
    status: 'Pending',
    dueDate: '2026-06-28',
    description: 'Drafting contract proposals following Clara passing all tech assessments with flying colors.',
    notes: 'Check relocations package allowances and sign-on bonus caps approved by Finance.',
    subtasks: [
      { id: 'st3_1', title: 'Review relocation assistance package limits', completed: false },
      { id: 'st3_2', title: 'Send offer checklist to VP of Engineering for signoff', completed: false },
      { id: 'st3_3', title: 'Draft the formal DocuSign envelope packet', completed: false }
    ]
  },
  {
    id: 't4',
    type: 'Email',
    title: 'Send feedback mail to Alex Rivera',
    candidateId: 'can6',
    candidateName: 'Alex Rivera',
    priority: 'Low',
    status: 'Pending',
    dueDate: '2026-06-30',
    description: 'Send constructive feedback to Alex Rivera regarding their styling assignment. Recommend resources for React state management.',
    notes: 'Alex showed great UI focus, but has room to improve with API error handling and clean data states.',
    subtasks: [
      { id: 'st4_1', title: 'Compile design highlights and coding challenge feedback notes', completed: true },
      { id: 'st4_2', title: 'Send template with learning resource guides', completed: false }
    ]
  },
  {
    id: 't5',
    type: 'Document',
    title: 'Request background check docs from Clara Oswald',
    candidateId: 'can3',
    candidateName: 'Clara Oswald',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-07-02',
    description: 'Initiate background verification checklist per standard onboarding compliance.',
    notes: 'Need standard employment history verification documents, academic transcripts, and references.',
    subtasks: [
      { id: 'st5_1', title: 'Draft email detailing document checklist', completed: true },
      { id: 'st5_2', title: 'Create shared folder links on secure workspace drive', completed: false }
    ]
  }
];

export const initialTemplates: EmailTemplate[] = [
  {
    id: 'temp1',
    name: 'Interview Scheduled',
    category: 'Interview',
    subject: 'Interview Scheduled: {{JobTitle}} with {{CompanyName}}',
    body: `Hi {{CandidateName}},\n\nI am pleased to confirm that your next interview for the {{JobTitle}} position at {{CompanyName}} has been scheduled.\n\nOur team is excited to meet with you and discuss your experience further. Let me know if you have any questions before the chat!\n\nBest regards,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-10',
    variables: ['CandidateName', 'JobTitle', 'CompanyName', 'RecruiterName'],
    audience: 'Candidate'
  },
  {
    id: 'temp2',
    name: 'Offer Letter Announcement',
    category: 'Offer',
    subject: 'Job Offer: {{JobTitle}} at {{CompanyName}}!',
    body: `Dear {{CandidateName}},\n\nWe are absolutely thrilled to extend an offer of employment for the {{JobTitle}} position with {{CompanyName}}.\n\nWe were incredibly impressed by your interviews, skills, and product approach. We are confident you will make a huge impact here.\n\nPlease find the detailed offer letter attached. We look forward to welcome you to the team!\n\nWarmly,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-15',
    variables: ['CandidateName', 'JobTitle', 'CompanyName', 'RecruiterName'],
    audience: 'Candidate'
  },
  {
    id: 'temp3',
    name: 'First Screening Outreach',
    category: 'Outreach',
    subject: 'Opportunity: {{JobTitle}} at {{CompanyName}}',
    body: `Hello {{CandidateName}},\n\nI came across your profile and was very impressed by your background in engineering. We are currently recruiting for a {{JobTitle}} at {{CompanyName}} and I think you would be a spectacular fit.\n\nDo you have 15 minutes this week for a casual chat?\n\nBest,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-22',
    variables: ['CandidateName', 'JobTitle', 'CompanyName', 'RecruiterName'],
    audience: 'Candidate'
  },
  {
    id: 'temp_comp_submission',
    name: 'Candidate Submission',
    category: 'Submission',
    subject: 'Hirly Candidate Submission: {{CandidateName}} for {{JobTitle}}',
    body: `Hi {{ContactPerson}},\n\nI hope you are doing well!\n\nI am pleased to submit {{CandidateName}}'s profile for the {{JobTitle}} role at {{CompanyName}}.\n\nAfter reviewing their technical skills and background, we find them to be an excellent match. They have solid experience with your core tech stack and have expressed strong interest in {{CompanyName}}.\n\nPlease find their CV attached. Let me know if you would like us to schedule a discussion with them.\n\nBest regards,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-30',
    variables: ['ContactPerson', 'CandidateName', 'JobTitle', 'CompanyName', 'RecruiterName'],
    audience: 'Company'
  },
  {
    id: 'temp_comp_pipeline',
    name: 'Sourcing & Assessment Update',
    category: 'Follow-up',
    subject: 'Hirly - Weekly Sourcing Pipeline Update for {{CompanyName}}',
    body: `Hi {{ContactPerson}},\n\nI hope your week is off to a great start!\n\nI wanted to share a quick update on our search progress for your {{JobTitle}} position.\n\nCurrently, we have 4 candidates undergoing our technical screening and live coding assessments. We expect to share a vetted shortlist with you by the end of this week.\n\nLet me know if there are any adjustments in the role scope!\n\nBest regards,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-30',
    variables: ['ContactPerson', 'JobTitle', 'CompanyName', 'RecruiterName'],
    audience: 'Company'
  },
  {
    id: 'temp_comp_intake',
    name: 'New Position Intake Meeting',
    category: 'Screening',
    subject: 'Intake Discussion: Sourcing strategy for {{JobTitle}}',
    body: `Hi {{ContactPerson}},\n\nThanks for choosing Hirly to assist with your expansion plans. To ensure we target the exact right profile, I'd love to schedule a brief 15-minute Intake Meeting to discuss your {{JobTitle}} requirements.\n\nDuring this call, we'll align on tech stack nuances, team culture, salary expectations, and interview stages.\n\nDo you have availability for a brief call tomorrow or the day after?\n\nBest regards,\n{{RecruiterName}}`,
    lastUpdated: '2026-06-30',
    variables: ['ContactPerson', 'JobTitle', 'RecruiterName'],
    audience: 'Company'
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'act1',
    timestamp: '2026-06-27T10:30:00Z',
    type: 'Candidate',
    description: 'Emily Watson advanced to Interview stage',
    user: 'Sarah Jenkins'
  },
  {
    id: 'act2',
    timestamp: '2026-06-27T09:15:00Z',
    type: 'Resume',
    description: 'Uploaded and parsed Devin Patel\'s resume',
    user: 'Michael Chang'
  },
  {
    id: 'act3',
    timestamp: '2026-06-26T14:45:00Z',
    type: 'Job',
    description: 'Created new Job: Frontend Lead at Retool',
    user: 'Sarah Jenkins'
  },
  {
    id: 'act4',
    timestamp: '2026-06-26T11:00:00Z',
    type: 'Company',
    description: 'Added Stripe as an active company',
    user: 'Michael Chang'
  }
];

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'm1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@apexstaffing.com',
    role: 'Owner',
    status: 'Active',
    lastLogin: '2026-06-27 21:40',
    department: 'Executive'
  },
  {
    id: 'm2',
    name: 'Michael Chang',
    email: 'michael.c@apexstaffing.com',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2026-06-27 18:30',
    department: 'Recruitment'
  },
  {
    id: 'm3',
    name: 'Emily Watson',
    email: 'emily.w@apexstaffing.com',
    role: 'Recruiter',
    status: 'Active',
    lastLogin: '2026-06-27 15:10',
    department: 'Sourcing'
  },
  {
    id: 'm4',
    name: 'David Miller',
    email: 'david.m@apexstaffing.com',
    role: 'HR Executive',
    status: 'Pending',
    lastLogin: 'Never',
    department: 'Talent'
  },
  {
    id: 'm5',
    name: 'Sophia Chen',
    email: 'sophia.c@apexstaffing.com',
    role: 'Viewer',
    status: 'Disabled',
    lastLogin: '2026-06-20 10:00',
    department: 'Client Relations'
  }
];

export const initialCommunicationLogs: CommunicationLog[] = [
  {
    id: 'log1',
    candidateId: 'can1',
    type: 'Email',
    date: '2026-06-25 10:30',
    status: 'Sent',
    sentBy: 'Sarah Jenkins',
    subject: 'Interview Scheduled: Senior React Developer with Airbnb',
    message: 'Hi Emily, Confirmed interview details for Airbnb. Best of luck!'
  },
  {
    id: 'log2',
    candidateId: 'can1',
    type: 'WhatsApp',
    date: '2026-06-26 14:15',
    status: 'Sent',
    sentBy: 'Sarah Jenkins',
    subject: 'WhatsApp Outreach',
    message: 'Hello Emily Watson, We have an opportunity that matches your profile. Please let us know if you\'re available to discuss it.'
  },
  {
    id: 'log3',
    candidateId: 'can3',
    type: 'Call',
    date: '2026-06-24 11:00',
    status: 'Completed',
    sentBy: 'Michael Chang',
    subject: 'Offer Package Feedback',
    message: 'Discussed initial offer details. Candidate excited about Linear-level design role.'
  },
  {
    id: 'log4',
    candidateId: 'can5',
    type: 'Interview',
    date: '2026-06-27 09:30',
    status: 'Completed',
    sentBy: 'Sarah Jenkins',
    subject: 'AWS Deep-Dive technical test',
    message: 'Excellent session. Deep infrastructure and cloud security knowledge.'
  }
];
