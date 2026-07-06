import { Candidate, Job } from '../types';

export type ProfileCategory = 'Tech' | 'Design' | 'Finance' | 'Other';

// Help identify category of candidate or job
export const getProfileCategory = (title: string, skills: string[], text: string): ProfileCategory => {
  const combined = `${title} ${skills.join(' ')} ${text}`.toLowerCase();
  
  const techKeywords = ['developer', 'engineer', 'frontend', 'backend', 'fullstack', 'full-stack', 'infrastructure', 'devops', 'programmer', 'software', 'kubernetes', 'aws', 'docker', 'terraform', 'node', 'react', 'typescript', 'rails', 'ruby', 'go', 'computer science', 'coding'];
  const designKeywords = ['designer', 'figma', 'ui/ux', 'ux', 'ui', 'prototyping', 'product design', 'graphic', 'visual designer', 'framer', 'portfolio', 'creative'];
  const financeKeywords = ['accounting', 'accountant', 'tally', 'finance', 'financial', 'cost analysis', 'commerce', 'ledger', 'tax', 'excel', 'math', 'accounts', 'audit', 'bookkeeping', 'b.com', 'bachelor of commerce', 'chartered'];

  // Count occurrences
  let techScore = 0;
  let designScore = 0;
  let financeScore = 0;

  techKeywords.forEach(kw => { if (combined.includes(kw)) techScore += 1; });
  designKeywords.forEach(kw => { if (combined.includes(kw)) designScore += 1; });
  financeKeywords.forEach(kw => { if (combined.includes(kw)) financeScore += 1; });

  if (techScore > Math.max(designScore, financeScore, 0)) return 'Tech';
  if (designScore > Math.max(techScore, financeScore, 0)) return 'Design';
  if (financeScore > Math.max(techScore, designScore, 0)) return 'Finance';

  // Fallback check on individual skills
  if (skills.some(s => ['react', 'typescript', 'javascript', 'html', 'css', 'go', 'ruby', 'aws', 'kubernetes', 'postgresql'].includes(s.toLowerCase().trim()))) return 'Tech';
  if (skills.some(s => ['figma', 'ui/ux', 'prototyping'].includes(s.toLowerCase().trim()))) return 'Design';
  if (skills.some(s => ['tally', 'excel', 'microsoft excel', 'financial management', 'cost analysis', 'account management', 'accounting'].includes(s.toLowerCase().trim()))) return 'Finance';

  return 'Other';
};

// Helper to check if two individual skills match semantically
export const isSkillMatch = (candSkill: string, jobSkill: string): boolean => {
  const c = candSkill.toLowerCase().trim();
  const j = jobSkill.toLowerCase().trim();
  
  if (c === j) return true;
  
  // Word/substring matching with minimum length to prevent false matches (e.g. 'c' matching 'css')
  if (c.length > 2 && j.length > 2) {
    if (c.includes(j) || j.includes(c)) return true;
  }
  
  // Synonym pairings
  const synonyms: { [key: string]: string[] } = {
    'excel': ['microsoft excel', 'ms excel', 'excel spreadsheet', 'spreadsheets'],
    'microsoft excel': ['excel', 'ms excel', 'excel spreadsheet', 'spreadsheets'],
    'ms excel': ['excel', 'microsoft excel', 'excel spreadsheet', 'spreadsheets'],
    'office': ['ms office', 'microsoft office'],
    'ms office': ['office', 'microsoft office'],
    'react': ['react.js', 'reactjs'],
    'react.js': ['react', 'reactjs'],
    'reactjs': ['react', 'react.js'],
    'node': ['node.js', 'nodejs'],
    'node.js': ['node', 'nodejs'],
    'nodejs': ['node', 'node.js'],
    'rails': ['ruby on rails', 'ruby'],
    'ruby on rails': ['rails', 'ruby'],
    'javascript': ['js', 'es6'],
    'js': ['javascript'],
    'typescript': ['ts'],
    'ts': ['typescript'],
    'ui/ux': ['ui', 'ux', 'user interface', 'user experience', 'figma', 'design', 'prototyping'],
    'figma': ['ui/ux', 'design', 'prototyping'],
    'tally': ['accounting', 'accounts', 'financial management', 'cost analysis', 'finance', 'excel'],
    'accounting': ['tally', 'accounts', 'financial management', 'cost analysis', 'finance', 'account management', 'excel'],
    'financial management': ['tally', 'accounting', 'accounts', 'finance', 'cost analysis', 'excel'],
    'cost analysis': ['tally', 'accounting', 'accounts', 'financial management', 'finance', 'excel']
  };

  if (synonyms[c] && synonyms[c].includes(j)) return true;
  if (synonyms[j] && synonyms[j].includes(c)) return true;
  
  return false;
};

