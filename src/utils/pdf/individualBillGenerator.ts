import { jsPDF } from 'jspdf';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';

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
   * Generate individual staff bill PDF matching the template format
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Generating individual bill for:', staffName);
    
    // Create PDF document - A4 portrait
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Filter entries for this staff member and month
    const staffEntries = this.filterStaffEntries(entries, staffName, month, year);
    
    // Calculate totals
    const calculations = this.calculateTotals(staffEntries, hourlyRate, shiftCombinations);
    
    // Generate the bill content
    this.generateBillContent(doc, {
      staffName,
      month,
      year,
      entries: staffEntries,
      calculations,
      basicSalary,
      hourlyRate
    });
    
    // Generate filename
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
  
  /**
   * Filter entries for specific staff member and month
   */
  private filterStaffEntries(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): RosterEntry[] {
    return entries.filter(entry => {
      // Match staff name (including base name matching)
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
   * Calculate totals and breakdown
   */
  private calculateTotals(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ) {
    const shiftCounts: Record<string, number> = {};
    const shiftHours: Record<string, number> = {};
    let totalHours = 0;
    let totalAmount = 0;
    
    // Count shifts and calculate hours
    entries.forEach(entry => {
      const shiftType = entry.shift_type;
      
      // Map roster shift types to calculation IDs
      const shiftMapping: Record<string, string> = {
        'Morning Shift (9-4)': '9-4',
        'Evening Shift (4-10)': '4-10',
        'Saturday Regular (12-10)': '12-10',
        'Night Duty': 'N',
        'Sunday/Public Holiday/Special': '9-4'
      };
      
      const shiftId = shiftMapping[shiftType];
      if (shiftId) {
        shiftCounts[shiftType] = (shiftCounts[shiftType] || 0) + 1;
        
        // Find hours for this shift
        const combination = shiftCombinations.find(combo => combo.id === shiftId);
        if (combination) {
          const hours = combination.hours;
          shiftHours[shiftType] = (shiftHours[shiftType] || 0) + hours;
          totalHours += hours;
          totalAmount += hours * hourlyRate;
        }
      }
    });
    
    return {
      shiftCounts,
      shiftHours,
      totalHours,
      totalAmount,
      totalEntries: entries.length
    };
  }
  
  /**
   * Generate the bill content matching the template
   */
  private generateBillContent(doc: jsPDF, data: {
    staffName: string;
    month: number;
    year: number;
    entries: RosterEntry[];
    calculations: any;
    basicSalary: number;
    hourlyRate: number;
  }) {
    const { staffName, month, year, calculations, basicSalary, hourlyRate } = data;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Page margins
    const leftMargin = 20;
    const rightMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    let yPosition = 30;
    
    // Header - Company/Department Name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(14);
    doc.text('ANWH - Work Schedule', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Title
    doc.setFontSize(18);
    doc.text('INDIVIDUAL WORK SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Staff Details Box
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Draw border for staff details
    doc.rect(leftMargin, yPosition - 5, contentWidth, 40);
    yPosition += 5;
    
    // Staff Name
    doc.setFont('helvetica', 'bold');
    doc.text('Staff Name:', leftMargin + 10, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(staffName, leftMargin + 50, yPosition);
    yPosition += 8;
    
    // Period
    doc.setFont('helvetica', 'bold');
    doc.text('Period:', leftMargin + 10, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monthNames[month]} ${year}`, leftMargin + 50, yPosition);
    yPosition += 8;
    
    // Basic Salary
    doc.setFont('helvetica', 'bold');
    doc.text('Basic Salary:', leftMargin + 10, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(formatMauritianRupees(basicSalary).formatted, leftMargin + 50, yPosition);
    yPosition += 8;
    
    // Hourly Rate
    doc.setFont('helvetica', 'bold');
    doc.text('Hourly Rate:', leftMargin + 10, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(formatMauritianRupees(hourlyRate).formatted, leftMargin + 50, yPosition);
    yPosition += 20;
    
    // Work Summary Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('WORK SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Table headers
    const tableStartY = yPosition;
    const colWidths = [80, 30, 30, 50];
    const colPositions = [
      leftMargin,
      leftMargin + colWidths[0],
      leftMargin + colWidths[0] + colWidths[1],
      leftMargin + colWidths[0] + colWidths[1] + colWidths[2]
    ];
    
    // Draw table header
    doc.setFillColor(240, 240, 240);
    doc.rect(leftMargin, yPosition - 5, contentWidth, 10, 'F');
    doc.rect(leftMargin, yPosition - 5, contentWidth, 10);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Shift Type', colPositions[0] + 2, yPosition);
    doc.text('Days', colPositions[1] + 2, yPosition);
    doc.text('Hours', colPositions[2] + 2, yPosition);
    doc.text('Amount', colPositions[3] + 2, yPosition);
    yPosition += 10;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    let rowCount = 0;
    
    Object.entries(calculations.shiftCounts).forEach(([shiftType, count]) => {
      const hours = calculations.shiftHours[shiftType] || 0;
      const amount = hours * hourlyRate;
      
      // Alternate row colors
      if (rowCount % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(leftMargin, yPosition - 5, contentWidth, 8, 'F');
      }
      
      // Draw row border
      doc.rect(leftMargin, yPosition - 5, contentWidth, 8);
      
      // Draw vertical lines
      colPositions.slice(1).forEach(pos => {
        doc.line(pos, yPosition - 5, pos, yPosition + 3);
      });
      
      // Row data
      doc.text(this.formatShiftType(shiftType), colPositions[0] + 2, yPosition);
      doc.text(count.toString(), colPositions[1] + 2, yPosition);
      doc.text(hours.toString(), colPositions[2] + 2, yPosition);
      doc.text(formatMauritianRupees(amount).formatted, colPositions[3] + 2, yPosition);
      
      yPosition += 8;
      rowCount++;
    });
    
    // Total row
    doc.setFillColor(220, 220, 220);
    doc.rect(leftMargin, yPosition - 5, contentWidth, 10, 'F');
    doc.rect(leftMargin, yPosition - 5, contentWidth, 10);
    
    // Draw vertical lines for total row
    colPositions.slice(1).forEach(pos => {
      doc.line(pos, yPosition - 5, pos, yPosition + 5);
    });
    
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', colPositions[0] + 2, yPosition);
    doc.text(calculations.totalEntries.toString(), colPositions[1] + 2, yPosition);
    doc.text(calculations.totalHours.toString(), colPositions[2] + 2, yPosition);
    doc.text(formatMauritianRupees(calculations.totalAmount).formatted, colPositions[3] + 2, yPosition);
    yPosition += 20;
    
    // Summary Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Summary details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Total Working Days: ${calculations.totalEntries}`, leftMargin, yPosition);
    yPosition += 8;
    
    doc.text(`Total Working Hours: ${calculations.totalHours}`, leftMargin, yPosition);
    yPosition += 8;
    
    doc.text(`Hourly Rate: ${formatMauritianRupees(hourlyRate).formatted}`, leftMargin, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Amount: ${formatMauritianRupees(calculations.totalAmount).formatted}`, leftMargin, yPosition);
    yPosition += 20;
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, leftMargin, yPosition);
    doc.text(`Generated by: X-ray ANWH System`, rightMargin, yPosition, { align: 'right' });
    
    // Page number
    doc.text('Page 1 of 1', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  /**
   * Format shift type for display
   */
  private formatShiftType(shiftType: string): string {
    const shortNames: Record<string, string> = {
      'Morning Shift (9-4)': 'Morning (9-4)',
      'Evening Shift (4-10)': 'Evening (4-10)',
      'Saturday Regular (12-10)': 'Saturday (12-10)',
      'Night Duty': 'Night Duty',
      'Sunday/Public Holiday/Special': 'Special (9-4)'
    };
    return shortNames[shiftType] || shiftType;
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();