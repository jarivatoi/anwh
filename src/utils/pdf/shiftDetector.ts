// Find shift types to the left of staff names
export interface ShiftInfo {
  shiftType: string;
}

export class ShiftDetector {
  
  /**
   * STEP 2B: Go left to find the shift type to the left of a staff name
   */
  findShiftToLeft(
    textItems: Array<{text: string, x: number, y: number}>, 
    staffPosition: {name: string, x: number, y: number},
    date: string
  ): ShiftInfo | null {
    console.log(`⏰ STEP 2B: Looking for shift to LEFT of ${staffPosition.name} at (${staffPosition.x}, ${staffPosition.y})`);
    
    // Look for items to the left of the staff name (smaller X coordinate) in the same row
    const itemsToLeft = textItems.filter(item => 
      item.x < staffPosition.x && // To the left of staff name
      Math.abs(item.y - staffPosition.y) < 30 // Tighter row tolerance
    );
    
    // Sort by distance from staff name (closest first)
    itemsToLeft.sort((a, b) => {
      const distanceA = staffPosition.x - a.x; // Horizontal distance
      const distanceB = staffPosition.x - b.x; // Horizontal distance
      return distanceA - distanceB; // Closest first
    });
    
    console.log(`⏰ Found ${itemsToLeft.length} items to LEFT of ${staffPosition.name}`);
    
    // Show the closest items to the left for debugging
    if (itemsToLeft.length > 0) {
      console.log(`⏰ Closest items to LEFT of ${staffPosition.name}:`, 
        itemsToLeft.slice(0, 5).map(item => `"${item.text}" at (${item.x}, ${item.y}) - X distance: ${(staffPosition.x - item.x).toFixed(1)}`));
    }
    
    // Look for shift patterns in items to the left
    for (const item of itemsToLeft) {
      console.log(`🔍 Checking item to LEFT: "${item.text}" at (${item.x}, ${item.y}) - Distance: ${(staffPosition.x - item.x).toFixed(1)}px`);
      const shiftType = this.identifyShiftTypeFromText(item.text);
      if (shiftType) {
        console.log(`✅ FOUND SHIFT to LEFT of ${staffPosition.name}: ${shiftType} from text "${item.text}"`);
        return { shiftType };
      }
    }
    
    console.log(`❌ NO SHIFT found to LEFT of ${staffPosition.name}`);
    return null;
  }

