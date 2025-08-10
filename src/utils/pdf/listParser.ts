// List-based PDF parser for simple table format
import { availableNames } from '../rosterAuth';

export interface ParsedEntry {
  date: string;
  shiftType: string;
  assignedName: string;
  changeDescription?: string;
}

export class ListParser {
  
  /**
   * Parse PDF page using list-based approach:
   * 1. Find all text items and sort by Y position (top to bottom)
   * 2. Group items by rows based on Y coordinates
   * 3. For each row, extract date, shift type, and staff name from appropriate columns
   */
  parsePageAsList(textItems: Array<{text: string, x: number, y: number}>): ParsedEntry[] {
    console.log('📋 LIST PARSER: Starting list-based parsing...');
    
    const entries: ParsedEntry[] = [];
    
    // STEP 1: Group text items by rows (Y coordinate)
    const rows = this.groupTextItemsByRows(textItems);
    console.log(`📋 Found ${rows.length} rows in the PDF`);
    
    // STEP 2: Process each row to extract roster data
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      console.log(`📋 Processing row ${i + 1} with ${row.length} items`);
      
      // Skip header rows (usually contain "Date", "Shift Type", etc.)
      if (this.isHeaderRow(row)) {
        console.log(`📋 Skipping header row ${i + 1}`);
        continue;
      }
      
      // Extract data from this row
      const rowData = this.extractDataFromRow(row);
      if (rowData) {
        entries.push(rowData);
        console.log(`✅ Extracted: ${rowData.assignedName} | ${rowData.shiftType} | ${rowData.date}`);
      } else {
        console.log(`❌ Could not extract data from row ${i + 1}`);
      }
    }
    
