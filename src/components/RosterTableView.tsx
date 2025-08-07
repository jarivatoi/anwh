import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Edit, FileText, Download, RefreshCw, Star, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
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
  const [preventAutoScroll, setPreventAutoScroll] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastTabSwitch, setLastTabSwitch] = useState(0);
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);
  
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
  const [showPassword, setShowPassword] = useState(false);
  
  const isMountedRef = useRef(true);

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

  // Navigation functions
  const navigateToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };
  
  const navigateToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  const handleMonthYearChange = (month: number, year: number) => {
    const newDate = new Date(year, month, 1);
    onDateChange(newDate);
    setShowMonthYearSelector(false);
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

  // Navigation functions
  const navigateToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };
  
  const navigateToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  const handleMonthYearChange = (month: number, year: number) => {
    const newDate = new Date(year, month, 1);
    onDateChange(newDate);
    setShowMonthYearSelector(false);
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
          {/* Left Arrow */}
          <button
            onClick={navigateToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Center Content - Calendar and Month (clickable) */}
          <div className="flex items-center justify-center flex-1 min-w-0">
            <Calendar className="w-6 h-6 text-indigo-600 mr-2" />
            
            {/* Clickable Month/Year Display */}
            <button
              onClick={() => setShowMonthYearSelector(true)}
              disabled={isRefreshing}
              className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {formatMonthYear()}
            </button>
          </div>
          
          {/* Right Arrow */}
          <button
            onClick={navigateToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Export Button Row */}
        <div className="flex items-center justify-center mt-3">
          <button
            onClick={onExportToCalendar}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
            title="Export to Calendar"
          >
            <Download className="w-4 h-4" />
            <span>Export to Calendar</span>
          </button>
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
                  <tr key={date} data-date={date} style={{
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
                      isSpecialDate={isSpecialDate(date)}
                      specialDateInfo={getSpecialDateInfo(date)}
                    />
                    
                    {shiftTypes.map(shiftType => {
                      const shiftEntries = dateEntries.filter(entry => entry.shift_type === shiftType);
                     
                      // Sort entries to prioritize SMIT staff first
                      const sortedShiftEntries = sortByGroup(shiftEntries.map(e => e.assigned_name))
                        .map(name => shiftEntries.find(e => e.assigned_name === name))
                        .filter(Boolean) as RosterEntry[];
                      
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
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 5,
                              touchAction: 'manipulation',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none'
                            }}
                          />
                          
                          <div className="space-y-1 relative z-60" style={{ 
                            minHeight: '50px',
                            padding: '4px 2px'
                          }}>
                            {/* X watermark - only show for past dates AND when there are entries */}
                            {isPastDate(date) && shiftEntries.length > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="font-bold select-none" style={{
                                  fontSize: window.innerWidth > window.innerHeight ? 'clamp(1.5rem, 6vw, 3rem)' : 'clamp(3rem, 10vw, 6rem)',
                                  lineHeight: '1',
                                  color: '#fca5a5',
                                  opacity: 0.2,
                                  transform: 'scale(1.5)'
                                }}>
                                  X
                                </div>
                              </div>
                            )}
                            
                            {sortedShiftEntries.map((entry, index) => (
                              <RosterEntryCell
                                key={entry.id}
                                entry={entry}
                                onUpdate={handleEntryUpdate}
                                onShowDetails={handleShowDetails}
                                allEntriesForShift={sortedShiftEntries}
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

      {/* Month/Year Selector Modal */}
      {showMonthYearSelector && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMonthYearSelector(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full"
            style={{
              maxWidth: '28rem',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Select Month and Year
              </h3>
              
              <div className="space-y-4">
                {/* Month Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Month
                  </label>
                  <select
                    value={selectedDate.getMonth()}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      handleMonthYearChange(newMonth, selectedDate.getFullYear());
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                </div>
                
                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedDate.getFullYear()}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      handleMonthYearChange(selectedDate.getMonth(), newYear);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowMonthYearSelector(false)}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '4px' : '16px',
            paddingTop: window.innerWidth > window.innerHeight ? '2px' : '16px',
            overflow: 'auto',
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAuthModal();
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
              touchAction: 'auto',
              overflow: 'hidden',
              margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px'
            }}>
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
                    style={{
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
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
              
              {/* Shift Selection - Show when admin code is valid and action is addStaff */}
              {actionType === 'addStaff' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Shift Type
                  </label>
                  <select
                    value={selectedShiftForAdd}
                    onChange={(e) => {
                      setSelectedShiftForAdd(e.target.value);
                      // Get current staff for this shift when selection changes
                      if (e.target.value && selectedSpecialDate) {
                        const dateEntries = groupedEntries[selectedSpecialDate] || [];
                        const currentEntries = dateEntries.filter(entry => entry.shift_type === e.target.value);
                        const currentStaff = currentEntries.map(entry => entry.assigned_name);
                        setSelectedStaffForAdd(currentStaff);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select shift type</option>
                    {shiftTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCloseAuthModal}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthSubmit}
                  disabled={authCode.length < 4 || !isAdminCode(authCode) || isUpdating || (actionType === 'addStaff' && !selectedShiftForAdd)}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Selection Modal - Show after shift is selected */}
      {actionType === 'addStaff' && selectedSpecialDate && selectedShiftForAdd && authCode && !showAuthModal && (
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
            alignItems: window.innerWidth > window.innerHeight ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: window.innerWidth > window.innerHeight ? '8px' : '16px',
            paddingTop: window.innerWidth > window.innerHeight ? '4px' : '16px',
            overflow: 'auto',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{
            maxWidth: window.innerWidth > window.innerHeight ? '90vw' : '28rem',
            maxHeight: window.innerWidth > window.innerHeight ? '95vh' : '90vh',
            margin: window.innerWidth > window.innerHeight ? '4px 0' : '16px 0',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}>
            <div className="border-b border-gray-200 flex-shrink-0" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                Edit Staff Assignment
              </h3>
              <p className="text-sm text-gray-600 text-center select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                {selectedSpecialDate && formatTableDate(selectedSpecialDate).dateString} ({selectedSpecialDate && new Date(selectedSpecialDate).toLocaleDateString('en-US', { weekday: 'long' })}) - {selectedShiftForAdd}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <div className="space-y-3">
                {availableNames.map(name => (
                  <label key={name} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedStaffForAdd.includes(name)}
                      onChange={() => handleStaffToggle(name)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-900 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>{name}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="border-t border-gray-200 flex-shrink-0" style={{
              padding: window.innerWidth > window.innerHeight ? '12px' : '24px',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}>
              <div className="flex space-x-3">
                <button
                  onClick={handleCloseAuthModal}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveStaffChanges}
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
    } else {
      // For addStaff action, close auth modal and let the separate staff modal handle it
      setShowAuthModal(false);
      setAuthError('');
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
      
      // Always update staff remarks - either with new info or empty string to clear
      await updateAllStaffRemarksForDate(selectedSpecialDate, isSpecial ? info.trim() : '', editorName);
      
      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
      
      // Force refresh key to trigger re-render
      setRefreshKey(prev => prev + 1);
      
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
      
      // Force refresh key to trigger re-render
      setRefreshKey(prev => prev + 1);
      
      // Close modal and reset states
      handleCloseAuthModal();
      
    } catch (error) {
      console.error('Failed to update roster:', error);
      alert('Failed to update roster. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
      
}