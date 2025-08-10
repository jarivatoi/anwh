// Table-based PDF parser for roster table format
import { availableNames } from '../rosterAuth';

export interface ParsedEntry {
  date: string;
  shiftType: string;
  assignedName: string;
}

export class TableParser {
  
  /**
   * Parse PDF page using table-based approach for roster table format:
   * 1. Find all text items and group them by rows (similar Y coordinates)
   * 2. For each row, extract date, shift type, and assigned staff
   * 3. Create entries from the structured table data
   */
  parsePageAsTable(textItems: Array<{text: string, x: number, y: number}>): ParsedEntry[] {
    console.log('📊 TABLE PARSER: Starting table-based parsing...');
    
    const entries: ParsedEntry[] = [];
    
    // STEP 1: Group text items by rows (similar Y coordinates)
    const rows = this.groupTextItemsByRows(textItems);
    console.log(`📊 Found ${rows.length} rows in the table`);
    
    // STEP 2: Process each row to extract roster data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      console.log(`📊 Processing row ${i + 1} with ${row.length} items`);
      
      // Skip header rows (they usually contain "Date", "Shift Type", etc.)
      if (this.isHeaderRow(row)) {
        console.log(`📊 Skipping header row ${i + 1}`);
        continue;
      }
      
      // Extract data from this row
      const rowData = this.extractRowData(row);
      if (rowData) {
        entries.push(rowData);
        console.log(`✅ TABLE ROW: ${rowData.assignedName} | ${rowData.shiftType} | ${rowData.date}`);
      }
    }
    
