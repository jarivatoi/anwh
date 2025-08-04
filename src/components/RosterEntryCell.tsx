import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, AlertTriangle } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { StaffSelectionModal } from './StaffSelectionModal';
import { availableNames, validateAuthCode } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

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
  allEntriesForShift = []
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showAuthModal || showStaffModal) {
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
  }, [showAuthModal, showStaffModal]);

  // Double tap detection for showing details
  const handleDoubleClick = () => {
    if (hasBeenEdited(entry) && onShowDetails) {
      console.log('🔍 RosterEntryCell: Double click detected, showing details for entry:', entry.id);
      onShowDetails(entry);
    }
  };

  // Long press for editing
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      console.log('🔥 Long press detected on entry:', entry.assigned_name);
      setShowAuthModal(true);
    },
    onDoublePress: handleDoubleClick,
    delay: 5000 // 5 seconds for long press
  });

  // Handle authentication
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

  // Handle staff selection
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

  // Check if entry has been edited
  const hasBeenEdited = (entry: RosterEntry) => {
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Get name styling based on edit status
  const getNameStyling = () => {
    // Check if this entry has been manually edited (name changed)
    const isManuallyEdited = hasBeenEdited(entry);
    
    if (!isManuallyEdited) {
      // Not edited: black text
      return {
        color: '#1f2937',
        fontWeight: '500',
        animation: 'none',
        showAsterisk: false
      };
    }
    
    // Parse the change description to get original and current names
    const changeDesc = entry.change_description || '';
    
    // Check for original PDF assignment
    const originalPdfMatch = changeDesc.match(/\(Original PDF: ([^)]+)\)/);
    let originalName = null;
    
    if (originalPdfMatch) {
      originalName = originalPdfMatch[1].trim();
      // Fix missing closing parenthesis if it exists
      if (originalName.includes('(R') && !originalName.includes('(R)')) {
        originalName = originalName.replace('(R', '(R)');
      }
    } else {
      // Fallback: look for "Name changed from" pattern
      const nameChangeMatch = changeDesc.match(/Name changed from "([^"]+)"/);
      if (nameChangeMatch) {
        originalName = nameChangeMatch[1].trim();
        // Fix missing closing parenthesis if it exists
        if (originalName.includes('(R') && !originalName.includes('(R)')) {
          originalName = originalName.replace('(R', '(R)');
        }
      }
    }
    
    // Compare current assignment with original
    if (originalName && entry.assigned_name === originalName) {
      // Returned to original assignment: black text with asterisk
      return {
        color: '#1f2937',
        fontWeight: '500',
        animation: 'none',
        showAsterisk: true
      };
    } else {
      // Changed to different person: red pulsating text
      return {
        color: '#dc2626',
        fontWeight: '600',
        animation: 'pulse 2s ease-in-out infinite',
        showAsterisk: false
      };
    }
  };

  const nameStyle = getNameStyling();

  return (
    <>
      <div
        {...longPressHandlers}
        className="w-full text-center cursor-pointer select-none"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          padding: 0,
          margin: 0,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        {isUpdating ? (
          <div className="text-xs text-gray-500 animate-pulse">
            Updating...
          </div>
        ) : (
          <div
            className="text-xs font-medium select-none"
            style={{
              color: nameStyle.color,
              fontWeight: nameStyle.fontWeight,
              animation: nameStyle.animation,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              textAlign: 'center'
            }}
          >
            <ScrollingText 
              text={`${entry.assigned_name}${nameStyle.showAsterisk ? ' *' : ''}`}
              className="select-none"
              excludeFromCalculation="*"
            />
          </div>
        )}
      </div>

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
              setShowAuthModal(false);
              setAuthCode('');
              setAuthError('');
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
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{authError}</span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthCode('');
                    setAuthError('');
                  }}
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
        , document.body
      )}

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={availableNames}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onClose={() => {
          setShowStaffModal(false);
          setAuthCode('');
        }}
      />
    </>
  );
};