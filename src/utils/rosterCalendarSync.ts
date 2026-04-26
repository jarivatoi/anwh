import { DaySchedule, SpecialDates } from '../types';
import { RosterEntry } from '../types/roster';

export interface RosterCalendarSyncOptions {
  calendarLabel: string;
  schedule: DaySchedule;
  specialDates: SpecialDates;
  setSchedule: (schedule: DaySchedule | ((prev: DaySchedule) => DaySchedule)) => void;
  setSpecialDates: (specialDates: SpecialDates | ((prev: SpecialDates) => SpecialDates)) => void;
  entries?: RosterEntry[]; // Add entries to check for special date status
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
  // Support both legacy full names AND modern shift IDs
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  // First check if it's already a shift ID (modern format)
  const validShiftIds = ['9-4', '4-10', '12-10', 'N'];
  let calendarShiftId: string | null = null;
  
  if (validShiftIds.includes(shiftType)) {
    // Already in correct format
    calendarShiftId = shiftType;
  } else if (shiftMapping[shiftType]) {
    // Legacy format - convert to shift ID
    calendarShiftId = shiftMapping[shiftType];
  }
  
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
  // Support both legacy full names AND modern shift IDs
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  // First check if it's already a shift ID (modern format)
  const validShiftIds = ['9-4', '4-10', '12-10', 'N'];
  let newShiftId: string | null = null;
  
  if (validShiftIds.includes(newShiftType)) {
    // Already in correct format
    newShiftId = newShiftType;
  } else if (shiftMapping[newShiftType]) {
    // Legacy format - convert to shift ID
    newShiftId = shiftMapping[newShiftType];
  }
  
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
  
  // Support both legacy full names AND modern shift IDs
  // Convert shift ID to full name for comparison
  const shiftIdToName: Record<string, string> = {
    '9-4': 'Morning Shift (9-4)',
    '4-10': 'Evening Shift (4-10)',
    '12-10': 'Saturday Regular (12-10)',
    'N': 'Night Duty'
  };
  
  // If it's a shift ID, convert to full name for comparison
  const fullShiftType = shiftIdToName[shiftType] || shiftType;
  
  // Saturday with Morning Shift (9-4) requires special marking
  if (dayOfWeek === 6 && fullShiftType === 'Morning Shift (9-4)') {
    return true;
  }
  
  // Weekday with Morning Shift (9-4) requires special marking
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && fullShiftType === 'Morning Shift (9-4)') {
    return true;
  }
  
  return false;
};

/**
 * Handle removal synchronization - remove shift from calendar
 */
