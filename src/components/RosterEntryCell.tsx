import React, { useState, useRef, useEffect } from 'react';
import { RosterEntry } from '../types/roster';
import { ScrollingText } from './ScrollingText';
import { useLongPress } from '../hooks/useLongPress';
import { useRosterData } from '../hooks/useRosterData';

interface RosterEntryCellProps {
  entry: RosterEntry;
  onShowDetails: (entry: RosterEntry) => void;
}

export const RosterEntryCell: React.FC<RosterEntryCellProps> = ({ entry, onShowDetails }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const { updateRosterEntry, staffList } = useRosterData();

  const longPressProps = useLongPress(() => {
    setShowAuthModal(true);
    setAuthCode('');
    setAuthError('');
  }, 500);

  const handleAuthSubmit = async () => {
    if (!authCode.trim()) {
      setAuthError('Please enter your authentication code');
      return;
    }

    try {
      // Find matching staff member
      const matchingStaff = staffList.find(staff => 
        staff.code.toUpperCase() === authCode.toUpperCase()
      );

      if (!matchingStaff) {
        setAuthError('Invalid authentication code');
        return;
      }

      // Update the roster entry
      const updatedEntry = {
        ...entry,
        assigned_name: matchingStaff.name,
        editor_name: matchingStaff.name
      };

      await updateRosterEntry(updatedEntry);

      // Close modal and trigger bounce animation
      setShowAuthModal(false);
      setIsAnimating(true);

      // Focus and scroll to the edited cell after bounce animation
      setTimeout(() => {
        if (cellRef.current) {
          // Scroll to center the cell
          cellRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });

          // Add focus glow effect
          cellRef.current.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.8)';
          cellRef.current.style.transition = 'box-shadow 0.8s ease-in-out';

          // Remove glow after animation
          setTimeout(() => {
            if (cellRef.current) {
              cellRef.current.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0)';
              setTimeout(() => {
                if (cellRef.current) {
                  cellRef.current.style.boxShadow = '';
                  cellRef.current.style.transition = '';
                }
              }, 800);
            }
          }, 800);
        }
      }, 400); // After bounce animation completes

      // Reset animation state
      setTimeout(() => setIsAnimating(false), 400);

    } catch (error) {
      console.error('Error updating roster entry:', error);
      setAuthError('Failed to update entry. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAuthSubmit();
    }
  };

  return (
    <>
      <div
        ref={cellRef}
        className={`
          p-2 text-center cursor-pointer hover:bg-gray-50 transition-all duration-200
          ${isAnimating ? 'animate-bounce bg-red-100' : ''}
        `}
        onClick={() => onShowDetails(entry)}
        {...longPressProps}
      >
        <ScrollingText text={entry.assigned_name} />
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Assignment</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Authentication Code
              </label>
              <input
                type="password"
                value={authCode}
                onChange={(e) => {
                  setAuthCode(e.target.value);
                  setAuthError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter your code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {authError && (
                <p className="text-red-500 text-sm mt-1">{authError}</p>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter your authentication code to edit this assignment.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAuthModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};