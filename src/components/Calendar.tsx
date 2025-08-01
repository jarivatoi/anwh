import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Upload, Trash2, Settings, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { DaySchedule, SpecialDates } from '../types';
import { SHIFTS } from '../constants';
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
  setSpecialDates
}) => {
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(scheduleTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Add calendar refresh animation
  useEffect(() => {
    if (calendarRef.current) {
      gsap.fromTo(calendarRef.current,
        {
          opacity: 0.8,
          scale: 0.98,
          force3D: true
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
          force3D: true
        }
      );
    }
  }, [currentDate, schedule]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

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

  const isToday = (day: number) => {
    return isCurrentMonth && day === today.getDate();
  };

  const isPastDate = (day: number) => {
    if (!isCurrentMonth) {
      return currentYear < today.getFullYear() || 
             (currentYear === today.getFullYear() && currentMonth < today.getMonth());
    }
    return day < today.getDate();
  };

  const isFutureDate = (day: number) => {
    if (!isCurrentMonth) {
      return currentYear > today.getFullYear() || 
             (currentYear === today.getFullYear() && currentMonth > today.getMonth());
    }
    return day > today.getDate();
  };

  const getShiftDisplay = (shiftId: string) => {
    const shift = SHIFTS.find(s => s.id === shiftId);
    return shift ? shift.time : shiftId;
  };

  const getShiftColor = (shiftId: string) => {
    const shift = SHIFTS.find(s => s.id === shiftId);
    return shift ? shift.displayColor : 'text-gray-600';
  };

  const handleDateLongPress = (day: number) => {
    const dateKey = formatDateKey(day);
    const hasContent = schedule[dateKey]?.length > 0 || specialDates[dateKey];
    
    if (hasContent) {
      setSelectedDateForClear(dateKey);
      setShowClearDateModal(true);
    }
  };

  const handleClearDate = async (dateKey: string) => {
    // Clear schedule data for this date
    setSchedule(prev => {
      const newSchedule = { ...prev };
      delete newSchedule[dateKey];
      return newSchedule;
    });
    
    // Clear special date marking for this date
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      delete newSpecialDates[dateKey];
      return newSpecialDates;
    });
  };

  const handleTitleSave = () => {
    if (titleValue.trim() !== scheduleTitle) {
      onTitleUpdate(titleValue.trim());
    }
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

  const calculateMonthData = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    let totalShifts = 0;
    let totalAmount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      totalShifts += dayShifts.length;
    }

    return { totalShifts, totalAmount };
  };

  const handleMonthClear = async (year: number, month: number) => {
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

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      const isSpecial = specialDates[dateKey] === true;
      const hasShifts = dayShifts.length > 0;

      days.push(
        <div
          key={day}
          data-day={day}
          className={`aspect-square border border-gray-200 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
            isToday(day) 
              ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' 
              : isPastDate(day)
                ? 'bg-gray-50'
                : isFutureDate(day)
                  ? 'bg-green-50'
                  : 'bg-white'
          } ${isSpecial ? 'ring-2 ring-yellow-300' : ''}`}
          onClick={() => onDateClick(day)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleDateLongPress(day);
          }}
          style={{
            minHeight: '80px',
            position: 'relative'
          }}
        >
          {/* Day number */}
          <div className={`text-sm font-semibold mb-1 ${
            isToday(day) 
              ? 'text-blue-800' 
              : isPastDate(day)
                ? 'text-gray-500'
                : isFutureDate(day)
                  ? 'text-green-700'
                  : 'text-gray-900'
          }`}>
            {day}
          </div>

          {/* Special date indicator */}
          {isSpecial && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
          )}

          {/* Shifts */}
          <div className="space-y-0.5">
            {dayShifts.slice(0, 3).map((shiftId, index) => (
              <div
                key={`${shiftId}-${index}`}
                className={`text-xs px-1 py-0.5 rounded text-center font-medium ${getShiftColor(shiftId)}`}
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  fontSize: '10px',
                  lineHeight: '1.2'
                }}
              >
                {getShiftDisplay(shiftId)}
              </div>
            ))}
            {dayShifts.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayShifts.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div ref={calendarRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold">
              {monthNames[currentMonth]} {currentYear}
            </h2>
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
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleSave}
                className="bg-white/20 text-white placeholder-white/70 px-3 py-1 rounded-lg text-lg font-medium text-center border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Enter schedule title"
              />
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-medium hover:bg-white/20 px-3 py-1 rounded-lg transition-colors duration-200"
            >
              {scheduleTitle}
            </button>
          )}
        </div>

        {/* Amount Display */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-sm opacity-90">Month Total</div>
            <div className="text-xl font-bold">Rs {totalAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-sm opacity-90">Month to Date</div>
            <div className="text-xl font-bold">Rs {monthToDateAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarGrid()}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-sm text-gray-600 mb-2 font-medium text-center">Shift Legend</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {SHIFTS.map(shift => (
            <div key={shift.id} className="flex items-center space-x-1">
              <div className={`w-3 h-3 rounded ${shift.color}`} />
              <span className="text-gray-700">{shift.time}</span>
            </div>
          ))}
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
        monthData={calculateMonthData()}
        onConfirm={handleMonthClear}
        onCancel={() => setShowMonthClearModal(false)}
      />
    </div>
  );
};