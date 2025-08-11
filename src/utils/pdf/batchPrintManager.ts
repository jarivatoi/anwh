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
    options: BatchPrintOptions,
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
      
      // Open the combined PDF in a new tab for printing
      const pdfBlob = combinedDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new tab for printing
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          // Auto-trigger print dialog after PDF loads
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        // Fallback: download if popup blocked
        combinedDoc.save(filename);
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
   * Generate all PDFs and open them in tabs for printing
   */
  async generateAndPrintBatch(
    options: BatchPrintOptions,
    onProgress?: (progress: BatchPrintProgress) => void
  ): Promise<void> {
    const { month, year, entries, basicSalary, hourlyRate, shiftCombinations, reportTypes, selectedStaff } = options;
    
    console.log('🖨️ Starting batch PDF generation for tab printing...');
    
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
      // Generate individual PDFs and open them in tabs for printing
      if (reportTypes.includes('individual') && reportTypes.includes('annexure') && reportTypes.includes('roster')) {
        // Generate all reports and open them in tabs for printing
        onProgress?.({
          current: 0,
          total: totalTasks,
          currentTask: 'Generating all reports and opening in tabs...',
          completed: false
        });
        
        // Generate and open individual bills in tabs
        if (reportTypes.includes('individual')) {
          const staffList = selectedStaff || this.getUniqueStaffMembers(monthEntries);
          
          for (const staffName of staffList) {
            currentTask++;
            onProgress?.({
              current: currentTask,
              total: totalTasks,
              currentTask: `Opening bill for ${staffName} in new tab`,
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
            
            // Open in new tab for printing
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl, '_blank');
            
            if (printWindow) {
              printWindow.onload = () => {
                setTimeout(() => {
                  printWindow.print();
                }, 1000);
              };
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Generate and open annexure in tab
        if (reportTypes.includes('annexure')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Opening annexure in new tab',
            completed: false
          });
          
          const doc = await this.generateAnnexurePDF({
            month,
            year,
            entries: monthEntries,
            hourlyRate,
            shiftCombinations
          });
          
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(pdfUrl, '_blank');
          
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            };
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Generate and open roster list in tab
        if (reportTypes.includes('roster')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Opening roster list in new tab',
            completed: false
          });
          
          const doc = await this.generateRosterListPDF({
            month,
            year,
            entries: monthEntries
          });
          
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(pdfUrl, '_blank');
          
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            };
          }
        }
        
        onProgress?.({
          current: totalTasks,
          total: totalTasks,
          currentTask: 'All reports opened in tabs for printing',
          completed: true
        });
        
      } else {
        // Generate selected reports individually and open in tabs
        
        if (reportTypes.includes('individual')) {
          const staffList = selectedStaff || this.getUniqueStaffMembers(monthEntries);
          
          for (const staffName of staffList) {
            currentTask++;
            onProgress?.({
              current: currentTask,
              total: totalTasks,
              currentTask: `Opening bill for ${staffName} in new tab`,
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
            
            // Open in new tab for printing
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl, '_blank');
            
            if (printWindow) {
              printWindow.onload = () => {
                setTimeout(() => {
                  printWindow.print();
                }, 1000);
              };
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (reportTypes.includes('annexure')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Opening annexure in new tab',
            completed: false
          });
          
          const doc = await this.generateAnnexurePDF({
            month,
            year,
            entries: monthEntries,
            hourlyRate,
            shiftCombinations
          });
          
          // Open in new tab for printing
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(pdfUrl, '_blank');
          
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            };
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (reportTypes.includes('roster')) {
          currentTask++;
          onProgress?.({
            current: currentTask,
            total: totalTasks,
            currentTask: 'Opening roster list in new tab',
            completed: false
          });
          
          const doc = await this.generateRosterListPDF({
            month,
            year,
            entries: monthEntries
          });
          
          // Open in new tab for printing
          const pdfBlob = doc.output('blob');
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const printWindow = window.open(pdfUrl, '_blank');
          
          if (printWindow) {
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            };
          }
        }
        
        onProgress?.({
          current: totalTasks,
          total: totalTasks,
          currentTask: 'All reports opened in tabs for printing',
          completed: true
        });
      }
      
    } catch (error) {
      console.error('❌ Batch print failed:', error);
      onProgress?.({
        current: currentTask,
        total: totalTasks,
        currentTask: 'Opening PDFs for printing failed',
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
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
    // No cleanup needed for tab-based printing approach
    console.log('🧹 Batch print manager cleanup completed');
  }
}

// Create singleton instance
export const batchPrintManager = new BatchPrintManager();