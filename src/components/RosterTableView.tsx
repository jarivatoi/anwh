import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, RefreshCw, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { RosterEntry, ViewType, ShiftFilterType } from '../types/roster';
import { EditDetailsModal } from './EditDetailsModal';
import { SpecialDateModal } from './SpecialDateModal';
import { RosterDateCell } from './RosterDateCell';
import { RosterEntryCell } from './RosterEntryCell';
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
  // All hooks must be declared at the top level before any conditional returns
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [refreshingDate, setRefreshingDate] = useState<string | null>(null);
  const [showSpecialDateModal, setShowSpecialDateModal] = useState(false);
  const [specialDateToEdit, setSpecialDateToEdit] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleDateChange = (date: Date) => {
    onDateChange(date);
    // Save to sessionStorage for persistence
    sessionStorage.setItem('rosterSelectedDate', date.toISOString());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    handleDateChange(newDate);
  };

  const formatMonthYear = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  };

  // Get the loadEntries function from the parent component
  // Listen for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Table view received real-time update:', event.detail);
      
      // Real-time changes will be reflected through the entries prop
    };

    window.addEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
    return () => window.removeEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
  }, []);

  // Handle manual refresh
  const handleManualRefresh = async (clickedDate?: string) => {
    setIsRefreshing(true);
    
    // Set the clicked date as the refreshing date (or today if not specified)
    const refreshDate = clickedDate || new Date().toISOString().split('T')[0];
    setRefreshingDate(refreshDate);
    
    try {
      console.log('🔄 Manual refresh triggered in table view');
      // Just show spinner for visual feedback - don't actually refresh
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

  // Add orientation change handler for table view
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('📱 Table view: Orientation change detected');
      // Simple orientation change handling - no complex animations to break
      console.log('📱 Table view: Orientation settled');
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // Auto-scroll to today's date when component first loads
  useEffect(() => {
    if (!loading && !hasAutoScrolled && filteredEntries.length > 0 && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if today's date exists in the entries
      const todayEntry = filteredEntries.find(entry => entry.date === todayString);
      
      if (todayEntry) {
        // Scroll to today's date section after a brief delay to ensure DOM is ready
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
      } else {
        console.log(`📍 Today's date (${todayString}) not found in roster entries - no auto-scroll`);
      }
      
      setHasAutoScrolled(true);
    }
  }, [loading, filteredEntries, hasAutoScrolled, selectedDate]);

  // Listen for roster updates
  useEffect(() => {
    const handleRosterUpdate = (event: CustomEvent) => {
      console.log('🔄 Table view: Roster updated, refreshing data...');
      
      // Also refresh from server
      if (onRefresh) {
        onRefresh();
      }
    };

    window.addEventListener('rosterUpdated', handleRosterUpdate as EventListener);
    return () => window.removeEventListener('rosterUpdated', handleRosterUpdate as EventListener);
  }, [onRefresh]);

  // Sort entries by date in ascending order (oldest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group entries by date for the table
  const groupedEntries = sortedEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, typeof sortedEntries>);

  // Custom sorting function to prioritize (R) names first
  const sortStaffNames = (entries: RosterEntry[]): RosterEntry[] => {
    // Extract names and sort them properly using sortByGroup
    const names = entries.map(e => e.assigned_name);
    const sortedNames = sortByGroup(names);
    
    // Create a map for quick lookup of original entries
    const entryMap = new Map<string, RosterEntry>();
    entries.forEach(entry => {
      entryMap.set(entry.assigned_name, entry);
    });
    
    // Return entries in the sorted order
    return sortedNames.map(name => entryMap.get(name)).filter(Boolean) as RosterEntry[];
  };

  const getShiftColor = (shiftType: string) => {
    const colorMap: Record<string, string> = {
      'Morning Shift (9-4)': 'bg-red-100 text-red-800 border-red-200',
      'Evening Shift (4-10)': 'bg-blue-100 text-blue-800 border-blue-200',
      'Saturday Regular (12-10)': 'bg-gray-100 text-gray-800 border-gray-200',
      'Night Duty': 'bg-green-100 text-green-800 border-green-200',
      'Sunday/Public Holiday/Special': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colorMap[shiftType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Format date for display in table
  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()].toUpperCase();
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);

    return `${dayName}\n${day}-${monthName}-${year}`;
  };

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

  // Define shift order for consistent display
  const shiftOrder = [
    'Morning Shift (9-4)',
    'Saturday Regular (12-10)',
    'Evening Shift (4-10)',
    'Night Duty',
    'Sunday/Public Holiday/Special'
  ];

  // Handle showing details modal
  const handleShowDetails = (entry: RosterEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const handleEntryUpdate = (updatedEntry: RosterEntry) => {
    // Check if component is still mounted before calling loadEntries
    if (!isMountedRef.current) {
      console.warn('Component unmounted, skipping loadEntries call');
      return;
    }
    
    if (onRefresh) {
      onRefresh();
    }
    
    // Also trigger a data refresh
    if (isMountedRef.current && onRefresh) {
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
      const dateEntries = groupedEntries[editingDate] || [];
      const currentEntries = dateEntries.filter(entry => entry.shift_type === selectedShift);
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
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;

      // Get current entries for this date and shift
      const dateEntries = groupedEntries[editingDate] || [];
      const currentEntries = dateEntries.filter(entry => entry.shift_type === selectedShift);
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
      
      // Force immediate refresh and re-render
      if (onRefresh) {
        await onRefresh();
      }
      setRefreshKey(prev => prev + 1);
      
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

  // Handle special date modal
  const handleSpecialDateSave = async (isSpecial: boolean, info: string) => {
    if (!specialDateToEdit || !authCode) return;
    
    const editorName = validateAuthCode(authCode);
    if (!editorName) return;
    
    try {
      // Update all staff remarks for this date
      await updateAllStaffRemarksForDate(specialDateToEdit, info, editorName);
      
      // Refresh data
      if (onRefresh) {
        await onRefresh();
      }
      
      setShowSpecialDateModal(false);
      setSpecialDateToEdit(null);
      setAuthCode('');
      
    } catch (error) {
      console.error('Failed to update special date:', error);
      alert('Failed to update special date. Please try again.');
    }
  };

  // Check if entry has been edited
  const hasBeenEdited = (entry: RosterEntry) => {
    // Simple logic: if last_edited_by exists, the entry has been edited
    return entry.change_description && 
           entry.change_description.includes('Name changed from') &&
           entry.last_edited_by;
  };

  // Check if date is today
  const isToday = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation to avoid iPhone timezone issues
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString === today;
  };
  
  // Check if date is in the past
  const isPastDate = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation to avoid iPhone timezone issues
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString < today;
  };

  // Check if date is in the future
  const isFutureDate = (dateString: string) => {
    const now = new Date();
    // Force local timezone calculation to avoid iPhone timezone issues
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    return dateString > today;
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
    <div className="bg-white rounded-lg overflow-hidden" style={{ 
      height: window.innerWidth > window.innerHeight ? '60vh' : '70vh', // Shorter in landscape
      minHeight: '400px',
      maxHeight: '80vh'
    }}>
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        {/* Month/Year Header with Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">{formatMonthYear()}</h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Export to Calendar Button */}
          <button
            onClick={onExportToCalendar}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export to Calendar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : sortedEntries.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            {loading ? 'Loading roster entries...' : 'No roster entries found'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {loading ? 'Please wait while we fetch the data' : `No entries available for ${formatMonthYear()}`}
          </p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto" style={{ 
          height: '100%',
          WebkitOverflowScrolling: 'touch' // Better mobile scrolling
        }}>
          <table className="w-full border-collapse" style={{
            tableLayout: 'fixed',
            width: '100%',
            borderSpacing: '0',
            border: 'none'
          }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 100 }}>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #374151' }}>
                <th style={{ 
                  width: '15%', 
                  padding: window.innerWidth > window.innerHeight ? '8px 4px' : '12px 8px',
                  textAlign: 'center',
                  fontSize: window.innerWidth > window.innerHeight ? '12px' : '14px',
                  fontWeight: 'bold',
                  color: '#374151',
                  border: '2px solid #374151',
                  backgroundColor: '#f9fafb'
                }}>
                  Date
                </th>
                {shiftOrder.map(shiftType => (
                  <th key={shiftType} style={{ 
                    width: '21.25%', // (100% - 15%) / 4 = 21.25%
                    padding: window.innerWidth > window.innerHeight ? '8px 4px' : '12px 8px',
                    textAlign: 'center',
                    fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px',
                    fontWeight: 'bold',
                    color: '#374151',
                    border: '2px solid #374151',
                    backgroundColor: '#f9fafb',
                    lineHeight: '1.2'
                  }}>
                    <ScrollingText 
                      text={shiftType === 'Morning Shift (9-4)' ? 'Morning\n(9-4)' :
                           shiftType === 'Saturday Regular (12-10)' ? 'Saturday\n(12-10)' :
                           shiftType === 'Evening Shift (4-10)' ? 'Evening\n(4-10)' :
                           shiftType === 'Night Duty' ? 'Night\nDuty' :
                           shiftType === 'Sunday/Public Holiday/Special' ? 'Special\n(9-4)' : shiftType}
                      className="font-bold text-center"
                      style={{
                        whiteSpace: 'pre-line',
                        fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px'
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedEntries).map(([date, dateEntries]) => {
                const shiftGroups = groupEntriesByShift(dateEntries);
                
                return (
                  <tr key={date} data-date={date}>
                    {/* Date Cell */}
                    <RosterDateCell
                      date={date}
                      isToday={isToday(date)}
                      isPastDate={isPastDate(date)}
                      isFutureDate={isFutureDate(date)}
                      onDoublePress={() => {
                        setSpecialDateToEdit(date);
                        setShowSpecialDateModal(true);
                      }}
                      onLongPress={() => handleEditClick(date)}
                      isSpecialDate={isSpecialDate(date)}
                      specialDateInfo={getSpecialDateInfo(date)}
                    />
                    
                    {/* Shift Cells */}
                    {shiftOrder.map(shiftType => {
                      const shiftEntries = shiftGroups[shiftType];
                      
                      return (
                        <td key={shiftType} style={{ 
                          padding: '4px',
                          textAlign: 'center',
                          minHeight: '50px',
                          border: 'none',
                          margin: 0,
                          backgroundColor: '#ffffff',
                          opacity: 1,
                          border: '2px solid #374151',
                          width: '21.25%',
                          position: 'relative',
                          // Force proper rendering after orientation change
                          transform: 'translate3d(0,0,0)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          WebkitTransform: 'translate3d(0,0,0)'
                        }}>
                          {/* X watermark for past dates - centered over entire cell */}
                          {isPastDate(date) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
                          
                          {/* Staff Names */}
                          <div className="space-y-1 relative" style={{ 
                            zIndex: 30, 
                            minHeight: window.innerWidth > window.innerHeight ? '60px' : '80px', // Shorter in landscape
                            position: 'relative'
                          }}>
                            {shiftEntries && shiftEntries.length > 0 ? (
                              shiftEntries.map((entry, index) => (
                                <div key={entry.id} className="relative" style={{ zIndex: 30 }}>
                                  <RosterEntryCell
                                    entry={entry}
                                    onShowDetails={handleShowDetails}
                                    onUpdate={handleEntryUpdate}
                                    allEntriesForShift={shiftEntries}
                                    isSpecialDate={isSpecialDate(date)}
                                    specialDateInfo={getSpecialDateInfo(date)}
                                  />
                                </div>
                              ))
                            ) : (
                              <div style={{ 
                                height: window.innerWidth > window.innerHeight ? '60px' : '80px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {/* Empty cell */}
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

      {/* Add CSS for refresh animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        @keyframes scroll-text {
          0% { transform: translateX(0%); }
          25% { transform: translateX(0%); }
          75% { transform: translateX(-100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

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
                <div className="flex justify-center space-x-3">
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
      )}

      {/* Staff Selection Modal */}
      {editingDate && selectedShift && authCode && !showAuthModal && (
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
                {formatTableDate(editingDate)} ({new Date(editingDate).toLocaleDateString('en-US', { weekday: 'long' })}) - {selectedShift}
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
                      checked={selectedStaff.includes(name)}
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

      {/* Special Date Modal */}
      <SpecialDateModal
        isOpen={showSpecialDateModal}
        date={specialDateToEdit}
        currentSpecialInfo={{
          isSpecial: specialDateToEdit ? isSpecialDate(specialDateToEdit) : false,
          info: specialDateToEdit ? getSpecialDateInfo(specialDateToEdit) || '' : ''
        }}
        onSave={handleSpecialDateSave}
        onClose={() => {
          setShowSpecialDateModal(false);
          setSpecialDateToEdit(null);
          setAuthCode('');
        }}
        authCode={authCode}
      />
    </div>
  );
};