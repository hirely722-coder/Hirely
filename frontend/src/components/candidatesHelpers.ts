import { Candidate, Job } from '../types';
import { calculateMatchScore, isSkillMatch } from '../utils/matching';

// Parse salary string to numbers for range filtering
export const parseSalary = (salaryStr: string | undefined): number => {
  if (!salaryStr) return 0;
  const cleanStr = salaryStr.replace(/[^0-9]/g, '');
  return parseInt(cleanStr) || 0;
};

// Extract unique designations from candidates
export const extractUniqueDesignations = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c && c.designation) {
      list.add(c.designation);
    }
  });
  return ['All', ...Array.from(list)];
};

// Extract unique cities from candidates
export const extractUniqueCities = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c) {
      if (c.city) {
        list.add(c.city);
      } else if (c.address) {
        const parts = c.address.split(',');
        if (parts.length > 0) {
          const possibleCity = parts[0].trim();
          if (possibleCity && possibleCity.length < 30) {
            list.add(possibleCity);
          }
        }
      }
    }
  });
  return ['All', ...Array.from(list)];
};

// Extract unique genders from candidates
export const extractUniqueGenders = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c && c.gender) {
      list.add(c.gender);
    }
  });
  return ['All', ...Array.from(list)];
};

// Extract unique expected salaries from candidates
export const extractUniqueSalaries = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c && c.expectedSalary) {
      list.add(c.expectedSalary);
    }
  });
  return ['All', ...Array.from(list)];
};

// Extract unique educations from candidates
export const extractUniqueEducations = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c && c.education) {
      list.add(c.education);
    }
  });
  return ['All', ...Array.from(list)];
};

// Extract unique experiences from candidates
export const extractUniqueExperiences = (candidates: Candidate[]): string[] => {
  const list = new Set<string>();
  (candidates || []).forEach(c => {
    if (c && c.experience) {
      list.add(c.experience);
    }
  });
  return ['All', ...Array.from(list)];
};

// Perform complete candidate filtering and sorting logic
export interface FilterSortParams {
  candidates: Candidate[];
  searchTerm: string;
  statusFilter: string;
  designationFilter: string;
  genderFilter: string;
  cityFilter: string;
  salaryFilter: string;
  educationFilter: string;
  experienceFilter: string;
  scoreFilter: string;
  skillsCountFilter: string;
  resumeAttachedFilter: string;
  customFieldFilters: Record<string, string>;
  sortBy: 'name' | 'score' | 'experience';
  sortOrder: 'asc' | 'desc';
}

