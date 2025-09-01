import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { authCodes } from '../rosterAuth';

export interface IndividualBillOptions {
  month: number;
  year: number;
  entries: RosterEntry[];
  hourlyRate: number;
  staffName: string;
  basicSalary: number;
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
    const filename = `Bill_${options.staffName}_${monthNames[options.month]}_${options.year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
  
  /**
   * Generate bill content into provided PDF document
   */
  async generateBillContent(doc: jsPDF, options: IndividualBillOptions): Promise<void> {
    const { month, year, entries, hourlyRate, staffName, basicSalary, shiftCombinations } = options;
    
    console.log('📄 Generating individual bill for:', staffName);
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - JAWAHARLAL NEHRU HOSPITAL', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL BILL - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Calculate summary for the specific staff member
    const staffSummary = this.calculateStaffSummary(entries, month, year, hourlyRate, staffName, basicSalary, shiftCombinations);
    
    if (!staffSummary) {
      doc.setFontSize(10);
      doc.text('No data found for this staff member in the selected month.', 15, 50);
      return;
    }
    
    // Staff details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff Name: ${staffSummary.fullName}`, 15, 40);
    doc.text(`Employee ID: ${staffSummary.employeeId}`, 15, 48);
    doc.text(`Basic Salary: ${this.formatSalary(staffSummary.salary)}`, 15, 56);
    
    // Prepare detailed entries table
    const filteredEntries = this.filterEntriesForStaff(entries, staffName, month, year);
    const tableData = filteredEntries.map((entry, index) => {
      const entryDate = new Date(entry.date);
      const shiftMapping: Record<string, string> = {
        'Morning Shift (9-4)': '9-4',
        'Evening Shift (4-10)': '4-10',
        'Saturday Regular (12-10)': '12-10',
        'Night Duty': 'N',
        'Sunday/Public Holiday/Special': '9-4'
      };
      
      const shiftId = shiftMapping[entry.shift_type];
      const combination = shiftCombinations.find(combo => combo.id === shiftId);
      const hours = combination ? (entry.shift_type === 'Night Duty' ? 11 : combination.hours) : 0;
      const amount = hours * hourlyRate;
      
      return [
        (index + 1).toString(),
        entryDate.getDate().toString(),
        entry.shift_type,
        this.formatNumber(hours),
        this.formatCurrency(amount)
      ];
    });
    
    // Create detailed entries table
    autoTable(doc, {
      startY: 70,
      head: [['S.No', 'Date', 'Shift Type', 'Hours', 'Amount']],
      body: tableData,
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
        fontSize: 8,
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
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Working Days: ${staffSummary.totalDays}`, 15, finalY + 8);
    doc.text(`Total Hours: ${this.formatNumber(staffSummary.totalHours)}`, 15, finalY + 16);
    doc.text(`Night Duties: ${staffSummary.nightDutyCount}`, 15, finalY + 24);
    doc.text(`Night Allowance Hours: ${this.formatNumber(staffSummary.nightDutyHours)}`, 15, finalY + 32);
    doc.text(`Subtotal: ${this.formatCurrency(staffSummary.totalAmount)}`, 15, finalY + 40);
    doc.text(`Night Allowance: ${this.formatCurrency(staffSummary.nightAllowance)}`, 15, finalY + 48);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: ${this.formatCurrency(staffSummary.grandTotal)}`, 15, finalY + 60);
    
    // Signature section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Certified correct as per annexture:-_________________________', 80, finalY + 100);
    doc.text('(Principal Medical Imaging Technologist):', 95, finalY + 115);
    
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
   * Filter entries for a specific staff member using base name matching
   */
  private filterEntriesForStaff(entries: RosterEntry[], staffName: string, month: number, year: number): RosterEntry[] {
    // Use base name (remove (R) suffix) for matching
    // This ensures both "NARAYYA" and "NARAYYA(R)" entries are included when filtering for either variant
    const baseStaffName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
    
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryBaseStaffName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
      
      return entryDate.getMonth() === month && 
             entryDate.getFullYear() === year && 
             entryBaseStaffName === baseStaffName;
    });
  }
  
  /**
   * Calculate summary for a specific staff member with night allowance
   */
  private calculateStaffSummary(
    entries: RosterEntry[], 
    month: number, 
    year: number, 
    hourlyRate: number, 
    staffName: string,
    basicSalary: number,
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ) {
    // Filter entries for this staff member using base name matching
    const staffEntries = this.filterEntriesForStaff(entries, staffName, month, year);
    
    if (staffEntries.length === 0) {
      return null;
    }
    
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    let nightDutyHours = 0;
    
    staffEntries.forEach(entry => {
      // Count night duties for allowance calculation
      if (entry.shift_type === 'Night Duty') {
        nightDutyCount++;
      }
      
      // Map and calculate hours
      const shiftMapping: Record<string, string> = {
        'Morning Shift (9-4)': '9-4',
        'Evening Shift (4-10)': '4-10',
        'Saturday Regular (12-10)': '12-10',
        'Night Duty': 'N',
        'Sunday/Public Holiday/Special': '9-4'
      };
      
      const shiftId = shiftMapping[entry.shift_type];
      if (shiftId) {
        const combination = shiftCombinations.find(combo => combo.id === shiftId);
        if (combination) {
          // Special case: Night Duty should use 11 hours (since allowances are paid separately)
          const hoursToUse = entry.shift_type === 'Night Duty' ? 11 : combination.hours;
          totalHours += hoursToUse;
          totalAmount += hoursToUse * hourlyRate;
        }
      }
    });
    
    // Calculate night allowance hours: (number of nights) × 6 × 0.25
    nightDutyHours = nightDutyCount * 6 * 0.25;
    
    // Calculate night allowance amount: nightDutyHours × hourly_rate
    const nightAllowance = nightDutyHours * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    // Use base name for staff identification
    const baseStaffName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
    
    // Get staff info for full name, ID, and salary
    const staffInfo = this.getStaffInfo(baseStaffName);
    const fullName = staffInfo ? `${staffInfo.surname || baseStaffName} ${staffInfo.firstName || ''}`.trim() : baseStaffName;
    const employeeId = staffInfo?.employeeId || '';
    const salary = staffInfo?.salary || basicSalary;
    
    return {
      staffName: baseStaffName,
      fullName: fullName,
      employeeId: employeeId,
      salary: salary,
      totalDays: staffEntries.length,
      totalHours,
      totalAmount,
      nightDutyCount,
      nightDutyHours,
      nightAllowance,
      grandTotal
    };
  }
  
  /**
   * Get staff information from auth codes using base name matching
   */
  private getStaffInfo(staffName: string) {
    // Match by base name (remove (R) suffix for matching)
    // This ensures both "NARAYYA" and "NARAYYA(R)" match the same auth code entry
    const baseStaffName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
    return authCodes.find(auth => auth.name.toUpperCase() === baseStaffName) || null;
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();