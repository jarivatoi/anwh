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
  combineIntoSinglePDF?: boolean;
}

export interface BatchPrintProgress {
  current: number;
  total: number;
  currentTask: string;
  completed: boolean;
  error?: string;
}

export class BatchPrintManager {
  
  /**
   * Generate a single combined PDF with all reports
   */
  async generateCombinedPDF(
    onProgress?: (progress: BatchPrintProgress) => void
  ): Promise<void> {
    const { month, year, entries, basicSalary, hourlyRate, shiftCombinations, reportTypes, selectedStaff } = options;
    
    
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
    
    // Create a single PDF document for all reports
    const combinedDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Remove the default first page
    combinedDoc.deletePage(1);
    
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
          
          // Add this bill to the combined document
          const pageCount = doc.getNumberOfPages();
          for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            combinedDoc.addPage();
            const pageData = doc.internal.pages[pageNum];
            if (pageData) {
             combinedDoc.internal.pages[combinedDoc.internal.pages.length - 1] = pageData;
            }
          }
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
        
        // Add annexure to the combined document
        const annexurePageCount = doc.getNumberOfPages();
        for (let pageNum = 1; pageNum <= annexurePageCount; pageNum++) {
          combinedDoc.addPage();
          const pageData = doc.internal.pages[pageNum];
          if (pageData) {
            combinedDoc.internal.pages[combinedDoc.internal.pages.length - 1] = pageData;
          }
        }
        
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
        
        // Add roster list to the combined document
        const rosterPageCount = doc.getNumberOfPages();
        for (let pageNum = 1; pageNum <= rosterPageCount; pageNum++) {
          combinedDoc.addPage();
          const pageData = doc.internal.pages[pageNum];
          if (pageData) {
            combinedDoc.internal.pages[combinedDoc.internal.pages.length - 1] = pageData;
          }
        }
      }
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: 'Finalizing combined PDF...',
        completed: false
      });
      
      // Generate filename for combined PDF
      const filename = `Combined_Reports_${monthNames[month]}_${year}.pdf`;
      
      // Download the combined PDF
      combinedDoc.save(filename);
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: `Combined PDF downloaded: ${filename}`,
        completed: true
      });
      
      console.log('✅ Combined PDF generated successfully:', filename);
      
    } catch (error) {
      console.error('❌ Combined PDF generation failed:', error);
      onProgress?.({
        current: currentTask,
        total: totalTasks,
        currentTask: 'Combined PDF generation failed',
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
    
    // Try different printing approaches based on browser capabilities
    if (this.canUseBatchPrint()) {
      await this.printAllAtOnce();
    } else {
      await this.printSequentially();
    }
  }
  
  /**
   * Check if browser supports batch printing
   */
  private canUseBatchPrint(): boolean {
    // Most modern browsers support this, but some mobile browsers don't
    return typeof window.print === 'function' && !this.isMobileBrowser();
  }
  
  /**
   * Check if running on mobile browser
   */
  private isMobileBrowser(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * Print all PDFs at once (modern browsers)
   */
  private async printAllAtOnce(): Promise<void> {
    console.log('📄 Starting combined PDF generation...');
    
    // Wait for window to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    printWindow.document.write(`
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
    
    // Add each PDF as HTML content instead of iframe
    for (let i = 0; i < this.pdfDocuments.length; i++) {
      const pdfDoc = this.pdfDocuments[i];
      
      // Convert PDF to HTML content for better print compatibility
      const htmlContent = await this.convertPdfToHtml(pdfDoc.doc);
      
      printWindow.document.write(`
        <div class="pdf-container">
          <div class="pdf-content">
            ${htmlContent}
          </div>
        </div>
      `);
    }
    
    printWindow.document.write(`
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Auto-focus the print window
    printWindow.focus();
    
    // Auto-trigger print after content loads
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.print();
      }
    }, 1000);
  }
  
  /**
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
    // No cleanup needed for combined PDF approach
    console.log('🧹 Batch print manager cleanup completed');
  }
}

// Create singleton instance
export const batchPrintManager = new BatchPrintManager();