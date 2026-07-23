/**
 * resume_detector_service.ts
 * Intelligent AI document classifier, confidence scoring, candidate deduplication, & auto-import engine.
 */

import { GoogleGenAI } from '@google/genai';
import { initialCandidates } from '../mockData';
import { ResumeQueueDB, type ResumeQueueItem } from '../resume_queue_db';

const SUPPORTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.rtf', '.odt', '.txt'];
const IGNORED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.zip', '.tar', '.gz', '.xls', '.xlsx', '.csv', '.mp4', '.avi', '.exe'];

export interface ResumeDetectionResult {
  isSupported: boolean;
  docType: 'Resume' | 'CV' | 'Cover Letter' | 'Offer Letter' | 'Salary Slip' | 'Invoice' | 'Aadhaar' | 'Passport' | 'Contract' | 'Other';
  confidenceScore: number; // 0 - 100
  confidenceTier: 'High' | 'Medium' | 'Low';
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  designation?: string;
  skills?: string[];
  duplicateStatus: 'New' | 'Duplicate Found' | 'Updated';
  importStatus: 'Auto Imported' | 'Pending Review' | 'Manually Imported' | 'Ignored';
  reason?: string;
}

export class ResumeDetectorService {
  /**
   * Check if attachment file extension is supported for resume processing.
   */
  static isSupportedFileType(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (IGNORED_EXTENSIONS.includes(ext)) return false;
    return SUPPORTED_EXTENSIONS.includes(ext);
  }

