import { DEFAULT_SHIFT_COMBINATIONS } from '../constants';

interface DBSchema {
  schedule: {
    key: string;
    value: {
      date: string;
      shifts: string[];
    };
  };
  specialDates: {
    key: string;
    value: {
      date: string;
      isSpecial: boolean;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
  monthlySalaries: {
    key: string;
    value: {
      monthKey: string;
      salary: number;
    };
  };
}

class WorkScheduleDB {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'WorkScheduleDB';
  private readonly version = 3;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Initializing IndexedDB...');
      
      // Check if IndexedDB is available (important for iPhone)
      if (!window.indexedDB) {
        console.error('❌ IndexedDB not supported');
        reject(new Error('IndexedDB not supported'));
        return;
      }
      
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('🔧 Upgrading IndexedDB schema...');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('schedule')) {
          console.log('📅 Creating schedule store');
          db.createObjectStore('schedule', { keyPath: 'date' });
        }

        if (!db.objectStoreNames.contains('specialDates')) {
          console.log('⭐ Creating specialDates store');
          db.createObjectStore('specialDates', { keyPath: 'date' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          console.log('⚙️ Creating settings store');
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          console.log('📝 Creating metadata store');
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('monthlySalaries')) {
          console.log('💰 Creating monthlySalaries store');
          db.createObjectStore('monthlySalaries', { keyPath: 'monthKey' });
        }
        console.log('✅ IndexedDB schema upgrade completed');
      };
      
      // Add timeout for iPhone compatibility
      setTimeout(() => {
        if (!this.db) {
          console.error('❌ IndexedDB initialization timeout');
          reject(new Error('Database initialization timeout'));
        }
      }, 10000); // 10 second timeout
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async getSchedule(): Promise<Record<string, string[]>> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['schedule'], 'readonly');
      const store = transaction.objectStore('schedule');
      const request = store.getAll();

      request.onsuccess = () => {
        const result: Record<string, string[]> = {};
        request.result.forEach((item: { date: string; shifts: string[] }) => {
          result[item.date] = item.shifts;
        });
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get schedule'));
      };
    });
  }

  async setSchedule(schedule: Record<string, string[]>): Promise<void> {
    const db = await this.ensureDB();
    console.log('💾 Saving schedule to IndexedDB:', Object.keys(schedule).length, 'entries');
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['schedule'], 'readwrite');
      const store = transaction.objectStore('schedule');

      // Add transaction error handling
      transaction.onerror = () => {
        console.error('❌ Transaction error:', transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
      
      transaction.oncomplete = () => {
        console.log('✅ Schedule saved successfully');
        resolve();
      };

      // Clear existing data
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add new data
        let pendingOperations = 0;
        let completedOperations = 0;
        let hasError = false;
        
        Object.entries(schedule).forEach(([date, shifts]) => {
          if (shifts.length > 0) {
            pendingOperations++;
            const addRequest = store.add({ date, shifts });
            
            addRequest.onsuccess = () => {
              completedOperations++;
              if (completedOperations === pendingOperations && !hasError) {
                console.log(`✅ All ${completedOperations} schedule entries saved`);
              }
            };
            
            addRequest.onerror = () => {
              if (!hasError) {
                hasError = true;
                console.error(`❌ Failed to add schedule for ${date}:`, addRequest.error);
                reject(new Error(`Failed to add schedule for ${date}: ${addRequest.error}`));
              }
            };
          }
        });
        
        // If no data to save, resolve immediately
        if (pendingOperations === 0) {
          console.log('✅ No schedule data to save');
        }
      };

      clearRequest.onerror = () => {
        console.error('❌ Failed to clear schedule:', clearRequest.error);
        reject(new Error(`Failed to clear schedule: ${clearRequest.error}`));
      };
    });
  }

  async getSpecialDates(): Promise<Record<string, boolean>> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialDates'], 'readonly');
      const store = transaction.objectStore('specialDates');
      const request = store.getAll();

      request.onsuccess = () => {
        const result: Record<string, boolean> = {};
        request.result.forEach((item: { date: string; isSpecial: boolean }) => {
          result[item.date] = item.isSpecial;
        });
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get special dates'));
      };
    });
  }

  async setSpecialDates(specialDates: Record<string, boolean>): Promise<void> {
    const db = await this.ensureDB();
    console.log('💾 Saving special dates to IndexedDB:', Object.keys(specialDates).length, 'entries');
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialDates'], 'readwrite');
      const store = transaction.objectStore('specialDates');

      // Add transaction error handling
      transaction.onerror = () => {
        console.error('❌ Special dates transaction error:', transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
      
      transaction.oncomplete = () => {
        console.log('✅ Special dates saved successfully');
        resolve();
      };

      // Clear existing data
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add new data
        let pendingOperations = 0;
        let completedOperations = 0;
        let hasError = false;
        
        Object.entries(specialDates).forEach(([date, isSpecial]) => {
          if (isSpecial) {
            pendingOperations++;
            const addRequest = store.add({ date, isSpecial });
            
            addRequest.onsuccess = () => {
              completedOperations++;
              if (completedOperations === pendingOperations && !hasError) {
                console.log(`✅ All ${completedOperations} special dates saved`);
              }
            };
            
            addRequest.onerror = () => {
              if (!hasError) {
                hasError = true;
                console.error(`❌ Failed to add special date for ${date}:`, addRequest.error);
                reject(new Error(`Failed to add special date for ${date}: ${addRequest.error}`));
              }
            };
          }
        });

        // If no data to save, resolve immediately
        if (pendingOperations === 0) {
          console.log('✅ No special dates to save');
        }
      };

      clearRequest.onerror = () => {
        console.error('❌ Failed to clear special dates:', clearRequest.error);
        reject(new Error(`Failed to clear special dates: ${clearRequest.error}`));
      };
    });
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result ? request.result.value : null;
        
        // Special handling for workSettings to ensure shift combinations are present
        if (key === 'workSettings' && result && typeof result === 'object') {
          // FORCE UPDATE: Always use latest default shift combinations
          if (!result.shiftCombinations || result.shiftCombinations.length === 0 || true) {
            console.log('🔧 Auto-fixing missing shift combinations in getSetting');
            const fixedResult = {
              ...result,
              shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
            };
            
            // Save the fixed version back to the database
            this.setSetting(key, fixedResult).catch(err => 
              console.error('Failed to save fixed settings:', err)
            );
            
            resolve(fixedResult);
            return;
          }
        }
        
        // Special handling for authCodes to ensure they're properly loaded
        if (key === 'authCodes' && result) {
          console.log('📦 Loading auth codes from IndexedDB:', Array.isArray(result) ? result.length : 'invalid format');
        }
        
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get setting: ${key}`));
      };
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.ensureDB();
    console.log(`💾 Saving setting "${key}" to IndexedDB:`, value);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      // Add transaction error handling
      transaction.onerror = () => {
        console.error(`❌ Settings transaction error for "${key}":`, transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
      
      transaction.oncomplete = () => {
        console.log(`✅ Setting "${key}" saved successfully`);
        resolve();
      };
      
      const request = store.put({ key, value });

      request.onsuccess = () => {
        console.log(`✅ Setting "${key}" put operation completed`);
      };

      request.onerror = () => {
        console.error(`❌ Failed to set setting "${key}":`, request.error);
        reject(new Error(`Failed to set setting: ${key} - ${request.error}`));
      };
    });
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get metadata: ${key}`));
      };
    });
  }

  async setMetadata<T>(key: string, value: T): Promise<void> {
    const db = await this.ensureDB();
    console.log(`💾 Saving metadata "${key}" to IndexedDB:`, value);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      
      // Add transaction error handling
      transaction.onerror = () => {
        console.error(`❌ Metadata transaction error for "${key}":`, transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };
      
      transaction.oncomplete = () => {
        console.log(`✅ Metadata "${key}" saved successfully`);
        resolve();
      };
      
      const request = store.put({ key, value });

      request.onsuccess = () => {
        console.log(`✅ Metadata "${key}" put operation completed`);
      };

      request.onerror = () => {
        console.error(`❌ Failed to set metadata "${key}":`, request.error);
        reject(new Error(`Failed to set metadata: ${key} - ${request.error}`));
      };
    });
  }

  async exportAllData(): Promise<any> {
    console.log('🔄 Exporting all data from IndexedDB...');
    
    // Create filename with ANWH_DDMMYYYY-HHMMSS format
    const createExportFilename = (): string => {
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      
      return `Roster_${day}-${month}-${year}.json`;
    };

    const [schedule, specialDates, settings, scheduleTitle] = await Promise.all([
      this.getSchedule(),
      this.getSpecialDates(),
      this.getSetting('workSettings'),
      this.getMetadata('scheduleTitle')
    ]);

    // Ensure settings have shift combinations
    const finalSettings = settings || {
      basicSalary: 35000,
      hourlyRate: 173.08,
      shiftCombinations: DEFAULT_SHIFT_COMBINATIONS
    };

    // If settings exist but don't have shift combinations, add them
    if (finalSettings && (!finalSettings.shiftCombinations || finalSettings.shiftCombinations.length === 0)) {
      finalSettings.shiftCombinations = DEFAULT_SHIFT_COMBINATIONS;
    }

    const exportData = {
      schedule,
      specialDates,
      settings: finalSettings,
      scheduleTitle: scheduleTitle || 'Work Schedule',
      exportDate: new Date().toISOString(),
      version: '3.0',
      filename: createExportFilename().replace('Roster_', 'ANWH_')
    };

    console.log('📦 Export data prepared:', {
      scheduleEntries: Object.keys(exportData.schedule).length,
      specialDatesEntries: Object.keys(exportData.specialDates).length,
      settingsIncluded: !!exportData.settings,
      shiftCombinations: exportData.settings?.shiftCombinations?.length || 0,
      filename: exportData.filename
    });

    return exportData;
  }

  async importAllData(data: any): Promise<void> {
    console.log('🔄 Importing data to IndexedDB:', {
      hasSchedule: !!data.schedule,
      hasSpecialDates: !!data.specialDates,
      hasSettings: !!data.settings,
      hasTitle: !!data.scheduleTitle,
      version: data.version
    });

    const promises: Promise<void>[] = [];

    if (data.schedule) {
      console.log('📅 Importing schedule with', Object.keys(data.schedule).length, 'entries');
      promises.push(this.setSchedule(data.schedule));
    }

    if (data.specialDates) {
      console.log('⭐ Importing special dates with', Object.keys(data.specialDates).length, 'entries');
      promises.push(this.setSpecialDates(data.specialDates));
    }

    if (data.settings) {
      // Ensure imported settings have shift combinations
      const settingsToImport = { ...data.settings };
      if (!settingsToImport.shiftCombinations || settingsToImport.shiftCombinations.length === 0) {
        console.log('🔧 Adding missing shift combinations to imported settings');
        settingsToImport.shiftCombinations = DEFAULT_SHIFT_COMBINATIONS;
      }
      
      console.log('⚙️ Importing settings:', {
        basicSalary: settingsToImport.basicSalary,
        hourlyRate: settingsToImport.hourlyRate,
        shiftCombinations: settingsToImport.shiftCombinations?.length || 0
      });
      promises.push(this.setSetting('workSettings', settingsToImport));
    }

    if (data.scheduleTitle) {
      console.log('📝 Importing schedule title:', data.scheduleTitle);
      promises.push(this.setMetadata('scheduleTitle', data.scheduleTitle));
    }

    await Promise.all(promises);
    console.log('✅ All data imported successfully to IndexedDB');
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        console.log('📊 Storage estimate:', estimate);
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      } catch (error) {
        console.warn('Storage estimate not available:', error);
      }
    }

    // Fallback estimates - iPhone Safari often can't provide exact quota
    console.log('📊 Using fallback storage estimate for iPhone Safari');
    return {
      used: 0,
      available: 50 * 1024 * 1024 // 50MB fallback (actual is much more)
    };
  }

  async getMonthlySalary(year: number, month: number): Promise<number> {
    const db = await this.ensureDB();
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['monthlySalaries'], 'readonly');
      const store = transaction.objectStore('monthlySalaries');
      const request = store.get(monthKey);

      request.onsuccess = () => {
        const result = request.result ? request.result.salary : 0;
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get monthly salary for ${monthKey}`));
      };
    });
  }

  async setMonthlySalary(year: number, month: number, salary: number): Promise<void> {
    const db = await this.ensureDB();
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    console.log(`💾 Saving monthly salary for ${monthKey}:`, salary);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['monthlySalaries'], 'readwrite');
      const store = transaction.objectStore('monthlySalaries');

      transaction.onerror = () => {
        console.error(`❌ Monthly salary transaction error for "${monthKey}":`, transaction.error);
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };

      transaction.oncomplete = () => {
        console.log(`✅ Monthly salary for "${monthKey}" saved successfully`);
        resolve();
      };

      const request = store.put({ monthKey, salary });

      request.onsuccess = () => {
        console.log(`✅ Monthly salary for "${monthKey}" put operation completed`);
      };

      request.onerror = () => {
        console.error(`❌ Failed to set monthly salary for "${monthKey}":`, request.error);
        reject(new Error(`Failed to set monthly salary: ${monthKey} - ${request.error}`));
      };
    });
  }

  async getAllMonthlySalaries(): Promise<Record<string, number>> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['monthlySalaries'], 'readonly');
      const store = transaction.objectStore('monthlySalaries');
      const request = store.getAll();

      request.onsuccess = () => {
        const result: Record<string, number> = {};
        request.result.forEach((item: { monthKey: string; salary: number }) => {
          result[item.monthKey] = item.salary;
        });
        resolve(result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all monthly salaries'));
      };
    });
  }
}

export const workScheduleDB = new WorkScheduleDB();