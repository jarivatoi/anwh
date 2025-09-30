import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { StaffSelectionModal } from './StaffSelectionModal';
import { validateAuthCode, availableNames, authCodes } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

// Get all staff names including (R) variants
const getAllStaffNames = (): string[] => {
  return authCodes
    .filter(auth => auth.name !== 'ADMIN') // Exclude ADMIN
    .map(auth => auth.name)
    .sort();
};

interface RosterCardItemProps {
  entry: RosterEntry;
  onUpdate?: (updatedEntry: RosterEntry) => void;
  onShowDetails?: (entry: RosterEntry) => void;
  allEntriesForShift?: RosterEntry[];
  isSpecialDate?: boolean;
  specialDateInfo?: string;
}

export const RosterCardItem: React.FC<RosterCardItemProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift = [],
  isSpecialDate = false,
  specialDateInfo
}) => {
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Prevent body scroll when auth modal is open
  React.useEffect(() => {
    if (showAuthModal) {
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
  }, [showAuthModal]);

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
      
      // Check if current assignment matches original PDF assignment (reverted to original)
      return entry.assigned_name === originalPdfAssignment;
    }
    
    return false;
  };

  // Get text color based on edit status
  const getTextColor = () => {
    // HIGHEST PRIORITY: Admin-set text color
    if (entry.text_color) {
      return entry.text_color;
    }
    
    if (hasBeenReverted(entry)) {
      return '#059669'; // Green for reverted entries (back to original PDF)
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
      if (hasBeenEdited(entry) && onShowDetails && entry.last_edited_by !== 'ADMIN') {
        console.log('👆👆 Double press detected on edited entry:', entry.id);
        onShowDetails(entry);
      }
    },
    delay: 5000
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
    await handleStaffSelectWithColor(newStaffName);
  };

  const handleStaffSelectWithColor = async (newStaffName: string, textColor?: string) => {
    if (newStaffName === entry.assigned_name) {
      setShowStaffModal(false);
      return;
    }

    setIsUpdating(true);
    setIsEditing(true);
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      const updatedEntry = await updateRosterEntry(entry.id, {
        date: entry.date,
        shiftType: entry.shift_type,
        assignedName: newStaffName,
        changeDescription: `Name changed from "${entry.assigned_name}" to "${newStaffName}"`,
        textColor: textColor
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
      // Keep editing animation for a bit longer to show the change
      setTimeout(() => setIsEditing(false), 1000);
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
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
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
          zIndex: 60,
          // Add pulsing animation only for special dates with actual info
         animation: isEditing ? 'goldenPulse 1.2s ease-in-out infinite' :
                   (isSpecialDate && specialDateInfo && specialDateInfo.trim()) ? 'pulse 2s ease-in-out infinite' : 'none',
         transform: isEditing ? 'scale(1.05)' : 'scale(1)',
         transition: 'all 0.4s ease-out',
         boxShadow: isEditing ? '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.2)' : 'none',
         backgroundColor: isEditing ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
         borderRadius: isEditing ? '6px' : '0',
         border: isEditing ? '2px solid #ffd700' : 'none'
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
            outline: 'none',
            filter: isEditing ? 'brightness(1.2) contrast(1.1)' : 'none',
            textShadow: isEditing ? '0 0 8px rgba(255, 215, 0, 0.6)' : 'none'
          }}
        />
        
        {/* Golden sparkle effects */}
        {isEditing && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '2px',
                left: '2px',
                width: '4px',
                height: '4px',
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                animation: 'sparkle1 2s ease-in-out infinite',
                zIndex: 65
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '8px',
                width: '3px',
                height: '3px',
                backgroundColor: '#ffed4e',
                borderRadius: '50%',
                animation: 'sparkle2 2.5s ease-in-out infinite',
                zIndex: 65
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '1px',
                width: '2px',
                height: '2px',
                backgroundColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'sparkle3 1.8s ease-in-out infinite',
                zIndex: 65
              }}
            />
          </>
        )}
      </div>
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes goldenPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.6);
          }
        }
        
        @keyframes goldenDot {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.3);
            box-shadow: 0 0 15px rgba(255, 215, 0, 1);
          }
        }
        
        @keyframes sparkle1 {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: scale(1) rotate(90deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2) rotate(180deg);
          }
          75% {
            opacity: 0.6;
            transform: scale(0.8) rotate(270deg);
          }
        }
        
        @keyframes sparkle2 {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.5);
          }
          60% {
            opacity: 0.7;
            transform: scale(1);
          }
        }
        
        @keyframes sparkle3 {
          0%, 100% {
            opacity: 0;
            transform: scale(0) translateY(0);
          }
          40% {
            opacity: 1;
            transform: scale(1.8) translateY(-2px);
          }
          80% {
            opacity: 0.5;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      {/* Authentication Modal */}
      {showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            pointerEvents: 'auto'
          }}
          onWheel={(e) => e.preventDefault()}
          onScroll={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              handleCancelAuth();
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Code
                </label>
                <div className="flex flex-col items-center">
                  <div className="flex space-x-3 mb-3">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type={showPassword ? "text" : "password"}
                        value={authCode[index] || ''}
                        onChange={(e) => {
                          const newValue = e.target.value.toUpperCase();
                          if (newValue.length <= 1) {
                            const newCode = authCode.split('');
                            newCode[index] = newValue;
                            setAuthCode(newCode.join(''));
                            
                            // Auto-focus next input
                            if (newValue && index < 3) {
                              const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                              if (nextInput) nextInput.focus();
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace to go to previous input
                          if (e.key === 'Backspace' && !authCode[index] && index > 0) {
                            const prevInput = document.querySelector(`input[data-index="${index - 1}"]`) as HTMLInputElement;
                            if (prevInput) prevInput.focus();
                          }
                        }}
                        data-index={index}
                        className="w-12 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
                        maxLength={1}
                        autoComplete="off"
                        autoFocus={index === 0}
                        // Disable browser's built-in password reveal and autocomplete
                        spellCheck="false"
                        autoCorrect="off"
                        autoCapitalize="off"
                        // Additional attributes to prevent browser-specific controls
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    ))}
                  </div>
                  {authCode.length === 4 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onTouchStart={() => setShowPassword(true)}
                        onTouchEnd={() => setShowPassword(false)}
                        onMouseDown={() => setShowPassword(true)}
                        onMouseUp={() => setShowPassword(false)}
                        onMouseLeave={() => setShowPassword(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg"
                        style={{
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
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
        </div>,
        document.body
      )}

      {/* Staff Selection Modal */}
      <StaffSelectionModal
        isOpen={showStaffModal}
        entry={entry}
        availableStaff={getAllStaffNames()}
        allEntriesForShift={allEntriesForShift}
        onSelectStaff={handleStaffSelect}
        onSelectStaffWithColor={handleStaffSelectWithColor}
        onClose={handleCancelStaffSelection}
        authCode={authCode}
      />
    </>
  );
};