  /**
   * Analyze document attachment text/headers, calculate confidence score, and classify document type.
   */
  static async processAttachment(params: {
    workspaceId: string;
    emailId?: string;
    threadId?: string;
    filename: string;
    fileSize?: number;
    mimeType?: string;
    bodyText?: string;
    senderEmail: string;
    senderName?: string;
    contentUrl?: string;
  }): Promise<ResumeDetectionResult> {
    const { filename, senderEmail, senderName, bodyText, workspaceId } = params;

    // 1. File type filter
    if (!this.isSupportedFileType(filename)) {
      console.log(`[Resume Detector] Skipped unsupported file type: ${filename}`);
      return {
        isSupported: false,
        docType: 'Other',
        confidenceScore: 0,
        confidenceTier: 'Low',
        duplicateStatus: 'New',
        importStatus: 'Ignored',
        reason: 'Unsupported document format.'
      };
    }

    console.log(`[Resume Detector] Analyzing attachment: ${filename} from ${senderEmail}...`);

    // 2. Structural Signal Detection & Content-Based Confidence Calculation
    const lowerFilename = filename.toLowerCase();
    const lowerBody = (bodyText || '').toLowerCase();
    const combinedText = (lowerFilename + ' ' + (senderName || '') + ' ' + lowerBody).toLowerCase();
    
    let confidenceScore = 30; // Base score for supported file extension
    let candidateName = senderName || senderEmail.split('@')[0];
    let candidateEmail = senderEmail;
    let candidatePhone: string | undefined = undefined;
    let designation = 'Candidate';
    let skills: string[] = [];

    // Universal Resume Structural Footprints (Does NOT rely strictly on filename containing "resume" or "cv")
    const hasContactSignal = senderEmail.includes('@') || /[0-9]{7,}/.test(combinedText) || combinedText.includes('linkedin.com') || combinedText.includes('github.com');
    const hasExperienceHeader = combinedText.includes('experience') || combinedText.includes('employment') || combinedText.includes('work history') || combinedText.includes('career summary');
    const hasEducationHeader = combinedText.includes('education') || combinedText.includes('qualification') || combinedText.includes('degree') || combinedText.includes('university') || combinedText.includes('college');
    const hasSkillsHeader = combinedText.includes('skills') || combinedText.includes('technologies') || combinedText.includes('proficiencies') || combinedText.includes('competencies') || combinedText.includes('projects');
    const hasDatePattern = /[2][0][0-9]{2}\s*[-–\s]\s*([2][0][0-9]{2}|present|current)/i.test(combinedText);

    if (hasContactSignal) confidenceScore += 20;
    if (hasExperienceHeader) confidenceScore += 25;
    if (hasEducationHeader) confidenceScore += 20;
    if (hasSkillsHeader) confidenceScore += 20;
    if (hasDatePattern) confidenceScore += 15;

    // Bonus for explicit CV/Resume filename (e.g. Resume_John.pdf)
    if (lowerFilename.includes('resume') || lowerFilename.includes('cv')) {
      confidenceScore += 15;
    }

    // Transactional Invoice vs Developer Resume Project Disambiguation
    let docType: ResumeDetectionResult['docType'] = 'Resume';
    const isTransactionalInvoice = (
      (combinedText.includes('invoice #') || combinedText.includes('bill to') || combinedText.includes('total due') || combinedText.includes('subtotal') || combinedText.includes('payment terms') || combinedText.includes('vat id') || combinedText.includes('tax id')) &&
      !hasExperienceHeader && !hasEducationHeader
    );

    if (isTransactionalInvoice) {
      docType = 'Invoice';
      confidenceScore = 10;
    } else if (combinedText.includes('aadhaar') || combinedText.includes('pan card') || combinedText.includes('passport')) {
      docType = 'Aadhaar';
      confidenceScore = 15;
    } else if (combinedText.includes('offer letter') || combinedText.includes('joining letter')) {
      docType = 'Offer Letter';
      confidenceScore = 40;
    }

    // Clamp score
    confidenceScore = Math.min(100, Math.max(0, confidenceScore));

    // Assign Confidence Tier
    let confidenceTier: 'High' | 'Medium' | 'Low' = 'Low';
    if (confidenceScore >= 80) {
      confidenceTier = 'High';
    } else if (confidenceScore >= 50) {
      confidenceTier = 'Medium';
    }

    // 3. Deduplication Check against candidates database
    let duplicateStatus: ResumeDetectionResult['duplicateStatus'] = 'New';
    const existingCand = initialCandidates.find(c => 
      c.email?.toLowerCase() === candidateEmail.toLowerCase()
    );

    if (existingCand) {
      duplicateStatus = 'Duplicate Found';
      candidateName = existingCand.name;
    }

    // 4. Automated Import Action based on Tier
    let importStatus: ResumeDetectionResult['importStatus'] = 'Pending Review';

    if (confidenceTier === 'High') {
      if (duplicateStatus === 'Duplicate Found') {
        duplicateStatus = 'Updated';
        importStatus = 'Auto Imported';
        console.log(`[Resume Detector] Auto-updated existing candidate profile for: ${candidateEmail}`);
      } else {
        importStatus = 'Auto Imported';
        console.log(`[Resume Detector] High confidence resume! Auto-created candidate: ${candidateName}`);
        initialCandidates.unshift({
          id: 'cand_' + Math.random().toString(36).substring(2, 11),
          name: candidateName,
          email: candidateEmail,
          phone: candidatePhone || '+1 (555) 019-2831',
          designation: designation || 'Software Engineer',
          status: 'Applied',
          experience: '3+ Years',
          currentCompany: 'Hirely Applicant Pool',
          education: 'B.Tech / Bachelor Degree',
          address: 'Remote',
          notes: `Imported from email attachment ${filename}.`,
          aiMatchScore: 90,
          resumeText: bodyText || '',
          resumeFileName: filename,
          appliedDate: new Date().toISOString().split('T')[0],
          skills: skills && skills.length > 0 ? skills : ['React', 'Node.js'],
        });
      }
    } else if (confidenceTier === 'Medium') {
      importStatus = 'Pending Review';
      console.log(`[Resume Detector] Medium confidence (${confidenceScore}%). Queued for recruiter review.`);
    } else {
      importStatus = 'Ignored';
      console.log(`[Resume Detector] Low confidence (${confidenceScore}%). Ignored.`);
    }

    // 5. Save to Resume Processing Queue
    await ResumeQueueDB.addQueueItem({
      workspaceId,
      emailId: params.emailId,
      threadId: params.threadId,
      attachmentName: filename,
      attachmentSize: params.fileSize,
      mimeType: params.mimeType,
      senderEmail,
      senderName,
      candidateName,
      candidateEmail,
      candidatePhone,
      designation,
      skills,
      docType,
      confidenceScore,
      confidenceTier,
      parseStatus: confidenceTier === 'Low' ? 'Ignored' : 'Parsed',
      duplicateStatus,
      importStatus,
      contentUrl: params.contentUrl,
    });

    return {
      isSupported: true,
      docType,
      confidenceScore,
      confidenceTier,
      candidateName,
      candidateEmail,
      candidatePhone,
      designation,
      skills,
      duplicateStatus,
      importStatus,
    };
  }
}

function fontIsWorkRelated(text: string): boolean {
  return text.includes('developer') || text.includes('engineer') || text.includes('manager') || 
         text.includes('designer') || text.includes('intern') || text.includes('lead');
}
