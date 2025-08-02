import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { SHIFTS } from '../constants';
import { DaySchedule, SpecialDates } from '../types';
import { ClearDateModal } from './ClearDateModal';
import { DeleteMonthModal } from './DeleteMonthModal';
import { formatMauritianRupees } from '../utils/currency';
import { useLongPress } from '../hooks/useLongPress';

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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(scheduleTitle);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showDeleteMonthModal, setShowDeleteMonthModal] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Update title value when prop changes
  useEffect(() => {
    setTitleValue(scheduleTitle);
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
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getShiftDisplay = (shiftId: string) => {
    const shift = SHIFTS.find(s => s.id === shiftId);
    return shift ? shift.time : shiftId;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    onTitleUpdate(titleValue);
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitleValue(scheduleTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  // Handle long press for clearing dates
  const handleDateLongPress = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDateForClear(dateKey);
    setShowClearModal(true);
  };

  // Handle long press for month deletion
  const handleMonthLongPress = () => {
    setShowDeleteMonthModal(true);
  };

  const handleClearDate = async (dateKey: string) => {
    const dateObj = new Date(dateKey);
    const day = dateObj.getDate();
    
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
    
    console.log(`✅ Successfully cleared date ${day}/${currentMonth + 1}/${currentYear}`);
  };

  const handleDeleteMonth = async () => {
    // Create date keys for the entire month
    const monthDateKeys: string[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
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
    
    console.log(`✅ Successfully deleted month data for ${currentMonth + 1}/${currentYear}`);
  };

  // Handle export to calendar
  const handleExportToCalendar = () => {
    // Dispatch event to open calendar export modal
    window.dispatchEvent(new CustomEvent('openCalendarExportModal'));
  };

  return (
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '16px',
      paddingTop: '16px'
    }}>
      {/* Header with title and navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1 text-center">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyPress}
              className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 text-center outline-none"
              style={{ minWidth: '200px' }}
            />
          ) : (
            <button
              onClick={handleTitleEdit}
              className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <span>{scheduleTitle}</span>
              <Edit2 className="w-4 h-4 opacity-50" />
            </button>
          )}
          
          <div 
            {...useLongPress({
              onLongPress: handleMonthLongPress,
              delay: 1000
            })}
            className="text-lg text-gray-600 cursor-pointer hover:text-gray-800 transition-colors duration-200"
          >
            {monthNames[currentMonth]} {currentYear}
          </div>
        </div>
        
        <button
          onClick={() => onNavigateMonth('next')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Amount Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm font-medium text-blue-700 mb-1">Month Total</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatMauritianRupees(totalAmount).formatted}
            </div>
            {/* Export button in the Month Total card */}
            <button
              onClick={handleExportToCalendar}
              className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-2 w-full"
            >
              <Download className="w-4 h-4" />
              <span>Export to Calendar</span>
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm font-medium text-green-700 mb-1">Month to Date</div>
            <div className="text-2xl font-bold text-green-900">
              {formatMauritianRupees(monthToDateAmount).formatted}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty days for month start */}
          {emptyDays.map(day => (
            <div key={`empty-${day}`} className="h-24 border-r border-b border-gray-200 last:border-r-0" />
          ))}
          
          {/* Actual days */}
          {days.map(day => {
            const dateKey = formatDateKey(day);
            const dayShifts = schedule[dateKey] || [];
            const isSpecial = specialDates[dateKey] === true;
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day}
                data-day={day}
                className={`h-24 border-r border-b border-gray-200 last:border-r-0 cursor-pointer transition-colors duration-200 ${
                  isTodayDate ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
                {...useLongPress({
                  onLongPress: () => handleDateLongPress(day),
                  onPress: () => onDateClick(day),
                  delay: 800
                })}
              >
                <div className="p-2 h-full flex flex-col">
                  {/* Day number and special indicator */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      isTodayDate ? 'text-blue-700 font-bold' : 'text-gray-900'
                    }`}>
                      {day}
                    </span>
                    {isSpecial && (
                      <span className="text-xs text-yellow-600 font-bold">★</span>
                    )}
                  </div>
                  
                  {/* Shifts */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayShifts.map(shiftId => {
                      const shift = SHIFTS.find(s => s.id === shiftId);
                      return (
                        <div
                          key={shiftId}
                          className={`text-xs px-2 py-1 rounded text-center ${shift?.color || 'bg-gray-100 text-gray-800'}`}
                        >
                          {getShiftDisplay(shiftId)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <ClearDateModal
        isOpen={showClearModal}
        selectedDate={selectedDateForClear}
        schedule={schedule}
        specialDates={specialDates}
        onConfirm={handleClearDate}
        onCancel={() => {
          setShowClearModal(false);
          setSelectedDateForClear(null);
        }}
      />

      <DeleteMonthModal
        isOpen={showDeleteMonthModal}
        onClose={() => setShowDeleteMonthModal(false)}
        onConfirm={handleDeleteMonth}
        monthYear={`${monthNames[currentMonth]} ${currentYear}`}
      />
    </div>
  );
};