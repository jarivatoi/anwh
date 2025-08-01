import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Calculator, Edit3, TrendingUp, Trash2, AlertTriangle, X, Download, Upload } from 'lucide-react';
import { gsap } from 'gsap';
import { SHIFTS } from '../constants';
import { DaySchedule, SpecialDates } from '../types';
import { formatMauritianRupees } from '../utils/currency';
import { validateAuthCode, availableNames } from '../utils/rosterAuth';
import { useLongPress } from '../hooks/useLongPress';
import { fetchRosterEntries } from '../utils/rosterApi';
import { syncRosterToCalendar } from '../utils/rosterCalendarSync';
import { MonthClearModal } from './MonthClearModal';

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
  onImportAllShifts: (authCode: string) => Promise<void>;
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
  onImportAllShifts
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(scheduleTitle);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

  const formatCurrency = (amount: number) => {
    return formatMauritianRupees(amount).formatted;
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
    
    // Use the first shift's color as the primary color
    const primaryShift = SHIFTS.find(s => s.id === shifts[0]);
    return primaryShift ? primaryShift.color : 'bg-gray-100 text-gray-800';
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck < todayDate;
  };

  const isFutureDate = (day: number) => {
    const today = new Date();
    const dateToCheck = new Date(currentYear, currentMonth, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateToCheck > todayDate;
  };

  const handleTitleEdit = () => {
    setIsEditing(true);
    setEditValue(scheduleTitle);
  };

  const handleTitleSave = () => {
    onTitleUpdate(editValue.trim() || 'Work Schedule');
    setIsEditing(false);
  };

  const handleTitleCancel = () => {
    setEditValue(scheduleTitle);
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  // Calculate month data for clear modal
  const getMonthData = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    let totalShifts = 0;
    let totalAmount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      totalShifts += dayShifts.length;
    }

    return {
      month: currentMonth,
      year: currentYear,
      totalShifts,
      totalAmount
    };
  };

  // Handle import all shifts
  const handleImportClick = () => {
    setShowImportModal(true);
    setAuthCode('');
    setAuthError('');
  };

  const handleImportSubmit = async () => {
    if (!authCode || authCode.length < 4) {
      setAuthError('Please enter a valid authentication code');
      return;
    }

    const userName = validateAuthCode(authCode);
    if (!userName) {
      setAuthError('Invalid authentication code');
      return;
    }

    setIsImporting(true);
    setAuthError('');

    try {
      await onImportAllShifts(authCode);
      setShowImportModal(false);
      setAuthCode('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportModal(false);
    setAuthCode('');
    setAuthError('');
  };

  // Long press handler for clear month
  const longPressHandlers = useLongPress({
    onLongPress: () => setShowClearModal(true),
    delay: 2000
  });

  // Render calendar days
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 sm:h-24 border border-gray-200"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day);
      const dayShifts = schedule[dateKey] || [];
      const isSpecial = specialDates[dateKey] === true;
      const hasShifts = dayShifts.length > 0;

      days.push(
        <div
          key={day}
          data-day={day}
          className={`h-20 sm:h-24 border border-gray-200 p-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
            isToday(day) 
              ? 'bg-blue-100 border-blue-300 shadow-md' 
              : isPastDate(day)
                ? 'bg-gray-50'
                : isFutureDate(day)
                  ? 'bg-green-50'
                  : 'bg-white'
          } ${hasShifts ? 'ring-2 ring-indigo-200' : ''}`}
          onClick={() => onDateClick(day)}
        >
          <div className="flex flex-col h-full">
            {/* Day number */}
            <div className={`text-sm font-semibold mb-1 ${
              isToday(day) 
                ? 'text-blue-800' 
                : isPastDate(day)
                  ? 'text-gray-500'
                  : 'text-gray-900'
            }`}>
              {day}
              {isSpecial && <span className="ml-1 text-yellow-600">⭐</span>}
            </div>

            {/* Shifts */}
            {hasShifts && (
              <div className="flex-1 flex flex-col space-y-1">
                {dayShifts.map((shiftId, index) => {
                  const shift = SHIFTS.find(s => s.id === shiftId);
                  return (
                    <div
                      key={`${shiftId}-${index}`}
                      className={`text-xs px-1 py-0.5 rounded text-center font-medium ${
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
      {/* Header with title */}
      <div className="flex items-center justify-center space-x-3 mb-6">
        <CalendarIcon className="w-6 h-6 text-indigo-600" />
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleTitleSave}
              className="text-2xl font-bold text-gray-900 text-center bg-transparent border-b-2 border-indigo-500 focus:outline-none"
              autoFocus
            />
          </div>
        ) : (
          <h2 
            className="text-2xl font-bold text-gray-900 text-center cursor-pointer hover:text-indigo-600 transition-colors duration-200"
            onClick={handleTitleEdit}
          >
            {scheduleTitle}
          </h2>
        )}
      </div>

      {/* Month navigation with import button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigateMonth('prev')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-4">
          {/* Month/Year display */}
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors duration-200"
            {...longPressHandlers}
          >
            <h3 className="text-xl font-semibold text-gray-800">
              {monthNames[currentMonth]} {currentYear}
            </h3>
          </div>

          {/* Import All Shifts Button */}
          <button
            onClick={handleImportClick}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm"
            title="Import all your shifts from roster to calendar"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import All</span>
          </button>
        </div>

        <button
          onClick={() => onNavigateMonth('next')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors duration-200"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Amount summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Calculator className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Total for {monthNames[currentMonth]}</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">Month to Date</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(monthToDateAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div ref={calendarRef} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {dayNames.map(day => (
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

      {/* Import All Shifts Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Import All Shifts
              </h3>

              <p className="text-sm text-gray-600 mb-6 text-center">
                Enter your authentication code to import all your shifts from the roster into your calendar
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Authentication Code
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                  placeholder="Enter your code"
                  maxLength={4}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{authError}</span>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">This will:</p>
                  <ul className="space-y-1">
                    <li>• Import all your shifts from the roster database</li>
                    <li>• Skip dates that already have shifts (no conflicts)</li>
                    <li>• Automatically mark special dates when needed</li>
                    <li>• Show you a summary of what was imported</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleImportCancel}
                  disabled={isImporting}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={isImporting || authCode.length < 4}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import All</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Clear Modal */}
      <MonthClearModal
        isOpen={showClearModal}
        monthData={getMonthData()}
        onConfirm={async (year: number, month: number) => {
          // Handle month clear logic here
          setShowClearModal(false);
        }}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
};