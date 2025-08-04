import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, TrendingUp, Edit2, Trash2, Download } from 'lucide-react';
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
  setSpecialDates
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [monthDataForClear, setMonthDataForClear] = useState<{month: number, year: number, totalShifts: number, totalAmount: number} | null>(null);
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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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
    
    return colors[0]; // Use the first shift's color
  };

  const isPastDate = (day: number) => {
    if (!isCurrentMonth) return false;
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck < todayDate;
  };

  const isToday = (day: number) => {
    return isCurrentMonth && 
           day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
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
    // Calculate month statistics
    const monthShifts = Object.entries(schedule).filter(([dateKey]) => {
      const date = new Date(dateKey);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const totalShifts = monthShifts.reduce((total, [, shifts]) => total + shifts.length, 0);
    
    setMonthDataForClear({
      month: currentMonth,
      year: currentYear,
      totalShifts,
      totalAmount
    });
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

  // Create calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div ref={calendarRef} className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '24px',
      paddingTop: '24px'
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
            <div className="flex items-center justify-center space-x-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 focus:outline-none text-center"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') handleTitleCancel();
                }}
              />
              <button
                onClick={handleTitleSave}
                className="p-1 rounded text-green-600 hover:bg-green-100"
              >
                ✓
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-1 rounded text-red-600 hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{scheduleTitle}</h1>
              <button
                onClick={handleTitleEdit}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <div 
            className="text-lg text-gray-700 mt-1 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-1 transition-colors duration-200"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const startTime = Date.now();
              const startY = touch.clientY;
              
              const handleTouchEnd = (endEvent: TouchEvent) => {
                const endTime = Date.now();
                const endTouch = endEvent.changedTouches[0];
                const endY = endTouch.clientY;
                const duration = endTime - startTime;
                const distance = Math.abs(endY - startY);
                
                if (duration >= 2000 && distance < 10) {
                  handleMonthLongPress();
                }
                
                document.removeEventListener('touchend', handleTouchEnd);
              };
              
              document.addEventListener('touchend', handleTouchEnd);
            }}
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

      {/* Amount Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Month Total</p>
              <p className="text-xl font-bold text-blue-900">Rs {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Month to Date</p>
              <p className="text-xl font-bold text-green-900">Rs {monthToDateAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 text-sm">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-24 border border-gray-200"></div>;
            }
            
            const dateKey = formatDateKey(day);
            const dayShifts = schedule[dateKey] || [];
            const isSpecial = specialDates[dateKey] === true;
            const isPast = isPastDate(day);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day}
                data-day={day}
                className={`h-24 border border-gray-200 p-2 cursor-pointer transition-all duration-200 relative ${
                  isTodayDate 
                    ? 'bg-blue-50 border-blue-300 shadow-md' 
                    : isPast 
                      ? 'bg-gray-50' 
                      : 'hover:bg-gray-50'
                }`}
                onClick={() => onDateClick(day)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const startTime = Date.now();
                  const startY = touch.clientY;
                  
                  const handleTouchEnd = (endEvent: TouchEvent) => {
                    const endTime = Date.now();
                    const endTouch = endEvent.changedTouches[0];
                    const endY = endTouch.clientY;
                    const duration = endTime - startTime;
                    const distance = Math.abs(endY - startY);
                    
                    if (duration >= 2000 && distance < 10) {
                      handleDateLongPress(day);
                    }
                    
                    document.removeEventListener('touchend', handleTouchEnd);
                  };
                  
                  document.addEventListener('touchend', handleTouchEnd);
                }}
              >
                {/* X watermark for past dates */}
                {isPast && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div 
                      className="font-bold select-none"
                      style={{
                        fontSize: 'clamp(2rem, 8vw, 4rem)',
                        lineHeight: '1',
                        color: '#fca5a5',
                        opacity: 0.3,
                        transform: 'scale(1.2)'
                      }}
                    >
                      X
                    </div>
                  </div>
                )}
                
                {/* Day number */}
                <div className={`text-lg font-semibold mb-1 ${
                  isTodayDate ? 'text-blue-900' : isPast ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                
                {/* Special date indicator */}
                {isSpecial && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                )}
                
                {/* Shifts */}
                <div className="space-y-1">
                  {dayShifts.map((shiftId, shiftIndex) => {
                    const shift = SHIFTS.find(s => s.id === shiftId);
                    return (
                      <div
                        key={shiftIndex}
                        className={`text-xs px-1 py-0.5 rounded text-center font-medium ${
                          shift ? shift.color : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {shift ? shift.time : shiftId}
                      </div>
                    );
                  })}
                </div>
              </div>
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