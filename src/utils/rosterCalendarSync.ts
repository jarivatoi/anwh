import { DaySchedule, SpecialDates } from '../types';

export interface RosterCalendarSyncOptions {
  calendarLabel: string;
  schedule: DaySchedule;
  specialDates: SpecialDates;
  setSchedule: (schedule: DaySchedule | ((prev: DaySchedule) => DaySchedule)) => void;
  setSpecialDates: (specialDates: SpecialDates | ((prev: SpecialDates) => SpecialDates)) => void;
}

export interface RosterChangeEvent {
  date: string;
  shiftType: string;
  assignedName: string;
  editorName: string;
  action: 'added' | 'updated' | 'removed';
}

/**
 * Validates if a shift is allowed on a specific date
 */
export const validateShiftForDate = (date: string, shiftType: string, isSpecialDate: boolean): boolean => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
  
  console.log(`🔍 Validating shift: ${shiftType} on ${date} (day ${dayOfWeek}, special: ${isSpecialDate})`);
  
  // Map roster shift types to calendar shift IDs
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4' // Special Sunday shift maps to 9-4
  };
  
  const calendarShiftId = shiftMapping[shiftType];
  if (!calendarShiftId) {
    console.log(`❌ Unknown shift type: ${shiftType}`);
    return false;
  }
  
  // Validation rules based on day and special status
  if (isSpecialDate) {
    // Special dates allow: 9-4, 4-10, N (but not 12-10)
    const allowedOnSpecial = ['9-4', '4-10', 'N'];
    const isValid = allowedOnSpecial.includes(calendarShiftId);
    console.log(`🔍 Special date validation: ${calendarShiftId} ${isValid ? 'allowed' : 'not allowed'}`);
    return isValid;
  } else {
    // Regular day validation
    if (dayOfWeek === 6) { // Saturday
      const allowedOnSaturday = ['12-10', 'N'];
      const isValid = allowedOnSaturday.includes(calendarShiftId);
      console.log(`🔍 Saturday validation: ${calendarShiftId} ${isValid ? 'allowed' : 'not allowed'}`);
      return isValid;
    } else if (dayOfWeek === 0) { // Sunday
      const allowedOnSunday = ['9-4', '4-10', 'N'];
      const isValid = allowedOnSunday.includes(calendarShiftId);
      console.log(`🔍 Sunday validation: ${calendarShiftId} ${isValid ? 'allowed' : 'not allowed'}`);
      return isValid;
    } else { // Weekdays (Monday-Friday)
      const allowedOnWeekday = ['4-10', 'N'];
      const isValid = allowedOnWeekday.includes(calendarShiftId);
      console.log(`🔍 Weekday validation: ${calendarShiftId} ${isValid ? 'allowed' : 'not allowed'}`);
      return isValid;
    }
  }
};

/**
 * Checks if shift conflicts with existing shifts in calendar
 */
export const checkShiftConflicts = (date: string, newShiftType: string, currentShifts: string[]): boolean => {
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  const newShiftId = shiftMapping[newShiftType];
  if (!newShiftId) return true; // Unknown shift = conflict
  
  // Check for conflicts
  // 9-4 and 12-10 cannot overlap
  if (newShiftId === '9-4' && currentShifts.includes('12-10')) return true;
  if (newShiftId === '12-10' && currentShifts.includes('9-4')) return true;
  
  // 12-10 and 4-10 cannot overlap
  if (newShiftId === '12-10' && currentShifts.includes('4-10')) return true;
  if (newShiftId === '4-10' && currentShifts.includes('12-10')) return true;
  
  // Check if shift already exists
  if (currentShifts.includes(newShiftId)) return true;
  
  return false; // No conflicts
};

/**
 * Determines if a date needs to be marked as special for the shift to be valid
 */
