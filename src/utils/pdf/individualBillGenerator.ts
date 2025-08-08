import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { availableNames } from '../rosterAuth';

export interface IndividualBillOptions {
  staffName: string;
  basicSalary: number;
  month: number;
  year: number;
  entries: RosterEntry[];
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
    
    console.log(`📄 Generating individual bill for ${staffName}`);
    
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
    const staffEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
      const targetBaseName = staffName.replace(/\(R\)$/, '').trim();
      return entryDate.getMonth() === month && 
             entryDate.getFullYear() === year && 
             baseName === targetBaseName;
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
    
    // Staff information
    const staffInfo = this.getStaffInfo(staffName);
    const fullName = staffInfo ? `${staffInfo.surname || staffName} ${staffInfo.firstName || ''}`.trim() : staffName;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff Name: ${fullName}`, 15, 40);
    doc.text(`Employee ID: ${staffInfo?.employeeId || 'N/A'}`, 15, 48);
    doc.text(`Basic Salary: ${this.formatCurrency(basicSalary)}`, 15, 56);
    
    // Calculate staff summary
    const summary = this.calculateStaffSummary(staffEntries, hourlyRate, shiftCombinations);
    
    // Prepare detailed entries table
    const tableData = staffEntries.map(entry => {
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
      const hours = entry.shift_type === 'Night Duty' ? 11 : (combination?.hours || 0);
      const amount = hours * hourlyRate;
      
      return [
        entryDate.toLocaleDateString('en-GB'),
        entry.shift_type,
        this.formatNumber(hours),
        this.formatCurrency(amount)
      ];
    });
    
    // Create detailed entries table
    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Shift Type', 'Hours', 'Amount']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' }, // Date
        1: { cellWidth: 80, halign: 'left' },   // Shift Type
        2: { cellWidth: 25, halign: 'center' }, // Hours
        3: { cellWidth: 30, halign: 'right' }   // Amount
      },
      margin: { left: 15, right: 15 },
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0]
    });
    
    // Summary section
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SUMMARY:', 15, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Working Days: ${summary.totalDays}`, 15, finalY + 10);
    doc.text(`Total Hours: ${this.formatNumber(summary.totalHours)}`, 15, finalY + 18);
    doc.text(`Regular Amount: ${this.formatCurrency(summary.totalAmount)}`, 15, finalY + 26);
    
    if (summary.nightDutyCount > 0) {
      doc.text(`Night Duties: ${summary.nightDutyCount}`, 15, finalY + 34);
      doc.text(`Night Allowance Hours: ${this.formatNumber(summary.nightDutyHours)}`, 15, finalY + 42);
      doc.text(`Night Allowance Amount: ${this.formatCurrency(summary.nightAllowance)}`, 15, finalY + 50);
    }
    
    // Grand total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const grandTotalY = summary.nightDutyCount > 0 ? finalY + 62 : finalY + 38;
    doc.text(`GRAND TOTAL: ${this.formatCurrency(summary.grandTotal)}`, 15, grandTotalY);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    
    // Save
    const filename = `${staffName.replace(/[^a-zA-Z0-9]/g, '_')}_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log(`✅ Individual bill generated: ${filename}`);
  }
  
  /**
   * Calculate summary for a specific staff member
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
    const nightDutyHours = nightDutyCount * 6 * 0.25;
    
    // Calculate night allowance amount: nightDutyHours × hourly_rate
    const nightAllowance = nightDutyHours * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    return {
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
   * Get staff information from auth codes
   */
  private getStaffInfo(staffName: string) {
    // Import auth codes to get staff details
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