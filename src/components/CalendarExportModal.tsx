import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, User, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { validateAuthCode } from '../utils/rosterAuth';
import { fetchRosterEntries } from '../utils/rosterApi';
import { calendarExportManager, ExportResult } from '../utils/calendarExport';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: number;
  currentYear: number;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  currentYear
}) => {
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [step, setStep] = useState<'auth' | 'exporting' | 'result'>('auth');

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
      if (e.key === 'Escape' && isOpen && !isExporting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isExporting]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthCode('');
      setAuthError('');
      setIsExporting(false);
      setExportResult(null);
      setStep('auth');
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isExporting) return;
    onClose();
  };

  const handleExport = async () => {
    if (!authCode || authCode.length < 4) {
      setAuthError('Please enter your authentication code');
      return;
    }

    const staffName = validateAuthCode(authCode);
    if (!staffName) {
      setAuthError('Invalid authentication code');
      return;
    }

    setIsExporting(true);
    setStep('exporting');
    setAuthError('');

    try {
      console.log('📅 Starting calendar export process...');
      
      // Fetch all roster entries
      const allEntries = await fetchRosterEntries();
      console.log(`📊 Fetched ${allEntries.length} total roster entries`);
      
      // Export to calendar
      const result = await calendarExportManager.exportToCalendar({
        staffName,
        month: currentMonth,
        year: currentYear,
        entries: allEntries
      });
      
      setExportResult(result);
      setStep('result');
      
      if (result.success) {
        console.log('✅ Calendar export completed successfully');
      } else {
        console.error('❌ Calendar export failed:', result.errors);
      }
      
      // Sync roster data to calendar after successful export
      if (result.success) {
        console.log('🔄 CALENDAR EXPORT: Starting roster-to-calendar sync...');
        
        // Get the staff name from auth code
        const staffName = validateAuthCode(authCode);
        if (staffName) {
          console.log(`🔍 CALENDAR EXPORT: Syncing for staff: "${staffName}"`);
          console.log(`🔍 CALENDAR EXPORT: Total entries to check: ${allEntries.length}`);
          
          // Filter entries for this staff member and month
          const staffEntries = allEntries.filter(entry => {
            const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
            const staffBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
            
            console.log(`🔍 CALENDAR EXPORT: Comparing "${entry.assigned_name}" (base: "${entryBaseName}") with "${staffName}" (base: "${staffBaseName}")`);
            
            if (entryBaseName !== staffBaseName) return false;
            
            const entryDate = new Date(entry.date);
            const isInMonth = entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
            console.log(`🔍 CALENDAR EXPORT: Entry date ${entry.date} - month: ${entryDate.getMonth()}, year: ${entryDate.getFullYear()}, target month: ${currentMonth}, target year: ${currentYear}, isInMonth: ${isInMonth}`);
            return isInMonth;
          });
          
          console.log(`🔍 CALENDAR EXPORT: Found ${staffEntries.length} entries for ${staffName} in ${formatMonthYear()}`);
          
          if (staffEntries.length > 0) {
            console.log(`🔍 CALENDAR EXPORT: Staff entries to sync:`, staffEntries.map(e => `${e.date} - ${e.shift_type} - ${e.assigned_name}`));
            
            // Convert roster entries to calendar format and sync
            staffEntries.forEach(entry => {
              const dateKey = entry.date; // Already in YYYY-MM-DD format
              
              // Map roster shift types to calendar shift IDs
              const shiftMapping: Record<string, string> = {
                'Morning Shift (9-4)': '9-4',
                'Evening Shift (4-10)': '4-10', 
                'Saturday Regular (12-10)': '12-10',
                'Night Duty': 'N',
                'Sunday/Public Holiday/Special': '9-4'
              };
              
              const calendarShiftId = shiftMapping[entry.shift_type];
              if (!calendarShiftId) {
                console.log(`❌ CALENDAR EXPORT: Unknown shift type: ${entry.shift_type}`);
                return;
              }
              
              console.log(`🔄 CALENDAR EXPORT: Converting ${entry.shift_type} to calendar shift ${calendarShiftId} for ${dateKey}`);
              
              // Dispatch calendar sync event with the converted data
              const syncEvent = {
                date: dateKey,
                shiftType: entry.shift_type,
                assignedName: entry.assigned_name,
                editorName: staffName,
                action: 'added' as const,
                calendarShiftId: calendarShiftId // Add the calendar shift ID
              };
              
              console.log('📅 CALENDAR EXPORT: Dispatching sync event:', syncEvent);
              window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
                detail: syncEvent
              }));
            });
          } else {
            console.log(`❌ CALENDAR EXPORT: No entries found for ${staffName} in ${formatMonthYear()}`);
            console.log(`🔍 CALENDAR EXPORT: Available entries in database:`, allEntries.slice(0, 5).map(e => `${e.date} - ${e.shift_type} - ${e.assigned_name}`));
          }
          
          console.log(`✅ CALENDAR EXPORT: Dispatched ${staffEntries.length} sync events to calendar`);
          
          // Force a small delay to ensure all events are processed
          setTimeout(() => {
            console.log('🔄 CALENDAR EXPORT: Triggering calendar refresh...');
            // Dispatch additional refresh event
            window.dispatchEvent(new CustomEvent('forceCalendarRefresh'));
            
            // Also close the modal after sync
            console.log('🔄 CALENDAR EXPORT: Closing modal after sync...');
            onClose();
          }, 100);
        } else {
          console.log(`❌ CALENDAR EXPORT: Could not validate staff name from auth code: "${authCode}"`);
        }
      }
      
    } catch (error) {
      console.error('❌ Calendar export error:', error);
      setExportResult({
        success: false,
        filename: '',
        entriesExported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown export error']
      });
      setStep('result');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isExporting) {
      handleClose();
    }
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
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
          maxHeight: window.innerWidth > window.innerHeight ? '98vh' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative pb-4 border-b border-gray-200 flex-shrink-0" style={{
          padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
        }}>
          {!isExporting && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200 select-none"
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
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
            Export to Calendar
          </h3>
          
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{formatMonthYear()}</span>
          </div>
        </div>

        {/* Content */}
        <div 
          className="overflow-y-auto flex-1"
          style={{
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
            maxHeight: window.innerWidth > window.innerHeight ? 'calc(98vh - 100px)' : '70vh',
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}
        >
          {step === 'auth' && (
            <div className="space-y-6">
              {/* Info Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Calendar Export</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Downloads your shifts as an .ics calendar file</li>
                      <li>• Import into Google Calendar, Outlook, Apple Calendar</li>
                      <li>• Only exports YOUR shifts for {formatMonthYear()}</li>
                      <li>• Includes shift times and locations</li>
                    </ul>
                  </div>
                </div>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-mono text-lg"
                  placeholder="Enter your code"
                  maxLength={4}
                  autoComplete="off"
                  autoFocus
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

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">How to use the exported file:</h4>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Download the .ics file to your device</li>
                  <li>Open your calendar app (Google, Outlook, Apple)</li>
                  <li>Look for "Import" or "Add Calendar" option</li>
                  <li>Select the downloaded .ics file</li>
                  <li>Your shifts will appear in your calendar</li>
                </ol>
              </div>
            </div>
          )}

          {step === 'exporting' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Exporting Your Shifts
              </h4>
              <p className="text-gray-600 mb-4">
                Generating calendar file for {formatMonthYear()}...
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Fetching your roster entries</p>
                <p>• Converting to calendar format</p>
                <p>• Preparing download</p>
              </div>
            </div>
          )}

          {step === 'result' && exportResult && (
            <div className="space-y-6">
              {exportResult.success ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Export Successful!
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Your calendar file has been downloaded
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">File:</span>
                        <span className="text-green-800 font-medium">{exportResult.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Shifts exported:</span>
                        <span className="text-green-800 font-medium">{exportResult.entriesExported}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Month:</span>
                        <span className="text-green-800 font-medium">{formatMonthYear()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* View in Calendar Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        // Close this modal and switch to calendar tab
                        onClose();
                        window.dispatchEvent(new CustomEvent('switchToCalendarTab'));
                      }}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>View in Calendar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Export Failed
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Unable to export your calendar
                  </p>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="space-y-2 text-sm text-red-700">
                      {exportResult.errors.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">Next Steps:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  {exportResult.success ? (
                    <>
                      <li>• Check your Downloads folder for the .ics file</li>
                      <li>• Open your calendar app (Google, Outlook, Apple)</li>
                      <li>• Import the downloaded file</li>
                      <li>• Your shifts will appear in your calendar</li>
                    </>
                  ) : (
                    <>
                      <li>• Check your authentication code</li>
                      <li>• Ensure you have shifts in {formatMonthYear()}</li>
                      <li>• Try again or contact support</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Add extra padding at bottom */}
          <div className="h-8" />
        </div>

        {/* Footer */}
        {step === 'auth' && (
          <div className="flex-shrink-0 pt-0" style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                disabled={isExporting}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || authCode.length < 4}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Calendar</span>
              </button>
            </div>
          </div>
        )}

        {step === 'result' && exportResult && (
          <div className="flex-shrink-0 pt-0" style={{
            padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
          }}>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
              >
                Close
              </button>
              {exportResult.success && (
                <button
                  onClick={() => {
                    // Close this modal and switch to calendar tab
                    onClose();
                    window.dispatchEvent(new CustomEvent('switchToCalendarTab'));
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>View in Calendar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};