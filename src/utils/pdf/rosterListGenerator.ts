import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RosterEntry } from '../../types/roster';

export interface RosterListOptions {
  month: number;
  year: number;
  entries: RosterEntry[];
}

export class RosterListGenerator {
  
  /**
   * Generate roster list matching the PDF template format - all on one page
   */
  async generateRosterList(options: RosterListOptions): Promise<void> {
    const { month, year, entries } = options;
    
    console.log('📄 Generating roster list');
    
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
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('X-RAY DEPARTMENT', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('ANWH - Work Schedule', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`ROSTER - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
    
    // Filter entries for the specified month/year
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
    
    console.log(`📄 Filtered ${monthEntries.length} entries for ${monthNames[month]} ${year}`);
    
    if (monthEntries.length === 0) {
      // Show "No data" message
      doc.setFontSize(14);
      doc.text('No roster entries found for this month', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
    } else {
      // Group entries by date and staff, then create table data
      const tableData = this.prepareRosterTableData(monthEntries);
      
      // Create table with very small fonts to fit everything
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Day', 'Staff Name', 'Morning (9-4)', 'Saturday (12-10)', 'Evening (4-10)', 'Night Duty', 'Special (9-4)']],
        body: tableData,
        styles: {
          fontSize: 5, // Very small font to fit more
          cellPadding: 1,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 6
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Date
          1: { cellWidth: 15 }, // Day
          2: { cellWidth: 35 }, // Staff Name
          3: { cellWidth: 20 }, // Morning (9-4)
          4: { cellWidth: 20 }, // Saturday (12-10)
          5: { cellWidth: 20 }, // Evening (4-10)
          6: { cellWidth: 20 }, // Night Duty
          7: { cellWidth: 20 }  // Special (9-4)
        },
        margin: { left: 10, right: 10 },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        tableLineWidth: 0.1,
        theme: 'grid'
      });
    }
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Total Staff: ${this.getUniqueStaffCount(monthEntries)}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    
    // Save
    const filename = `Roster_List_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Roster list generated:', filename);
  }
  
  /**
   * Prepare roster table data with checkmarks for shifts worked
   */
  private prepareRosterTableData(entries: RosterEntry[]): string[][] {
    // Group entries by date and staff
    const groupedData: Record<string, Record<string, string[]>> = {};
    
    entries.forEach(entry => {
      const dateKey = entry.date;
      const staffName = entry.assigned_name;
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {};
      }
      if (!groupedData[dateKey][staffName]) {
        groupedData[dateKey][staffName] = [];
      }
      groupedData[dateKey][staffName].push(entry.shift_type);
    });
    
    // Convert to table rows
    const tableData: string[][] = [];
    
    // Sort dates
    const sortedDates = Object.keys(groupedData).sort();
    
    sortedDates.forEach(date => {
      const staffData = groupedData[date];
      const staffNames = Object.keys(staffData).sort();
      
      staffNames.forEach(staffName => {
        const shifts = staffData[staffName];
        
        // Create checkmarks for each shift type
        const morning = shifts.includes('Morning Shift (9-4)') || shifts.includes('Sunday/Public Holiday/Special') ? '✓' : '';
        const saturday = shifts.includes('Saturday Regular (12-10)') ? '✓' : '';
        const evening = shifts.includes('Evening Shift (4-10)') ? '✓' : '';
        const night = shifts.includes('Night Duty') ? '✓' : '';
        const special = shifts.includes('Sunday/Public Holiday/Special') ? '✓' : '';
        
        tableData.push([
          this.formatDate(date),
          this.getDayName(date),
          staffName,
          morning,
          saturday,
          evening,
          night,
          special
        ]);
      });
    });
    
    return tableData;
  }
  
  /**
   * Get count of unique staff members
   */
  private getUniqueStaffCount(entries: RosterEntry[]): number {
    const uniqueStaff = new Set(entries.map(entry => entry.assigned_name));
    return uniqueStaff.size;
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
  
  /**
   * Format shift type for better PDF display
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
export const rosterListGenerator = new RosterListGenerator();