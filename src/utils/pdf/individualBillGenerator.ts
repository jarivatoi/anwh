import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    
    // Sort entries by date
    const sortedEntries = staffEntries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Generate the bill content
    this.generateDetailedBillContent(doc, {
      staffName,
      month,
      year,
      entries: sortedEntries,
      basicSalary,
      hourlyRate,
      shiftCombinations
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
   * Generate detailed bill content matching the PDF template
   */
  private generateDetailedBillContent(doc: jsPDF, data: {
    staffName: string;
    month: number;
    year: number;
    entries: RosterEntry[];
    basicSalary: number;
    hourlyRate: number;
    shiftCombinations: Array<{id: string, combination: string, hours: number}>;
  }) {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = data;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Page margins
    const leftMargin = 15;
    const rightMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    let yPosition = 30;
    
    // Header - Company/Department Name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(14);
    doc.text('ANWH - Work Schedule', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Title
    doc.setFontSize(16);
    doc.text('INDIVIDUAL WORK SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Staff Details Box
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Draw border for staff details (smaller box)
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
    
    // Detailed Work Record
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DETAILED WORK RECORD', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Create detailed table with all dates and shifts
    const tableData = this.prepareDetailedTableData(entries, hourlyRate, shiftCombinations);
    
    // Calculate totals
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    let nightAllowanceAmount = 0;
    
    tableData.forEach(row => {
      totalHours += parseFloat(row[3]) || 0;
      totalAmount += parseFloat(row[4].replace(/[^\d.-]/g, '')) || 0;
      if (row[2] === 'Night Duty') {
        nightDutyCount++;
        nightAllowanceAmount += 500; // Rs 500 per night duty
      }
    });
    
    // Use autoTable for better formatting
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Day', 'Shift Type', 'Hours', 'Amount (Rs)']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' }, // Date
        1: { cellWidth: 20, halign: 'center' }, // Day
        2: { cellWidth: 50, halign: 'left' },   // Shift Type
        3: { cellWidth: 20, halign: 'center' }, // Hours
        4: { cellWidth: 30, halign: 'right' }   // Amount
      },
      margin: { left: leftMargin, right: rightMargin },
      theme: 'striped'
    });
    
    // Get the final Y position after the table
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Summary Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Summary box
    doc.rect(leftMargin, yPosition - 5, contentWidth, 50);
    yPosition += 5;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Basic calculations
    doc.text(`Total Working Days: ${entries.length}`, leftMargin + 10, yPosition);
    yPosition += 8;
    
    doc.text(`Total Working Hours: ${totalHours}`, leftMargin + 10, yPosition);
    yPosition += 8;
    
    doc.text(`Hourly Rate: ${formatMauritianRupees(hourlyRate).formatted}`, leftMargin + 10, yPosition);
    yPosition += 8;
    
    doc.text(`Subtotal (Hours): ${formatMauritianRupees(totalAmount).formatted}`, leftMargin + 10, yPosition);
    yPosition += 8;
    
    // Night duty allowance breakdown
    if (nightDutyCount > 0) {
      doc.text(`Night Duty Allowance: ${nightDutyCount} nights × Rs 500 = ${formatMauritianRupees(nightAllowanceAmount).formatted}`, leftMargin + 10, yPosition);
      yPosition += 8;
    }
    
    // Final total
    const grandTotal = totalAmount + nightAllowanceAmount;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL AMOUNT: ${formatMauritianRupees(grandTotal).formatted}`, leftMargin + 10, yPosition);
    yPosition += 15;
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, leftMargin, yPosition);
    doc.text(`Generated by: X-ray ANWH System`, pageWidth - rightMargin, yPosition, { align: 'right' });
    
    // Page number
    doc.text('Page 1 of 1', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  /**
   * Prepare detailed table data showing all dates and shifts
   */
  private prepareDetailedTableData(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ): string[][] {
    return entries.map(entry => {
      // Map roster shift types to calculation IDs
      const shiftMapping: Record<string, string> = {
        'Morning Shift (9-4)': '9-4',
        'Evening Shift (4-10)': '4-10',
        'Saturday Regular (12-10)': '12-10',
        'Night Duty': 'N',
        'Sunday/Public Holiday/Special': '9-4'
      };
      
      const shiftId = shiftMapping[entry.shift_type];
      const combination = shiftCombinations.find(combo => combo.id === shiftId);
      const hours = combination ? combination.hours : 0;
      const amount = hours * hourlyRate;
      
      return [
        this.formatDate(entry.date),
        this.getDayName(entry.date),
        this.formatShiftType(entry.shift_type),
        hours.toString(),
        formatMauritianRupees(amount).formatted
      ];
    });
  }
  
  /**
   * Format date for PDF display (DD/MM/YYYY)
   */
  private formatDate(dateString: string): string {
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
   * Calculate totals and breakdown (kept for compatibility)
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