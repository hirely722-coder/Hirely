import { jsPDF } from 'jspdf';
import { Candidate } from '../types';

export interface WcPdfOptions {
  candidates: Candidate[];
  wcEnabled: boolean;
  branding?: {
    logoUrl?: string;
    agencyName?: string;
  };
  jobTitle?: string;
  companyName?: string;
}

export interface GeneratedPdfResult {
  blob: Blob;
  blobUrl: string;
  base64: string;
  filename: string;
}

/**
 * Loads an image or SVG URL and converts it to a High-DPI Data URL for jsPDF
 */
async function loadImageAsDataUrl(url: string, targetWidth = 512, targetHeight = 512): Promise<string | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        console.warn('Failed to convert image to Data URL:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates an authentic Executive Candidate Resume PDF
 * with clean agency contact representation and crisp high-DPI logo SVG watermarking.
 */
export async function generateWcPdf(options: WcPdfOptions): Promise<GeneratedPdfResult> {
  const { candidates, wcEnabled, branding, jobTitle, companyName } = options;

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  // Load custom logo if provided
  let logoDataUrl: string | null = null;
  if (branding?.logoUrl) {
    logoDataUrl = await loadImageAsDataUrl(branding.logoUrl, 512, 180);
  }


  candidates.forEach((cand, index) => {
    if (index > 0) {
      doc.addPage();
    }

    let y = margin;

    // ── 1. AGENCY HEADER BAR (CLEAN EXECUTIVE HEADER) ───────────────────────
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', margin, y, 38, 12);
      } catch {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text((branding?.agencyName || 'AGENCY RECRUITMENT NETWORK').toUpperCase(), margin, y + 6);
      }
    } else {
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text((branding?.agencyName || 'AGENCY RECRUITMENT NETWORK').toUpperCase(), margin, y + 6);
    }

    y += 14;

    // Target job context sub-bar if available
    if (jobTitle || companyName) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      const sub = `Candidate Profile Presentation • ${jobTitle || 'Role Submission'} ${companyName ? `@ ${companyName}` : ''}`;
      doc.text(sub, margin, y);
      y += 6;
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // ── 2. CANDIDATE NAME & TITLE (EXECUTIVE CV HEADER) ─────────────────────
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(cand.name.toUpperCase(), margin, y);
    y += 6;

    doc.setTextColor(37, 99, 235); // Hirly Blue (#2563eb)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(cand.designation || 'Senior Professional', margin, y);
    y += 7;

    // ── 3. CLEAN REPRESENTATION & LOCATION LINE (ZERO RED WARNINGS) ──────────
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600

    const locationStr = cand.city || cand.address || 'Remote / Regional';
    let representationLine = '';

    if (wcEnabled) {
      // Professional Agency Protocol (Zero Red Warnings!)
      representationLine = `${locationStr}  •  Represented by ${branding?.agencyName || 'Agency Partner Network'}`;
    } else {
      const emailStr = cand.email ? ` • ${cand.email}` : '';
      const phoneStr = cand.phone ? ` • ${cand.phone}` : '';
      representationLine = `${locationStr}${emailStr}${phoneStr}`;
    }

    doc.text(representationLine, margin, y);
    y += 12;

    // ── 4. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('EXECUTIVE PROFILE SUMMARY', margin, y);
    y += 3;

    doc.setDrawColor(37, 99, 235); // accent line
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 50, y);
    y += 6;

    const summaryContent = (cand.notes || cand.resumeText || '').trim() || 
      `${cand.name} is a highly accomplished ${cand.designation || 'professional'} with over ${cand.experience || 'several years'} of proven industry experience. Known for driving technical innovation, leading cross-functional teams, and executing strategic initiatives with high quality standards.`;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);

    const splitText = doc.splitTextToSize(summaryContent, contentWidth);
    const summaryLines = splitText.slice(0, 8);
    doc.text(summaryLines, margin, y, { lineHeightFactor: 1.35 });
    y += (summaryLines.length * 4.8) + 8;

    // ── 5. CORE TECHNICAL & FUNCTIONAL COMPETENCIES ─────────────────────────
    if (cand.skills && cand.skills.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('CORE COMPETENCIES & SKILLS', margin, y);
      y += 3;

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(margin, y, margin + 50, y);
      y += 7;

      let skillX = margin;
      cand.skills.slice(0, 12).forEach(skill => {
        const skillWidth = doc.getTextWidth(skill) + 7;
        if (skillX + skillWidth > pageWidth - margin) {
          skillX = margin;
          y += 7;
        }

        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.roundedRect(skillX, y - 4, skillWidth, 6, 1.5, 1.5, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(skill, skillX + 3.5, y);

        skillX += skillWidth + 3.5;
      });
      y += 12;
    }

    // ── 6. CAREER EXPERIENCE & EXECUTIVE OVERVIEW ───────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('PROFESSIONAL OVERVIEW & HIGHLIGHTS', margin, y);
    y += 3;

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 50, y);
    y += 7;

    // Helper to format clean agency values
    const formatValue = (val: string | undefined, fallback: string) => {
      if (!val || val.trim() === '' || val.toLowerCase() === 'none' || val.toLowerCase() === 'n/a') {
        return fallback;
      }
      return val.trim();
    };

    const overviewItems = [
      { label: 'Experience Level', val: formatValue(cand.experience, 'Entry Level') },
      { label: 'Current Company', val: formatValue(cand.currentCompany, 'Confidential Client / Independent') },
      { label: 'Notice Period', val: formatValue(cand.noticePeriod, 'Immediate Availability') },
      { label: 'Compensation Target', val: formatValue(cand.expectedSalary, 'Negotiable / Market Standard') },
      { label: 'Agency Vetting', val: 'Vetted & Highly Recommended' }
    ];

    // Card background for Executive Overview
    const cardY = y;
    const itemHeight = 11;
    const totalOverviewHeight = (overviewItems.length * itemHeight) + (cand.education ? 14 : 6);

    doc.setFillColor(248, 250, 252); // slate-50 background
    doc.setDrawColor(226, 232, 240); // slate-200 border
    doc.roundedRect(margin, cardY, contentWidth, totalOverviewHeight, 3, 3, 'FD');

    let currentItemY = cardY + 7;

    // Render Clean Overview Key-Value Rows (No truncations, No '...')
    overviewItems.forEach(item => {
      // Bullet indicator
      doc.setFillColor(37, 99, 235); // Hirly Blue
      doc.circle(margin + 5, currentItemY - 1.2, 1, 'F');

      // Label (clean navy/slate bold typography, full untruncated name)
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`${item.label}:`, margin + 9, currentItemY);

      // Value (aligned at fixed 48mm offset, full clean text)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(item.val, margin + 48, currentItemY);

      currentItemY += itemHeight;
    });

    // Education / Highest Qualification (Full-width row for long degree text)
    if (cand.education) {
      doc.setFillColor(37, 99, 235);
      doc.circle(margin + 5, currentItemY - 1.2, 1, 'F');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Highest Qualification:', margin + 9, currentItemY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      
      const eduWidth = contentWidth - 52;
      const eduLines = doc.splitTextToSize(cand.education, eduWidth);
      doc.text(eduLines[0], margin + 48, currentItemY);
      currentItemY += 10;
    }

    y = cardY + totalOverviewHeight + 10;

    // ── 7. FOOTER (100% WHITE-LABEL - NO PLATFORM WATERMARKS) ───────────────
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${index + 1} of ${candidates.length}`, pageWidth - margin - 20, pageHeight - 10);
  });

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Convert to Base64 string for API payload
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const filename = candidates.length === 1
    ? `Candidate_Presentation_${candidates[0].name.replace(/\s+/g, '_')}.pdf`
    : `Candidate_Presentation_Package_${candidates.length}_Profiles.pdf`;

  return { blob, blobUrl, base64, filename };
}
