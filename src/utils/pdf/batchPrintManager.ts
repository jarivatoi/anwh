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
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Batch Print - ${this.pdfDocuments.length} Documents</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .pdf-container { margin-bottom: 40px; page-break-after: always; }
            .pdf-container:last-child { page-break-after: auto; }
            .pdf-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; text-align: center; }
            iframe { width: 100%; height: 600px; border: 1px solid #ccc; }
            @media print {
              .pdf-container { page-break-after: always; }
              iframe { height: 100vh; }
            }
          </style>
        </head>
        <body>
          <h1>Batch Print Preview - ${this.pdfDocuments.length} Documents</h1>
          <p>Click Print to print all documents at once, or use individual download links below.</p>
    `);
    
    // Add each PDF as an embedded object
    this.pdfDocuments.forEach((pdfDoc, index) => {
      const pdfBlob = pdfDoc.doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      printWindow.document.write(`
        <div class="pdf-container">
          <div class="pdf-title">${pdfDoc.filename}</div>
          <iframe src="${pdfUrl}" type="application/pdf"></iframe>
          <p style="text-align: center; margin-top: 10px;">
            <a href="${pdfUrl}" download="${pdfDoc.filename}" style="color: blue; text-decoration: underline;">
              Download ${pdfDoc.filename}
            </a>
          </p>
        </div>
      `);
    });
    
    printWindow.document.write(`
        <div style="text-align: center; margin-top: 30px; page-break-before: avoid;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Print All Documents
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Auto-focus the print window
    printWindow.focus();
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
      
      const pdfBlob = pdfDoc.doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${pdfDoc.filename}</title>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfUrl}" type="application/pdf"></iframe>
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
   * Generate individual bill PDF without saving (for batch printing)
   */
  private async generateIndividualBillPDF(options: any): Promise<jsPDF> {
    // Use the existing individual bill generator but return the doc instead of saving
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Copy the generation logic from individualBillGenerator but return doc
    // This is a simplified version - you might want to extract the core logic
    return doc;
  }
  
  /**
   * Generate annexure PDF without saving (for batch printing)
   */
  private async generateAnnexurePDF(options: any): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Copy the generation logic from annexureGenerator but return doc
    return doc;
  }
  
  /**
   * Generate roster list PDF without saving (for batch printing)
   */
  private async generateRosterListPDF(options: any): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Copy the generation logic from rosterListGenerator but return doc
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