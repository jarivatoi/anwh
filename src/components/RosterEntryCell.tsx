import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RosterEntry } from '../types/roster';
import { ScrollingText } from './ScrollingText';
import { StaffSelectionModal } from './StaffSelectionModal';
import { EditDetailsModal } from './EditDetailsModal';
import { availableNames, validateAuthCode, isAdminCode } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { parseNameChange } from '../utils/rosterHelpers';
import { useLongPress } from '../hooks/useLongPress';

interface RosterEntryCellProps {
  entry: RosterEntry;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
}

export const RosterEntryCell: React.FC<RosterEntryCellProps> = ({
  entry,
  onUpdate,
  allEntriesForShift = []
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    if (showAuthModal || showStaffModal || showDetailsModal) {
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
  }, [showAuthModal, showStaffModal, showDetailsModal]);

  // Check if entry has been edited
  const hasBeenEdited = (entry: RosterEntry) => {
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Check if name was reverted to original
  const isBackToOriginal = (entry: RosterEntry) => {
    if (!entry.change_description) return false;
    
    // Check if there's an original PDF assignment stored
    const originalPdfMatch = entry.change_description.match(/\(Original PDF: ([^)]+)\)/);
    if (originalPdfMatch) {
      let originalAssignment = originalPdfMatch[1].trim();
      
      // Fix missing closing parenthesis if it exists
      if (originalAssignment.includes('(R') && !originalAssignment.includes('(R)')) {
        originalAssignment = originalAssignment.replace('(R', '(R)');
      }
      
      // Check if current assignment matches original PDF assignment
      return entry.assigned_name === originalAssignment;
    }
    
    return false;
  };

  // Get styling based on edit status
  const getNameStyling = () => {
    // Check if this entry has been manually edited
    if (!hasBeenEdited(entry)) {
      // Not edited (PDF import, admin addition, or original entry) - black text
      return { className: 'text-black', showAsterisk: false };
    }
    
    if (isBackToOriginal(entry)) {
      // Manually edited but back to original - green text
      return { className: 'text-green-600 animate-pulse-subtle', showAsterisk: false };
    }
    
    // Manually edited and different from original - red pulsating text
    return { className: 'text-red-600 animate-pulse-subtle', showAsterisk: false };
  };

  const handleLongPress = () => {
    console.log('🔥 Long press detected on roster entry');
    setShowAuthModal(true);
  };

  const handleDoublePress = () => {
    console.log('👆👆 Double press detected on roster entry');
    if (hasBeenEdited(entry)) {
      setShowDetailsModal(true);
    }
  };

  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName || !isAdminCode(authCode)) {
      setAuthError(!editorName ? 'Invalid authentication code' : 'Admin access required for roster editing');
      return;
    }
    
    setShowAuthModal(false);
    setAuthError('');
    setShowStaffModal(true);
  };

  const handleStaffSelect = async (newStaffName: string) => {
    if (newStaffName === entry.assigned_name) {
      setShowStaffModal(false);
      setAuthCode('');
      return;
    }

    setIsUpdating(true);
    
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      const updatedEntry = await updateRosterEntry(entry.id, {
        date: entry.date,
        shiftType: entry.shift_type,
        assignedName: newStaffName,
        changeDescription: `Name changed from "${entry.assigned_name}" to "${newStaffName}"`
      }, editorName);

      if (onUpdate) {
        onUpdate(updatedEntry);
      }

      setShowStaffModal(false);
      setAuthCode('');
    } catch (error) {
      console.error('Failed to update entry:', error);
      alert('Failed to update roster entry. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
  };

  const handleCancelStaff = () => {
    setShowStaffModal(false);
    setAuthCode('');
  };

  const styling = getNameStyling();

  return (
    <>
      <td 
        style={{ 
          padding: '2px',
          textAlign: 'center',
          border: '1px solid #374151',
          backgroundColor: 'white',
          position: 'relative',
          minHeight: '40px',
          maxWidth: '120px',
          overflow: 'hidden'
        }}
      >
        <div
          {...useLongPress({
            onLongPress: handleLongPress,
            onDoublePress: handleDoublePress,
            delay: 5000
          })}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            padding: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isUpdating ? (
            <div className="text-gray-500 text-[10px] sm:text-[12px] animate-pulse">
              Updating...
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <ScrollingText 
                text={entry.assigned_name}
                className={`${styling.className} font-medium text-[10px] sm:text-[12px] leading-tight`}
              />
            </div>
          )}
        </div>
      </td>

      {/* Authentication Modal */}
      {showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
              handleCancelAuth();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
              maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              zIndex: 2147483647,
              touchAction: 'auto',
              overflow: 'hidden',
              margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
            }}>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Code
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
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
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelAuth}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4 || !isAdminCode(authCode)}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={availableNames}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onClose={handleCancelStaff}
      />

      {/* Edit Details Modal */}
      <EditDetailsModal
        isOpen={showDetailsModal}
        entry={entry}
        onClose={() => setShowDetailsModal(false)}
      />
    </>
  );
};