import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { availableNames } from '../rosterAuth';

export interface AnnexureOptions {
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

export class AnnexureGenerator {
  
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
   * Generate annexure matching the exact PDF format
   */
  async generateAnnexure(options: AnnexureOptions): Promise<void> {
    const { month, year, entries, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Generating annexure for all staff');
    
    // Create PDF document - A4 portrait to match the original
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Header - matching the original format
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`ANNEXURE - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    // Calculate summary for all staff
    const staffSummaries = this.calculateStaffSummaries(entries, month, year, hourlyRate, shiftCombinations);
    
    // Prepare table data - matching the PDF format exactly
    const tableData = staffSummaries.map((summary, index) => [
      (index + 1).toString(), // Serial number
      summary.fullName, // Full name instead of staff name
      summary.employeeId, // ID number
      this.formatCurrency(summary.salary), // Salary
      this.formatNumber(summary.totalHours), // Hours payable (without night allowance)
      this.formatNumber(summary.nightDutyHours), // Night allowance hours
      this.formatCurrency(summary.grandTotal)
    ]);
    
    // Create table matching the original format
    autoTable(doc, {
      startY: 35,
      head: [['S.No', 'NAME (Full Name)', 'ID NUMBER', 'SALARY', 'NO OF HRS PAYABLE (Hrs)', 'NIGHT ALLOWANCE (Hrs)', 'AMOUNT']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
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
        cellPadding: 3.5,
        minCellHeight: 20
        0: { cellWidth: 15, halign: 'center' }, // S.No
        1: { cellWidth: 40, halign: 'left' },   // NAME (Full Name)
        2: { cellWidth: 35, halign: 'center' }, // ID NUMBER
        3: { cellWidth: 25, halign: 'right' },  // SALARY
        4: { cellWidth: 25, halign: 'center' }, // NO OF HRS PAYABLE
        5: { cellWidth: 25, halign: 'center' }, // NIGHT ALLOWANCE (Hrs)
        6: { cellWidth: 30, halign: 'right' }   // AMOUNT
      },
      margin: { left: 8, right: 8 },
    }
    )
    const grandNightDutyHours = staffSummaries.reduce((sum, s) => sum + s.nightDutyHours, 0);
    const grandSubtotal = staffSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
    const grandNightAllowance = staffSummaries.reduce((sum, s) => sum + s.nightAllowance, 0);
    const grandTotal = staffSummaries.reduce((sum, s) => sum + s.grandTotal, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Grand totals row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTALS:', 15, finalY);
    doc.text(`Total Salary: ${this.formatCurrency(grandTotalSalary)}`, 15, finalY + 8);
    doc.text(`Total Hours Payable: ${this.formatNumber(grandTotalHours)}`, 15, finalY + 16);
    doc.text(`Total Night Allowance Hours: ${this.formatNumber(grandNightDutyHours)}`, 15, finalY + 24);
    
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL AMOUNT: ${this.formatCurrency(grandTotal)}`, 15, finalY + 36);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray AN WH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    // Add certification section at the bottom
    const certificationY = finalY + 50;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Certified Correct as per Attendance.', 15, certificationY);
    doc.text('Principal Medical Imaging Technologist', 15, certificationY + 10);
    
    // Signature line
    doc.text('Signature: ________________________________', 15, certificationY + 25);
    doc.text('Date: ____________________', 15, certificationY + 35);
    
    // Save
    const filename = `Annexure_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Annexure generated:', filename);
  }
  
  
  /**
   * Calculate summaries for all staff with night allowance
   */
  private calculateStaffSummaries(
    entries: RosterEntry[], 
    month: number, 
    year: number, 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ) {
    const staffSummaries: Array<{
      staffName: string;
      fullName: string;
      employeeId: string;
      salary: number;
      fullName: string;
      employeeId: string;
      salary: number;
      totalDays: number;
      totalHours: number;
      totalAmount: number;
      nightDutyCount: number;
      nightDutyHours: number;
      nightDutyHours: number;
      nightAllowance: number;
      grandTotal: number;
    }> = [];
    
    // Group entries by staff
    const staffGroups: Record<string, RosterEntry[]> = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
        const baseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
        if (!staffGroups[baseName]) {
          staffGroups[baseName] = [];
        }
        staffGroups[baseName].push(entry);
      }
    });
    
    // Calculate for each staff member
    Object.entries(staffGroups).forEach(([baseName, staffEntries]) => {
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
      const grandTotal =  totalAmount + nightAllowance;
      
      // Find the actual staff name (with (R) if applicable)
      const actualStaffName = availableNames.find(name => 
        name.replace(/\(R\)$/, '').trim().toUpperCase() === baseName
      ) || baseName;
      
      // Get staff info for full name, ID, and salary
      const staffInfo = this.getStaffInfo(actualStaffName);
      const fullName = staffInfo ? `${staffInfo.surname || actualStaffName} ${staffInfo.firstName || ''}`.trim() : actualStaffName;
      const employeeId = staffInfo?.employeeId || '';
      const salary = staffInfo?.salary || 0;
      
      staffSummaries.push({
        staffName: actualStaffName,
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
      });
    });
    
    // Sort by staff name
    return staffSummaries.sort((a, b) => a.staffName.localeCompare(b.staffName));
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
export const annexureGenerator = new AnnexureGenerator();