export const requiresSpecialDate = (date: string, shiftType: string): boolean => {
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  
  // Saturday with Morning Shift (9-4) requires special marking
  if (dayOfWeek === 6 && shiftType === 'Morning Shift (9-4)') {
    return true;
  }
  
  // Weekday with Morning Shift (9-4) requires special marking
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && shiftType === 'Morning Shift (9-4)') {
    return true;
  }
  
  return false;
};

/**
 * Main synchronization function
 */
export const syncRosterToCalendar = (
  rosterChange: RosterChangeEvent,
  options: RosterCalendarSyncOptions
): boolean => {
  const { calendarLabel, schedule, specialDates, setSchedule, setSpecialDates } = options;
  const { date, shiftType, assignedName, editorName, action } = rosterChange;
  
  console.log('🔄 Roster-Calendar Sync triggered:', {
    date,
    shiftType,
    assignedName,
    editorName,
    action,
    calendarLabel
  });
  
  // Check if the editor name matches the calendar label (case-insensitive)
  const editorBaseName = editorName.replace(/\(R\)$/, '').trim().toUpperCase();
  const calendarBaseName = calendarLabel.replace(/\(R\)$/, '').trim().toUpperCase();
  
  if (editorBaseName !== calendarBaseName) {
    console.log(`❌ Name mismatch: Editor "${editorBaseName}" ≠ Calendar "${calendarBaseName}"`);
    return false;
  }
  
  console.log(`✅ Name match: Editor "${editorBaseName}" = Calendar "${calendarBaseName}"`);
  
  // Only process additions and updates (not removals for now)
  if (action === 'removed') {
    console.log('⏭️ Skipping removal action');
    return false;
  }
  
  // Check if this date needs special marking for the shift to be valid
  const needsSpecial = requiresSpecialDate(date, shiftType);
  const currentIsSpecial = specialDates[date] === true;
  
  console.log(`🔍 Special date analysis: needsSpecial=${needsSpecial}, currentIsSpecial=${currentIsSpecial}`);
  
  // Determine final special date status
  const finalSpecialStatus = needsSpecial || currentIsSpecial;
  
  // Validate the shift for this date
  if (!validateShiftForDate(date, shiftType, finalSpecialStatus)) {
    console.log(`❌ Shift validation failed for ${shiftType} on ${date}`);
    return false;
  }
  
  // Map roster shift type to calendar shift ID
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  const calendarShiftId = shiftMapping[shiftType];
  if (!calendarShiftId) {
    console.log(`❌ Cannot map shift type: ${shiftType}`);
    return false;
  }
  
  // Get current shifts for this date
  const currentShifts = schedule[date] || [];
  
  // Check for conflicts
  if (checkShiftConflicts(date, shiftType, currentShifts)) {
    console.log(`❌ Shift conflict detected for ${calendarShiftId} on ${date}`);
    return false;
  }
  
  // Apply changes to calendar
  let calendarUpdated = false;
  
  // Update special date status if needed
  if (needsSpecial && !currentIsSpecial) {
    console.log(`✅ Marking ${date} as special date`);
    setSpecialDates(prev => ({
      ...prev,
      [date]: true
    }));
    calendarUpdated = true;
  }
  
  // Add shift to calendar if not already present
  if (!currentShifts.includes(calendarShiftId)) {
    console.log(`✅ Adding shift ${calendarShiftId} to calendar on ${date}`);
    setSchedule(prev => ({
      ...prev,
      [date]: [...currentShifts, calendarShiftId]
    }));
    calendarUpdated = true;
  } else {
    console.log(`ℹ️ Shift ${calendarShiftId} already exists in calendar on ${date}`);
  }
  
  if (calendarUpdated) {
    console.log(`✅ Calendar updated successfully for ${date}`);
    
    // Show success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      📅 Calendar updated: ${shiftType} added to ${date}
      ${needsSpecial ? '<br>📌 Date marked as special' : ''}
    `;
    
    // Add animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
            document.head.removeChild(style);
          }
        }, 300);
      }
    }, 3000);
  }
  
  return calendarUpdated;
};