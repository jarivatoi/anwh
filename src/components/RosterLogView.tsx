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
  const assignedBaseName = assignedName.replace(/\(R\)$/, '').trim().toUpperCase();
  const calendarBaseName = calendarLabel.replace(/\(R\)$/, '').trim().toUpperCase();
  
  console.log('🔍 rosterCalendarSync.ts: Removal name matching check:', {
    assignedName,
    calendarLabel,
    assignedBaseName,
    calendarBaseName,
    namesMatch: assignedBaseName === calendarBaseName
  });
  
  // If names don't match, don't sync removal to calendar
  if (assignedBaseName !== calendarBaseName) {
    console.log(`❌ rosterCalendarSync.ts: Names don't match for removal - skipping sync. Assigned: "${assignedBaseName}", Calendar: "${calendarBaseName}"`);
    return false;
  }
  
  console.log(`✅ rosterCalendarSync.ts: Names match for removal - proceeding with sync`);
  
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
    } else {
      // Otherwise, update with remaining shifts
      newSchedule[date] = updatedShifts;
    }
    
    return newSchedule;
  });
  
  // Check if we should remove special date marking
  // Only remove special marking if no other shifts require it
  const remainingShifts = currentShifts.filter(shift => shift !== calendarShiftId);
  const stillNeedsSpecial = remainingShifts.some(shift => {
    const remainingShiftType = Object.entries(shiftMapping).find(([_, id]) => id === shift)?.[0];
    return remainingShiftType ? requiresSpecialDate(date, remainingShiftType) : false;
  });
  
  if (!stillNeedsSpecial && specialDates[date]) {
    console.log(`🗑️ rosterCalendarSync.ts: Removing special date marking for ${date}`);
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      delete newSpecialDates[date];
      return newSpecialDates;
    });
  }
  
  // Show removal notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #ef4444;
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
    📅 Calendar updated: ${shiftType} removed from ${date}
    ${!stillNeedsSpecial ? '<br>📌 Special date marking removed' : ''}
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
  
  console.log(`✅ rosterCalendarSync.ts: Calendar removal completed for ${date}`);
  return true;
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
  
  console.log('🔄 rosterCalendarSync.ts: Sync triggered with data:', {
    date,
    shiftType,
    assignedName,
    editorName,
    action,
    calendarLabel,
    assignedName,
    calendarLabel,
    currentScheduleKeys: Object.keys(schedule).length,
    currentSpecialDates: Object.keys(specialDates).length
  });
  
  // CRITICAL: Only sync if the assigned name matches the calendar label
  // This prevents other people's roster changes from affecting your personal calendar
  const assignedBaseName = assignedName.replace(/\(R\)$/, '').trim().toUpperCase();
  const calendarBaseName = calendarLabel.replace(/\(R\)$/, '').trim().toUpperCase();
  
  console.log('🔍 rosterCalendarSync.ts: Name matching check:', {
    assignedName,
    calendarLabel,
    assignedBaseName,
    calendarBaseName,
    namesMatch: assignedBaseName === calendarBaseName
  });
  
  // If names don't match, don't sync to calendar
  if (assignedBaseName !== calendarBaseName) {
    console.log(`❌ rosterCalendarSync.ts: Names don't match - skipping sync. Assigned: "${assignedBaseName}", Calendar: "${calendarBaseName}"`);
    return false;
  }
  
  console.log(`✅ rosterCalendarSync.ts: Names match - proceeding with sync`);
  
  // Handle removal action
  if (action === 'removed') {
    console.log('🗑️ rosterCalendarSync.ts: Processing removal action');
    return handleRemovalSync(date, shiftType, assignedName, { calendarLabel, schedule, specialDates, setSchedule, setSpecialDates });
  }
  
  // Check if this date needs special marking for the shift to be valid
  const needsSpecial = requiresSpecialDate(date, shiftType);
  const currentIsSpecial = specialDates[date] === true;
  
  console.log('🔍 rosterCalendarSync.ts: Special date analysis:', {
    date,
    shiftType,
    needsSpecial,
    dayOfWeek: new Date(date).getDay()
  });
  
  // Determine final special date status
  const finalSpecialStatus = needsSpecial || currentIsSpecial;
  
  // Validate the shift for this date
  const shiftMapping: Record<string, string> = {
    'Morning Shift (9-4)': '9-4',
    'Evening Shift (4-10)': '4-10',
    'Saturday Regular (12-10)': '12-10',
    'Night Duty': 'N',
    'Sunday/Public Holiday/Special': '9-4'
  };
  
  const calendarShiftId = shiftMapping[shiftType];
  if (!calendarShiftId) {
    console.log(`❌ rosterCalendarSync.ts: Cannot map shift type: ${shiftType}`);
    return false;
  }
  
  // Get current shifts for this date
  const currentShifts = schedule[date] || [];
  console.log(`🔍 rosterCalendarSync.ts: Current shifts for ${date}:`, currentShifts);
  
  // Check for conflicts
  if (checkShiftConflicts(date, shiftType, currentShifts)) {
    console.log(`❌ rosterCalendarSync.ts: Shift conflict detected for ${calendarShiftId} on ${date} with existing shifts:`, currentShifts);
    return false; // Don't sync if there are conflicts
    return false; // Don't sync if there are conflicts
    return false; // Don't sync if there are conflicts
  }
  
  // Apply changes to calendar
  let calendarUpdated = false;
  
  if (needsSpecial && !currentIsSpecial) {
    console.log(`✅ rosterCalendarSync.ts: Marking ${date} as special date`);
    setSpecialDates(prev => ({
      ...prev,
      [date]: true
    }));
    calendarUpdated = true;
  }
  
  // Add shift to calendar if not already present
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Admin Authentication Required
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Authentication Code
              </label>
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center font-mono text-lg"
                placeholder="Enter admin code"
                maxLength={4}
                autoComplete="off"
                autoFocus
              />
            </div>
            
            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 text-center">{authError}</p>
              </div>
            )}
            
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800 text-center">
                <strong>Admin Action:</strong> Hide log entry from view
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelHide}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthSubmit}
                disabled={authCode.length < 4 || !isAdminCode(authCode)}
                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
      , document.body
    )}

    {/* Hide Confirmation Modal */}
    {showHideConfirm && createPortal(
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
        style={{
          display: 'flex',
          alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
          justifyContent: 'center',
          padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
          paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
          overflow: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCancelHide();
          }
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full"
          style={{
            maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '95vh' : 'none',
            margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
          }}>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-red-600" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Hide Log Entry
            </h3>
            
            {(() => {
              const selectedEntry = getSelectedEntry();
              if (!selectedEntry) return null;
              
              return (
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Entry to Hide:</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Date:</strong> {formatLogDate(selectedEntry.date)}</div>
                      <div><strong>Shift:</strong> {getShiftDisplayName(selectedEntry.shift_type)}</div>
                      <div><strong>Staff:</strong> {selectedEntry.assigned_name}</div>
                      {selectedEntry.last_edited_by && (
                        <div><strong>Edited by:</strong> {selectedEntry.last_edited_by}</div>
                      )}
                      {selectedEntry.change_description && (
                        <div><strong>Change:</strong> {selectedEntry.change_description}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800 text-center">
                      <strong>⚠️ Warning:</strong> This will hide the entry from the log view. 
                      The entry will remain in the database but won't be visible in the log.
                    </p>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelHide}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleHideEntry}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <EyeOff className="w-4 h-4" />
                <span>Hide Entry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      , document.body
    )}
  if (!currentShifts.includes(calendarShiftId)) {
    console.log(`✅ rosterCalendarSync.ts: Adding shift ${calendarShiftId} to calendar on ${date}`);
    setSchedule(prev => ({
      ...prev,
      [date]: [...currentShifts, calendarShiftId]
    }));
    calendarUpdated = true;
  } else {
    console.log(`ℹ️ rosterCalendarSync.ts: Shift ${calendarShiftId} already exists in calendar on ${date}`);
  }
  
  if (calendarUpdated) {
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
  
  return calendarUpdated;
};