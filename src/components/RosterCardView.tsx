import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Edit, FileText } from 'lucide-react';
import { RosterEntry, ShiftFilterType } from '../types/roster';
import { EditDetailsModal } from './EditDetailsModal';
import { RosterCardItem } from './RosterCardItem';
import { RosterDateHeaderButton } from './RosterDateHeaderButton';
import { ScrollingText } from './ScrollingText';
import { availableNames, validateAuthCode, shiftTypes, isAdminCode } from '../utils/rosterAuth';
import { addRosterEntry, deleteRosterEntry } from '../utils/rosterApi';

interface RosterCardViewProps {
  entries: RosterEntry[];
  loading: boolean;
  realtimeStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  onRefresh?: () => Promise<void>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const RosterCardView: React.FC<RosterCardViewProps> = ({
  entries,
  loading,
  realtimeStatus = 'disconnected',
  onRefresh,
  selectedDate,
  onDateChange
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

  // Get the loadEntries function from the parent component
  // Listen for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Card view received real-time update:', event.detail);
      
      // Real-time changes will be reflected through the entries prop
    };

    window.addEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
    return () => window.removeEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
  }, []);

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered in card view');
      // Just show the spinner - data will update through real-time or other means
      // Don't call onRefresh to prevent any reload effects
      
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add orientation change handler for card view
  useEffect(() => {
    const handleOrientationChange = () => {
      console.log('📱 Card view: Orientation change detected');
      // Simple orientation change handling - no complex animations to break
      console.log('📱 Card view: Orientation settled');
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
      console.log('🔄 Card view: Roster updated, refreshing data...');
      
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

  // Group entries by date for sticky headers
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
    return [...entries].sort((a, b) => {
      const aHasR = a.assigned_name.includes('(R)');
      const bHasR = b.assigned_name.includes('(R)');
      
      // If one has (R) and other doesn't, (R) comes first
      if (aHasR && !bHasR) return -1;
      if (!aHasR && bHasR) return 1;
      
      // If both have (R) or both don't have (R), sort alphabetically
      return a.assigned_name.localeCompare(b.assigned_name);
    });
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

  // Format date for display (01-07-25)
  const formatCardDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
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

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ 
      height: window.innerWidth > window.innerHeight ? '60vh' : '70vh', // Shorter in landscape
      minHeight: '400px',
      maxHeight: '80vh'
    }}>
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
              {loading ? 'Please wait while we fetch the data' : 'No entries available'}
            </p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto" style={{ 
            height: '100%',
            WebkitOverflowScrolling: 'touch' // Better mobile scrolling
          }}>
            {Object.entries(groupedEntries).map(([date, dateEntries]) => {
              const shiftGroups = groupEntriesByShift(dateEntries);
              
              return (
                <div key={date} data-date={date}>
                  {/* Sticky Date Header */}
                  <RosterDateHeaderButton
                    date={date}
                    onLongPress={() => {
                      setEditingDate(date);
                      setShowAuthModal(true);
                    }}
                    isToday={isToday}
                    realtimeStatus={realtimeStatus}
                    onManualRefresh={handleManualRefresh}
                    isRefreshing={isRefreshing}
                  />
                  
                  {/* Shift Tabs for this date */}
                  <div className="grid gap-2" style={{
                    gridTemplateColumns: window.innerWidth > window.innerHeight ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', // 4 columns in landscape
                    padding: window.innerWidth > window.innerHeight ? '8px' : '16px' // Less padding in landscape
                  }}>
                    {shiftOrder.map(shiftType => {
                      const shiftEntries = shiftGroups[shiftType];
                      if (!shiftEntries || shiftEntries.length === 0) return null;
                      
                      return (
                        <div key={shiftType} className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm min-w-0 flex-1 relative">
                          {/* BIG X WATERMARK for past dates - ON EACH SHIFT BOX */}
                          {isPastDate(date) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" style={{
                                // Centered within content area only, avoiding header
                                top: window.innerWidth > window.innerHeight ? '24px' : '32px', // Adjust for landscape
                                left: '8px',
                                right: '8px', 
                                bottom: window.innerWidth > window.innerHeight ? '16px' : '24px' // Less padding in landscape
                            }}>
                              <div className="font-bold select-none" style={{
                                fontSize: window.innerWidth > window.innerHeight ? 'clamp(2rem, 8vw, 4rem)' : 'clamp(4rem, 12vw, 8rem)', // Smaller in landscape
                                lineHeight: '1',
                                color: '#fca5a5',
                                opacity: 0.2,
                                transform: 'scale(1.8)'
                              }}>
                                ✕
                              </div>
                            </div>
                          )}
                          
                          {/* Shift Header */}
                          <div className={`text-center font-bold ${getShiftColor(shiftType)}`} style={{
                            padding: window.innerWidth > window.innerHeight ? '4px' : '8px', // Less padding in landscape
                            fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px' // Smaller text in landscape
                          }}>
                            <ScrollingText 
                              text={shiftType === 'Morning Shift (9-4)' ? 'Shift 9-4' :
                                   shiftType === 'Saturday Regular (12-10)' ? 'Shift 12-10' :
                                   shiftType === 'Evening Shift (4-10)' ? 'Shift 4-10' :
                                   shiftType === 'Night Duty' ? 'Night Duty' :
                                   shiftType === 'Sunday/Public Holiday/Special' ? 'Special 9-4' : shiftType}
                              className="font-bold"
                            />
                          </div>
                          
                          {/* Names List */}
                          <div className="space-y-1 relative" style={{ 
                            zIndex: 30, 
                            minHeight: window.innerWidth > window.innerHeight ? '60px' : '80px', // Shorter in landscape
                            position: 'relative',
                            padding: window.innerWidth > window.innerHeight ? '4px' : '8px' // Less padding in landscape
                          }}>
                            {shiftEntries.map((entry, index) => (
                             <div key={entry.id} className="relative" style={{ zIndex: 30 }}>
                                <RosterCardItem
                                  entry={entry}
                                  onShowDetails={handleShowDetails}
                                  onUpdate={handleEntryUpdate}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
      {editingDate && selectedShift && authCode && !showAuthModal && createPortal(
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
                {formatCardDate(editingDate)} ({new Date(editingDate).toLocaleDateString('en-US', { weekday: 'long' })}) - {selectedShift}
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
        , document.body
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