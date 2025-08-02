import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Server, CheckCircle, Table, Grid, FileText, Upload, Trash2, AlertTriangle } from 'lucide-react';
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

interface RosterPanelProps {
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
  onOpenCalendarExportModal: () => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({ setActiveTab, onOpenCalendarExportModal }) => {
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<ShiftFilterType>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Try to restore from sessionStorage first
    const savedDate = sessionStorage.getItem('rosterSelectedDate');
    if (savedDate) {
      return new Date(savedDate);
    }
    // Otherwise use current date
    return new Date();
  });
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

  const handlePDFImport = async (pdfEntries: RosterFormData[], editorName: string) => {
    try {
      console.log('📄 Starting PDF import of', pdfEntries.length, 'entries');
      
      let successCount = 0;
      let errorCount = 0;
      let importedMonth: number | null = null;
      let importedYear: number | null = null;
      
      for (const entry of pdfEntries) {
        try {
          await addRosterEntry(entry, editorName);
          successCount++;
          
          // Track the month/year of imported entries
          if (importedMonth === null) {
            const entryDate = new Date(entry.date);
            importedMonth = entryDate.getMonth();
            importedYear = entryDate.getFullYear();
          }
        } catch (error) {
          console.error('❌ Failed to import entry:', entry, error);
          errorCount++;
        }
      }
      
      // Refresh data
      await loadEntries();
      setRefreshKey(prev => prev + 1);
      
      // Navigate to imported month
      if (importedMonth !== null && importedYear !== null) {
        // Switch to calendar tab and navigate to imported month
        setActiveTab('calendar');
        
        // Dispatch event to navigate calendar to imported month
        window.dispatchEvent(new CustomEvent('navigateToMonth', {
          detail: { month: importedMonth, year: importedYear }
        }));
      }
      
      showSuccess(`PDF import completed: ${successCount} entries added${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
    } catch (error) {
      console.error('❌ PDF import failed:', error);
      alert('PDF import failed. Please try again.');
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
          <div className="flex-1 flex justify-center">
            <h2 className="text-2xl font-bold text-gray-900">Roster Management</h2>
          </div>
          <button
            onClick={() => setShowPDFImport(true)}
            {...useLongPress({
              onLongPress: () => setShowAuthModal(true),
              delay: 800
            })}
            className="p-3 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors duration-200 relative z-50"
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
              userSelect: 'none'
            }}
            title={isAdminAuthenticated ? "Import from PDF (authenticated)" : "Import from PDF (long press for more options)"}
          >
            <Server className="w-6 h-6" style={{ transform: 'rotate(180deg) !important' }} />
          </button>
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
            onDateChange={setSelectedDate}
            onExportToCalendar={onOpenCalendarExportModal}
            setActiveTab={setActiveTab}
            key={refreshKey}
          />
        ) : activeView === 'card' ? (
          <RosterCardView
            entries={entries}
            loading={loading}
            realtimeStatus={realtimeStatus}
            onRefresh={loadEntries}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
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
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
                  placeholder="Enter admin code"
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
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowPDFImport(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors duration-200"
                >
                  <Upload className="w-5 h-5" />
                  <span>Import from PDF</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setClearType('all');
                    setShowClearConfirm(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors duration-200"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear Database</span>
                </button>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowQuickActions(false)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}
    </div>
  );
};