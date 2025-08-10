import React, { useState } from 'react';
import { Edit, AlertTriangle, Star } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { ScrollingText } from './ScrollingText';
import { validateAuthCode, isAdminCode } from '../utils/rosterAuth';
import { updateRosterEntry } from '../utils/rosterApi';

interface RosterEntryCellProps {
  entry: RosterEntry;
  onUpdate: (updatedEntry: RosterEntry) => void;
  onShowDetails: (entry: RosterEntry) => void;
  allEntriesForShift: RosterEntry[];
  isSpecialDate: boolean;
  specialDateInfo: string | null;
}

export const RosterEntryCell: React.FC<RosterEntryCellProps> = ({
  entry,
  onUpdate,
  onShowDetails,
  allEntriesForShift,
  isSpecialDate,
  specialDateInfo
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.assigned_name);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get text color based on entry status
  const getTextColor = () => {
    // HIGHEST PRIORITY: Admin-set text color
    if (entry.text_color) {
      return entry.text_color;
    }
    
    // Check if entry has been reverted to original
    const hasBeenReverted = () => {
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
    
    // Check if entry has been edited (name changed)
    const hasBeenEdited = entry.change_description && 
                         entry.change_description.includes('Name changed from') &&
                         entry.last_edited_by;

    if (hasBeenReverted()) {
      return '#059669'; // Green for reverted entries (back to original PDF by ADMIN)
    } else if (hasBeenEdited) {
      return '#dc2626'; // Red for edited entries (by non-ADMIN users)
    } else {
      return '#000000'; // Black for original entries
    }
  };

  const handleCellClick = () => {
    onShowDetails(entry);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(entry.assigned_name);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!authCode) {
      setShowAuthModal(true);
      return;
    }

    const editorName = validateAuthCode(authCode);
    if (!editorName) {
      setAuthError('Invalid authentication code');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedEntry = await updateRosterEntry(entry.id, {
        assigned_name: editValue.trim(),
        change_description: `Name changed from "${entry.assigned_name}" to "${editValue.trim()}" by ${editorName}`,
        last_edited_by: editorName,
        last_edited_at: new Date().toISOString()
      });

      onUpdate(updatedEntry);
      setIsEditing(false);
      setAuthCode('');
      setAuthError('');
    } catch (error) {
      console.error('Failed to update entry:', error);
      setAuthError('Failed to update entry');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(entry.assigned_name);
    setAuthCode('');
    setAuthError('');
    setShowAuthModal(false);
  };

  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName) {
      setAuthError('Invalid authentication code');
      return;
    }
    setShowAuthModal(false);
    handleSave();
  };

  if (isEditing) {
    return (
      <div className="p-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        />
        <div className="flex justify-between mt-1">
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
        </div>
        
        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-80">
              <h3 className="text-lg font-semibold mb-4">Authentication Required</h3>
              <input
                type="password"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Enter auth code"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
              {authError && (
                <p className="text-red-600 text-sm mt-2">{authError}</p>
              )}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthSubmit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer p-1 hover:bg-gray-50 rounded transition-colors duration-200"
      onClick={handleCellClick}
    >
      <div className="flex items-center justify-between">
        <ScrollingText
          text={entry.assigned_name}
          className="text-xs font-medium flex-1"
          style={{ color: getTextColor() }}
        />
        
        {/* Edit button - only show on hover */}
        <button
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity duration-200"
          title="Edit entry"
        >
          <Edit className="w-3 h-3 text-gray-500" />
        </button>
      </div>
      
      {/* Status indicators */}
      <div className="flex items-center space-x-1 mt-1">
        {entry.change_description && entry.change_description.includes('Name changed from') && (
          <AlertTriangle className="w-3 h-3 text-amber-500" title="Entry has been modified" />
        )}
        
        {isSpecialDate && (
          <Star className="w-3 h-3 text-red-500" title={`Special date: ${specialDateInfo}`} />
        )}
      </div>
    </div>
  );
};