import React from 'react';
import { createPortal } from 'react-dom';
import { RosterEntry } from '../types/roster';
import { useLongPress } from '../hooks/useLongPress';
import { useState, useEffect, useRef } from 'react';
import { X, Edit, Calendar, User, Clock } from 'lucide-react';
import { availableNames, validateAuthCode } from '../utils/rosterAuth';
import { ScrollingText } from './ScrollingText';
import { isPastDate } from '../utils/rosterHelpers';
import { updateRosterEntry } from '../utils/rosterApi';
import { StaffSelectionModal } from './StaffSelectionModal';
import { gsap } from 'gsap';

interface RosterCardItemProps {
  entry: RosterEntry;
  onShowDetails: (entry: RosterEntry) => void;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
}

export const RosterCardItem: React.FC<RosterCardItemProps> = ({
  entry,
  onShowDetails,
  onUpdate,
  allEntriesForShift
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
    // If we have original_assigned_name, use that for comparison
    if (entry.original_assigned_name) {
      return entry.assigned_name !== entry.original_assigned_name;
    }
    
    // Fallback to old logic for entries without original_assigned_name
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Handle long press for entry details
  const handleLongPress = () => {
    // Long press shows authentication for editing
    setShowAuthModal(true);
  };

  const handleDoublePress = () => {
    // Double tap shows details for edited entries
    if (hasBeenEdited(entry)) {
      onShowDetails(entry);
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
      
      // Disable scrolling on roster card view specifically
      const rosterCardView = document.querySelector('[style*="height: 70vh"]');
      if (rosterCardView) {
        (rosterCardView as HTMLElement).style.overflow = 'hidden';
        (rosterCardView as HTMLElement).style.overflowY = 'hidden';
      }
      
      // Find and disable any scrollable divs in card view
      const scrollableDivs = document.querySelectorAll('div[style*="overflow: auto"]');
      scrollableDivs.forEach(div => {
        (div as HTMLElement).style.overflow = 'hidden';
      });
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
      
      // Re-enable roster card view scrolling
      const rosterCardView = document.querySelector('[style*="height: 70vh"]');
      if (rosterCardView) {
        (rosterCardView as HTMLElement).style.overflow = 'auto';
        (rosterCardView as HTMLElement).style.overflowY = 'auto';
      }
      
      // Re-enable scrollable divs
      const scrollableDivs = document.querySelectorAll('div[style*="overflow: hidden"]');
      scrollableDivs.forEach(div => {
        (div as HTMLElement).style.overflow = 'auto';
      });
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
      if (cardRef.current) {
        gsap.fromTo(cardRef.current,
          {
            scale: 1,
            backgroundColor: '#fef2f2', // Light red background
            force3D: true
          },
          {
            scale: 1.08,
            duration: 0.25,
            ease: "back.out(1.7)",
            yoyo: true,
            repeat: 1,
            force3D: true,
            onComplete: () => {
              // Fade background back to normal
              gsap.to(cardRef.current, {
                backgroundColor: 'transparent',
                duration: 0.6,
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

  return (
    <>
      <div 
        ref={cardRef}
        className={`text-center rounded p-1 sm:p-2 transition-colors w-full flex items-center justify-center min-h-[28px] ${
          'cursor-pointer'
        }`}
        {...(!isPastDate(entry.date) ? interactionHandlers : {})}
        style={{ 
          userSelect: 'none', 
         zIndex: 10, // Lower z-index so sticky headers appear above
          touchAction: 'manipulation'
        }}
      >
        <div className="font-medium text-gray-900 text-xs leading-tight w-full flex items-center justify-center">
          <div className="text-[8px] sm:text-[10px] font-medium text-gray-900 leading-tight w-full text-center">
            {isUpdating ? 'Updating...' : (
              <ScrollingText 
                text={entry.assigned_name}
                className={hasBeenEdited(entry) ? 'text-red-600 animate-pulse' : ''}
              />
            )}
          </div>
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
          onClick={(e) => {
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
              minHeight: window.innerWidth > window.innerHeight ? '200px' : '400px',
              backgroundColor: '#ffffff',
              opacity: 1,
              display: 'flex',
              flexDirection: 'column',
              margin: window.innerWidth > window.innerHeight ? '4px auto' : '16px auto',
              position: 'relative',
              zIndex: 2147483647,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
              border: '2px solid #ffffff',
              borderRadius: '16px',
              maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
              width: '100%',
              transform: 'translate3d(0,0,0)',
              backfaceVisibility: 'hidden',
              touchAction: 'auto'
            }}
            onClick={(e) => {
              // Prevent modal from closing when clicking inside
              e.stopPropagation();
            }}
          >
            {/* Header - Fixed */}
            <div className="p-6 border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
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
              <p className="text-sm text-indigo-600 text-center">
                Enter your authentication code to edit this entry
              </p>
            </div>
              
            {/* Scrollable Content */}
            <div 
              className="flex-1 p-6 overflow-y-auto"
              style={{
                // CRITICAL: Enable smooth touch scrolling
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Allow vertical panning (scrolling)
                overscrollBehavior: 'contain', // Prevent scroll chaining to parent
                maxHeight: 'calc(90vh - 200px)',
                minHeight: '100px'
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
                  autoFocus
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
            <div className="p-6 pt-0 flex-shrink-0 bg-gradient-to-r from-gray-50 to-indigo-50 border-t border-indigo-100">
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
    </>
  );
};