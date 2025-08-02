import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Download, RefreshCw } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { EditDetailsModal } from './EditDetailsModal';
import { RosterEntryCell } from './RosterEntryCell';
import { RosterDateCell } from './RosterDateCell';
import { availableNames, validateAuthCode, shiftTypes, isAdminCode } from '../utils/rosterAuth';
import { addRosterEntry, deleteRosterEntry } from '../utils/rosterApi';

interface RosterTableViewProps {
  entries: RosterEntry[];
  loading: boolean;
  realtimeStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  onRefresh?: () => Promise<void>;
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
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localEntries, setLocalEntries] = useState<RosterEntry[]>([]);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  // Filter entries based on selected date (show entries for the selected month)
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedDate.getMonth() && 
           entryDate.getFullYear() === selectedDate.getFullYear();
  });

  // Track mounted status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Table view received real-time update:', event.detail);
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
    return () => window.removeEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
  }, []);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered in table view');
      if (onRefresh) {
        await onRefresh();
      }
      setRefreshKey(prev => prev + 1);
      setLocalEntries(filteredEntries);
      
      setTimeout(() => {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const todaySection = document.querySelector(`[data-date="${todayString}"]`);
        if (todaySection) {
          todaySection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log('📍 Scrolled to today\'s date after refresh');
        }
      }, 100);
      
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update local entries when prop changes
  useEffect(() => {
    setLocalEntries(filteredEntries);
  }, [filteredEntries]);

  // Listen for roster updates
  useEffect(() => {
    const handleRosterUpdate = (event: CustomEvent) => {
      console.log('🔄 Table view: Roster updated, refreshing data...');
      
      if (event.detail) {
        const updatedEntry = event.detail;
        setLocalEntries(prev => prev.map(entry => 
          entry.id === updatedEntry.id ? updatedEntry : entry
        ));
      }
      
      if (onRefresh) {
        onRefresh();
      }
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('rosterUpdated', handleRosterUpdate as EventListener);
    return () => window.removeEventListener('rosterUpdated', handleRosterUpdate as EventListener);
  }, [onRefresh]);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  // Format month/year for display
  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  // Get unique dates from entries and sort them
  const getUniqueDates = () => {
    const dates = [...new Set(filteredEntries.map(entry => entry.date))];
    return dates.sort();
  };

  // Get unique shift types from entries
  const getUniqueShiftTypes = () => {
    const shifts = [...new Set(filteredEntries.map(entry => entry.shift_type))];
    return shifts.sort();
  };

  // Group entries by date and shift
  const groupEntriesByDateAndShift = () => {
    const grouped: Record<string, Record<string, RosterEntry[]>> = {};
    
    filteredEntries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = {};
      }
      if (!grouped[entry.date][entry.shift_type]) {
        grouped[entry.date][entry.shift_type] = [];
      }
      grouped[entry.date][entry.shift_type].push(entry);
    });
    
    return grouped;
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
    setRefreshKey(prev => prev + 1);
    
    if (isMountedRef.current && onRefresh) {
      onRefresh();
    }
  };

  const uniqueDates = getUniqueDates();
  const uniqueShiftTypes = getUniqueShiftTypes();
  const groupedEntries = groupEntriesByDateAndShift();

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ 
      height: window.innerWidth > window.innerHeight ? '60vh' : '70vh',
      minHeight: '400px',
      maxHeight: '80vh'
    }}>
      {/* Month Navigation Header - FIXED ALIGNMENT */}
      <div className="sticky top-0 z-50 bg-white border-b-2 border-indigo-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Previous Month Button */}
          <button
            onClick={() => navigateMonth('prev')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors duration-200"
            style={{
              minWidth: '40px',
              flexShrink: 0
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Center: Month/Year Display - PROPERLY CENTERED */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">
                {formatMonthYear()}
              </h3>
              <div className="text-sm text-gray-600">
                {filteredEntries.length} entries
              </div>
            </div>
          </div>

          {/* Right: Next Month Button */}
          <button
            onClick={() => navigateMonth('next')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors duration-200"
            style={{
              minWidth: '40px',
              flexShrink: 0
            }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Row - EVENLY DISTRIBUTED */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-3">
            {/* Export to Calendar Button */}
            <button
              onClick={onExportToCalendar}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Switch to Calendar Button */}
            <button
              onClick={() => setActiveTab('calendar')}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            No roster entries found
          </p>
          <p className="text-gray-400 text-sm mt-2">
            No entries available for {formatMonthYear()}
          </p>
        </div>
      ) : (
        <div style={{ 
          height: '100%', 
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: '0',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 100,
                  padding: '8px 4px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: '#4f46e5',
                  background: '#4f46e5',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  width: '80px',
                  minWidth: '80px',
                  maxWidth: '80px'
                }}>
                  Date
                </th>
                {uniqueShiftTypes.map(shiftType => (
                  <th key={shiftType} style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 90,
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: window.innerWidth > window.innerHeight ? '10px' : '11px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: '#4f46e5',
                    background: '#4f46e5',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    minWidth: window.innerWidth > window.innerHeight ? '80px' : '100px',
                    maxWidth: window.innerWidth > window.innerHeight ? '120px' : '150px'
                  }}>
                    {shiftType === 'Morning Shift (9-4)' ? 'Morning 9-4' :
                     shiftType === 'Saturday Regular (12-10)' ? 'Saturday 12-10' :
                     shiftType === 'Evening Shift (4-10)' ? 'Evening 4-10' :
                     shiftType === 'Night Duty' ? 'Night Duty' :
                     shiftType === 'Sunday/Public Holiday/Special' ? 'Special 9-4' : shiftType}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueDates.map(date => (
                <tr key={date} data-date={date}>
                  <RosterDateCell
                    date={date}
                    isToday={isToday(date)}
                    isPastDate={isPastDate(date)}
                    isFutureDate={isFutureDate(date)}
                    onLongPress={() => {}}
                    formatTableDate={formatTableDate}
                  />
                  {uniqueShiftTypes.map(shiftType => {
                    const entriesForCell = groupedEntries[date]?.[shiftType] || [];
                    
                    return (
                      <td key={`${date}-${shiftType}`} style={{
                        padding: '2px',
                        textAlign: 'center',
                        verticalAlign: 'top',
                        border: 'none',
                        minHeight: '40px',
                        position: 'relative',
                        minWidth: window.innerWidth > window.innerHeight ? '80px' : '100px',
                        maxWidth: window.innerWidth > window.innerHeight ? '120px' : '150px'
                      }}>
                        {isPastDate(date) && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: window.innerWidth > window.innerHeight ? 'clamp(1.5rem, 6vw, 3rem)' : 'clamp(3rem, 10vw, 6rem)',
                            lineHeight: '1',
                            color: '#fca5a5',
                            opacity: 0.3,
                            pointerEvents: 'none',
                            zIndex: 5,
                            fontWeight: 'bold'
                          }}>
                            ✕
                          </div>
                        )}
                        
                        <div className="space-y-1" style={{ 
                          position: 'relative', 
                          zIndex: 10,
                          minHeight: window.innerWidth > window.innerHeight ? '30px' : '40px'
                        }}>
                          {entriesForCell.map(entry => (
                            <RosterEntryCell
                              key={entry.id}
                              entry={entry}
                              onUpdate={handleEntryUpdate}
                              onShowDetails={handleShowDetails}
                              allEntriesForShift={entriesForCell}
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
      )}

      {/* Edit Details Modal */}
      <EditDetailsModal
        isOpen={showModal}
        entry={selectedEntry}
        onClose={() => {
          setShowModal(false);
          setSelectedEntry(null);
        }}
      />
    </div>
  );
};