import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, User, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { validateAuthCode } from '../utils/rosterAuth';
import { fetchRosterEntries } from '../utils/rosterApi';
import { syncRosterToCalendar } from '../utils/rosterCalendarSync';
import { RosterEntry } from '../types/roster';
import { DaySchedule, SpecialDates } from '../types';

interface BulkRosterImportProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleTitle: string;
  schedule: DaySchedule;
  specialDates: SpecialDates;
  setSchedule: (schedule: DaySchedule | ((prev: DaySchedule) => DaySchedule)) => void;
  setSpecialDates: (specialDates: SpecialDates | ((prev: SpecialDates) => SpecialDates)) => void;
  currentDate: Date;
}

interface ImportResult {
  added: number;
  skipped: number;
  errors: number;
  details: string[];
}

export const BulkRosterImport: React.FC<BulkRosterImportProps> = ({
  isOpen,
  onClose,
  scheduleTitle,
  schedule,
  specialDates,
  setSchedule,
  setSpecialDates,
  currentDate
}) => {
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

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

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isImporting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isImporting]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthCode('');
      setAuthError('');
      setImportResult(null);
      setSelectedMonth(currentDate.getMonth());
      setSelectedYear(currentDate.getFullYear());
    }
  }, [isOpen, currentDate]);

  const handleClose = () => {
    if (isImporting) return;
    onClose();
  };

  const handleImport = async () => {
    if (!authCode || authCode.length < 4) {
      setAuthError('Please enter your authentication code');
      return;
    }

    const userName = validateAuthCode(authCode);
    if (!userName) {
      setAuthError('Invalid authentication code');
      return;
    }

    setIsImporting(true);
    setAuthError('');

    try {
      console.log('🔄 Starting bulk roster import for:', userName);
      
      // Fetch all roster entries
      const allEntries = await fetchRosterEntries();
      
      // Filter entries for this user and selected month/year
      const userEntries = allEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();
        
        // Check if entry belongs to this user (match base names)
        const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
        const userBaseName = userName.replace(/\(R\)$/, '').trim().toUpperCase();
        
        return entryBaseName === userBaseName && 
               entryMonth === selectedMonth && 
               entryYear === selectedYear;
      });

      console.log(`📊 Found ${userEntries.length} roster entries for ${userName} in ${selectedMonth + 1}/${selectedYear}`);

      const result: ImportResult = {
        added: 0,
        skipped: 0,
        errors: 0,
        details: []
      };

      // Process each entry
      for (const entry of userEntries) {
        try {
          const syncResult = syncRosterToCalendar({
            date: entry.date,
            shiftType: entry.shift_type,
            assignedName: entry.assigned_name,
            editorName: userName,
            action: 'added'
          }, {
            calendarLabel: scheduleTitle,
            schedule,
            specialDates,
            setSchedule,
            setSpecialDates
          });

          if (syncResult) {
            result.added++;
            result.details.push(`✅ Added ${entry.shift_type} on ${entry.date}`);
          } else {
            result.skipped++;
            result.details.push(`⏭️ Skipped ${entry.shift_type} on ${entry.date} (conflict or already exists)`);
          }
        } catch (error) {
          result.errors++;
          result.details.push(`❌ Error adding ${entry.shift_type} on ${entry.date}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setImportResult(result);
      console.log('✅ Bulk import completed:', result);

    } catch (error) {
      console.error('❌ Bulk import failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const formatMonthYear = (month: number, year: number) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month]} ${year}`;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isImporting) {
          handleClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
        paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px'
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full select-none"
        style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none',
          marginTop: window.innerWidth > window.innerHeight ? '2px' : '2rem',
          marginBottom: window.innerWidth > window.innerHeight ? '2px' : '2rem',
          maxWidth: window.innerWidth > window.innerHeight ? '95vw' : '28rem',
          maxHeight: window.innerWidth > window.innerHeight ? '98vh' : '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative pb-4 border-b border-gray-200 flex-shrink-0" style={{
          padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
        }}>
          {!isImporting && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Download className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Import My Roster
          </h3>
          
          <p className="text-sm text-gray-600 text-center">
            Import all your roster shifts into your personal calendar
          </p>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}
        >
          {!importResult ? (
            <div className="space-y-6">
              {/* Month/Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Month to Import
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    disabled={isImporting}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    disabled={isImporting}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  >
                    {Array.from({ length: 10 }, (_, i) => selectedYear - 5 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Importing for: {formatMonthYear(selectedMonth, selectedYear)}
                </p>
              </div>

              {/* Authentication */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Authentication Code
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  disabled={isImporting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-mono text-lg disabled:bg-gray-100"
                  placeholder="Enter your code"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{authError}</span>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-blue-800 mb-1">
                      How it works:
                    </h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Finds all your roster assignments for the selected month</li>
                      <li>• Adds them to your personal calendar</li>
                      <li>• Skips dates that already have shifts (no conflicts)</li>
                      <li>• Automatically marks special dates when needed</li>
                      <li>• Shows detailed results of what was imported</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  Import Completed!
                </h4>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">{importResult.added}</div>
                  <div className="text-sm text-green-700">Added</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                  <div className="text-sm text-yellow-700">Skipped</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>

              {/* Details */}
              {importResult.details.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <h5 className="font-medium text-gray-800 mb-2">Import Details:</h5>
                  <div className="space-y-1">
                    {importResult.details.map((detail, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success message */}
              {importResult.added > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Successfully imported {importResult.added} shift{importResult.added !== 1 ? 's' : ''} to your calendar!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add extra padding at bottom */}
          <div className="h-8" />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-0" style={{
          padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
        }}>
          {!importResult ? (
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                disabled={isImporting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || authCode.length < 4}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Import Roster</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};