// Helper to parse years of experience
const parseExperience = (expStr: string | undefined): number => {
  if (!expStr) return 0;
  const num = parseInt(expStr.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
};

// Helper to parse max salary limit from budget string
const parseSalary = (salStr: string | undefined): number => {
  if (!salStr) return 0;
  const matches = salStr.match(/\d+[\d, ]*/g);
  if (matches && matches.length > 0) {
    const val = matches[matches.length - 1].replace(/[^0-9]/g, '');
    const parsed = parseInt(val);
    if (parsed > 1000) return Math.round(parsed / 1000);
    return parsed;
  }
  return 0;
};

// Main dynamic score algorithm using weighted components
export const calculateMatchScore = (candidate: Candidate, job: Job): number => {
  const candidateSkills = candidate.skills || [];
  const requiredSkills = job.requiredSkills || [];

  // 1. Skills Overlap (Max 50 points)
  const matchingSkills = requiredSkills.filter(rs => 
    candidateSkills.some(cs => isSkillMatch(cs, rs))
  );

  let skillsScore = 50;
  if (requiredSkills.length > 0) {
    skillsScore = Math.round((matchingSkills.length / requiredSkills.length) * 50);
  }

  // 2. Experience Match (Max 20 points)
  const candExp = parseExperience(candidate.experience);
  const jobExp = parseExperience(job.experience);
  let expScore = 20;
  if (jobExp > 0) {
    if (candExp >= jobExp) {
      expScore = 20;
    } else {
      expScore = Math.max(0, Math.round((candExp / jobExp) * 20));
    }
  }

  // 3. Salary Match (Max 15 points)
  const candSalary = parseSalary(candidate.expectedSalary);
  const jobMaxSalary = parseSalary(job.salary);
  let salaryScore = 15;
  if (candSalary > 0 && jobMaxSalary > 0) {
    if (candSalary <= jobMaxSalary) {
      salaryScore = 15;
    } else {
      const excessRatio = (candSalary - jobMaxSalary) / jobMaxSalary;
      salaryScore = Math.max(0, Math.round((1 - excessRatio) * 15));
    }
  }

  // 4. Location Match (Max 15 points)
  let locationScore = 5; // Default if different city
  const jobLoc = (job.location || '').toLowerCase();
  const candAddr = (candidate.address || '').toLowerCase();
  const candCity = (candidate.city || '').toLowerCase();

  if (jobLoc.includes('remote')) {
    locationScore = 15;
  } else if (candAddr && (jobLoc.includes(candAddr) || candAddr.includes(jobLoc))) {
    locationScore = 15;
  } else if (candCity && (jobLoc.includes(candCity) || candCity.includes(jobLoc))) {
    locationScore = 15;
  } else if (!candAddr && !candCity) {
    locationScore = 10; // Default if location not provided
  }

  // Sum up weighted scores
  let totalScore = skillsScore + expScore + salaryScore + locationScore;

  // Safety Penalty: if candidate matches ZERO skills, cap their match score at 10%
  if (requiredSkills.length > 0 && matchingSkills.length === 0) {
    totalScore = Math.min(totalScore, 10);
  }

  return Math.min(100, Math.max(0, totalScore));
};
