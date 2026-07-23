export interface ParsePdfResult {
  isScanned: boolean;
  file: File | Blob;
  fileName: string;
  textContent: string;
  confidenceScore?: number;
  docType?: 'Resume' | 'Invoice' | 'Aadhaar' | 'Offer Letter' | 'Other';
}

export function evaluateDocumentFootprint(text: string, fileName: string = ''): { score: number; docType: 'Resume' | 'Invoice' | 'Aadhaar' | 'Offer Letter' | 'Other' } {
  const combined = (fileName + ' ' + text).toLowerCase();
  
  const hasContact = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(combined) || /[0-9]{7,}/.test(combined) || combined.includes('linkedin.com') || combined.includes('github.com');
  const hasExperience = combined.includes('experience') || combined.includes('employment') || combined.includes('work history') || combined.includes('career summary');
  const hasEducation = combined.includes('education') || combined.includes('qualification') || combined.includes('degree') || combined.includes('university') || combined.includes('college');
  const hasSkills = combined.includes('skills') || combined.includes('technologies') || combined.includes('proficiencies') || combined.includes('competencies') || combined.includes('projects');
  const hasDates = /[2][0][0-9]{2}\s*[-–\s]\s*([2][0][0-9]{2}|present|current)/i.test(combined);

  let score = 30;
  if (hasContact) score += 20;
  if (hasExperience) score += 25;
  if (hasEducation) score += 20;
  if (hasSkills) score += 20;
  if (hasDates) score += 15;

  if (fileName.toLowerCase().includes('resume') || fileName.toLowerCase().includes('cv')) {
    score += 15;
  }

  let docType: 'Resume' | 'Invoice' | 'Aadhaar' | 'Offer Letter' | 'Other' = 'Resume';
  const isInvoice = (combined.includes('invoice #') || combined.includes('bill to') || combined.includes('total due') || combined.includes('payment terms') || combined.includes('vat id') || combined.includes('subtotal')) && !hasExperience && !hasEducation;

  if (isInvoice) {
    docType = 'Invoice';
    score = 10;
  } else if (combined.includes('aadhaar') || combined.includes('passport no') || combined.includes('driver license')) {
    docType = 'Aadhaar';
    score = 15;
  } else if (combined.includes('offer letter') || combined.includes('joining letter')) {
    docType = 'Offer Letter';
    score = 40;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    docType
  };
}

export async function processPdfFile(file: File): Promise<ParsePdfResult> {
  try {
    // Dynamically import pdfjs-dist only in the browser context at runtime
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source to unpkg matching the version installed
    const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    
    // Fetch and create a blob URL to bypass CORS/cross-origin worker restrictions
    const workerRes = await fetch(workerUrl);
    const workerBlob = await workerRes.blob();
    const blobUrl = URL.createObjectURL(workerBlob);
    pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl;

    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let totalText = '';
    
    // Loop through all pages to extract text content
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      totalText += pageText + '\n';
    }

    // If text is not empty, it's a standard PDF
    if (totalText.trim().length > 0) {
      const evalResult = evaluateDocumentFootprint(totalText, file.name);
      return {
        isScanned: false,
        file,
        fileName: file.name,
        textContent: totalText,
        confidenceScore: evalResult.score,
        docType: evalResult.docType
      };
    }

    // Otherwise, it is a scanned PDF (image-only). Render Page 1 to canvas.
    console.log('[Client PDF Parser] PDF text is empty. Rendering Page 1 to canvas for OCR fallback...');
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    
    // Create a canvas dynamically
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport,
      canvas: canvas
    } as any).promise;

    // Convert canvas to Blob
    return new Promise<ParsePdfResult>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to PNG blob'));
          return;
        }
        resolve({
          isScanned: true,
          file: blob,
          fileName: file.name.replace(/\.pdf$/i, '.png'),
          textContent: ''
        });
      }, 'image/png');
    });
  } catch (err: any) {
    console.error('[Client PDF Parser] Error processing PDF:', err.message);
    // If pdfjs fails to load or parse, fallback to treating the file as-is
    return {
      isScanned: false,
      file,
      fileName: file.name,
      textContent: ''
    };
  }
}
