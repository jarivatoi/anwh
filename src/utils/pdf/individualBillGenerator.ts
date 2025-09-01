import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { availableNames, authCodes } from '../utils/rosterAuth';

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
    return `Rs ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
  
  /**
   * Format salary without decimal places
   */
  private formatSalary(value: number): string {
    if (value === 0) return '';
    return `Rs ${value.toLocaleString('en-US')}`;
  }

  /**
   * Generate individual bill for a specific staff member
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Generate content
    await this.generateBillContent(doc, options);
    
    // Generate filename and save
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const filename = `${options.staffName}_${monthNames[options.month]}_${options.year}_Bill.pdf`;
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
  
  /**
   * Generate bill content into provided PDF document (for batch printing)
   */
  async generateBillContent(doc: jsPDF, options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log(`📄 Generating individual bill for ${staffName}`);
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Filter entries for this staff member and month
    const staffEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
      const targetBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
      
      return entryDate.getMonth() === month && 
             entryDate.getFullYear() === year &&
             baseName === targetBaseName;
    });
    
    if (staffEntries.length === 0) {
      throw new Error(`No entries found for ${staffName} in ${monthNames[month]} ${year}`);
    }
    
    // Get staff info
    const staffInfo = this.getStaffInfo(staffName);
    const fullName = staffInfo ? `${staffInfo.firstName || ''} ${staffInfo.surname || staffName}`.trim() : staffName;
    const employeeId = staffInfo?.employeeId || '';
    const salary = staffInfo?.salary || basicSalary;
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - JAWAHARLAL NEHRU HOSPITAL', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL BILL - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Staff details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff Name: ${fullName}`, 15, 40);
    doc.text(`Employee ID: ${employeeId}`, 15, 48);
    doc.text(`Basic Salary: ${this.formatSalary(salary)}`, 15, 56);
    
    // Calculate summary
    const summary = this.calculateStaffSummary(staffEntries, hourlyRate, shiftCombinations);
    
    // Prepare table data
    const tableData = staffEntries.map(entry => [
      this.formatDateForBill(entry.date),
      this.getDayName(entry.date),
      entry.shift_type,
      this.getShiftHours(entry.shift_type, shiftCombinations).toString(),
      this.formatCurrency(this.getShiftHours(entry.shift_type, shiftCombinations) * hourlyRate)
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Day', 'Shift Type', 'Hours', 'Amount']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle'
      },
      margin: { left: 15, right: 15 },
      theme: 'grid'
    });
    
    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMMARY:', 15, finalY);
    doc.text(`Total Hours: ${this.formatNumber(summary.totalHours)}`, 15, finalY + 8);
    doc.text(`Total Amount: ${this.formatCurrency(summary.totalAmount)}`, 15, finalY + 16);
    
    if (summary.nightDutyCount > 0) {
      doc.text(`Night Duties: ${summary.nightDutyCount}`, 15, finalY + 24);
      doc.text(`Night Allowance: ${this.formatCurrency(summary.nightAllowance)}`, 15, finalY + 32);
      doc.text(`GRAND TOTAL: ${this.formatCurrency(summary.grandTotal)}`, 15, finalY + 44);
    }
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = now.getFullYear();
    doc.text(`Generated on: ${day}/${currentMonth}/${currentYear}`, 15, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
  }
  
  /**
   * Calculate summary for individual staff member
   */
  private calculateStaffSummary(
    staffEntries: RosterEntry[],
    hourlyRate: number,
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ) {
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    
    staffEntries.forEach(entry => {
      if (entry.shift_type === 'Night Duty') {
        nightDutyCount++;
      }
      
      const hours = this.getShiftHours(entry.shift_type, shiftCombinations);
      const hoursToUse = entry.shift_type === 'Night Duty' ? 11 : hours;
      totalHours += hoursToUse;
      totalAmount += hoursToUse * hourlyRate;
    });
    
    // Calculate night allowance
    const nightDutyHours = nightDutyCount * 6 * 0.25;
    const nightAllowance = nightDutyHours * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    return {
      totalHours,
      totalAmount,
      nightDutyCount,
      nightDutyHours,
      nightAllowance,
      grandTotal
    };
  }
  
  /**
   * Get hours for a shift type
   */
  private getShiftHours(shiftType: string, shiftCombinations: Array<{id: string, combination: string, hours: number}>): number {
    const shiftMapping: Record<string, string> = {
      'Morning Shift (9-4)': '9-4',
      'Evening Shift (4-10)': '4-10',
      'Saturday Regular (12-10)': '12-10',
      'Night Duty': 'N',
      'Sunday/Public Holiday/Special': '9-4'
    };
    
    const shiftId = shiftMapping[shiftType];
    if (shiftId) {
      const combination = shiftCombinations.find(combo => combo.id === shiftId);
      return combination?.hours || 0;
    }
    
    return 0;
  }
  
  /**
   * Format date for bill display
   */
  private formatDateForBill(dateString: string): string {
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
  
  /**
   * Get staff information from auth codes
   */
  private getStaffInfo(staffName: string) {
    const baseStaffName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
    return authCodes.find(auth => auth.name.toUpperCase() === baseStaffName) || null;
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();