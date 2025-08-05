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
   * Generate individual bill for a specific staff member
   */
  async generateBill(options: IndividualBillOptions): Promise<void> {
    const { staffName, month, year, entries, basicSalary, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Starting individual bill generation for:', staffName);
    console.log('📄 Total entries provided:', entries.length);
    
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
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('INDIVIDUAL WORK SUMMARY', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Staff: ${staffName}`, 20, 35);
    doc.text(`Period: ${monthNames[month]} ${year}`, 20, 45);
    
    if (staffEntries.length === 0) {
      // Show "No data" message
      doc.setFontSize(14);
      doc.text('No work entries found for this staff member in the selected month', doc.internal.pageSize.getWidth() / 2, 80, { align: 'center' });
      
      // Still show summary with zeros
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY:', 20, 120);
      
      doc.setFont('helvetica', 'normal');
      doc.text('Total Working Days: 0', 20, 135);
      doc.text('Total Working Hours: 0.0', 20, 150);
      doc.text(`Hourly Rate: ${formatMauritianRupees(hourlyRate).formatted}`, 20, 165);
      doc.text('Subtotal (Hours): Rs 0.00', 20, 185);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL AMOUNT: Rs 0.00', 20, 210);
    } else {
      // Prepare table data - group by date and combine shifts
      const tableData = this.prepareTableData(staffEntries, hourlyRate, shiftCombinations);
      
      // Create table
      autoTable(doc, {
        startY: 55,
        head: [['Date & Day', 'Morning (9-4)', 'Saturday (12-10)', 'Evening (4-10)', 'Night Duty', 'Special (9-4)', 'Hours', 'Amount']],
        body: tableData.rows,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'center' }, // Date & Day
          1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Morning (9-4)
          2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Saturday (12-10)
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Evening (4-10)
          4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Night Duty
          5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Special (9-4)
          6: { cellWidth: 20, halign: 'right' },  // Hours
          7: { cellWidth: 30, halign: 'right' }   // Amount
        },
        margin: { left: 20, right: 20 },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        theme: 'striped'
      });
      
      // Calculate totals
      const totalDays = tableData.totalDays;
      const totalHours = tableData.totalHours;
      const totalAmount = tableData.totalAmount;
      const nightDutyCount = tableData.nightDutyCount;
      const nightAllowance = nightDutyCount * 500;
      const grandTotal = totalAmount + nightAllowance;
      
      // Summary section
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SUMMARY:', 20, finalY);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Working Days: ${totalDays}`, 20, finalY + 15);
      doc.text(`Total Working Hours: ${totalHours.toFixed(1)}`, 20, finalY + 30);
      doc.text(`Hourly Rate: ${formatMauritianRupees(hourlyRate).formatted}`, 20, finalY + 45);
      doc.text(`Subtotal (Hours): ${formatMauritianRupees(totalAmount).formatted}`, 20, finalY + 65);
      
      if (nightDutyCount > 0) {
        doc.text(`Night Duty Allowance: ${nightDutyCount} nights × Rs 500 = ${formatMauritianRupees(nightAllowance).formatted}`, 20, finalY + 80);
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`TOTAL AMOUNT: ${formatMauritianRupees(grandTotal).formatted}`, 20, finalY + (nightDutyCount > 0 ? 100 : 85));
    }
    
    // Generate filename
    const filename = `${staffName}_${monthNames[month]}_${year}_Bill.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    console.log('✅ Individual bill generated:', filename);
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
    console.log(`📄 Filtering entries for ${staffName} in month ${month + 1}/${year}`);
    
    const filtered = entries.filter(entry => {
      // Check if entry belongs to this staff member (match base names)
      const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
      const staffBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
      
      if (entryBaseName !== staffBaseName) {
        return false;
      }
      
      // Check if entry is in the specified month/year
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth();
      const entryYear = entryDate.getFullYear();
      
      console.log(`📄 Entry ${entry.date}: month=${entryMonth}, year=${entryYear}, target month=${month}, target year=${year}`);
      
      return entryMonth === month && entryYear === year;
    });
    
    console.log(`📄 Found ${filtered.length} matching entries for ${staffName}`);
    filtered.forEach(entry => {
      console.log(`📄 - ${entry.date}: ${entry.shift_type} (${entry.assigned_name})`);
    });
    
    return filtered;
  }
  
  /**
   * Prepare table data by grouping entries by date and combining shifts
   */
  private prepareTableData(
    entries: RosterEntry[], 
    hourlyRate: number, 
    shiftCombinations: Array<{id: string, combination: string, hours: number}>
  ): {
    rows: string[][];
    totalDays: number;
    totalHours: number;
    totalAmount: number;
    nightDutyCount: number;
  } {
    // Group entries by date
    const entriesByDate = entries.reduce((groups, entry) => {
      const dateKey = entry.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, RosterEntry[]>);
    
    const rows: string[][] = [];
    let totalHours = 0;
    let totalAmount = 0;
    let nightDutyCount = 0;
    
    // Sort dates chronologically
    const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    sortedDates.forEach(dateKey => {
      const dayEntries = entriesByDate[dateKey];
      const date = new Date(dateKey);
      
      // Combine shifts for the same date
      const shifts: string[] = [];
      let dayHours = 0;
      let dayAmount = 0;
      
      dayEntries.forEach(entry => {
        shifts.push(entry.shift_type);
        
        // Count night duties for allowance
        if (entry.shift_type === 'Night Duty') {
          nightDutyCount++;
        }
        
        // Calculate hours and amount for this shift
        const shiftHours = this.getShiftHours(entry.shift_type, shiftCombinations);
        dayHours += shiftHours;
        dayAmount += shiftHours * hourlyRate;
      });
      
      totalHours += dayHours;
      totalAmount += dayAmount;
      
      // Format date and day combined
      const formattedDateDay = this.formatDateWithDay(dateKey);
      const dayName = this.getDayName(dateKey);
      
      // Create checkmarks for each shift column
      const morningCheck = shifts.includes('Morning Shift (9-4)') ? '●' : '';
      const saturdayCheck = shifts.includes('Saturday Regular (12-10)') ? '●' : '';
      const eveningCheck = shifts.includes('Evening Shift (4-10)') ? '●' : '';
      const nightCheck = shifts.includes('Night Duty') ? '●' : '';
      const specialCheck = shifts.includes('Sunday/Public Holiday/Special') ? '●' : '';
      
      rows.push([
        formattedDateDay,
        morningCheck || '-',
        saturdayCheck || '-',
        eveningCheck || '-',
        nightCheck || '-',
        specialCheck || '-',
        dayHours.toFixed(1),
        formatMauritianRupees(dayAmount).formatted
      ]);
    });
    
    return {
      rows,
      totalDays: sortedDates.length,
      totalHours,
      totalAmount,
      nightDutyCount
    };
  }
  
  /**
   * Format date with day name combined (e.g., "Wed 06/08/2025")
   */
  private formatDateWithDay(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${day}/${month}/${year}`;
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
   * Format date for PDF display
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
}

// Create singleton instance
export const individualBillGenerator = new IndividualBillGenerator();