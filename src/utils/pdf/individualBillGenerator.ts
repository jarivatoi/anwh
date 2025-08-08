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
   * Format number without trailing zeros and hide if zero
   */
  private formatNumber(value: number): string {
    if (value === 0) return '';
    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
  }
  
  /**
   * Format currency without trailing zeros and hide if zero
   */
  private formatCurrency(value: number): string {
    if (value === 0) return '';
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    return `Rs ${formatted}`;
  }

  /**
   * Generate individual bill for a specific staff member
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
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL BILL - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Staff details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff: ${staffInfo?.firstName || ''} ${staffInfo?.surname || staffName}`, 15, 35);
    doc.text(`Employee ID: ${staffInfo?.employeeId || ''}`, 15, 42);
    doc.text(`Title: ${staffInfo?.title || 'MIT'}`, 15, 49);
    doc.text(`Salary: Rs ${(staffInfo?.salary || 0).toLocaleString()}`, 15, 56);
    doc.text(`Hourly Rate: Rs ${hourlyRate.toFixed(2)}`, 15, 63);
    
    // Prepare table data
    const tableData = this.prepareTableData(staffEntries, hourlyRate, shiftCombinations);
    
    // Create table
    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Shift Type', 'Hours', 'Amount']],
      body: tableData.rows,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' }, // Date
        1: { cellWidth: 60, halign: 'left' },   // Shift Type
        2: { cellWidth: 25, halign: 'center' }, // Hours
        3: { cellWidth: 30, halign: 'right' }   // Amount
      },
      margin: { left: 15, right: 15 },
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0]
    });
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    this.addSummary(doc, tableData.totalHours, tableData.nightDutyCount, hourlyRate, finalY);
    
    // Save
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
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
   * Prepare table data with Date, Shift Type, Hours, Amount columns
   */
  private prepareTableData(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ): {
    rows: string[][];
    totalHours: number;
    nightDutyCount: number;
  } {
    // Sort entries by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let totalHours = 0;
    let nightDutyCount = 0;
    
    const rows = sortedEntries.map(entry => {
      // Get hours for this shift
      const hours = this.getShiftHours(entry.shift_type, shiftCombinations);
      const amount = hours * hourlyRate;
      
      totalHours += hours;
      
      // Count night duties
      if (entry.shift_type === 'Night Duty') {
        nightDutyCount++;
      }
      
      return [
        this.formatDate(entry.date),
        entry.shift_type,
        this.formatNumber(hours),
        this.formatCurrency(amount)
      ];
    });
    
    return {
      rows,
      totalHours,
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
    
    // Special case: Night Duty should use 11 hours (since allowances are paid separately)
    if (shiftType === 'Night Duty') {
      return 11;
    }
    
    const combination = shiftCombinations.find(combo => combo.id === combinationId);
    if (!combination) {
      console.warn(`No combination found for shift ID: ${combinationId}`);
      return 0;
    }
    
    return combination.hours;
  }
  
  /**
   * Format date for PDF display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Add summary section
   */
  private addSummary(doc: jsPDF, totalHours: number, nightDutyCount: number, hourlyRate: number, startY: number): void {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', 15, startY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Calculate amounts
    const totalAmount = totalHours * hourlyRate;
    const nightAllowanceHours = nightDutyCount * 6 * 0.25;
    const nightAllowance = nightAllowanceHours * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    // Summary details
    doc.text(`Total Hours: ${this.formatNumber(totalHours)}`, 15, startY + 8);
    doc.text(`Subtotal: ${this.formatCurrency(totalAmount)}`, 15, startY + 15);
    
    if (nightDutyCount > 0) {
      doc.text(`Night Allowance: ${nightDutyCount} nights × 1.5h = ${this.formatCurrency(nightAllowance)}`, 15, startY + 22);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${this.formatCurrency(grandTotal)}`, 15, startY + 29);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: ${this.formatCurrency(totalAmount)}`, 15, startY + 22);
    }
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();