// Grid-based PDF parser that uses your suggested approach
import { availableNames } from '../rosterAuth';

export interface ParsedEntry {
  date: string;
  shiftType: string;
  assignedName: string;
}

export class GridParser {
  
  /**
   * Parse PDF page using grid-based approach:
   * 1. Find dates (column headers)
   * 2. Find shifts (row headers) 
   * 3. Find intersections where staff names appear
   */
  parsePageAsGrid(textItems: Array<{text: string, x: number, y: number}>): ParsedEntry[] {
    console.log('🔥 GRID PARSER: Starting grid-based parsing...');
    
    const entries: ParsedEntry[] = [];
    
    // STEP 1: Find all dates (column headers)
    const dateColumns = this.findDateColumns(textItems);
    console.log(`📅 Found ${dateColumns.length} date columns:`, dateColumns.map(d => `${d.date} at x=${d.x}`));
    
    // STEP 2: Find all shifts (row headers)
    const shiftRows = this.findShiftRows(textItems);
    console.log(`⏰ Found ${shiftRows.length} shift rows:`, shiftRows.map(s => `${s.shiftType} at y=${s.y}`));
    
    // STEP 3: Find all staff names
    const staffNames = this.findAllStaffNames(textItems);
    console.log(`👥 Found ${staffNames.length} staff names`);
    
    // STEP 4: For each staff name, determine which date column and shift row it belongs to
    for (const staff of staffNames) {
      // Find the closest date column (above the staff name)
      const dateColumn = this.findClosestDateColumn(staff, dateColumns);
      if (!dateColumn) {
        console.log(`❌ No date column found for ${staff.name} at (${staff.x}, ${staff.y})`);
        continue;
      }
      
      // Find the closest shift row (to the left of the staff name)
      const shiftRow = this.findClosestShiftRow(staff, shiftRows);
      if (!shiftRow) {
        console.log(`❌ No shift row found for ${staff.name} at (${staff.x}, ${staff.y})`);
        continue;
      }
      
      console.log(`✅ GRID MATCH: ${staff.name} | ${shiftRow.shiftType} | ${dateColumn.date}`);
      
      entries.push({
        date: dateColumn.date,
        shiftType: shiftRow.shiftType,
        assignedName: staff.name
      });
    }
    
    return entries;
  }
  
  /**
   * Find date columns (dates that appear at the top of the page)
   */
  private findDateColumns(textItems: Array<{text: string, x: number, y: number}>): Array<{date: string, x: number, y: number}> {
    const dateColumns: Array<{date: string, x: number, y: number}> = [];
    
    // Look for dates in the top portion of the page (y < 200)
    const topItems = textItems.filter(item => item.y < 200);
    
    for (const item of topItems) {
      const dateMatch = this.extractDateFromText(item.text);
      if (dateMatch) {
        dateColumns.push({
          date: dateMatch.date,
          x: item.x,
          y: item.y
        });
        console.log(`📅 Found date column: ${dateMatch.date} at (${item.x}, ${item.y})`);
      }
    }
    
    // Sort by x position (left to right)
    return dateColumns.sort((a, b) => a.x - b.x);
  }
  
  /**
   * Find shift rows (shifts that appear on the left side of the page)
   */
  private findShiftRows(textItems: Array<{text: string, x: number, y: number}>): Array<{shiftType: string, x: number, y: number}> {
    const shiftRows: Array<{shiftType: string, x: number, y: number}> = [];
    
    // Look for shifts in the left portion of the page (x < 200)
    const leftItems = textItems.filter(item => item.x < 200);
    
    for (const item of leftItems) {
      const shiftType = this.identifyShiftTypeFromText(item.text);
      if (shiftType) {
        shiftRows.push({
          shiftType: shiftType,
          x: item.x,
          y: item.y
        });
        console.log(`⏰ Found shift row: ${shiftType} at (${item.x}, ${item.y})`);
      }
    }
    
    // Sort by y position (top to bottom)
    return shiftRows.sort((a, b) => a.y - b.y);
  }
  
  /**
   * Find all staff names in the PDF
   */
  private findAllStaffNames(textItems: Array<{text: string, x: number, y: number}>): Array<{name: string, x: number, y: number}> {
    const staffNames: Array<{name: string, x: number, y: number}> = [];
    
    for (const item of textItems) {
      const matchedName = this.findMatchingStaffName(item.text);
      if (matchedName) {
        staffNames.push({
          name: matchedName,
          x: item.x,
          y: item.y
        });
      }
    }
    
    return staffNames;
  }
  
  /**
   * Find the closest date column for a staff member (the date above them)
   */
  private findClosestDateColumn(staff: {name: string, x: number, y: number}, dateColumns: Array<{date: string, x: number, y: number}>): {date: string, x: number, y: number} | null {
    let closestColumn = null;
    let minDistance = Infinity;
    
    for (const column of dateColumns) {
      // Date should be above the staff member (smaller y) and reasonably close horizontally
      if (column.y < staff.y) {
        const horizontalDistance = Math.abs(column.x - staff.x);
        const verticalDistance = staff.y - column.y;
        
        // Prioritize horizontal alignment, but allow some vertical distance
        const totalDistance = horizontalDistance + (verticalDistance * 0.1);
        
        if (totalDistance < minDistance) {
          minDistance = totalDistance;
          closestColumn = column;
        }
      }
    }
    
    return closestColumn;
  }
  
