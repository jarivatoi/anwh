import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Calendar, User, Clock } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { useLongPress } from '../hooks/useLongPress';
import { availableNames, validateAuthCode } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { parseNameChange, isPastDate } from '../utils/rosterHelpers';
import { ScrollingText } from './ScrollingText';
import { StaffSelectionModal } from './StaffSelectionModal';
import { gsap } from 'gsap';

interface RosterEntryCellProps {
  entry: RosterEntry;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  onShowDetails?: (entry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
}

export const RosterEntryCell: React.FC<RosterEntryCellProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Get available staff (excluding others already working this shift, including same base names)
  const getAvailableStaff = () => {
    if (!allEntriesForShift || allEntriesForShift.length === 0) {
      return availableNames.filter(name => name !== 'ADMIN');
    }

    // Get all currently assigned staff for this shift
    const currentlyAssigned = allEntriesForShift.map(e => e.assigned_name);
    
    // Filter out staff who are already working, including matching base names
    return availableNames.filter(staffName => {
      // Exclude ADMIN from selection
      if (staffName === 'ADMIN') {
        return false;
      }
      
      // Don't filter out the current assignment (allow keeping same person)
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

  // Check if entry has been edited
  const hasBeenEdited = (entry: RosterEntry) => {
    const result = !!(entry.last_edited_by && entry.last_edited_by.trim() !== '');
    return result;
  };

  // Check if current assignment matches original assignment (show black with asterisk)
  const isBackToOriginal = (entry: RosterEntry) => {
    // Only check for name changes if the entry has actually been edited AND has change description
    if (!hasBeenEdited(entry) || !entry.change_description || !entry.change_description.includes('Name changed from')) return false;
    
    const nameInfo = parseNameChange(entry.change_description || '', entry.assigned_name);
    const result = nameInfo.isNameChange && nameInfo.oldName && entry.assigned_name === nameInfo.oldName;
    
    return result;
  };

  // Get display styling for the name
  const getNameStyling = (entry: RosterEntry) => {
    // PRIORITY 1: PDF imports are ALWAYS black text (highest priority)
    if (entry.change_description === 'Imported from PDF') {
      console.log('🎨 PDF imported entry - ALWAYS black text');
      return { className: '', showAsterisk: false };
    }
    
    // PRIORITY 1B: PDF imports with conversion notes are ALWAYS black text
    if (entry.change_description && entry.change_description.includes('Imported from PDF')) {
      console.log('🎨 PDF imported entry (with conversion) - ALWAYS black text');
      return { className: '', showAsterisk: false };
    }
    
    // PRIORITY 2: Admin added entries = black text
    if (entry.change_description && entry.change_description.includes('Added by')) {
      console.log('🎨 Admin added entry - black text');
      return { className: '', showAsterisk: false };
    }
    
    // PRIORITY 3: No edits and no initial assignment = black text
    if (!entry.last_edited_by && !entry.change_description) {
      console.log('🎨 No edits and no initial assignment - black text');
      return { className: '', showAsterisk: false };
    }
    
    if (!hasBeenEdited(entry)) {
      // Has change description but never manually edited - normal black text
      return { className: '', showAsterisk: false };
    }
    
    // Check for original assignment if we have change description
    if (!entry.change_description || !entry.change_description.includes('Name changed from')) {
      // Manually edited but no change description - red text
      return { className: 'text-red-600 animate-pulse-subtle', showAsterisk: false };
    }
    
    if (isBackToOriginal(entry)) {
      // Manually edited but back to original - black text with asterisk
      return { className: 'text-black animate-pulse-subtle', showAsterisk: true };
    }
    
    // Manually edited and different from original - red pulsating text
    return { className: 'text-red-600 animate-pulse-subtle', showAsterisk: false };
  };

  // Handle long press for entry details
  const handleLongPress = () => {
    // Long press shows authentication for editing
    setShowAuthModal(true);
  };

  const handleDoublePress = () => {
    // Double tap shows details for edited entries
    if (hasBeenEdited(entry)) {
      console.log('🔍 Double-click detected on edited entry in RosterEntryCell, calling onShowDetails');
      onShowDetails?.(entry);
    }
  };

  const interactionHandlers = useLongPress({
    onLongPress: handleLongPress,
    onDoublePress: handleDoublePress,
    delay: 5000
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAuthModal) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
      
      // CRITICAL: Disable scrolling on ALL table containers
      const tableContainers = document.querySelectorAll('[style*="overflow: auto"], [style*="overflow-y: auto"], .overflow-y-auto');
      tableContainers.forEach(container => {
        (container as HTMLElement).style.overflow = 'hidden';
        (container as HTMLElement).style.overflowY = 'hidden';
      });
      
      // Also disable scrolling on the main table container
      const mainTableContainer = document.querySelector('[style*="height: 100%; overflow: auto"]');
      if (mainTableContainer) {
        (mainTableContainer as HTMLElement).style.overflow = 'hidden';
        (mainTableContainer as HTMLElement).style.overflowY = 'hidden';
      }
      
      // Disable scrolling on roster table view specifically
      const rosterTableView = document.querySelector('[style*="height: 70vh"]');
      if (rosterTableView) {
        (rosterTableView as HTMLElement).style.overflow = 'hidden';
        (rosterTableView as HTMLElement).style.overflowY = 'hidden';
      }
      
      // Find and disable any scrollable divs in table view
      const scrollableDivs = document.querySelectorAll('div[style*="overflow: auto"]');
      scrollableDivs.forEach(div => {
        (div as HTMLElement).style.overflow = 'hidden';
      });
      
      // Additional table container handling
      const tableContainer = document.querySelector('[style*="height: 100%; overflow: auto"], [style*="overflow: hidden"]');
      if (tableContainer) {
        (tableContainer as HTMLElement).style.overflow = 'hidden';
      }
    }

    return () => {
      // Re-enable body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
      
      // Re-enable table scrolling on ALL containers
      const tableContainers = document.querySelectorAll('[style*="overflow: hidden"], [style*="overflow-y: hidden"]');
      tableContainers.forEach(container => {
        (container as HTMLElement).style.overflow = 'auto';
        (container as HTMLElement).style.overflowY = 'auto';
      });
      
      // Re-enable main table container scrolling
      const mainTableContainer = document.querySelector('[style*="height: 100%; overflow: hidden"]');
      if (mainTableContainer) {
        (mainTableContainer as HTMLElement).style.overflow = 'auto';
        (mainTableContainer as HTMLElement).style.overflowY = 'auto';
      }
      
      // Re-enable roster table view scrolling
      const rosterTableView = document.querySelector('[style*="height: 70vh"]');
      if (rosterTableView) {
        (rosterTableView as HTMLElement).style.overflow = 'auto';
        (rosterTableView as HTMLElement).style.overflowY = 'auto';
      }
      
      // Re-enable scrollable divs
      const scrollableDivs = document.querySelectorAll('div[style*="overflow: hidden"]');
      scrollableDivs.forEach(div => {
        (div as HTMLElement).style.overflow = 'auto';
      });
      
      // Re-enable table scrolling
      const tableContainer = document.querySelector('[style*="height: 100%; overflow: auto"], [style*="overflow: hidden"]');
      if (tableContainer) {
        (tableContainer as HTMLElement).style.overflow = 'auto';
      }
    };
  }, [showAuthModal]);

  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName) {
      setAuthError('Invalid authentication code');
      return;
    }
    
