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
  
  /***
   * Generate annexure for all staff
   */
  async generateAnnexure(options: AnnexureOptions): Promise<void> {
    const { month, year, entries, hourlyRate, shiftCombinations } = options;
    
    console.log('📄 Generating annexure for all staff');
    
    // Create PDF document - A4 landscape for better table layout
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`STAFF WORK SUMMARY - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    
    // Calculate summary for all staff
    const staffSummaries = this.calculateStaffSummaries(entries, month, year, hourlyRate, shiftCombinations);
    
    // Prepare table data
    const tableData = staffSummaries.map(summary => [
      summary.staffName,
      summary.totalDays.toString(),
      summary.totalHours.toString(),
      formatMauritianRupees(summary.totalAmount).formatted,
      summary.shiftBreakdown
    ]);
    
    // Create table
    autoTable(doc, {
      startY: 40,
      head: [['Staff Name', 'Total Days', 'Total Hours', 'Total Amount', 'Shift Breakdown']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 50 }, // Staff Name
        1: { cellWidth: 25, halign: 'center' }, // Total Days
        2: { cellWidth: 25, halign: 'center' }, // Total Hours
        3: { cellWidth: 40, halign: 'right' }, // Total Amount
        4: { cellWidth: 80 } // Shift Breakdown
      }
    });
    
    // Add totals at the bottom
    const grandTotalDays = staffSummaries.reduce((sum, s) => sum + s.totalDays, 0);
    const grandTotalHours = staffSummaries.reduce((sum, s) => sum + s.totalHours, 0);
    const grandTotalAmount = staffSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GRAND TOTALS:', 20, finalY);
    doc.text(`Total Days: ${grandTotalDays}`, 20, finalY + 8);
    doc.text(`Total Hours: ${grandTotalHours}`, 20, finalY + 16);
    doc.text(`Total Amount: ${formatMauritianRupees(grandTotalAmount).formatted}`, 20, finalY + 24);
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.getHeight() - 10);
    
    // Save
    const filename = `Annexure_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Annexure generated:', filename);
  }
  
  /**
   * Calculate summaries for all staff
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
      totalDays: number;
      totalHours: number;
      totalAmount: number;
      shiftBreakdown: string;
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
      const shiftCounts: Record<string, number> = {};
      let totalHours = 0;
      let totalAmount = 0;
      
      staffEntries.forEach(entry => {
        const shiftType = entry.shift_type;
        shiftCounts[shiftType] = (shiftCounts[shiftType] || 0) + 1;
        
        // Map and calculate hours
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
            totalHours += combination.hours;
            totalAmount += combination.hours * hourlyRate;
          }
        }
      });
      
      // Create shift breakdown string
      const breakdown = Object.entries(shiftCounts)
        .map(([shift, count]) => `${this.formatShiftType(shift)}: ${count}`)
        .join(', ');
      
      // Find the actual staff name (with (R) if applicable)
      const actualStaffName = availableNames.find(name => 
        name.replace(/\(R\)$/, '').trim().toUpperCase() === baseName
      ) || baseName;
      
      staffSummaries.push({
        staffName: actualStaffName,
        totalDays: staffEntries.length,
        totalHours,
        totalAmount,
        shiftBreakdown: breakdown
      });
    });
    
    // Sort by staff name
    return staffSummaries.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }
  
  /**
   * Format shift type for display
   */
  private formatShiftType(shiftType: string): string {
    const shortNames: Record<string, string> = {
      'Morning Shift (9-4)': 'M(9-4)',
      'Evening Shift (4-10)': 'E(4-10)',
      'Saturday Regular (12-10)': 'S(12-10)',
      'Night Duty': 'Night',
      'Sunday/Public Holiday/Special': 'Sp(9-4)'
    };
    return shortNames[shiftType] || shiftType;
  }
}

// Create singleton instance
export const annexureGenerator = new AnnexureGenerator();