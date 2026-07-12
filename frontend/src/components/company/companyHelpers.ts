import { Company, Job, Candidate, Contact, CompanyDocument, Note, CommunicationLog, CompanyActivity } from '../../types';

export function filterJobsBySearch(companyJobs: Job[], search: string): Job[] {
  if (!search) return companyJobs;
  const term = search.toLowerCase();
  return companyJobs.filter(j => 
    j.title.toLowerCase().includes(term) || 
    j.location.toLowerCase().includes(term)
  );
}

export function filterCandidatesBySearch(companyCandidates: Candidate[], search: string): Candidate[] {
  if (!search) return companyCandidates;
  const term = search.toLowerCase();
  return companyCandidates.filter(c => 
    c.name.toLowerCase().includes(term) || 
    (c.skills || []).some(s => s.toLowerCase().includes(term))
  );
}

export function filterContactsBySearch(contacts: Contact[], search: string): Contact[] {
  if (!search) return contacts;
  const term = search.toLowerCase();
  return contacts.filter(c => 
    c.name.toLowerCase().includes(term) || 
    c.designation.toLowerCase().includes(term) || 
    c.email.toLowerCase().includes(term)
  );
}

export function filterNotesBySearch(notes: Note[], search: string): Note[] {
  if (!search) return notes;
  const term = search.toLowerCase();
  return notes.filter(n => n.content.toLowerCase().includes(term));
}

export function filterDocumentsBySearch(documents: CompanyDocument[], search: string): CompanyDocument[] {
  if (!search) return documents;
  const term = search.toLowerCase();
  return documents.filter(d => d.title.toLowerCase().includes(term));
}

export function filterCommunicationsBySearch(communications: CommunicationLog[], search: string): CommunicationLog[] {
  if (!search) return communications;
  const term = search.toLowerCase();
  return communications.filter(c => 
    (c.subject && c.subject.toLowerCase().includes(term)) || 
    (c.recipient && c.recipient.toLowerCase().includes(term))
  );
}