  private identifyShiftTypeFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 SHIFT DEBUG: Original text: "${text}"`);
    console.log(`🔍 SHIFT DEBUG: Lowercase: "${lowerText}"`);
    console.log(`🔍 SHIFT DEBUG: Text length: ${text.length}`);
    
    // PRIORITY 1: Single letter patterns (common in roster headers) - MOVED TO TOP
    if (text.trim() === 'N' || lowerText === 'night' || lowerText === 'n') {
      console.log(`✅ SHIFT MATCH: 'N' or 'night' -> Night Duty`);
      return 'Night Duty';
    }
    
    // PRIORITY 2: Exact time patterns (MOST SPECIFIC) - these override everything else
    if (lowerText.includes('22hrs-9hrs') || lowerText.includes('22-9') || lowerText.includes('10pm-9am')) {
      console.log(`✅ SHIFT MATCH: Night duty pattern -> Night Duty`);
      return 'Night Duty';
    }
    
    if (lowerText.includes('12hrs-22hrs') || lowerText.includes('12-22') || lowerText.includes('12pm-10pm')) {
      console.log(`✅ SHIFT MATCH: Saturday pattern -> Saturday Regular (12-10)`);
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('16hrs-22hrs') || lowerText.includes('16-22')) {
      console.log(`✅ SHIFT MATCH: 16hrs-22hrs pattern -> Evening Shift (4-10)`);
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('9hrs-16hrs') || lowerText.includes('9-16')) {
      console.log(`✅ SHIFT MATCH: 9hrs-16hrs pattern -> Morning Shift (9-4)`);
      return 'Morning Shift (9-4)';
    }
    
    // PRIORITY 3: Simple time patterns without "hrs"
    if (lowerText.includes('22-9') || lowerText.includes('10-9')) {
      console.log(`✅ SHIFT MATCH: Night time pattern -> Night Duty`);
      return 'Night Duty';
    }
    
    if (lowerText.includes('12-10') || lowerText.includes('12-22')) {
      console.log(`✅ SHIFT MATCH: Saturday time pattern -> Saturday Regular (12-10)`);
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('16-22') || lowerText.includes('4-10')) {
      console.log(`✅ SHIFT MATCH: 16-22 or 4-10 pattern -> Evening Shift (4-10)`);
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('9-16') || lowerText.includes('9-4')) {
      console.log(`✅ SHIFT MATCH: 9-16 or 9-4 pattern -> Morning Shift (9-4)`);
      return 'Morning Shift (9-4)';
    }
    
    // PRIORITY 4: Alternative time formats
    if (lowerText.includes('4pm-10pm') || lowerText.includes('16:00-22:00')) {
      console.log(`✅ SHIFT MATCH: 4pm-10pm pattern -> Evening Shift (4-10)`);
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('9am-4pm') || lowerText.includes('09:00-16:00')) {
      console.log(`✅ SHIFT MATCH: 9am-4pm pattern -> Morning Shift (9-4)`);
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('12pm-10pm') || lowerText.includes('12:00-22:00')) {
      console.log(`✅ SHIFT MATCH: 12pm-10pm pattern -> Saturday Regular (12-10)`);
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('10pm-9am') || lowerText.includes('22:00-09:00')) {
      console.log(`✅ SHIFT MATCH: 10pm-9am pattern -> Night Duty`);
      return 'Night Duty';
    }
    
    // PRIORITY 5: Word-based patterns (only if no time patterns found)
    if (lowerText.includes('morning')) {
      console.log(`✅ SHIFT MATCH: 'morning' keyword -> Morning Shift (9-4)`);
      return 'Morning Shift (9-4)';
    }
    
    if (lowerText.includes('evening')) {
      console.log(`✅ SHIFT MATCH: 'evening' keyword -> Evening Shift (4-10)`);
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('night') && !lowerText.includes('midnight')) {
      console.log(`✅ SHIFT MATCH: 'night' keyword -> Night Duty`);
      return 'Night Duty';
    }
    
    if (lowerText.includes('saturday')) {
      console.log(`✅ SHIFT MATCH: 'saturday' keyword -> Saturday Regular (12-10)`);
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('sunday') || lowerText.includes('special') || lowerText.includes('holiday')) {
      console.log(`✅ SHIFT MATCH: 'sunday/special/holiday' keyword -> Sunday/Public Holiday/Special`);
      return 'Sunday/Public Holiday/Special';
    }
    
    // PRIORITY 6: Additional Night Duty patterns
    if (lowerText.includes('duty') || lowerText.includes('nite') || lowerText.includes('overnight')) {
      console.log(`✅ SHIFT MATCH: 'duty/nite/overnight' keyword -> Night Duty`);
      return 'Night Duty';
    }
    
    // PRIORITY 7: Additional time patterns for missing shifts
    if (lowerText.includes('22:') || lowerText.includes('10pm') || lowerText.includes('22h')) {
      console.log(`✅ SHIFT MATCH: Night time indicator -> Night Duty`);
      return 'Night Duty';
    }
    
    if (lowerText.includes('16:') || lowerText.includes('4pm') || lowerText.includes('16h')) {
      console.log(`✅ SHIFT MATCH: Evening time indicator -> Evening Shift (4-10)`);
      return 'Evening Shift (4-10)';
    }
    
    if (lowerText.includes('12:') || lowerText.includes('12pm') || lowerText.includes('12h') || lowerText.includes('noon')) {
      console.log(`✅ SHIFT MATCH: Saturday time indicator -> Saturday Regular (12-10)`);
      return 'Saturday Regular (12-10)';
    }
    
    if (lowerText.includes('9:') || lowerText.includes('9am') || lowerText.includes('9h') || lowerText.includes('morning')) {
      console.log(`✅ SHIFT MATCH: Morning time indicator -> Morning Shift (9-4)`);
      return 'Morning Shift (9-4)';
    }
    
    console.log(`❌ NO SHIFT MATCH: No pattern found for: "${text}"`);
    return null;
  }
}