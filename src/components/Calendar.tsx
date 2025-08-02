import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { SHIFTS } from '../constants';
import { DaySchedule, SpecialDates } from '../types';
import { ClearDateModal } from './ClearDateModal';
import { MonthClearModal } from './MonthClearModal';
import { useLongPress } from '../hooks/useLongPress';
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(scheduleTitle);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [monthDataForClear, setMonthDataForClear] = useState<{month: number; year: number; totalShifts: number; totalAmount: number} | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(currentYear, currentMonth, 1).getDay();
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

  const getShiftDisplay = (shiftIds: string[]) => {
    return shiftIds.map(id => {
      const shift = SHIFTS.find(s => s.id === id);
      return shift ? shift.time : id;
    }).join(' + ');
  };

  const getShiftColors = (shiftIds: string[]) => {
    if (shiftIds.length === 0) return '';
    
    const colors = shiftIds.map(id => {
      const shift = SHIFTS.find(s => s.id === id);
      return shift ? shift.displayColor : 'text-gray-600';
    });
    
    return colors[0]; // Use first shift's color
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

  // Handle long press on date for clearing
  const handleDateLongPress = (day: number) => {
    const dateKey = formatDateKey(day);
    const hasContent = (schedule[dateKey] && schedule[dateKey].length > 0) || specialDates[dateKey];
    
    if (hasContent) {
      setSelectedDateForClear(dateKey);
      setShowClearDateModal(true);
    }
  };

  // Handle long press on month header for clearing entire month
  const handleMonthLongPress = () => {
    // Calculate month statistics
    const daysInMonth = getDaysInMonth();
    let totalShifts = 0;
    let monthAmount = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      totalShifts += dayShifts.length;
    }
    
    setMonthDataForClear({
      month: currentMonth,
      year: currentYear,
      totalShifts,
      totalAmount: totalAmount
    });
    setShowMonthClearModal(true);
  };

  // Handle clearing specific date
  const handleClearDate = async (dateKey: string) => {
    const day = parseInt(dateKey.split('-')[2]);
    
    // Clear schedule data for this date
    setSchedule(prev => {
      const newSchedule = { ...prev };
      delete newSchedule[dateKey];
      return newSchedule;
    });
    
    // Clear special date marking
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      delete newSpecialDates[dateKey];
      return newSpecialDates;
    });
    
    console.log(`✅ Cleared date ${dateKey}`);
  };

  // Handle clearing entire month
  const handleClearMonth = async (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Clear schedule data for the month
    setSchedule(prev => {
      const newSchedule = { ...prev };
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        delete newSchedule[dateKey];
      }
      return newSchedule;
    });
    
    // Clear special dates for the month
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        delete newSpecialDates[dateKey];
      }
      return newSpecialDates;
    });
    
    console.log(`✅ Cleared month ${month + 1}/${year}`);
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square"></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      const isSpecial = specialDates[dateKey] === true;
      const hasShifts = dayShifts.length > 0;
      const todayClass = isToday(day);
      const pastClass = isPastDate(day);
      const futureClass = isFutureDate(day);

      days.push(
        <div
          key={day}
          data-day={day}
          className={`aspect-square border border-gray-200 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 relative ${
            todayClass ? 'bg-green-100 border-green-300' : 
            pastClass ? 'bg-red-50' :
            futureClass ? 'bg-blue-50' : 'bg-white'
          } ${isSpecial ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => onDateClick(day)}
          {...useLongPress({
            onLongPress: () => handleDateLongPress(day),
            delay: 800
          })}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {/* Day number */}
          <div className={`text-xs font-semibold mb-1 ${
            todayClass ? 'text-green-800' : 
            pastClass ? 'text-red-600' :
            futureClass ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
          </div>

          {/* Special date indicator */}
          {isSpecial && (
            <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
          )}

          {/* Shifts */}
          {hasShifts && (
            <div className="space-y-0.5">
              {dayShifts.map((shiftId, index) => {
                const shift = SHIFTS.find(s => s.id === shiftId);
                return (
                  <div
                    key={index}
                    className={`text-[8px] px-1 py-0.5 rounded text-center font-medium ${
                      shift ? shift.color : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {shift ? shift.time : shiftId}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div ref={calendarRef} className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '24px',
      paddingTop: '24px'
    }}>
      {/* Header with editable title */}
      <div className="text-center mb-6">
        {isEditingTitle ? (
          <div className="flex items-center justify-center space-x-2 mb-4">
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={handleTitleKeyPress}
              onBlur={handleTitleSave}
              className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 focus:outline-none text-center"
              style={{ minWidth: '200px' }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{scheduleTitle}</h1>
            <button
              onClick={handleTitleEdit}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Month navigation with improved mobile centering */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div 
            className="text-xl font-semibold text-gray-900 cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            {...useLongPress({
              onLongPress: handleMonthLongPress,
              delay: 1000
            })}
            style={{
              minWidth: '200px',
              textAlign: 'center',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {monthNames[currentMonth]} {currentYear}
          </div>
          
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-all duration-200 flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Amount display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-sm text-blue-600 font-medium mb-1">Month to Date</div>
          <div className="text-2xl font-bold text-blue-800">{formatCurrency(monthToDateAmount)}</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-sm text-green-600 font-medium mb-1">Monthly Total</div>
          <div className="text-2xl font-bold text-green-800">{formatCurrency(totalAmount)}</div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">Shift Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SHIFTS.map(shift => (
            <div key={shift.id} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded ${shift.color.replace('text-', 'bg-').replace('border-', 'border-')}`}></div>
              <span className="text-xs text-gray-600">{shift.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span>Special Date</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded bg-green-100"></div>
              <span>Today</span>
            </div>
          </div>
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