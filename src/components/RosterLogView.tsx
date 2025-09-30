import React from 'react';
import { useState, useEffect } from 'react';
import { Clock, User, Calendar, FileText, ArrowRight } from 'lucide-react';
import { RosterEntry, ShiftFilterType } from '../types/roster';
import { formatDisplayDate, getShiftDisplayName } from '../utils/rosterFilters';
import { availableNames } from '../utils/rosterAuth';
import { parseNameChange } from '../utils/rosterHelpers';
import { ScrollingText } from './ScrollingText';

interface RosterLogViewProps {
  entries: RosterEntry[];
  loading: boolean;
  selectedDate?: Date;
}

export const RosterLogView: React.FC<RosterLogViewProps> = ({
  entries,
  loading,
  selectedDate
}) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'nameChanges'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Listen for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Log view received real-time update:', event.detail);
      
      // Force component re-render to show real-time changes
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
    return () => window.removeEventListener('rosterRealtimeUpdate', handleRealtimeUpdate as EventListener);
  }, []);
  
  // Filter entries by selected month/year first
  const monthFilteredEntries = selectedDate ? entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedDate.getMonth() && 
           entryDate.getFullYear() === selectedDate.getFullYear();
  }) : entries;
  
  // Filter entries based on filter type
  const filteredEntries = monthFilteredEntries.filter(entry => {
    // Always exclude PDF import entries and Saturday conversion entries from the log view
    if (entry.change_description && 
        (entry.change_description === 'Imported from PDF' || 
         entry.change_description.includes('Saturday 4-10 converted to 12-10'))) {
      return false;
    }
    
    // Exclude entries edited by ADMIN
    if (entry.last_edited_by === 'ADMIN') {
      return false;
    }
    
    if (filterType === 'nameChanges') {
      // Only show entries that have name change descriptions (containing "Name changed from")
      return entry.change_description && 
             entry.change_description.includes('Name changed from') &&
             entry.change_description.includes(' to ');
    } else {
      // Show all entries that have any change description or last_edited_by
      return entry.change_description || entry.last_edited_by;
    }
  });

  // Filter by selected staff member
  const staffFilteredEntries = filteredEntries.filter(entry => {
    if (selectedStaff === 'all') return true;
    
    // Filter by who edited the entry (last_edited_by)
    return entry.last_edited_by === selectedStaff;
  });

  // Sort entries by latest edit first (most recent last_edited_at at the top)
  const sortedEntries = [...staffFilteredEntries].sort((a, b) => {
    // Enhanced timestamp parsing with better fallbacks
    const parseTimestamp = (timestamp: string | null | undefined) => {
      if (!timestamp) return new Date(0); // Very old date for missing timestamps
      
      try {
        // Handle custom format: "20-01-2025 09:00:00"
        if (timestamp.includes('-') && timestamp.includes(' ')) {
          const [datePart, timePart] = timestamp.split(' ');
          const [day, month, year] = datePart.split('-');
          const [hour, minute, second] = (timePart || '00:00:00').split(':');
          return new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour || '0'), 
            parseInt(minute || '0'), 
            parseInt(second || '0')
          );
        }
        
        // Handle ISO format or other standard formats
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date(0) : date;
      } catch (error) {
        console.warn('Failed to parse timestamp:', timestamp, error);
        return new Date(0); // Very old date for unparseable timestamps
      }
    };
    
    // Get the most recent timestamp for each entry
    const getLatestTimestamp = (entry: RosterEntry) => {
      // Prioritize last_edited_at (when entry was modified)
      if (entry.last_edited_at) {
        return parseTimestamp(entry.last_edited_at);
      }
      // Fall back to created_at (when entry was first created)
      if (entry.created_at) {
        return parseTimestamp(entry.created_at);
      }
      // Last resort: use current date
      return new Date();
    };
    
    const dateA = getLatestTimestamp(a);
    const dateB = getLatestTimestamp(b);
    
    // Sort by most recent first (descending order) - latest edits on top
    const timeDiff = dateB.getTime() - dateA.getTime();
    
    // If timestamps are the same, sort by entry ID as secondary sort
    if (timeDiff === 0) {
      return b.id.localeCompare(a.id);
    }
    
    return timeDiff;
  });

  // Get unique staff names from all entries for the filter dropdown
  const getUniqueStaffNames = () => {
    const staffNames = new Set<string>();
    
    monthFilteredEntries.forEach(entry => {
      // Add the editor's name to the filter list
      if (entry.last_edited_by && entry.last_edited_by !== 'ADMIN') {
        staffNames.add(entry.last_edited_by);
      }
    });
    
    return Array.from(staffNames).sort();
  };

  const uniqueStaffNames = getUniqueStaffNames();

  const getShiftColor = (shiftType: string) => {
    const colorMap: Record<string, string> = {
      'Morning Shift (9-4)': 'text-red-600',
      'Evening Shift (4-10)': 'text-blue-600',
      'Saturday Regular (12-10)': 'text-gray-600',
      'Night Duty': 'text-green-600',
      'Sunday/Public Holiday/Special': 'text-purple-600'
    };
    return colorMap[shiftType] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Handle the custom format: "20-01-2025 09:00:00"
      const [datePart, timePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('-');
      const [hour, minute, second] = timePart.split(':');
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second || '0'));
      
      // Format as: dd-mm-yyyy at 23h10
      const formattedDate = `${day}-${month}-${year}`;
      const formattedTime = `${hour}h${minute}`;
      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      return timestamp; // Fallback to original if parsing fails
    }
  };

  // Format date for display in log view (Mon 01-Jan-2025)
  const formatLogDate = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName} ${day}-${monthName}-${year}`;
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Filters */}
      <div className="p-2 sm:p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* Filter Type */}
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Show:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'nameChanges')}
              className="px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="all">
                All Roster Edits{(() => {
                  const count = monthFilteredEntries.filter(e => (e.change_description || e.last_edited_by) && !(e.change_description === 'Imported from PDF' || e.change_description?.includes('Saturday 4-10 converted to 12-10')) && e.last_edited_by !== 'ADMIN').length;
                  return count > 0 ? ` (${count})` : '';
                })()}
              </option>
              <option value="nameChanges">
                Name Changes Only{(() => {
                  const count = monthFilteredEntries.filter(e => e.change_description?.includes('Name changed from')).length;
                  return count > 0 ? ` (${count})` : '';
                })()}
              </option>
            </select>
          </div>
          
          {/* Staff Filter */}
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Filter by Staff:</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm flex-1 sm:flex-none"
            >
              <option value="all">
                All Staff{filteredEntries.length > 0 ? ` (${filteredEntries.length} entries)` : ''}
              </option>
              {uniqueStaffNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Log Content */}
      <div className="overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              {selectedStaff === 'all' ? 
                (filterType === 'all' ? 'No roster edits found' : 'No name changes found') : 
                `No ${filterType === 'all' ? 'edits' : 'name changes'} found for ${selectedStaff}`}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {selectedStaff === 'all' ? 
                (filterType === 'all' ? 'No activity to display' : 'Try selecting "All Roster Edits" to see more activity') : 
                'Try selecting a different staff member or filter type'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedEntries.map((entry, index) => (
              <div key={entry.id} className="p-2 sm:p-4 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start space-x-3">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-3 h-3 rounded-full ${
                      entry.shift_type === 'Saturday Regular (12-10)' 
                        ? 'bg-gray-600' 
                        : getShiftColor(entry.shift_type).replace('text-', 'bg-')
                    }`} />
                  </div>
                  
                  {/* Log content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Line 1: Date and Shift */}
                    <div className="w-full overflow-hidden">
                      <ScrollingText className="w-full">
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                          <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="font-medium text-gray-900">
                            {formatLogDate(entry.date)}
                          </span>
                          <span className={`font-medium ${getShiftColor(entry.shift_type)}`}>
                            {getShiftDisplayName(entry.shift_type)}
                          </span>
                        </div>
                      </ScrollingText>
                    </div>
                    
                    {/* Line 2: Main action description */}
                    {(() => {
                      const nameInfo = parseNameChange(entry.change_description || '', entry.assigned_name);
                      if (nameInfo.isNameChange) {
                        return (
                          <div className="w-full overflow-hidden">
                            <div className="w-full overflow-hidden">
                              <ScrollingText 
                                text=""
                                className="w-full"
                              >
                                <div className="flex items-center space-x-2 whitespace-nowrap">
                                  <div className="flex items-center space-x-1 bg-red-100 px-2 py-1 rounded-lg border border-red-200 flex-shrink-0">
                                    <User className="w-4 h-4 text-red-600" />
                                    <span className="text-red-700 font-semibold line-through text-xs">
                                      {nameInfo.oldName}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full p-1 border-2 border-gray-300 shadow-md flex-shrink-0" />
                                  <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-lg border border-green-200 flex-shrink-0">
                                    <User className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700 font-semibold text-xs">
                                      {nameInfo.newName}
                                    </span>
                                  </div>
                                </div>
                              </ScrollingText>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-full overflow-hidden">
                            <ScrollingText className="w-full">
                              <div className="flex items-center space-x-2 whitespace-nowrap">
                                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-gray-900 font-medium">
                                  {entry.assigned_name}
                                </span>
                                <span className="text-gray-500">
                                  {entry.change_description?.includes('Added by') ? 'was added to' : 
                                   entry.change_description?.includes('Removed by') ? 'was removed from' :
                                   'was assigned to'}
                                </span>
                                <span className={`font-medium ${getShiftColor(entry.shift_type)}`}>
                                  {entry.shift_type}
                                </span>
                              </div>
                            </ScrollingText>
                          </div>
                        );
                      }
                    })()}
                    
                    {/* Line 3: Change description note */}
                    {entry.change_description && (
                      (() => {
                        const nameInfo = parseNameChange(entry.change_description, entry.assigned_name);
                        if (!nameInfo.isNameChange) {
                          return (
                            <div className="w-full overflow-hidden">
                              <ScrollingText className="w-full">
                                <div className="text-xs text-gray-700 whitespace-nowrap">
                                  <span className="font-medium">Note:</span> {entry.change_description}
                                </div>
                              </ScrollingText>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                    
                    {/* Line 4: Editor and timestamp info */}
                    <div className="w-full overflow-hidden">
                      {entry.last_edited_by && (
                        <ScrollingText className="w-full">
                          <div className="flex items-center space-x-2 text-xs text-gray-500 whitespace-nowrap">
                            <User className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span className="text-blue-700 font-medium">
                              Modified by {entry.last_edited_by}
                            </span>
                            {entry.last_edited_at && (
                              <>
                                <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                <span className="text-gray-700 font-medium">
                                  {formatTimestamp(entry.last_edited_at)}
                                </span>
                              </>
                            )}
                          </div>
                        </ScrollingText>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom CSS for arrow animation */}

      {/* Summary */}
      {!loading && sortedEntries.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="text-center text-sm text-gray-600">
            Showing {sortedEntries.length} {filterType === 'all' ? 'roster edit' : 'name change'} {sortedEntries.length === 1 ? 'entry' : 'entries'}
            {selectedStaff !== 'all' && ` for ${selectedStaff}`} (sorted by latest edit first)
          </div>
        </div>
      )}
    </div>
  );
};