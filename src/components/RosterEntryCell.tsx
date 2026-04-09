import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { StaffSelectionModal } from './StaffSelectionModal';
import { ShiftMarkerModal } from './ShiftMarkerModal';
import ConfirmationModal from './ConfirmationModal';
import FlipCard from './FlipCard';
import { validatePasscode } from '../utils/passcodeAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';
import { supabase } from '../lib/supabase';
import { formatDisplayNameForUI } from '../utils/rosterDisplayName';
import { getUserSession } from '../utils/indexedDB';
import { extractMarkerPrefix } from '../utils/attachedCenters';

interface RosterEntryCellProps {
  entry: RosterEntry;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  onShowDetails?: (entry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
  isSpecialDate?: boolean;
  specialDateInfo?: string;
  availableStaff?: string[];
  staffNicknames?: Record<string, string>;
}

export const RosterEntryCell: React.FC<RosterEntryCellProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift = [],
  isSpecialDate = false,
  specialDateInfo,
  availableStaff: propAvailableStaff,
  staffNicknames: propStaffNicknames
}) => {
  // Use staff from props if provided, otherwise fetch internally (fallback)
  const [localStaffNames] = useState<string[]>([]);
  const staffNames = propAvailableStaff && propAvailableStaff.length > 0 ? propAvailableStaff : localStaffNames;
  
  // Use nicknames from parent or empty object
  const staffNicknames = propStaffNicknames || {};

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remove individual cell nickname loading - will be passed from parent instead
  // Load staff nicknames on mount - REMOVED, handled by RosterPanel now

  // Shift marker modal states
  const [showShiftMarkerModal, setShowShiftMarkerModal] = useState(false);
  const [longPressStage, setLongPressStage] = useState<'idle' | 'stage1' | 'stage2'>('idle');
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showRipple, setShowRipple] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  
  // Refs for measuring asterisk and name widths
  const asteriskRef = useRef<HTMLSpanElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const [shouldApplyOffset, setShouldApplyOffset] = useState(false);
  const [offsetWidth, setOffsetWidth] = useState(0);

  // Add marker badge based on change_description (center information)
  // Only show if center is currently active (last action was Add, not Remove)
  const hasCenterRemark = entry.change_description && (() => {
    // Split by | and check the LAST entry (most recent action)
    const logEntries = entry.change_description.split('|').map(e => e.trim());
    const lastEntry = logEntries[logEntries.length - 1];
    
    // Check if last entry is in new format
    const newFormatMatch = lastEntry.match(/\[([^\]]+)\]\s+([^:]+):\s+Center (Added|Removed):/);
    if (newFormatMatch) {
      const [, , , action] = newFormatMatch;
      return action === 'Added'; // Only show if last action was Add
    }
    
    // Fallback to old format: Center Added: X (and not Center Removed: X)
    const hasAdded = entry.change_description.includes('Center Added:') || entry.change_description.includes('- Center:');
    const hasRemoved = entry.change_description.includes('Center Removed:') || entry.change_description.includes('- Removed:');
    return hasAdded && !hasRemoved;
  })();
  
  const centerRemark = hasCenterRemark ? entry.change_description?.match(/(?:Center Added:|- Center:)\s*([^;-]+)/)?.[1]?.trim() : null;
  
  // Extract the actual marker (*, **, ***) from change_description if stored
  const markerMatch = entry.change_description?.match(/- Marker:\s*(\*+)/);
  const displayMarker = markerMatch ? markerMatch[1] : '*'; // Default to * if not found
  
  // Determine badge color based on marker count
  const getBadgeColor = () => {
    if (displayMarker === '**') return 'bg-red-600';
    if (displayMarker === '***') return 'bg-green-600';
    return 'bg-indigo-600'; // Default for single *
  };
  const badgeColorClass = getBadgeColor();
  
  // Display name without any marker (clean format)
  const baseDisplayName = formatDisplayNameForUI(entry.assigned_name);
  
  // Check if there's a nickname for this staff member
  const displayNickname = staffNicknames[entry.assigned_name] || staffNicknames[baseDisplayName] || null;
  const displayName = displayNickname || baseDisplayName;
  
  // Check if entry has a shift marker and should flip
  const hasShiftMarker = !!entry.shift_marker;
  const shouldFlip = hasShiftMarker;
  
  // Gesture controls (dual long-press):
  // - First long press (1.5s): Opens shift marker modal
  // - Second long press (2.5s): Opens staff selection modal (name change)
  // - Counter resets after 3 seconds of inactivity
  
  console.log(`🔍 RosterEntryCell [${entry.id}]:`);
  console.log(`   assigned_name: "${entry.assigned_name}"`);
  console.log(`   displayName: "${displayName}"`);
  console.log(`   hasCenterRemark: ${hasCenterRemark}`);
  console.log(`   change_description: "${entry.change_description}"`);
  console.log(`   centerRemark: "${centerRemark}"`);
  console.log(`   badge will show: ${hasCenterRemark ? '*' : 'none'}`);
  console.log(`---`);

  // Prevent body scroll when auth modal is open
  React.useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    };
  }, [showAuthModal]);

  // Check if entry has been edited (name changed)
  const hasBeenEdited = (entry: RosterEntry) => {
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Check if entry has been reverted to original
  const hasBeenReverted = (entry: RosterEntry) => {
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
      return entry.assigned_name === originalPdfAssignment;
    }
    
    return false;
  };

  // Get text color based on edit status
  const getTextColor = () => {
    // HIGHEST PRIORITY: Admin-set text color
    if (entry.text_color) {
      return entry.text_color;
    }
    
    if (hasBeenReverted(entry)) {
      return '#059669'; // Green for reverted entries (back to original PDF)
    } else if (hasBeenEdited(entry)) {
      return '#dc2626'; // Red for edited entries
    } else {
      return '#000000'; // Black for original entries
    }
  };

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      console.log('🔥 Long press detected on entry:', entry.id);
      setShowAuthModal(true);
    },
    onDoublePress: () => {
      if (hasBeenEdited(entry) && onShowDetails) {
        console.log('👆👆 Double press detected on edited entry:', entry.id);
        onShowDetails(entry);
      }
    },
    delay: 2500
  });

  // Handle double-click for desktop (opens edit details modal)
  const handleDoubleClick = () => {
    console.log('🖱️🖱️ Double-click triggered');
    console.log('   Entry ID:', entry.id);
    console.log('   Has been edited:', hasBeenEdited(entry));
    console.log('   change_description:', entry.change_description);
    console.log('   last_edited_by:', entry.last_edited_by);
    
    if (!hasBeenEdited(entry)) {
      console.log('⚠️ Entry has not been edited, skipping modal');
      return;
    }
    
    if (!onShowDetails) {
      console.log('⚠️ onShowDetails not provided');
      return;
    }
    
    console.log('✅ Opening edit details modal...');
    onShowDetails(entry);
  };

  // Long-press handler with ripple animation:
  // - Hold for 1.5s → RED Ripple animation appears under finger
  // - Release between 1.5s-2.5s → Opens staff selection modal
  // - Continue holding past 2.5s → GREEN ripple appears, opens shift marker modal on release
  // - If still holding at 4s → Reset everything (no second green ripple)
  let longPressInterval: NodeJS.Timeout | null = null;
  
  const handleLongPressStart = (e: React.TouchEvent | React.MouseEvent) => {
    console.log('👇 Long press started on entry:', entry.id);
    
    // Prevent default to avoid conflicts with normal clicking
    e.preventDefault();
    e.stopPropagation();
    
    setLongPressStage('idle');
    setShowRipple(false);
    
    // Get touch/click position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setRipplePosition({ x: clientX, y: clientY });
    
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // Start the long press timer
    const timer = setTimeout(() => {
      console.log('⏰ Stage 1 reached - showing RED glow for staff selection');
      setShowRipple(true);
      setLongPressStage('stage1');
      
      // Stage 2: 2.5s - Toggle ripple to GREEN
      longPressInterval = setTimeout(() => {
        console.log('⏰ Stage 2 reached - showing GREEN ripple for marker modal');
        // Set stage IMMEDIATELY so release detection is accurate
        setLongPressStage('stage2');
        
        // Then update visual with brief toggle
        setShowRipple(false);
        setTimeout(() => {
          setShowRipple(true);
        }, 50); // Brief 50ms delay for visual toggle
        
        // Stage 3: 4s - Reset if still holding (no second green ripple)
        const resetTimer = setTimeout(() => {
          console.log('⏰ Timeout reached - resetting (held too long past 4s)');
          setShowRipple(false);
          setLongPressStage('idle');
        }, 1500); // 1.5 seconds after stage 2 (total 4s)
        
        // Update the interval reference to the reset timer
        longPressInterval = resetTimer;
      }, 1000); // 1 second after stage 1 (total 2.5s)
      
    }, 1500); // 1.5 seconds
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    console.log('👆 Long press released at stage:', longPressStage);
    
    // Clear all timers immediately
    if (longPressInterval) {
      clearTimeout(longPressInterval);
      longPressInterval = null;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    // Determine action based on stage
    if (longPressStage === 'stage1') {
      // Released between 1.5s-2.5s → Open staff selection modal
      console.log('✅ Released in stage 1 - opening staff selection modal');
      setShowAuthModal(true);
      // Stop and reset - user committed to action
      setShowRipple(false);
      setLongPressStage('idle');
    } else if (longPressStage === 'stage2') {
      // Released after 2.5s → Open shift marker modal, then reset
      console.log('✅ Released in stage 2 - opening shift marker modal');
      setShowShiftMarkerModal(true);
      setShowRipple(false);
      setLongPressStage('idle');
    } else {
      // Released before 1.5s → Just reset (no animation should be visible)
      console.log('❌ Released too early - resetting');
      setShowRipple(false);
      setLongPressStage('idle');
    }
  };

  const handleAuthSubmit = async () => {
    // FIRST: Get the currently logged-in user from session
    const session = await getUserSession();
    console.log('📋 RosterEntryCell - Current logged-in session:', session);
    
    if (!session) {
      setAuthError('No active session found. Please log in first.');
      return;
    }
    
    // SECOND: Validate passcode and ensure it belongs to the logged-in user
    const passcodeResult = await validatePasscode(authCode);
    console.log('✅ Passcode validated:', passcodeResult);
    
    if (!passcodeResult || !passcodeResult.isValid) {
      setAuthError('Invalid passcode');
      return;
    }
    
    // With duplicate passcodes allowed, we need to verify the passcode
    // belongs to the logged-in user by checking their staff record
    // The validatePasscode returns first match, so we need additional verification
    const { data: userData } = await supabase
      .from('staff_users')
      .select('passcode')
      .eq('id', session.userId)
      .single();
    
    if (!userData || userData.passcode !== authCode) {
      console.error('❌ PASSCODE MISMATCH: Passcode does not belong to logged-in user');
      setAuthError('Invalid passcode');
      return;
    }
    
    console.log('✅ Passcode verified: User is authorized');
    
    // Wait a bit to ensure staff data is loaded
    console.log('🔍 Auth successful, waiting for staff data...');
    setTimeout(() => {
      setShowAuthModal(false);
      setShowStaffModal(true);
      setAuthError('');
      console.log('🔍 Opening staff modal with staff names:', staffNames);
    }, 100);
  };

  const handleStaffSelect = async (newStaffName: string) => {
    await handleStaffSelectWithColor(newStaffName);
  };

  const handleStaffSelectWithColor = async (newStaffName: string, textColor?: string) => {
    console.log('🎨 RosterEntryCell: handleStaffSelectWithColor called with:', {
      newStaffName,
      textColor,
      currentAssignedName: entry.assigned_name,
      entryId: entry.id
    });
    
    if (newStaffName === entry.assigned_name) {
      console.log('🎨 RosterEntryCell: Name unchanged, checking color change...');
      
      // For ADMIN: Allow color-only changes even if name is the same
      if (textColor && textColor !== getTextColor()) {
        console.log('🎨 RosterEntryCell: Color-only change detected, proceeding with update');
        // Continue with the update for color change
      } else {
        console.log('🎨 RosterEntryCell: No changes detected, closing modal');
        setShowStaffModal(false);
        return;
      }
    }

    if (newStaffName === entry.assigned_name && !textColor) {
      setShowStaffModal(false);
      return;
    }

    setIsUpdating(true);
    setIsEditing(true);
    try {
      // Get the currently logged-in user from session
      const session = await getUserSession();
      
      console.log('🔍 SESSION CHECK - Logged in user:', {
        userId: session?.userId,
        idNumber: session?.idNumber,
        surname: session?.surname,
        name: session?.name
      });
      
      if (!session) {
        console.error('❌ No active session found');
        setAuthError('No active session found. Please log in first.');
        return;
      }
      
      const editorResult = await validatePasscode(authCode);
      console.log('🔑 PASSCODE VALIDATION Result:', editorResult);
      
      if (!editorResult || !editorResult.isValid) return;
      
      // CRITICAL: Verify the passcode belongs to the logged-in user by comparing ID NUMBERS
      // With duplicate passcodes, validatePasscode returns the FIRST match from DB
      // So we need to check if the logged-in user's ID matches any user with this passcode
      const { data: userData } = await supabase
        .from('staff_users')
        .select('id_number, surname, name')
        .eq('passcode', authCode)
        .eq('id', session.userId);
      
      console.log('📊 PASSCODE OWNERSHIP CHECK:', {
        sessionId: session.userId,
        queryResult: userData,
        hasMatch: userData && userData.length > 0
      });
      
      if (!userData || userData.length === 0) {
        console.error('❌ PASSCODE MISMATCH: Passcode does not belong to logged-in user');
        setAuthError('Invalid passcode');
        return;
      }
      
      // MASTER ADMIN CHECK: 5274 can edit for everyone
      const isMasterAdmin = session.idNumber === '5274';
      
      // Note: All authenticated users can now edit any roster entry
      // The security check has been removed to allow collaborative editing

      // Use the LOGGED-IN USER's name as the editor (based on session ID)
      const editorName = `${session.surname}, ${session.name}`;

      console.log('💾 SAVING EDITOR:', {
        editorName,
        entryId: entry.id,
        oldAssignedName: entry.assigned_name,
        newStaffName
      });

      console.log('🎨 RosterEntryCell: Updating entry with:', {
        newStaffName,
        textColor,
        editorName,
        sessionUserId: session.userId,
        sessionIdNumber: session.idNumber
      });

      // Preserve center information from original change_description if present
      const hasCenterInfo = entry.change_description && (entry.change_description.includes('- Center:') || entry.change_description.includes('Center Added:'));
      let centerInfo = '';
      
      if (hasCenterInfo && entry.change_description) {
        // Extract center name from either format
        const centerMatch = entry.change_description.match(/(?:- Center:|Center Added:)\s*([^;|]+)/);
        if (centerMatch && centerMatch[1]) {
          centerInfo = centerMatch[1].trim();
        }
      }
      
      const updatedEntry = await updateRosterEntry(entry.id, {
        date: entry.date,
        shiftType: entry.shift_type,
        assignedName: newStaffName,
        changeDescription: centerInfo 
          ? `Name changed from "${entry.assigned_name}" to "${newStaffName}" | [${(() => {
              const now = new Date();
              const day = now.getDate().toString().padStart(2, '0');
              const month = (now.getMonth() + 1).toString().padStart(2, '0');
              const year = now.getFullYear();
              const hour = now.getHours().toString().padStart(2, '0');
              const minute = now.getMinutes().toString().padStart(2, '0');
              const second = now.getSeconds().toString().padStart(2, '0');
              return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
            })()} USER, Admin: Center Added: ${centerInfo}`
          : `Name changed from "${entry.assigned_name}" to "${newStaffName}"`,
        textColor: textColor
      }, editorName);

      console.log('✅ RosterEntryCell: Received updated entry from updateRosterEntry:', updatedEntry);
      console.log('📋 VERIFICATION - New name:', updatedEntry.assigned_name, '| Old name:', entry.assigned_name);

      if (onUpdate) {
        console.log('🔄 Calling onUpdate to trigger parent refresh');
        await onUpdate(updatedEntry);
        console.log('✅ Parent refresh completed - data is now up to date');
      }

      setShowStaffModal(false);
      setAuthCode('');

    } catch (error) {
      console.error('Failed to update entry:', error);
      setErrorMessage('Failed to update entry. Please try again.');
    } finally {
      setIsUpdating(false);
      // Keep editing animation for a bit longer to show the change
      setTimeout(() => setIsEditing(false), 1000);
    }
  };

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
    // Reset all long-press states
    setShowRipple(false);
    setLongPressStage('idle');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    if (longPressInterval) {
      clearTimeout(longPressInterval);
      longPressInterval = null;
    }
  };

  const handleCancelStaffSelection = () => {
    setShowStaffModal(false);
    setAuthCode('');
    // Reset all long-press states
    setShowRipple(false);
    setLongPressStage('idle');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    if (longPressInterval) {
      clearTimeout(longPressInterval);
      longPressInterval = null;
    }
  };

  const handleMarkerSelect = async (marker: 'Early' | 'Late' | 'First' | 'Second' | 'AM' | 'FULL' | null, passcode: string) => {
    console.log('🎯 Setting shift marker:', marker, 'with passcode');
    
    // Get session to verify user
    const session = await getUserSession();
    
    if (!session) {
      throw new Error('No active session found');
    }
    
    // MASTER ADMIN CHECK: 5274 can add markers for everyone
    const isMasterAdmin = session.idNumber === '5274';
    
    // Validate passcode belongs to logged-in user
    const passcodeResult = await validatePasscode(passcode);
    
    if (!passcodeResult || !passcodeResult.isValid) {
      throw new Error('Invalid passcode');
    }
    
    // Verify passcode belongs to logged-in user
    const { data: userData } = await supabase
      .from('staff_users')
      .select('id_number')
      .eq('passcode', passcode)
      .eq('id', session.userId);
    
    if (!userData || userData.length === 0) {
      throw new Error('Passcode does not belong to logged-in user');
    }
    
    // Note: All authenticated users can now add shift markers for any entry
    // The security check has been removed to allow collaborative editing

    // Format timestamp without comma
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    const formattedTimestamp = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
    
    // Create log entry
    const editorName = `${session.surname}, ${session.name}`;
    const logEntry = marker === null
      ? `[${formattedTimestamp}] ${editorName}: Cleared shift marker`
      : `[${formattedTimestamp}] ${editorName}: Added "${marker}" as marker for his shift (Night Duty)`;
    
    // Append to existing change_description or create new one
    const newChangeDescription = entry.change_description 
      ? `${entry.change_description} | ${logEntry}`
      : logEntry;
    
    // Update roster entry with shift_marker field (null clears it)
    const { error } = await supabase
      .from('roster_entries')
      .update({
        shift_marker: marker, // null will clear it
        change_description: newChangeDescription,
        last_edited_by: editorName,
        last_edited_at: formattedTimestamp
      })
      .eq('id', entry.id);
    
    if (error) {
      console.error('❌ Error updating shift marker:', error);
      throw new Error('Failed to update shift marker');
    }
    
    console.log('✅ Shift marker updated successfully');
    
    // Notify parent to refresh
    if (onUpdate) {
      onUpdate({
        ...entry,
        shift_marker: marker || undefined,
        change_description: newChangeDescription,
        last_edited_by: editorName,
        last_edited_at: formattedTimestamp
      });
    }
  };

  // Check if (asterisk width + name width) exceeds container width
  useEffect(() => {
    if (!hasCenterRemark || !asteriskRef.current || !nameContainerRef.current) {
      setShouldApplyOffset(false);
      setOffsetWidth(0);
      return;
    }
    
    // Measure widths after render
    const checkWidths = () => {
      const asteriskWidth = asteriskRef.current?.offsetWidth || 0;
      const nameWidth = nameContainerRef.current?.scrollWidth || 0;
      const nameContainerWidth = nameContainerRef.current?.offsetWidth || 0;
      
      // The key insight: In flexbox, nameContainer gets reduced space due to asterisk
      // We need to pass asterisk width as offset so ScrollingText knows visual space is reduced
      // Only apply offset if text actually overflows the name container
      const textOverflows = nameWidth > nameContainerWidth;
      
      setShouldApplyOffset(textOverflows);
      // Always pass asterisk width when there's an asterisk and text overflows
      if (textOverflows) {
        setOffsetWidth(asteriskWidth);
      } else {
        setOffsetWidth(0);
      }
    };
    
    // Check immediately and on resize
    const timeoutId = setTimeout(checkWidths, 50); // Small delay to ensure render
    window.addEventListener('resize', checkWidths);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkWidths);
    };
  }, [hasCenterRemark, displayName]);

  return (
    <>
      <div
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        style={{
          padding: '4px 2px',
          margin: 0,
          textAlign: 'center',
          fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px',
          fontWeight: '500',
          color: getTextColor(),
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          outline: 'none',
          background: 'transparent',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '32px',
          position: 'relative',
          zIndex: 60,
          // Add pulsing animation only for special dates with actual info
         animation: isEditing ? 'goldenPulse 1.2s ease-in-out infinite' :
                   (isSpecialDate && specialDateInfo && specialDateInfo.trim()) ? 'pulse 2s ease-in-out infinite' : 'none',
         transform: isEditing ? 'scale(1.05)' : 'scale(1)',
         transition: 'all 0.4s ease-out',
         boxShadow: isEditing ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.2)' : 'none',
         backgroundColor: isEditing ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
         borderRadius: isEditing ? '6px' : '0',
         border: isEditing ? '2px solid #ffd700' : 'none'
        }}
      >
        {/* Ripple animation - RED at stage 1 (staff selection), GREEN at stage 2 (marker modal) */}
        {showRipple ? createPortal(
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              style={{
                position: 'absolute',
                left: ripplePosition.x,
                top: ripplePosition.y,
                transform: 'translate(-50%, -50%)',
                width: '300vmax',
                height: '300vmax',
                borderRadius: '50%',
                border: longPressStage === 'stage1' ? '8px solid rgba(239, 68, 68, 1)' : '8px solid rgba(34, 197, 94, 1)',
                backgroundColor: longPressStage === 'stage1' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                animation: 'ripple-expand-large 1.5s ease-out infinite',
              }}
            />
            <style>{`
              @keyframes ripple-expand-large {
                0% { 
                  transform: translate(-50%, -50%) scale(0);
                  opacity: 1;
                }
                100% { 
                  transform: translate(-50%, -50%) scale(1);
                  opacity: 0;
                }
              }
            `}</style>
          </div>,
          document.body
        ) : null}

        <div 
          className="flex justify-center w-full min-w-0"
          onDoubleClick={handleDoubleClick}
        >
          <div className="flex items-center gap-0.5 max-w-full min-w-0">
            {hasCenterRemark && (
              <span 
                ref={asteriskRef}
                className="text-red-600 font-bold flex-shrink-0"
                style={{ fontSize: window.innerWidth > window.innerHeight ? '14px' : '16px', lineHeight: 1, marginTop: '-5px' }}
              >
                *
              </span>
            )}
            <div ref={nameContainerRef} className="relative flex-1 min-w-0" style={{ minHeight: '20px' }}>
              {shouldFlip ? (
                <FlipCard
                  frontContent={
                    <ScrollingText 
                      text={displayName}
                      className="text-left"
                      pauseDuration={2}
                      scrollDuration={6}
                      leftOffset={offsetWidth}
                      style={{ marginTop: '-5px' }}
                    />
                  }
                  backContent={
                    <div className="flex items-center justify-center w-full h-full">
                      <span style={{ fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px', fontWeight: '500', lineHeight: 1, color: getTextColor(), whiteSpace: 'nowrap', marginTop: '-5px' }}>
                        ({entry.shift_marker?.toUpperCase()})
                      </span>
                    </div>
                  }
                  shouldFlip={shouldFlip}
                  flipDuration={0.6}
                  flipDelay={1.5}
                  className="w-auto"

                />
              ) : (
                <ScrollingText 
                  text={displayName}
                  className="text-left"
                  pauseDuration={2}
                  scrollDuration={6}
                  leftOffset={offsetWidth}
                  style={{}}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Center name tooltip on hover */}
        {hasCenterRemark && centerRemark && (
          <div 
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-70"
            style={{
              maxWidth: '200px'
            }}
          >
            {centerRemark}
          </div>
        )}
        
        {/* Golden sparkle effects */}
        {isEditing && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '4px',
                height: '4px',
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                animation: 'sparkle1 2s ease-in-out infinite',
                zIndex: 65
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '8px',
                width: '3px',
                height: '3px',
                backgroundColor: '#ffed4e',
                borderRadius: '50%',
                animation: 'sparkle2 2.5s ease-in-out infinite',
                zIndex: 65
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '1px',
                width: '2px',
                height: '2px',
                backgroundColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'sparkle3 1.8s ease-in-out infinite',
                zIndex: 65
              }}
            />
          </>
        )}
      </div>
      
      {/* Add CSS animations */}
      <style>{`
        @keyframes goldenPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.6);
          }
        }
        
        @keyframes goldenDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.3);
            box-shadow: 0 0 15px rgba(255, 215, 0, 1);
          }
        }
        
        @keyframes sparkle1 {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: scale(1) rotate(90deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2) rotate(180deg);
          }
          75% {
            opacity: 0.6;
            transform: scale(0.8) rotate(270deg);
          }
        }
        
        @keyframes sparkle2 {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.5);
          }
          60% {
            opacity: 0.7;
            transform: scale(1);
          }
        }
        
        @keyframes sparkle3 {
          0%, 100% {
            opacity: 0;
            transform: scale(0) translateY(0);
          }
          40% {
            opacity: 1;
            transform: scale(1.8) translateY(-2px);
          }
          80% {
            opacity: 0.5;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* Authentication Modal */}
      {showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'auto'
          }}
          onWheel={(e) => e.preventDefault()}
          onScroll={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              handleCancelAuth();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Code
                </label>
                <div className="flex flex-col items-center">
                  <div className="flex space-x-3 mb-3">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type={showPassword ? "text" : "password"}
                        value={authCode[index] || ''}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          if (newValue.length <= 1) {
                            const newCode = authCode.split('');
                            newCode[index] = newValue;
                            const completeCode = newCode.join('');
                            setAuthCode(completeCode);
                            
                            // Clear error when user is editing (backspacing)
                            if (authError && newValue === '') {
                              setAuthError('');
                            }
                            
                            // Auto-focus next input
                            if (newValue && index < 3) {
                              const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                              if (nextInput) nextInput.focus();
                            }
                            
                            // Auto-submit when 4th digit is entered
                            if (completeCode.length === 4) {
                              setTimeout(() => {
                                const confirmButton = document.querySelector('button[data-auth-confirm]') as HTMLButtonElement;
                                if (confirmButton) {
                                  confirmButton.click();
                                  // Blur all inputs to dismiss keyboard
                                  document.querySelectorAll('input[data-index]').forEach(input => {
                                    (input as HTMLInputElement).blur();
                                  });
                                }
                              }, 100);
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace to go to previous input
                          if (e.key === 'Backspace' && !authCode[index] && index > 0) {
                            const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        data-index={index}
                        className="w-12 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
                        maxLength={1}
                        autoComplete="off"
                        autoFocus={index === 0}
                        // Disable browser's built-in password reveal and autocomplete
                        spellCheck="false"
                        autoCorrect="off"
                        autoCapitalize="off"
                        // Additional attributes to prevent browser-specific controls
                        data-lpignore="true"
                        data-form-type="other"
                        // Add numerical keyboard support
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onInput={(e) => {
                          // Ensure only numbers are entered
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^0-9]/g, '');
                        }}
                      />
                    ))}
                  </div>
                  {authCode.length === 4 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onTouchStart={() => setShowPassword(true)}
                        onTouchEnd={() => setShowPassword(false)}
                        onMouseDown={() => setShowPassword(true)}
                        onMouseUp={() => setShowPassword(false)}
                        onMouseLeave={() => setShowPassword(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg"
                        style={{
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Only show error when all 4 digits are entered */}
              {authError && authCode.length === 4 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">{authError}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelAuth}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  data-auth-confirm
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={staffNames}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onSelectStaffWithColor={handleStaffSelectWithColor}
        onClose={handleCancelStaffSelection}
        authCode={authCode}
      />

      {/* Shift Marker Modal */}
      <ShiftMarkerModal
        isOpen={showShiftMarkerModal}
        onClose={() => setShowShiftMarkerModal(false)}
        onSelectMarker={handleMarkerSelect}
        currentMarker={entry.shift_marker as 'EARLY' | 'LATE' | 'FIRST' | 'SECOND' | 'FULL' | undefined}
      />

      {/* Error Confirmation Modal */}
      <ConfirmationModal
        isOpen={errorMessage !== null}
        title="Error"
        message={errorMessage || ''}
        onConfirm={() => setErrorMessage(null)}
        onCancel={() => setErrorMessage(null)}
        confirmText="OK"
        cancelText=""
        isDanger={true}
      />
    </>
  );
};