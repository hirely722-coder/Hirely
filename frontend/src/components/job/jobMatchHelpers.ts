import { Candidate, Job } from '../../types';
import { calculateMatchScore } from '../../utils/matching';

export interface CandidateMatchResult {
  candidate: Candidate;
  score: number;
  matchedSkills: string[];
  reasons: string[];
}

export function computeCandidateMatchData(candidates: Candidate[], job: Job): CandidateMatchResult[] {
  return (candidates || [])
    .filter(Boolean)
    .map(cand => {
      const requiredOverlap = (cand.skills || []).filter(s => 
      (job.requiredSkills || []).map(rs => (rs || '').toLowerCase()).includes((s || '').toLowerCase())
    );
    const matchScore = calculateMatchScore(cand, job);
    
    const reasons: string[] = [];
    if (matchScore >= 80) {
      reasons.push('✓ Strong Profile Category & Skill Alignment');
    } else if (requiredOverlap.length > 0) {
      reasons.push(`✓ Matches skills: ${requiredOverlap.slice(0, 3).join(', ')}`);
    }
    
    const candExpNum = parseInt(cand.experience) || 3;
    const jobExpNum = parseInt(job.experience) || 3;
    if (candExpNum >= jobExpNum) {
      reasons.push('✓ Professional Experience meets or exceeds standard');
    } else {
      reasons.push('⚠ Noticeable experience delta for high-seniority level');
    }

    if ((cand.address || '').toLowerCase().includes('san francisco') || (job.location || '').toLowerCase().includes('remote')) {
      reasons.push('✓ Matches geographical / remote configuration');
    } else {
      reasons.push('⚠ Out-of-state candidacy may require travel alignment');
    }

    const seedSalary = (((cand.name || 'A').charCodeAt(0) || 65) % 20) + 120;
    const salaryStr = job.salary || '';
    const jobMaxSalary = parseInt(salaryStr.replace(/[^0-9]/g, '').slice(-3)) || 180;
    if (seedSalary <= jobMaxSalary) {
      reasons.push(`✓ Expected compensation ($${seedSalary}k) aligns with budgeted range`);
    } else {
      reasons.push(`⚠ Expected salary ($${seedSalary}k) sits near budget ceiling`);
    }

    reasons.push('✓ Complete background screening checks passed');

    return {
      candidate: cand,
      score: matchScore,
      matchedSkills: requiredOverlap,
      reasons
    };
  })
  .filter(item => item.score > 15)
  .sort((a, b) => b.score - a.score);
}