    setShowAuthModal(false);
    setShowStaffModal(true);
  };

  const handleStaffSelect = async (newName: string) => {
    if (newName === entry.assigned_name || !newName) {
      setShowStaffModal(false);
      return;
    }

    setIsUpdating(true);
    
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      const updatedEntry = await updateRosterEntry(entry.id, {
        date: entry.date,
        shiftType: entry.shift_type,
        assignedName: newName,
        changeDescription: `Name changed from "${entry.assigned_name}" to "${newName}"`
      }, editorName);

      // Update the entry object directly for immediate UI reflection
      entry.assigned_name = newName;
      entry.last_edited_by = editorName;
      entry.last_edited_at = updatedEntry.last_edited_at;
      entry.change_description = updatedEntry.change_description;
      
      // Add bounce animation to highlight the change
      if (cellRef.current) {
        gsap.fromTo(cellRef.current,
          {
            scale: 1,
            backgroundColor: '#fef2f2', // Light red background
            force3D: true
          },
          {
            scale: 1.05,
            duration: 0.2,
            ease: "back.out(1.7)",
            yoyo: true,
            repeat: 1,
            force3D: true,
            onComplete: () => {
              // Fade background back to normal
              gsap.to(cellRef.current, {
                backgroundColor: 'transparent',
                duration: 0.5,
                ease: "power2.out"
              });
            }
          }
        );
      }
      
      // Call parent update callback with updated entry
      onUpdate?.(updatedEntry);
      
      // Force a re-render by dispatching a custom event
      window.dispatchEvent(new CustomEvent('rosterUpdated', { 
        detail: {
          ...updatedEntry,
          assigned_name: newName,
          last_edited_by: editorName,
          last_edited_at: updatedEntry.last_edited_at,
          change_description: updatedEntry.change_description
        }
      }));
      
    } catch (error) {
      console.error('Failed to update entry:', error);
      alert('Failed to update entry. Please try again.');
    } finally {
      setIsUpdating(false);
      setShowStaffModal(false);
      setAuthCode('');
    }
  };

  const handleCancel = () => {
    setShowAuthModal(false);
    setShowStaffModal(false);
    setAuthCode('');
    setAuthError('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowAuthModal(false);
      }
    };

    if (showAuthModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAuthModal]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const [datePart, timePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('-');
      const [hour, minute, second] = timePart.split(':');
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second || '0'));
      
      const formattedDate = `${day}-${month}-${year}`;
      const formattedTime = `${hour}h${minute}`;
      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      return timestamp;
    }
  };

  return (
    <>
      <div 
        ref={cellRef}
        className={`text-center p-1 sm:p-2 transition-colors w-full flex items-center justify-center ${
          'cursor-pointer'
        }`}
        {...interactionHandlers}
        style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          zIndex: 10, // Lower z-index so sticky headers appear above
          minHeight: '20px',
          border: '2px solid #374151',
          backgroundColor: 'white',
          margin: '1px'
        }}
      >
        <div className="text-[8px] sm:text-[10px] font-medium text-gray-900 leading-tight w-full flex items-center justify-center">
          {isUpdating ? 'Updating...' : (() => {
            const styling = getNameStyling(entry);
            return (
              <div className="flex items-center justify-center space-x-1">
                <ScrollingText 
                  text={entry.assigned_name}
                  className={styling.className}
                />
                {styling.showAsterisk && (
                  <span className="text-black font-bold text-[10px] sm:text-[12px] animate-asterisk-zoom">*</span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={getAvailableStaff()}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onClose={() => setShowStaffModal(false)}
      />

      {/* Authentication Modal */}
      {showAuthModal && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            backgroundColor: 'rgba(0, 0, 0, 0.98)',
            display: 'flex',
            alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '20px',
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '20px',
            overflow: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onTouchStart={(e) => {
            // Prevent any touch events from reaching the table
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
          onTouchMove={(e) => {
            // Allow touch movement for scrolling, but prevent propagation
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            // Prevent touch end events
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              handleCancel();
            }
          }}
        >
          <div 
            ref={modalRef} 
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
              height: 'auto', // Allow natural height
              minHeight: window.innerWidth > window.innerHeight ? '200px' : '400px',
              backgroundColor: '#ffffff', // Ensure solid white background
              opacity: 1, // Ensure full opacity
              display: 'flex',
              flexDirection: 'column',
              margin: window.innerWidth > window.innerHeight ? '4px auto' : '16px auto',
              marginTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
              marginBottom: window.innerWidth > window.innerHeight ? '4px' : '16px',
              position: 'relative', // Ensure proper stacking
              zIndex: 2147483647,
              // Enable touch interactions within modal
              touchAction: 'auto',
              overflow: 'visible', // Allow modal content to be visible
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)', // Stronger shadow
              border: '2px solid #ffffff', // White border for extra separation
              borderRadius: '16px',
              maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
              width: '100%',
              backgroundColor: '#ffffff',
              transform: 'translate3d(0,0,0)',
              backfaceVisibility: 'hidden'
            }}
            onTouchStart={(e) => {
              // Allow touch events within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Allow touch movement within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Allow touch end within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onClick={(e) => {
              // Prevent modal from closing when clicking inside
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Header - Fixed */}
            <div className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
            }}>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
              </h3>
              <p className="text-indigo-600 text-center" style={{
                fontSize: window.innerWidth > window.innerHeight ? '12px' : '14px' // Smaller text in landscape
              }}>
               Enter your authentication code
              </p>
            </div>
              
            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto"
              style={{
                // CRITICAL: Enable smooth touch scrolling ONLY within this container
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Allow vertical panning (scrolling)
                overscrollBehavior: 'contain', // Prevent scroll chaining to parent
                // Ensure this container can scroll independently
                position: 'relative',
                maxHeight: window.innerWidth > window.innerHeight ? 'calc(95vh - 120px)' : 'calc(90vh - 200px)', // More height in landscape
                minHeight: '100px', // Minimum scrollable area
                padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
              }}
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Authentication Code
                </label>
                <div className="relative">
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-4 border-2 border-indigo-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 text-center font-mono text-xl tracking-widest bg-gradient-to-r from-indigo-50 to-blue-50 transition-all duration-200 shadow-inner"
                  placeholder="Enter your code"
                  maxLength={4}
                  autoComplete="off"
                  style={{
                    textAlign: 'center',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase'
                  }}
                />
                  <div className="absolute inset-0 pointer-events-none rounded-xl border-2 border-transparent bg-gradient-to-r from-indigo-400 to-blue-500 opacity-0 transition-opacity duration-200 focus-within:opacity-20"></div>
                </div>
              </div>
              
              {authError && (
                <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-700 font-medium text-center">{authError}</p>
                  </div>
                </div>
              )}
            </div>
              
            {/* Footer - Fixed */}
            <div className="pt-0 flex-shrink-0 bg-gradient-to-r from-gray-50 to-indigo-50 border-t border-indigo-100" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
            }}>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl font-medium transition-all duration-200 border border-gray-300 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 shadow-lg disabled:shadow-none"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Edit Details Modal */}
      {showDetailsModal && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            // CRITICAL: Prevent all touch interactions with background
            touchAction: 'none', // Disable all touch actions on backdrop
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none', 
            userSelect: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.98)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px', // Less padding in landscape
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px', // Minimal top padding in landscape
            overflow: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onTouchStart={(e) => {
            // Prevent touch events from reaching background
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
            }
          }}
          onTouchMove={(e) => {
            // Prevent any touch movement on backdrop
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            // Prevent touch end events
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
            }
          }}
        >
          <div 
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh', // Use more height in landscape
              display: 'flex',
              flexDirection: 'column',
              // Enable touch interactions within modal
              touchAction: 'auto',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem', // Use more width in landscape
              width: '100%',
              margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0', // Less margin in landscape
              zIndex: 2147483647,
              backgroundColor: '#ffffff'
            }}
            onTouchStart={(e) => {
              // Allow touch events within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Allow touch movement within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              // Allow touch end within modal, prevent propagation to backdrop
              e.stopPropagation();
            }}
            onClick={(e) => {
              // Prevent modal from closing when clicking inside
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="relative pb-4 border-b border-gray-200" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
            }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Edit Details
              </h3>
              
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{entry.date}</span>
              </div>
            </div>

            <div 
              style={{
                // CRITICAL: Enable smooth touch scrolling
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Allow vertical panning (scrolling)
                overscrollBehavior: 'contain', // Prevent scroll chaining to parent
                overflowY: 'auto',
                flex: 1,
                padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
              }}
            >
              <div className="space-y-4">
                {/* Shift Type */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Shift Type</div>
                  <div className="text-gray-900 font-semibold">{entry.shift_type}</div>
                </div>

                {/* Current Assignment */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-1">Current Assignment</div>
                  <div className="text-gray-900 font-semibold">{entry.assigned_name}</div>
                </div>

                {/* Name Change Details */}
                {(() => {
                  const nameInfo = parseNameChange(entry.change_description || '', entry.assigned_name);
                  if (nameInfo.isNameChange) {
                    return (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm font-medium text-yellow-800 mb-2">Name Change</div>
                        <div className="flex items-center space-x-2">
                         <User className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 font-medium line-through">{nameInfo.oldName}</span>
                          <span className="text-gray-500">→</span>
                         <User className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">{nameInfo.newName}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Change Description */}
                {entry.change_description && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800 mb-1">Change Description</div>
                    <div className="text-blue-700 text-sm">{entry.change_description}</div>
                  </div>
                )}

                {/* Edit Information */}
                {entry.last_edited_by && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-2">Last Modified</div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">{entry.last_edited_by}</span>
                      </div>
                      {entry.last_edited_at && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 text-sm">{formatTimestamp(entry.last_edited_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add extra padding at bottom to ensure all content is accessible */}
              <div className="h-8" />
            </div>
            
            {/* Fixed footer */}
            <div className="flex-shrink-0 pt-0" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px' // Less padding in landscape
            }}>
              <div className="mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}
    </>
  );
};