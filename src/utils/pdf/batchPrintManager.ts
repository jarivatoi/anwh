// Batch PDF printing manager for generating and printing multiple PDFs
import { jsPDF } from 'jspdf';
import { monthlyReportGenerator } from './monthlyReportGenerator';
import { individualBillGenerator } from './individualBillGenerator';
import { annexureGenerator } from './annexureGenerator';
import { rosterListGenerator } from './rosterListGenerator';
import { RosterEntry } from '../../types/roster';

export interface BatchPrintOptions {
  month: number;
  year: number;
  entries: RosterEntry[];
  basicSalary: number;
  hourlyRate: number;
  shiftCombinations: Array<{
    id: string;
    combination: string;
    hours: number;
  }>;
  reportTypes: ('individual' | 'annexure' | 'roster')[];
  selectedStaff?: string[]; // For individual reports only
}

export interface BatchPrintProgress {
  current: number;
  total: number;
  currentTask: string;
  completed: boolean;
  error?: string;
}

export class BatchPrintManager {
  private printWindow: Window | null = null;
  private currentPrintIndex = 0;
  private pdfDocuments: { doc: jsPDF; filename: string }[] = [];
  
  /**
   * Generate all PDFs and prepare for batch printing (opens print window)
   */
  async generateAndPrintBatch(
    options: BatchPrintOptions,
    onProgress?: (progress: BatchPrintProgress) => void
  ): Promise<void> {
    const { month, year, entries, basicSalary, hourlyRate, shiftCombinations, reportTypes, selectedStaff } = options;
    
    console.log('🖨️ Starting batch PDF generation for printing...');
    
    this.pdfDocuments = [];
    this.currentPrintIndex = 0;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Filter entries for the month
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
    
    if (monthEntries.length === 0) {
      throw new Error(`No roster entries found for ${monthNames[month]} ${year}`);
    }
    
    // Calculate total tasks
    let totalTasks = 0;
    if (reportTypes.includes('individual')) {
      const staffList = selectedStaff || this.getUniqueStaffMembers(monthEntries);
      totalTasks += staffList.length;
    }
    if (reportTypes.includes('annexure')) totalTasks += 1;
    if (reportTypes.includes('roster')) totalTasks += 1;
    
    let currentTask = 0;
    
    try {
      // Generate individual bills
      if (reportTypes.includes('individual')) {
        const staffList = selectedStaff || this.getUniqueStaffMembers(monthEntries);
        
        for (const staffName of staffList) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: `Generating bill for ${staffName}`,
            completed: false
          });
          
          const doc = await this.generateIndividualBillPDF({
            staffName,
            month,
            year,
            entries: monthEntries,
            basicSalary,
            hourlyRate,
            shiftCombinations
          });
          
          this.pdfDocuments.push({
            doc,
            filename: `${staffName}_${monthNames[month]}_${year}_Bill.pdf`
          });
          
          // Small delay to prevent browser overwhelm
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Generate annexure
      if (reportTypes.includes('annexure')) {
        currentTask++;
        onProgress?.({
          current: currentTask,
          total: totalTasks,
          currentTask: 'Generating annexure summary',
          completed: false
        });
        
        const doc = await this.generateAnnexurePDF({
          month,
          year,
          entries: monthEntries,
          hourlyRate,
          shiftCombinations
        });
        
        this.pdfDocuments.push({
          doc,
          filename: `Annexure_${monthNames[month]}_${year}.pdf`
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Generate roster list
      if (reportTypes.includes('roster')) {
        currentTask++;
        onProgress?.({
          current: currentTask,
          total: totalTasks,
          currentTask: 'Generating roster list',
          completed: false
        });
        
        const doc = await this.generateRosterListPDF({
          month,
          year,
          entries: monthEntries
        });
        
        this.pdfDocuments.push({
          doc,
          filename: `Roster_List_${monthNames[month]}_${year}.pdf`
        });
      }
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: 'Opening print window...',
        completed: false
      });
      
      // Start batch printing
      await this.startBatchPrinting();
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: 'Print window opened',
        completed: true
      });
      
    } catch (error) {
      console.error('❌ Batch generation failed:', error);
      onProgress?.({
        current: currentTask,
        total: totalTasks,
        currentTask: 'Print preparation failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Generate all PDFs and download them as individual files
   */
  async generateAndDownloadBatch(
    options: BatchPrintOptions,
    onProgress?: (progress: BatchPrintProgress) => void
  ): Promise<void> {
    const { month, year, entries, basicSalary, hourlyRate, shiftCombinations, reportTypes, selectedStaff } = options;
    
    console.log('📥 Starting batch PDF generation for download...');
    
    let currentTask = 0;
    
    // Calculate total tasks
    let totalTasks = 0;
    if (reportTypes.includes('individual')) {
      const staffList = selectedStaff || this.getUniqueStaffMembers(entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === month && entryDate.getFullYear() === year;
      }));
      totalTasks += staffList.length;
    }
    if (reportTypes.includes('annexure')) totalTasks += 1;
    if (reportTypes.includes('roster')) totalTasks += 1;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Filter entries for the month
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
    
    if (monthEntries.length === 0) {
      throw new Error(`No roster entries found for ${monthNames[month]} ${year}`);
    }
    
    try {
      // Use the existing monthly report generator which auto-downloads files
      if (reportTypes.includes('individual') && reportTypes.includes('annexure') && reportTypes.includes('roster')) {
        // Generate all reports
        onProgress?.({
          current: 0,
          total: totalTasks,
          currentTask: 'Generating all reports...',
          completed: false
        });
        
        const result = await monthlyReportGenerator.generateAllReports({
          month,
          year,
          entries,
          basicSalary,
          hourlyRate,
          shiftCombinations
        });
        
        onProgress?.({
          current: totalTasks,
          total: totalTasks,
          currentTask: `Downloaded ${result.individualBills} individual bills, annexure, and roster list`,
          completed: true
        });
        
      } else {
        // Generate selected reports individually
        const { individualBillGenerator } = await import('./individualBillGenerator');
        const { annexureGenerator } = await import('./annexureGenerator');
        const { rosterListGenerator } = await import('./rosterListGenerator');
        
        if (reportTypes.includes('individual')) {
          const staffList = selectedStaff || this.getUniqueStaffMembers(monthEntries);
          
          for (const staffName of staffList) {
            currentTask++;
            onProgress?.({
              current: currentTask,
              total: totalTasks,
              currentTask: `Downloading bill for ${staffName}`,
              completed: false
            });
            
            await individualBillGenerator.generateBill({
              staffName,
              month,
              year,
              entries: monthEntries,
              basicSalary,
              hourlyRate,
              shiftCombinations
            });
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        if (reportTypes.includes('annexure')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Downloading annexure summary',
            completed: false
          });
          
          await annexureGenerator.generateAnnexure({
            month,
            year,
            entries: monthEntries,
            hourlyRate,
            shiftCombinations
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (reportTypes.includes('roster')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Downloading roster list',
            completed: false
          });
          
          await rosterListGenerator.generateRosterList({
            month,
            year,
            entries: monthEntries
          });
        }
        
        onProgress?.({
          current: totalTasks,
          total: totalTasks,
          currentTask: 'All downloads completed',
          completed: true
        });
      }
      
    } catch (error) {
      console.error('❌ Batch download failed:', error);
      onProgress?.({
        current: currentTask,
        total: totalTasks,
        currentTask: 'Download failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Start batch printing process
   */
  async startBatchPrinting(): Promise<void> {
    if (this.pdfDocuments.length === 0) {
      throw new Error('No PDFs to print');
    }
    
    console.log(`🖨️ Starting batch printing of ${this.pdfDocuments.length} PDFs`);
    
    // Try to open print window first
    await this.tryPrintWithPopup();
  }
  
  /**
   * Try to open print window with better popup handling
   */
  private async tryPrintWithPopup(): Promise<void> {
    try {
      // Try to open print window
      this.printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!this.printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }
      
      console.log('🖨️ Print window opened successfully');
      await this.setupPrintWindow();
      
    } catch (error) {
      console.log('🖨️ Print window failed, falling back to downloads');
      // Fallback to downloads
      await this.downloadAllPDFs();
    }
  }
  
  /**
   * Download all PDFs as individual files (fallback when popups are blocked)
   */
  private async downloadAllPDFs(): Promise<void> {
    console.log(`📥 Downloading ${this.pdfDocuments.length} PDFs individually...`);
    
    for (const pdfDoc of this.pdfDocuments) {
      pdfDoc.doc.save(pdfDoc.filename);
      
      // Small delay between downloads to prevent browser overwhelm
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('✅ All PDFs downloaded successfully');
  }
  
  /**
   * Setup the print window with all PDFs
   */
  private async setupPrintWindow(): Promise<void> {
    // Wait for window to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.printWindow!.document.write(`
      <html>
        <head>
          <title>Batch Print - ${this.pdfDocuments.length} Documents</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .pdf-container { margin: 0; padding: 0; page-break-after: always; width: 100%; height: 100vh; }
            .pdf-container:last-child { page-break-after: auto; }
            .pdf-content { width: 100%; height: 100%; border: none; background: white; padding: 0; margin: 0; }
            .header-info { display: block; }
            .print-buttons { display: block; text-align: center; margin: 20px 0; }
            @media print {
              .header-info { display: none !important; }
              .print-buttons { display: none !important; }
              .pdf-container { page-break-after: always; }
              .pdf-content { height: 100vh; width: 100%; margin: 0; padding: 0; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h1>Batch Print Preview - ${this.pdfDocuments.length} Documents</h1>
            <p>Click Print to print all documents. PDFs are embedded as HTML content for better printing compatibility.</p>
          </div>
          <div class="print-buttons">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">
              Print All Documents
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
    `);
    
    console.log('🖨️ Writing PDF content to print window...');
    
    // Add each PDF as HTML content instead of iframe
    for (let i = 0; i < this.pdfDocuments.length; i++) {
      const pdfDoc = this.pdfDocuments[i];
      
      console.log(`🖨️ Converting PDF ${i + 1}/${this.pdfDocuments.length}: ${pdfDoc.filename}`);
      
      // Convert PDF to HTML content for better print compatibility
      const htmlContent = await this.convertPdfToHtml(pdfDoc.doc);
      
      this.printWindow!.document.write(`
        <div class="pdf-container">
          <div class="pdf-content">
            ${htmlContent}
          </div>
        </div>
      `);
    }
    
    this.printWindow!.document.write(`
      </body>
      </html>
    `);
    
    this.printWindow!.document.close();
    console.log('🖨️ Print window document closed');
    
    // Auto-focus the print window
    this.printWindow!.focus();
    console.log('🖨️ Print window focused');
  }
  
  /**
   * Convert PDF document to HTML content for better print compatibility
   */
  private async convertPdfToHtml(doc: jsPDF): Promise<string> {
    try {
      // Get the PDF as data URL
      const pdfDataUrl = doc.output('datauristring');
      
      // Create an embedded PDF object that browsers can print
      return `
        <object data="${pdfDataUrl}" type="application/pdf" width="100%" height="600px">
          <embed src="${pdfDataUrl}" type="application/pdf" width="100%" height="600px" />
          <p>Your browser does not support PDF viewing. 
             <a href="${pdfDataUrl}" download="document.pdf">Download the PDF</a> instead.
          </p>
        </object>
      `;
    } catch (error) {
      console.error('Failed to convert PDF to HTML:', error);
      return '<p>Error loading PDF content. Please try downloading instead.</p>';
    }
  }
  
  /**
   * Print PDFs sequentially (fallback method)
   */
  private async printSequentially(): Promise<void> {
    console.log('🖨️ Using sequential print method');
    
    for (let i = 0; i < this.pdfDocuments.length; i++) {
      const pdfDoc = this.pdfDocuments[i];
      
      // Create individual print window for each PDF
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        console.warn(`Could not open print window for ${pdfDoc.filename}`);
        continue;
      }
      
      const pdfDataUrl = pdfDoc.doc.output('datauristring');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${pdfDoc.filename}</title>
            <style>
              body { margin: 0; padding: 0; }
              object, embed { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <object data="${pdfDataUrl}" type="application/pdf" width="100%" height="100%">
              <embed src="${pdfDataUrl}" type="application/pdf" width="100%" height="100%" />
              <p>PDF cannot be displayed. <a href="${pdfDataUrl}" download="${pdfDoc.filename}">Download instead</a></p>
            </object>
            <script>
              window.onload = function() {
                setTimeout(function() {
   * Generate individual bill PDF for batch printing
   */
  private async generateIndividualBillPDF(options: {
    staffName: string;
    month: number;
    year: number;
    entries: RosterEntry[];
    basicSalary: number;
    hourlyRate: number;
    shiftCombinations: Array<{id: string, combination: string, hours: number}>;
  }): Promise<jsPDF> {
    const { individualBillGenerator } = await import('./individualBillGenerator');
    
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Generate the bill content using the existing generator logic
    await individualBillGenerator.generateBillContent(doc, options);
    
    return doc;
  }
  
  /**
   * Generate annexure PDF for batch printing
   */
  private async generateAnnexurePDF(options: {
    month: number;
    year: number;
    entries: RosterEntry[];
    hourlyRate: number;
    shiftCombinations: Array<{id: string, combination: string, hours: number}>;
  }): Promise<jsPDF> {
    const { annexureGenerator } = await import('./annexureGenerator');
    
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Generate the annexure content using the existing generator logic
    await annexureGenerator.generateAnnexureContent(doc, options);
    
    return doc;
  }
  
  /**
   * Generate roster list PDF for batch printing
   */
  private async generateRosterListPDF(options: {
    month: number;
    year: number;
    entries: RosterEntry[];
  }): Promise<jsPDF> {
    const { rosterListGenerator } = await import('./rosterListGenerator');
    
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Generate the roster list content using the existing generator logic
    await rosterListGenerator.generateRosterListContent(doc, options);
    
    return doc;
  }
  
  /**
   * Get unique staff members from entries (base names only)
   */
  private getUniqueStaffMembers(entries: RosterEntry[]): string[] {
    const staffSet = new Set<string>();
    
    entries.forEach(entry => {
      // Use base name (remove (R) suffix) since they are the same person
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
      staffSet.add(baseName);
    });
    
    return Array.from(staffSet).sort();
  }
  
  /**
   * Download all PDFs as individual files
   */
  private async downloadAllPDFs(): Promise<void> {
    console.log(`📥 Downloading ${this.pdfDocuments.length} PDFs individually...`);
    
    for (const pdfDoc of this.pdfDocuments) {
      pdfDoc.doc.save(pdfDoc.filename);
      
      // Small delay between downloads to prevent browser overwhelm
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('✅ All PDFs downloaded successfully');
  }
  
  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.printWindow && !this.printWindow.closed) {
      this.printWindow.close();
    }
    
    // Clean up blob URLs
    this.pdfDocuments.forEach(pdfDoc => {
      // URLs will be cleaned up automatically by browser
    });
    
    this.pdfDocuments = [];
    this.currentPrintIndex = 0;
  }
}

// Create singleton instance
export const batchPrintManager = new BatchPrintManager();
      )
    }
  }
}
      )
    }
  }
}
      )
    }
  }
}