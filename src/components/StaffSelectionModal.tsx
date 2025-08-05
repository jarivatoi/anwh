import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Calendar, User, Clock, Palette, Check } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { validateAuthCode, isAdminCode } from '../utils/rosterAuth';

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
            actualCurrentColor = '#000000'; // Black for ADMIN-reverted entries
          } else if (hasBeenEdited) {
            actualCurrentColor = '#dc2626'; // Red for edited entries
          } else {
            actualCurrentColor = '#000000'; // Black for original entries
          }
        }
        
        console.log('🎨 ADMIN: Detecting and setting initial color:', {
          entryTextColor: entry.text_color,
          actualCurrentColor,
          assignedName: entry.assigned_name
        });
        setSelectedColor(actualCurrentColor);
      } else {
        setSelectedColor('#000000');
      }
    }
  }, [isOpen, entry, isAdmin]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

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

  if (!isOpen || !entry) return null;

  // Filter out staff who are already working this shift
  const getFilteredStaff = () => {
    if (!allEntriesForShift || allEntriesForShift.length === 0) {
      return availableStaff.filter(name => name !== 'ADMIN');
    }

    // Get all currently assigned staff for this shift
    const currentlyAssigned = allEntriesForShift.map(e => e.assigned_name);
    
    // Filter out staff who are already working, including matching base names
    return availableStaff.filter(staffName => {
      // Exclude ADMIN from selection
      if (staffName === 'ADMIN') {
        return false;
      }
      
      // Don't filter out the current assignment (allow changing to same person)
      if (staffName === entry.assigned_name) {
        return true;
      }
      
      // Check if this staff member (or their counterpart) is already assigned
      const baseName = staffName.replace(/\(R\)$/, '').trim();
      const isAlreadyAssigned = currentlyAssigned.some(assigned => {
        const assignedBaseName = assigned.replace(/\(R\)$/, '').trim();
        return baseName === assignedBaseName;
      });
      
      return !isAlreadyAssigned;
    });
  };

  const filteredStaff = getFilteredStaff();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
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
        originalColor = '#000000';
      } else if (hasBeenEdited) {
        originalColor = '#dc2626';
      } else {
        originalColor = '#000000';
      }
    }
    
    const colorChanged = isAdmin && selectedColor !== originalColor;
    
    console.log('🎨 Color change detection:', {
      isAdmin,
      selectedColor,
      originalColor,
      colorChanged,
      nameChanged,
      comparison: `"${selectedColor}" !== "${originalColor}"`,
      entryTextColor: entry.text_color,
      hasCustomTextColor: !!entry.text_color
    });
    
    if (selectedStaff && (nameChanged || colorChanged)) {
      if (onSelectStaffWithColor && isAdmin && colorChanged) {
        console.log('🎨 Calling onSelectStaffWithColor with color:', selectedColor);
        onSelectStaffWithColor(selectedStaff, selectedColor);
      } else if (onSelectStaffWithColor && isAdmin && nameChanged) {
        console.log('🎨 Calling onSelectStaffWithColor for name change only');
        onSelectStaffWithColor(selectedStaff, selectedColor);
      } else {
        console.log('🎨 Calling onSelectStaff (regular user or no color change)');
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

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[99999]"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
        paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px',
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
          maxWidth: window.innerWidth > window.innerHeight ? '98vw' : '28rem',
          maxHeight: window.innerWidth > window.innerHeight ? '98vh' : '90vh',
          margin: window.innerWidth > window.innerHeight ? '2px 0' : '16px 0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="relative border-b border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
            Select Staff Member
          </h3>
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
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className={`w-5 h-5 ${
                        selectedStaff === staffName ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className="font-medium text-base">{staffName}</div>
                        {staffName === entry.assigned_name && (
                          <div className="text-xs text-gray-500">Current assignment</div>
                        )}
                      </div>
                    </div>
                    
                    {selectedStaff === staffName && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Color Selection for ADMIN */}
          {isAdmin && (
            <div 
              className="border-t border-gray-200 flex-shrink-0"
              style={{
                padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
              }}
            >
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 text-center">
                  <Palette className="w-4 h-4 inline mr-2" />
                  Text Color (Admin Only)
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: '#000000', name: 'Black' },
                    { color: '#dc2626', name: 'Red' },
                    { color: '#059669', name: 'Green' },
                    { color: '#2563eb', name: 'Blue' },
                    { color: '#7c3aed', name: 'Purple' },
                    { color: '#ea580c', name: 'Orange' },
                    { color: '#0891b2', name: 'Cyan' },
                    { color: '#be123c', name: 'Rose' }
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-full h-10 rounded-lg border-2 transition-all duration-200 ${
                        selectedColor === color 
                          ? 'border-gray-800 scale-110' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={name}
                    >
                      {selectedColor === color && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full border border-gray-300" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="text-center">
                  <span className="text-xs text-gray-600">
                    Preview: <span style={{ color: selectedColor, fontWeight: 'bold' }}>{selectedStaff || 'Staff Name'}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Add extra padding at bottom */}
          <div className="h-8" />
        </div>

        {/* Footer */}
        <div 
          className="border-t border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={(() => {
                if (!selectedStaff || filteredStaff.length === 0) return true;
                
                const nameChanged = selectedStaff !== entry.assigned_name;
                
                if (!isAdmin) {
                  // For regular users: only enable if name changed
                  return !nameChanged;
                }
                
                // For ADMIN: enable if either name OR color changed
                const currentColor = getCurrentColor();
                const colorChanged = selectedColor !== currentColor;
                
                console.log('🎨 Button enable check (FIXED):', {
                  selectedStaff,
                  nameChanged,
                  isAdmin,
                  selectedColor,
                  currentColor,
                  colorChanged,
                  shouldEnable: nameChanged || colorChanged,
                  buttonDisabled: !nameChanged && !colorChanged
                });
                
                return !nameChanged && !colorChanged;
              })()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Change</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};