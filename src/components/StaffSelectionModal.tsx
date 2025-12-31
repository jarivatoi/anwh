import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Calendar, User, Clock, Palette, Check } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { validateAuthCode, isAdminCode, sortByGroup, authCodes } from '../utils/rosterAuth';

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

  // Log props for debugging
  useEffect(() => {
    console.log('🔍 StaffSelectionModal props:', {
      isOpen,
      entry: entry?.assigned_name,
      entryId: entry?.id,
      availableStaffLength: availableStaff?.length,
      allEntriesForShiftLength: allEntriesForShift?.length,
      allEntriesForShift: allEntriesForShift?.map(e => ({ id: e.id, assigned_name: e.assigned_name }))
    });
  }, [isOpen, entry, availableStaff, allEntriesForShift]);

  // Check if user is admin
  useEffect(() => {
    if (authCode) {
      setIsAdmin(isAdminCode(authCode));
    }
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

  // Get the base name without (R) suffix
  const getBaseName = (name: string): string => {
    return name.replace(/\(R\)$/, '').trim();
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

    // Filter out already assigned staff
    let filtered = availableStaff
      .filter(name => name !== 'ADMIN')
      .filter(name => !assignedStaff.includes(name));
      
    console.log('🔍 filtered after removing assigned staff:', filtered);

    // Special handling: if current assignment is a (R) variant, 
    // exclude the base name from the list to avoid duplicates
    if (entry?.assigned_name.includes('(R)')) {
      const baseName = getBaseName(entry.assigned_name);
      filtered = filtered.filter(name => name !== baseName);
      console.log('🔍 filtered after removing base name (current is R variant):', filtered);
    }
    
    // Special handling: if current assignment is a base name,
    // exclude the (R) variant from the list to avoid duplicates
    if (entry?.assigned_name && !entry.assigned_name.includes('(R)')) {
      const rVariant = `${entry.assigned_name}(R)`;
      filtered = filtered.filter(name => name !== rVariant);
      console.log('🔍 filtered after removing R variant (current is base name):', filtered);
    }

    // Special handling for (R) variants in assigned staff:
    // If an (R) variant is assigned, exclude the base name from the list and vice versa
    assignedStaff.forEach(assignedName => {
      if (assignedName.includes('(R)')) {
        // If (R) variant is assigned, exclude the base name
        const baseName = getBaseName(assignedName);
        filtered = filtered.filter(name => name !== baseName);
        console.log(`🔍 filtered after removing base name ${baseName} (assigned is R variant ${assignedName}):`, filtered);
      } else {
        // If base name is assigned, exclude the (R) variant
        const rVariant = `${assignedName}(R)`;
        filtered = filtered.filter(name => name !== rVariant);
        console.log(`🔍 filtered after removing R variant ${rVariant} (assigned is base name ${assignedName}):`, filtered);
      }
    });

    const sorted = sortByGroup(filtered);
    console.log('🔍 Final filtered staff:', sorted);
    return sorted;
  };

  // Get filtered staff list
  const filteredStaff = getFilteredStaff();
  
  console.log('🔍 filteredStaff:', filteredStaff);
  console.log('🔍 NARAYYA in filteredStaff:', filteredStaff.filter(f => f.includes('NARAYYA')));

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
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
                {entry.assigned_name} → {selectedStaff || entry.assigned_name}
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
                <div className="text-sm font-semibold text-gray-900">{entry.assigned_name}</div>
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
              Available Staff ({filteredStaff.length})
            </div>
            
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No available staff</div>
                <div className="text-xs text-gray-400">
                  All staff are already assigned to this shift
                </div>
              </div>
            ) : (
              filteredStaff.map((staffName) => (
                <button
                  key={staffName}
                  onClick={() => handleStaffSelect(staffName)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    selectedStaff === staffName
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                     : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  style={{
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{staffName}</div>
                        <div className="text-sm text-gray-500">
                          {getBaseName(staffName)}
                        </div>
                      </div>
                    </div>
                    {selectedStaff === staffName && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))
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
                      onClick={() => setSelectedColor(color)}
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
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};