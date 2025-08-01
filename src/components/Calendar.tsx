import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Settings, Download, Upload, Trash2, RotateCcw, Edit3 } from 'lucide-react';
import { SHIFTS } from '../constants';
import { DaySchedule, SpecialDates } from '../types';
import { ShiftModal } from './ShiftModal';
import { ClearDateModal } from './ClearDateModal';
import { ClearMonthModal } from './ClearMonthModal';
import { BulkRosterImport } from './BulkRosterImport';
import { MonthClearModal } from './MonthClearModal';
import { formatMauritianRupees } from '../utils/currency';
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
  const [tempTitle, setTempTitle] = useState(scheduleTitle);
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [selectedDateForClear, setSelectedDateForClear] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const getDayShifts = (day: number) => {
    const dateKey = formatDateKey(day);
    return schedule[dateKey] || [];
  };

  const isSpecialDate = (day: number) => {
    const dateKey = formatDateKey(day);
    return specialDates[dateKey] === true;
  };

  const getShiftDisplay = (shiftId: string) => {
    const shift = SHIFTS.find(s => s.id === shiftId);
    return shift ? shift.time : shiftId;
  };

  const getShiftColor = (shiftId: string) => {
    const shift = SHIFTS.find(s => s.id === shiftId);
    return shift ? shift.displayColor : 'text-gray-600';
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

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
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
    
    console.log(`✅ Successfully cleared date ${day}/${month}/${year}`);
  };

  const handleClearMonth = async (year: number, month: number) => {
    // Create date keys for the entire month
    const daysInMonth = getDaysInMonth(month, year);
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

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth, currentYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div ref={calendarRef} className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        {/* Title Section */}
        <div className="flex items-center justify-center mb-4">
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleSave}
                className="bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-lg px-3 py-2 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/50"
                placeholder="Enter schedule title"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <h1 
                onClick={handleTitleEdit}
                className="text-2xl font-bold cursor-pointer hover:text-white/80 transition-colors duration-200 text-center"
                title="Click to edit title"
              >
                {scheduleTitle}
              </h1>
              <button
                onClick={handleTitleEdit}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors duration-200"
                title="Edit title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-3">
            <CalendarIcon className="w-6 h-6" />
            <h2 className="text-xl font-semibold">
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

        {/* Action Buttons */}
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span>Import All</span>
          </button>
          
          <button
            {...useLongPress({
              onLongPress: () => setShowMonthClearModal(true),
              delay: 1000
            })}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Month</span>
          </button>
        </div>

        {/* Amount Display */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <div className="text-white/80 text-sm">Month Total</div>
            <div className="text-2xl font-bold">
              {formatMauritianRupees(totalAmount).formatted}
            </div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-sm">Month to Date</div>
            <div className="text-2xl font-bold">
              {formatMauritianRupees(monthToDateAmount).formatted}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty days for month start */}
          {emptyDays.map(day => (
            <div key={`empty-${day}`} className="h-24" />
          ))}

          {/* Month days */}
          {days.map(day => {
            const dayShifts = getDayShifts(day);
            const isSpecial = isSpecialDate(day);
            const todayClass = isToday(day);
            const pastClass = isPastDate(day);
            const futureClass = isFutureDate(day);

            return (
              <div
                key={day}
                data-day={day}
                {...useLongPress({
                  onLongPress: () => handleDateLongPress(day),
                  onPress: () => onDateClick(day),
                  delay: 800
                })}
                className={`
                  h-24 border border-gray-200 rounded-lg p-1 cursor-pointer transition-all duration-200 hover:shadow-md
                  ${todayClass ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' : ''}
                  ${pastClass ? 'bg-gray-50 text-gray-400' : ''}
                  ${futureClass ? 'bg-green-50' : ''}
                  ${isSpecial ? 'bg-yellow-50 border-yellow-300' : ''}
                  ${dayShifts.length > 0 ? 'bg-indigo-50' : ''}
                `}
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {/* Day number */}
                <div className={`text-sm font-semibold mb-1 ${
                  todayClass ? 'text-blue-700' : 
                  pastClass ? 'text-gray-400' : 
                  'text-gray-700'
                }`}>
                  {day}
                  {isSpecial && <span className="text-yellow-600 ml-1">★</span>}
                </div>

                {/* Shifts */}
                <div className="space-y-0.5">
                  {dayShifts.slice(0, 3).map((shiftId, index) => (
                    <div
                      key={index}
                      className={`text-xs px-1 py-0.5 rounded text-center font-medium ${
                        pastClass ? 'opacity-50' : ''
                      }`}
                      style={{ color: getShiftColor(shiftId) }}
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
          })}
        </div>
      </div>

      {/* Modals */}
      {showClearDateModal && (
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
      )}

      {showMonthClearModal && (
        <MonthClearModal
          isOpen={showMonthClearModal}
          monthData={{
            month: currentMonth,
            year: currentYear,
            totalShifts: Object.keys(schedule).filter(dateKey => {
              const date = new Date(dateKey);
              return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            }).reduce((total, dateKey) => total + (schedule[dateKey]?.length || 0), 0),
            totalAmount: totalAmount
          }}
          onConfirm={handleClearMonth}
          onCancel={() => setShowMonthClearModal(false)}
        />
      )}

      {showBulkImport && (
        <BulkRosterImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          scheduleTitle={scheduleTitle}
          schedule={schedule}
          specialDates={specialDates}
          setSchedule={setSchedule}
          setSpecialDates={setSpecialDates}
          currentDate={currentDate}
        />
      )}
    </div>
  );
};