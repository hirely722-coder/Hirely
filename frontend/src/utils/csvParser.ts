/**
 * Robust CSV parser that handles double quotes, escaped commas, newlines within quotes, and multi-line rows.
 * Conforms to RFC 4180 rules.
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Double double-quotes inside quotes means an escaped single double-quote
          currentField += '"';
          i++; // skip next quote
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Opening quote
        insideQuotes = true;
      } else if (char === ',') {
        // Field separator
        row.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        // Row separator
        row.push(currentField.trim());
        currentField = '';
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
      } else {
        currentField += char;
      }
    }
  }

  // Handle last line if it doesn't end with a newline
  if (currentField !== '' || row.length > 0) {
    row.push(currentField.trim());
    if (row.length > 1 || row[0] !== '') {
      result.push(row);
    }
  }

  return result;
}

/**
 * Normalizes a header string for smart matching
 */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Standard templates to help clients format their files
 */
export const CSV_TEMPLATES = {
  companies: [
    ['Company Name', 'Contact Person', 'Email', 'Phone', 'Website', 'Address', 'Notes', 'Recruiter Contact', 'Industry', 'Company Size', 'Founded Year', 'Partnership Tier', 'LinkedIn URL'],
    ['Acme Corp', 'John Doe', 'john@acme.com', '+1-555-0199', 'https://acme.com', '123 Tech Lane, San Francisco, CA', 'Key potential partner in enterprise AI.', 'Sarah Jenkins', 'SaaS', '201-500', '2019', 'Tier 1', 'https://linkedin.com/company/acme'],
    ['Stark Industries', 'Pepper Potts', 'pepper@stark.com', '+1-555-0100', 'https://stark.com', 'Malibu, California', 'Excellent engineering partner.', 'Sarah Jenkins', 'Robotics', '500+', '1998', 'Tier 1', 'https://linkedin.com/company/stark']
  ],
  jobs: [
    ['Job Title', 'Company Name', 'Experience', 'Location', 'Salary Range', 'Status', 'Description', 'Required Skills', 'Employment Type', 'Department', 'Urgency', 'Assigned Recruiter'],
    ['Senior React Developer', 'Acme Corp', '5+ Years', 'San Francisco, CA / Hybrid', '₹140,000 - ₹170,000', 'Open', 'Looking for an expert React and TypeScript engineer.', 'React, TypeScript, Tailwind CSS, Webpack', 'Full-time', 'Engineering', 'High', 'Sarah Jenkins'],
    ['Junior HR Specialist', 'Stark Industries', '1-3 Years', 'Malibu, CA / Remote', '₹75,000 - ₹95,000', 'Open', 'Support global talent operations and scheduling.', 'Recruiting, Sourcing, Excel, HRIS', 'Full-time', 'Human Resources', 'Medium', 'Sarah Jenkins']
  ],
  candidates: [
    ['Name', 'Email', 'Phone', 'Experience', 'Skills', 'Current Company', 'Pipeline Stage', 'Education', 'Address', 'Notes', 'Designation', 'Gender', 'City', 'Expected Salary'],
    ['Alice Smith', 'alice.smith@gmail.com', '+1-555-1234', '4 Years', 'React, TypeScript, Node.js', 'Framer', 'Shortlisted', 'B.S. in Computer Science', 'Austin, Texas', 'Strong architectural backend knowledge.', 'Full Stack Engineer', 'Female', 'Austin', '₹135,000'],
    ['Bob Jones', 'bob.jones@outlook.com', '+1-555-5678', '7 Years', 'Figma, UI/UX, User Research', 'Retool', 'Applied', 'B.A. in Graphic Design', 'New York, NY', 'Outstanding visual portfolio.', 'Senior UI/UX Designer', 'Male', 'New York', '₹145,000']
  ]
};

/**
 * Dynamic mapping rules based on typical user CSV header names
 */
export const FIELD_MAPPINGS = {
  companies: {
    name: ['companyname', 'name', 'company', 'organization'],
    contactPerson: ['contactperson', 'contact', 'primarycontact', 'hrcontact', 'person'],
    email: ['email', 'emailaddress', 'contactemail'],
    phone: ['phone', 'phonenumber', 'contactphone', 'telephone'],
    website: ['website', 'url', 'site', 'companywebsite'],
    address: ['address', 'location', 'hqaddress', 'hq'],
    notes: ['notes', 'description', 'comments', 'remarks'],
    recContact: ['recruitercontact', 'assignedrecruiter', 'recruiter', 'accountmanager'],
    industry: ['industry', 'sector', 'industryfocus'],
    companySize: ['companysize', 'employees', 'size'],
    foundedYear: ['foundedyear', 'founded', 'yearfounded'],
    tier: ['partnershiptier', 'tier', 'partnership'],
    linkedinUrl: ['linkedinurl', 'linkedin', 'linkedinpage']
  },
  jobs: {
    title: ['jobtitle', 'title', 'position', 'role'],
    companyName: ['companyname', 'company', 'client', 'organization'],
    experience: ['experience', 'requiredexperience', 'exp'],
    location: ['location', 'joblocation', 'worklocation', 'workmode'],
    salary: ['salaryrange', 'salary', 'compensation', 'pay'],
    status: ['status', 'jobstatus', 'state'],
    description: ['description', 'jobdescription', 'details', 'summary'],
    requiredSkills: ['requiredskills', 'skills', 'technologies', 'skillsneeded'],
    employmentType: ['employmenttype', 'type', 'jobtype'],
    department: ['department', 'dept', 'team'],
    urgency: ['urgency', 'urgencylevel', 'priority'],
    recruiterName: ['assignedrecruiter', 'recruiter', 'recruitername']
  },
  candidates: {
    name: ['name', 'candidatename', 'candidatesname', 'fullname', 'applicantname', 'candidate'],
    email: ['email', 'emailaddress', 'applicantemail', 'emailid'],
    phone: ['phone', 'phonenumber', 'applicantphone', 'mobile', 'cellphone', 'mobileno', 'mobileno'],
    experience: ['experience', 'yearsofexperience', 'exp', 'years', 'workexperience', 'workexeperience', 'exeperience'],
    skills: ['skills', 'technologies', 'corecompetencies', 'technicalskills', 'department', 'education'], // Some files might pack skills in dept/education but we match them safely
    currentCompany: ['currentcompany', 'company', 'currentemployer', 'employer'],
    status: ['pipelinestage', 'stage', 'status', 'candidatestatus'],
    education: ['education', 'degree', 'qualification', 'academic'],
    address: ['address', 'location', 'currentaddress'],
    notes: ['notes', 'assessment', 'recruiterremarks', 'remarks', 'comments'],
    designation: ['designation', 'role', 'title', 'currentrole', 'department'],
    gender: ['gender', 'sex'],
    city: ['city', 'locationcity'],
    expectedSalary: ['expectedsalary', 'salaryexpectation', 'expectedcompensation'],
    appliedDate: ['applieddate', 'date', 'applicationdate', 'dateapplied']
  }
};
