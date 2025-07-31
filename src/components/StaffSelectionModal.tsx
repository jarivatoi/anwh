import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Calendar, Clock, Check } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { availableNames } from '../utils/rosterAuth';

interface StaffSelectionModalProps {
  isOpen: boolean;
  entry: RosterEntry | null;
  availableStaff: string[];
  allEntriesForShift?: RosterEntry[];
  onSelectStaff: (staffName: string) => void;
  onClose: () => void;
}

export const StaffSelectionModal: React.FC<StaffSelectionModalProps> = ({
  isOpen,
  entry,
  availableStaff,
  allEntriesForShift = [],
  onSelectStaff,
  onClose
}) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen && entry) {
      setSelectedStaff(entry.assigned_name);
    }
  }, [isOpen, entry]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !entry) return null;

  // Filter out staff who are already working this shift
  const getFilteredStaff = () => {
    if (!allEntriesForShift || allEntriesForShift.length === 0) {
      return availableStaff.filter(name => name !== 'ADMIN');
    }

    // Get all currently assigned staff for this shift
    const currentlyAssigned = allEntriesForShift.map(e => e.assigned_name);
    
    // Filter out staff who are already working, including matching base names
    return availableStaff.filter(staffName => {
      // Exclude ADMIN from selection
      if (staffName === 'ADMIN') {
        return false;
      }
      
      // Don't filter out the current assignment (allow changing to same person)
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

  const filteredStaff = getFilteredStaff();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${month} ${day}, ${year}`;
  };

  const handleStaffSelect = (staffName: string) => {
    setSelectedStaff(staffName);
  };

  const handleConfirm = () => {
    if (selectedStaff && selectedStaff !== entry.assigned_name) {
      onSelectStaff(selectedStaff);
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[99999]"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
        paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px',
        overflow: 'auto',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: window.innerWidth > window.innerHeight ? '98vw' : '28rem',
          maxHeight: window.innerWidth > window.innerHeight ? '98vh' : '90vh',
          margin: window.innerWidth > window.innerHeight ? '2px 0' : '16px 0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="relative border-b border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
            Select Staff Member
          </h3>
        </div>

        {/* Entry Details */}
        <div 
          className="border-b border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="space-y-3">
            {/* Date */}
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{formatDate(entry.date)}</span>
            </div>
            
            {/* Shift Type */}
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{entry.shift_type}</span>
            </div>
            
            {/* Current Assignment */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Current Assignment</div>
                <div className="text-sm font-semibold text-gray-900">{entry.assigned_name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff List */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3 text-center">
              Available Staff ({filteredStaff.length})
            </div>
            
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No available staff</div>
                <div className="text-xs text-gray-400">
                  All staff are already assigned to this shift
                </div>
              </div>
            ) : (
              filteredStaff.map((staffName) => (
              <button
                key={staffName}
                onClick={() => handleStaffSelect(staffName)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedStaff === staffName
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className={`w-5 h-5 ${
                      selectedStaff === staffName ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <div className="font-medium text-base">{staffName}</div>
                      {staffName === entry.assigned_name && (
                        <div className="text-xs text-gray-500">Current assignment</div>
                      )}
                    </div>
                  </div>
                  
                  {selectedStaff === staffName && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
              ))
            )}
          </div>

          {/* Add extra padding at bottom */}
          <div className="h-8" />
        </div>

        {/* Footer */}
        <div 
          className="border-t border-gray-200 flex-shrink-0"
          style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px'
          }}
        >
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedStaff || selectedStaff === entry.assigned_name || filteredStaff.length === 0}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Change</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};