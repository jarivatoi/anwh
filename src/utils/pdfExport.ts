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
        willDrawCell: (data) => {
          // Clear staff names column content to prevent default rendering
          if (data.column.index === 2 && data.section === 'body') {
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          // Only draw custom colored text for staff names column in body
          if (data.column.index === 2 && data.section === 'body' && data.row.index >= 0) {
            // Get the staff data for this specific row
            if (data.row.index < tableData.length) {
              const originalRow = tableData[data.row.index];
              const staffNamesData = this.getStaffNamesForRow(originalRow[0], originalRow[1], entries);
              
              if (staffNamesData && staffNamesData.length > 0) {
                // Start drawing from left edge of cell with proper margin
                let currentX = data.cell.x + 2;
                let currentLine = 0;
                const lineHeight = 3;
                const lineHeight = 3;
                const maxWidth = data.cell.width - 4;
                let totalLines = 1;
                let tempX = 0;
                
                // Pre-calculate how many lines we'll need
                staffNamesData.forEach((staff, index) => {
                  const textToShow = index === 0 ? staff.name : `, ${staff.name}`;
                  const textWidth = doc.getTextWidth(textToShow);
                  
                  if (tempX + textWidth > maxWidth && index > 0) {
                    totalLines++;
                    tempX = doc.getTextWidth(staff.name); // Reset with just the name (no comma)
                  } else {
                    tempX += textWidth;
                  }
                });
                
                // Calculate starting Y position for vertical centering
                const totalHeight = totalLines * lineHeight;
                let cellY = data.cell.y + (data.cell.height / 2) - (totalHeight / 2) + 2;
                
                // Set font to match table
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                staffNamesData.forEach((staff, index) => {
                  // Set individual color for this staff member
                  const rgbColor = this.hexToRgb(staff.color);
                  doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
                  
                  // Format text with comma separator (but not at start of new lines)
                  const isFirstOnLine = currentX === data.cell.x + 2;
                  const textToShow = (index === 0 || isFirstOnLine) ? staff.name : `, ${staff.name}`;
                  const textWidth = doc.getTextWidth(textToShow);
                  
                  // Check if text would exceed cell width (with 4mm margin)
                  
                  // If text would exceed width, move to next line
                  if (currentX + textWidth > data.cell.x + maxWidth && index > 0) {
                   // Add comma at the end of current line if there are more names
                   if (index < staffNamesData.length - 1) {
                      doc.text(',', currentX, cellY);
                    }
                    
                    currentX = data.cell.x + 2; // Reset to left margin
                    cellY += lineHeight; // Move down for next line
                    
                    // Recalculate text without comma for new line
                    const newLineText = staff.name;
                    const newLineWidth = doc.getTextWidth(newLineText);
                    
                    // Draw the text at current position (no comma at start of line)
                    doc.text(newLineText, currentX, cellY);
                    currentX += newLineWidth;
                  } else {
                    // Draw the text at current position
                    doc.text(textToShow, currentX, cellY);
                    currentX += textWidth;
                  }
                });
                
                // Reset color for other cells
                doc.setTextColor(0, 0, 0);
              }
            }
          }
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          lineWidth: 0.25,
          lineColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [220, 220, 220],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.25,
        },
        bodyStyles: {
          lineWidth: 0.25,
          lineColor: [0, 0, 0]
        },
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`X-Ray Roster for ${monthNames[month]} ${year}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
          1: { cellWidth: 45, halign: 'left', valign: 'middle' }   // Shift (fixed width)
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
    
    // Check if entry has been reverted to original
    const hasBeenReverted = () => {
      if (!entry.change_description) return false;
      
      // Check if we have original PDF assignment stored
      const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
      if (originalPdfMatch) {
        let originalPdfAssignment = originalPdfMatch[1].trim();
        
        // Fix missing closing parenthesis if it exists
        if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
          originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
        }
        
        // Check if current assignment matches original PDF assignment (reverted to original)
      return false;
    };
    
    // Check if entry has been edited (name changed)
    const hasBeenEdited = entry.change_description && 
                         entry.change_description.includes('Name changed from') &&
                         entry.last_edited_by;

    if (hasBeenReverted()) {
      return '#059669'; // Green for reverted entries (back to original PDF by ADMIN)
    } else if (hasBeenEdited) {
      doc.text('No roster entries found for this month', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
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
   * Get staff names data for a specific row during PDF generation
   */
  private getStaffNamesForRow(date: string, shiftType: string, entries: RosterEntry[]): { name: string; color: string }[] {
    // Find entries that match this date and shift
    const matchingEntries = entries.filter(entry => {
      const formattedDate = this.formatDateForList(entry.date);
      const formattedShift = this.formatShiftTypeForList(entry.shift_type);
      return formattedDate === date && formattedShift === shiftType;
    });
    
    return matchingEntries.map(entry => ({
      name: entry.assigned_name,
      color: this.getTextColor(entry)
    }));
  }
  
  /**
   * Create table data with combined staff names but individual colors
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
      // Prepare table data in roster format
      const tableData = this.prepareRosterTableData(monthEntries);
        'Saturday Regular (12-10)', 
      // Create table matching roster view format
        'Night Duty',
        startY: 35,
        head: [['Date', 'Morning\n(9-4)', 'Saturday\n(12-10)', 'Evening\n(4-10)', 'Night\nDuty']],
      
      // Process shifts in order
      shiftOrder.forEach(shiftType => {
        const shiftEntries = shiftData[shiftType];
        if (!shiftEntries || shiftEntries.length === 0) return;
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.25,
          lineColor: [0, 0, 0]
        // Get remarks from special date info
        const remarks = this.extractRemarks(shiftEntries);
    const filename = `Roster_Preview_${monthNames[month]}_${year}.pdf`;
          textColor: [255, 255, 255],
        const formattedShift = this.formatShiftTypeForList(shiftType);
          fontSize: 9,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.25,
          lineColor: [0, 0, 0]
        // Combine all staff names with individual colors
   * Prepare table data in roster format (same as roster view)
          lineWidth: 0.25,
  private prepareRosterTableData(entries: RosterEntry[]): string[][] {
    // Group entries by date
    const groupedEntries = entries.reduce((groups, entry) => {
      const date = entry.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {} as Record<string, RosterEntry[]>);
    
    // Sort dates
    const sortedDates = Object.keys(groupedEntries).sort();
    
    const tableData: string[][] = [];
    
    // Define shift types in order
    const shiftTypes = [
      'Morning Shift (9-4)',
      'Saturday Regular (12-10)', 
      'Evening Shift (4-10)',
      'Night Duty',
      'Sunday/Public Holiday/Special'
    ];
    
    sortedDates.forEach(date => {
      const dateEntries = groupedEntries[date];
      
      // Group entries by shift type for this date
      const shiftGroups: Record<string, RosterEntry[]> = {};
      dateEntries.forEach(entry => {
        if (!shiftGroups[entry.shift_type]) {
          shiftGroups[entry.shift_type] = [];
        }
        shiftGroups[entry.shift_type].push(entry);
      });
      
      // Sort staff names within each shift group
      Object.keys(shiftGroups).forEach(shiftType => {
        const names = shiftGroups[shiftType].map(e => e.assigned_name);
        const sortedNames = sortByGroup(names);
        shiftGroups[shiftType] = sortedNames.map(name => 
          shiftGroups[shiftType].find(e => e.assigned_name === name)
        ).filter(Boolean) as RosterEntry[];
      });
      
      // Create table row for this date
      const morningStaff = (shiftGroups['Morning Shift (9-4)'] || []).map(e => e.assigned_name).join(', ');
      const saturdayStaff = (shiftGroups['Saturday Regular (12-10)'] || []).map(e => e.assigned_name).join(', ');
      const eveningStaff = (shiftGroups['Evening Shift (4-10)'] || []).map(e => e.assigned_name).join(', ');
      const nightStaff = (shiftGroups['Night Duty'] || []).map(e => e.assigned_name).join(', ');
      
      tableData.push([
        this.formatDateForRoster(date),
        morningStaff,
        saturdayStaff,
        eveningStaff,
        nightStaff
      ]);
    });
  /**
    return tableData;
  }
  
  /**
   * Format date for roster display (DDD dd-mmm-yyyy)
   */
  private formatDateForRoster(dateString: string): string {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName} ${day}-${monthName}-${year}`;
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