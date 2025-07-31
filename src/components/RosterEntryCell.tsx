import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Edit, X } from 'lucide-react';
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
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Long press handlers for name editing
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      setShowAuthModal(true);
    },
    onPress: () => {
      if (onShowDetails) {
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

      const changeDescription = `Name changed from "${entry.assigned_name}" to "${newStaffName}" by ${editorName}`;
      
      const updatedEntry = await updateRosterEntry(entry.id, {
        date: entry.date,
        shiftType: entry.shift_type,
        assignedName: newStaffName,
        changeDescription
      }, editorName);

      // Trigger bounce animation
      setIsAnimating(true);
      if (cellRef.current) {
        cellRef.current.style.transition = 'all 0.3s ease-out';
        cellRef.current.style.transform = 'scale(1.1)';
        cellRef.current.style.backgroundColor = '#fecaca';
        cellRef.current.style.borderRadius = '6px';
        cellRef.current.style.zIndex = '100';
        
        setTimeout(() => {
          if (cellRef.current) {
            cellRef.current.style.transform = 'scale(1)';
            cellRef.current.style.backgroundColor = '';
            cellRef.current.style.zIndex = '';
            
            // Auto-scroll to edited text after bounce animation
            setTimeout(() => {
              if (cellRef.current) {
                cellRef.current.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'center'
                });
                console.log('📍 Scrolled to edited cell in table');
              }
            }, 100);
          }
          setIsAnimating(false);
        }, 300);
      }

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

  const handleCancelStaff = () => {
    setShowStaffModal(false);
    setAuthCode('');
  };

  // Check if entry has been edited
  const hasBeenEdited = entry.change_description && 
                       entry.change_description.includes('Name changed from') &&
                       entry.last_edited_by;

  return (
    <>
      <div 
        ref={cellRef}
        {...longPressHandlers}
        className={`cursor-pointer transition-all duration-200 relative ${
          isAnimating ? 'z-50' : ''
        }`}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          padding: '2px 4px',
          borderRadius: '4px',
          minHeight: window.innerWidth > window.innerHeight ? '16px' : '24px'
        }}
      >
        <div className="w-full overflow-hidden">
          <ScrollingText className="w-full">
            <div className="flex items-center justify-center space-x-1 whitespace-nowrap">
              {hasBeenEdited && (
                <Edit className="w-2 h-2 sm:w-3 sm:h-3 text-blue-600 flex-shrink-0" />
              )}
              <span className={`font-medium text-center ${
                hasBeenEdited ? 'text-blue-700' : 'text-gray-900'
              }`} style={{
                fontSize: window.innerWidth > window.innerHeight ? '8px' : '10px',
                lineHeight: '1.2'
              }}>
                {entry.assigned_name}
              </span>
            </div>
          </ScrollingText>
        </div>
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
              handleCancelAuth();
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
                Edit Assignment
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Authentication Code
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
    </>
  );
};