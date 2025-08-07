import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Edit, FileText, RefreshCw, Download } from 'lucide-react';
import { RosterEntry, ShiftFilterType } from '../types/roster';
import { EditDetailsModal } from './EditDetailsModal';
import { RosterEntryCell } from './RosterEntryCell';
import { RosterDateCell } from './RosterDateCell';
import { SpecialDateModal } from './SpecialDateModal';
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
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
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

  // Listen for scroll to edited entry event only
  useEffect(() => {
    const handleScrollToEditedEntry = (event: CustomEvent) => {
      const { entryId, date } = event.detail;
      console.log(`📍 Scrolling to edited entry: ${entryId} on ${date}`);
      
      setTimeout(() => {
        const editedElement = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (editedElement) {
          editedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log(`📍 Scrolled to edited entry: ${entryId}`);
          
          // Add highlight effect to the edited entry
          editedElement.style.transition = 'all 0.3s ease';
          editedElement.style.transform = 'scale(1.05)';
          editedElement.style.boxShadow = '0 0 20px rgba(255, 193, 7, 0.8)';
          editedElement.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
          
          // Remove highlight after animation
          setTimeout(() => {
            editedElement.style.transform = '';
            editedElement.style.boxShadow = '';
            editedElement.style.backgroundColor = '';
          }, 2000);
        } else {
          // Fallback: scroll to the date section
          const dateSection = document.querySelector(`[data-date="${date}"]`);
          if (dateSection) {
            dateSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            console.log(`📍 Scrolled to date section: ${date}`);
          }
        }
      }, 100);
    };

    window.addEventListener('scrollToEditedEntry', handleScrollToEditedEntry as EventListener);
    return () => window.removeEventListener('scrollToEditedEntry', handleScrollToEditedEntry as EventListener);
  }, []);

  // Listen for roster updates
  useEffect(() => {
    const handleRosterUpdate = (event: CustomEvent) => {
      console.log('🔄 Table view: Roster updated, refreshing data...');
      
      // Only refresh data, don't trigger any scrolling
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

  // Format date for display (01-07-25)
  const formatTableDate = (dateString: string) => {
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
    // CRITICAL: Only update local state, NO refresh to prevent scroll issues
    if (isMountedRef.current && onRefresh) {
      console.log('🔄 Entry updated - NOT calling onRefresh to prevent scroll issues');
      // Don't call onRefresh here - it causes unwanted scrolling
      // The real-time updates will handle data synchronization
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
    
    try {
      const editorName = validateAuthCode(authCode);
      if (!editorName) return;
      
      if (isSpecial && info.trim()) {
        // Add special date info to all staff for this date
        await updateAllStaffRemarksForDate(specialDateToEdit, info.trim(), editorName);
      } else {
        // Remove special date info from all staff for this date
        await updateAllStaffRemarksForDate(specialDateToEdit, '', editorName);
      }
      
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

  // Handle special date click
  const handleSpecialDateClick = (date: string) => {
    setSpecialDateToEdit(date);
    setShowAuthModal(true);
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ 
      height: window.innerWidth > window.innerHeight ? '60vh' : '70vh',
      minHeight: '400px',
      maxHeight: '80vh'
    }}>
      {/* Header with export button */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Roster
          </h3>
          {lastUpdateTime && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdateTime}
            </span>
          )}
        </div>
        
        <button
          onClick={onExportToCalendar}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          <Download className="w-4 h-4" />
          <span>Export to Calendar</span>
        </button>
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
            {loading ? 'Please wait while we fetch the data' : `No entries for ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto" style={{ 
          height: '100%',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table className="w-full border-collapse" style={{ 
            tableLayout: 'fixed',
            width: '100%',
            borderSpacing: 0,
            margin: 0,
            padding: 0
          }}>
            <tbody>
              {Object.entries(groupedEntries).map(([date, dateEntries]) => {
                const shiftGroups = groupEntriesByShift(dateEntries);
                
                return (
                  <React.Fragment key={date}>
                    {/* Date Header Row */}
                    <tr>
                      <RosterDateCell
                        date={date}
                        isToday={isToday}
                        isPastDate={isPastDate(date)}
                        isFutureDate={isFutureDate(date)}
                        onDoublePress={() => handleSpecialDateClick(date)}
                        onLongPress={() => handleEditClick(date)}
                        isSpecialDate={isSpecialDate(date)}
                        specialDateInfo={getSpecialDateInfo(date)}
                      />
                      
                      {/* Shift Headers */}
                      {shiftOrder.map(shiftType => {
                        const shiftEntries = shiftGroups[shiftType];
                        if (!shiftEntries || shiftEntries.length === 0) return null;
                        
                        return (
                          <td key={shiftType} style={{ 
                            padding: '4px',
                            textAlign: 'center',
                            border: '2px solid #374151',
                            backgroundColor: '#f3f4f6',
                            fontWeight: 'bold',
                            fontSize: window.innerWidth > window.innerHeight ? '10px' : '12px',
                            width: '21.25%'
                          }}>
                            <ScrollingText 
                              text={shiftType === 'Morning Shift (9-4)' ? 'Morning 9-4' :
                                   shiftType === 'Saturday Regular (12-10)' ? 'Saturday 12-10' :
                                   shiftType === 'Evening Shift (4-10)' ? 'Evening 4-10' :
                                   shiftType === 'Night Duty' ? 'Night Duty' :
                                   shiftType === 'Sunday/Public Holiday/Special' ? 'Special 9-4' : shiftType}
                              className="font-bold"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Staff Rows */}
                    <tr>
                      <td style={{ 
                        padding: '0',
                        border: '2px solid #374151',
                        height: '1px'
                      }} />
                      
                      {shiftOrder.map(shiftType => {
                        const shiftEntries = shiftGroups[shiftType];
                        if (!shiftEntries || shiftEntries.length === 0) return null;
                        
                        return (
                          <td key={shiftType} style={{ 
                            padding: '0',
                            textAlign: 'center',
                            border: '2px solid #374151',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            verticalAlign: 'top',
                            minHeight: window.innerWidth > window.innerHeight ? '60px' : '80px',
                            width: '21.25%'
                          }}>
                            {/* X watermark for past dates */}
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
                              minHeight: window.innerWidth > window.innerHeight ? '60px' : '80px',
                              position: 'relative',
                              padding: window.innerWidth > window.innerHeight ? '4px' : '8px'
                            }}>
                              {shiftEntries.map((entry, index) => (
                                <div key={entry.id} className="relative" style={{ zIndex: 30 }} data-entry-id={entry.id}>
                                  <RosterEntryCell
                                    entry={entry}
                                    onShowDetails={handleShowDetails}
                                    onUpdate={handleEntryUpdate}
                                    allEntriesForShift={shiftEntries}
                                    isSpecialDate={isSpecialDate(date)}
                                    specialDateInfo={getSpecialDateInfo(date)}
                                  />
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
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