import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Edit, FileText, Download, RefreshCw, Star, AlertTriangle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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
  const [selectedShift, setSelectedShift] = useState<string>('');
  
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

  // Check if date is special
  const isSpecialDate = (dateString: string) => {
    const dateEntries = groupedEntries[dateString] || [];
    return dateEntries.some(entry => entry.staff_remarks && entry.staff_remarks.trim() !== '');
  };

  // Get special date info
  const getSpecialDateInfo = (dateString: string) => {
    const dateEntries = groupedEntries[dateString] || [];
    const specialEntry = dateEntries.find(entry => entry.staff_remarks && entry.staff_remarks.trim() !== '');
    return specialEntry?.staff_remarks || null;
  };

  // Format date for table display
  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    return { day, dayName };
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation Header */}
      <div className="bg-white rounded-lg mb-4 p-4 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between w-full">
          {/* Left Arrow */}
          <button
            onClick={() => navigateMonth('prev')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              width: '44px',
              height: '44px'
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {/* Center Content - Equally distributed */}
          <div className="flex items-center justify-center flex-1 space-x-6">
            {/* Calendar Icon */}
            <div className="flex justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            
            {/* Month Selector */}
            <div className="flex justify-center">
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
                  textAlign: 'center',
                  minWidth: '120px'
                }}
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
            
            {/* Export Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  console.log('🔄 ROSTER TABLE: Export to Calendar button clicked');
                  onExportToCalendar();
                }}
                className="p-3 rounded-lg text-green-600 flex items-center justify-center"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '44px',
                  height: '44px'
                }}
                title="Export your shifts to calendar"
              >
                <Download className="w-8 h-8" />
              </button>
            </div>
            
            {/* Refresh Button with Spinner and Dot */}
            <div className="flex justify-center relative">
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    console.log('🔄 Manual refresh triggered from month selector');
                    if (onRefresh) {
                      await onRefresh();
                    }
                    setRefreshKey(prev => prev + 1);
                    setLastUpdateTime(new Date().toLocaleTimeString());
                    console.log('✅ Manual refresh completed');
                  } catch (error) {
                    console.error('Manual refresh failed:', error);
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="p-3 rounded-lg text-blue-600 flex items-center justify-center"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: '44px',
                  height: '44px'
                }}
                title={
                  realtimeStatus === 'connected' ? 'Manual refresh (Real-time active)' :
                  realtimeStatus === 'connecting' ? 'Manual refresh (Connecting...)' :
                  realtimeStatus === 'error' ? 'Manual refresh (Real-time failed)' :
                  'Manual refresh (Real-time disconnected)'
                }
              >
                <div className="flex items-center space-x-1">
                  <RotateCcw 
                    className={`w-7 h-7 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  
                  {/* Real-time status dot - same level as icon */}
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: realtimeStatus === 'connected' ? '#10b981' : 
                                      realtimeStatus === 'connecting' ? '#f59e0b' :
                                      realtimeStatus === 'error' ? '#ef4444' : '#6b7280',
                      animation: realtimeStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                      boxShadow: realtimeStatus === 'connected' ? '0 0 6px rgba(16, 185, 129, 0.8)' : 'none'
                    }}
                  />
                </div>
              </button>
            </div>
          </div>
          
          {/* Right Arrow */}
          <button
            onClick={() => navigateMonth('next')}
            className="p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200 flex items-center justify-center flex-shrink-0"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              width: '44px',
              height: '44px'
            }}
          >
            <ChevronRight className="w-6 h-6" />
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
                          backgroundColor: isSpecialDate(date) ? '#fecaca' : 
                                         isToday(date) ? '#bbf7d0' : 
                                         isPastDate(date) ? '#fef2f2' :
                                         isFutureDate(date) ? '#f0fdf4' : '#ffffff'
                        }}
                        onTouchStart={() => {
                          const timer = setTimeout(() => {
                            handleShiftCellLongPress(date, shiftType);
                          }, 800);
                          setLongPressTimer(timer);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            setLongPressTimer(null);
                          }
                        }}
                        onTouchCancel={() => {
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            setLongPressTimer(null);
                          }
                        }}
                        >
                          {shiftEntries.length === 0 ? (
                            <div style={{
                              padding: '8px',
                              minHeight: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#9ca3af',
                              fontSize: '12px'
                            }}>
                              -
                            </div>
                          ) : (
                            <div style={{
                              padding: '4px',
                              minHeight: '50px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              {shiftEntries.map((entry, index) => (
                                <RosterEntryCell
                                  key={entry.id}
                                  entry={entry}
                                  onClick={() => handleShowDetails(entry)}
                                  isRefreshing={refreshingDate === entry.date}
                                />
                              ))}
                            </div>
                          )}
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

      {/* Edit Details Modal */}
      {showModal && selectedEntry && (
        <EditDetailsModal
          entry={selectedEntry}
          onClose={() => {
            setShowModal(false);
            setSelectedEntry(null);
          }}
          onUpdate={handleEntryUpdate}
        />
      )}

      {/* Special Date Modal */}
      {showSpecialDateModal && selectedSpecialDate && (
        <SpecialDateModal
          date={selectedSpecialDate}
          currentInfo={getSpecialDateInfo(selectedSpecialDate)}
          onSave={handleSpecialDateSave}
          onClose={handleCloseSpecialDateModal}
        />
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" style={{ touchAction: 'none' }}>
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {actionType === 'special' ? 'Mark Special Date' : 'Modify Staff Assignment'}
              </h3>
              
              {actionType === 'special' ? (
                <p className="text-gray-600 mb-4">
                  Enter your authentication code to mark this date as special:
                </p>
              ) : (
                <div className="space-y-4 mb-4">
                  <p className="text-gray-600">
                    Enter your authentication code to modify staff assignments:
                  </p>
                  
                  {selectedSpecialDate && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium">Date: {new Date(selectedSpecialDate).toLocaleDateString()}</p>
                      {selectedShiftForAdd && (
                        <p className="text-sm text-gray-600">Shift: {selectedShiftForAdd}</p>
                      )}
                    </div>
                  )}
                  
                  {selectedShiftForAdd && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Staff for {selectedShiftForAdd} shift:
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {availableNames.map(name => (
                          <label key={name} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={selectedStaffForAdd.includes(name)}
                              onChange={() => handleStaffToggle(name)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm">{name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Code
                  </label>
                  <input
                    type="password"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your code"
                    autoFocus
                  />
                  {authError && (
                    <p className="text-red-600 text-sm mt-1">{authError}</p>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={actionType === 'special' ? handleAuthSubmit : handleSaveStaffChanges}
                    disabled={!authCode.trim() || isUpdating}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : actionType === 'special' ? 'Continue' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCloseAuthModal}
                    disabled={isUpdating}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};