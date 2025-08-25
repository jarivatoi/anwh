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
    return `Rs ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Generate annexure matching the exact PDF format
   */
  async generateAnnexure(options: AnnexureOptions): Promise<void> {
    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Generate content
    await this.generateAnnexureContent(doc, options);
    
    // Generate filename and save
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const filename = `Annexure_${monthNames[options.month]}_${options.year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Annexure generated:', filename);
  }
  
  /**
   * Generate annexure content into provided PDF document (for batch printing)
   */
  async generateAnnexureContent(doc: jsPDF, options: AnnexureOptions): Promise<void> {
    const { month, year, entries, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Generating annexure for all staff');
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Header - matching the original format
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - JAWAHARLAL NEHRU HOSPITAL', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
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
      head: [['S.No', 'NAME\n(Full Name)', 'ID\nNUMBER', 'SALARY', 'NO OF HRS\nPAYABLE\n(Hrs)', 'NIGHT\nALLOWANCE\n(Hrs)', 'AMOUNT']],
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
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        cellPadding: 2,
        minCellHeight: 8
      },
      margin: { left: 5, right: 5 },
      theme: 'grid',
      tableWidth: 'auto',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0],
      columnStyles: {},
      didParseCell: function(data) {
        // Auto-adjust font size based on content length
        if (data.section === 'body') {
          const cellText = data.cell.text.join(' ');
          if (cellText.length > 20) {
            data.cell.styles.fontSize = 6;
          } else if (cellText.length > 10) {
            data.cell.styles.fontSize = 7;
          } else {
            data.cell.styles.fontSize = 8;
          }
        }
      }
    });
    
    // Add grand totals at the bottom
    const grandTotalDays = staffSummaries.reduce((sum, s) => sum + s.totalDays, 0);
    const grandTotalHours = staffSummaries.reduce((sum, s) => sum + s.totalHours, 0);
    const grandTotalSalary = staffSummaries.reduce((sum, s) => sum + s.salary, 0);
    const grandNightDutyHours = staffSummaries.reduce((sum, s) => sum + s.nightDutyHours, 0);
    const grandSubtotal = staffSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
    const grandNightAllowance = staffSummaries.reduce((sum, s) => sum + s.nightAllowance, 0);
    const grandTotal = staffSummaries.reduce((sum, s) => sum + s.grandTotal, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    /*
    // Grand totals row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTALS:', 15, finalY);
    doc.text(`Total Salary: ${this.formatCurrency(grandTotalSalary)}`, 15, finalY + 8);
    doc.text(`Total Hours Payable: ${this.formatNumber(grandTotalHours)}`, 15, finalY + 16);
    doc.text(`Total Night Allowance Hours: ${this.formatNumber(grandNightDutyHours)}`, 15, finalY + 24);
    
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL AMOUNT: ${this.formatCurrency(grandTotal)}`, 15, finalY + 36);
*/
 doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Certified correct as per annexture:', 50, finalY + 50);
    
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
      totalDays: number;
      totalHours: number;
      totalAmount: number;
      nightDutyCount: number;
      nightDutyHours: number;
      nightAllowance: number;
      grandTotal: number;
    }> = [];
    
    // Group entries by staff
    const staffGroups: Record<string, RosterEntry[]> = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
        // Use base name (remove (R) suffix) to group same person together
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
      
      // Use base name for staff name (no (R) suffix needed since they're the same person)
      const actualStaffName = baseName;
      
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
      
      // Only use base staff data (no (R) duplicates needed since they're the same person)
    ];
    
    // Match by base name (remove (R) suffix for matching)
    const baseStaffName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
    return authCodes.find(auth => auth.name.toUpperCase() === baseStaffName) || null;
  }
}

// Create singleton instance
export const annexureGenerator = new AnnexureGenerator();