const handleRemovalSync = (
  date: string,
  shiftType: string,
  assignedName: string,
  options: Pick<RosterCalendarSyncOptions, 'calendarLabel' | 'schedule' | 'specialDates' | 'setSchedule' | 'setSpecialDates'>
): boolean => {
  const { calendarLabel, schedule, specialDates, setSchedule, setSpecialDates } = options;
  
  console.log('🗑️ rosterCalendarSync.ts: Processing removal for:', {
    date,
    shiftType,
    assignedName,
    calendarLabel
  });
  
  // CRITICAL: Only sync removal if the assigned name matches the calendar label
  // Handle both NARAYYA and NARAYYA(R) as the same person
  // ALSO handle ID-based names like NARAYYA_N280881240162C -> extract NARAYYA
  
  // Extract base name for comparison (handles ID-based format: SURNAME_IDNUMBER)
  const extractBaseName = (name: string): string => {
    // Remove (R) suffix first
    let baseName = name.replace(/\(R\)$/, '').trim().toUpperCase();
    
    // If name contains underscore (ID-based format), extract only the surname part
    if (baseName.includes('_')) {
      const parts = baseName.split('_');
      baseName = parts[0]; // Take only the surname part before the underscore
    }
    
    return baseName;
  };
  
  const assignedBaseName = extractBaseName(assignedName);
  const calendarBaseName = extractBaseName(calendarLabel);
  
  console.log('🔍 rosterCalendarSync.ts: Removal name matching check (handles R variants and ID-based names):', {
    assignedName,
    calendarLabel,
    assignedBaseName,
    calendarBaseName,
    namesMatch: assignedBaseName === calendarBaseName,
    note: 'Supports: NARAYYA, NARAYYA(R), NARAYYA_N280881240162C'
  });
  
  // If names don't match, don't sync removal to calendar
  if (assignedBaseName !== calendarBaseName) {
    console.log(`❌ rosterCalendarSync.ts: Base names don't match for removal - skipping sync. Assigned base: "${assignedBaseName}", Calendar base: "${calendarBaseName}"`);
    return false;
  }
  
  console.log(`✅ rosterCalendarSync.ts: Base names match for removal - proceeding with sync (${assignedName} matches ${calendarLabel})`);
  
  // Map roster shift type to calendar shift ID
  // Support both legacy full names AND modern shift IDs
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  // First check if it's already a shift ID (modern format)
  const validShiftIds = ['9-4', '4-10', '12-10', 'N'];
  let calendarShiftId: string | null = null;
  
  if (validShiftIds.includes(shiftType)) {
    // Already in correct format
    calendarShiftId = shiftType;
  } else if (shiftMapping[shiftType]) {
    // Legacy format - convert to shift ID
    calendarShiftId = shiftMapping[shiftType];
  }
  
  if (!calendarShiftId) {
    console.log(`❌ rosterCalendarSync.ts: Cannot map shift type for removal: ${shiftType}`);
    return false;
  }
  
  // Get current shifts for this date
  const currentShifts = schedule[date] || [];
  console.log(`🔍 rosterCalendarSync.ts: Current shifts for ${date}:`, currentShifts);
  
  // Check if the shift exists in calendar
  if (!currentShifts.includes(calendarShiftId)) {
    console.log(`ℹ️ rosterCalendarSync.ts: Shift ${calendarShiftId} not found in calendar for ${date}`);
    return false;
  }
  
  // Remove the shift from calendar
  console.log(`🗑️ rosterCalendarSync.ts: Removing shift ${calendarShiftId} from calendar on ${date}`);
  setSchedule(prev => {
    const newSchedule = { ...prev };
    const updatedShifts = currentShifts.filter(shift => shift !== calendarShiftId);
    
    if (updatedShifts.length === 0) {
      // If no shifts left, remove the date entry completely
      delete newSchedule[date];
      console.log(`🗑️ rosterCalendarSync.ts: No shifts left for ${date}, removing date entry completely`);
    } else {
      // Otherwise, update with remaining shifts
      newSchedule[date] = updatedShifts;
      console.log(`🗑️ rosterCalendarSync.ts: Updated ${date} with remaining shifts:`, updatedShifts);
    }
    
    console.log(`🗑️ rosterCalendarSync.ts: Schedule update completed for ${date}`);
    return newSchedule;
  });
  
  // Note: We don't remove special date marking when removing shifts
  // because the person might have special activities without any shifts
  
  // Show enhanced removal notification with person's name
  console.log('🔔 rosterCalendarSync.ts: Creating removal notification...');
  
  // Extract display name from ID-based format for clean notifications
  // Handles: NARAYYA_N280881240162C → NARAYYA
  //          NARAYYA_(T)_N280881240162C → NARAYYA (T)
  //          NARAYYA_(THOMAS)_N280881240162C → NARAYYA (THOMAS)
  let displayName = assignedName;
  if (assignedName.includes('_')) {
    const parts = assignedName.split('_');
    const surname = parts[0];
    
    // Check if there's a disambiguation part in parentheses
    const hasDisambiguation = parts[1]?.startsWith('(') && parts[1]?.endsWith(')');
    
    if (hasDisambiguation) {
      // Remove trailing underscore and ID number
      const withoutId = parts.slice(0, -1).join('_'); // Remove last part (ID)
      // Convert NARAYYA_(T) → NARAYYA (T)
      displayName = withoutId.replace(/_\(([^)]+)\)/, ' ($1)');
    } else {
      // Simple format: just surname
      displayName = surname;
    }
  } else {
    // Fallback: just remove (R) suffix
    displayName = assignedName.replace(/\(R\)$/, '').trim();
  }
  
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    max-width: 320px;
    animation: slideInRight 0.3s ease-out;
    border: 2px solid rgba(255, 255, 255, 0.2);
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%; opacity: 0.9;"></div>
      <strong style="font-size: 15px;">Calendar Updated</strong>
    </div>
    <div style="font-size: 13px; line-height: 1.4; opacity: 0.95;">
      <strong>${displayName}</strong> removed from <strong>${calendarLabel}</strong>'s calendar<br>
      📅 <strong>${date}</strong> - ${shiftType}
    </div>
  `;
  
  document.body.appendChild(notification);
  console.log('🔔 rosterCalendarSync.ts: Removal notification created and added to DOM');
  
  // Auto-remove after 4 seconds (longer for removal notifications)
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
          console.log('🔔 rosterCalendarSync.ts: Removal notification removed from DOM');
        }
      }, 300);
    }
  }, 4000);
  
  console.log(`✅ ROSTER SYNC: Calendar updated successfully for ${date}`);
  return true;
};

// Add CSS for notification animations
const addNotificationStyles = () => {
  if (!document.querySelector('#roster-sync-styles')) {
    const style = document.createElement('style');
    style.id = 'roster-sync-styles';
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
};

// Initialize styles
addNotificationStyles();

/**
 * Main synchronization function
 */
export const syncRosterToCalendar = (
  rosterChange: RosterChangeEvent,
  options: RosterCalendarSyncOptions
): boolean => {
  const { calendarLabel, schedule, specialDates, setSchedule, setSpecialDates } = options;
  const { date, shiftType, assignedName, editorName, action } = rosterChange;
  
  // Check if we're in batch import mode
  const isBatchImport = (window as any).batchImportMode === true;
  
  // CRITICAL: Only sync if the assigned name matches the calendar label
  // This prevents other people's roster changes from affecting your personal calendar
  // Handle both NARAYYA and NARAYYA(R) as the same person
  // ALSO handle ID-based names like NARAYYA_N280881240162C -> extract NARAYYA
  
  // Extract base name for comparison (handles ID-based format: SURNAME_IDNUMBER)
  const extractBaseName = (name: string): string => {
    // Remove (R) suffix first
    let baseName = name.replace(/\(R\)$/, '').trim().toUpperCase();
    
    // If name contains underscore (ID-based format), extract only the surname part
    if (baseName.includes('_')) {
      const parts = baseName.split('_');
      baseName = parts[0]; // Take only the surname part before the underscore
    }
    
    return baseName;
  };
  
  const assignedBaseName = extractBaseName(assignedName);
  const calendarBaseName = extractBaseName(calendarLabel);
  
  console.log('🔍 ROSTER SYNC: Name matching check (handles R variants and ID-based names):', {
    assignedName,
    calendarLabel,
    assignedBaseName,
    calendarBaseName,
    namesMatch: assignedBaseName === calendarBaseName,
    note: 'Supports: NARAYYA, NARAYYA(R), NARAYYA_N280881240162C'
  });
  
  // If names don't match, don't sync to calendar
  if (assignedBaseName !== calendarBaseName) {
    console.log(`❌ ROSTER SYNC: Base names don't match - skipping sync. Assigned base: "${assignedBaseName}", Calendar base: "${calendarBaseName}"`);
    return false;
  }
  
  console.log(`✅ ROSTER SYNC: Base names match - proceeding with sync (${assignedName} matches ${calendarLabel})`);
  
  // Track imports for batch notification
  if (isBatchImport) {
    if (!(window as any).batchImportStats) {
      (window as any).batchImportStats = {
        count: 0,
        staffName: calendarLabel,
        dates: new Set<string>()
      };
    }
    (window as any).batchImportStats.count++;
    (window as any).batchImportStats.dates.add(date);
  }
  
  // Handle removal action
  if (action === 'removed') {
    console.log('🗑️ ROSTER SYNC: Processing removal action');
    return handleRemovalSync(date, shiftType, assignedName, { calendarLabel, schedule, specialDates, setSchedule, setSpecialDates });
  }
  
  // Get all entries to check for special date status
  const allEntries = options.entries || [];
  // Check if this date is marked as special in the roster
  const isRosterSpecialDate = checkIfRosterDateIsSpecial(date, allEntries);
  console.log('🌟 ROSTER SYNC: Checking if roster date is special:', {
    date,
    isRosterSpecialDate,
    currentCalendarSpecial: specialDates[date]
  });
  
  // Check if this date needs special marking for the shift to be valid
  const needsSpecial = requiresSpecialDate(date, shiftType);
  const currentIsSpecial = specialDates[date] === true;
  
  console.log('🔍 ROSTER SYNC: Special date analysis:', {
    date,
    shiftType,
    needsSpecial,
    currentIsSpecial,
    isRosterSpecialDate,
    dayOfWeek: new Date(date).getDay()
  });
  
  // Determine final special date status
  const finalSpecialStatus = needsSpecial || currentIsSpecial || isRosterSpecialDate;
  
  // Validate the shift for this date
  // Support both legacy full names AND modern shift IDs
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  // First check if it's already a shift ID (modern format)
  const validShiftIds = ['9-4', '4-10', '12-10', 'N'];
  let calendarShiftId: string | null = null;
  
  if (validShiftIds.includes(shiftType)) {
    // Already in correct format
    calendarShiftId = shiftType;
  } else if (shiftMapping[shiftType]) {
    // Legacy format - convert to shift ID
    calendarShiftId = shiftMapping[shiftType];
  }
  
  if (!calendarShiftId) {
    console.log(`❌ ROSTER SYNC: Cannot map shift type: ${shiftType}`);
    return false;
  }
  
  console.log(`🔍 ROSTER SYNC: Mapped shift "${shiftType}" to calendar ID "${calendarShiftId}"`);
  
  // Get current shifts for this date
  const currentShifts = schedule[date] || [];
  
  // Check if base shift ID already exists (prevent duplicates)
  // Manual shifts now have staff suffix (e.g., 'N-NARAYYA...'), roster sync adds base ID (e.g., 'N')
  const hasBaseShift = currentShifts.some((existingShift: string) => {
    const parts = existingShift.split('-');
    if (parts.length >= 2 && parts[0].match(/^\d+$/) && parts[1].match(/^\d+$/)) {
      // Format like '9-4' or '9-4-NARAYYA'
      const baseId = `${parts[0]}-${parts[1]}`;
      return baseId === calendarShiftId;
    }
    // Simple format like 'N' or 'N-NARAYYA'
    if (parts.length > 1) {
      return parts[0] === calendarShiftId;
    }
    return existingShift === calendarShiftId;
  });
  
  // Check for conflicts
  if (checkShiftConflicts(date, shiftType, currentShifts)) {
    return false; // Don't sync if there are conflicts
  }
  
  // Apply changes to calendar
  let calendarUpdated = false;
  
  // Mark as special if roster date is special OR if shift requires special marking
  if ((needsSpecial || isRosterSpecialDate) && !currentIsSpecial) {
    setSpecialDates(prev => ({
      ...prev,
      [date]: true
    }));
    calendarUpdated = true;
  }
  
  // Add shift to calendar if not already present
  if (!hasBaseShift) {
    setSchedule(prev => ({
      ...prev,
      [date]: [...currentShifts, calendarShiftId]
    }));
    calendarUpdated = true;
  }
  
  if (calendarUpdated) {
    // Only show individual notifications if NOT in batch import mode
    if (!isBatchImport) {
      // Extract display name from ID-based format for clean notifications
      // Handles: NARAYYA_N280881240162C → NARAYYA
      //          NARAYYA_(T)_N280881240162C → NARAYYA (T)
      //          NARAYYA_(THOMAS)_N280881240162C → NARAYYA (THOMAS)
      let displayName = assignedName;
      if (assignedName.includes('_')) {
        const parts = assignedName.split('_');
        const surname = parts[0];
        
        // Check if there's a disambiguation part in parentheses
        const hasDisambiguation = parts[1]?.startsWith('(') && parts[1]?.endsWith(')');
        
        if (hasDisambiguation) {
          // Remove trailing underscore and ID number
          const withoutId = parts.slice(0, -1).join('_'); // Remove last part (ID)
          // Convert NARAYYA_(T) → NARAYYA (T)
          displayName = withoutId.replace(/_\(([^)]+)\)/, ' ($1)');
        } else {
          // Simple format: just surname
          displayName = surname;
        }
      } else {
        // Fallback: just remove (R) suffix
        displayName = assignedName.replace(/\(R\)$/, '').trim();
      }
      
      // Show enhanced addition notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        font-weight: 500;
        max-width: 320px;
        animation: slideInRight 0.3s ease-out;
        border: 2px solid rgba(255, 255, 255, 0.2);
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; opacity: 0.9;"></div>
          <strong style="font-size: 15px;">Calendar Updated</strong>
        </div>
        <div style="font-size: 13px; line-height: 1.4; opacity: 0.95;">
          <strong>${displayName}</strong> added to <strong>${calendarLabel}</strong>'s calendar<br>
          📅 <strong>${date}</strong> - ${shiftType}
          ${(needsSpecial || isRosterSpecialDate) ? '<br>📌 Date marked as special' : ''}
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.animation = 'slideInRight 0.3s ease-out reverse';
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, 3000);
    }
  }
  
  return calendarUpdated;
};

/**
 * Check if a date is marked as special in the roster entries
 */
const checkIfRosterDateIsSpecial = (date: string, entries: RosterEntry[]): boolean => {
  console.log(`🌟 Checking if ${date} is special in roster entries...`);
  
  // Get all entries for this date
  const dateEntries = entries.filter(entry => entry.date === date);
  console.log(`🌟 Found ${dateEntries.length} entries for ${date}`);
  
  // Check if any entry has special date info in change_description
  for (const entry of dateEntries) {
    console.log(`🌟 Checking entry: ${entry.assigned_name} - ${entry.shift_type}`);
    console.log(`🌟 Change description: "${entry.change_description}"`);
    
    if (entry.change_description && entry.change_description.includes('Special Date:')) {
      const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
      if (match && match[1].trim()) {
        console.log(`🌟 Found special date info: "${match[1].trim()}"`);
        return true;
      }
    }
  }
  
  console.log(`🌟 No special date info found for ${date}`);
  return false;
};
