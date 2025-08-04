import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Settings, Database, FileText, User, Download, Upload, Trash2, RotateCcw, Plus, X, CheckCircle, AlertTriangle, Clock, Edit } from 'lucide-react';
import { useIndexedDB, useScheduleData } from './hooks/useIndexedDB';
import { useScheduleCalculations } from './hooks/useScheduleCalculations';
import { DaySchedule, SpecialDates, Settings as SettingsType, ExportData } from './types';
import { DEFAULT_SHIFT_COMBINATIONS } from './constants';
import { workScheduleDB } from './utils/indexedDB';
import { Calendar as CalendarComponent } from './components/Calendar';
import { SettingsPanel } from './components/SettingsPanel';
import { MenuPanel } from './components/MenuPanel';
import { ShiftModal } from './components/ShiftModal';
import { ClearDateModal } from './components/ClearDateModal';
import { MonthClearModal } from './components/MonthClearModal';
import { RosterPanel } from './components/RosterPanel';
import { syncRosterToCalendar, RosterChangeEvent } from './utils/rosterCalendarSync';
import { CalendarExportModal } from './components/CalendarExportModal';
import { AddToHomescreen } from './utils/addToHomescreen';

type ActiveTab = 'calendar' | 'settings' | 'data' | 'roster';

function App() {
  // Core state
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Modal states
  const [showClearDateModal, setShowClearDateModal] = useState(false);
  const [showMonthClearModal, setShowMonthClearModal] = useState(false);
  const [showCalendarExportModal, setShowCalendarExportModal] = useState(false);
  const [clearDateKey, setClearDateKey] = useState<string | null>(null);
  
  // IndexedDB hooks
  const [scheduleTitle, setScheduleTitle] = useIndexedDB('scheduleTitle', 'My Work Schedule', 'metadata');
  const [workSettings, setWorkSettings] = useIndexedDB<SettingsType>('workSettings', {
    basicSalary: 35000,
    hourlyRate: 173.08,
    shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
  });
  
  // Schedule data
  const { 
    schedule, 
    specialDates, 
    setSchedule, 
    setSpecialDates, 
    isLoading: scheduleLoading,
    error: scheduleError,
    refreshData
  } = useScheduleData();
  
  // Calculations
  const { totalAmount, monthToDateAmount } = useScheduleCalculations(
    schedule, 
    workSettings, 
    specialDates, 
    currentDate,
    refreshKey
  );

  // Add to homescreen functionality
  useEffect(() => {
    const addToHomescreen = new AddToHomescreen({
      appName: 'X-ray ANWH',
      appIconUrl: '/icon.png',
      maxModalDisplayCount: 1,
      skipFirstVisit: false,
      startDelay: 5000,
      lifespan: 20000
    });

    // Show install prompt after 5 seconds if conditions are met
    const timer = setTimeout(() => {
      if (addToHomescreen.canPrompt()) {
        addToHomescreen.show();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for roster calendar sync events
  useEffect(() => {
    const handleRosterCalendarSync = (event: CustomEvent<RosterChangeEvent>) => {
      console.log('📅 App.tsx: Received roster calendar sync event:', event.detail);
      
      const success = syncRosterToCalendar(event.detail, {
        calendarLabel: scheduleTitle,
        schedule,
        specialDates,
        setSchedule,
        setSpecialDates
      });
      
      if (success) {
        console.log('✅ App.tsx: Calendar sync completed successfully');
        setRefreshKey(prev => prev + 1);
      } else {
        console.log('❌ App.tsx: Calendar sync skipped (name mismatch or other reason)');
      }
    };

    window.addEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
    return () => window.removeEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
  }, [scheduleTitle, schedule, specialDates, setSchedule, setSpecialDates]);

  // Listen for bulk calendar update events (from calendar export)
  useEffect(() => {
    const handleBulkCalendarUpdate = (event: CustomEvent) => {
      console.log('📅 App.tsx: Received bulk calendar update event:', event.detail);
      
      const { calendarUpdates, specialDateUpdates, editorName, source } = event.detail;
      
      // Only apply if the editor name matches the calendar label
      const editorBaseName = editorName.replace(/\(R\)$/, '').trim().toUpperCase();
      const calendarBaseName = scheduleTitle.replace(/\(R\)$/, '').trim().toUpperCase();
      
      if (editorBaseName !== calendarBaseName) {
        console.log('❌ App.tsx: Bulk update skipped - name mismatch');
        return;
      }
      
      console.log('✅ App.tsx: Applying bulk calendar updates...');
      
      // Apply calendar updates
      if (calendarUpdates && Object.keys(calendarUpdates).length > 0) {
        setSchedule(prev => {
          const newSchedule = { ...prev };
          
          Object.entries(calendarUpdates).forEach(([date, shifts]) => {
            // Only add shifts that don't already exist
            const existingShifts = newSchedule[date] || [];
            const newShifts = [...existingShifts];
            
            shifts.forEach(shift => {
              if (!newShifts.includes(shift)) {
                newShifts.push(shift);
              }
            });
            
            if (newShifts.length > 0) {
              newSchedule[date] = newShifts;
            }
          });
          
          return newSchedule;
        });
      }
      
      // Apply special date updates
      if (specialDateUpdates && Object.keys(specialDateUpdates).length > 0) {
        setSpecialDates(prev => ({
          ...prev,
          ...specialDateUpdates
        }));
      }
      
      // Force refresh
      setRefreshKey(prev => prev + 1);
      
      console.log('✅ App.tsx: Bulk calendar update completed');
    };

    window.addEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
    return () => window.removeEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
  }, [scheduleTitle, setSchedule, setSpecialDates]);

  // Listen for tab switching events
  useEffect(() => {
    const handleSwitchToCalendarTab = () => {
      console.log('🔄 App.tsx: Switching to calendar tab via event');
      setActiveTab('calendar');
    };

    const handleForceCalendarRefresh = () => {
      console.log('🔄 App.tsx: Force refreshing calendar');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('switchToCalendarTab', handleSwitchToCalendarTab);
    window.addEventListener('forceCalendarRefresh', handleForceCalendarRefresh);
    
    return () => {
      window.removeEventListener('switchToCalendarTab', handleSwitchToCalendarTab);
      window.removeEventListener('forceCalendarRefresh', handleForceCalendarRefresh);
    };
  }, []);

  // Handle shift toggle
  const handleToggleShift = useCallback((shiftId: string) => {
    if (!selectedDate) return;
    
    setSchedule(prev => {
      const currentShifts = prev[selectedDate] || [];
      const newShifts = currentShifts.includes(shiftId)
        ? currentShifts.filter(id => id !== shiftId)
        : [...currentShifts, shiftId];
      
      if (newShifts.length === 0) {
        const { [selectedDate]: removed, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [selectedDate]: newShifts };
    });
    
    setRefreshKey(prev => prev + 1);
  }, [selectedDate, setSchedule]);

  // Handle special date toggle
  const handleToggleSpecialDate = useCallback((dateKey: string, isSpecial: boolean) => {
    setSpecialDates(prev => {
      if (isSpecial) {
        return { ...prev, [dateKey]: true };
      } else {
        const { [dateKey]: removed, ...rest } = prev;
        return rest;
      }
    });
    
    setRefreshKey(prev => prev + 1);
  }, [setSpecialDates]);

  // Handle clear date
  const handleClearDate = useCallback(async (dateKey: string) => {
    setSchedule(prev => {
      const { [dateKey]: removed, ...rest } = prev;
      return rest;
    });
    
    setSpecialDates(prev => {
      const { [dateKey]: removed, ...rest } = prev;
      return rest;
    });
    
    setRefreshKey(prev => prev + 1);
  }, [setSchedule, setSpecialDates]);

  // Handle clear month
  const handleClearMonth = useCallback(async (year: number, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      Object.keys(newSchedule).forEach(dateKey => {
        const date = new Date(dateKey);
        if (date >= monthStart && date <= monthEnd) {
          delete newSchedule[dateKey];
        }
      });
      return newSchedule;
    });
    
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      Object.keys(newSpecialDates).forEach(dateKey => {
        const date = new Date(dateKey);
        if (date >= monthStart && date <= monthEnd) {
          delete newSpecialDates[dateKey];
        }
      });
      return newSpecialDates;
    });
    
    setRefreshKey(prev => prev + 1);
  }, [setSchedule, setSpecialDates]);

  // Handle data export
  const handleExportData = useCallback(async () => {
    try {
      const exportData = await workScheduleDB.exportAllData();
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      
      // Try Web Share API first (works well on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], exportData.filename, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Work Schedule Export',
              text: 'Your work schedule data export'
            });
            return;
          }
        } catch (error) {
          console.log('Web Share API failed, using fallback');
        }
      }
      
      // Fallback: Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, []);

  // Handle data import
  const handleImportData = useCallback(async (data: ExportData) => {
    try {
      await workScheduleDB.importAllData(data);
      
      // Refresh all data
      await refreshData();
      setRefreshKey(prev => prev + 1);
      
      alert('✅ Data imported successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('❌ Import failed. Please try again.');
    }
  }, [refreshData]);

  // Handle basic salary update
  const handleUpdateBasicSalary = useCallback((salary: number) => {
    const hourlyRate = (salary * 12) / (52 * 40);
    setWorkSettings(prev => ({
      ...prev,
      basicSalary: salary,
      hourlyRate: hourlyRate
    }));
    setRefreshKey(prev => prev + 1);
  }, [setWorkSettings]);

  // Handle shift hours update
  const handleUpdateShiftHours = useCallback((combinationId: string, hours: number) => {
    setWorkSettings(prev => ({
      ...prev,
      shiftCombinations: prev.shiftCombinations.map(combo =>
        combo.id === combinationId ? { ...combo, hours } : combo
      )
    }));
    setRefreshKey(prev => prev + 1);
  }, [setWorkSettings]);

  // Get month data for clear modal
  const getMonthData = useCallback(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    let totalShifts = 0;
    let totalAmount = 0;
    
    Object.entries(schedule).forEach(([dateKey, shifts]) => {
      const date = new Date(dateKey);
      if (date.getMonth() === month && date.getFullYear() === year) {
        totalShifts += shifts.length;
        
        shifts.forEach(shiftId => {
          const combination = workSettings.shiftCombinations.find(combo => combo.id === shiftId);
          if (combination && workSettings.hourlyRate) {
            totalAmount += combination.hours * workSettings.hourlyRate;
          }
        });
      }
    });
    
    return { month, year, totalShifts, totalAmount };
  }, [schedule, workSettings, currentDate]);

  // Loading state
  if (scheduleLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (scheduleError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Loading Error</h1>
          <p className="text-gray-600 mb-4">{scheduleError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">X-ray ANWH</h1>
                <p className="text-xs text-gray-600">Work Schedule Manager</p>
              </div>
            </div>
            
            {/* Amount Display */}
            {activeTab === 'calendar' && (
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-600">
                  Rs {totalAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  MTD: Rs {monthToDateAmount.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="flex">
          {[
            { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
            { id: 'roster' as const, label: 'Roster', icon: FileText },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
            { id: 'data' as const, label: 'Data', icon: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-safe">
        {activeTab === 'calendar' && (
          <div className="p-4">
            <CalendarComponent
              schedule={schedule}
              specialDates={specialDates}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onDateSelect={setSelectedDate}
              onClearDate={(dateKey) => {
                setClearDateKey(dateKey);
                setShowClearDateModal(true);
              }}
              onClearMonth={() => setShowMonthClearModal(true)}
              onExportToCalendar={() => setShowCalendarExportModal(true)}
              totalAmount={totalAmount}
              monthToDateAmount={monthToDateAmount}
              refreshKey={refreshKey}
            />
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="p-4">
            <RosterPanel 
              selectedDate={currentDate}
              onDateChange={setCurrentDate}
              onExportToCalendar={() => setShowCalendarExportModal(true)}
              setActiveTab={setActiveTab}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4">
            <SettingsPanel
              settings={workSettings}
              onUpdateBasicSalary={handleUpdateBasicSalary}
              onUpdateShiftHours={handleUpdateShiftHours}
            />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="p-4">
            <MenuPanel
              onImportData={handleImportData}
              onExportData={handleExportData}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <ShiftModal
        selectedDate={selectedDate}
        schedule={schedule}
        specialDates={specialDates}
        onToggleShift={handleToggleShift}
        onToggleSpecialDate={handleToggleSpecialDate}
        onClose={() => setSelectedDate(null)}
      />

      <ClearDateModal
        isOpen={showClearDateModal}
        selectedDate={clearDateKey}
        schedule={schedule}
        specialDates={specialDates}
        onConfirm={handleClearDate}
        onCancel={() => {
          setShowClearDateModal(false);
          setClearDateKey(null);
        }}
      />

      <MonthClearModal
        isOpen={showMonthClearModal}
        monthData={getMonthData()}
        onConfirm={handleClearMonth}
        onCancel={() => setShowMonthClearModal(false)}
      />

      <CalendarExportModal
        isOpen={showCalendarExportModal}
        onClose={() => setShowCalendarExportModal(false)}
        currentMonth={currentDate.getMonth()}
        currentYear={currentDate.getFullYear()}
      />
    </div>
  );
}

export default App;