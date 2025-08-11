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
  printWindow?: Window;
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
   * Generate a single combined PDF with all reports
   */
  async generateCombinedPDF(
    options: BatchPrintOptions,
    onProgress?: (progress: BatchPrintProgress) => void
  ): Promise<void> {
    const { month, year, entries, basicSalary, hourlyRate, shiftCombinations, reportTypes, selectedStaff, printWindow } = options;
    
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
          
          // Add new page for this bill
          combinedDoc.addPage();
          
          // Generate content directly into the combined document
          await individualBillGenerator.generateBillContent(combinedDoc, {
            staffName,
            month,
            year,
            entries: monthEntries,
            basicSalary,
            hourlyRate,
            shiftCombinations
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
        
        // Add new page for annexure
        combinedDoc.addPage();
        
        await annexureGenerator.generateAnnexureContent(combinedDoc, {
          month,
          year,
          entries: monthEntries,
          hourlyRate,
          shiftCombinations
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
        
        // Add new page for roster list
        combinedDoc.addPage();
        
        await rosterListGenerator.generateRosterListContent(combinedDoc, {
          month,
          year,
          entries: monthEntries
        });
      }
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: 'Finalizing combined PDF...',
        completed: false
      });
      
      // Generate filename for combined PDF
      const filename = `Combined_Reports_${monthNames[month]}_${year}.pdf`;
      
      // Open the combined PDF in the provided window for printing
      const pdfBlob = combinedDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      if (printWindow) {
        // Use the provided print window and load the PDF
        printWindow.location.href = pdfUrl;
        printWindow.onload = () => {
          // Auto-trigger print dialog after PDF loads
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        throw new Error('Print window was not provided');
      }
      
      onProgress?.({
        current: totalTasks,
        total: totalTasks,
        currentTask: `Combined PDF opened for printing: ${filename}`,
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
    console.log('🖨️ Using batch print method');
    
    // Create a combined print window with all PDFs
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Could not open print window. Please allow popups.');
    }
    
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
                  window.print();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait between prints to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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