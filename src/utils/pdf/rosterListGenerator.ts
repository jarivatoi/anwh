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
   * Generate simple roster list showing name, date, and shift only
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
    doc.text('X-RAY DEPARTMENT - ANWH', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`ROSTER LIST - ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
    
    // Filter entries for the specified month/year
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
    
    console.log(`📄 Filtered ${monthEntries.length} entries for ${monthNames[month]} ${year}`);
    
    if (monthEntries.length === 0) {
      // Show "No data" message
      doc.setFontSize(14);
      doc.text('No roster entries found for this month', doc.internal.pageSize.getWidth() / 2, 60, { align: 'center' });
    } else {
      // Sort entries by date, then by shift type
      const sortedEntries = [...monthEntries].sort((a, b) => {
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // Secondary sort by shift type
        const shiftOrder = [
          'Morning Shift (9-4)',
          'Saturday Regular (12-10)',
          'Evening Shift (4-10)',
          'Night Duty',
          'Sunday/Public Holiday/Special'
        ];
        
        const aIndex = shiftOrder.indexOf(a.shift_type);
        const bIndex = shiftOrder.indexOf(b.shift_type);
        return aIndex - bIndex;
      });
      
      // Prepare table data - ONLY name, date, and shift
      const tableData = sortedEntries.map(entry => [
        this.formatDate(entry.date),
        this.getDayName(entry.date),
        entry.assigned_name,
        this.formatShiftType(entry.shift_type)
      ]);
      
      // Create table
      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Day', 'Staff Name', 'Shift Type']],
        body: tableData,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Date
          1: { cellWidth: 20 }, // Day
          2: { cellWidth: 50 }, // Staff Name
          3: { cellWidth: 45 }  // Shift Type
        },
        margin: { left: 15, right: 15 },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        tableLineWidth: 0.1
      });
    }
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, doc.internal.pageSize.getHeight() - 10);
    doc.text(`Total Entries: ${monthEntries.length}`, doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    
    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }
    
    // Save
    const filename = `Roster_List_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Roster list generated:', filename);
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