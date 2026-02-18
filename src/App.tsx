import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { ShiftModal } from './components/ShiftModal';
import { SettingsPanel } from './components/SettingsPanel';
import { MenuPanel } from './components/MenuPanel';
import { ClearDateModal } from './components/ClearDateModal';
import { DeleteMonthModal } from './components/DeleteMonthModal';
import { CalendarExportModal } from './components/CalendarExportModal';
import TabNavigation from './components/TabNavigation';
import { useScheduleCalculations } from './hooks/useScheduleCalculations';
import { useIndexedDB, useScheduleData } from './hooks/useIndexedDB';
import { workScheduleDB } from './utils/indexedDB';
import { DEFAULT_SHIFT_COMBINATIONS } from './constants';
import { AddToHomescreen } from './utils/addToHomescreen';
import { DaySchedule, SpecialDates, Settings, ExportData } from './types';
import { gsap } from 'gsap';
import { RosterPanel } from './components/RosterPanel';
import { syncRosterToCalendar } from './utils/rosterCalendarSync';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'data' | 'roster'>('calendar');
  const [showCalendarExportModal, setShowCalendarExportModal] = useState(false);
  
  // Add artificial loading delay for better UX
  const [artificialLoading, setArtificialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [showMainApp, setShowMainApp] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Use IndexedDB hooks
  const { schedule, specialDates, setSchedule, setSpecialDates, isLoading: dataLoading, error: dataError, refreshData } = useScheduleData();
  const [scheduleTitle, setScheduleTitle, { isLoading: titleLoading, refresh: refreshTitle }] = useIndexedDB<string>('scheduleTitle', 'Work Schedule', 'metadata');
  const [settings, setSettings, { isLoading: settingsLoading, refresh: refreshSettings }] = useIndexedDB<Settings>('workSettings', {
    basicSalary: 35000,
    hourlyRate: 201.92,
    shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
  });

  // Add refreshKey state
  const [refreshKey, setRefreshKey] = useState(0);

  // Add monthly salary state
  const [monthlySalary, setMonthlySalary] = useState(0);

  // Extract month and year BEFORE using them
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Load monthly salary when month changes or after updates
  useEffect(() => {
    const loadMonthlySalary = async () => {
      try {
        const salary = await workScheduleDB.getMonthlySalary(currentYear, currentMonth);
        setMonthlySalary(salary);
      } catch (error) {
        console.error('Failed to load monthly salary:', error);
        setMonthlySalary(0);
      }
    };
    loadMonthlySalary();
  }, [currentYear, currentMonth, refreshKey]);

  // Pass specialDates to the calculation hook with refreshKey dependency
  const { totalAmount, monthToDateAmount } = useScheduleCalculations(schedule, settings, specialDates, currentDate, refreshKey, monthlySalary);

  // Check if data is loading
  const isDataLoading = false; // Remove database dependency for initial load

  // Add artificial loading delay to ensure users can read the loading screen
  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    const duration = 3000; // 3 seconds
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function for natural progress
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const smoothedProgress = Math.round(easeOutQuart * 100);
      
      setSmoothProgress(smoothedProgress);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setSmoothProgress(100);
        setTimeout(() => {
          setArtificialLoading(false);
          setShowMainApp(true);
        }, 100); // Small delay after reaching 100%
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Only use artificial loading for initial screen
  const isLoading = artificialLoading;

  // Initialize Add to Home Screen functionality
  useEffect(() => {
    if (showMainApp) {
      // Create AddToHomescreen instance
      const addToHomescreenInstance = new AddToHomescreen({
        appName: 'X-ray ANWH',
        appIconUrl: 'https://jarivatoi.github.io/anwh/Icon.PNG',
        maxModalDisplayCount: 1, // Only show once
        skipFirstVisit: false, // Show on first visit
        startDelay: 3000, // 3 seconds delay for first visit
        lifespan: 20000,
        mustShowCustomPrompt: false, // Use normal detection logic
        displayPace: 999999 // Very large number to prevent showing again
      });
      
      // Check if can prompt (now async)
      const checkAndShow = async () => {
        const canShow = await addToHomescreenInstance.canPrompt();
        
        if (canShow) {
          setTimeout(() => {
            addToHomescreenInstance.show();
          }, 3000); // 3 second delay
        }
      };
      
      checkAndShow();
    }
  }, [showMainApp]);

  // Listen for navigation to specific month
  useEffect(() => {
    const handleNavigateToMonth = (event: CustomEvent) => {
      const { month, year } = event.detail;
      setCurrentDate(new Date(year, month, 1));
    };

    window.addEventListener('navigateToMonth', handleNavigateToMonth as EventListener);
    return () => window.removeEventListener('navigateToMonth', handleNavigateToMonth as EventListener);
  }, [schedule, specialDates]);
  
  // Handle bulk calendar updates from calendar export
  useEffect(() => {
    const handleBulkCalendarUpdate = (event: CustomEvent) => {
      const { calendarUpdates, specialDateUpdates, editorName, source } = event.detail;
      
      // Confirm receipt
      window.dispatchEvent(new CustomEvent('bulkUpdateReceived'));
      
      // Update schedule with bulk data
      setSchedule(prev => {
        const newSchedule = { ...prev };
        Object.entries(calendarUpdates).forEach(([date, shifts]) => {
          // Merge with existing shifts for this date
          const existingShifts = newSchedule[date] || [];
          const allShifts = [...existingShifts];
          
          (shifts as string[]).forEach(shift => {
            if (!allShifts.includes(shift)) {
              allShifts.push(shift);
            }
          });
          
          newSchedule[date] = allShifts;
        });
        return newSchedule;
      });
      
      // Update special dates
      setSpecialDates(prev => {
        const newSpecialDates = { ...prev };
        Object.entries(specialDateUpdates).forEach(([date, isSpecial]) => {
          newSpecialDates[date] = isSpecial as boolean;
        });
        return newSpecialDates;
      });
      
      // Force refresh calculations
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
    return () => window.removeEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
  }, [setSchedule, setSpecialDates]);
  
  // Listen for tab switch requests
  useEffect(() => {
    const handleSwitchToCalendar = () => {
      setActiveTab('calendar');
      // Force refresh when switching to calendar after export
      setRefreshKey(prev => prev + 1);
    };

    const handleCloseCalendarExportModal = () => {
      setShowCalendarExportModal(false);
    };

    const handleDebugCalendarState = () => {
    };
    window.addEventListener('switchToCalendarTab', handleSwitchToCalendar);
    window.addEventListener('closeCalendarExportModal', handleCloseCalendarExportModal);
    window.addEventListener('debugCalendarState', handleDebugCalendarState);
    return () => {
      window.removeEventListener('switchToCalendarTab', handleSwitchToCalendar);
      window.removeEventListener('closeCalendarExportModal', handleCloseCalendarExportModal);
      window.removeEventListener('debugCalendarState', handleDebugCalendarState);
    };
  }, [schedule, specialDates, currentDate]);
  // Initialize content animation when component mounts
  useEffect(() => {
    if (contentRef.current && showMainApp) {
      gsap.fromTo(contentRef.current,
        {
          opacity: 0,
          y: 30,
          scale: 0.95,
          force3D: true
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          force3D: true
        }
      );
    }
  }, [showMainApp]);

  const handleTabChange = (newTab: 'calendar' | 'settings' | 'data' | 'roster') => {
    // Immediately update the active tab state for instant UI feedback
    setActiveTab(newTab);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentYear, currentMonth + (direction === 'next' ? 1 : -1), 1));
  };

  const formatDateKey = (day: number) => {
    return `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(day);
    setSelectedDate(dateKey);
    setShowModal(true);
  };

  const canSelectShift = (shiftId: string, dateKey: string) => {
    const currentShifts = schedule[dateKey] || [];
    
    // 9-4 and 12-10 cannot overlap
    if (shiftId === '9-4' && currentShifts.includes('12-10')) return false;
    if (shiftId === '12-10' && currentShifts.includes('9-4')) return false;
    
    // 12-10 and 4-10 cannot overlap
    if (shiftId === '12-10' && currentShifts.includes('4-10')) return false;
    if (shiftId === '4-10' && currentShifts.includes('12-10')) return false;
    
    return true;
  };

  const toggleShift = (shiftId: string) => {
    if (!selectedDate) return;
    
    const currentShifts = schedule[selectedDate] || [];
    
    if (currentShifts.includes(shiftId)) {
      // Remove shift
      const updatedShifts = currentShifts.filter(id => id !== shiftId);
      setSchedule(prev => ({
        ...prev,
        [selectedDate]: updatedShifts.length > 0 ? updatedShifts : []
      }));
    } else {
      // Add shift if allowed
      if (canSelectShift(shiftId, selectedDate)) {
        setSchedule(prev => ({
          ...prev,
          [selectedDate]: [...currentShifts, shiftId]
        }));
      }
    }
    
    // FIXED: Force refresh calculations when shifts change
    setRefreshKey(prev => prev + 1);
  };

  // Handle roster to calendar synchronization
  const handleRosterCalendarSync = useCallback((event: CustomEvent) => {
    const rosterChange = event.detail;
    
    const syncResult = syncRosterToCalendar(rosterChange, {
      calendarLabel: scheduleTitle, // Use the calendar title as the label
      schedule,
      specialDates,
      setSchedule,
      setSpecialDates,
      entries: [] // Pass empty array since we don't have roster entries in App.tsx
    });
    
    if (syncResult) {
      // Force refresh calculations after sync
      setRefreshKey(prev => prev + 1);
    }
  }, [scheduleTitle, schedule, specialDates, setSchedule, setSpecialDates]);

  // Handle force calendar refresh
  const handleForceCalendarRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Listen for roster changes
  useEffect(() => {
    window.addEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
    window.addEventListener('forceCalendarRefresh', handleForceCalendarRefresh as EventListener);
    return () => {
      window.removeEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
      window.removeEventListener('forceCalendarRefresh', handleForceCalendarRefresh as EventListener);
    };
  }, [handleRosterCalendarSync, handleForceCalendarRefresh]);

  // Handle showing clear date modal
  const toggleSpecialDate = useCallback((dateKey: string, isSpecial: boolean) => {
    setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      if (isSpecial) {
        newSpecialDates[dateKey] = true;
      } else {
        delete newSpecialDates[dateKey];
      }
      return newSpecialDates;
    });
  }, [setSpecialDates]);

  // Reset month function
  const handleResetMonth = useCallback(async (year: number, month: number, specificDay?: number, showAlert: boolean = true) => {
    try {
      if (specificDay) {
        // Clear only the specific date
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${specificDay.toString().padStart(2, '0')}`;
        
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
        
        // Force refresh calculations
        setRefreshKey(prev => prev + 1);
        
        return;
      }
      
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
      
      // Force refresh calculations
      setRefreshKey(prev => prev + 1);
      
      // Show success feedback only if requested
      if (showAlert) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        alert(`✅ Successfully cleared all data for ${monthNames[month]} ${year}`);
      }
      
    } catch (error) {
      alert('❌ Error resetting month data. Please try again.');
    }
  }, [setSchedule, setSpecialDates]);

  // Handle showing delete month modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const updateBasicSalary = useCallback(async (salary: number) => {
    const hourlyRate = (salary * 12) / 52 / 40;
    setSettings(prev => ({
      ...prev,
      basicSalary: salary,
      hourlyRate: hourlyRate
    }));

    // Update only current year's months with salary = 0 to keep using global salary
    try {
      const allMonthlySalaries = await workScheduleDB.getAllMonthlySalaries();
      const currentYearValue = currentYear;

      // Create a set of all months in the current year (0-11)
      const allMonthsInYear: Array<[number, number]> = [];
      for (let month = 0; month < 12; month++) {
        allMonthsInYear.push([currentYearValue, month]);
      }

      // For each month in current year, if it doesn't exist or is 0, set it to 0
      const updatePromises = allMonthsInYear.map(async ([year, month]) => {
        const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
        const existingSalary = allMonthlySalaries[monthKey];

        // Only update if it doesn't exist (undefined) or is 0
        if (existingSalary === undefined || existingSalary === 0) {
          return workScheduleDB.setMonthlySalary(year, month, 0);
        }
      });

      await Promise.all(updatePromises);

      // Force refresh calculations to use new salary
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update monthly salaries:', error);
    }
  }, [setSettings, currentYear]);

  const handleMonthlySalaryChange = useCallback(async (year: number, month: number, salary: number) => {
    try {
      await workScheduleDB.setMonthlySalary(year, month, salary);

      // If updating current month, update state and refresh calculations
      if (year === currentYear && month === currentMonth) {
        setMonthlySalary(salary);
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to set monthly salary:', error);
    }
  }, [currentYear, currentMonth]);

  const updateShiftHours = useCallback((combinationId: string, hours: number) => {
    setSettings(prev => ({
      ...prev,
      shiftCombinations: prev.shiftCombinations.map(combo =>
        combo.id === combinationId ? { ...combo, hours } : combo
      )
    }));
  }, [setSettings]);

  const handleExportData = async () => {
    try {
      const exportData = await workScheduleDB.exportAllData();
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename || 'ANWH_export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed. Please try again.');
    }
  };

  const handleImportData = async (data: any) => {
    try {
      // Import data to IndexedDB
      await workScheduleDB.importAllData(data);
      
      // Show loading state during refresh
      
      // Refresh all data with proper error handling
      const refreshPromises = [
        refreshData().catch(err => console.error('Failed to refresh schedule data:', err)),
        refreshSettings().catch(err => console.error('Failed to refresh settings:', err)),
        refreshTitle().catch(err => console.error('Failed to refresh title:', err))
      ];
      
      await Promise.allSettled(refreshPromises);
      
      // Force multiple calculation refreshes with delays
      const triggerRefresh = (delay: number, label: string) => {
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, delay);
      };
      
      // Immediate refresh
      setRefreshKey(prev => prev + 1);
      
      // Staggered refreshes
      triggerRefresh(200, 'First delayed');
      triggerRefresh(500, 'Second delayed');
      triggerRefresh(1000, 'Final delayed');

      // Redirect to calendar tab instead of reloading
      setTimeout(() => {
        setActiveTab('calendar');
      }, 1200); // Wait for all refreshes to complete
      
      const version = data.version || '1.0';
      if (version === '1.0') {
        alert('Data imported successfully! Note: This was an older format file. Special date information was not available and has been reset.');
      } else {
        alert('Data imported successfully!');
      }
    } catch (error) {
      alert('Error importing data. Please check the file format.');
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleTitleUpdate = (newTitle: string) => {
    setScheduleTitle(newTitle);
  };

  const handleOpenCalendarExportModal = () => {
    setShowCalendarExportModal(true);
  };

  const handleCloseCalendarExportModal = () => {
    setShowCalendarExportModal(false);
  };

  // Show error if data loading failed
  if (dataError && showMainApp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Database Error</h2>
          <p className="text-gray-700 mb-6">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show enhanced loading screen with longer duration
  if (!showMainApp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100" style={{ 
        minHeight: '-webkit-fill-available',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Work Schedule Calendar
          </h2>
          
          <p className="text-lg text-gray-700 mb-6">
            Created by NARAYYA
          </p>
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-gray-600 text-lg">Loading your workspace...</span>
          </div>
          
          <div className="space-y-3 text-base text-gray-600">
            <p>• Initializing offline database</p>
            <p>• Loading schedule data</p>
            <p>• Preparing settings</p>
            <p>• Calculating amounts</p>
            <p>• Setting up interface</p>
          </div>
          
          <div className="mt-8 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-600 h-2 rounded-full transition-all duration-100 ease-out" 
              style={{ 
                width: `${smoothProgress}%`,
                transition: 'width 0.1s ease-out'
              }}
            ></div>
          </div>
          
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-600 font-mono tabular-nums">{smoothProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Main app interface - show when data is ready
  return (
    <>
      <div 
        className="min-h-screen bg-black select-none p-4"
        style={{ 
          minHeight: '100vh',
          backfaceVisibility: 'hidden',
          marginTop: '0px',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          backgroundColor: 'white !important', // Match navigation tab color
          // Remove overflow restrictions for mobile
          WebkitOverflowScrolling: 'touch', // Enable smooth iOS scrolling
          touchAction: 'pan-y' // Allow vertical touch scrolling
        }}
      >
        {/* Tab Navigation */}
        <div className="sticky top-0 z-50 bg-white">
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        
        {/* Content with smooth transitions */}
        <div 
          ref={contentRef}
          style={{
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden'
          }}
        >
          {activeTab === 'calendar' ? (
            <Calendar
              currentDate={currentDate}
              schedule={schedule}
              specialDates={specialDates}
              onDateClick={handleDateClick}
              onNavigateMonth={navigateMonth}
              totalAmount={totalAmount}
              monthToDateAmount={monthToDateAmount}
              onDateChange={handleDateChange}
              scheduleTitle={scheduleTitle}
              onTitleUpdate={handleTitleUpdate}
              setSchedule={setSchedule}
              setSpecialDates={setSpecialDates}
              monthlySalary={monthlySalary}
              onMonthlySalaryChange={handleMonthlySalaryChange}
              globalSalary={settings.basicSalary}
            />
          ) : activeTab === 'settings' ? (
            <SettingsPanel
              settings={settings}
              onUpdateBasicSalary={updateBasicSalary}
              onUpdateShiftHours={updateShiftHours}
            />
          ) : activeTab === 'data' ? (
            <MenuPanel
              onImportData={handleImportData}
              onExportData={handleExportData}
            />
          ) : (
            <RosterPanel
              key={refreshKey}
              setActiveTab={setActiveTab}
              onOpenCalendarExportModal={handleOpenCalendarExportModal}
              selectedDate={currentDate}
              onDateChange={handleDateChange}
              basicSalary={settings.basicSalary}
              hourlyRate={settings.hourlyRate}
            />
          )}
        </div>

        {/* Modals - Outside of any scrollable content */}
        {showModal && (
          <>
            <ShiftModal
              selectedDate={selectedDate}
              schedule={schedule}
              specialDates={specialDates}
              onToggleShift={toggleShift}
              onToggleSpecialDate={toggleSpecialDate}
              onClose={closeModal}
            />
            <RosterPanel
              setActiveTab={setActiveTab}
              onOpenCalendarExportModal={handleOpenCalendarExportModal}
              basicSalary={settings.basicSalary}
              hourlyRate={settings.hourlyRate}
            />
          </>
        )}

        {/* Calendar Export Modal */}
        <CalendarExportModal
          isOpen={showCalendarExportModal}
          onClose={handleCloseCalendarExportModal}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />

      </div>
    </>
  );
}

export default App;