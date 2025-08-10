import React, { useState } from 'react';
import { Edit, Info, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import { RosterEntry } from '../types/roster';
import { ScrollingText } from './ScrollingText';
import { validateAuthCode, availableNames, isAdminCode } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';

interface RosterCardItemProps {
  entry: RosterEntry;
  onUpdate: (updatedEntry: RosterEntry) => void;
  onShowDetails: (entry: RosterEntry) => void;
  allEntriesForShift: RosterEntry[];
  isSpecialDate: boolean;
  specialDateInfo: string | null;
}

export const RosterCardItem: React.FC<RosterCardItemProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift,
  isSpecialDate,
  specialDateInfo
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedName, setSelectedName] = useState(entry.assigned_name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if entry has been edited
  const hasBeenEdited = (entry: RosterEntry) => {
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Check if entry has been reverted to original
  const hasBeenReverted = (entry: RosterEntry) => {
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
  };

  // Get text color based on entry status
  const getTextColor = (entry: RosterEntry) => {
    if (entry.text_color) {
      return entry.text_color;
    }
    
    if (hasBeenReverted(entry)) {
      return '#059669'; // Green for reverted entries
    } else if (hasBeenEdited(entry)) {
      return '#dc2626'; // Red for edited entries
    } else {
      return '#000000'; // Black for original entries
    }
  };

  // Handle edit click
  const handleEditClick = () => {
    setShowAuthModal(true);
  };

  // Handle authentication
  const handleAuthSubmit = async () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName) {
      setAuthError('Invalid authentication code');
      return;
    }
    
    setShowAuthModal(false);
    setIsEditing(true);
    setAuthError('');
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!selectedName || selectedName === entry.assigned_name) {
      setIsEditing(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      const updatedEntry = await updateRosterEntry(entry.id, {
        assigned_name: selectedName,
        change_description: `Name changed from "${entry.assigned_name}" to "${selectedName}" by ${editorName}`,
        last_edited_by: editorName,
        last_edited_at: new Date().toISOString()
      });
      
      onUpdate(updatedEntry);
      setIsEditing(false);
      setAuthCode('');
      
    } catch (error) {
      console.error('Failed to update entry:', error);
      alert('Failed to update entry. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedName(entry.assigned_name);
    setAuthCode('');
    setAuthError('');
  };

  return (
    <>
      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group">
        <div className="flex-1 min-w-0">
          <ScrollingText 
            text={entry.assigned_name}
            className="text-sm font-medium"
            style={{ color: getTextColor(entry) }}
          />
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasBeenEdited(entry) && (
            <div className="w-2 h-2 bg-red-500 rounded-full" title="Modified" />
          )}
          {hasBeenReverted(entry) && (
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Reverted to original" />
          )}
          {isSpecialDate && (
            <Info className="w-3 h-3 text-purple-500" title={specialDateInfo || 'Special date'} />
          )}
          
          <button
            onClick={handleEditClick}
            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Edit entry"
          >
            <Edit className="w-3 h-3" />
          </button>
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
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Code
                </label>
                <div className="flex justify-center space-x-3 mb-3">
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
                          
                          if (newValue && index < 3) {
                            const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                            if (nextInput) nextInput.focus();
                          }
                        }
                      }}
                      data-index={index}
                      className="w-12 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
                      maxLength={1}
                      autoComplete="off"
                      autoFocus={index === 0}
                    />
                  ))}
                  <button
                    type="button"
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg ml-2"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">{authError}</p>
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
        </div>,
        document.body
      )}

      {/* Name Selection Modal */}
      {isEditing && createPortal(
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
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-96 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 text-center">
                Select Staff Member
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {availableNames.map(name => (
                  <label key={name} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="staffName"
                      value={name}
                      checked={selectedName === name}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isUpdating || !selectedName}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};