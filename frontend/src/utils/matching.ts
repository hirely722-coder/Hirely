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

// Main dynamic score algorithm
export const calculateMatchScore = (candidate: Candidate, job: Job): number => {
  const candidateSkills = candidate.skills || [];
  const requiredSkills = job.requiredSkills || [];

  if (requiredSkills.length === 0) return 100;

  const candidateCategory = getProfileCategory(
    (candidate.name || '') + ' ' + (candidate.currentCompany || ''),
    candidateSkills,
    (candidate.resumeText || '') + ' ' + (candidate.education || '') + ' ' + (candidate.notes || '')
  );

  const jobCategory = getProfileCategory(
    job.title,
    requiredSkills,
    job.description || ''
  );

  // Count matching skills
  const matchingSkills = requiredSkills.filter(rs => 
    candidateSkills.some(cs => isSkillMatch(cs, rs))
  );

  let rawScore = Math.round((matchingSkills.length / requiredSkills.length) * 100);
  let score = rawScore;

  if (candidateCategory !== 'Other' && jobCategory !== 'Other' && candidateCategory !== jobCategory) {
    // Completely mismatched sectors (e.g. Finance candidate against Dev role)
    score = Math.min(score, 5);
  } else if (candidateCategory === jobCategory && candidateCategory !== 'Other') {
    // Same sector - guarantee a relevant minimum baseline of match score
    score = Math.min(100, Math.max(score, 20 + matchingSkills.length * 15));
  } else {
    // If one is "Other" or undefined, fallback to raw overlap score but capped
    score = Math.min(100, Math.max(score, matchingSkills.length * 10));
  }

  // Double check mock scores (limit max fallback score to keep realistic feel if low matching)
  if (matchingSkills.length === 0) {
    score = 0;
  }

  return score;
};
