import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Calendar, User, Clock, Palette, Check, MapPin } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { validatePasscode } from '../utils/passcodeAuth';
import { sortByGroup } from '../utils/rosterAuth';
import { extractBaseSurname } from '../utils/rosterFilters';
import { formatDisplayNameForUI } from '../utils/rosterDisplayName';
import { useLongPress } from '../hooks/useLongPress';
import CenterManagementModal from './CenterManagementModal';
import { supabase } from '../lib/supabase';

interface StaffSelectionModalProps {
  isOpen: boolean;
  entry: RosterEntry | null;
  availableStaff: string[];
  allEntriesForShift?: RosterEntry[];
  onSelectStaff: (staffName: string) => void;
  onSelectStaffWithColor?: (staffName: string, textColor?: string) => void;
  onClose: () => void;
  authCode?: string;
}

export const StaffSelectionModal: React.FC<StaffSelectionModalProps> = ({
  isOpen,
  entry,
  availableStaff,
  allEntriesForShift = [],
  onSelectStaff,
  onSelectStaffWithColor,
  onClose,
  authCode
}) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [isAdmin, setIsAdmin] = useState(false);
  const [centerManagementModal, setCenterManagementModal] = useState<{isOpen: boolean; staffName: string}>({ isOpen: false, staffName: '' });
  const [userInstitution, setUserInstitution] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [hasSelectionChanged, setHasSelectionChanged] = useState(false); // Track if user selected a different staff member

  // Fetch current user's institution
  useEffect(() => {
    const fetchUserInstitution = async () => {
      try {
        const { workScheduleDB } = await import('../utils/indexedDB');
        await workScheduleDB.init();
        const session = await workScheduleDB.getUserSession();
        
        if (session?.userId) {
          const { data: userData, error } = await supabase
            .from('staff_users')
            .select('id_number, institution_code, posting_institution, surname, name')
            .eq('id', session.userId)
            .single();
          
          if (userData) {
            // Admin 5274 uses posting_institution (can be null to see all centers)
            // Other admins use institution_code (always filtered)
            const institution = userData.id_number === '5274' 
              ? (userData.posting_institution || null)  // Can be null for super admin
              : (userData.institution_code || userData.posting_institution || null);  // Fallback chain for other admins
            setUserInstitution(institution);
            
            // Store current user's full name AND ID for comparison
            setCurrentUserName(`${userData.surname}, ${userData.name}`);
            // Also store the ID number for precise matching
            (window as any).currentUserIdNumber = userData.id_number;
          }
        }
      } catch (err) {
        console.error('Could not determine user institution:', err);
      }
    };
    
    fetchUserInstitution();
  }, []);


  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (authCode) {
        const result = await validatePasscode(authCode);
        setIsAdmin(!!result?.isAdmin);
      }
    };
    checkAdmin();
  }, [authCode]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen && entry) {
      setSelectedStaff(entry.assigned_name);
      setHasSelectionChanged(false); // Reset the flag when modal opens
      
      // For ADMIN: Always detect and set the actual current color from the entry
      if (isAdmin) {
        // Get the actual current color - prioritize text_color, then detect from other logic
        let actualCurrentColor = '#000000'; // Default to black
        
        if (entry.text_color) {
          // If admin has set a custom color, use that
          actualCurrentColor = entry.text_color;
        } else {
          // Otherwise, detect color based on edit status (same logic as getTextColor)
          const hasBeenReverted = (() => {
            if (!entry.change_description) return false;
            const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
            if (originalPdfMatch) {
              let originalPdfAssignment = originalPdfMatch[1].trim();
              if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
                originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
              }
              return entry.assigned_name === originalPdfAssignment && entry.last_edited_by === 'ADMIN';
            }
            return false;
          })();
          
          const hasBeenEdited = entry.change_description && 
                               entry.change_description.includes('Name changed from') &&
                               entry.last_edited_by;
          
          if (hasBeenReverted) {
            actualCurrentColor = '#059669';
          } else if (hasBeenEdited) {
            actualCurrentColor = '#dc2626';
          } else {
            actualCurrentColor = '#000000';
          }
        }
        
        setSelectedColor(actualCurrentColor);
      }
    }
  }, [isOpen, entry, isAdmin]);

  if (!isOpen || !entry) return null;

  // Get the base name without (R) suffix or roster display name suffix
  const getBaseName = (name: string): string => {
    return extractBaseSurname(name);
  };

  // Filter out staff who are already working this shift
  const getFilteredStaff = () => {
    console.log('🔍 availableStaff:', availableStaff);
    console.log('🔍 entry:', entry);
    console.log('🔍 allEntriesForShift:', allEntriesForShift);
    
    if (!allEntriesForShift || allEntriesForShift.length === 0) {
      const filtered = availableStaff.filter(name => name !== 'ADMIN');
      const sorted = sortByGroup(filtered);
      console.log('🔍 Filtered staff (no entries):', sorted);
      return sorted;
    }

    // Get staff who are already assigned to this shift (excluding current entry)
    const assignedStaff = allEntriesForShift
      .filter(e => e.id !== entry?.id)
      .map(e => e.assigned_name);
      
    console.log('🔍 assignedStaff (excluding current entry):', assignedStaff);

    // Start with all available staff (except ADMIN)
    let filtered = availableStaff.filter(name => name !== 'ADMIN');
    
    // Get the base name of the currently assigned staff
    const currentAssignedBaseName = getBaseName(entry.assigned_name);
    const currentAssignedIsRVariant = entry.assigned_name.includes('(R)');
    
    // Check if current user is Admin 5274 (super admin)
    const currentIdNumber = (window as any).currentUserIdNumber;
    const isSuperAdmin = currentIdNumber === '5274';
    
    // Get base names of all staff assigned to this shift
    const assignedBaseNames = allEntriesForShift
      .filter(e => e.shift_type === entry.shift_type)
      .map(e => getBaseName(e.assigned_name));
    
    // Get (R) variants that are assigned to this shift
    const assignedRVariants = allEntriesForShift
      .filter(e => e.shift_type === entry.shift_type && e.assigned_name.includes('(R)'))
      .map(e => getBaseName(e.assigned_name));
    
    // For admin users, show all staff (they might want to reassign staff)
    if (!isAdmin) {
      // For non-admin users, filter based on whether current entry has (R) or not
      filtered = filtered.filter(name => {
        const candidateBaseName = getBaseName(name);
        const candidateIsRVariant = name.includes('(R)');
        
        // Check if this staff member is already assigned to this shift
        const isAssignedToShift = allEntriesForShift.some(e => 
          e.assigned_name === name && e.shift_type === entry.shift_type
        );
        
        // If current entry is base name (e.g., NARAYYA without (R))
        // Show only names WITHOUT (R) variant
        if (!currentAssignedIsRVariant) {
          // Filter out (R) variants UNLESS they're already assigned (show greyed out)
          if (candidateIsRVariant && !isAssignedToShift) {
            return false;
          }
          
          // If the (R) variant of this base name staff is already assigned,
          // filter out this base name candidate (unless it's the current entry or already assigned)
          // e.g., If NARAYYA(R) is assigned, filter out NARAYYA from the list
          if (!candidateIsRVariant && 
              assignedRVariants.includes(candidateBaseName) && 
              name !== entry.assigned_name && 
              !isAssignedToShift) {
            return false;
          }
        }
        
        // If current entry is (R) variant (e.g., NARAYYA(R))
        // Show only names WITH (R) variant, BUT also show base names that are assigned
        if (currentAssignedIsRVariant) {
          // Filter out base names UNLESS they're already assigned to this shift (show greyed out)
          if (!candidateIsRVariant && !isAssignedToShift) {
            return false;
          }
          
          // If the base name variant of this (R) staff is already assigned,
          // filter out this (R) candidate (unless it's the current entry or already assigned)
          // e.g., If PITTEA is assigned, filter out PITTEA(R) from the list
          if (candidateIsRVariant && 
              assignedBaseNames.includes(candidateBaseName) && 
              name !== entry.assigned_name && 
              !isAssignedToShift) {
            return false;
          }
        }
        
        return true;
      });
    } else if (!isSuperAdmin) {
      // For regular admins (not 5274), apply same filtering logic
      // Get base names of all staff assigned to this shift
      const assignedBaseNamesAdmin = allEntriesForShift
        .filter(e => e.shift_type === entry.shift_type)
        .map(e => getBaseName(e.assigned_name));
      
      // Get (R) variants that are assigned to this shift
      const assignedRVariantsAdmin = allEntriesForShift
        .filter(e => e.shift_type === entry.shift_type && e.assigned_name.includes('(R)'))
        .map(e => getBaseName(e.assigned_name));
      
      filtered = filtered.filter(name => {
        const candidateBaseName = getBaseName(name);
        const candidateIsRVariant = name.includes('(R)');
        
        // Check if this staff member is already assigned to this shift
        const isAssignedToShift = allEntriesForShift.some(e => 
          e.assigned_name === name && e.shift_type === entry.shift_type
        );
        
        // If current entry is base name, filter out (R) variants (unless assigned - show greyed out)
        if (!currentAssignedIsRVariant && candidateIsRVariant && !isAssignedToShift) {
          return false;
        }
        
        // If current entry is base name, filter out base names if their (R) variant is assigned
        // (unless it's the current entry or already assigned - show greyed out)
        if (!currentAssignedIsRVariant && 
            !candidateIsRVariant && 
            assignedRVariantsAdmin.includes(candidateBaseName) && 
            name !== entry.assigned_name && 
            !isAssignedToShift) {
          return false;
        }
        
        // If current entry is (R) variant, filter out base names (unless assigned - show greyed out)
        if (currentAssignedIsRVariant && !candidateIsRVariant && !isAssignedToShift) {
          return false;
        }
        
        // If base name is already assigned, filter out the (R) variant
        // (unless it's the current entry or already assigned - show greyed out)
        if (candidateIsRVariant && 
            assignedBaseNamesAdmin.includes(candidateBaseName) && 
            name !== entry.assigned_name && 
            !isAssignedToShift) {
          return false;
        }
        
        return true;
      });
    }
    // For Admin 5274 (super admin), don't filter - they can see and assign both variants
      
    console.log('🔍 filtered after removing assigned staff:', filtered);

    // Note: We no longer filter out base/R variants here because:
    // 1. Institution filtering already ensures we show only relevant staff
    // 2. Staff from different institutions can have same surnames (e.g., NARAYYA)
    // 3. Each staff member is unique by their full name + institution combination

    const sorted = sortByGroup(filtered);
    console.log('🔍 Final filtered staff:', sorted);
    return sorted;
  };

  // Get filtered staff list
  const filteredStaff = getFilteredStaff();
  
  // Calculate unique staff count (treating R variants as same person)
  // Also exclude the base name of the current entry being edited
  const currentEntryBaseName = entry?.assigned_name ? entry.assigned_name.replace(/\(R\)$/, '').trim() : '';
  const uniqueBaseNames = new Set(
    filteredStaff
      .map(name => name.replace(/\(R\)$/, '').trim())
      .filter(baseName => baseName !== currentEntryBaseName)
  );
  
  console.log('🔍 filteredStaff:', filteredStaff);
  console.log('🔍 NARAYYA in filteredStaff:', filteredStaff.filter(f => f.includes('NARAYYA')));

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
    // Set flag to true if user selected a different staff member
    setHasSelectionChanged(staffName !== entry.assigned_name);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    // For admin, also trigger the selection changed flag if color is different from original
    if (isAdmin && entry) {
      let originalColor = '#000000';
      
      if (entry.text_color) {
        originalColor = entry.text_color;
      } else {
        // Detect the current color based on edit status
        const hasBeenReverted = (() => {
          if (!entry.change_description) return false;
          const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
          if (originalPdfMatch) {
            let originalPdfAssignment = originalPdfMatch[1].trim();
            if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
              originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
            }
            return entry.assigned_name === originalPdfAssignment && entry.last_edited_by === 'ADMIN';
          }
          return false;
        })();
        
        const hasBeenEdited = entry.change_description && 
                             entry.change_description.includes('Name changed from') &&
                             entry.last_edited_by;
        
        if (hasBeenReverted) {
          originalColor = '#059669';
        } else if (hasBeenEdited) {
          originalColor = '#dc2626';
        } else {
          originalColor = '#000000';
        }
      }
      
      // Set flag to true if color changed
      setHasSelectionChanged(color !== originalColor);
    }
  };

  // Handle long press for center management
  const handleCenterManagementLongPress = (staffName: string) => {
    console.log('🏢 handleCenterManagementLongPress called for:', staffName);
    console.log('👤 isAdmin:', isAdmin, 'currentUserName:', currentUserName, 'currentUserIdNumber:', (window as any).currentUserIdNumber);
    
    // Admin can manage any staff member
    if (isAdmin) {
      setCenterManagementModal({ isOpen: true, staffName });
      return;
    }
    
    // Regular users can only manage their own name
    // Use ID-based matching for accuracy
    const currentIdNumber = (window as any).currentUserIdNumber;
    
    if (currentIdNumber) {
      // Extract ID number from staffName if it exists (format: NAME_IDNUMBER or NAME_IDNUMBER(R))
      const staffNameParts = staffName.split('_');
      const staffIdNumber = staffNameParts.length > 1 ? staffNameParts[staffNameParts.length - 1].replace('(R)', '').trim() : null;
      
      console.log('🔍 ID comparison - currentIdNumber:', currentIdNumber, 'staffIdNumber:', staffIdNumber);
      
      // Match by ID number if available
      if (staffIdNumber && staffIdNumber === currentIdNumber) {
        console.log('✅ ID match - User managing own center:', staffName);
        setCenterManagementModal({ isOpen: true, staffName });
        return;
      }
      
      // Fallback to name matching if no ID in staffName
      if (currentUserName) {
        const isOwnName = staffName === currentUserName || 
                         staffName.includes(currentUserName.split(',')[0]); // Check surname
        
        if (isOwnName) {
          console.log('✅ Name match - User managing own center:', staffName);
          setCenterManagementModal({ isOpen: true, staffName });
        } else {
          console.log('⚠️ No match - User tried to manage another staff member:', staffName);
          // Don't show alert - just silently ignore
        }
      } else {
        console.warn('⚠️ Could not determine current user');
        // Don't show alert - just silently ignore
      }
    } else {
      console.warn('⚠️ Could not determine current user ID number');
      // Don't show alert - just silently ignore
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleConfirm = () => {
    const nameChanged = selectedStaff !== entry.assigned_name;
    
    // For ADMIN: Check if color has changed from the actual current color
    let originalColor = '#000000';
    
    if (entry.text_color) {
      originalColor = entry.text_color;
    } else {
      // Detect the current color based on edit status (same logic as above)
      const hasBeenReverted = (() => {
        if (!entry.change_description) return false;
        const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
        if (originalPdfMatch) {
          let originalPdfAssignment = originalPdfMatch[1].trim();
          if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
            originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
          }
          return entry.assigned_name === originalPdfAssignment && entry.last_edited_by === 'ADMIN';
        }
        return false;
      })();
      
      const hasBeenEdited = entry.change_description && 
                           entry.change_description.includes('Name changed from') &&
                           entry.last_edited_by;
      
      if (hasBeenReverted) {
        originalColor = '#059669';
      } else if (hasBeenEdited) {
        originalColor = '#dc2626';
      } else {
        originalColor = '#000000';
      }
    }
    
    const colorChanged = isAdmin && selectedColor !== originalColor;
    
    if (selectedStaff && (nameChanged || colorChanged)) {
      if (onSelectStaffWithColor && isAdmin && colorChanged) {
        onSelectStaffWithColor(selectedStaff, selectedColor);
      } else if (onSelectStaffWithColor && isAdmin && nameChanged) {
        onSelectStaffWithColor(selectedStaff, selectedColor);
      } else {
        onSelectStaff(selectedStaff);
      }
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Separate component for staff item to handle long press properly
  interface StaffItemProps {
    staffName: string;
    isSelected: boolean;
    isAssignedToSameShift: boolean;
    onSelect: (name: string) => void;
    onLongPress: (name: string) => void;
  }

  const StaffItem: React.FC<StaffItemProps> = ({ 
    staffName, 
    isSelected, 
    isAssignedToSameShift, 
    onSelect,
    onLongPress 
  }) => {
    const touchStartRef = React.useRef<number>(0);
    const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [isLongPressed, setIsLongPressed] = React.useState(false);
    
    const startLongPress = () => {
      touchStartRef.current = Date.now();
      setIsLongPressed(false);
      longPressTimeoutRef.current = setTimeout(() => {
        setIsLongPressed(true);
        onLongPress(staffName);
        touchStartRef.current = 0;
      }, 2500);
    };
    
    const cancelLongPress = () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      touchStartRef.current = 0;
      setTimeout(() => setIsLongPressed(false), 100);
    };
    
    const handleClick = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!isLongPressed && !isAssignedToSameShift) {
        onSelect(staffName);
      }
      cancelLongPress();
    };
    
    const handleMapPinClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onLongPress(staffName);
    };
    
    return (
      <div
        className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-50 text-blue-900'
            : isAssignedToSameShift
              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
        style={{
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between" style={{ pointerEvents: 'auto' }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className={`font-medium ${isAssignedToSameShift ? 'text-gray-400' : 'text-gray-900'}`}>
                {formatDisplayNameForUI(staffName)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2" style={{ pointerEvents: 'auto' }}>
            {isAssignedToSameShift && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                Assigned
              </span>
            )}
            {isSelected && (
              <Check className="w-5 h-5 text-blue-600" />
            )}
          </div>
        </div>
      </div>
    );

    // Helper function to get the current color of the entry
    const getCurrentColor = () => {
      if (!entry) return '#000000';
      
      if (entry.text_color) {
        // If admin has set a custom color, use that
        return entry.text_color;
      } else {
        // Otherwise, detect color based on edit status
        const hasBeenReverted = (() => {
          if (!entry.change_description) return false;
          const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
          if (originalPdfMatch) {
            let originalPdfAssignment = originalPdfMatch[1].trim();
            if (originalPdfAssignment.includes('(R') && !originalPdfAssignment.includes('(R)')) {
              originalPdfAssignment = originalPdfAssignment.replace('(R', '(R)');
            }
            return entry.assigned_name === originalPdfAssignment;
          }
          return false;
        })();
      
        const hasBeenEdited = entry.change_description && 
                             entry.change_description.includes('Name changed from') &&
                             entry.last_edited_by;
      
        if (hasBeenReverted) {
          return '#059669'; // Green for reverted entries (back to original PDF)
        } else if (hasBeenEdited) {
          return '#dc2626'; // Red for edited entries
        } else {
          return '#000000'; // Black for original entries
        }
      }
    };
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[99999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
        overflow: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
          maxHeight: '90vh',
          margin: window.innerWidth > window.innerHeight ? '4px 0' : '0',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {/* Header */}
        <div 
          className="border-b border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">
                Select Staff Member
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {formatDisplayNameForUI(entry.assigned_name)} → {formatDisplayNameForUI(selectedStaff || entry.assigned_name)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Entry Details */}
        <div 
          className="border-b border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="space-y-3">
            {/* Date */}
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{formatDate(entry.date)}</span>
            </div>
            
            {/* Shift Type */}
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{entry.shift_type}</span>
            </div>
            
            {/* Current Assignment */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Current Assignment</div>
                <div className="text-sm font-semibold text-gray-900">{formatDisplayNameForUI(entry.assigned_name)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3 text-center">
              Available Staff ({uniqueBaseNames.size})
            </div>
            
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No available staff</div>
                <div className="text-xs text-gray-400">
                  All staff are already assigned to this shift
                </div>
              </div>
            ) : (
              filteredStaff.map((staffName) => {
                // Check if this EXACT staff member is already assigned to the same shift (excluding current entry)
                const isAssignedToSameShift = allEntriesForShift.some(e => 
                  e.assigned_name === staffName && 
                  e.shift_type === entry.shift_type &&
                  e.id !== entry?.id
                );
                
                // Show as selected (blue tick) only for the current entry being edited
                // Other assigned staff will show as greyed out via isAssignedToSameShift
                const isSelected = selectedStaff === staffName;
                
                return (
                  <StaffItem
                    key={staffName}
                    staffName={staffName}
                    isSelected={isSelected}
                    isAssignedToSameShift={isAssignedToSameShift}
                    onSelect={handleStaffSelect}
                    onLongPress={handleCenterManagementLongPress}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="border-t border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="space-y-3">
            {/* Color selection for admin */}
            {isAdmin && (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <Palette className="w-4 h-4" />
                    <span>Text Color</span>
                  </div>
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300"
                    style={{ backgroundColor: selectedColor }}
                  />
                </div>
                
                {/* Color options */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { color: '#000000', label: 'Black' },
                    { color: '#dc2626', label: 'Red' },
                    { color: '#059669', label: 'Green' }
                  ].map(({ color, label }) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor === color 
                          ? 'border-gray-800 ring-2 ring-offset-2 ring-blue-500' 
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={label}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Show Cancel and Confirm buttons only if selection or color changed */}
            {hasSelectionChanged && (
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedStaff}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                    selectedStaff 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Center Management Modal */}
      <CenterManagementModal
        isOpen={centerManagementModal.isOpen}
        staffName={centerManagementModal.staffName}
        currentDate={entry?.date}
        currentShift={entry?.shift_type}
        userInstitution={userInstitution}
        isAdmin={isAdmin}
        onClose={() => setCenterManagementModal({ isOpen: false, staffName: '' })}
        onCenterChange={(staffName, centerName, action, editorName) => {
          // Log the center change - this will automatically appear in RosterLogView
          // since it reads from roster_entries.change_description
          console.log(`📝 LOG: ${editorName} ${action === 'add' ? 'added' : 'removed'} posting for ${staffName} at ${centerName}`);
          
          // The change_description update already happened in CenterManagementModal
          // RosterLogView will automatically show this because it reads from the database
          // No additional logging needed - Supabase real-time will update the log view
        }}
      />
    </div>,
    document.body
  );
};