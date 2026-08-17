/**
 * Export Service - handles PDF and JSON export functionality
 */

import { ResumeData } from '../types';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface Html2PdfModule {
  default: any;
}

export class ExportService {
  private html2pdfInstance: any | null = null;
  private cacheTimestamp: number = 0;

  /**
   * Export resume data as JSON file
   */
  public exportToJson(data: ResumeData): void {
    if (!data.personal?.name) {
      throw new Error('Invalid resume data for export');
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    try {
      const a = document.createElement('a');
      a.href = url;
      const safeName = data.personal.name.replace(/\s+/g, '-').toLowerCase();
      a.download = `resume-${safeName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Export resume container as PDF using html2pdf.js with lazy loading
   */
  public async exportToPdf(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    
    if (!container) {
      throw new Error('Resume container not found in the DOM');
    }

    await this.loadHtml2Pdf();

    if (!this.html2pdfInstance) {
      throw new Error('Failed to load html2pdf library');
    }

    // Wait for fonts and images to load
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add PDF export mode class for proper page break styling
    document.body.classList.add('pdf-export-mode');

    try {
      await this.html2pdf()
        .set({
          margin: [0, 0, 0, 0],
          filename: 'resume.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            letterRendering: true,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            scrollY: 0
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            hotfixes: ['PAGE_BREAK']
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: '.avoid-page-break'
          }
        })
        .from(container)
        .save();
    } finally {
      // Remove PDF export mode class after export
      document.body.classList.remove('pdf-export-mode');
    }
  }

  /**
   * Lazy load html2pdf.js with caching
   */
  private async loadHtml2Pdf(): Promise<void> {
    const now = Date.now();
    
    // Return cached instance if still valid
    if (this.html2pdfInstance && (now - this.cacheTimestamp) < CACHE_TTL) {
      return;
    }

    try {
      const module = await import('html2pdf.js') as Html2PdfModule;
      if (module.default) {
        this.html2pdfInstance = module.default;
        this.cacheTimestamp = now;
      } else {
        throw new Error('html2pdf default export not found');
      }
    } catch (error) {
      throw new Error('Failed to load PDF export library');
    }
  }

  private html2pdf(): any {
    if (!this.html2pdfInstance) {
      throw new Error('html2pdf not loaded');
    }
    // Вызываем функцию html2pdf без контекста, чтобы она вернула правильный объект
    return this.html2pdfInstance();
  }
}
