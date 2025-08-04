import React from 'react';
import { createPortal } from 'react-dom';
import { Calendar, User, ChevronLeft, ChevronRight, Edit, RotateCcw, FileText, X, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { RosterEntry, ShiftFilterType } from '../types/roster';
import { formatDisplayDate } from '../utils/rosterFilters';
import { RosterEntryCell } from './RosterEntryCell';
import { RosterDateCell } from './RosterDateCell';
import { useState, useEffect, useRef } from 'react';
import { useRosterData } from '../hooks/useRosterData';
import { availableNames, validateAuthCode, shiftTypes } from '../utils/rosterAuth';
import { isAdminCode } from '../utils/rosterAuth';
import { sortByGroup } from '../utils/rosterAuth';
import { addRosterEntry, deleteRosterEntry } from '../utils/rosterApi';
import { EditDetailsModal } from './EditDetailsModal';
import { ScrollingText } from './ScrollingText';
import { fetchRosterEntries } from '../utils/rosterApi';

interface RosterTableViewProps {
  entries: RosterEntry[];
  loading: boolean;
  realtimeStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  onRefresh?: () => Promise<void>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExportToCalendar: () => void;
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
  setActiveTab?: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
}

export const RosterTableView: React.FC<RosterTableViewProps> = ({
  entries,
  loading,
  realtimeStatus,
  onRefresh,
  selectedDate,
  onDateChange,
  onExportToCalendar,
  setActiveTab,
}) => {
  // All hooks must be declared at the top level before any conditional returns
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportAuthCode, setExportAuthCode] = useState('');
  const [exportAuthError, setExportAuthError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{success: boolean, message: string} | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  // Track mounted status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // iPhone orientation change handler
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('📱 Orientation change detected, fixing roster table...');
      
      // Fix UI issues without database calls
      setTimeout(() => {
        // Only fix UI elements, no database operations
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.bottom = '';
        
        // Ensure table container maintains proper scrolling
        if (tableRef.current) {
          const container = tableRef.current;
          // Force reset scrolling properties
          container.style.overflow = 'hidden';
          container.style.overflowX = 'hidden';
          container.style.overflowY = 'auto';
          container.style.WebkitOverflowScrolling = 'touch';
          container.style.touchAction = 'auto';
          container.style.pointerEvents = 'auto';
          
          // Force reflow
          container.offsetHeight;
          console.log('📱 Table container scrolling restored');
        }
        
        // Ensure all roster containers can scroll
        const rosterContainers = document.querySelectorAll('[style*="height: 70vh"], [style*="height: 60vh"]');
        rosterContainers.forEach(container => {
          const el = container as HTMLElement;
          el.style.overflow = 'auto';
          el.style.overflowY = 'auto';
          el.style.WebkitOverflowScrolling = 'touch';
          el.style.touchAction = 'auto';
          el.style.pointerEvents = 'auto';
        });
        
        // Force repaint of all interactive elements
        const interactiveElements = document.querySelectorAll('button, [role="button"], input, select');
        interactiveElements.forEach(element => {
          const el = element as HTMLElement;
          // Reset any disabled touch actions
          el.style.touchAction = 'manipulation';
          el.style.pointerEvents = 'auto';
          el.style.transform = 'translateZ(0)';
          el.style.backfaceVisibility = 'hidden';
          el.style.WebkitBackfaceVisibility = 'hidden';
          el.style.WebkitTransform = 'translateZ(0)';
        });
        
        // Force repaint of sticky headers
        const stickyHeaders = document.querySelectorAll('[style*="position: sticky"]');
        stickyHeaders.forEach(header => {
          const el = header as HTMLElement;
          el.style.pointerEvents = 'auto';
          el.style.transform = 'translateZ(0)';
          el.style.backfaceVisibility = 'hidden';
          el.style.WebkitBackfaceVisibility = 'hidden';
          el.style.WebkitTransform = 'translateZ(0)';
        });
        
        console.log('📱 All interactive elements restored');
        
      }, 100);
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAuthModal && !isUpdating) {
          handleCancelEdit();
        } else if (showExportModal && !isExporting) {
          setShowExportModal(false);
          setExportAuthCode('');
          setExportAuthError('');
          setExportResult(null);
        }
      }
    };

    if (showAuthModal || showExportModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showAuthModal, showExportModal, isUpdating, isExporting]);

  // Auto-scroll to today's date ONLY on initial component mount
  useEffect(() => {
    if (!loading && !hasAutoScrolled && entries.length > 0 && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if today's date exists in the entries
      const todayEntry = entries.find(entry => entry.date === todayString);
      
      // Only auto-scroll if today's date actually exists in the roster
      if (todayEntry && tableRef.current) {
        // Scroll to today's row after a brief delay to ensure DOM is ready
        setTimeout(() => {
          const todayRow = document.querySelector(`[data-date="${todayString}"]`);
          if (todayRow) {
            todayRow.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            console.log(`📍 Auto-scrolled to today's date: ${todayString}`);
          }
        }, 100);
      } else {
        console.log(`📍 Today's date (${todayString}) not found in roster entries - no auto-scroll`);
      }
      
      setHasAutoScrolled(true);
    }
  }, [loading, hasAutoScrolled, entries, selectedDate]);

  // Group entries by shift type for each date
  const groupEntriesByShift = (dateEntries: RosterEntry[]) => {
    const shiftGroups: Record<string, RosterEntry[]> = {};
    
    dateEntries.forEach(entry => {
      if (!shiftGroups[entry.shift_type]) {
        shiftGroups[entry.shift_type] = [];
      }
      shiftGroups[entry.shift_type].push(entry);
    });
    
    // Sort each shift group to prioritize (R) names first
    Object.keys(shiftGroups).forEach(shiftType => {
      shiftGroups[shiftType] = sortStaffNames(shiftGroups[shiftType]);
    });
    
    return shiftGroups;
  };

  // Filter entries based on selected date (show entries for the selected month)
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedDate.getMonth() && 
           entryDate.getFullYear() === selectedDate.getFullYear();
  });

  // Group entries by date
  const groupedByDate = filteredEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, RosterEntry[]>);

  // Format date for display in table (Tue 01-03-25)
  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    return { dayName, dateString: `${day} ${monthName}` };
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  // Format month/year for display
  const formatMonthYear = (date: Date) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleEntryUpdate = (updatedEntry: RosterEntry) => {
    // Check if component is still mounted before calling loadEntries
    if (!isMountedRef.current) {
      console.warn('Component unmounted, skipping loadEntries call');
      return;
    }
    
    // Force component re-render
    setRefreshKey(prev => prev + 1);
    
    // Also trigger a data refresh
    if (onRefresh && isMountedRef.current) {
      onRefresh();
    }
  };

  // Handle edit button click
  const handleEditClick = (date: string) => {
    setEditingDate(date);
    setShowAuthModal(true);
  };

  // Handle authentication
  const handleAuthSubmit = () => {
    const editorName = validateAuthCode(authCode);
    if (!editorName || !isAdminCode(authCode)) {
      setAuthError(!editorName ? 'Invalid authentication code' : 'Admin access required for date editing');
      return;
    }
    
    setShowAuthModal(false);
    setAuthError('');
    
    // Get current staff for the selected date and shift
    if (editingDate && selectedShift) {
      const currentEntries = getEntriesForDateAndShift(editingDate, selectedShift);
      const currentStaff = currentEntries.map(entry => entry.assigned_name);
      setSelectedStaff(currentStaff);
    }
  };

  // Handle staff selection change
  const handleStaffToggle = (staffName: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffName) 
        ? prev.filter(name => name !== staffName)
        : [...prev, staffName]
    );
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!editingDate || !selectedShift || !authCode) return;
    
    setIsUpdating(true);
    
    try {
      console.log('🔄 Manual refresh triggered in table view');
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      const currentEntries = getEntriesForDateAndShift(editingDate, selectedShift);
      const currentStaff = currentEntries.map(entry => entry.assigned_name);
      
      // Find staff to add and remove
      const staffToAdd = selectedStaff.filter(name => !currentStaff.includes(name));
      const staffToRemove = currentStaff.filter(name => !selectedStaff.includes(name));
      
      // Remove staff
      for (const entry of currentEntries) {
        if (staffToRemove.includes(entry.assigned_name)) {
          await deleteRosterEntry(entry.id);
        }
      }
      
      // Add new staff
      for (const staffName of staffToAdd) {
        await addRosterEntry({
          date: editingDate,
          shiftType: selectedShift,
          assignedName: staffName,
          changeDescription: `Added by ${editorName}`
        }, editorName);
      }
      
      // Don't auto-refresh from server to prevent position jumping
      setRefreshKey(prev => prev + 1);
      console.log('✅ Manual refresh completed');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('rosterUpdated', { 
        detail: { 
          type: 'bulk_edit',
          date: editingDate,
          shift: selectedShift,
          staffAdded: staffToAdd,
          staffRemoved: staffToRemove
        }
      }));
      
      handleCancelEdit();
      
    } catch (error) {
      console.error('Failed to update roster:', error);
      alert('Failed to update roster. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingDate(null);
    setSelectedShift('');
    setSelectedStaff([]);
    setAuthCode('');
    setAuthError('');
    setShowAuthModal(false);
  };
  
  // Handle showing details modal
  const handleShowDetails = (entry: RosterEntry) => {
    console.log('🔍 RosterTableView: handleShowDetails called with entry:', entry.id);
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };
  
  const getEntriesForDateAndShift = (date: string, shiftType: string) => {
    const dateEntries = groupedByDate[date] || [];
    return dateEntries.filter(entry => entry.shift_type === shiftType);
  };

  // Check if date is today
  const isToday = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation
    const todayString = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    return dateString === todayString;
  };
  
  // Check if date is in the past
  const isPastDate = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation
    const todayString = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    return dateString < todayString;
  };

  // Custom sorting function to prioritize (R) names first
  const sortStaffNames = (entries: RosterEntry[]): RosterEntry[] => {
    // Extract names, sort them using group sorting, then reorder entries
    const names = entries.map(entry => entry.assigned_name);
    const sortedNames = sortByGroup(names);
    
    // Create a map for quick lookup of original entries
    const entryMap = new Map<string, RosterEntry[]>();
    entries.forEach(entry => {
      if (!entryMap.has(entry.assigned_name)) {
        entryMap.set(entry.assigned_name, []);
      }
      entryMap.get(entry.assigned_name)!.push(entry);
    });
    
    // Rebuild entries array in sorted order
    const sortedEntries: RosterEntry[] = [];
    sortedNames.forEach(name => {
      const nameEntries = entryMap.get(name) || [];
      sortedEntries.push(...nameEntries);
    });
    
    return sortedEntries;
  };

  // Check if date is in the future
  const isFutureDate = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation
    const todayString = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    return dateString > todayString;
  };
  
  // Sort dates in ascending order (oldest first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Calculate max staff count for each date to align columns
  const getMaxStaffCountForDate = (date: string) => {
    const dateEntries = groupedByDate[date] || [];
    const shiftGroups = shiftTypes.reduce((groups, shiftType) => {
      const shiftEntries = dateEntries.filter(entry => entry.shift_type === shiftType);
      groups[shiftType] = sortStaffNames(shiftEntries);
      return groups;
    }, {} as Record<string, RosterEntry[]>);
    
    return Math.max(...Object.values(shiftGroups).map(entries => entries.length), 1);
  };

  const handleExportToCalendar = async () => {
    const editorName = validateAuthCode(exportAuthCode);
    if (!editorName) {
      setExportAuthError('Invalid authentication code');
      return;
    }
    
    setIsExporting(true);
    setExportAuthError('');
    
    try {
      // Call the parent's export function
      await onExportToCalendar();
      setExportResult({
        success: true,
        message: `Successfully exported your shifts for ${formatMonthYear(selectedDate)} to your personal calendar.`
      });
    } catch (error) {
      console.error('Export failed:', error);
      setExportResult({
        success: false,
        message: 'Failed to export shifts. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to get shift display name
  const getShiftDisplayName = (shiftType: string) => {
    if (shiftType === 'Morning Shift (9-4)') return '9-4';
    if (shiftType === 'Saturday Regular (12-10)') return '12-10';
    if (shiftType === 'Evening Shift (4-10)') return '4-10';
    if (shiftType === 'Night Duty') return 'N';
    return shiftType;
  };

  // Shift types in order
  const shiftTypes = [
    'Morning Shift (9-4)',
    'Saturday Regular (12-10)', 
    'Evening Shift (4-10)',
    'Night Duty'
  ];
  return (
    <div>
      {/* Date Picker */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center justify-center space-x-4 w-full max-w-lg mx-auto">
            {/* Left Arrow - Centered */}
          <button
            onClick={() => navigateMonth('prev')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200 flex items-center justify-center"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px'
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
            {/* Center Content - Month/Year Selectors */}
            <div className="flex items-center justify-center space-x-3 flex-1">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div className="flex items-center justify-center space-x-2">
              <select
                value={selectedDate.getMonth()}
                onChange={(e) => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(Number(e.target.value));
                  onDateChange(newDate);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-gray-900 bg-white text-center"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  textAlign: 'center'
                }}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              
              <select
                value={selectedDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(selectedDate);
                  newDate.setFullYear(Number(e.target.value));
                  onDateChange(newDate);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-gray-900 bg-white text-center"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  textAlign: 'center'
                }}
              >
                {Array.from({ length: 10 }, (_, i) => selectedDate.getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              </div>
            
              {/* Export to Calendar Button - Centered */}
            <button
              onClick={() => {
                console.log('🔄 ROSTER TABLE: Export to Calendar button clicked');
                onExportToCalendar();
              }}
              className="p-3 rounded-lg hover:bg-green-100 text-green-600 transition-colors duration-200 flex items-center justify-center"
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px'
              }}
              title="Export your shifts to calendar"
            >
              <Download className="w-6 h-6" />
            </button>
            </div>
          
            {/* Right Arrow - Centered */}
          <button
            onClick={() => navigateMonth('next')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200 flex items-center justify-center"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px'
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden w-full" style={{ 
        height: window.innerWidth > window.innerHeight ? '60vh' : '70vh', // Shorter in landscape
        minHeight: '400px',
        maxHeight: '80vh',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)'
      }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No roster entries found
            </p>
            <p className="text-gray-400 text-sm mt-2">
              No entries available for {formatMonthYear(selectedDate)}
            </p>
          </div>
        ) : (
          <div ref={tableRef} style={{ 
            height: '100%', 
            overflow: 'hidden',
            overflowX: 'hidden',
            overflowY: 'auto',
            position: 'relative', 
            width: '100%',
            // Better mobile landscape handling
            WebkitOverflowScrolling: 'touch',
            // Force proper scrolling after orientation change
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            WebkitTransform: 'translate3d(0,0,0)',
            // iPhone specific fixes
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}>
            {/* Separate Sticky Header for Roster Title */}
            <div 
              style={{ 
                position: 'sticky',
                top: 0,
                zIndex: 95,
                width: '100vw',
                padding: '12px 16px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'white',
                border: 'none',
                margin: 0,
                marginBottom: 0,
                height: window.innerWidth > window.innerHeight ? '40px' : '56px', // Shorter header in landscape
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#4b5563',
                background: '#4b5563',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                opacity: 1,
                // Force proper rendering after orientation change
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                WebkitTransform: 'translate3d(0,0,0)',
                // iPhone specific
                WebkitTouchCallout: 'none'
              }}
            >
              {/* Centered title with reload button */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: window.innerWidth > window.innerHeight ? '16px' : '18px',
                gap: '8px'
              }}>
                <span>Roster for {formatMonthYear(selectedDate)}</span>
                {/* Manual refresh button with real-time status */}
                <button
                  onClick={async () => {
                    setIsReloading(true);
                    try {
                      console.log('🔄 Manual refresh triggered in table view');
                      if (onRefresh) {
                        await onRefresh();
                      }
                      setRefreshKey(prev => prev + 1);
                      setLastUpdateTime(new Date().toLocaleTimeString());
                      console.log('✅ Manual refresh completed');
                    } catch (error) {
                      console.error('Manual refresh failed in table view:', error);
                    } finally {
                      setIsReloading(false);
                    }
                  }}
                  disabled={isReloading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: isReloading ? 0.7 : 1,
                    border: '2px solid #374151',
                    borderRight: '3px solid #374151',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  title={
                    realtimeStatus === 'connected' ? 'Manual refresh (Real-time active)' :
                    realtimeStatus === 'connecting' ? 'Manual refresh (Connecting...)' :
                    realtimeStatus === 'error' ? 'Manual refresh (Real-time failed)' :
                    'Manual refresh (Real-time disconnected)'
                  }
                >
                  {/* Refresh icon with rotation animation when loading */}
                  <svg 
                    style={{
                      width: '20px',
                      height: '20px',
                      animation: isReloading ? 'spin 1s linear infinite' : 'none'
                    }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  
                  {/* Real-time status indicator inside the button */}
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: realtimeStatus === 'connected' ? '#10b981' : 
                                    realtimeStatus === 'connecting' ? '#f59e0b' :
                                    realtimeStatus === 'error' ? '#ef4444' : '#6b7280',
                    animation: realtimeStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    boxShadow: realtimeStatus === 'connected' ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none'
                  }} />
                </button>
              </div>
            </div>
            
            <table className="border-collapse table-fixed" style={{ width: '100vw', minWidth: '100vw' }}>
              <thead>
                <tr>
                  <th 
                    style={{ 
                      position: 'sticky',
                      top: window.innerWidth > window.innerHeight ? 40 : 56, // Adjust for shorter header
                      zIndex: 85,
                      fontWeight: '600',
                      textAlign: 'center',
                      fontSize: window.innerWidth > window.innerHeight ? '10px' : (window.innerWidth >= 640 ? '14px' : '12px'),
                      color: 'white',
                      border: '2px solid #374151',
                      backgroundColor: '#6b7280',
                      background: '#6b7280',
                      margin: 0,
                      marginTop: 0,
                      width: '80px',
                      minWidth: '80px',
                      maxWidth: '80px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      opacity: 1,
                      // Force proper rendering after orientation change
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    Date
                  </th>
                  {shiftTypes.map((shiftType) => (
                    <th
                      key={shiftType}
                      style={{ 
                        position: 'sticky',
                        top: window.innerWidth > window.innerHeight ? 40 : 56,
                        zIndex: 85,
                        textAlign: 'center',
                        fontSize: window.innerWidth > window.innerHeight ? '10px' : (window.innerWidth >= 640 ? '14px' : '12px'),
                        color: 'white',
                        border: 'none',
                        backgroundColor: '#6b7280',
                        background: '#6b7280',
                        margin: 0,
                        opacity: 1,
                        width: 'calc((100vw - 80px) / 4)',
                        minWidth: 'calc((100vw - 80px) / 4)',
                        // Force proper rendering after orientation change
                        transform: 'translate3d(0,0,0)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        WebkitTransform: 'translate3d(0,0,0)'
                      }}
                    >
                      {getShiftDisplayName(shiftType)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200">
                {sortedDates.map((date) => {
                  const dateEntries = groupedByDate[date] || [];
                  
                  // Calculate the maximum number of staff in any shift for this date
                  const maxStaffCount = Math.max(...shiftTypes.map(shiftType => 
                    (dateEntries.filter(entry => entry.shift_type === shiftType) || []).length
                  ));
                  
                  // Calculate dynamic height based on max staff count (minimum 60px, 40px per staff member)
                  const dynamicHeight = Math.max(60, maxStaffCount * 40);

                  return (
                    <tr 
                      key={date} 
                      data-date={date}
                      className={`${
                        isToday(date) ? 'bg-green-200' : 
                        isPastDate(date) ? 'bg-red-50' :
                        isFutureDate(date) ? 'bg-green-50' : ''
                      }`}
                    >
                      {/* Date Column */}
                      <RosterDateCell
                        date={date}
                        isToday={isToday(date)}
                        isPastDate={isPastDate(date)}
                        isFutureDate={isFutureDate(date)}
                        onLongPress={() => {
                          setEditingDate(date);
                          setShowAuthModal(true);
                        }}
                        formatTableDate={formatTableDate}
                      />
                      {shiftTypes.map((shiftType) => {
                        const shiftEntries = sortStaffNames(getEntriesForDateAndShift(date, shiftType));
                        const maxStaffForThisDate = getMaxStaffCountForDate(date);
                        
                        // Create aligned array with consistent row count for this date
                        const alignedEntries = [];
                        for (let rowIndex = 0; rowIndex < maxStaffForThisDate; rowIndex++) {
                          alignedEntries.push(shiftEntries[rowIndex] || null);
                        }
                        return (
                          <td key={shiftType} className={`text-center overflow-hidden align-top relative ${
                            isPastDate(date) ? 'bg-red-50' : ''
                          }`} style={{
                            padding: '2px',
                            border: '2px solid #374151',
                            backgroundColor: '#f9fafb',
                            borderRadius: '4px',
                            margin: '2px',
                            minHeight: `${dynamicHeight}px`,
                            height: `${dynamicHeight}px`,
                            position: 'relative',
                            overflow: 'hidden',
                            textAlign: 'center',
                            width: 'calc((100vw - 80px) / 4)',
                            minWidth: 'calc((100vw - 80px) / 4)',
                            maxWidth: 'calc((100vw - 80px) / 4)'
                          }}>
                            <div className="w-full h-full relative" style={{
                              overflow: 'hidden',
                              padding: '4px',
                              margin: 0,
                              textAlign: 'center',
                              width: '100%',
                              height: '100%',
                              minWidth: '0',
                              backgroundColor: 'white'
                            }}>
                              {shiftEntries.length > 0 ? (
                                <div>
                                  {/* X watermark for past dates - positioned within the container only */}
                                  {isPastDate(date) && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
                                      zIndex: 50,
                                      opacity: 0.1,
                                      fontSize: 'clamp(2rem, 8vw, 6rem)',
                                      fontWeight: 'bold',
                                      color: '#ef4444',
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      pointerEvents: 'none'
                                    }}>
                                      ✕
                                    </div>
                                  )}
                                  
                                  {sortStaffNames(shiftEntries).map((entry, index) => (
                                    <div key={entry.id} className="relative" style={{ 
                                      padding: 0, 
                                      margin: 0, 
                                      textAlign: 'center',
                                      width: '100%',
                                      maxWidth: '100%',
                                      overflow: 'hidden', // Contain each entry within white box
                                      zIndex: 60 
                                    }}>
                                      <RosterEntryCell
                                        entry={entry}
                                        onUpdate={handleEntryUpdate}
                                        onShowDetails={handleShowDetails}
                                        allEntriesForShift={shiftEntries}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{
                                  fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                                  fontWeight: 'bold',
                                  color: '#d1d5db',
                                  opacity: 0.3,
                                  userSelect: 'none',
                                  WebkitUserSelect: 'none',
                                  pointerEvents: 'none',
                                  zIndex: 10
                                }}>
                                  No Staff
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
            zIndex: 2147483647, // Maximum z-index value
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
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full" style={{
            maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '95vh' : 'none',
            margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0'
          }}>
            <div 
              style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCancelEdit}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 10
                }}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Authentication Required
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
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shift Type
                </label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select shift type</option>
                  {shiftTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4 || !selectedShift || !isAdminCode(authCode)}
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
      {showExportModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999, // Ultra-high z-index
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
            overflow: 'hidden', // Prevent any scrolling
            overflowY: 'hidden',
            touchAction: 'none' // Disable all touch actions
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget && !isExporting) {
              setShowExportModal(false);
              setExportAuthCode('');
              setExportAuthError('');
              setExportResult(null);
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full" style={{
            maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
            margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto'
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
          >
            <div 
              className="flex-shrink-0" 
              style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportAuthCode('');
                  setExportAuthError('');
                  setExportResult(null);
                }}
                disabled={isExporting}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200 disabled:opacity-50"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 10
                }}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Export to Calendar
              </h3>
              
              {!exportResult ? (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">Export Your Shifts</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Exports only YOUR shifts for {formatMonthYear(selectedDate)}</li>
                          <li>• Adds shifts to your personal calendar tab</li>
                          <li>• Skips dates that already have shifts</li>
                          <li>• Automatically marks special dates when needed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Authentication Code
                    </label>
                    <input
                      type="text"
                      value={exportAuthCode}
                      onChange={(e) => setExportAuthCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-mono text-lg"
                      placeholder="Enter your code"
                      maxLength={4}
                      autoComplete="off"
                      autoFocus
                      disabled={isExporting}
                    />
                  </div>
                  
                  {exportAuthError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 text-center">{exportAuthError}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowExportModal(false);
                        setExportAuthCode('');
                        setExportAuthError('');
                        setExportResult(null);
                      }}
                      disabled={isExporting}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExportToCalendar}
                      disabled={isExporting || exportAuthCode.length < 4}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Export to Calendar</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 ${exportResult.success ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      {exportResult.success ? (
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {exportResult.success ? 'Export Successful!' : 'Export Failed'}
                    </h4>
                    <p className="text-gray-600">
                      {exportResult.message}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowExportModal(false);
                      setExportAuthCode('');
                      setExportAuthError('');
                      setExportResult(null);
                      
                      setActiveTab('calendar');
                      
                      // Dispatch event to navigate calendar to imported month
                      window.dispatchEvent(new CustomEvent('navigateToMonth', {
                        detail: { 
                          month: selectedDate.getMonth(),
                          year: selectedDate.getFullYear()
                        }
                      }));
                      
                      if (exportResult.success) {
                        // Switch to calendar tab to show the exported data
                        window.dispatchEvent(new CustomEvent('switchToCalendarTab'));
                      }
                    }}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    {exportResult.success ? 'View in Calendar' : 'Close'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        , document.body
      )}
      
      {/* Staff Selection Modal */}
      {editingDate && selectedShift && authCode && !showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999999, // Ultra-high z-index
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
            overflow: 'hidden', // Prevent any scrolling
            overflowY: 'hidden',
            touchAction: 'none', // Disable all touch actions
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              handleCancelEdit();
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{
            maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
            margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="border-b border-gray-200 flex-shrink-0 relative" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 10
                }}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                Edit Staff Assignment
              </h3>
              <p className="text-sm text-gray-600 text-center select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                {editingDate && formatTableDate(editingDate).dayName} {editingDate && formatTableDate(editingDate).dateString} - {selectedShift}
              </p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y', // Only allow vertical scrolling within modal
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <div className="space-y-3">
                {sortByGroup(availableNames).map(name => (
                  <label key={name} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedStaff.includes(name)}
                      onChange={() => handleStaffToggle(name)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>{name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 flex-shrink-0" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>Saving...</span>
                    </>
                  ) : (
                    <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}
      
      {/* Edit Details Modal */}
      <EditDetailsModal
        isOpen={showDetailsModal}
        entry={selectedEntry}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEntry(null);
        }}
      />
      
    </div>
  );
};