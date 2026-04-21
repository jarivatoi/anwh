/**
 * ANWH App.tsx with MIT Authentication Integration
 * 
 * This file integrates the MIT authentication system (StaffOnboard, StaffLogin, ProfileTab)
 * while preserving all existing ANWH functionality (Calendar, Settings, Roster, etc.)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { ShiftModal } from './components/ShiftModal';
import { SettingsPanel } from './components/SettingsPanel';
import { MenuPanel } from './components/MenuPanel';
import { CalendarExportModal } from './components/CalendarExportModal';
import TabNavigation from './components/TabNavigation';
import { useScheduleCalculations } from './hooks/useScheduleCalculations';
import { useIndexedDB, useScheduleData } from './hooks/useIndexedDB';
import { workScheduleDB } from './utils/indexedDB';
import { DEFAULT_SHIFT_COMBINATIONS } from './constants';
import { AddToHomescreen } from './utils/addToHomescreen';
import { Settings } from './types';
import { gsap } from 'gsap';
import { RosterPanel } from './components/RosterPanel';
import { syncRosterToCalendar } from './utils/rosterCalendarSync';
import { fetchRosterEntries } from './utils/rosterApi';
import { exportCompleteDatabase } from './utils/databaseExport';
import { MaintenanceMode } from './components/MaintenanceMode';
import { supabase } from './lib/supabase';

// MIT Authentication Components
import StaffOnboard from './components/StaffOnboard';
import StaffLogin from './components/StaffLogin';
import ProfileTab from './components/ProfileTab';

// IndexedDB Session Management
import { 
  saveUserSession, 
  removeUserSession,
  saveLastUsedIdNumber,
  getUserSession
} from './utils/indexedDB';

// Type Definitions
type UserSession = { 
  userId: string; 
  idNumber: string; 
  surname?: string; 
  name?: string; 
  isAdmin: boolean 
} | null;

// For ProfileTab and RosterPanel compatibility
type UserProfile = {
  id: string;
  idNumber: string;
  surname: string;
  name: string;
  isAdmin: boolean;
};

const userToProfile = (user: UserSession): UserProfile | null => {
  if (!user) return null;
  return {
    id: user.userId,
    idNumber: user.idNumber,
    surname: user.surname || '',
    name: user.name || '',
    isAdmin: user.isAdmin
  };
};

type AuthPhase = 'onboard' | 'login' | 'main' | null;

function App() {
  // ========================================
  // AUTHENTICATION STATE (NEW - MIT Integration)
  // ========================================
  const [phase, setPhase] = useState<AuthPhase>(null);
  const [user, setUser] = useState<UserSession>(null);
  const [loginKey, setLoginKey] = useState(0); // Force re-mount of StaffLogin
  
  // ========================================
  // MAIN APP STATE (Must be declared even during auth phase)
  // ========================================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'data' | 'roster' | 'profile'>('calendar');
  const [showCalendarExportModal, setShowCalendarExportModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingState, setLoadingState] = useState({
    artificialLoading: true,
    smoothProgress: 0,
    showMainApp: false,
    rosterSyncComplete: false
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const maxSmoothProgressRef = useRef(0);
  const [scheduleTitle, setScheduleTitle] = useIndexedDB<string>('scheduleTitle', 'WORK SCHEDULE', 'metadata');
  const [settings, setSettings] = useIndexedDB<Settings>('workSettings', {
    basicSalary: 35000,
    hourlyRate: 201.92,
    shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [specialDateTexts, setSpecialDateTexts] = useIndexedDB<Record<string, string>>('specialDateTexts', {}, 'metadata');
  const [useManualMode, setUseManualMode] = useState(false);
  
  // Initialize auth phase on mount
  useEffect(() => {
    setPhase('login');
  }, []);
  
  // Subscribe to Supabase Realtime changes for maintenance mode
  useEffect(() => {
    if (!supabase) return;
    
    const channel = supabase
      .channel('maintenance-mode-app')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metadata',
          filter: 'key=eq.maintenanceMode'
        },
        (payload: any) => {
          const newValue = payload.new?.value;
          setMaintenanceMode(newValue === true);
          
          // No reload needed - React state handles everything
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Set up global event listener for maintenance auth (works even when showing maintenance screen)
  useEffect(() => {
    const handleShowMaintenanceAuth = () => {
      const existingModal = document.getElementById('maintenanceAuthModal');
      if (existingModal) {
        return;
      }
      
      const modalDiv = document.createElement('div');
      modalDiv.id = 'maintenanceAuthModal';
      modalDiv.className = 'fixed inset-0 bg-black bg-opacity-50';
      modalDiv.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        z-index: 999999 !important;
        background-color: rgba(0, 0, 0, 0.3) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 16px !important;
        backdrop-filter: blur(4px) !important;
      `;
      
      modalDiv.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 select-none" style="user-select: none; -webkit-user-select: none;">
          <h3 class="text-xl font-bold text-gray-900 mb-4 text-center select-none">Admin Authentication Required</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2 select-none">Authentication Code</label>
            <input 
              type="password" 
              id="maintenanceAuthInput"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg"
              placeholder="Enter admin code"
              maxlength="4"
              autocomplete="off"
            />
            <p id="maintenanceAuthError" class="mt-2 text-sm text-red-600 hidden"></p>
          </div>
          <div class="flex space-x-3">
            <button id="maintenanceAuthCancel" class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 select-none touch-none" style="user-select: none; -webkit-user-select: none;">Cancel</button>
            <button id="maintenanceAuthSubmit" class="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 select-none touch-none" style="user-select: none; -webkit-user-select: none;" disabled>Continue</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modalDiv);
      
      const input = document.getElementById('maintenanceAuthInput') as HTMLInputElement;
      if (input) {
        input.focus();
      }
      
      const handleSubmit = async () => {
        const code = input?.value || '';
        const errorEl = document.getElementById('maintenanceAuthError');
        const submitBtn = document.getElementById('maintenanceAuthSubmit') as HTMLButtonElement;
        
        if (code === '5274') {
          try {
            await updateMaintenanceModeInDB(false);
            // Force reload to ensure app re-renders with updated state
            window.location.href = window.location.origin + window.location.pathname;
          } catch (error: any) {
            console.error('❌ Failed to disable maintenance:', error);
            if (errorEl) {
              errorEl.textContent = 'Failed to disable maintenance. Please try again.';
              errorEl.classList.remove('hidden');
            }
          }
        } else {
          if (errorEl) {
            errorEl.textContent = 'Invalid admin code';
            errorEl.classList.remove('hidden');
          }
          if (submitBtn) {
            submitBtn.disabled = true;
          }
        }
      };
      
      const submitBtn = document.getElementById('maintenanceAuthSubmit') as HTMLButtonElement;
      const cancelBtn = document.getElementById('maintenanceAuthCancel');
      
      // Enable/disable button based on input
      const authInput = document.getElementById('maintenanceAuthInput') as HTMLInputElement;
      if (authInput) {
        authInput.addEventListener('input', () => {
          if (submitBtn) {
            submitBtn.disabled = authInput.value !== '5274';
          }
        });
      }
      
      submitBtn?.addEventListener('click', handleSubmit);
      cancelBtn?.addEventListener('click', () => {
        if (document.body.contains(modalDiv)) {
          document.body.removeChild(modalDiv);
        }
      });
      
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleSubmit();
        }
      });
    };
    
    window.addEventListener('showMaintenanceAuth', handleShowMaintenanceAuth);
    
    return () => {
      window.removeEventListener('showMaintenanceAuth', handleShowMaintenanceAuth);
    };
  }, []);
  const updateMaintenanceModeInDB = async (enabled: boolean) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('metadata')
        .upsert({ key: 'maintenanceMode', value: enabled }, { onConflict: 'key' })
        .eq('key', 'maintenanceMode');
      
      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  };
  // Show nothing while initializing (prevents flash of wrong screen)
  if (phase === null) {
    return null;
  }
  
  // Handle successful registration
  const onOnboardComplete = async (userData: { 
    id?: string; 
    idNumber?: string; 
    surname?: string; 
    name?: string; 
    isAdmin?: boolean 
  }) => {
    
    // Store the user's ID Number for auto-fill on next login
    if (userData?.idNumber) {
      await saveLastUsedIdNumber(userData.idNumber);
    }
    
    // After successful registration, auto-login and load the app
    try {
      // Save session to IndexedDB
      await saveUserSession({ 
        userId: userData.id || '', 
        idNumber: userData.idNumber || '', 
        isAdmin: !!userData.isAdmin,
        surname: userData.surname,
        name: userData.name
      });
      
      // Set user state and go directly to main app
      setUser({ 
        userId: userData.id || '', 
        idNumber: userData.idNumber || '', 
        isAdmin: !!userData.isAdmin,
        surname: userData.surname,
        name: userData.name
      });
      
      setPhase('main');
    } catch (error) {
      console.error('Failed to auto-login after registration:', error);
      // Fallback to login screen if auto-login fails
      setPhase('login');
      setLoginKey(prev => prev + 1);
    }
  };
  
  // Handle successful login
  const onLoginSuccess = async (sess: { 
    userId: string; 
    idNumber: string; 
    isAdmin: boolean; 
    surname?: string; 
    name?: string 
  }) => {
    
    // Prevent duplicate login calls
    if (phase === 'main' && user) {
      return;
    }
    
    try {
      // Clear any existing session first to prevent conflicts
      const existingSession = await getUserSession();
      if (existingSession && existingSession.userId !== sess.userId) {
        console.log('🔄 Clearing old session for:', existingSession.name, existingSession.surname);
        await removeUserSession();
      }
      
      // Save new session to IndexedDB
      await saveUserSession({ 
        userId: sess.userId, 
        idNumber: sess.idNumber, 
        isAdmin: !!sess.isAdmin,
        surname: sess.surname,
        name: sess.name
      });
      
      // Store ID for auto-fill
      await saveLastUsedIdNumber(sess.idNumber);
      
      // Set user state FIRST
      setUser({ 
        userId: sess.userId, 
        idNumber: sess.idNumber, 
        isAdmin: !!sess.isAdmin,
        surname: sess.surname,
        name: sess.name
      });
      
      // THEN go to main app
      setPhase('main');
    } catch (error) {
      console.error('Failed to save login session:', error);
      // Even if saving fails, still allow login
      setUser({ 
        userId: sess.userId, 
        idNumber: sess.idNumber, 
        isAdmin: !!sess.isAdmin,
        surname: sess.surname,
        name: sess.name
      });
      setPhase('main');
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await removeUserSession();
    setUser(null);
    setPhase('login');
    setLoginKey(prev => prev + 1);
  };
  
  // Render authentication screens before main app
  if (phase === 'onboard') {
    return <StaffOnboard onComplete={onOnboardComplete} onBack={() => {
      setPhase('login');
      setLoginKey(prev => prev + 1);
    }} />;
  }
  
  if (phase === 'login') {
    return <StaffLogin 
      key={loginKey} 
      onLoginSuccess={onLoginSuccess} 
      onRegister={() => setPhase('onboard')} 
      showIdField={true} 
    />;
  }
  
  // ========================================
  // MAIN APP (After Authentication)
  // ========================================
  
  // Render main app component
  return <MainApp user={user} onLogout={handleLogout} onLoginSuccess={onLoginSuccess} />;
}

// Separate component for main app to avoid hook order issues
const MainApp: React.FC<{ user: UserSession | null; onLogout: () => void; onLoginSuccess: (sess: { userId: string; idNumber: string; isAdmin: boolean }) => void }> = ({ user, onLogout, onLoginSuccess }) => {
  // All state declarations at the top of this component
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'settings' | 'data' | 'roster' | 'profile'>('calendar');
  const [showCalendarExportModal, setShowCalendarExportModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingState, setLoadingState] = useState({
    artificialLoading: true,
    smoothProgress: 0,
    showMainApp: false,
    rosterSyncComplete: false
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const maxSmoothProgressRef = useRef(0);
  const [scheduleTitle, setScheduleTitle] = useIndexedDB<string>('scheduleTitle', 'WORK SCHEDULE', 'metadata');
  const [settings, setSettings] = useIndexedDB<Settings>('workSettings', {
    basicSalary: 35000,
    hourlyRate: 201.92,
    shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [specialDateTexts, setSpecialDateTexts] = useIndexedDB<Record<string, string>>('specialDateTexts', {}, 'metadata');
  const [useManualMode, setUseManualMode] = useState(false);
  
  // Load maintenance mode from Supabase on mount (for MainApp component)
  useEffect(() => {
    const loadMaintenanceMode = async () => {
      try {
        const { data, error } = await supabase
          .from('metadata')
          .select('value')
          .eq('key', 'maintenanceMode')
          .single();
        
        if (error) {
          setMaintenanceMode(false);
        } else {
          const isEnabled = data?.value === true;
          setMaintenanceMode(isEnabled);
        }
      } catch (error) {
        setMaintenanceMode(false);
      }
    };
    
    if (supabase) {
      loadMaintenanceMode();
    }
  }, []);
  
  const { artificialLoading, smoothProgress, showMainApp, rosterSyncComplete } = loadingState;
  const { schedule, specialDates, dateNotes, setSchedule, setSpecialDates, setDateNotes, error: dataError, isLoading: isScheduleDataLoading } = useScheduleData();
  
  // Create refs to hold current values without triggering re-renders
  const scheduleRef = useRef(schedule);
  const specialDatesRef = useRef(specialDates);
  const hasRunRosterSyncRef = useRef(false); // Track if roster sync has run
  
  // Keep refs updated
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);
  
  useEffect(() => {
    specialDatesRef.current = specialDates;
  }, [specialDates]);
  
  // AGGRESSIVE SYNC: Run immediately on mount, regardless of specialDates state
  useEffect(() => {
    const aggressiveSync = async () => {
      try {
        
        if (!fetchRosterEntries) {
          return;
        }
        
        const allRosterEntries = await fetchRosterEntries();
        
        const specialDateFlags: Record<string, boolean> = {};
        const specialDateTexts: Record<string, string> = {};
        
        allRosterEntries.forEach(entry => {
          
          if (entry.change_description && entry.change_description.includes('Special Date:')) {
            const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
            if (match && match[1].trim()) {
              const specialText = match[1].trim();
              specialDateFlags[entry.date] = true;
              specialDateTexts[entry.date] = specialText;
            }
          }
        });
        
        if (Object.keys(specialDateFlags).length > 0) {
          
          setSpecialDates(prev => ({
            ...prev,
            ...specialDateFlags
          }));
          
          setSpecialDateTexts(prev => ({
            ...prev,
            ...specialDateTexts
          }));
        } else {
        }
      } catch (error) {
        console.error('❌ [AGGRESSIVE SYNC] Failed:', error);
      }
    };
    
    aggressiveSync();
  }, []); // Run once on mount
  
  // No need for separate sync - roster sync handles specialDateTexts directly
  
  // Check if user has special access (code 5274 only)
  const hasSpecialAccess = user?.idNumber === '5274';
  
  // Debug logging for maintenance mode
  
  // Update Supabase when maintenance mode changes
  const updateMaintenanceModeInDB = async (enabled: boolean) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('metadata')
        .upsert({ key: 'maintenanceMode', value: enabled }, { onConflict: 'key' })
        .eq('key', 'maintenanceMode');
      
      if (error) throw error;
    } catch (error: any) {
      throw error;
    }
  };
  
  // Load manual mode on mount
  useEffect(() => {
    const loadManualMode = async () => {
      try {
        await workScheduleDB.init();
        const settingsData = await workScheduleDB.getSetting('workSettings') as any;
        
        if (settingsData?.useManualMode !== undefined) {
          setUseManualMode(settingsData.useManualMode);
        }
      } catch (error) {
        console.error('Failed to load manual mode:', error);
      }
    };
    
    loadManualMode();
  }, []);

  // Extract month and year
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

  // Pass specialDates to the calculation hook
  const { totalAmount, monthToDateAmount } = useScheduleCalculations(schedule, settings, specialDates, currentDate, refreshKey, monthlySalary);

  // Add artificial loading delay
  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    const duration = 3000;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      
      const timeProgress = Math.min(elapsed / duration, 1);
      const syncProgress = rosterSyncComplete ? 1 : 0.9;
      
      const progress = Math.min(timeProgress, syncProgress);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const smoothedProgress = Math.round(easeOutQuart * 100);
      
      const finalSmoothProgress = Math.max(maxSmoothProgressRef.current, smoothedProgress);
      maxSmoothProgressRef.current = finalSmoothProgress;
      
      if (progress < 1 && (timeProgress < 1 || !rosterSyncComplete)) {
        setLoadingState((prev: typeof loadingState) => ({ ...prev, smoothProgress: finalSmoothProgress }));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setLoadingState((prev: typeof loadingState) => ({
          ...prev,
          smoothProgress: 100,
          artificialLoading: false
        }));
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [rosterSyncComplete]);
  
  // FORCE SHOW APP after max 6 seconds
  useEffect(() => {
    const forceShowTimer = setTimeout(() => {
      if (!showMainApp && artificialLoading) {
        setLoadingState((prev: typeof loadingState) => ({
          ...prev,
          smoothProgress: 100,
          artificialLoading: false,
          rosterSyncComplete: true
        }));
      }
    }, 6000);
    
    return () => clearTimeout(forceShowTimer);
  }, [showMainApp, artificialLoading]);

  // Wait for schedule data to load from IndexedDB before showing app
  const isLoading = artificialLoading || isScheduleDataLoading;
  
  if (isLoading) {
  }

  // Initialize Add to Home Screen functionality
  useEffect(() => {
    if (showMainApp) {
      const addToHomescreenInstance = new AddToHomescreen({
        appName: 'X-ray ANWH',
        appIconUrl: 'https://jarivatoi.github.io/anwh/Icon.PNG',
        maxModalDisplayCount: 1,
        skipFirstVisit: false,
        startDelay: 3000,
        lifespan: 20000,
        mustShowCustomPrompt: false,
        displayPace: 999999
      });
      
      const checkAndShow = async () => {
        const canShow = await addToHomescreenInstance.canPrompt();
        
        if (canShow) {
          setTimeout(() => {
            addToHomescreenInstance.show();
          }, 3000);
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
  }, []); // ✅ No dependencies needed - just setting up event listener
  
  // Listen for bulk calendar updates
  useEffect(() => {
    const handleBulkCalendarUpdate = (event: CustomEvent) => {
      const { calendarUpdates, specialDateUpdates } = event.detail;
      
      window.dispatchEvent(new CustomEvent('bulkUpdateReceived'));
      
      setSchedule(prev => {
        const newSchedule = { ...prev };
        Object.entries(calendarUpdates).forEach(([date, shifts]) => {
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
      
      setSpecialDates(prev => {
        const newSpecialDates = { ...prev };
        Object.entries(specialDateUpdates).forEach(([date, isSpecial]) => {
          newSpecialDates[date] = isSpecial as boolean;
        });
        return newSpecialDates;
      });
      
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
    return () => window.removeEventListener('bulkCalendarUpdate', handleBulkCalendarUpdate as EventListener);
  }, [setSchedule, setSpecialDates]);
  
  // Sync roster special dates to calendar - SYNC ADDS AND REMOVALS
  const syncRosterSpecialDatesToCalendar = useCallback(async () => {
    try {
      if (!fetchRosterEntries) {
        return;
      }
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching roster entries')), 5000)
      );
      
      const fetchPromise = fetchRosterEntries();
      const allRosterEntries = await Promise.race([fetchPromise, timeoutPromise]);
      
      const specialDateFlags: Record<string, boolean> = {};
      const specialDateTextMap: Record<string, string> = {};
      
      // Collect ALL special dates currently in roster
      allRosterEntries.forEach(entry => {
        if (entry.change_description && entry.change_description.includes('Special Date:')) {
          const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
          if (match && match[1].trim()) {
            const specialText = match[1].trim();
            specialDateFlags[entry.date] = true;
            specialDateTextMap[entry.date] = specialText;
          }
        }
      });
      
      // Always sync - even if no special dates found (to handle removals)
      
      // SYNC special dates - Manual loaded from IndexedDB, roster overrides
      setSpecialDates(prev => {
        const merged = { ...prev }; // Start with manual dates
        
        // Apply roster dates on top (roster wins)
        Object.entries(specialDateFlags).forEach(([date, isSpecial]) => {
          merged[date] = isSpecial;
        });
        
        return merged;
      });
      
      // SYNC special date texts - Manual loaded from IndexedDB, roster overrides
      setSpecialDateTexts(prev => {
        const merged = { ...prev }; // Start with manual texts
        
        // Apply roster texts on top (roster overrides manual 'SPECIAL')
        Object.entries(specialDateTextMap).forEach(([date, text]) => {
          merged[date] = text;
        });
        
        return merged;
      });
      
      // DON'T call setRefreshKey here - updating specialDates and specialDateTexts
      // already triggers re-renders, causing double reload on page refresh
    } catch (error) {
      console.error('Error syncing special dates:', error);
    }
  }, [setSpecialDates, setSpecialDateTexts, specialDateTexts]);
  
  // Listen for roster changes to re-sync special dates
  useEffect(() => {
    const handleRosterUpdate = (event: Event) => {
      // Reset the sync flag so sync will run again
      hasRunRosterSyncRef.current = false;
      // Call sync directly
      syncRosterSpecialDatesToCalendar();
    };
    
    window.addEventListener('rosterUpdated', handleRosterUpdate);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('rosterUpdated', handleRosterUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only setup once on mount
  
  // Sync roster special dates BEFORE showing main app - MERGE MANUAL + ROSTER
  useEffect(() => {
    let isMounted = true;
    
    // ONLY RUN ONCE - after initial load from IndexedDB
    // Use a ref to prevent re-running on every specialDates change
    if (hasRunRosterSyncRef.current) {
      return;
    }
    
    hasRunRosterSyncRef.current = true;
    
    const runSync = async () => {
      try {
        // Read actual persisted data from IndexedDB to avoid React state race conditions
        const persistedSpecialDates = await workScheduleDB.getSpecialDates();
        const persistedSpecialDateTexts = await workScheduleDB.getMetadata<Record<string, string>>('specialDateTexts') || {};
        
        let allRosterEntries;
        
        if (!fetchRosterEntries) {
          // No roster API - just mark sync as complete
          if (isMounted) {
            setLoadingState((prev: typeof loadingState) => ({ ...prev, rosterSyncComplete: true }));
          }
          return;
        }
        
        try {
          const fetchPromise = fetchRosterEntries();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout fetching roster')), 5000)
          );
          allRosterEntries = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (fetchError) {
          if (isMounted) {
            setLoadingState((prev: typeof loadingState) => ({ ...prev, rosterSyncComplete: true }));
          }
          return;
        }
        
        const rosterSpecialDates: Record<string, boolean> = {};
        const rosterTextMap: Record<string, string> = {};
        
        allRosterEntries.forEach(entry => {
          if (entry.change_description && entry.change_description.includes('Special Date:')) {
            const match = entry.change_description.match(/Special Date:\s*([^;]+)/);
            if (match && match[1].trim()) {
              const specialText = match[1].trim();
              rosterSpecialDates[entry.date] = true;
              rosterTextMap[entry.date] = specialText;
            }
          }
        });
        
        if (Object.keys(rosterSpecialDates).length > 0) {
          // STRATEGY: Use persisted IndexedDB data as base, then roster overrides
          // This avoids React state race conditions entirely
          
          // Merge specialDates: persisted + roster
          const mergedSpecialDates = { ...persistedSpecialDates };
          Object.entries(rosterSpecialDates).forEach(([date, isSpecial]) => {
            mergedSpecialDates[date] = isSpecial;
          });
          
          // Merge specialDateTexts: persisted + roster
          const mergedSpecialDateTexts = { ...persistedSpecialDateTexts };
          Object.entries(rosterTextMap).forEach(([date, rosterText]) => {
            mergedSpecialDateTexts[date] = rosterText;
          });
          
          // Save merged data directly to IndexedDB
          await workScheduleDB.setSpecialDates(mergedSpecialDates);
          await workScheduleDB.setMetadata('specialDateTexts', mergedSpecialDateTexts);
          
          // Update React state to match
          setSpecialDates(mergedSpecialDates);
          setSpecialDateTexts(mergedSpecialDateTexts);
        }
        
        if (isMounted) {
          setLoadingState((prev: typeof loadingState) => ({ ...prev, rosterSyncComplete: true }));
        }
        
      } catch (error) {
        console.error('❌ [SYNC] Background sync failed:', error);
        if (isMounted) {
          setLoadingState((prev: typeof loadingState) => ({ ...prev, rosterSyncComplete: true }));
        }
      }
    };
    
    const syncTimeout = setTimeout(() => {
      if (isMounted) {
        setLoadingState((prev: typeof loadingState) => ({ ...prev, rosterSyncComplete: true }));
      }
    }, 7000);
    
    runSync().then(() => {
      clearTimeout(syncTimeout);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(syncTimeout);
    };
  }, [specialDates, specialDateTexts]); // Re-run when BOTH specialDates and specialDateTexts load from IndexedDB
  
  // Also sync when roster is refreshed
  useEffect(() => {
    const handleRosterUpdate = () => {
      syncRosterSpecialDatesToCalendar();
    };
    
    window.addEventListener('rosterUpdated', handleRosterUpdate as EventListener);
    return () => window.removeEventListener('rosterUpdated', handleRosterUpdate as EventListener);
  }, []);
  
  // Listen for tab switch requests
  useEffect(() => {
    const handleSwitchToCalendar = () => {
      setActiveTab('calendar');
      setRefreshKey(prev => prev + 1);
    };

    const handleCloseCalendarExportModal = () => {
      setShowCalendarExportModal(false);
    };

    window.addEventListener('switchToCalendarTab', handleSwitchToCalendar);
    window.addEventListener('closeCalendarExportModal', handleCloseCalendarExportModal);
    return () => {
      window.removeEventListener('switchToCalendarTab', handleSwitchToCalendar);
      window.removeEventListener('closeCalendarExportModal', handleCloseCalendarExportModal);
    };
  }, []); // ✅ No dependencies needed - just setting up event listeners
  
  // Initialize content animation
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

  const handleTabChange = (newTab: 'calendar' | 'settings' | 'data' | 'roster' | 'profile') => {
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
    
    // Helper to extract base shift ID (handles formats like '9-4-NARAYYA' -> '9-4')
    const getBaseShiftId = (fullShiftId: string) => {
      const parts = fullShiftId.split('-');
      // Handle formats like '9-4-NARAYYA' -> '9-4'
      if (parts.length >= 2 && parts[0].match(/^\d+$/) && parts[1].match(/^\d+$/)) {
        return `${parts[0]}-${parts[1]}`;
      }
      // Handle formats like 'N-NARAYYA' -> 'N'
      if (parts.length > 1) {
        return parts[0];
      }
      // Plain shift IDs like 'N', '9-4', '4-10', '12-10'
      return fullShiftId;
    };
    
    if (shiftId === '9-4' && currentShifts.some(s => getBaseShiftId(s) === '12-10')) return false;
    if (shiftId === '12-10' && currentShifts.some(s => getBaseShiftId(s) === '9-4')) return false;
    
    if (shiftId === '12-10' && currentShifts.some(s => getBaseShiftId(s) === '4-10')) return false;
    if (shiftId === '4-10' && currentShifts.some(s => getBaseShiftId(s) === '12-10')) return false;
    
    return true;
  };

  const toggleShift = (shiftId: string) => {
    if (!selectedDate) return;
    
    
    const currentShifts = schedule[selectedDate] || [];
    const currentIsSpecial = specialDates[selectedDate] === true;
    
    // Helper to extract base shift ID (handles formats like '9-4-NARAYYA' -> '9-4')
    const getBaseShiftId = (fullShiftId: string) => {
      const parts = fullShiftId.split('-');
      // Handle formats like '9-4-NARAYYA' -> '9-4'
      if (parts.length >= 2 && parts[0].match(/^\d+$/) && parts[1].match(/^\d+$/)) {
        return `${parts[0]}-${parts[1]}`;
      }
      // Handle formats like 'N-NARAYYA' -> 'N'
      if (parts.length > 1) {
        return parts[0];
      }
      // Plain shift IDs like 'N', '9-4', '4-10', '12-10'
      return fullShiftId;
    };
    
    // Check if this shift is currently selected (by comparing base IDs)
    const isCurrentlySelected = currentShifts.some(s => {
      const baseId = getBaseShiftId(s);
      console.log('🔍 Checking shift:', s, '-> base:', baseId, '=== target:', shiftId, '?', baseId === shiftId);
      return baseId === shiftId;
    });
    
    console.log('📊 Current shifts:', currentShifts, '| Target to remove:', shiftId, '| Is selected?', isCurrentlySelected);
    
    if (isCurrentlySelected) {
      // Remove shift - filter out any shifts that match this base ID
      const updatedShifts = currentShifts.filter(s => {
        const baseId = getBaseShiftId(s);
        const keep = baseId !== shiftId;
        console.log('  Filtering:', s, '-> base:', baseId, '| keep?', keep);
        return keep;
      });
      console.log('✅ After filter:', updatedShifts);
      setSchedule(prev => ({
        ...prev,
        [selectedDate]: updatedShifts.length > 0 ? updatedShifts : []
      }));
    } else {
      if (canSelectShift(shiftId, selectedDate)) {
        // Check if this shift requires special date marking
        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay();
        
        // 9-4 on weekdays (1-5) or Saturday (6) requires special marking
        const needsSpecial = (shiftId === '9-4' && (dayOfWeek >= 1 && dayOfWeek <= 6));
        
        // Auto-mark as special if needed
        if (needsSpecial && !currentIsSpecial) {
          setSpecialDates(prev => ({
            ...prev,
            [selectedDate]: true
          }));
        }
        
        setSchedule(prev => ({
          ...prev,
          [selectedDate]: [...currentShifts, shiftId]
        }));
      } else {
      }
    }

  };

  const handleUpdateNote = useCallback((dateKey: string, note: string) => {
    setDateNotes(prev => ({
      ...prev,
      [dateKey]: note
    }));
  }, []);

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

  const handleToggleManualMode = useCallback((enabled: boolean) => {
    setUseManualMode(enabled);
    setSettings(prev => ({
      ...prev,
      useManualMode: enabled
    }));
  }, [setSettings]);

  const handleRosterCalendarSync = useCallback((event: CustomEvent) => {
    const rosterChange = event.detail;
    
    // Use current values from refs instead of stale closure values
    const syncResult = syncRosterToCalendar(rosterChange, {
      calendarLabel: scheduleTitle,
      schedule: scheduleRef.current,
      specialDates: specialDatesRef.current,
      setSchedule,
      setSpecialDates,
      entries: []
    });
    
    // Note: No need to trigger refresh - real-time sync handles roster updates automatically
  }, [scheduleTitle, setSchedule, setSpecialDates]);

  const handleForceCalendarRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
    window.addEventListener('forceCalendarRefresh', handleForceCalendarRefresh as EventListener);
    return () => {
      window.removeEventListener('rosterCalendarSync', handleRosterCalendarSync as EventListener);
      window.removeEventListener('forceCalendarRefresh', handleForceCalendarRefresh as EventListener);
    };
  }, [handleRosterCalendarSync, handleForceCalendarRefresh]);

  const toggleSpecialDate = useCallback(async (dateKey: string, isSpecial: boolean) => {
    // CRITICAL: Update both states simultaneously to prevent flicker
    // Don't await them sequentially - batch the updates together
    
    const specialDatesPromise = setSpecialDates(prev => {
      const newSpecialDates = { ...prev };
      if (isSpecial) {
        newSpecialDates[dateKey] = true;
      } else {
        delete newSpecialDates[dateKey];
      }
      return newSpecialDates;
    });
    
    const specialDateTextsPromise = setSpecialDateTexts(prev => {
      const newTexts = { ...prev };
      if (isSpecial) {
        // Mark as manual special date with 'SPECIAL' placeholder
        newTexts[dateKey] = 'SPECIAL';
      } else {
        // Only remove if it's a manual special (has 'SPECIAL' text)
        // Don't remove roster-synced dates (they have actual text)
        if (newTexts[dateKey] === 'SPECIAL') {
          delete newTexts[dateKey];
        }
      }
      return newTexts;
    });
    
    // Wait for both updates to complete
    await Promise.all([specialDatesPromise, specialDateTextsPromise]);
  }, [setSpecialDates, setSpecialDateTexts]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  const updateBasicSalary = useCallback(async (salary: number) => {
    const hourlyRate = (salary * 12) / 52 / 40;

    try {
      const allMonthlySalaries = await workScheduleDB.getAllMonthlySalaries();
      const currentYearValue = currentYear;
      const oldGlobalSalary = settings?.basicSalary || 0;

      const lockInPromises: Promise<void>[] = [];

      for (let year = 2020; year < currentYearValue; year++) {
        for (let month = 0; month < 12; month++) {
          const monthKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
          const existingSalary = allMonthlySalaries[monthKey];

          if (existingSalary === undefined || existingSalary === 0) {
            lockInPromises.push(workScheduleDB.setMonthlySalary(year, month, oldGlobalSalary));
          }
        }
      }

      await Promise.all(lockInPromises);

      setSettings(prev => ({
        ...prev,
        basicSalary: salary,
        hourlyRate: hourlyRate
      }));

      const currentYearPromises = [];
      for (let month = 0; month < 12; month++) {
        const monthKey = `${currentYearValue}-${(month + 1).toString().padStart(2, '0')}`;
        const existingSalary = allMonthlySalaries[monthKey];

        if (existingSalary === undefined || existingSalary === 0) {
          currentYearPromises.push(workScheduleDB.setMonthlySalary(currentYearValue, month, 0));
        }
      }

      await Promise.all(currentYearPromises);

      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update monthly salaries:', error);
    }
  }, [setSettings, currentYear, settings?.basicSalary]);

  const handleMonthlySalaryChange = useCallback(async (year: number, month: number, salary: number) => {
    try {
      await workScheduleDB.setMonthlySalary(year, month, salary);

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

  // ========================================
  // MAINTENANCE MODE CHECK (After ALL hooks)
  // ========================================
  if (maintenanceMode && !hasSpecialAccess) {
    return <MaintenanceMode isEnabled={true} onSecretAccess={() => window.location.reload()} />;
  }

  const handleExportData = async () => {
    try {
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

  const handleExportCompleteDatabase = async () => {
    try {
      await exportCompleteDatabase();
    } catch (error) {
      console.error('Complete database export failed:', error);
      throw error;
    }
  };

  const handleImportData = async (data: any) => {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      
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
        
        if (data.settings.useManualMode !== undefined) {
          setUseManualMode(data.settings.useManualMode);
        }
      }
      
      if (data.scheduleTitle) {
        setScheduleTitle(data.scheduleTitle);
      }
      
      try {
        await workScheduleDB.importAllData(data);
      } catch (dbError) {
      }
      
      setRefreshKey(prev => prev + 1);
      
      setTimeout(() => {
        setActiveTab('calendar');
      }, 100);
    } catch (error) {
      console.error('Import error:', error);
      throw error;
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

  // ========================================
  // CONDITIONAL RENDERING (After ALL hooks)
  // ========================================
  
  // Show error if data loading failed
  if (dataError && showMainApp) {
    
    console.error('❌ Data Error:', dataError);
    
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

  // Show enhanced loading screen
  if (isLoading) {
    
    
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
              {!rosterSyncComplete && showMainApp && (
                <p className="text-indigo-600 font-semibold">• Syncing roster special dates...</p>
              )}
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

  // Main app interface
  return (
    <div 
        className="min-h-screen bg-white select-none"
        style={{ 
          minHeight: '100vh',
          backfaceVisibility: 'hidden',
          marginTop: '0px',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          
          backgroundColor: 'white !important',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y'
        }}
      >
        {/* Tab Navigation - Full Width */}
        <div className="sticky top-0 z-50 bg-white w-full" style={{ marginLeft: 0, marginRight: 0 }}>
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        
        {/* Content with smooth transitions */}
        <div 
          ref={contentRef}
          className="px-0 py-4"
          style={{
            paddingLeft: 'max(0, env(safe-area-inset-left))',
            paddingRight: 'max(0, env(safe-area-inset-right))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingTop: 'env(safe-area-inset-top)',
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
          ) : activeTab === 'roster' ? (
            <RosterPanel
              key={refreshKey}
              setActiveTab={setActiveTab}
              onOpenCalendarExportModal={handleOpenCalendarExportModal}
              selectedDate={currentDate}
              onDateChange={handleDateChange}
              basicSalary={settings.basicSalary}
              hourlyRate={settings.hourlyRate}
              maintenanceMode={maintenanceMode}
            />
          ) : activeTab === 'profile' ? (
            <ProfileTab 
              user={user ? userToProfile(user) : null}
              onLoginSuccess={onLoginSuccess}
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
              onExportCompleteDatabase={handleExportCompleteDatabase}
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
              maintenanceMode={maintenanceMode}
            />
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ShiftModal
            selectedDate={selectedDate}
            schedule={schedule}
            specialDates={specialDates}
            specialDateTexts={specialDateTexts}
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
  );
}

export default App;