  /**
   * Find the closest shift row for a staff member (the shift to their left)
   */
  private findClosestShiftRow(staff: {name: string, x: number, y: number}, shiftRows: Array<{shiftType: string, x: number, y: number}>): {shiftType: string, x: number, y: number} | null {
    let closestRow = null;
    let minDistance = Infinity;
    
    for (const row of shiftRows) {
      // Shift should be to the left of the staff member (smaller x) and reasonably close vertically
      if (row.x < staff.x) {
        const horizontalDistance = staff.x - row.x;
        const verticalDistance = Math.abs(row.y - staff.y);
        
        // Prioritize vertical alignment, but allow some horizontal distance
        const totalDistance = verticalDistance + (horizontalDistance * 0.1);
        
        if (totalDistance < minDistance) {
          minDistance = totalDistance;
          closestRow = row;
        }
      }
    }
    
    return closestRow;
  }
  
  /**
   * Extract date from text (same logic as before but simplified)
   */
  private extractDateFromText(text: string): {date: string, dayOfWeek: number} | null {
    const cleanText = text.trim();
    
    // DD MM YYYY format (like "01 07 2025")
    const dayMonthYearPattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/;
    const dayMonthYearMatch = cleanText.match(dayMonthYearPattern);
    if (dayMonthYearMatch) {
      const [, day, month, year] = dayMonthYearMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      // Validate the date
      if (dateObj.getFullYear() === parseInt(year) && 
          dateObj.getMonth() === parseInt(month) - 1 && 
          dateObj.getDate() === parseInt(day)) {
        return {
          date: standardDate,
          dayOfWeek: dateObj.getDay()
        };
      }
    }
    
    // DD MM format (like "01 07")
    const dayMonthPattern = /^(\d{1,2})\s+(\d{1,2})$/;
    const dayMonthMatch = cleanText.match(dayMonthPattern);
    if (dayMonthMatch && parseInt(dayMonthMatch[1]) >= 1 && parseInt(dayMonthMatch[1]) <= 31 && 
        parseInt(dayMonthMatch[2]) >= 1 && parseInt(dayMonthMatch[2]) <= 12) {
      const day = dayMonthMatch[1].padStart(2, '0');
      const month = dayMonthMatch[2].padStart(2, '0');
      const standardDate = `2025-${month}-${day}`;
      const dateObj = new Date(standardDate);
      return { date: standardDate, dayOfWeek: dateObj.getDay() };
    }
    
    // Single day number (like "01")
    const singleDayPattern = /^(\d{1,2})$/;
    const dayMatch = cleanText.match(singleDayPattern);
    if (dayMatch && parseInt(dayMatch[1]) >= 1 && parseInt(dayMatch[1]) <= 31) {
      const day = dayMatch[1].padStart(2, '0');
      const standardDate = `2025-07-${day}`;
      const dateObj = new Date(standardDate);
      return { date: standardDate, dayOfWeek: dateObj.getDay() };
    }
    
    return null;
  }
  
  /**
   * Identify shift type from text (same logic as before)
   */
  private identifyShiftTypeFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Single letter patterns (highest priority)
    if (text.trim() === 'N' || lowerText === 'night' || lowerText === 'n') {
      return 'Night Duty';
    }
    
    // Time patterns
    if (lowerText.includes('9-4') || lowerText.includes('9hrs-16hrs')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('4-10') || lowerText.includes('16hrs-22hrs')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('12-10') || lowerText.includes('12hrs-22hrs')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('22hrs-9hrs') || lowerText.includes('22-9')) {
      return 'Night Duty';
    }
    
    // Word-based patterns
    if (lowerText.includes('morning')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('evening')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('saturday')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('sunday') || lowerText.includes('special') || lowerText.includes('holiday')) {
      return 'Sunday/Public Holiday/Special';
    }
    
    if (lowerText.includes('duty') || lowerText.includes('night')) {
      return 'Night Duty';
    }
    
    return null;
  }
  
  /**
   * Find matching staff name (same logic as before)
   */
  private findMatchingStaffName(text: string): string | null {
    const cleanText = text.trim().toUpperCase();
    
    // Skip very short text or obvious non-names
    if (cleanText.length < 3) return null;
    
    // Skip common non-name patterns
    const skipPatterns = [
      /^\d+$/, // Pure numbers
      /^[A-Z]{1,2}$/, // Single/double letters
      /SHIFT/i, /DUTY/i, /MORNING/i, /EVENING/i, /NIGHT/i, /SATURDAY/i, /SUNDAY/i,
      /HRS/i, /AM/i, /PM/i, /DATE/i, /TIME/i
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(cleanText)) return null;
    }
    
    // Check against available staff names
    for (const name of availableNames) {
      const nameUpper = name.toUpperCase();
      
      // Extract base name without (R) for comparison
      const baseName = nameUpper.replace(/\(R\)$/, '').trim();
      const cleanTextBase = cleanText.replace(/\(R\)$/, '').trim();
      
      // Exact match (with or without (R))
      if (cleanText === nameUpper) {
        return name;
      }
      
      // Base name match (without (R) suffix)
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