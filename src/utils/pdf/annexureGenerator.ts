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
      summary.fullName, // Full name (surname first)
      summary.employeeId, // ID number
      this.trimTrailingZeros(formatMauritianRupees(summary.salary).formatted), // Salary
      this.trimTrailingZeros(summary.totalHours.toFixed(1)), // Hours payable (without night allowance)
      this.trimTrailingZeros(summary.nightDutyHours.toFixed(1)), // Night allowance hours
      this.trimTrailingZeros(formatMauritianRupees(summary.grandTotal).formatted)
    ]);
    
    // Create table matching the original format
    autoTable(doc, {
      startY: 35,
      head: [['S.No', 'NAME (Full Name)', 'ID NUMBER', 'SALARY', 'NO OF HRS PAYABLE (Hrs)', 'NIGHT ALLOWANCE (Hrs)', 'AMOUNT']],
      body: tableData,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' }, // S.No
        1: { cellWidth: 35, halign: 'left' },   // NAME (Full Name)
        2: { cellWidth: 30, halign: 'center' }, // ID NUMBER
        3: { cellWidth: 22, halign: 'right' },  // SALARY
        4: { cellWidth: 22, halign: 'center' }, // NO OF HRS PAYABLE
        5: { cellWidth: 22, halign: 'center' }, // NIGHT ALLOWANCE (Hrs)
        6: { cellWidth: 25, halign: 'right' }   // AMOUNT
      },
      margin: { left: 10, right: 10 },
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0]
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
    
    // Grand totals row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTALS:', 15, finalY);
    doc.text(`Total Salary: ${this.trimTrailingZeros(formatMauritianRupees(grandTotalSalary).formatted)}`, 15, finalY + 8);
    doc.text(`Total Hours Payable: ${this.trimTrailingZeros(grandTotalHours.toFixed(1))}`, 15, finalY + 16);
    doc.text(`Total Night Allowance Hours: ${this.trimTrailingZeros(grandNightDutyHours.toFixed(1))}`, 15, finalY + 24);
    
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL AMOUNT: ${this.trimTrailingZeros(formatMauritianRupees(grandTotal).formatted)}`, 15, finalY + 36);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.getHeight() - 15);
    doc.text('X-ray AN WH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
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
          // Add night duty hours (typically 12.5 hours per night)
          const nightShiftHours = shiftCombinations.find(combo => combo.id === 'N')?.hours || 12.5;
          nightDutyHours += nightShiftHours;
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
            totalHours += combination.hours;
            totalAmount += combination.hours * hourlyRate;
          }
        }
      });
      
      // Calculate night allowance: (number of nights) × 6 × 0.25 × hourly_rate
      const nightAllowanceBase = nightDutyCount * 6 * 0.25;
      const nightAllowance = nightAllowanceBase * hourlyRate;
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
    // Import from rosterAuth to get staff details
    const { getStaffInfo } = require('../rosterAuth');
    return getStaffInfo(staffName);
  }
  
  /**
   * Trim trailing zeros from formatted numbers
   */
  private trimTrailingZeros(value: string): string {
    // Handle currency format (Rs 123.00 -> Rs 123)
    if (value.startsWith('Rs ')) {
      const numberPart = value.substring(3);
      const trimmed = parseFloat(numberPart).toString();
      return `Rs ${trimmed}`;
    }
    
    // Handle regular numbers (123.00 -> 123)
    return parseFloat(value).toString();
  }
}

// Create singleton instance
export const annexureGenerator = new AnnexureGenerator();