    console.log(`📋 LIST PARSER: Extracted ${entries.length} entries`);
    return entries;
  }
  
  /**
   * Group text items by rows based on Y coordinates
   */
  private groupTextItemsByRows(textItems: Array<{text: string, x: number, y: number}>): Array<Array<{text: string, x: number, y: number}>> {
    // Sort by Y coordinate (top to bottom)
    const sortedItems = [...textItems].sort((a, b) => b.y - a.y); // Descending Y (top to bottom)
    
    const rows: Array<Array<{text: string, x: number, y: number}>> = [];
    let currentRow: Array<{text: string, x: number, y: number}> = [];
    let currentY: number | null = null;
    const yTolerance = 5; // Items within 5 pixels are considered same row
    
    for (const item of sortedItems) {
      if (currentY === null || Math.abs(item.y - currentY) <= yTolerance) {
        // Same row or first item
        currentRow.push(item);
        currentY = item.y;
      } else {
        // New row
        if (currentRow.length > 0) {
          // Sort current row by X coordinate (left to right)
          currentRow.sort((a, b) => a.x - b.x);
          rows.push(currentRow);
        }
        currentRow = [item];
        currentY = item.y;
      }
    }
    
    // Add the last row
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }
    
    return rows;
  }
  
  /**
   * Check if a row is a header row
   */
  private isHeaderRow(row: Array<{text: string, x: number, y: number}>): boolean {
    const rowText = row.map(item => item.text.toLowerCase()).join(' ');
    
    // Check for common header patterns
    const headerPatterns = [
      'date', 'day', 'shift type', 'assigned staff', 'last edited',
      'morning', 'evening', 'saturday', 'night duty', 'staff'
    ];
    
    // If row contains multiple header keywords, it's likely a header
    const headerKeywordCount = headerPatterns.filter(pattern => 
      rowText.includes(pattern)
    ).length;
    
    return headerKeywordCount >= 2;
  }
  
  /**
   * Extract roster data from a single row
   */
  private extractDataFromRow(row: Array<{text: string, x: number, y: number}>): ParsedEntry | null {
    if (row.length < 4) {
      console.log(`📋 Row too short (${row.length} items), skipping`);
      return null;
    }
    
    console.log(`📋 EXTRACTING ROW DATA:`, row.map(item => `"${item.text}"`).join(' | '));
    
    // Expected column order from PDF: Date, Day, Shift Type, Assigned Staff, Last Edited By, Last Edited At, Remarks (optional)
    let date: string | null = null;
    let shiftType: string | null = null;
    let assignedName: string | null = null;
    
    // STEP 1: Find date (should be in first column - index 0)
    if (row.length > 0) {
      const dateMatch = this.extractDateFromText(row[0].text);
      if (dateMatch) {
        date = dateMatch.date;
        console.log(`📅 Found date in column 1: ${date}`);
      }
    }
    
    // STEP 2: Find shift type (should be in third column - index 2, after Date and Day)
    if (row.length > 2) {
      const shift = this.identifyShiftTypeFromText(row[2].text);
      if (shift) {
        shiftType = shift;
        console.log(`⏰ Found shift in column 3: ${shiftType}`);
      }
    }
    
    // STEP 3: Find staff name (should be in fourth column - index 3)
    if (row.length > 3) {
      const staff = this.findMatchingStaffName(row[3].text);
      if (staff) {
        assignedName = staff;
        console.log(`👤 Found staff in column 4: ${assignedName}`);
      }
    }
    
    // STEP 4: Check for remarks in last column (index 6 if 7 columns, or search for special date info)
    let remarks: string | null = null;
    if (row.length >= 7) {
      const remarksText = row[6].text.trim();
      if (remarksText && remarksText !== '' && remarksText.toLowerCase() !== 'remarks') {
        remarks = remarksText;
        console.log(`📝 Found remarks in column 7: ${remarks}`);
      }
    }
    
    // FALLBACK: If we didn't find data in expected columns, search all columns
    if (!date) {
      console.log(`📅 Date not found in column 1, searching all columns...`);
      for (let i = 0; i < Math.min(3, row.length); i++) {
        const dateMatch = this.extractDateFromText(row[i].text);
        if (dateMatch) {
          date = dateMatch.date;
          console.log(`📅 Found date in column ${i + 1}: ${date}`);
          break;
        }
      }
    }
    
    if (!shiftType) {
      console.log(`⏰ Shift not found in column 3, searching all columns...`);
      for (let i = 0; i < row.length; i++) {
        const shift = this.identifyShiftTypeFromText(row[i].text);
        if (shift) {
          shiftType = shift;
          console.log(`⏰ Found shift in column ${i + 1}: ${shiftType}`);
          break;
        }
      }
    }
    
    if (!assignedName) {
      console.log(`👤 Staff not found in column 4, searching all columns...`);
      for (let i = 0; i < row.length; i++) {
        const staff = this.findMatchingStaffName(row[i].text);
        if (staff) {
          assignedName = staff;
          console.log(`👤 Found staff in column ${i + 1}: ${assignedName}`);
          break;
        }
      }
    }
    
    // Validate that we found all required fields
    if (!date || !shiftType || !assignedName) {
      console.log(`❌ Missing required fields: date=${date}, shift=${shiftType}, staff=${assignedName}`);
      return null;
    }
    
    console.log(`✅ EXTRACTED ENTRY: ${assignedName} | ${shiftType} | ${date}`);
    
    const entry: ParsedEntry = {
      date,
      shiftType,
      assignedName
    };
    
    // Add remarks to change description if found
    if (remarks) {
      // For import: Store FULL remarks text (including after *) in change description
      (entry as any).changeDescription = `Special Date: ${remarks}; Imported from PDF`;
    } else {
      (entry as any).changeDescription = 'Imported from PDF';
    }
    
    return entry;
  }
  
  /**
   * Extract date from text - handles all the specified formats
   */
  private extractDateFromText(text: string): {date: string, dayOfWeek: number} | null {
    const cleanText = text.trim();
    
    console.log(`📅 DATE DEBUG: Analyzing text: "${cleanText}"`);
    
    // Format 0: DD/MM/YYYY (01/07/2025) - PRIORITY FORMAT for this PDF
    const ddmmyyyySlashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyySlashMatch = cleanText.match(ddmmyyyySlashPattern);
    if (ddmmyyyySlashMatch) {
      const [, day, month, year] = ddmmyyyySlashMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD/MM/YYYY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 1: DD/MM/YYYY (01/07/2025)
    const ddmmyyyySlashPattern2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyySlashMatch2 = cleanText.match(ddmmyyyySlashPattern2);
    if (ddmmyyyySlashMatch2) {
      const [, day, month, year] = ddmmyyyySlashMatch2;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD/MM/YYYY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 2: DD/MM/YY (25/07/25)
    const ddmmyySlashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
    const ddmmyySlashMatch = cleanText.match(ddmmyySlashPattern);
    if (ddmmyySlashMatch) {
      const [, day, month, year] = ddmmyySlashMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD/MM/YY format: "${cleanText}" -> ${standardDate}`);
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
        console.log(`📅 Parsed DD-MM-YYYY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 4: DD-MM-YY (25-07-25)
    const ddmmyyDashPattern = /^(\d{1,2})-(\d{1,2})-(\d{2})$/;
    const ddmmyyDashMatch = cleanText.match(ddmmyyDashPattern);
    if (ddmmyyDashMatch) {
      const [, day, month, year] = ddmmyyDashMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD-MM-YY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 5: DD-MMM-YYYY (25-Jul-2025)
    const ddmmmyyyyPattern = /^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i;
    const ddmmmyyyyMatch = cleanText.match(ddmmmyyyyPattern);
    if (ddmmmyyyyMatch) {
      const [, day, monthName, year] = ddmmmyyyyMatch;
      const monthNumber = this.getMonthNumber(monthName);
      if (monthNumber !== -1) {
        const standardDate = `${year}-${monthNumber.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dateObj = new Date(standardDate);
        
        if (this.isValidDate(dateObj, parseInt(year), monthNumber, parseInt(day))) {
          console.log(`📅 Parsed DD-MMM-YYYY format: "${cleanText}" -> ${standardDate}`);
          return { date: standardDate, dayOfWeek: dateObj.getDay() };
        }
      }
    }
    
    // Format 6: DD-MMM-YY (25-jul-25)
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
          console.log(`📅 Parsed DD-MMM-YY format: "${cleanText}" -> ${standardDate}`);
          return { date: standardDate, dayOfWeek: dateObj.getDay() };
        }
      }
    }
    
    // Format 7: DD MM YYYY (25 07 2025)
    const ddmmyyyySpacePattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/;
    const ddmmyyyySpaceMatch = cleanText.match(ddmmyyyySpacePattern);
    if (ddmmyyyySpaceMatch) {
      const [, day, month, year] = ddmmyyyySpaceMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(year), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD MM YYYY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    // Format 8: DD MM YY (25 07 25)
    const ddmmyySpacePattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{2})$/;
    const ddmmyySpaceMatch = cleanText.match(ddmmyySpacePattern);
    if (ddmmyySpaceMatch) {
      const [, day, month, year] = ddmmyySpaceMatch;
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      
      if (this.isValidDate(dateObj, parseInt(fullYear), parseInt(month), parseInt(day))) {
        console.log(`📅 Parsed DD MM YY format: "${cleanText}" -> ${standardDate}`);
        return { date: standardDate, dayOfWeek: dateObj.getDay() };
      }
    }
    
    console.log(`❌ DATE DEBUG: No pattern matched for: "${cleanText}"`);
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
      'may': 5, 'may': 5,
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
    
    const isValid = actualYear === expectedYear && 
                   actualMonth === expectedMonth && 
                   actualDay === expectedDay;
    
    if (!isValid) {
      console.log(`📅 Date validation failed:`, {
        expected: { year: expectedYear, month: expectedMonth, day: expectedDay },
        actual: { year: actualYear, month: actualMonth, day: actualDay }
      });
    }
    
    return isValid;
  }
  
  /**
   * Check if a row is a header row
   */
  private isHeaderRow(row: Array<{text: string, x: number, y: number}>): boolean {
    const rowText = row.map(item => item.text.toLowerCase()).join(' ');
    
    console.log(`📋 HEADER CHECK: Row text: "${rowText}"`);
    
    // Check for common header patterns
    const headerPatterns = [
      'date', 'day', 'shift type', 'assigned staff', 'last edited', 'staff', 'type'
    ];
    
    // If row contains multiple header keywords, it's likely a header
    const headerKeywordCount = headerPatterns.filter(pattern => 
      rowText.includes(pattern)
    ).length;
    
    const isHeader = headerKeywordCount >= 2;
    console.log(`📋 HEADER CHECK: Found ${headerKeywordCount} header keywords, isHeader: ${isHeader}`);
    
    return isHeader;
  }
  
  /**
   * Identify shift type from text
   */
  private identifyShiftTypeFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 SHIFT DEBUG: Analyzing text: "${text}"`);
    
    // PRIORITY 1: Exact parenthetical matches (most common in this PDF format)
    if (lowerText.includes('evening') && lowerText.includes('(4-10)')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('morning') && lowerText.includes('(9-4)')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('saturday') && lowerText.includes('(12-10)')) {
      return 'Saturday Regular (12-10)';
    }
    
    // PRIORITY 2: Direct shift type matches (most common in list format)
    if (lowerText.includes('evening') && lowerText.includes('4-10')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('morning') && lowerText.includes('9-4')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('saturday') && lowerText.includes('12-10')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('night duty') || lowerText === 'night duty') {
      return 'Night Duty';
    }
    
    if (lowerText.includes('sunday') || lowerText.includes('public holiday') || lowerText.includes('special')) {
      return 'Sunday/Public Holiday/Special';
    }
    
    // PRIORITY 3: Fallback patterns
    if (lowerText.includes('4-10') || lowerText.includes('16-22')) {
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('9-4') || lowerText.includes('9-16')) {
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('12-10') || lowerText.includes('12-22')) {
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText === 'n' || lowerText === 'night') {
      return 'Night Duty';
    }
    
    console.log(`❌ SHIFT DEBUG: No pattern matched for: "${text}"`);
    return null;
  }
  
  /**
   * Find matching staff name
   */
  private findMatchingStaffName(text: string): string | null {
    const cleanText = text.trim().toUpperCase();
    
    console.log(`👤 STAFF DEBUG: Analyzing text: "${cleanText}"`);
    
    // Skip very short text or obvious non-names
    if (cleanText.length < 3) {
      console.log(`👤 STAFF DEBUG: Text too short: "${cleanText}"`);
      return null;
    }
    
    // Skip common non-name patterns
    const skipPatterns = [
      /^\d+$/, // Pure numbers
      /^[A-Z]{1,2}$/, // Single/double letters
      /SHIFT/i, /DUTY/i, /MORNING/i, /EVENING/i, /NIGHT/i, /SATURDAY/i, /SUNDAY/i,
      /HRS/i, /^AM$/i, /^PM$/i, /DATE/i, /TIME/i, /SYSTEM/i, /EDITED/i, /LAST/i, /BY/i, /AT/i
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(cleanText)) {
        console.log(`👤 STAFF DEBUG: Skipping pattern match: "${cleanText}" matches ${pattern}`);
        return null;
      }
    }
    
    // PRIORITY 1: Perfect exact match
    for (const nameUpper of availableNames) {
      if (cleanText === nameUpper) {
        console.log(`✅ EXACT MATCH: "${cleanText}" exactly matches "${nameUpper}"`);
        return nameUpper;
      }
    }
    
    // PRIORITY 2: Base name match (handle (R) variants)
    for (const nameUpper of availableNames) {
      const baseName = nameUpper.replace(/\(R\)$/, '').trim();
      const cleanTextBase = cleanText.replace(/\(R\)$/, '').trim();
      
      if (cleanTextBase === baseName && baseName.length >= 3) {
        // If text has (R), return the (R) version
        if (cleanText.includes('(R)')) {
          const rVersion = availableNames.find(name => name === baseName + '(R)');
          if (rVersion) {
            console.log(`✅ BASE NAME MATCH WITH (R): "${cleanText}" matches "${rVersion}"`);
            return rVersion;
          }
        } else {
          // If text doesn't have (R), return the non-(R) version
          const nonRVersion = availableNames.find(name => name === baseName && !name.includes('(R)'));
          if (nonRVersion) {
            console.log(`✅ BASE NAME MATCH WITHOUT (R): "${cleanText}" matches "${nonRVersion}"`);
            return nonRVersion;
          }
        }
      }
    }
    
    console.log(`❌ NO MATCH: "${cleanText}" does not match any staff name`);
    return null;
  }
}