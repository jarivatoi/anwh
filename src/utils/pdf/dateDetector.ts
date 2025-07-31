// Find dates above staff names
export interface DateInfo {
  date: string;
  dayOfWeek: number;
}

export class DateDetector {
  
  /**
   * STEP 2A: Go up to find the date above a staff name
   */
  findDateAbove(
    textItems: Array<{text: string, x: number, y: number}>, 
    staffPosition: {name: string, x: number, y: number}
  ): DateInfo | null {
    console.log(`📅 STEP 2A: Looking for date above ${staffPosition.name} at (${staffPosition.x}, ${staffPosition.y})`);
    
    // Look for items above the staff name (smaller Y coordinate) in the same column with tighter tolerance
    const itemsAbove = textItems.filter(item => 
      item.y < staffPosition.y && // Above the staff name
      Math.abs(item.x - staffPosition.x) < 20 // Much tighter column tolerance
    );
    
    // Sort by Y distance first (closest above), then by X distance
    itemsAbove.sort((a, b) => {
      // First priority: Y distance (closest above)
      const yDistanceA = staffPosition.y - a.y;
      const yDistanceB = staffPosition.y - b.y;
      
      if (Math.abs(yDistanceA - yDistanceB) > 5) {
        return yDistanceA - yDistanceB; // Closest Y first
      }
      
      // Second priority: X distance (same column)
      const xDistanceA = Math.abs(a.x - staffPosition.x);
      const xDistanceB = Math.abs(b.x - staffPosition.x);
      return xDistanceA - xDistanceB;
    });
    
    console.log(`📅 Found ${itemsAbove.length} items above ${staffPosition.name}`);
    
    // Show the closest items above for debugging (more items)
    if (itemsAbove.length > 0) {
      console.log(`📅 Closest items above ${staffPosition.name}:`, 
        itemsAbove.slice(0, 5).map(item => `"${item.text}" at (${item.x}, ${item.y}) - Y distance: ${(staffPosition.y - item.y).toFixed(1)}`));
    }
    
    // Look for date patterns in items above
    for (const item of itemsAbove) {
      const dateMatch = this.extractDateFromText(item.text);
      if (dateMatch) {
        console.log(`📅 Found date above ${staffPosition.name}: ${dateMatch.date} (${item.text}) at (${item.x}, ${item.y})`);
        return dateMatch;
      }
    }
    
    console.log(`❌ No date found above ${staffPosition.name}`);
    return null;
  }

  private extractDateFromText(text: string): DateInfo | null {
    console.log(`📅 DATE DEBUG: Analyzing text: "${text}"`);
    console.log(`📅 DATE DEBUG: Text length: ${text.length}`);
    console.log(`📅 DATE DEBUG: Text trimmed: "${text.trim()}"`);
    
    // Look for date patterns - prioritize single day numbers for July 2025
    const singleDayPattern = /^(\d{1,2})$/; // Single number (day)
    const dayMonthPattern = /^(\d{1,2})\s+(\d{1,2})$/; // "26 07" format
    const fullDatePattern = /^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/; // Full date
    const dayMonthYearPattern = /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/; // "01 07 2025" format
    
    // PRIORITY 1: Check for single day number first (most common in roster tables)
    const dayMatch = text.match(singleDayPattern);
    if (dayMatch && parseInt(dayMatch[1]) >= 1 && parseInt(dayMatch[1]) <= 31) {
      console.log(`📅 DATE DEBUG: Single day match: "${dayMatch[1]}"`);
      const day = dayMatch[1].padStart(2, '0');
      const standardDate = `2025-07-${day}`;
      const dateObj = new Date(standardDate);
      console.log(`📅 Parsed single day format: "${text}" -> ${standardDate}`);
      return {
        date: standardDate,
        dayOfWeek: dateObj.getDay()
      };
    }
    
    // PRIORITY 1.5: Check for "DD MM" format (day month without year)
    const dayMonthMatch = text.match(dayMonthPattern);
    console.log(`📅 DATE DEBUG: Day-month pattern test result:`, dayMonthMatch);
    if (dayMonthMatch && parseInt(dayMonthMatch[1]) >= 1 && parseInt(dayMonthMatch[1]) <= 31 && parseInt(dayMonthMatch[2]) >= 1 && parseInt(dayMonthMatch[2]) <= 12) {
      const day = dayMonthMatch[1].padStart(2, '0');
      const month = dayMonthMatch[2].padStart(2, '0');
      const standardDate = `2025-${month}-${day}`;
      const dateObj = new Date(standardDate);
      console.log(`📅 Parsed day-month format: "${text}" -> ${standardDate}`);
      return { date: standardDate, dayOfWeek: dateObj.getDay() };
    }
    
    // PRIORITY 2: Check for "DD MM YYYY" format
    const dayMonthYearMatch = text.match(dayMonthYearPattern);
    console.log(`📅 DATE DEBUG: Day-month-year pattern test result:`, dayMonthYearMatch);
    if (dayMonthYearMatch) {
      const [, day, month, year] = dayMonthYearMatch;
      const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      console.log(`📅 Parsed day-month-year format: "${text}" -> ${standardDate}`);
      // Add validation to ensure the date is reasonable
      if (dateObj.getFullYear() !== parseInt(year) || dateObj.getMonth() !== parseInt(month) - 1 || dateObj.getDate() !== parseInt(day)) {
        console.log(`⚠️ DATE VALIDATION FAILED for "${text}" -> ${standardDate}`);
        console.log(`   Expected: Year=${year}, Month=${parseInt(month)-1}, Day=${day}`);
        console.log(`   Got: Year=${dateObj.getFullYear()}, Month=${dateObj.getMonth()}, Day=${dateObj.getDate()}`);
        console.log(`   Date object: ${dateObj.toString()}`);
        console.log(`   ISO string: ${dateObj.toISOString()}`);
        console.log(`⚠️ Date validation failed for "${text}" -> ${standardDate}`);
        return null;
      }
      return {
        date: standardDate,
        dayOfWeek: dateObj.getDay()
      };
    }
    
    // PRIORITY 3: Check for full date
    const fullMatch = text.match(fullDatePattern);
    console.log(`📅 DATE DEBUG: Full date pattern test result:`, fullMatch);
    if (fullMatch) {
      const [, day, month, year] = fullMatch;
      const fullYear = year.length === 2 ? (parseInt(year) > 50 ? '19' + year : '20' + year) : year;
      const standardDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const dateObj = new Date(standardDate);
      // Add validation
      if (dateObj.getFullYear() !== parseInt(fullYear) || dateObj.getMonth() !== parseInt(month) - 1 || dateObj.getDate() !== parseInt(day)) {
        console.log(`⚠️ Date validation failed for "${text}" -> ${standardDate}`);
        return null;
      }
      console.log(`📅 Parsed full date format: "${text}" -> ${standardDate}`);
      return {
        date: standardDate,
        dayOfWeek: dateObj.getDay()
      };
    }
    
    console.log(`❌ DATE DEBUG: No pattern matched for: "${text}"`);
    return null;
  }
}