import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { DaySchedule, SpecialDates, Settings } from '../types';
import { SHIFTS } from '../constants';
import { ClearDateModal } from './ClearDateModal';
import { MonthClearModal } from './MonthClearModal';
import { useLongPress } from '../hooks/useLongPress';
import { validateAuthCode } from '../utils/rosterAuth';
import { fetchRosterEntries } from '../utils/rosterApi';
import { syncRosterToCalendar } from '../utils/rosterCalendarSync';

interface CalendarProps {
  currentDate: Date;
  schedule: DaySchedule;
  specialDates: SpecialDates;
  onDateClick: (day: number) => void;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  totalAmount: number;
  monthToDateAmount: number;
  onDateChange: (date: Date) => void;
  scheduleTitle: string;
  onTitleUpdate: (title: string) => void;
  setSchedule: (schedule: DaySchedule | ((prev: DaySchedule) => DaySchedule)) => void;
  setSpecialDates: (specialDates: SpecialDates | ((prev: SpecialDates) => SpecialDates)) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  schedule,
  specialDates,
  onDateClick,
  onNavigateMonth,
  totalAmount,
  monthToDateAmount,
  onDateChange,
  scheduleTitle,
  onTitleUpdate,
  setSchedule,
  setSpecialDates
}) => {
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [monthClearData, setMonthClearData] = useState<any>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [showRosterImport, setShowRosterImport] = useState(false);
  const [importAuthCode, setImportAuthCode] = useState('');
  const [importAuthError, setImportAuthError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    added: number;
    skipped: number;
    errors: number;
    details: string[];
  } | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Update temp title when prop changes
  useEffect(() => {
    setTempTitle(scheduleTitle);
  }, [scheduleTitle]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getShiftDisplay = (shifts: string[]) => {
    if (!shifts || shifts.length === 0) return null;
    
    return shifts.map(shiftId => {
      const shift = SHIFTS.find(s => s.id === shiftId);
      return shift ? shift.time : shiftId;
    }).join(' + ');
  };

  const getShiftColors = (shifts: string[]) => {
    if (!shifts || shifts.length === 0) return '';
    
    const colors = shifts.map(shiftId => {
      const shift = SHIFTS.find(s => s.id === shiftId);
      return shift ? shift.displayColor : 'text-gray-600';
    });
    
    return colors[0]; // Use first shift's color
  };

  const handleDateLongPress = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDateForClear(dateKey);
    setShowClearDateModal(true);
  };

  const handleClearDate = async (dateKey: string) => {
    // Clear schedule data for this specific date
    setSchedule(prev => {
      const newSchedule = { ...prev };
      delete newSchedule[dateKey];
      return newSchedule;
    });
    
    // Clear special date marking for this specific date
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      delete newSpecialDates[dateKey];
      return newSpecialDates;
    });
  };

  const handleMonthLongPress = () => {
    // Calculate month data for the modal
    const monthData = {
      month: currentMonth,
      year: currentYear,
      totalShifts: Object.keys(schedule).filter(dateKey => {
        const date = new Date(dateKey);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length,
      totalAmount: totalAmount
    };
    
    setMonthClearData(monthData);
    setShowMonthClearModal(true);
  };

  const handleClearMonth = async (year: number, month: number) => {
    // Create date keys for the entire month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDateKeys: string[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      monthDateKeys.push(dateKey);
    }
    
    // Clear schedule data for the month
    setSchedule(prev => {
      const newSchedule = { ...prev };
      monthDateKeys.forEach(dateKey => {
        delete newSchedule[dateKey];
      });
      return newSchedule;
    });
    
    // Clear special dates for the month
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      monthDateKeys.forEach(dateKey => {
        delete newSpecialDates[dateKey];
      });
      return newSpecialDates;
    });
  };

  const handleTitleSave = () => {
    if (tempTitle.trim() !== scheduleTitle) {
      onTitleUpdate(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(scheduleTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  // Handle roster import
  const handleRosterImport = async () => {
    const userName = validateAuthCode(importAuthCode);
    if (!userName) {
      setImportAuthError('Invalid authentication code');
      return;
    }

    setIsImporting(true);
    setImportAuthError('');

    try {
      // Fetch all roster entries
      const allEntries = await fetchRosterEntries();
      
      // Filter entries for this user (match base names)
      const userBaseName = userName.replace(/\(R\)$/, '').trim();
      const userEntries = allEntries.filter(entry => {
        const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim();
        return entryBaseName === userBaseName;
      });

      console.log(`📥 Found ${userEntries.length} roster entries for ${userName}`);

      let added = 0;
      let skipped = 0;
      let errors = 0;
      const details: string[] = [];

      // Process each entry
      for (const entry of userEntries) {
        try {
          // Check if date already has shifts in calendar
          const currentShifts = schedule[entry.date] || [];
          if (currentShifts.length > 0) {
            skipped++;
            details.push(`${entry.date}: Already has shifts`);
            continue;
          }

          // Use the sync function to add to calendar
          const syncResult = syncRosterToCalendar({
            date: entry.date,
            shiftType: entry.shift_type,
            assignedName: entry.assigned_name,
            editorName: userName,
            action: 'added'
          }, {
            calendarLabel: userName,
            schedule,
            specialDates,
            setSchedule,
            setSpecialDates
          });

          if (syncResult) {
            added++;
            details.push(`${entry.date}: Added ${entry.shift_type}`);
          } else {
            skipped++;
            details.push(`${entry.date}: Skipped (conflict or validation failed)`);
          }
        } catch (error) {
          errors++;
          details.push(`${entry.date}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setImportResults({ added, skipped, errors, details });

    } catch (error) {
      console.error('❌ Roster import failed:', error);
      setImportAuthError('Failed to fetch roster data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClose = () => {
    setShowRosterImport(false);
    setImportAuthCode('');
    setImportAuthError('');
    setImportResults(null);
  };

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div 
              {...useLongPress({
                onLongPress: handleMonthLongPress,
                delay: 1000
              })}
              className="text-center cursor-pointer"
            >
              <h2 className="text-2xl font-bold">
                {monthNames[currentMonth]} {currentYear}
              </h2>
            </div>
            
            {/* Roster Import Button */}
            <button
              onClick={() => setShowRosterImport(true)}
              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors duration-200"
              title="Import your roster entries to calendar"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Schedule Title */}
        <div className="text-center mb-4">
          {isEditingTitle ? (
            <div className="flex items-center justify-center space-x-2">
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleSave}
                className="bg-white/20 text-white placeholder-white/70 px-3 py-1 rounded-lg text-lg font-medium text-center border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Enter schedule title"
              />
            </div>
          ) : (
            <h3 
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-medium cursor-pointer hover:bg-white/10 px-3 py-1 rounded-lg transition-colors duration-200"
            >
              {scheduleTitle}
            </h3>
          )}
        </div>

        {/* Amount Display */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-sm opacity-90">Month Total</div>
            <div className="text-xl font-bold">Rs {totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-sm opacity-90">Month to Date</div>
            <div className="text-xl font-bold">Rs {monthToDateAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={index} className="h-20" />;
            }

            const dateKey = formatDateKey(day);
            const dayShifts = schedule[dateKey] || [];
            const isSpecial = specialDates[dateKey] === true;
            const isToday = isCurrentMonth && day === today.getDate();

            return (
              <div
                key={day}
                data-day={day}
                {...useLongPress({
                  onLongPress: () => handleDateLongPress(day),
                  onPress: () => onDateClick(day),
                  delay: 1000
                })}
                className={`
                  h-20 border border-gray-200 rounded-lg p-1 cursor-pointer transition-all duration-200 hover:shadow-md
                  ${isToday ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-gray-50'}
                  ${isSpecial ? 'ring-2 ring-yellow-400' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  
                  {dayShifts.length > 0 && (
                    <div className="flex-1 flex flex-col justify-center">
                      <div className={`text-xs font-medium text-center ${getShiftColors(dayShifts)}`}>
                        {getShiftDisplay(dayShifts)}
                      </div>
                    </div>
                  )}
                  
                  {isSpecial && (
                    <div className="text-xs text-yellow-600 text-center">★</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Roster Import Modal */}
      {showRosterImport && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleImportClose();
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Import Your Roster
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Enter your authentication code to import your roster entries into this calendar
              </p>

              {!importResults ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Authentication Code
                    </label>
                    <input
                      type="text"
                      value={importAuthCode}
                      onChange={(e) => setImportAuthCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center font-mono text-lg"
                      placeholder="Enter your code"
                      maxLength={4}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  
                  {importAuthError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 text-center">{importAuthError}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Import Process:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Finds all your roster entries</li>
                        <li>• Adds them to your personal calendar</li>
                        <li>• Skips dates that already have shifts</li>
                        <li>• Automatically marks special dates when needed</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleImportClose}
                      disabled={isImporting}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRosterImport}
                      disabled={importAuthCode.length < 4 || isImporting}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Import</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Import Results */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h4>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">{importResults.added}</div>
                        <div className="text-sm text-green-700">Added</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                        <div className="text-sm text-yellow-700">Skipped</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-red-600">{importResults.errors}</div>
                        <div className="text-sm text-red-700">Errors</div>
                      </div>
                    </div>

                    {/* Details */}
                    {importResults.details.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                        <h5 className="font-medium text-gray-800 mb-2">Details:</h5>
                        <div className="space-y-1">
                          {importResults.details.map((detail, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              {detail}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleImportClose}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        , document.body
      )}

      {/* Clear Date Modal */}
      <ClearDateModal
        isOpen={showClearDateModal}
        selectedDate={selectedDateForClear}
        schedule={schedule}
        specialDates={specialDates}
        onConfirm={handleClearDate}
        onCancel={() => {
          setShowClearDateModal(false);
          setSelectedDateForClear(null);
        }}
      />

      {/* Month Clear Modal */}
      <MonthClearModal
        isOpen={showMonthClearModal}
        monthData={monthClearData}
        onConfirm={handleClearMonth}
        onCancel={() => {
          setShowMonthClearModal(false);
          setMonthClearData(null);
        }}
      />
    </div>
  );
};