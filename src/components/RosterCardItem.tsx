import React, { useState } from 'react';
import { RosterEntry } from '../types/roster';
import { StaffSelectionModal } from './StaffSelectionModal';
import { validateAuthCode, availableNames } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

interface RosterCardItemProps {
  entry: RosterEntry;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  onShowDetails?: (entry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
}

export const RosterCardItem: React.FC<RosterCardItemProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift = []
}) => {
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
      
      // Check if current assignment matches original PDF assignment
      return entry.assigned_name === originalPdfAssignment;
    }
    
    return false;
  };

  // Get text color based on edit status
  const getTextColor = () => {
    if (hasBeenReverted(entry)) {
      return '#059669'; // Green for reverted entries
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
    delay: 800
  });

  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName) {
      setAuthError('Invalid authentication code');
      return;
    }
    
    setShowAuthModal(false);
    setShowStaffModal(true);
    setAuthError('');
  };

  const handleStaffSelect = async (newStaffName: string) => {
    if (newStaffName === entry.assigned_name) {
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
      alert('Failed to update entry. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
  };

  const handleCancelStaffSelection = () => {
    setShowStaffModal(false);
    setAuthCode('');
  };

  return (
    <>
      <div
        {...longPressHandlers}
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
          border: 'none',
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
          zIndex: 60
        }}
      >
        <ScrollingText 
          text={entry.assigned_name}
          className="text-center w-full"
          style={{
            color: getTextColor(),
            fontWeight: '500',
            fontSize: 'inherit',
            textAlign: 'center',
            width: '100%',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
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
                  placeholder="Enter your code"
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
                  disabled={authCode.length < 4}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={availableNames}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onClose={handleCancelStaffSelection}
      />
    </>
  );
};