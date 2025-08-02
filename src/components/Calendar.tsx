import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { SHIFTS } from '../constants';
import { DaySchedule, SpecialDates } from '../types';
import { ClearDateModal } from './ClearDateModal';
import { MonthClearModal } from './MonthClearModal';
import { gsap } from 'gsap';

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
  setSpecialDates,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [monthDataForClear, setMonthDataForClear] = useState<{month: number, year: number, totalShifts: number, totalAmount: number} | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Initialize GSAP animations when component mounts
  useEffect(() => {
    if (calendarRef.current) {
      gsap.fromTo(calendarRef.current,
        {
          opacity: 0,
          y: 20,
          scale: 0.98,
          force3D: true
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
          force3D: true
        }
      );
    }
  }, []);

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getShiftDisplay = (shifts: string[]) => {
    if (!shifts || shifts.length === 0) return null;
    
    return shifts.map(shiftId => {
      const shift = SHIFTS.find(s => s.id === shiftId);
      return shift ? shift : null;
    }).filter(Boolean);
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  const isPastDate = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck < todayDate;
  };

  const isFutureDate = (day: number) => {
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck > todayDate;
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    onTitleUpdate(tempTitle);
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

  const handleDateLongPress = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDateForClear(dateKey);
    setShowClearDateModal(true);
  };

  const handleClearDate = async (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    
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
    // Calculate month statistics
    const daysInMonth = getDaysInMonth(currentDate);
    let totalShifts = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      totalShifts += dayShifts.length;
    }
    
    setMonthDataForClear({
      month: currentMonth,
      year: currentYear,
      totalShifts,
      totalAmount
    });
    setShowMonthClearModal(true);
  };

  const handleClearMonth = async (year: number, month: number) => {
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

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div ref={calendarRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        {/* Title Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={handleTitleKeyPress}
                  onBlur={handleTitleSave}
                  className="bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-lg px-3 py-2 text-lg font-bold flex-1 focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Enter schedule title"
                />
              </div>
            ) : (
              <div className="flex items-center space-x-3 flex-1">
                <h1 className="text-2xl font-bold">{scheduleTitle}</h1>
                <button
                  onClick={handleTitleEdit}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200"
                  title="Edit title"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleMonthLongPress}
            className="text-xl font-semibold hover:bg-white/20 px-4 py-2 rounded-lg transition-colors duration-200"
            title="Long press to clear month"
          >
            {monthNames[currentMonth]} {currentYear}
          </button>
          
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-sm opacity-90">Month Total</div>
            <div className="text-xl font-bold">Rs {totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
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
          {/* Empty days for month start */}
          {emptyDays.map(day => (
            <div key={`empty-${day}`} className="h-20" />
          ))}
          
          {/* Actual days */}
          {daysArray.map(day => {
            const dateKey = formatDateKey(day);
            const dayShifts = schedule[dateKey] || [];
            const shifts = getShiftDisplay(dayShifts);
            const isSpecialDate = specialDates[dateKey] === true;
            
            return (
              <button
                key={day}
                data-day={day}
                onClick={() => onDateClick(day)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleDateLongPress(day);
                }}
                className={`h-20 p-1 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                  isToday(day)
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : isPastDate(day)
                      ? 'border-gray-200 bg-gray-50 opacity-75'
                      : isFutureDate(day)
                        ? 'border-gray-300 bg-white hover:border-indigo-300'
                        : 'border-gray-300 bg-white hover:border-indigo-300'
                } ${isSpecialDate ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div className="h-full flex flex-col">
                  {/* Day number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-indigo-700' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  
                  {/* Special date indicator */}
                  {isSpecialDate && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mx-auto mb-1" />
                  )}
                  
                  {/* Shifts */}
                  <div className="flex-1 flex flex-col space-y-0.5 overflow-hidden">
                    {shifts?.slice(0, 3).map((shift, index) => (
                      <div
                        key={`${shift.id}-${index}`}
                        className={`text-[8px] px-1 py-0.5 rounded text-center font-medium ${shift.color}`}
                        style={{ lineHeight: '1.1' }}
                      >
                        {shift.time}
                      </div>
                    ))}
                    {shifts && shifts.length > 3 && (
                      <div className="text-[8px] text-gray-500 text-center">
                        +{shifts.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
        monthData={monthDataForClear}
        onConfirm={handleClearMonth}
        onCancel={() => {
          setShowMonthClearModal(false);
          setMonthDataForClear(null);
        }}
      />
    </div>
  );
};