import { supabase } from './db';
import { 
  initialCompanies, 
  initialJobs, 
  initialCandidates, 
  initialTasks, 
  initialTemplates, 
  initialActivityLogs, 
  initialTeamMembers, 
  initialCommunicationLogs 
} from './mockData';

async function seed() {
  console.log('Starting database seeding...');

  try {
    // 1. Seed Companies
    console.log('Seeding companies...');
    const mappedCompanies = initialCompanies.map(c => ({
      id: c.id,
      name: c.name,
      contact_person: c.contactPerson,
      open_jobs: c.openJobs,
      status: c.status,
      email: c.email,
      phone: c.phone,
      website: c.website,
      address: c.address,
      notes: c.notes,
      rec_contact: c.recContact,
      industry: c.industry || null,
      company_size: c.companySize || null,
      founded_year: c.foundedYear || null,
      tier: c.tier || null,
      linkedin_url: c.linkedInUrl || null,
      import_id: c.importId || null
    }));

    const { error: compError } = await supabase.from('companies').upsert(mappedCompanies);
    if (compError) throw new Error(`Companies seed failed: ${compError.message}`);

    // 2. Seed Candidates
    console.log('Seeding candidates...');
    const mappedCandidates = initialCandidates.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      experience: c.experience,
      skills: c.skills,
      current_company: c.currentCompany,
      status: c.status,
      ai_match_score: c.aiMatchScore,
      resume_text: c.resumeText,
      resume_file_name: c.resumeFileName || null,
      education: c.education,
      address: c.address,
      notes: c.notes,
      applied_date: c.appliedDate,
      designation: c.designation || null,
      gender: c.gender || null,
      city: c.city || null,
      expected_salary: c.expectedSalary || null,
      import_id: c.importId || null
    }));

    const { error: candError } = await supabase.from('candidates').upsert(mappedCandidates);
    if (candError) throw new Error(`Candidates seed failed: ${candError.message}`);

    // 3. Seed Jobs
    console.log('Seeding jobs...');
    const mappedJobs = initialJobs.map(j => ({
      id: j.id,
      title: j.title,
      company_id: j.companyId,
      company_name: j.companyName,
      experience: j.experience,
      location: j.location,
      applications_count: j.applicationsCount,
      status: j.status,
      description: j.description,
      required_skills: j.requiredSkills,
      salary: j.salary,
      employment_type: j.employmentType || null,
      department: j.department || null,
      urgency: j.urgency || null,
      recruiter_name: j.recruiterName || null,
      import_id: j.importId || null
    }));

    const { error: jobError } = await supabase.from('jobs').upsert(mappedJobs);
    if (jobError) throw new Error(`Jobs seed failed: ${jobError.message}`);

    // 4. Seed Tasks
    console.log('Seeding tasks...');
    const mappedTasks = initialTasks.map(t => ({
      id: t.id,
      type: t.type,
      title: t.title,
      candidate_id: t.candidateId || null,
      candidate_name: t.candidateName || null,
      priority: t.priority,
      status: t.status,
      due_date: t.dueDate,
      description: t.description || null,
      notes: t.notes || null,
      subtasks: t.subtasks || [],
      import_id: t.importId || null
    }));

    const { error: taskError } = await supabase.from('tasks').upsert(mappedTasks);
    if (taskError) throw new Error(`Tasks seed failed: ${taskError.message}`);

    // 5. Seed Email Templates
    console.log('Seeding email templates...');
    const mappedTemplates = initialTemplates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      subject: t.subject,
      body: t.body,
      last_updated: t.lastUpdated,
      variables: t.variables,
      audience: t.audience || null,
      import_id: t.importId || null
    }));

    const { error: tempError } = await supabase.from('email_templates').upsert(mappedTemplates);
    if (tempError) throw new Error(`Email templates seed failed: ${tempError.message}`);

    // 6. Seed Activity Logs
    console.log('Seeding activity logs...');
    const mappedActivityLogs = initialActivityLogs.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      type: a.type,
      description: a.description,
      user_name: a.user
    }));

    const { error: actError } = await supabase.from('activity_logs').upsert(mappedActivityLogs);
    if (actError) throw new Error(`Activity logs seed failed: ${actError.message}`);

    // 7. Seed Team Members
    console.log('Seeding team members...');
    const mappedTeamMembers = initialTeamMembers.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      status: t.status,
      last_login: t.lastLogin,
      department: t.department || null,
      message: t.message || null
    }));

    const { error: teamError } = await supabase.from('team_members').upsert(mappedTeamMembers);
    if (teamError) throw new Error(`Team members seed failed: ${teamError.message}`);

    // 8. Seed Communication Logs
    console.log('Seeding communication logs...');
    const mappedCommLogs = initialCommunicationLogs.map(c => ({
      id: c.id,
      candidate_id: c.candidateId,
      type: c.type,
      date: c.date,
      status: c.status,
      sent_by: c.sentBy,
      subject: c.subject,
      message: c.message
    }));

    const { error: commError } = await supabase.from('communication_logs').upsert(mappedCommLogs);
    if (commError) throw new Error(`Communication logs seed failed: ${commError.message}`);

    // 9. Seed Default Email Config
    console.log('Seeding default email config...');
    const defaultEmailConfig = {
      id: 'default',
      provider: 'Gmail',
      smtp_host: 'smtp.gmail.com',
      port: '587',
      username: 'sarah.j@apexstaffing.com',
      password: '••••••••••••',
      encryption: 'TLS',
      is_connected: true
    };

    const { error: configError } = await supabase.from('email_configs').upsert([defaultEmailConfig]);
    if (configError) throw new Error(`Email config seed failed: ${configError.message}`);

    console.log('Database seeded successfully!');
  } catch (error: any) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
