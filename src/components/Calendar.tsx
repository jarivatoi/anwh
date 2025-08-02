import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit2, Check, X } from 'lucide-react';
import { DaySchedule, SpecialDates } from '../types';
import { SHIFTS } from '../constants';
import { ClearDateModal } from './ClearDateModal';
import { MonthClearModal } from './MonthClearModal';
import { useLongPress } from '../hooks/useLongPress';
import { ScrollingText } from './ScrollingText';

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
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDateKey, setClearDateKey] = useState<string | null>(null);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(scheduleTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Update edit title when scheduleTitle changes
  useEffect(() => {
    setEditTitle(scheduleTitle);
  }, [scheduleTitle]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    onTitleUpdate(editTitle.trim() || 'Work Schedule');
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditTitle(scheduleTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getDayShifts = (day: number) => {
    const dateKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return schedule[dateKey] || [];
  };

  const isSpecialDate = (day: number) => {
    const dateKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return specialDates[dateKey] === true;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const handleDateLongPress = (day: number) => {
    const dateKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setClearDateKey(dateKey);
    setShowClearModal(true);
  };

  const handleMonthLongPress = () => {
    setShowMonthClearModal(true);
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

  const renderCalendarGrid = () => {
    const days = [];
    const today = new Date();

    // Generate calendar days
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const day = date.getDate();
      const isCurrentMonth = date.getMonth() === currentMonth;
      const dayShifts = isCurrentMonth ? getDayShifts(day) : [];
      const isSpecial = isCurrentMonth ? isSpecialDate(day) : false;
      const isTodayDate = isCurrentMonth && isToday(day);

      days.push(
        <div
          key={i}
          className={`relative min-h-[80px] border border-gray-200 p-1 cursor-pointer transition-colors duration-200 ${
            !isCurrentMonth
              ? 'bg-gray-50 text-gray-400'
              : isTodayDate
                ? 'bg-green-100 hover:bg-green-200'
                : 'bg-white hover:bg-gray-50'
          } ${isSpecial ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => isCurrentMonth && onDateClick(day)}
          {...(isCurrentMonth ? useLongPress({
            onLongPress: () => handleDateLongPress(day),
            delay: 1000
          }) : {})}
          data-day={day}
          style={{
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {/* Date number */}
          <div className={`text-sm font-medium mb-1 ${
            isTodayDate ? 'text-green-800' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {day}
          </div>

          {/* Special date indicator */}
          {isSpecial && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
          )}

          {/* Shifts */}
          {isCurrentMonth && dayShifts.length > 0 && (
            <div className="space-y-1">
              {dayShifts.map(shiftId => {
                const shift = SHIFTS.find(s => s.id === shiftId);
                if (!shift) return null;

                return (
                  <div
                    key={shiftId}
                    className={`text-[8px] px-1 py-0.5 rounded text-center font-medium ${shift.color}`}
                    style={{
                      fontSize: '7px',
                      lineHeight: '1.2'
                    }}
                  >
                    <ScrollingText 
                      text={shift.time}
                      className="w-full"
                    />
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
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '24px',
      paddingTop: '24px'
    }}>
      <div className="max-w-6xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8">
          {isEditingTitle ? (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <input
                ref={titleInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 text-center focus:outline-none"
                style={{ minWidth: '200px' }}
              />
              <button
                onClick={handleTitleSave}
                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={handleTitleCancel}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">{scheduleTitle}</h1>
              <button
                onClick={handleTitleEdit}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Month Navigation - FIXED FOR IPHONE CENTERING */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-center w-full">
            {/* Container with proper flex distribution */}
            <div className="flex items-center justify-between w-full max-w-lg">
              {/* Left Arrow */}
              <button
                onClick={() => onNavigateMonth('prev')}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-200 flex-shrink-0"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              {/* Center Content */}
              <div className="flex-1 flex flex-col items-center justify-center mx-4">
                {/* Month and Year with proper text scrolling */}
                <div className="w-full max-w-[200px] overflow-hidden">
                  <ScrollingText className="w-full">
                    <h2 className="text-2xl font-bold text-gray-900 text-center whitespace-nowrap">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                  </ScrollingText>
                </div>
                
                {/* Export Button */}
                {onOpenCalendarExportModal && (
                  <button
                    onClick={onOpenCalendarExportModal}
                    className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                    style={{
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm">Export</span>
                  </button>
                )}
              </div>
              
              {/* Right Arrow */}
              <button
                onClick={() => onNavigateMonth('next')}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors duration-200 flex-shrink-0"
                style={{
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-700 mb-1">Month to Date</h3>
            <div className="w-full overflow-hidden">
              <ScrollingText className="w-full">
                <p className="text-2xl font-bold text-blue-900 whitespace-nowrap">
                  {formatCurrency(monthToDateAmount)}
                </p>
              </ScrollingText>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-sm font-medium text-green-700 mb-1">Monthly Total</h3>
            <div className="w-full overflow-hidden">
              <ScrollingText className="w-full">
                <p className="text-2xl font-bold text-green-900 whitespace-nowrap">
                  {formatCurrency(totalAmount)}
                </p>
              </ScrollingText>
            </div>
          </div>
        </div>

        {/* Month Header with Long Press */}
        <div 
          className="bg-indigo-600 text-white p-4 rounded-t-lg cursor-pointer select-none"
          {...useLongPress({
            onLongPress: handleMonthLongPress,
            delay: 2000
          })}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <div className="w-full overflow-hidden">
            <ScrollingText className="w-full">
              <h2 className="text-xl font-bold text-center whitespace-nowrap">
                {monthNames[currentMonth]} {currentYear} Schedule
              </h2>
            </ScrollingText>
          </div>
          <p className="text-indigo-200 text-sm text-center mt-1">
            Long press to clear month
          </p>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-gray-200 rounded-b-lg overflow-hidden">
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
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Shift Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SHIFTS.map(shift => (
              <div key={shift.id} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded ${shift.color.split(' ')[0]}`}></div>
                <div className="w-full overflow-hidden">
                  <ScrollingText className="w-full">
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {shift.label} ({shift.time})
                    </span>
                  </ScrollingText>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs text-gray-600">Special Date</span>
          </div>
        </div>
      </div>

      {/* Clear Date Modal */}
      <ClearDateModal
        isOpen={showClearModal}
        selectedDate={clearDateKey}
        schedule={schedule}
        specialDates={specialDates}
        onConfirm={handleClearDate}
        onCancel={() => {
          setShowClearModal(false);
          setClearDateKey(null);
        }}
      />

      {/* Month Clear Modal */}
      <MonthClearModal
        isOpen={showMonthClearModal}
        monthData={showMonthClearModal ? {
          month: currentMonth,
          year: currentYear,
          totalShifts: Object.keys(schedule).filter(date => {
            const d = new Date(date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          }).length,
          totalAmount: totalAmount
        } : null}
        onConfirm={handleClearMonth}
        onCancel={() => setShowMonthClearModal(false)}
      />
    </div>
  );
};