    console.log(`📊 TABLE PARSER: Found ${entries.length} entries`);
    return entries;
  }
  
  /**
   * Group text items by rows based on Y coordinates
   */
  private groupTextItemsByRows(textItems: Array<{text: string, x: number, y: number}>): Array<Array<{text: string, x: number, y: number}>> {
    const rows: Array<Array<{text: string, x: number, y: number}>> = [];
    const tolerance = 5; // Y coordinate tolerance for grouping items in the same row
    
    // Sort items by Y coordinate (top to bottom)
    const sortedItems = [...textItems].sort((a, b) => b.y - a.y);
    
    for (const item of sortedItems) {
      // Find existing row with similar Y coordinate
      let foundRow = false;
      for (const row of rows) {
        if (row.length > 0 && Math.abs(row[0].y - item.y) <= tolerance) {
          row.push(item);
          foundRow = true;
          break;
        }
      }
      
      // If no existing row found, create a new one
      if (!foundRow) {
        rows.push([item]);
      }
    }
    
    // Sort items within each row by X coordinate (left to right)
    rows.forEach(row => {
      row.sort((a, b) => a.x - b.x);
    });
    
    return rows;
  }
  
  /**
   * Check if a row is a header row
   */
  private isHeaderRow(row: Array<{text: string, x: number, y: number}>): boolean {
    const rowText = row.map(item => item.text.toLowerCase()).join(' ');
    
    // Check for common header keywords
    const headerKeywords = [
      'date', 'day', 'shift type', 'assigned staff', 'last edited', 
      'morning', 'evening', 'saturday', 'night duty', 'staff'
    ];
    
    for (const keyword of headerKeywords) {
      if (rowText.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Extract roster data from a table row
   */
  private extractRowData(row: Array<{text: string, x: number, y: number}>): ParsedEntry | null {
    let date: string | null = null;
    let shiftType: string | null = null;
    let assignedName: string | null = null;
    
    // Process each item in the row
    for (const item of row) {
      // Try to extract date
      if (!date) {
        const dateMatch = this.extractDateFromText(item.text);
        if (dateMatch) {
          date = dateMatch.date;
          console.log(`📅 TABLE: Found date: ${date} from "${item.text}"`);
        }
      }
      
      // Try to extract shift type
      if (!shiftType) {
        const shift = this.identifyShiftTypeFromText(item.text);
        if (shift) {
          shiftType = shift;
          console.log(`⏰ TABLE: Found shift: ${shiftType} from "${item.text}"`);
        }
      }
      
      // Try to extract staff name
      if (!assignedName) {
        const staff = this.findMatchingStaffName(item.text);
        if (staff) {
          assignedName = staff;
          console.log(`👤 TABLE: Found staff: ${assignedName} from "${item.text}"`);
        }
      }
    }
    
    // Only create entry if we have all required data
    if (date && shiftType && assignedName) {
      return {
        date,
        shiftType,
        assignedName
      };
    }
    
    // Log missing data for debugging
    if (!date || !shiftType || !assignedName) {
      console.log(`❌ TABLE: Incomplete row data - Date: ${date}, Shift: ${shiftType}, Staff: ${assignedName}`);
    }
    
    return null;
  }
  
  /**
   * Extract date from text - handles all the specified formats
   */
  private extractDateFromText(text: string): {date: string, dayOfWeek: number} | null {
    const cleanText = text.trim();
    
    // Format 1: DD/MM/YYYY (01/07/2025)
    const ddmmyyyySlashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyySlashMatch = cleanText.match(ddmmyyyySlashPattern);
    if (ddmmyyyySlashMatch) {
      const [, day, month, year] = ddmmyyyySlashMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 2: DD MM YYYY (25 07 2025)
    const ddmmyyyySpacePattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/;
    const ddmmyyyySpaceMatch = cleanText.match(ddmmyyyySpacePattern);
    if (ddmmyyyySpaceMatch) {
      const [, day, month, year] = ddmmyyyySpaceMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 3: DD-MM-YYYY (25-07-2025)
    const ddmmyyyyDashPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const ddmmyyyyDashMatch = cleanText.match(ddmmyyyyDashPattern);
    if (ddmmyyyyDashMatch) {
      const [, day, month, year] = ddmmyyyyDashMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 4: DD-Jul-YYYY (25-Jul-2025)
    const ddmmmyyyyPattern = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i;
    const ddmmmyyyyMatch = cleanText.match(ddmmmyyyyPattern);
    if (ddmmmyyyyMatch) {
      const [, day, monthName, year] = ddmmmyyyyMatch;
      const monthNumber = this.getMonthNumber(monthName);
      if (monthNumber !== -1) {
        const standardDate = `${year}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dateObj = new Date(standardDate);
        
        if (this.isValidDate(dateObj, parseInt(year), monthNumber, parseInt(day))) {
          return { date: standardDate, dayOfWeek: dateObj.getDay() };
        }
      }
    }
    
    // Format 5: DD MM YY (25 07 25)
    const ddmmyySpacePattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{2})$/;
    const ddmmyySpaceMatch = cleanText.match(ddmmyySpacePattern);
    if (ddmmyySpaceMatch) {
      const [, day, month, year] = ddmmyySpaceMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 6: DD-MM-YY (25-07-25)
    const ddmmyyDashPattern = /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
    const ddmmyyDashMatch = cleanText.match(ddmmyyDashPattern);
    if (ddmmyyDashMatch) {
      const [, day, month, year] = ddmmyyDashMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 7: DD-jul-YY (25-jul-25)
    const ddmmmyyPattern = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/i;
    const ddmmmyyMatch = cleanText.match(ddmmmyyPattern);
    if (ddmmmyyMatch) {
      const [, day, monthName, year] = ddmmmyyMatch;
      const monthNumber = this.getMonthNumber(monthName);
      if (monthNumber !== -1) {
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        const standardDate = `${fullYear}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dateObj = new Date(standardDate);
        
        if (this.isValidDate(dateObj, parseInt(fullYear), monthNumber, parseInt(day))) {
          return { date: standardDate, dayOfWeek: dateObj.getDay() };
        }
      }
    }
    
    // Format 8: DD/MM/YY (25/7/25)
    const ddmmyySlashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
    const ddmmyySlashMatch = cleanText.match(ddmmyySlashPattern);
    if (ddmmyySlashMatch) {
      const [, day, month, year] = ddmmyySlashMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    return null;
  }
  
  /**
   * Convert month name to number (1-12)
   */
  private getMonthNumber(monthName: string): number {
    const months: Record<string, number> = {
      'jan': 1, 'january': 1,
      'feb': 2, 'february': 2,
      'mar': 3, 'march': 3,
      'apr': 4, 'april': 4,
      'may': 5,
      'jun': 6, 'june': 6,
      'jul': 7, 'july': 7,
      'aug': 8, 'august': 8,
      'sep': 9, 'september': 9,
      'oct': 10, 'october': 10,
      'nov': 11, 'november': 11,
      'dec': 12, 'december': 12
    };
    
    return months[monthName.toLowerCase()] || -1;
  }
  
  /**
   * Validate if a date is actually valid
   */
  private isValidDate(dateObj: Date, expectedYear: number, expectedMonth: number, expectedDay: number): boolean {
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    
    const actualYear = dateObj.getFullYear();
    const actualMonth = dateObj.getMonth() + 1;
    const actualDay = dateObj.getDate();
    
    return actualYear === expectedYear && 
           actualMonth === expectedMonth && 
           actualDay === expectedDay;
  }
  
  /**
   * Identify shift type from text
   */
  private identifyShiftTypeFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Direct matches for shift types
    if (lowerText.includes('evening (4-10)') || lowerText.includes('evening \\(4-10\\)')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('morning (9-4)') || lowerText.includes('morning \\(9-4\\)')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('saturday (12-10)') || lowerText.includes('saturday \\(12-10\\)')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('night duty')) {
      return 'Night Duty';
    }
    
    // Time-based patterns
    if (lowerText.includes('4-10') || lowerText.includes('16hrs-22hrs')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('9-4') || lowerText.includes('9hrs-16hrs')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('12-10') || lowerText.includes('12hrs-22hrs')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('22hrs-9hrs') || lowerText.includes('22-9')) {
      return 'Night Duty';
    }
    
    // Word-based patterns
    if (lowerText.includes('evening')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('morning')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('saturday')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('night') || lowerText.includes('duty')) {
      return 'Night Duty';
    }
    
    if (lowerText.includes('sunday') || lowerText.includes('special') || lowerText.includes('holiday')) {
      return 'Sunday/Public Holiday/Special';
    }
    
    return null;
  }
  
  /**
   * Find matching staff name
   */
  private findMatchingStaffName(text: string): string | null {
    const cleanText = text.trim().toUpperCase();
    
    // Skip very short text or obvious non-names
    if (cleanText.length < 3) {
      return null;
    }
    
    // Skip common non-name patterns
    const skipPatterns = [
      /^\d+$/, // Pure numbers
      /^[A-Z]{1,2}$/, // Single/double letters
      /SHIFT/i, /DUTY/i, /MORNING/i, /EVENING/i, /NIGHT/i, /SATURDAY/i, /SUNDAY/i,
      /HRS/i, /AM/i, /PM/i, /DATE/i, /TIME/i, /SYSTEM/i, /EDITED/i
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(cleanText)) {
        return null;
      }
    }
    
    // Check against available staff names
    for (const name of availableNames) {
      const nameUpper = name.toUpperCase();
      
      // Exact match (with or without (R))
      if (cleanText === nameUpper) {
        return name;
      }
      
      // Base name match (without (R) suffix)
      const baseName = nameUpper.replace(/\(R\)$/, '').trim();
      const cleanTextBase = cleanText.replace(/\(R\)$/, '').trim();
      
      if (cleanTextBase === baseName && baseName.length > 3) {
        return name;
      }
      
      // Partial match for longer names
      if ((cleanText.includes(nameUpper) && nameUpper.length > 4) ||
          (nameUpper.includes(cleanText) && cleanText.length > 4) ||
          (cleanTextBase.includes(baseName) && baseName.length > 4) ||
          (baseName.includes(cleanTextBase) && cleanTextBase.length > 4)) {
        return name;
      }
    }
    
    return null;
  }
}