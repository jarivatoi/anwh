import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Server, CheckCircle, Table, Grid, FileText, Upload, Download, Trash2, AlertTriangle, Eye, EyeOff, Printer, User } from 'lucide-react';
import { ViewType, ShiftFilterType } from '../types/roster';
import { useRosterData } from '../hooks/useRosterData';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';
import { PDFImportModal } from './PDFImportModal';
import { addRosterEntry, clearAllRosterEntries } from '../utils/rosterApi';
import { clearMonthRosterEntries } from '../utils/rosterApi';
import { RosterFormData } from '../types/roster';
import { validateAuthCode, isAdminCode } from '../utils/rosterAuth';
import { useLongPress } from '../hooks/useLongPress';
import { pdfExporter } from '../utils/pdfExport';
import { MonthlyReportsModal } from './MonthlyReportsModal';
import { BatchPrintModal } from './BatchPrintModal';
import { StaffManagementModal } from './StaffManagementModal';

interface RosterPanelProps {
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
  onOpenCalendarExportModal: () => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  basicSalary?: number;
  hourlyRate?: number;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({
  setActiveTab,
  onOpenCalendarExportModal,
  selectedDate: propSelectedDate,
  onDateChange: propOnDateChange,
  basicSalary = 35000,
  hourlyRate = 201.92
}) => {
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<ShiftFilterType>('all');
  const [selectedDate, setSelectedDate] = useState(propSelectedDate || new Date());
  // Sync with parent date state
  useEffect(() => {
    if (propSelectedDate) {
      setSelectedDate(propSelectedDate);
    }
  }, [propSelectedDate]);

  // Handle date changes and propagate to parent
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    if (propOnDateChange) {
      propOnDateChange(newDate);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [showPDFImport, setShowPDFImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearAuthCode, setClearAuthCode] = useState('');
  const [clearAuthError, setClearAuthError] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showMonthlyReports, setShowMonthlyReports] = useState(false);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showStaffManagement, setShowStaffManagement] = useState(false);

  const { entries: fetchedEntries, loading, error, removeEntry, loadEntries, realtimeStatus } = useRosterData();


  // Reset all loading states on component mount
  useEffect(() => {
    setIsClearing(false);
    setShowClearConfirm(false);
    setClearAuthCode('');
    setClearAuthError('');
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
    // Force loading to false on mount
    console.log('🔄 RosterPanel: Forcing loading states to false on mount');
    console.log('🔄 RosterPanel: Reset all loading states on mount');
  }, []);

