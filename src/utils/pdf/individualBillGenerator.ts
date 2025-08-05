import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';
import { formatMauritianRupees } from '../currency';
import { getStaffInfo, getStaffSalary } from '../rosterAuth';

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
   * Generate individual bill for a specific staff member matching the exact PDF format
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Starting individual bill generation for:', staffName);
    
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
    const staffEntries = this.filterEntriesForStaff(entries, staffName, month, year);
    
    console.log(`📄 Filtered ${staffEntries.length} entries for ${staffName} in ${monthNames[month]} ${year}`);
    
    // Get staff information
    const staffInfo = getStaffInfo(staffName);
    const staffSalary = getStaffSalary(staffName);
    
    // Header - compact format
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`INDIVIDUAL WORK SUMMARY - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Staff details section - two-column layout with proper alignment
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Left column - Name, Month/Year, Employee ID
    doc.text('Name:', 20, 30);
    doc.text('Month/Year:', 20, 37);
    doc.text('Employee ID:', 20, 44);
    
    // Left column values  
    doc.setFont('helvetica', 'normal');
    doc.text(`${staffInfo?.firstName || ''} ${staffInfo?.surname || staffName}`, 50, 30);
    doc.text(`${monthNames[month]} ${year}`, 50, 37);
    doc.text(staffInfo?.employeeId || '', 50, 44);
    
    // Right column - Title, Salary, Hourly Rate
    doc.setFont('helvetica', 'bold');
    doc.text('Title:', 120, 40);
    doc.text('Salary:', 120, 47);
    doc.text('Hourly Rate:', 120, 54);
    
    // Right column values
    doc.setFont('helvetica', 'normal');
    doc.text(staffInfo?.title || 'MIT', 150, 40);
    doc.text(`Rs ${(staffInfo?.salary || 0).toLocaleString()}`, 150, 47);
    doc.text(`Rs ${hourlyRate.toFixed(2)}`, 150, 54);
    
    // Prepare table data for ALL days in the month
    const tableData = this.prepareAllDaysTableData(staffEntries, month, year, hourlyRate, shiftCombinations);
    
    // Create table with compact layout
    autoTable(doc, {
      startY: 55,
      head: [['Day Date', 'Morning\n(9-4)', 'Saturday\n(12-10)', 'Evening\n(4-10)', 'Night\nDuty', 'Hours', 'Remarks']],
      body: tableData.rows,
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
        valign: 'middle',
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' }, // Day Date
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 8 }, // Morning (9-4)
        2: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 8 }, // Saturday (12-10)
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 8 }, // Evening (4-10)
        4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 8 }, // Night Duty
        5: { cellWidth: 15, halign: 'center' }, // Hours
        6: { cellWidth: 35, halign: 'left' }    // Remarks (blank)
      },
      margin: { left: 20, right: 20 },
      pageBreak: 'auto',
      rowPageBreak: 'avoid',
      theme: 'grid',
      tableLineWidth: 0.2,
      tableLineColor: [0, 0, 0],
      // Ensure table doesn't extend beyond content
      tableWidth: 'wrap'
    });
    
    // Add summary section
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    this.addSummarySection(doc, tableData.totalDays, tableData.totalHours, tableData.nightDutyCount, hourlyRate, finalY);
    
    // Add signature sections
    this.addSignatureSections(doc, tableData.totalDays, tableData.totalHours, tableData.nightDutyCount, hourlyRate);
    
    // Footer - positioned at absolute bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text('X-ray ANWH System', doc.internal.pageSize.getWidth() - 15, pageHeight - 15, { align: 'right' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - 15, pageHeight - 10, { align: 'right' });
    
    // Generate filename
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
  }
  
  /**
   * Add compact summary section
   */
  private addSummarySection(doc: jsPDF, totalDays: number, totalHours: number, nightDutyCount: number, hourlyRate: number, startY: number): void {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY:', 15, startY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Calculate total amount from hours
    const totalAmount = totalHours * hourlyRate;
    
    // Summary details
    doc.text(`Total Working Days: ${totalDays}`, 15, startY + 8);
    doc.text(`Total Working Hours: ${totalHours.toFixed(1)}`, 15, startY + 14);
    doc.text(`Subtotal (Hours): ${formatMauritianRupees(totalAmount).formatted}`, 15, startY + 20);
    
    // Night duty allowance - calculation: (number of nights) × 6 × 0.25 × hourly_rate
    const nightAllowanceBase = nightDutyCount * 6 * 0.25;
    const nightAllowance = nightAllowanceBase * hourlyRate;
    if (nightDutyCount > 0) {
      doc.text(`Night Allowance: ${nightDutyCount} × 6 × 0.25 × ${formatMauritianRupees(hourlyRate).formatted} = ${formatMauritianRupees(nightAllowance).formatted}`, 15, startY + 26);
    }
    
    // Grand total
    const grandTotal = totalAmount + nightAllowance;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL AMOUNT: ${formatMauritianRupees(grandTotal).formatted}`, 15, startY + (nightDutyCount > 0 ? 34 : 28));
  }
  
  /**
   * Add signature sections at bottom
   */
  private addSignatureSections(doc: jsPDF, totalDays: number, totalHours: number, nightDutyCount: number, hourlyRate: number): void {
    const totalAmount = totalHours * hourlyRate;
    const nightAllowanceBase = nightDutyCount * 6 * 0.25;
    const nightAllowance = nightAllowanceBase * hourlyRate;
    const grandTotal = totalAmount + nightAllowance;
    
    // Calculate position after summary
    const summaryEndY = (doc as any).lastAutoTable.finalY + 5 + (nightDutyCount > 0 ? 34 : 28) + 10;
    
    // Left side - Date and signature
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Date',15,summaryEndY);
    doc.text('Signature:-________________', 15, summaryEndY+10);
    
    // Right side - Certification
    const rightX = 120;
    doc.text('Certified Correct as per Attendance.', rightX, summaryEndY-50);
    doc.text('Name: _____________________________', rightX, summaryEndY + 8-50);
    doc.text('Grade: Principal Medical Imaging Technologist.', rightX, summaryEndY + 16-50);
    doc.text('Signature: ____________________________________', rightX, summaryEndY + 24-50);
  }
  
  /**
   * Filter roster entries for specific staff member and month
   */
  private filterEntriesForStaff(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): RosterEntry[] {
    return entries.filter(entry => {
      // Check if entry belongs to this staff member (match base names)
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
   * Prepare table data for ALL days in the month (uniform format)
   */
  private prepareAllDaysTableData(
    entries: RosterEntry[], 
    month: number,
    year: number,
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ): {
    rows: string[][];
    totalDays: number;
    totalHours: number;
    nightDutyCount: number;
  } {
    // Group existing entries by date
    const entriesByDate = entries.reduce((groups, entry) => {
      const dateKey = entry.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, RosterEntry[]>);
    
    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows: string[][] = [];
    let totalHours = 0;
    let nightDutyCount = 0;
    let totalDays = 0;
    
    // Process ALL days in the month (1 to last day)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayEntries = entriesByDate[dateKey] || [];
      
      // Format as "Day Date" (e.g., "Mon 01/07")
      const dayDate = this.formatDayDate(dateKey);
      
      if (dayEntries.length > 0) {
        // This day has shifts - process them
        totalDays++;
    
        // Combine shifts for the same date
        const shifts: string[] = [];
        let dayHours = 0;
        
        dayEntries.forEach(entry => {
          shifts.push(entry.shift_type);
          
          // Count night duties for allowance
          if (entry.shift_type === 'Night Duty') {
            nightDutyCount++;
          }
          
          // Calculate hours for this shift
          const shiftHours = this.getShiftHours(entry.shift_type, shiftCombinations);
          dayHours += shiftHours;
        });
        
        totalHours += dayHours;
        
        // Create checkmarks for each shift column
        const morningCheck = shifts.includes('Morning Shift (9-4)') ? String.fromCharCode(10003) : '';
        const saturdayCheck = shifts.includes('Saturday Regular (12-10)') ? String.fromCharCode(10003) : '';
        const eveningCheck = shifts.includes('Evening Shift (4-10)') ? String.fromCharCode(10003) : '';
        const nightCheck = shifts.includes('Night Duty') ? String.fromCharCode(10003) : '';
        
        rows.push([
          dayDate,
          morningCheck,
          saturdayCheck,
          eveningCheck,
          nightCheck,
          dayHours.toFixed(1),
          '' // Blank remarks column
        ]);
      } else {
        // This day has no shifts - show empty row
        rows.push([
          dayDate,
          '', // No morning shift
          '', // No saturday shift
          '', // No evening shift
          '', // No night duty
          '0.0', // No hours
          '' // Blank remarks
        ]);
      }
    }
    
    return {
      rows,
      totalDays,
      totalHours,
      nightDutyCount
    };
  }
  
  /**
   * Get hours for a shift type
   */
  private getShiftHours(shiftType: string, shiftCombinations: Array<{id: string, combination: string, hours: number}>): number {
    // Map roster shift types to combination IDs
    const shiftMapping: Record<string, string> = {
      'Morning Shift (9-4)': '9-4',
      'Evening Shift (4-10)': '4-10',
      'Saturday Regular (12-10)': '12-10',
      'Night Duty': 'N',
      'Sunday/Public Holiday/Special': '9-4'
    };
    
    const combinationId = shiftMapping[shiftType];
    if (!combinationId) {
      console.warn(`Unknown shift type: ${shiftType}`);
      return 0;
    }
    
    const combination = shiftCombinations.find(combo => combo.id === combinationId);
    if (!combination) {
      console.warn(`No combination found for shift ID: ${combinationId}`);
      return 0;
    }
    
    return combination.hours;
  }
  
  /**
   * Format date as "Day DD/MM" (e.g., "Mon 01/07")
   */
  private formatDayDate(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${dayName} ${day}/${month}`;
  }
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();