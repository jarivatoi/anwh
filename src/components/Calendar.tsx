import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, Trash2, Download } from 'lucide-react';
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
  onOpenCalendarExportModal?: () => void;
}

interface MonthData {
  month: number;
  year: number;
  totalShifts: number;
  totalAmount: number;
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
  onOpenCalendarExportModal
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [monthDataForClear, setMonthDataForClear] = useState<MonthData | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Update temp title when prop changes
  useEffect(() => {
    setTempTitle(scheduleTitle);
  }, [scheduleTitle]);

  // Initialize calendar animations when component mounts
  useEffect(() => {
    if (calendarRef.current) {
      console.log('🎨 Initializing calendar animations');
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

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
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

  const handleDateClear = async (dateKey: string) => {
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
    
    console.log(`✅ Successfully cleared date ${day}/${month}/${year}`);
  };

  const handleMonthClear = async (year: number, month: number) => {
    console.log(`🗑️ Clearing month data for ${month + 1}/${year}`);
    
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
    
    console.log(`✅ Successfully cleared month data for ${month + 1}/${year}`);
  };

  const handleLongPressDate = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDateForClear(dateKey);
    setShowClearDateModal(true);
  };

  const handleLongPressMonth = () => {
    // Calculate month statistics
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    let totalShifts = 0;
    let monthAmount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      totalShifts += dayShifts.length;
    }

    // Use the calculated total amount for this month
    monthAmount = totalAmount;

    const monthData: MonthData = {
      month: currentMonth,
      year: currentYear,
      totalShifts,
      totalAmount: monthAmount
    };

    setMonthDataForClear(monthData);
    setShowMonthClearModal(true);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 sm:h-32"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      const isSpecialDate = specialDates[dateKey] === true;
      const isToday = isCurrentMonth && day === today.getDate();

      days.push(
        <div
          key={day}
          data-day={day}
          className={`h-24 sm:h-32 border border-gray-200 p-1 sm:p-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          } ${isSpecialDate ? 'bg-yellow-50 border-yellow-300' : ''}`}
          onClick={() => onDateClick(day)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleLongPressDate(day);
          }}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
            </span>
            {isSpecialDate && (
              <span className="text-xs text-yellow-600 font-bold">★</span>
            )}
          </div>
          
          <div className="space-y-1">
            {dayShifts.map(shiftId => {
              const shift = SHIFTS.find(s => s.id === shiftId);
              if (!shift) return null;
              
              return (
                <div
                  key={shiftId}
                  className={`text-xs px-1 py-0.5 rounded text-center font-medium ${shift.color}`}
                >
                  {shift.time}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div ref={calendarRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-6">
        {/* Title Section */}
        <div className="text-center mb-4">
          {isEditingTitle ? (
            <div className="flex items-center justify-center space-x-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleSave}
                className="bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-lg px-3 py-2 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <h1 
                className="text-xl sm:text-2xl font-bold cursor-pointer hover:text-white/90 transition-colors duration-200"
                onClick={handleTitleEdit}
              >
                {scheduleTitle}
              </h1>
              <Edit2 
                className="w-4 h-4 cursor-pointer hover:text-white/90 transition-colors duration-200" 
                onClick={handleTitleEdit}
              />
            </div>
          )}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 relative">
            {/* Invisible export button overlay on calendar icon */}
            {onOpenCalendarExportModal && (
              <button
                onClick={onOpenCalendarExportModal}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                style={{
                  left: '-12px',
                  top: '-12px',
                  width: '48px',
                  height: '48px'
                }}
                title="Export to Calendar"
              />
            )}
            
            <CalendarIcon className="w-6 h-6" />
            <h2 
              className="text-xl sm:text-2xl font-bold cursor-pointer hover:text-white/90 transition-colors duration-200"
              onClick={handleLongPressMonth}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPressMonth();
              }}
            >
              {monthNames[currentMonth]} {currentYear}
            </h2>
          </div>
          
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-sm opacity-90">Month Total</div>
            <div className="text-lg sm:text-xl font-bold">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <div className="text-sm opacity-90">Month to Date</div>
            <div className="text-lg sm:text-xl font-bold">{formatCurrency(monthToDateAmount)}</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 sm:p-6">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Clear Date Modal */}
      <ClearDateModal
        isOpen={showClearDateModal}
        selectedDate={selectedDateForClear}
        schedule={schedule}
        specialDates={specialDates}
        onConfirm={handleDateClear}
        onCancel={() => {
          setShowClearDateModal(false);
          setSelectedDateForClear(null);
        }}
      />

      {/* Month Clear Modal */}
      <MonthClearModal
        isOpen={showMonthClearModal}
        monthData={monthDataForClear}
        onConfirm={handleMonthClear}
        onCancel={() => {
          setShowMonthClearModal(false);
          setMonthDataForClear(null);
        }}
      />
    </div>
  );
};