  // Prevent body scroll when auth modal is open
  useEffect(() => {
    if (showAuthModal || showClearConfirm || showPDFImport) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
      
      // Don't disable any other scrolling - let modals handle their own scroll prevention
    }

    return () => {
      // Re-enable body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
    };
  }, [showAuthModal, showClearConfirm, showPDFImport]);

  // Update local entries when fetched entries change
  useEffect(() => {
    if (fetchedEntries) {
      setEntries(fetchedEntries);
    }
  }, [fetchedEntries]);

  // Admin validation - only N002 (NARAYYA) can clear database
  // Import admin validation from rosterAuth
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleDeleteEntry = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      await removeEntry(id);
      setShowDeleteConfirm(null);
      showSuccess('Roster entry deleted successfully!');
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Failed to delete entry. Please try again.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const handlePDFImport = async (entries: RosterFormData[]) => {
    try {
      console.log('📄 Starting PDF import with', entries.length, 'entries...');
      
      // Navigate to imported month IMMEDIATELY so user can see the table updating
      if (entries.length > 0) {
        const firstEntryDate = new Date(entries[0].date);
        const importedMonth = firstEntryDate.getMonth();
        const importedYear = firstEntryDate.getFullYear();
        
        console.log(`📅 Navigating to imported month immediately: ${importedMonth + 1}/${importedYear}`);
        
        // Force immediate state update
        const importedDate = new Date(importedYear, importedMonth, 1);
        handleDateChange(importedDate);
        
        // CRITICAL: Also update the child component dates by calling their onDateChange
        // This ensures both table and card views navigate to the imported month
        console.log(`📅 Forcing child components to navigate to: ${importedMonth + 1}/${importedYear}`);
        
        // Force immediate re-render by updating refresh key
        setRefreshKey(prev => prev + 1);
        
        // Also dispatch event for other components (like App.tsx calendar)
        window.dispatchEvent(new CustomEvent('navigateToMonth', {
          detail: { month: importedMonth, year: importedYear }
        }));
        
        // Wait a moment to ensure navigation is complete before starting import
        await new Promise(resolve => setTimeout(resolve, 200));
      }
     
      // Enable batch import mode to suppress individual notifications
      (window as any).batchImportMode = true;
      (window as any).disableAutoScroll = true; // Disable auto-scroll during import
      (window as any).batchImportStats = {
        count: 0,
        staffName: adminName || 'Unknown',
        dates: new Set<string>()
      };
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const entry of entries) {
        try {
          await addRosterEntry(entry, 'PDF Import');
          successCount++;
        } catch (error) {
          console.error('❌ Failed to import entry:', entry, error);
          errorCount++;
        }
      }
      
      // Disable batch import mode
      (window as any).batchImportMode = false;
      (window as any).disableAutoScroll = false; // Re-enable auto-scroll after import
      
      // Show summary notification
      const stats = (window as any).batchImportStats;
      if (stats && stats.count > 0) {
        showBatchImportNotification(stats.count, stats.staffName, stats.dates.size);
      }
      
      // Clear batch stats
      (window as any).batchImportStats = null;
      
      // Refresh data
      await loadEntries();
      setRefreshKey(prev => prev + 1);
      
      showSuccess(`PDF import completed: ${successCount} entries added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } catch (error) {
      console.error('❌ PDF import failed:', error);
      // Make sure to disable batch mode on error
      (window as any).batchImportMode = false;
      (window as any).batchImportStats = null;
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`PDF import failed: ${errorMessage}

Please check:
• PDF file format
• Network connection
• Database access`);
    }
  };

  const handleClearDatabase = async () => {
    console.log('🗑️ Starting clear database operation...');
    setIsClearing(true);
    setClearAuthError('');
    
    try {
      console.log(`🗑️ Starting ${clearType} database clear operation...`);
      
      if (clearType === 'all') {
        console.log('🗑️ Clearing ALL roster entries...');
        await clearAllRosterEntries();
        console.log('✅ All entries cleared successfully');
      } else {
        console.log(`🗑️ Clearing ${selectedMonth + 1}/${selectedYear} entries...`);
        await clearMonthRosterEntries(selectedYear, selectedMonth);
        console.log(`✅ Month ${selectedMonth + 1}/${selectedYear} cleared successfully`);
      }
      
      console.log('🔄 Refreshing data after clear...');
      // Wait for the operation to complete
      await loadEntries();
      setRefreshKey(prev => prev + 1);
      console.log('✅ Data refresh completed');
      
      // CRITICAL: Reset loading state IMMEDIATELY after success
      setIsClearing(false);
      console.log('✅ Loading state reset to false');
      
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const message = clearType === 'all' 
        ? 'Database cleared successfully!' 
        : `${monthNames[selectedMonth]} ${selectedYear} data cleared successfully!`;
      showSuccess(message);
      
      // Reset states and close modal after success
      setTimeout(() => {
        setShowClearConfirm(false);
        setClearAuthCode('');
        setClearType('all');
        // Double-check loading state is false
        setIsClearing(false);
        console.log('✅ Modal closed and all states reset');
      }, 100);
      
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      // CRITICAL: Reset loading state IMMEDIATELY on error
      setIsClearing(false);
      console.log('❌ Loading state reset to false after error');
      setClearAuthError('Failed to clear database. Please try again.');
    }
  };

  const handleCancelClear = () => {
    console.log('❌ Clear operation cancelled by user');
    // CRITICAL: Reset loading state when cancelling
    setIsClearing(false);
    setShowClearConfirm(false);
    setClearType('all');
    setClearAuthCode('');
    setClearAuthError('');
    console.log('✅ All clear states reset after cancel');
  };

  // Handle authentication for long press
  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName || !isAdminCode(authCode)) {
      setAuthError(!editorName ? 'Invalid authentication code' : 'Admin access required');
      return;
    }
    
    setIsAdminAuthenticated(true);
    setAdminName(editorName);
    setShowAuthModal(false);
    setAuthError('');
    setAuthCode('');
    setShowQuickActions(true);
  };

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
  };

  const handleExportToPDF = async () => {
    setIsExportingPDF(true);
    
    try {
      console.log('📄 Starting PDF export...');
      
      // Use current selected date for month/year
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      
      await pdfExporter.exportToPDF({
        entries: entries,
        month: month,
        year: year,
        title: 'X-ray ANWH Roster'
      });
      
      showSuccess('PDF exported successfully! Check your downloads folder.');
      console.log('✅ PDF export completed');
      
    } catch (error) {
      console.error('❌ PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };
  
  // Method to show batch import notification - moved outside component
  const showBatchImportNotification = (count: number, staffName: string, uniqueDates: number) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 16px;
      box-shadow: 0 12px 30px rgba(16, 185, 129, 0.5);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      font-weight: 600;
      max-width: 380px;
      animation: slideInRight 0.4s ease-out;
      border: 3px solid rgba(255, 255, 255, 0.3);
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 12px; height: 12px; background: white; border-radius: 50%; opacity: 0.9;"></div>
        <strong style="font-size: 17px;">PDF Import Complete</strong>
      </div>
      <div style="font-size: 14px; line-height: 1.5; opacity: 0.95;">
        <strong>${count} entries</strong> imported for <strong>${staffName}</strong><br>
        📅 <strong>${uniqueDates} dates</strong> updated in calendar<br>
        🎯 Navigated to imported month
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds (longer for summary)
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideInRight 0.4s ease-out reverse';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 400);
      }
    }, 5000);
  };

  return (
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      paddingTop: '0px'
    }}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center justify-center">
            <h2 className="text-2xl font-bold text-gray-900">Roster Management</h2>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setShowPDFImport(true)}
              {...useLongPress({
                onLongPress: () => setShowAuthModal(true),
                delay: 800
              })}
              className="p-3 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors duration-200 relative z-50 flex items-center justify-center"
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                zIndex: 50,
                // Force proper rendering after orientation change
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                WebkitTransform: 'translate3d(0,0,0)',
                // iPhone specific fixes
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isAdminAuthenticated ? "Import from PDF (authenticated)" : "Import from PDF (long press for more options)"}
            >
              <Server className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
        
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* View Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveView('table')}
            className={`flex-1 px-6 py-4 font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              activeView === 'table'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setActiveView('card')}
            className={`flex-1 px-6 py-4 font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              activeView === 'card'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Card View</span>
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`flex-1 px-6 py-4 font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
              activeView === 'log'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                : 'text-gray-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Log View</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'table' ? (
          <RosterTableView
            entries={entries}
            loading={loading && entries.length === 0}
            realtimeStatus={realtimeStatus}
            onRefresh={loadEntries}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onExportToCalendar={onOpenCalendarExportModal}
            setActiveTab={setActiveTab}
          />
        ) : activeView === 'card' ? (
          <RosterCardView
            entries={entries}
            loading={loading}
            realtimeStatus={realtimeStatus}
            onRefresh={loadEntries}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        ) : activeView === 'log' ? (
          <RosterLogView
            entries={entries}
            loading={loading && entries.length === 0}
            selectedDate={selectedDate}
          />
        ) : null}
      </div>
      
      {/* PDF Import Modal */}
      <PDFImportModal
        isOpen={showPDFImport}
        onClose={() => setShowPDFImport(false)}
        onImport={handlePDFImport}
        isAdminAuthenticated={isAdminAuthenticated}
        adminName={adminName}
      />
      
      {/* Clear Database Confirmation Modal */}
      {showClearConfirm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
          paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px',
          overflow: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full" style={{
            maxWidth: window.innerWidth > window.innerHeight ? '98vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '98vh' : 'none',
            margin: window.innerWidth > window.innerHeight ? '2px 0' : '16px 0'
          }}>
            <div style={{
              padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
            }}>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                {clearType === 'all' ? 'Clear Entire Database' : 'Clear Month Data'}
              </h3>
              
              {/* Clear Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clear Type
                </label>
                <div className="flex space-x-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={clearType === 'all'}
                      onChange={(e) => setClearType(e.target.value as 'all' | 'month')}
                      className="mr-2"
                    />
                    <span className="text-sm">All Data</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="month"
                      checked={clearType === 'month'}
                      onChange={(e) => setClearType(e.target.value as 'all' | 'month')}
                      className="mr-2"
                    />
                    <span className="text-sm">Specific Month</span>
                  </label>
                </div>
              </div>
              
              {/* Month/Year Selection - Only show when clearType is 'month' */}
              {clearType === 'month' && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Month
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((month, index) => (
                          <option key={index} value={index}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium mb-2">
                      ⚠️ DANGER: This will permanently delete {clearType === 'all' ? 'ALL roster entries' : `all entries for ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} ${selectedYear}`}!
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {clearType === 'all' ? (
                        <>
                          <li>• All dates and shift assignments</li>
                          <li>• All edit history and logs</li>
                          <li>• All imported data</li>
                        </>
                      ) : (
                        <>
                          <li>• All shifts for {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} {selectedYear}</li>
                          <li>• All edit history for that month</li>
                          <li>• All staff assignments for that month</li>
                        </>
                      )}
                      <li>• This action CANNOT be undone!</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelClear}
                  disabled={isClearing}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearDatabase}
                  disabled={isClearing}
                  className={`flex-1 px-4 py-3 ${clearType === 'all' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2`}
                >
                  {isClearing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{clearType === 'all' ? 'Clearing all data...' : 'Clearing month...'}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{clearType === 'all' ? 'Clear Database' : 'Clear Month'}</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Show auth error in the modal */}
              {clearAuthError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">{clearAuthError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        , document.body
      )}
      
      {/* Authentication Modal for Long Press */}
      {showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2147483647, // Maximum z-index
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
            // CRITICAL: Prevent all scrolling
            overflow: 'auto',
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch'
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
              userSelect: 'none',
              WebkitUserSelect: 'none',
              maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
              maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              zIndex: 2147483647,
              // Enable touch interactions within modal
              touchAction: 'auto',
              overflow: 'hidden',
              margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0'
            }}
            onClick={(e) => {
              // Prevent modal from closing when clicking inside
              e.stopPropagation();
            }}
          >
            <div style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
            }}>
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Admin Authentication Required
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
                  disabled={authCode.length < 4 || !isAdminCode(authCode)}
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
      
      {/* Quick Actions Modal (Long-press triggered) */}
      {showQuickActions && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
          paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px',
          overflow: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full" style={{
            maxHeight: window.innerWidth > window.innerHeight ? '98vh' : '90vh',
            maxWidth: window.innerWidth > window.innerHeight ? '98vw' : '28rem',
            margin: window.innerWidth > window.innerHeight ? '2px 0' : '16px 0'
          }}>
            <div style={{
              padding: window.innerWidth > window.innerHeight ? '8px' : '24px'
            }}>
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Server className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
                  Quick Actions
                </span>
              </h3>
              
              <div className="space-y-3 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowPDFImport(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <Upload className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Import from PDF</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    handleExportToPDF();
                  }}
                  disabled={isExportingPDF}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-500 text-green-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  {isExportingPDF ? (
                    <>
                      <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Exporting PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Export to PDF</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowMonthlyReports(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <FileText className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Monthly Reports</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowBatchPrint(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <Printer className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Batch Print</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowStaffManagement(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <User className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Staff Management</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setClearType('all');
                    setShowClearConfirm(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Clear Database</span>
                </button>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowQuickActions(false)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}
      
      {/* Monthly Reports Modal */}
      <MonthlyReportsModal
        isOpen={showMonthlyReports}
        onClose={() => setShowMonthlyReports(false)}
        entries={entries}
        basicSalary={basicSalary}
        hourlyRate={hourlyRate}
        shiftCombinations={[
          { id: '9-4', combination: '9-4', hours: 6.5 },
          { id: '4-10', combination: '4-10', hours: 5.5 },
          { id: '12-10', combination: '12-10', hours: 9.5 },
          { id: 'N', combination: 'N', hours: 12.5 }
        ]}
      />

      {/* Batch Print Modal */}
      <BatchPrintModal
        isOpen={showBatchPrint}
        onClose={() => setShowBatchPrint(false)}
        entries={entries}
        basicSalary={basicSalary}
        hourlyRate={hourlyRate}
        shiftCombinations={[
          { id: '9-4', combination: '9-4', hours: 6.5 },
          { id: '4-10', combination: '4-10', hours: 5.5 },
          { id: '12-10', combination: '12-10', hours: 9.5 },
          { id: 'N', combination: 'N', hours: 12.5 }
        ]}
      />
      
      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={showStaffManagement}
        onClose={() => setShowStaffManagement(false)}
        isAdminAuthenticated={isAdminAuthenticated}
        adminName={adminName}
      />
    </div>
  );
};