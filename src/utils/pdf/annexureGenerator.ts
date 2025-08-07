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
      summary.staffName,
      summary.totalDays.toString(),
      summary.totalHours.toFixed(1),
      formatMauritianRupees(summary.totalAmount).formatted,
      formatMauritianRupees(summary.nightAllowance).formatted,
      formatMauritianRupees(summary.grandTotal).formatted
    ]);
    
    // Create table matching the original format
    autoTable(doc, {
      startY: 35,
      head: [['S.No', 'Name', 'Working Days', 'Working Hours', 'Subtotal (Hours)', 'Night Allowance', 'Total Amount']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // S.No
        1: { cellWidth: 35, halign: 'left' },   // Name
        2: { cellWidth: 20, halign: 'center' }, // Working Days
        3: { cellWidth: 20, halign: 'center' }, // Working Hours
        4: { cellWidth: 30, halign: 'right' },  // Subtotal
        5: { cellWidth: 25, halign: 'right' },  // Night Allowance
        6: { cellWidth: 30, halign: 'right' }   // Total Amount
      },
      margin: { left: 15, right: 15 },
      theme: 'grid',
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0]
    });
    
    // Add grand totals at the bottom
    const grandTotalDays = staffSummaries.reduce((sum, s) => sum + s.totalDays, 0);
    const grandTotalHours = staffSummaries.reduce((sum, s) => sum + s.totalHours, 0);
    const grandSubtotal = staffSummaries.reduce((sum, s) => sum + s.totalAmount, 0);
    const grandNightAllowance = staffSummaries.reduce((sum, s) => sum + s.nightAllowance, 0);
    const grandTotal = staffSummaries.reduce((sum, s) => sum + s.grandTotal, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Grand totals row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('GRAND TOTALS:', 15, finalY);
    doc.text(`Total Working Days: ${grandTotalDays}`, 15, finalY + 8);
    doc.text(`Total Working Hours: ${grandTotalHours.toFixed(1)}`, 15, finalY + 16);
    doc.text(`Total Subtotal: ${formatMauritianRupees(grandSubtotal).formatted}`, 15, finalY + 24);
    doc.text(`Total Night Allowance: ${formatMauritianRupees(grandNightAllowance).formatted}`, 15, finalY + 32);
    
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL AMOUNT: ${formatMauritianRupees(grandTotal).formatted}`, 15, finalY + 44);
    
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
      totalDays: number;
      totalHours: number;
      totalAmount: number;
      nightDutyCount: number;
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
      
      staffSummaries.push({
        staffName: actualStaffName,
        totalDays: staffEntries.length,
        totalHours,
        totalAmount,
        nightDutyCount,
        nightAllowance,
        grandTotal
      });
    });
    
    // Sort by staff name
    return staffSummaries.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }
}

// Create singleton instance
export const annexureGenerator = new AnnexureGenerator();