export const filterAndSortCandidates = ({
  candidates,
  searchTerm,
  statusFilter,
  designationFilter,
  genderFilter,
  cityFilter,
  salaryFilter,
  educationFilter,
  experienceFilter,
  scoreFilter,
  skillsCountFilter,
  resumeAttachedFilter,
  customFieldFilters,
  sortBy,
  sortOrder
}: FilterSortParams): Candidate[] => {
  return (candidates || [])
    .filter(candidate => {
      if (!candidate) return false;
      const matchesSearch = 
        (candidate.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (candidate.email || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (candidate.skills || []).some(s => (s || '').toLowerCase().includes((searchTerm || '').toLowerCase())) ||
        (candidate.currentCompany || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
        (candidate.designation || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || candidate.status === statusFilter;

      const matchesDesignation = designationFilter === 'All' || candidate.designation === designationFilter;

      const matchesGender = genderFilter === 'All' || candidate.gender === genderFilter;

      const matchesCity = cityFilter === 'All' || 
        candidate.city === cityFilter || 
        (candidate.address && (candidate.address || '').toLowerCase().includes((cityFilter || '').toLowerCase()));

      const matchesSalary = salaryFilter === 'All' || candidate.expectedSalary === salaryFilter;

      const matchesEducation = educationFilter === 'All' || candidate.education === educationFilter;

      const matchesExperience = experienceFilter === 'All' || candidate.experience === experienceFilter;

      let matchesScore = true;
      if (scoreFilter !== 'All') {
        const score = candidate.aiMatchScore || 0;
        if (scoreFilter === 'Excellent (90%+)') {
          matchesScore = score >= 90;
        } else if (scoreFilter === 'Strong (80%-89%)') {
          matchesScore = score >= 80 && score < 90;
        } else if (scoreFilter === 'Good (70%-79%)') {
          matchesScore = score >= 70 && score < 80;
        } else if (scoreFilter === 'Fair (Below 70%)') {
          matchesScore = score < 70;
        }
      }

      let matchesSkillsCount = true;
      if (skillsCountFilter !== 'All') {
        const count = (candidate.skills || []).length;
        if (skillsCountFilter === '1-3 Skills') {
          matchesSkillsCount = count >= 1 && count <= 3;
        } else if (skillsCountFilter === '4-6 Skills') {
          matchesSkillsCount = count >= 4 && count <= 6;
        } else if (skillsCountFilter === '7+ Skills') {
          matchesSkillsCount = count >= 7;
        }
      }

      let matchesResume = true;
      if (resumeAttachedFilter !== 'All') {
        const hasResume = !!candidate.resumeText || !!candidate.resumeFileName;
        if (resumeAttachedFilter === 'With Resume') {
          matchesResume = hasResume;
        } else if (resumeAttachedFilter === 'No Resume') {
          matchesResume = !hasResume;
        }
      }

      let matchesCustomFields = true;
      if (customFieldFilters && Object.keys(customFieldFilters).length > 0) {
        for (const [key, filterVal] of Object.entries(customFieldFilters)) {
          if (!filterVal || filterVal === 'All' || filterVal === '') continue;
          const candidateVal = candidate.customFields?.[key];
          if (candidateVal === undefined || candidateVal === null || candidateVal === '') {
            matchesCustomFields = false;
            break;
          }
          if (typeof candidateVal === 'boolean') {
            const isTrueFilter = filterVal === 'Yes' || filterVal === 'true';
            if (candidateVal !== isTrueFilter) {
              matchesCustomFields = false;
              break;
            }
          } else {
            const candStr = String(candidateVal).toLowerCase();
            const filtStr = String(filterVal).toLowerCase();
            if (!candStr.includes(filtStr)) {
              matchesCustomFields = false;
              break;
            }
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDesignation && matchesGender && matchesCity && matchesSalary && matchesEducation && matchesExperience && matchesScore && matchesSkillsCount && matchesResume && matchesCustomFields;
    })
    .sort((a, b) => {
      let valA: any = a.name;
      let valB: any = b.name;

      if (sortBy === 'score') {
        valA = a.aiMatchScore;
        valB = b.aiMatchScore;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortBy === 'experience') {
        valA = parseInt(a.experience) || 0;
        valB = parseInt(b.experience) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (sortOrder === 'asc') {
        return valA.toString().localeCompare(valB.toString());
      } else {
        return valB.toString().localeCompare(valA.toString());
      }
    });
};

// Compute matched jobs ranked by skill overlap with selected candidate
export const computeMatchedJobsForCandidate = (selectedCandidate: Candidate, jobs: Job[]) => {
  if (!selectedCandidate || !jobs) return [];
  
  const candidateSkills = selectedCandidate.skills || [];
  
  return jobs
    .filter(job => job.status === 'Open')
    .map(job => {
      const requiredSkills = job.requiredSkills || [];
      
      const matchingSkills: string[] = [];
      requiredSkills.forEach(rs => {
        const hasMatch = candidateSkills.some(cs => isSkillMatch(cs, rs));
        if (hasMatch) {
          matchingSkills.push(rs);
        }
      });

      const matchScore = calculateMatchScore(selectedCandidate, job);

      return {
        ...job,
        matchingSkills,
        matchScore
      };
    })
    .filter(item => item.matchScore > 15)
    .sort((a, b) => b.matchScore - a.matchScore);
};
