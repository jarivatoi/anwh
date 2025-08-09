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
    doc.text(`X-Ray Roster for month of ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    // Filter entries for the specified month/year
    const monthEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
    
    console.log(`📄 Filtered ${monthEntries.length} entries for ${monthNames[month]} ${year}`);
    
    if (monthEntries.length === 0) {
      // Show "No data" message
      doc.setFontSize(14);
      doc.text('No roster entries found for this month', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
    } else {
      // Create table data with colored text
      const tableData = this.createColoredTableData(monthEntries);
      
      // Create table with new column structure
      autoTable(doc, {
        startY: 35,
        head: [['Date', 'Shift', 'Staff Names', 'Remarks']],
        body: tableData,
        didParseCell: (data) => {
          // Apply colors to staff names column (column index 2)
          if (data.column.index === 2 && data.row.index >= 0) {
            const staffWithColors = data.row.raw[2];
            if (Array.isArray(staffWithColors)) {
              // Create formatted text with colors
              let formattedText = '';
              staffWithColors.forEach((staff, index) => {
                if (index > 0) formattedText += ', ';
                formattedText += staff.text;
              });
              data.cell.text = [formattedText];
              
              // For now, use the first staff member's color for the entire cell
              // jsPDF autoTable doesn't support multi-color text in a single cell
              if (staffWithColors.length > 0) {
                data.cell.styles.textColor = staffWithColors[0].color;
              }
            }
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left', valign: 'middle' },   // Date (auto-fit)
          1: { cellWidth: 'auto', halign: 'left', valign: 'middle' },   // Shift (auto-fit)
          2: { cellWidth: 80, halign: 'left', valign: 'middle', overflow: 'linebreak' },   // Staff Names (sized for 3+ staff, wraps if more)
          3: { cellWidth: 'auto', halign: 'left', valign: 'middle', overflow: 'linebreak' }    // Remarks (auto-fit with wrap)
        },
        margin: { left: 10, right: 10 },
        pageBreak: 'auto',
        rowPageBreak: 'auto',
        tableWidth: 'auto',
        tableLineWidth: 0.2,
        theme: 'grid',
        showHead: 'everyPage'
      });
    }
    
    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 10, doc.internal.pageSize.getHeight() - 15);
    doc.text(`Total Entries: ${monthEntries.length}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 15, { align: 'right' });
    
    // Save
    const filename = `Roster_List_${monthNames[month]}_${year}.pdf`;
    doc.save(filename);
    
    console.log('✅ Roster list generated:', filename);
  }
  
  /**
   * Prepare roster table data in new tabular format
   */
  private prepareRosterTableData(entries: RosterEntry[]): string[][] {
    // Group entries by date and shift type
    const groupedData: Record<string, Record<string, RosterEntry[]>> = {};
    
    entries.forEach(entry => {
      const dateKey = entry.date;
      const shiftType = entry.shift_type;
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {};
      }
      if (!groupedData[dateKey][shiftType]) {
        groupedData[dateKey][shiftType] = [];
      }
      groupedData[dateKey][shiftType].push(entry);
    });
    
    // Convert to table rows
    const tableData: string[][] = [];
    
    // Sort dates
    const sortedDates = Object.keys(groupedData).sort();
    
    sortedDates.forEach(date => {
      const shiftData = groupedData[date];
      
      // Define shift order for consistent display
      const shiftOrder = [
        'Morning Shift (9-4)',
        'Saturday Regular (12-10)', 
        'Evening Shift (4-10)',
        'Night Duty',
        'Sunday/Public Holiday/Special'
      ];
      
      // Process shifts in order
      shiftOrder.forEach(shiftType => {
        const shiftEntries = shiftData[shiftType];
        if (!shiftEntries || shiftEntries.length === 0) return;
        
        // Get staff names with color indicators
        const staffNamesWithColors = this.formatStaffNamesWithColors(shiftEntries);
        
        // Get remarks from special date info
        const remarks = this.extractRemarks(shiftEntries);
        
        // Format shift type for display
        const formattedShift = this.formatShiftTypeForList(shiftType);
        
        tableData.push([
          this.formatDateForList(date),  // DDD dd-mmm-yyyy
          formattedShift,                // Shift type
          staffNamesWithColors,          // Staff names with color indicators
          remarks                        // Remarks
        ]);
      });
    });
    
    return tableData;
  }
  
  /**
   * Format staff names with actual text colors based on their edit status
   */
  private formatStaffNamesWithColors(entries: RosterEntry[]): { text: string; color: number[] }[] {
    return entries.map(entry => {
      const staffName = entry.assigned_name;
      const textColor = this.getTextColor(entry);
      
      return {
        text: staffName,
        color: this.hexToRgb(textColor)
      };
    });
  }
  
  /**
   * Get actual text color for staff name based on edit status
   */
  private getTextColor(entry: RosterEntry): string {
    // HIGHEST PRIORITY: Admin-set text color
    if (entry.text_color) {
      return entry.text_color;
    }
    
    // Use the EXACT same logic as RosterEntryCell component - FIXED
    const hasBeenReverted = (() => {
      if (!entry.change_description) return false;
      
      const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
      if (originalPdfMatch) {
        let originalPdfAssignment = originalPdfMatch[1].trim();
        
        // Fix missing closing parenthesis if it exists
        if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
          originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
        }
        
        // CRITICAL: Check if current assignment matches original PDF assignment
        return entry.assigned_name === originalPdfAssignment && entry.last_edited_by === 'ADMIN';
      }
      
      return false;
    })();
    
    // Check if entry has been edited (name changed) by non-ADMIN users
    const hasBeenEdited = entry.change_description && 
                         entry.change_description.includes('Name changed from') &&
                         entry.last_edited_by !== 'ADMIN';
    
    if (hasBeenReverted) {
      return '#059669'; // Green for reverted entries (back to original PDF by ADMIN)
    } else if (hasBeenEdited) {
      return '#dc2626'; // Red for edited entries (by non-ADMIN users)
    } else {
      return '#000000'; // Black for original entries
    }
  }
  
  /**
   * Convert hex color to RGB array for jsPDF
   */
  private hexToRgb(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0]; // Default to black if parsing fails
  }
  
  /**
   * Create table data with colored text for staff names
   */
  private createColoredTableData(entries: RosterEntry[]): any[] {
    // Group entries by date and shift type
    const groupedData: Record<string, Record<string, RosterEntry[]>> = {};
    
    entries.forEach(entry => {
      const dateKey = entry.date;
      const shiftType = entry.shift_type;
      
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {};
      }
      if (!groupedData[dateKey][shiftType]) {
        groupedData[dateKey][shiftType] = [];
      }
      groupedData[dateKey][shiftType].push(entry);
    });
    
    // Convert to table rows with colored text
    const tableData: any[] = [];
    
    // Sort dates
    const sortedDates = Object.keys(groupedData).sort();
    
    sortedDates.forEach(date => {
      const shiftData = groupedData[date];
      
      // Define shift order for consistent display
      const shiftOrder = [
        'Morning Shift (9-4)',
        'Saturday Regular (12-10)', 
        'Evening Shift (4-10)',
        'Night Duty',
        'Sunday/Public Holiday/Special'
      ];
      
      // Process shifts in order
      shiftOrder.forEach(shiftType => {
        const shiftEntries = shiftData[shiftType];
        if (!shiftEntries || shiftEntries.length === 0) return;
        
        // Get staff names with colors
        const staffWithColors = this.formatStaffNamesWithColors(shiftEntries);
        
        // Get remarks from special date info
        const remarks = this.extractRemarks(shiftEntries);
        
        // Format shift type for display
        const formattedShift = this.formatShiftTypeForList(shiftType);
        
        // Create row with colored staff names
        const row = [
          this.formatDateForList(date),  // DDD dd-mmm-yyyy
          formattedShift,                // Shift type
          staffWithColors,               // Staff names with color info
          remarks                        // Remarks
        ];
        
        tableData.push(row);
      });
    });
    
    return tableData;
  }
  
  /**
   * Extract remarks from entries (special date info)
   */
  private extractRemarks(entries: RosterEntry[]): string {
    // Look for special date information in change descriptions
    for (const entry of entries) {
      if (entry.change_description && entry.change_description.includes('Special Date:')) {
        const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
        if (match && match[1].trim()) {
          // Only show text before asterisk (*) if asterisk exists
          const fullRemarks = match[1].trim();
          return fullRemarks.includes('*') ? fullRemarks.split('*')[0].trim() : fullRemarks;
        }
      }
    }
    return ''; // No special remarks
  }
  
  /**
   * Format date as DDD dd-mmm-yyyy (e.g., "Mon 01-Jul-2025")
   */
  private formatDateForList(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName} ${day}-${monthName}-${year}`;
  }
  
  /**
   * Format shift type for list display
   */
  private formatShiftTypeForList(shiftType: string): string {
    const shortNames: Record<string, string> = {
      'Morning Shift (9-4)': 'Morning Shift (9-4)',
      'Evening Shift (4-10)': 'Evening Shift (4-10)', 
      'Saturday Regular (12-10)': 'Saturday Regular (12-10)',
      'Night Duty': 'Night Duty',
      'Sunday/Public Holiday/Special': 'Sunday/Public Holiday/Special'
    };
    return shortNames[shiftType] || shiftType;
  }
}

// Create singleton instance
export const rosterListGenerator = new RosterListGenerator();