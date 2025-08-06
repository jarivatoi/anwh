import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Edit, FileText, Download, RefreshCw, Star, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { RosterEntry, ShiftFilterType } from '../types/roster';
import { EditDetailsModal } from './EditDetailsModal';
import { SpecialDateModal } from './SpecialDateModal';
import { RosterEntryCell } from './RosterEntryCell';
import { RosterDateCell } from './RosterDateCell';
import { ScrollingText } from './ScrollingText';
import { availableNames, validateAuthCode, shiftTypes, isAdminCode, sortByGroup } from '../utils/rosterAuth';
import { addRosterEntry, deleteRosterEntry, updateAllStaffRemarksForDate } from '../utils/rosterApi';

interface RosterTableViewProps {
  entries: RosterEntry[];
  loading: boolean;
  realtimeStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  onRefresh: () => Promise<void>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExportToCalendar: () => void;
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
}

export const RosterTableView: React.FC<RosterTableViewProps> = ({
  entries,
  loading,
  realtimeStatus = 'disconnected',
  onRefresh,
  selectedDate,
  onDateChange,
  onExportToCalendar,
  setActiveTab
}) => {
  // All state declarations
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [refreshingDate, setRefreshingDate] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Special date modal states
  const [showSpecialDateModal, setShowSpecialDateModal] = useState(false);
  const [selectedSpecialDate, setSelectedSpecialDate] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionType, setActionType] = useState<'special' | 'addStaff' | null>(null);
  const [selectedShiftForAdd, setSelectedShiftForAdd] = useState<string>('');
  const [selectedStaffForAdd, setSelectedStaffForAdd] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const isMountedRef = useRef(true);

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  // Track mounted status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Filter entries based on selected date
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedDate.getMonth() && 
           entryDate.getFullYear() === selectedDate.getFullYear();
  });

  // Listen for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Table view received real-time update:', event.detail);
    };

    window.addEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
    return () => window.removeEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
  }, []);

  // Handle manual refresh
  const handleManualRefresh = async (clickedDate?: string) => {
    setIsRefreshing(true);
    const refreshDate = clickedDate || new Date().toISOString().split('T')[0];
    setRefreshingDate(refreshDate);
    
    try {
      console.log('🔄 Manual refresh triggered in table view');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdateTime(new Date().toLocaleTimeString());
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      setIsRefreshing(false);
      setRefreshingDate(null);
    }
  };

  // Auto-scroll to today's date when component first loads
  useEffect(() => {
    if (!loading && !hasAutoScrolled && filteredEntries.length > 0 && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      
      const todayEntry = filteredEntries.find(entry => entry.date === todayString);
      
      if (todayEntry) {
        setTimeout(() => {
          const todaySection = document.querySelector(`[data-date="${todayString}"]`);
          if (todaySection) {
            todaySection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            console.log(`📍 Auto-scrolled to today's date: ${todayString}`);
          }
        }, 100);
      }
      
      setHasAutoScrolled(true);
    }
  }, [loading, filteredEntries, hasAutoScrolled, selectedDate]);

  // Listen for roster updates
  useEffect(() => {
    const handleRosterUpdate = (event: CustomEvent) => {
      console.log('🔄 Table view: Roster updated, refreshing data...');
      if (onRefresh) {
        onRefresh();
      }
    };

    window.addEventListener('rosterUpdated', handleRosterUpdate as EventListener);
    return () => window.removeEventListener('rosterUpdated', handleRosterUpdate as EventListener);
  }, [onRefresh]);

  // Sort entries by date in ascending order
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group entries by date for sticky headers
  const groupedEntries = sortedEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, typeof sortedEntries>);

  // Handle showing details modal
  const handleShowDetails = (entry: RosterEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const handleEntryUpdate = (updatedEntry: RosterEntry) => {
    if (!isMountedRef.current) {
      console.warn('Component unmounted, skipping loadEntries call');
      return;
    }
    
    if (onRefresh) {
      onRefresh();
    }
  };

  // Handle special date long press
  const handleSpecialDateDoublePress = (date: string) => {
    console.log('🌟 SPECIAL DATE: Double tap detected on date:', date);
    setSelectedSpecialDate(date);
    setActionType('special');
    setSelectedShiftForAdd('');
    setSelectedStaffForAdd([]);
    setShowAuthModal(true);
    setAuthCode('');
    setAuthError('');
  };
  
  // Handle add staff long press (admin only)
  const handleDateCellLongPress = (date: string) => {
    console.log('👥 ADD STAFF: Long press detected on date:', date);
    setSelectedSpecialDate(date);
    setActionType('addStaff');
    setSelectedShiftForAdd(''); // Reset shift selection
    setSelectedStaffForAdd([]);
    setShowAuthModal(true);
    setAuthCode('');
    setAuthError('');
  };

  // Handle add staff long press
  const handleShiftCellLongPress = (date: string, shiftType: string) => {
    console.log('👥 ADD STAFF: Long press detected on shift:', { date, shiftType });
    setSelectedSpecialDate(date);
    setSelectedShiftForAdd(shiftType);
    setActionType('addStaff');
    
    // Get current staff for this shift
    const dateEntries = groupedEntries[date] || [];
    const currentEntries = dateEntries.filter(entry => entry.shift_type === shiftType);
    const currentStaff = currentEntries.map(entry => entry.assigned_name);
    setSelectedStaffForAdd(currentStaff);
    
    setShowAuthModal(true);
    setAuthCode('');
    setAuthError('');
  };

  // Handle authentication submit
  const handleAuthSubmit = () => {
    console.log('🔐 AUTH: Submit clicked with:', {
      authCode,
      actionType,
      selectedSpecialDate
    });

    const editorName = validateAuthCode(authCode);
    if (!editorName || !isAdminCode(authCode)) {
      setAuthError(!editorName ? 'Invalid authentication code' : 'Admin access required for special date marking');
      return;
    }

    console.log('✅ AUTH: Validation successful, editor:', editorName);

    if (actionType === 'special' && selectedSpecialDate) {
      console.log('🌟 AUTH: Opening special date modal for:', selectedSpecialDate);
      
      // Close auth modal first
      setShowAuthModal(false);
      setAuthCode('');
      setAuthError('');
      
      // Open special date modal with delay
      setTimeout(() => {
        console.log('🌟 AUTH: Actually opening special date modal now');
        setShowSpecialDateModal(true);
      }, 100);
    } else if (actionType === 'addStaff' && selectedSpecialDate) {
      console.log('👥 AUTH: Authentication successful for add staff, staying in modal for shift selection');
      // Don't close the auth modal yet - we need to show shift selection first
      setAuthError(''); // Clear any auth errors
    } else {
      console.error('❌ AUTH: Missing actionType or selectedSpecialDate:', {
        actionType,
        selectedSpecialDate
      });
      setAuthError('Invalid action or date selection');
    }
  };

  // Handle special date save
  const handleSpecialDateSave = async (isSpecial: boolean, info: string) => {
    if (!selectedSpecialDate) return;

    console.log('💾 SPECIAL DATE: Saving special date:', {
      date: selectedSpecialDate,
      isSpecial,
      info
    });

    try {
      const editorName = validateAuthCode(authCode) || 'ADMIN';
      
      if (isSpecial && info.trim()) {
        // Update all staff remarks for this date
        await updateAllStaffRemarksForDate(selectedSpecialDate, info.trim(), editorName);
      }
      
      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
      
      console.log('✅ SPECIAL DATE: Saved successfully');
    } catch (error) {
      console.error('❌ SPECIAL DATE: Save failed:', error);
      throw error;
    }
  };

  // Handle closing special date modal
  const handleCloseSpecialDateModal = () => {
    console.log('🌟 SPECIAL DATE: Closing modal');
    setShowSpecialDateModal(false);
    setSelectedSpecialDate(null);
    setActionType(null);
  };

  // Handle staff toggle for add staff
  const handleStaffToggle = (staffName: string) => {
    setSelectedStaffForAdd(prev => 
      prev.includes(staffName) 
        ? prev.filter(name => name !== staffName)
        : [...prev, staffName]
    );
  };

  // Handle save staff changes
  const handleSaveStaffChanges = async () => {
    if (!selectedSpecialDate || !selectedShiftForAdd || !authCode) return;
    
    setIsUpdating(true);
    
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      // Get current entries for this date and shift
      const dateEntries = groupedEntries[selectedSpecialDate] || [];
      const currentEntries = dateEntries.filter(entry => entry.shift_type === selectedShiftForAdd);
      const currentStaff = currentEntries.map(entry => entry.assigned_name);
      
      // Find staff to add and remove
      const staffToAdd = selectedStaffForAdd.filter(name => !currentStaff.includes(name));
      const staffToRemove = currentStaff.filter(name => !selectedStaffForAdd.includes(name));
      
      // Remove staff
      for (const entry of currentEntries) {
        if (staffToRemove.includes(entry.assigned_name)) {
          await deleteRosterEntry(entry.id);
        }
      }
      
      // Add new staff
      for (const staffName of staffToAdd) {
        await addRosterEntry({
          date: selectedSpecialDate,
          shiftType: selectedShiftForAdd,
          assignedName: staffName,
          changeDescription: `Added by ${editorName}`
        }, editorName);
      }
      
      // Force immediate refresh
      if (onRefresh) {
        await onRefresh();
      }
      
      // Close modal and reset states
      handleCloseAuthModal();
      
    } catch (error) {
      console.error('Failed to update roster:', error);
      alert('Failed to update roster. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle closing auth modal
  const handleCloseAuthModal = () => {
    console.log('🔐 AUTH: Closing modal');
    setShowAuthModal(false);
    setAuthCode('');
    setAuthError('');
    setActionType(null);
    setSelectedSpecialDate(null);
    setSelectedShiftForAdd('');
    setSelectedStaffForAdd([]);
  };

  // Check if date is today
  const isToday = (dateString: string) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString === today;
  };
  
  // Check if date is in the past
  const isPastDate = (dateString: string) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString < today;
  };

  // Check if date is in the future
  const isFutureDate = (dateString: string) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString > today;
  };

  // Format date for table display
  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return {
      dayName,
      dateString: `${day}-${month}-${year}`
    };
  };

  // Check if date has special info
  const getSpecialDateInfo = (date: string) => {
    const dateEntries = groupedEntries[date] || [];
    for (const entry of dateEntries) {
      if (entry.change_description && entry.change_description.includes('Special Date:')) {
        const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
    }
    return null;
  };

  // Check if date is marked as special
  const isSpecialDate = (date: string) => {
    return getSpecialDateInfo(date) !== null;
  };


  return (
    <>
      {/* Month Navigation Header */}
      <div className="bg-white rounded-lg mb-4 p-4 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg text-gray-600 transition-colors duration-200"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onExportToCalendar}
              className="p-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-200"
              title="Export to Calendar"
            >
              <Download className="w-3 h-3" />
            </button>
            <Calendar className="w-5 h-5 text-indigo-600" />
            
            {/* Month selector */}
            <select
              value={selectedDate.getMonth()}
              onChange={(e) => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(parseInt(e.target.value));
                onDateChange(newDate);
              }}
              disabled={isRefreshing}
              className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            
            {/* Year selector */}
            <select
              value={selectedDate.getFullYear()}
              onChange={(e) => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(parseInt(e.target.value));
                onDateChange(newDate);
              }}
              disabled={isRefreshing}
              className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer rounded px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            {/* Status indicators right next to the month text */}
            <div className="flex items-center space-x-2 ml-2">
              <button
                onClick={() => handleManualRefresh()}
                disabled={isRefreshing}
                className="p-2 rounded-lg text-gray-600 transition-colors duration-200"
                title="Manual refresh"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isRefreshing ? 1 : 0.7,
                  visibility: 'visible'
                }}
              >
                {isRefreshing ? (
                  <svg 
                    style={{
                      width: '18px',
                      height: '18px',
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                      // Prevent icon from causing shifts
                      transform: 'translate3d(0,0,0)',
                      backfaceVisibility: 'hidden'
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
                ) : (
                  <svg 
                    style={{
                      width: '18px',
                      height: '18px',
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                      // Prevent icon from causing shifts
                      transform: 'translate3d(0,0,0)',
                      backfaceVisibility: 'hidden'
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
                )}
              </button>
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                realtimeStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg text-gray-600 transition-colors duration-200"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : sortedEntries.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No roster entries found</p>
          <p className="text-gray-400 text-sm mt-2">No entries available for this month</p>
        </div>
      ) : (
        <div className="bg-white" style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          overflowX: 'hidden'
        }}>
          <div style={{ 
            height: window.innerWidth > window.innerHeight ? '60vh' : '70vh',
            minHeight: '400px',
            maxHeight: '80vh',
            WebkitOverflowScrolling: 'touch',
            overflowX: 'hidden',
            overflowY: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky',
                    top: '-2px',
                    zIndex: 150,
                    backgroundColor: '#000000',
                    color: 'white',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: '2px solid #374151',
                    width: '15%'
                  }}>
                    Date
                  </th>
                  <th style={{
                    position: 'sticky',
                    top: '-2px',
                    zIndex: 150,
                    backgroundColor: '#000000',
                    color: 'white',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid #374151',
                    width: '21.25%'
                  }}>
                    9-4
                  </th>
                  <th style={{
                    position: 'sticky',
                    top: '-2px',
                    zIndex: 150,
                    backgroundColor: '#000000',
                    color: 'white',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid #374151',
                    width: '21.25%'
                  }}>
                    12-10
                  </th>
                  <th style={{
                    position: 'sticky',
                    top: '-2px',
                    zIndex: 150,
                    backgroundColor: '#000000',
                    color: 'white',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid #374151',
                    width: '21.25%'
                  }}>
                    4-10
                  </th>
                  <th style={{
                    position: 'sticky',
                    top: '-2px',
                    zIndex: 150,
                    backgroundColor: '#000000',
                    color: 'white',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: '2px solid #374151',
                    width: '21.25%'
                  }}>
                    Night
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedEntries).map(([date, dateEntries]) => (
                  <tr key={date} style={{
                    backgroundColor: isToday(date) ? '#bbf7d0' : 
                                   isPastDate(date) ? '#fef2f2' :
                                   isFutureDate(date) ? '#f0fdf4' : '#ffffff',
                    background: isSpecialDate(date) ? '#fecaca' : 
                               isToday(date) ? '#bbf7d0' : 
                               isPastDate(date) ? '#fef2f2' :
                               isFutureDate(date) ? '#f0fdf4' : '#ffffff'
                  }}>
                    <RosterDateCell
                      date={date}
                      isToday={isToday(date)}
                      isPastDate={isPastDate(date)}
                      isFutureDate={isFutureDate(date)}
                      onDoublePress={() => handleSpecialDateDoublePress(date)}
                      onLongPress={() => handleDateCellLongPress(date)}
                      isSpecialDate={isSpecialDate(date) && getSpecialDateInfo(date) !== null}
                      specialDateInfo={getSpecialDateInfo(date)}
                      formatTableDate={formatTableDate}
                    />
                    
                    {shiftTypes.map(shiftType => {
                      const shiftEntries = dateEntries.filter(entry => entry.shift_type === shiftType);
                      
                      return (
                        <td key={shiftType} style={{
                          padding: '0',
                          margin: '0',
                          textAlign: 'center',
                          minHeight: '50px',
                          border: '2px solid #374151',
                          position: 'relative',
                          width: '21.25%',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}>
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const timer = setTimeout(() => {
                                handleShiftCellLongPress(date, shiftType);
                              }, 1000);
                              
                              const cleanup = () => {
                                clearTimeout(timer);
                                document.removeEventListener('mouseup', cleanup);
                                document.removeEventListener('mouseleave', cleanup);
                              };
                              
                              document.addEventListener('mouseup', cleanup);
                              document.addEventListener('mouseleave', cleanup);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              const timer = setTimeout(() => {
                                handleShiftCellLongPress(date, shiftType);
                              }, 1000);
                              
                              const cleanup = () => {
                                clearTimeout(timer);
                                document.removeEventListener('touchend', cleanup);
                                document.removeEventListener('touchcancel', cleanup);
                              };
                              
                              document.addEventListener('touchend', cleanup);
                              document.addEventListener('touchcancel', cleanup);
                            }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 5,
                              cursor: 'pointer',
                              touchAction: 'manipulation',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none'
                            }}
                            title="Long press to add/remove staff (Admin)"
                          />
                          
                          {isPastDate(date) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                              <div className="font-bold select-none" style={{
                                fontSize: window.innerWidth > window.innerHeight ? 'clamp(2rem, 8vw, 4rem)' : 'clamp(4rem, 12vw, 8rem)',
                                lineHeight: '1',
                                color: '#fca5a5',
                                opacity: 0.15,
                                transform: 'scale(1.5)'
                              }}>
                                X
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-1 relative z-60" style={{ 
                            minHeight: '50px',
                            padding: '4px 2px'
                          }}>
                            {shiftEntries.map((entry, index) => (
                              <RosterEntryCell
                                key={entry.id}
                                entry={entry}
                                onShowDetails={handleShowDetails}
                                fontSize={window.innerWidth > window.innerHeight ? '10px' : '12px'}
                                lineHeight={window.innerWidth > window.innerHeight ? '12px' : '14px'}
                                isSpecialDate={isSpecialDate(date)}
                                specialDateInfo={getSpecialDateInfo(date)}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[99999]"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAuthModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                {actionType === 'special' ? 'Admin Authentication Required' : 'Authentication Required'}
              </h3>
              
              {/* Staff Selection for Add Staff */}
              {actionType === 'addStaff' && selectedShiftForAdd && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Staff for {selectedShiftForAdd}
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {sortByGroup(availableNames).map(name => (
                      <label key={name} className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStaffForAdd.includes(name)}
                          onChange={() => handleStaffToggle(name)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Shift Selection for Add Staff - Show when authenticated but no shift selected */}
              {actionType === 'addStaff' && !selectedShiftForAdd && authCode.length >= 4 && isAdminCode(authCode) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Shift Type
                  </label>
                  <select
                    value={selectedShiftForAdd}
                    onChange={(e) => {
                      setSelectedShiftForAdd(e.target.value);
                      // Get current staff for this shift
                      if (e.target.value && selectedSpecialDate) {
                        const dateEntries = groupedEntries[selectedSpecialDate] || [];
                        const currentEntries = dateEntries.filter(entry => entry.shift_type === e.target.value);
                        const currentStaff = currentEntries.map(entry => entry.assigned_name);
                        setSelectedStaffForAdd(currentStaff);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select shift type</option>
                    {shiftTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Code
                </label>
                <input
                  type="text"
                  value={authCode}
                  disabled={isUpdating}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center font-mono text-lg"
                  placeholder="Enter admin code"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              
              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center">{authError}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCloseAuthModal}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={actionType === 'addStaff' ? handleSaveStaffChanges : handleAuthSubmit}
                  disabled={authCode.length < 4 || isUpdating || (actionType === 'addStaff' && !selectedShiftForAdd)}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : actionType === 'addStaff' && selectedShiftForAdd ? 'Save Changes' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Special Date Modal */}
      <SpecialDateModal
        isOpen={showSpecialDateModal}
        date={selectedSpecialDate}
        currentSpecialInfo={{
          isSpecial: selectedSpecialDate ? isSpecialDate(selectedSpecialDate) : false,
          info: selectedSpecialDate ? (getSpecialDateInfo(selectedSpecialDate) || '') : ''
        }}
        onSave={handleSpecialDateSave}
        onClose={handleCloseSpecialDateModal}
        authCode={authCode}
      />

      {/* Edit Details Modal */}
      <EditDetailsModal
        isOpen={showModal}
        entry={selectedEntry}
        onClose={() => {
          setShowModal(false);
          setSelectedEntry(null);
        }}
      />
    </>
  );
};