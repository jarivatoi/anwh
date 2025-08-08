import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { availableNames } from '../rosterAuth';

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
   * Format currency without trailing zeros and hide if zero
   */
  private formatCurrency(value: number): string {
    if (value === 0) return '';
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    return `Rs ${formatted}`;
  }

  /**
   * Generate individual bill for a staff member
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log(`📄 Generating individual bill for ${staffName}`);
    
    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Filter entries for this staff member and month
    const staffEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entry.assigned_name === staffName && 
             entryDate.getMonth() === month && 
             entryDate.getFullYear() === year;
    });
    
    if (staffEntries.length === 0) {
      throw new Error(`No entries found for ${staffName} in ${monthNames[month]} ${year}`);
    }
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL BILL - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Staff info
    const staffInfo = this.getStaffInfo(staffName);
    const fullName = staffInfo ? `${staffInfo.surname || staffName} ${staffInfo.firstName || ''}`.trim() : staffName;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff: ${fullName}`, 15, 40);
    doc.text(`Employee ID: ${staffInfo?.employeeId || ''}`, 15, 48);
    doc.text(`Basic Salary: ${this.formatCurrency(staffInfo?.salary || 0)}`, 15, 56);
    
    // Calculate totals
    const summary = this.calculateStaffSummary(staffEntries, hourlyRate, shiftCombinations);
    
    // Prepare table data
    const tableData = staffEntries.map((entry, index) => {
      const date = new Date(entry.date);
      const shiftHours = this.getShiftHours(entry.shift_type, shiftCombinations);
      const amount = shiftHours * hourlyRate;
      
      return [
        (index + 1).toString(),
        date.toLocaleDateString(),
        entry.shift_type,
        shiftHours.toString(),
        this.formatCurrency(amount)
      ];
    });
    
    // Create table
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
        fontSize: 9,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      },
      margin: { left: 15, right: 15 },
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0]
    });
    
    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMMARY:', 15, finalY);
    doc.text(`Total Days: ${summary.totalDays}`, 15, finalY + 8);
    doc.text(`Total Hours: ${summary.totalHours}`, 15, finalY + 16);
    doc.text(`Hours Amount: ${this.formatCurrency(summary.totalAmount)}`, 15, finalY + 24);
    
    if (summary.nightDutyCount > 0) {
      doc.text(`Night Duties: ${summary.nightDutyCount}`, 15, finalY + 32);
      doc.text(`Night Allowance: ${this.formatCurrency(summary.nightAllowance)}`, 15, finalY + 40);
    }
    
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: ${this.formatCurrency(summary.grandTotal)}`, 15, finalY + 52);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    
    // Save
    const cleanStaffName = staffName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanStaffName}_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log(`✅ Individual bill generated: ${filename}`);
  }
  
  /**
   * Get shift hours, using 11 for night duty
   */
  private getShiftHours(shiftType: string, shiftCombinations: Array<{id: string, combination: string, hours: number}>): number {
    // Special case: Night Duty should show 11 hours (since allowances are paid separately)
    if (shiftType === 'Night Duty') {
      return 11;
    }
    
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
      if (combination) {
        return combination.hours;
      }
    }
    
    return 0;
  }
  
  /**
   * Calculate summary for staff member
   */
  private calculateStaffSummary(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ) {
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    
    entries.forEach(entry => {
      if (entry.shift_type === 'Night Duty') {
        nightDutyCount++;
      }
      
      const hours = this.getShiftHours(entry.shift_type, shiftCombinations);
      totalHours += hours;
      totalAmount += hours * hourlyRate;
    });
    
    // Calculate night allowance: (number of nights) × 6 × 0.25 × hourly_rate
    const nightAllowanceHours = nightDutyCount * 6 * 0.25;
    const nightAllowance = nightAllowanceHours * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    return {
      totalDays: entries.length,
      totalHours,
      totalAmount,
      nightDutyCount,
      nightAllowance,
      grandTotal
    };
  }
  
  /**
   * Get staff information from auth codes
   */
  private getStaffInfo(staffName: string) {
    const authCodes = [
      { code: 'B165', name: 'BHEKUR', title: 'MIT', salary: 47510, employeeId: 'B16048123000915', firstName: 'Yashdev', surname: 'BHEKUR' },
      { code: 'B196', name: 'BHOLLOORAM', title: 'MIT', salary: 47510, employeeId: 'B19118118005356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
      { code: 'D28B', name: 'DHUNNY', title: 'MIT', salary: 30060, employeeId: '0280876127778', firstName: 'Leetarvind', surname: 'DHUNNY' },
      { code: 'D07D', name: 'DOMUN', title: 'SMIT', salary: 59300, employeeId: 'D07027340003110', firstName: 'Shamir', surname: 'DOMUN' },
      { code: 'H301', name: 'FOKEERCHAND', title: 'MIT', salary: 37185, employeeId: 'H30038612000061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
      { code: 'S069', name: 'GHOORAN', title: 'MIT', salary: 38010, employeeId: 'S06781460103939', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
      { code: 'H13D', name: 'HOSENBUX', title: 'MIT', salary: 48810, employeeId: 'H13038118012901', firstName: 'Zameer', surname: 'HOSENBUX' },
      { code: 'J149', name: 'JUMMUN', title: 'MIT', salary: 47510, employeeId: 'J14037926000909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
      { code: 'M17G', name: 'MAUDHOO', title: 'MIT', salary: 38010, employeeId: 'M17038026006966', firstName: 'Chandanee', surname: 'MAUDHOO' },
      { code: 'N28C', name: 'NARAYYA', title: 'MIT', salary: 38010, employeeId: 'N28088124016266', firstName: 'Viraj', surname: 'NARAYYA' },
      { code: 'P09A', name: 'PITTEA', title: 'SMIT', salary: 59300, employeeId: 'P09117119004134', firstName: 'Pokhiraj', surname: 'PITTEA' },
      { code: 'R16G', name: 'RUNGADOO', title: 'SMIT', salary: 59300, employeeId: 'R21057240011866', firstName: 'Manee', surname: 'RUNGADOO' },
      { code: 'T16G', name: 'TEELUCK', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
      { code: 'V160', name: 'VEERASAWMY', title: 'SMIT', salary: 59300, employeeId: 'V16046642044100', firstName: 'Goindah', surname: 'VEERASAWMY' },
      
      // Radiographers (R) - same data as regular staff
      { code: 'B16R', name: 'BHEKUR(R)', title: 'MIT', salary: 47510, employeeId: 'B16048123000915', firstName: 'Yashdev', surname: 'BHEKUR' },
      { code: 'B19R', name: 'BHOLLOORAM(R)', title: 'MIT', salary: 47510, employeeId: 'B19118118005356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
      { code: 'D28R', name: 'DHUNNY(R)', title: 'MIT', salary: 30060, employeeId: '0280876127778', firstName: 'Leetarvind', surname: 'DHUNNY' },
      { code: 'D07R', name: 'DOMUN(R)', title: 'SMIT', salary: 59300, employeeId: 'D07027340003110', firstName: 'Shamir', surname: 'DOMUN' },
      { code: 'H30R', name: 'FOKEERCHAND(R)', title: 'MIT', salary: 37185, employeeId: 'H30038612000061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
      { code: 'H13R', name: 'HOSENBUX(R)', title: 'MIT', salary: 48810, employeeId: 'H13038118012901', firstName: 'Zameer', surname: 'HOSENBUX' },
      { code: 'S06R', name: 'GHOORAN(R)', title: 'MIT', salary: 38010, employeeId: 'S06781460103939', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
      { code: 'J14R', name: 'JUMMUN(R)', title: 'MIT', salary: 47510, employeeId: 'J14037926000909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
      { code: 'M17R', name: 'MAUDHOO(R)', title: 'MIT', salary: 38010, employeeId: 'M17038026006966', firstName: 'Chandanee', surname: 'MAUDHOO' },
      { code: 'N28R', name: 'NARAYYA(R)', title: 'MIT', salary: 38010, employeeId: 'N28088124016266', firstName: 'Viraj', surname: 'NARAYYA' },
      { code: 'P09R', name: 'PITTEA(R)', title: 'SMIT', salary: 59300, employeeId: 'P09117119004134', firstName: 'Pokhiraj', surname: 'PITTEA' },
      { code: 'R21R', name: 'RUNGADOO(R)', title: 'SMIT', salary: 59300, employeeId: 'R21057240011866', firstName: 'Manee', surname: 'RUNGADOO' },
      { code: 'T16R', name: 'TEELUCK(R)', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
      { code: 'V16R', name: 'VEERASAWMY(R)', title: 'SMIT', salary: 59300, employeeId: 'V16046642044100', firstName: 'Goindah', surname: 'VEERASAWMY' }
    ];
    
    return authCodes.find(auth => auth.name === staffName) || null;
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();