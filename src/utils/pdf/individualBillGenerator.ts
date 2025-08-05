import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { getStaffInfo, getStaffSalary } from '../rosterAuth';

export interface IndividualBillOptions {
  staffName: string;
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
}

export class IndividualBillGenerator {
  
  /**
   * Generate individual bill for a specific staff member matching the exact PDF format
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Starting individual bill generation for:', staffName);
    
    // Create PDF document - A4 portrait
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Filter entries for the specific staff member and month
    const staffEntries = this.filterEntriesForStaff(entries, staffName, month, year);
    
    console.log(`📄 Filtered ${staffEntries.length} entries for ${staffName} in ${monthNames[month]} ${year}`);
    
    // Get staff information
    const staffInfo = getStaffInfo(staffName);
    const staffSalary = getStaffSalary(staffName);
    
    // Header - exactly matching the PDF format
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`INDIVIDUAL WORK SUMMARY - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    
    // Staff details section - matching PDF layout
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column
    doc.text('Title:', 20, 50);
    doc.text('Salary:', 20, 58);
    doc.text('Employee ID:', 20, 66);
    doc.text('Name:', 20, 74);
    doc.text('Surname:', 20, 82);
    
    // Right column values
    doc.setFont('helvetica', 'bold');
    doc.text(staffInfo?.title || 'MIT', 60, 50);
    doc.text(staffSalary.toString(), 60, 58);
    doc.text(staffInfo?.employeeId || '', 60, 66);
    doc.text(staffInfo?.firstName || '', 60, 74);
    doc.text(staffInfo?.surname || staffName, 60, 82);
    
    if (staffEntries.length === 0) {
      // Show "No data" message
      doc.setFontSize(14);
      doc.text('No work entries found for this staff member in the selected month', doc.internal.pageSize.getWidth() / 2, 120, { align: 'center' });
      
      // Still show summary with zeros
      this.addSummarySection(doc, 0, 0, 0, 0, hourlyRate, 140);
    } else {
      // Prepare table data - exactly matching PDF format
      const tableData = this.prepareTableData(staffEntries, hourlyRate, shiftCombinations);
      
      // Create table with exact column headers from PDF
      autoTable(doc, {
        startY: 95,
        head: [['Date', 'Day', 'Morning\n(9-4)', 'Saturday\n(12-10)', 'Evening\n(4-10)', 'Night\nDuty', 'Special\n(9-4)', 'Hours', 'Amount (Rs)']],
        body: tableData.rows,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' }, // Date
          1: { cellWidth: 15, halign: 'center' }, // Day
          2: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // Morning (9-4)
          3: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // Saturday (12-10)
          4: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // Evening (4-10)
          5: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // Night Duty
          6: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // Special (9-4)
          7: { cellWidth: 20, halign: 'center' }, // Hours
          8: { cellWidth: 30, halign: 'right' }   // Amount
        },
        margin: { left: 20, right: 20 },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        theme: 'grid',
        tableLineWidth: 0.5,
        tableLineColor: [0, 0, 0]
      });
      
      // Add summary section
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      this.addSummarySection(doc, tableData.totalDays, tableData.totalHours, tableData.totalAmount, tableData.nightDutyCount, hourlyRate, finalY);
    }
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    
    // Generate filename
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
  
  /**
   * Add summary section matching PDF format
   */
  private addSummarySection(doc: jsPDF, totalDays: number, totalHours: number, totalAmount: number, nightDutyCount: number, hourlyRate: number, startY: number): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', 20, startY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // Summary details
    doc.text(`Total Working Days: ${totalDays}`, 20, startY + 15);
    doc.text(`Total Working Hours: ${totalHours.toFixed(1)}`, 20, startY + 25);
    doc.text(`Hourly Rate: ${formatMauritianRupees(hourlyRate).formatted}`, 20, startY + 35);
    doc.text(`Subtotal (Hours): ${formatMauritianRupees(totalAmount).formatted}`, 20, startY + 45);
    
    // Night duty allowance if applicable
    const nightAllowance = nightDutyCount * 500;
    if (nightDutyCount > 0) {
      doc.text(`Night Duty Allowance: ${nightDutyCount} nights × Rs 500 = ${formatMauritianRupees(nightAllowance).formatted}`, 20, startY + 55);
    }
    
