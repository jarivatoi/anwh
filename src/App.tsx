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
import { DaySchedule, SpecialDates, Settings, ExportData, DateNotes } from './types';
import { gsap } from 'gsap';
import { RosterPanel } from './components/RosterPanel';
import { syncRosterToCalendar } from './utils/rosterCalendarSync';
import { fetchRosterEntries } from './utils/rosterApi';

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

  // Add date notes state
  const [dateNotes, setDateNotes] = useState<DateNotes>({});

  // Add special date texts state (stores the actual remarks text from roster)
  const [specialDateTexts, setSpecialDateTexts] = useState<Record<string, string>>({});

  // Add manual mode state
  const [useManualMode, setUseManualMode] = useState(false);

  // Load date notes and manual mode on mount
  useEffect(() => {
    const loadDateNotesAndManualMode = async () => {
      try {
        await workScheduleDB.init();
        const [notes, settingsData] = await Promise.all([
          workScheduleDB.getDateNotes(),
          workScheduleDB.getSetting('workSettings')
        ]);
        
        if (notes && Object.keys(notes).length > 0) {
          setDateNotes(notes);
        }
        
        if (settingsData?.useManualMode !== undefined) {
          setUseManualMode(settingsData.useManualMode);
        }
      } catch (error) {
        console.error('Failed to load date notes/manual mode:', error);
      }
    };
    
    loadDateNotesAndManualMode();
  }, []);

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
  
  // Listen for bulk calendar updates from calendar export
  useEffect(() => {
    const handleBulkCalendarUpdate = (event: CustomEvent) => {
      const { calendarUpdates, specialDateUpdates, editorName, source, entries } = event.detail;
      
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
  
  // Function to check roster entries for special dates and update calendar - SAFE VERSION
  const syncRosterSpecialDatesToCalendar = useCallback(async () => {
    try {
      console.log('🔍 Syncing roster special dates to calendar...');
      
      // Only proceed if Supabase is available
      if (!fetchRosterEntries) {
        console.warn('⚠️ fetchRosterEntries not available, skipping sync');
        return;
      }
      
      // Fetch all roster entries (with timeout protection)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching roster entries')), 5000)
      );
      
      const fetchPromise = fetchRosterEntries();
      const allRosterEntries = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Check each entry for special date info
      const specialDateFlags: Record<string, boolean> = {};
      const specialDateTextMap: Record<string, string> = {};
      
      allRosterEntries.forEach(entry => {
        if (entry.change_description && entry.change_description.includes('Special Date:')) {
          const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
          if (match && match[1].trim()) {
            const specialText = match[1].trim();
            specialDateFlags[entry.date] = true;
            specialDateTextMap[entry.date] = specialText;
            console.log(`🌟 Found special date in roster: ${entry.date} - "${specialText}"`);
          }
        }
      });
      
      // Update special dates state if any found
      if (Object.keys(specialDateFlags).length > 0) {
        console.log(`✅ Updating calendar with ${Object.keys(specialDateFlags).length} special dates from roster`);
        
        // Update special date flags
        setSpecialDates(prev => ({
          ...prev,
          ...specialDateFlags
        }));
        
        // Update special date texts
        setSpecialDateTexts(prev => ({
          ...prev,
          ...specialDateTextMap
        }));
        
        // Force refresh calculations
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.warn('⚠️ Skipping roster special date sync:', error instanceof Error ? error.message : error);
      // Don't fail the app - just skip the sync
    }
  }, [setSpecialDates, setSpecialDateTexts, setRefreshKey]);
  
  // Sync roster special dates when app loads (after main app is shown) - COMPLETELY SAFE
  useEffect(() => {
    if (!showMainApp) return;
    
    console.log('🚀 [SYNC] Effect triggered, showMainApp =', showMainApp);
    
    // Use a completely isolated async call that won't affect main app
    const runSync = async () => {
      try {
        console.log('🔵 [SYNC] Starting background roster special date sync...');
        
        // Wait a bit to ensure main app is stable
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔵 [SYNC] Fetching roster entries...');
        let allRosterEntries;
        try {
          // Try to fetch with timeout
          const fetchPromise = fetchRosterEntries();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          allRosterEntries = await Promise.race([fetchPromise, timeoutPromise]);
          console.log('🔵 [SYNC] Fetched', allRosterEntries.length, 'entries');
        } catch (fetchError) {
          console.warn('⚠️ [SYNC] Cannot fetch roster entries:', fetchError);
          return; // Just exit, don't crash
        }
        
        console.log(`🔵 [SYNC] Processing ${allRosterEntries.length} roster entries...`);
        
        // Process entries
        const specialDateFlags: Record<string, boolean> = {};
        const specialDateTextMap: Record<string, string> = {};
        
        allRosterEntries.forEach(entry => {
          if (entry.change_description && entry.change_description.includes('Special Date:')) {
            const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
            if (match && match[1].trim()) {
              const specialText = match[1].trim();
              specialDateFlags[entry.date] = true;
              specialDateTextMap[entry.date] = specialText;
              console.log('🌟 [SYNC] Special date:', entry.date, '=', specialText);
            }
          }
        });
        
        // Update states safely
        if (Object.keys(specialDateFlags).length > 0) {
          console.log(`✅ [SYNC] Found ${Object.keys(specialDateFlags).length} special dates`);
          
          setSpecialDates(prev => { 
            console.log('[SYNC] Updating specialDates');
            return { ...prev, ...specialDateFlags }; 
          });
          setSpecialDateTexts(prev => { 
            console.log('[SYNC] Updating specialDateTexts');
            return { ...prev, ...specialDateTextMap }; 
          });
          setRefreshKey(prev => { 
            console.log('[SYNC] Incrementing refreshKey');
            return prev + 1; 
          });
        } else {
          console.log('ℹ️ [SYNC] No special dates found');
        }
        
      } catch (error) {
        console.error('❌ [SYNC] Background sync failed:', error);
        // App continues normally even if sync fails
      }
    };
    
    // Run in background
    runSync();
  }, [showMainApp]);
  
  // Also sync when roster is refreshed (listen for rosterUpdated event)
  useEffect(() => {
    const handleRosterUpdate = () => {
      console.log('🔄 Roster updated detected, syncing special dates...');
      syncRosterSpecialDatesToCalendar();
    };
    
    window.addEventListener('rosterUpdated', handleRosterUpdate as EventListener);
    return () => window.removeEventListener('rosterUpdated', handleRosterUpdate as EventListener);
  }, []);
  
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

  // Handle note update for a date
  const handleUpdateNote = useCallback(async (dateKey: string, note: string) => {
    setDateNotes(prev => {
      const updated = {
        ...prev,
        [dateKey]: note
      };
      
      // Save to IndexedDB
      workScheduleDB.setDateNotes(updated).catch(err => {
        console.error('Failed to save date note:', err);
      });
      
      return updated;
    });
  }, []);

  // Handle manual amount update
  const handleUpdateManualAmount = useCallback((combinationId: string, manualAmount: number) => {
    setSettings(prev => {
      const updatedCombinations = prev.shiftCombinations.map(combo => {
        if (combo.id === combinationId) {
          return {
            ...combo,
            useManualAmount: true,
            manualAmount
          };
        }
        return combo;
      });
      
      return {
        ...prev,
        shiftCombinations: updatedCombinations
      };
    });
  }, [setSettings]);

  // Handle manual mode toggle
  const handleToggleManualMode = useCallback((enabled: boolean) => {
    setUseManualMode(enabled);
    setSettings(prev => ({
      ...prev,
      useManualMode: enabled
    }));
  }, [setSettings]);

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

    // BEFORE saving new salary, lock in past years with old global salary
    try {
      const allMonthlySalaries = await workScheduleDB.getAllMonthlySalaries();
      const currentYearValue = currentYear;
      const oldGlobalSalary = settings?.basicSalary || 0;

      // Convert all unedited months in past years to explicit values
      const lockInPromises: Promise<void>[] = [];

      // For each past year
      for (let year = 2020; year < currentYearValue; year++) {
        for (let month = 0; month < 12; month++) {
          const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
          const existingSalary = allMonthlySalaries[monthKey];

          // If month has no explicit salary set (undefined or 0), lock it to old global salary
          if (existingSalary === undefined || existingSalary === 0) {
            lockInPromises.push(workScheduleDB.setMonthlySalary(year, month, oldGlobalSalary));
          }
        }
      }

      // Wait for all past months to be locked in
      await Promise.all(lockInPromises);

      // NOW save the new global salary
      setSettings(prev => ({
        ...prev,
        basicSalary: salary,
        hourlyRate: hourlyRate
      }));

      // Ensure current year months with salary = 0 stay at 0 (to use new global salary)
      const currentYearPromises = [];
      for (let month = 0; month < 12; month++) {
        const monthKey = `${currentYearValue}-${(month + 1).toString().padStart(2, '0')}`;
        const existingSalary = allMonthlySalaries[monthKey];

        // Only update if it doesn't exist (undefined) or is 0
        if (existingSalary === undefined || existingSalary === 0) {
          currentYearPromises.push(workScheduleDB.setMonthlySalary(currentYearValue, month, 0));
        }
      }

      await Promise.all(currentYearPromises);

      // Force refresh calculations to use new salary
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update monthly salaries:', error);
    }
  }, [setSettings, currentYear, settings?.basicSalary]);

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
      // Export directly from React state (like MIT)
      const exportData = {
        schedule,
        specialDates,
        dateNotes,
        settings,
        scheduleTitle: scheduleTitle || 'Work Schedule',
        exportDate: new Date().toISOString(),
        version: '3.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      
      // Create filename with date
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      link.download = `ANWH_${day}-${month}-${year}.json`;
      
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
      // Validate imported data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
      // Import directly to React state (like MIT)
      if (data.schedule) {
        setSchedule(data.schedule);
      }
      
      if (data.specialDates) {
        setSpecialDates(data.specialDates);
      }
      
      if (data.dateNotes) {
        setDateNotes(data.dateNotes);
      }
      
      if (data.settings) {
        setSettings(data.settings);
        
        // Update manual mode from settings
        if (data.settings.useManualMode !== undefined) {
          setUseManualMode(data.settings.useManualMode);
        }
      }
      
      if (data.scheduleTitle) {
        setScheduleTitle(data.scheduleTitle);
      }
      
      // Save to IndexedDB in background
      try {
        await workScheduleDB.importAllData(data);
      } catch (dbError) {
        console.warn('IndexedDB save failed, but state updated:', dbError);
      }
      
      // Force refresh calculations
      setRefreshKey(prev => prev + 1);
      
      // Switch to calendar tab after successful import
      setTimeout(() => {
        setActiveTab('calendar');
      }, 100);
    } catch (error) {
      console.error('Import error:', error);
      throw error; // Re-throw to be caught by MenuPanel
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
              dateNotes={dateNotes}
              specialDateTexts={specialDateTexts}
              setDateNotes={setDateNotes}
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
              useManualMode={useManualMode}
              onToggleManualMode={handleToggleManualMode}
              onUpdateBasicSalary={updateBasicSalary}
              onUpdateShiftHours={updateShiftHours}
              onUpdateManualAmount={handleUpdateManualAmount}
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
          <ShiftModal
            selectedDate={selectedDate}
            schedule={schedule}
            specialDates={specialDates}
            dateNotes={dateNotes}
            onUpdateNote={handleUpdateNote}
            onToggleShift={toggleShift}
            onToggleSpecialDate={toggleSpecialDate}
            onClose={closeModal}
          />
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