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
   * Generate individual bill for a staff member
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
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL BILL - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Staff info
    const staffInfo = this.getStaffInfo(staffName);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff: ${staffName}`, 15, 35);
    if (staffInfo) {
      doc.text(`ID: ${staffInfo.employeeId}`, 15, 42);
      doc.text(`Salary: ${this.formatCurrency(staffInfo.salary)}`, 15, 49);
    }
    
    // Filter entries for this staff and month
    const staffEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entry.assigned_name === staffName && 
             entryDate.getMonth() === month && 
             entryDate.getFullYear() === year;
    });
    
    // Calculate daily breakdown
    const dailyBreakdown = this.calculateDailyBreakdown(staffEntries, shiftCombinations, hourlyRate);
    
    // Create table data
    const tableData = dailyBreakdown.map(day => [
      day.date,
      day.shift,
      this.formatNumber(day.hours),
      this.formatCurrency(day.amount)
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Shift', 'Hours', 'Amount']],
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
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' }, // Date
        1: { cellWidth: 80, halign: 'left' },   // Shift
        2: { cellWidth: 25, halign: 'center' }, // Hours
        3: { cellWidth: 35, halign: 'right' }   // Amount
      },
      margin: { left: 15, right: 15 },
      theme: 'grid'
    });
    
    // Calculate totals
    const totals = this.calculateTotals(dailyBreakdown);
    
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMMARY:', 15, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Working Days: ${this.formatNumber(totals.totalDays)}`, 15, finalY + 8);
    doc.text(`Total Working Hours: ${this.formatNumber(totals.totalHours)}`, 15, finalY + 16);
    doc.text(`Night Duties: ${totals.nightDuties}`, 15, finalY + 24);
    doc.text(`Night Allowance Hours: ${this.formatNumber(totals.nightAllowanceHours)}`, 15, finalY + 32);
    
    doc.text(`Subtotal: ${this.formatCurrency(totals.subtotal)}`, 15, finalY + 44);
    doc.text(`Night Allowance: ${this.formatCurrency(totals.nightAllowance)}`, 15, finalY + 52);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: ${this.formatCurrency(totals.grandTotal)}`, 15, finalY + 64);
    
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
   * Calculate daily breakdown for staff entries
   */
  private calculateDailyBreakdown(
    entries: RosterEntry[], 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>,
    hourlyRate: number
  ) {
    const breakdown: Array<{
      date: string;
      shift: string;
      hours: number;
      amount: number;
      isNightDuty: boolean;
    }> = [];
    
    entries.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString();
      
      // Map shift types to combinations
      const shiftMapping: Record<string, string> = {
        'Morning Shift (9-4)': '9-4',
        'Evening Shift (4-10)': '4-10',
        'Saturday Regular (12-10)': '12-10',
        'Night Duty': 'N',
        'Sunday/Public Holiday/Special': '9-4'
      };
      
      const shiftId = shiftMapping[entry.shift_type];
      let hours = 0;
      
      if (shiftId) {
        const combination = shiftCombinations.find(combo => combo.id === shiftId);
        if (combination) {
          // For night duty, use 11 hours for payment calculation
          hours = entry.shift_type === 'Night Duty' ? 11 : combination.hours;
        }
      }
      
      const amount = hours * hourlyRate;
      
      breakdown.push({
        date,
        shift: entry.shift_type,
        hours,
        amount,
        isNightDuty: entry.shift_type === 'Night Duty'
      });
    });
    
    // Sort by date
    return breakdown.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  /**
   * Calculate totals from daily breakdown
   */
  private calculateTotals(breakdown: Array<{
    date: string;
    shift: string;
    hours: number;
    amount: number;
    isNightDuty: boolean;
  }>) {
    const totalDays = breakdown.length;
    const totalHours = breakdown.reduce((sum, day) => sum + day.hours, 0);
    const subtotal = breakdown.reduce((sum, day) => sum + day.amount, 0);
    
    // Count night duties
    const nightDuties = breakdown.filter(day => day.isNightDuty).length;
    
    // Calculate night allowance: (number of nights) × 6 × 0.25
    const nightAllowanceHours = nightDuties * 6 * 0.25;
    
    // Calculate night allowance amount (assuming same hourly rate)
    const hourlyRate = totalHours > 0 ? subtotal / totalHours : 0;
    const nightAllowance = nightAllowanceHours * hourlyRate;
    
    const grandTotal = subtotal + nightAllowance;
    
    return {
      totalDays,
      totalHours,
      subtotal,
      nightDuties,
      nightAllowanceHours,
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