    // Grand total
    const grandTotal = totalAmount + nightAllowance;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: ${formatMauritianRupees(grandTotal).formatted}`, 20, startY + (nightDutyCount > 0 ? 70 : 60));
  }
  
  /**
   * Filter roster entries for specific staff member and month
   */
  private filterEntriesForStaff(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): RosterEntry[] {
    return entries.filter(entry => {
      // Check if entry belongs to this staff member (match base names)
      const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
      const staffBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
      
      if (entryBaseName !== staffBaseName) {
        return false;
      }
      
      // Check if entry is in the specified month/year
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
  }
  
  /**
   * Prepare table data by grouping entries by date and combining shifts
   */
  private prepareTableData(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ): {
    rows: string[][];
    totalDays: number;
    totalHours: number;
    totalAmount: number;
    nightDutyCount: number;
  } {
    // Group entries by date
    const entriesByDate = entries.reduce((groups, entry) => {
      const dateKey = entry.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, RosterEntry[]>);
    
    const rows: string[][] = [];
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    
    // Sort dates chronologically
    const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    sortedDates.forEach(dateKey => {
      const dayEntries = entriesByDate[dateKey];
      const date = new Date(dateKey);
      
      // Combine shifts for the same date
      const shifts: string[] = [];
      let dayHours = 0;
      let dayAmount = 0;
      
      dayEntries.forEach(entry => {
        shifts.push(entry.shift_type);
        
        // Count night duties for allowance
        if (entry.shift_type === 'Night Duty') {
          nightDutyCount++;
        }
        
        // Calculate hours and amount for this shift
        const shiftHours = this.getShiftHours(entry.shift_type, shiftCombinations);
        dayHours += shiftHours;
        dayAmount += shiftHours * hourlyRate;
      });
      
      totalHours += dayHours;
      totalAmount += dayAmount;
      
      // Format date and day
      const formattedDate = this.formatDate(dateKey);
      const dayName = this.getDayName(dateKey);
      
      // Create checkmarks for each shift column - using Unicode checkmark
      const morningCheck = shifts.includes('Morning Shift (9-4)') ? String.fromCharCode(10003) : '';
      const saturdayCheck = shifts.includes('Saturday Regular (12-10)') ? String.fromCharCode(10003) : '';
      const eveningCheck = shifts.includes('Evening Shift (4-10)') ? String.fromCharCode(10003) : '';
      const nightCheck = shifts.includes('Night Duty') ? String.fromCharCode(10003) : '';
      const specialCheck = shifts.includes('Sunday/Public Holiday/Special') ? String.fromCharCode(10003) : '';
      
      rows.push([
        formattedDate,
        dayName,
        morningCheck,
        saturdayCheck,
        eveningCheck,
        nightCheck,
        specialCheck,
        dayHours.toFixed(1),
        formatMauritianRupees(dayAmount).formatted
      ]);
    });
    
    return {
      rows,
      totalDays: sortedDates.length,
      totalHours,
      totalAmount,
      nightDutyCount
    };
  }
  
  /**
   * Get hours for a shift type
   */
  private getShiftHours(shiftType: string, shiftCombinations: Array<{id: string, combination: string, hours: number}>): number {
    // Map roster shift types to combination IDs
    const shiftMapping: Record<string, string> = {
      'Morning Shift (9-4)': '9-4',
      'Evening Shift (4-10)': '4-10',
      'Saturday Regular (12-10)': '12-10',
      'Night Duty': 'N',
      'Sunday/Public Holiday/Special': '9-4'
    };
    
    const combinationId = shiftMapping[shiftType];
    if (!combinationId) {
      console.warn(`Unknown shift type: ${shiftType}`);
      return 0;
    }
    
    const combination = shiftCombinations.find(combo => combo.id === combinationId);
    if (!combination) {
      console.warn(`No combination found for shift ID: ${combinationId}`);
      return 0;
    }
    
    return combination.hours;
  }
  
  /**
   * Format date for PDF display (DD/MM/YYYY)
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Get day name for date
   */
  private getDayName(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();