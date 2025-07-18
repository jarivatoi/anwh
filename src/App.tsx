import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { ShiftModal } from './components/ShiftModal';
import { SettingsPanel } from './components/SettingsPanel';
import { MenuPanel } from './components/MenuPanel';
import { ClearDateModal } from './components/ClearDateModal';
import { DeleteMonthModal } from './components/DeleteMonthModal';
import TabNavigation from './components/TabNavigation';
import { useScheduleCalculations } from './hooks/useScheduleCalculations';
import { useIndexedDB, useScheduleData } from './hooks/useIndexedDB';
import { workScheduleDB } from './utils/indexedDB';
import { DEFAULT_SHIFT_COMBINATIONS } from './constants';
import { AddToHomescreen } from './utils/addToHomescreen';
import { DaySchedule, SpecialDates, Settings, ExportData } from './types';
import { gsap } from 'gsap';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'data'>('calendar');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Add artificial loading delay for better UX
  const [artificialLoading, setArtificialLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Use IndexedDB hooks
  const { schedule, specialDates, setSchedule, setSpecialDates, isLoading: dataLoading, error: dataError, refreshData } = useScheduleData();
  const [scheduleTitle, setScheduleTitle, { isLoading: titleLoading, refresh: refreshTitle }] = useIndexedDB<string>('scheduleTitle', 'Work Schedule', 'metadata');
  const [settings, setSettings, { isLoading: settingsLoading, refresh: refreshSettings }] = useIndexedDB<Settings>('workSettings', {
    basicSalary: 35000,
    hourlyRate: 173.08,
    shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
  });

  // Debug logging for settings
  console.log('🔧 App component - Settings state:', {
    settings,
    hasSettings: !!settings,
    hasShiftCombinations: !!settings?.shiftCombinations,
    combinationsCount: settings?.shiftCombinations?.length || 0,
    settingsLoading,
    basicSalary: settings?.basicSalary,
    hourlyRate: settings?.hourlyRate
  });

  // Pass specialDates to the calculation hook with refreshKey dependency
  const { totalAmount, monthToDateAmount } = useScheduleCalculations(schedule, settings, specialDates, currentDate, refreshKey);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Check if data is loading
  const isDataLoading = dataLoading || titleLoading || settingsLoading;

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

  // Combined loading state
  const isLoading = isDataLoading || artificialLoading;

  // Initialize Add to Home Screen functionality
  useEffect(() => {
    if (!isLoading) {
      console.log('🏠 Creating AddToHomescreen instance...');
      
      // Create AddToHomescreen instance
      const addToHomescreenInstance = new AddToHomescreen({
        appName: 'X-ray ANWH',
        appIconUrl: 'https://jarivatoi.github.io/anwh/Icon.PNG',
        maxModalDisplayCount: 3, // Allow multiple attempts
        skipFirstVisit: false,
        startDelay: 1000, // Shorter delay for first visit
        lifespan: 20000,
        mustShowCustomPrompt: false // Use normal detection logic
      });
      // The AddToHomescreen instance will handle timing with startDelay
      console.log('⏰ Checking if can prompt...');
      console.log('Debug info:', {
        isStandalone: addToHomescreenInstance.isStandalone(),
        canPrompt: addToHomescreenInstance.canPrompt(),
        localStorage: localStorage.getItem('addToHomescreenInstallPromptShown'),
        modalCount: localStorage.getItem('addToHomescreenModalCount'),
        permanentlyDismissed: localStorage.getItem('addToHomescreenPermanentlyDismissed')
      });
      
      if (addToHomescreenInstance.canPrompt()) {
        console.log('✅ Showing Add to Homescreen prompt');
        addToHomescreenInstance.show();
      } else {
        console.log('❌ Cannot show Add to Homescreen prompt - conditions not met');
      }
    }
  }, [isLoading]);

  // Initialize content animation when component mounts
  useEffect(() => {
    if (contentRef.current && !isLoading) {
      console.log('🎨 Initializing main app animations');
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
  }, [isLoading]);

  // Smooth tab transition with easing
  const handleTabChange = (newTab: 'calendar' | 'settings' | 'data') => {
    if (newTab === activeTab || !contentRef.current) return;

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
        console.log(`🗑️ Clearing specific date: ${specificDay}/${month + 1}/${year}`);
        
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
        
        console.log(`✅ Successfully cleared date ${specificDay}/${month + 1}/${year}`);
        return;
      }
      
      console.log(`🗑️ Resetting month data for ${month + 1}/${year}`);
      
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
      
      console.log(`✅ Successfully reset month data for ${month + 1}/${year}`);
      
      // Show success feedback only if requested
      if (showAlert) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        alert(`✅ Successfully cleared all data for ${monthNames[month]} ${year}`);
      }
      
    } catch (error) {
      console.error('❌ Error resetting month:', error);
      alert('❌ Error resetting month data. Please try again.');
    }
  }, [setSchedule, setSpecialDates]);

  // Handle showing delete month modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const updateBasicSalary = useCallback((salary: number) => {
    const hourlyRate = (salary * 12) / 52 / 40;
    console.log('💰 Updating salary:', { salary, hourlyRate });
    setSettings(prev => ({
      ...prev,
      basicSalary: salary,
      hourlyRate: hourlyRate
    }));
  }, [setSettings]);

  const updateShiftHours = useCallback((combinationId: string, hours: number) => {
    console.log('⏰ Updating shift hours:', { combinationId, hours });
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
      console.log('📦 Export data with filename:', exportData.filename);
      
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
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleImportData = async (data: any) => {
    try {
      console.log('🔄 Starting import process with data:', data);
      
      // Import data to IndexedDB
      await workScheduleDB.importAllData(data);
      console.log('✅ Data imported to IndexedDB');
      
      // Show loading state during refresh
      console.log('🔄 Refreshing all data from database...');
      
      // Refresh all data with proper error handling
      const refreshPromises = [
        refreshData().catch(err => console.error('Failed to refresh schedule data:', err)),
        refreshSettings().catch(err => console.error('Failed to refresh settings:', err)),
        refreshTitle().catch(err => console.error('Failed to refresh title:', err))
      ];
      
      await Promise.allSettled(refreshPromises);
      console.log('✅ All data refresh attempts completed');
      
      // Force multiple calculation refreshes with delays
      const triggerRefresh = (delay: number, label: string) => {
        setTimeout(() => {
          console.log(`🔄 ${label} refresh key update`);
          setRefreshKey(prev => prev + 1);
        }, delay);
      };
      
      // Immediate refresh
      setRefreshKey(prev => prev + 1);
      

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
      console.error('Import failed:', error);
      alert('Error importing data. Please check the file format.');
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleTitleUpdate = (newTitle: string) => {
    setScheduleTitle(newTitle);
  };

  // Show error if data loading failed
  if (dataError) {
    console.log('❌ Showing error screen:', dataError);
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
  if (isLoading) {
    console.log('⏳ Data still loading, showing enhanced loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100" style={{ minHeight: '100vh', minHeight: '-webkit-fill-available' }}>
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
  console.log('🎯 Showing main app interface');
  return (
    <>
      <div 
        className="min-h-screen bg-black select-none p-4"
        style={{ 
          minHeight: '100vh',
          minHeight: '100dvh', // Dynamic viewport height for mobile
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          backgroundColor: 'black !important', // Force black background
          // Remove overflow restrictions for mobile
          WebkitOverflowScrolling: 'touch', // Enable smooth iOS scrolling
          touchAction: 'pan-y' // Allow vertical touch scrolling
        }}
      >
        {/* Tab Navigation */}
        <div className="mb-4">
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
            />
          ) : activeTab === 'settings' ? (
            <SettingsPanel
              settings={settings}
              onUpdateBasicSalary={updateBasicSalary}
              onUpdateShiftHours={updateShiftHours}
            />
          ) : (
            <MenuPanel
              onImportData={handleImportData}
              onExportData={handleExportData}
            />
          )}
        </div>

        {/* Modals - Outside of any scrollable content */}
        {showModal && (
          <ShiftModal
            selectedDate={selectedDate}
            schedule={schedule}
            specialDates={specialDates}
            onToggleShift={toggleShift}
            onToggleSpecialDate={toggleSpecialDate}
            onClose={closeModal}
          />
        )}

      </div>
    </>
  );
}

export default App;