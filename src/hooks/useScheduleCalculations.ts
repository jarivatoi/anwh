import { useMemo } from 'react';
import { DaySchedule, Settings, SpecialDates } from '../types';

export const useScheduleCalculations = (
  schedule: DaySchedule, 
  settings: Settings, 
  specialDates: SpecialDates,
  currentDate?: Date,
  refreshKey?: number // Add refresh key parameter
) => {
  const { totalAmount, monthToDateAmount } = useMemo(() => {
    console.log('🔄 Calculating amounts with data:', {
      scheduleKeys: Object.keys(schedule || {}),
      scheduleCount: Object.keys(schedule || {}).length,
      settingsBasicSalary: settings?.basicSalary,
      settingsHourlyRate: settings?.hourlyRate,
      settingsCombinations: settings?.shiftCombinations?.length,
      specialDatesCount: Object.keys(specialDates || {}).length,
      refreshKey
    });

    let total = 0;
    let monthToDate = 0;
    const today = new Date();
    
    // Get current month and year for filtering
    const currentMonth = currentDate ? currentDate.getMonth() : today.getMonth();
    const currentYear = currentDate ? currentDate.getFullYear() : today.getFullYear();
    
    // Early return if no schedule data or settings
    if (!schedule || Object.keys(schedule).length === 0) {
      console.log('❌ No schedule data available');
      return { totalAmount: 0, monthToDateAmount: 0 };
    }
    
    if (!settings || !settings.shiftCombinations || settings.shiftCombinations.length === 0) {
      console.log('❌ No settings or shift combinations available');
      return { totalAmount: 0, monthToDateAmount: 0 };
    }

    console.log('✅ Processing schedule entries...');
    
    Object.entries(schedule).forEach(([dateKey, dayShifts]) => {
      if (!dayShifts || dayShifts.length === 0) return;
      
      console.log(`📅 Processing date ${dateKey} with shifts:`, dayShifts);
      
      // Parse the date to check if it belongs to the current month/year
      const workDate = new Date(dateKey);
      const workMonth = workDate.getMonth();
      const workYear = workDate.getFullYear();
      
      // Only include dates from the currently viewed month/year
      if (workMonth !== currentMonth || workYear !== currentYear) {
        console.log(`⏭️ Skipping ${dateKey} - not in current month/year`);
        return;
      }
      
      // Check if this date is marked as special
      const isSpecialDate = specialDates && specialDates[dateKey] === true;
      const dayOfWeek = workDate.getDay();
      
      console.log(`📊 Date ${dateKey}: dayOfWeek=${dayOfWeek}, isSpecial=${isSpecialDate}`);
      
      // Calculate each shift individually for proper amount calculation
      dayShifts.forEach(shiftId => {
        console.log(`💰 Calculating shift: ${shiftId}`);
        
        // Find the shift combination - handle single shifts and combinations
        let combination = settings.shiftCombinations.find(combo => {
          const comboKey = combo.id.replace(/AM/g, '9-4'); // Handle AM alias
          return comboKey === shiftId;
        });
        
        if (combination && settings.hourlyRate) {
          const shiftAmount = combination.hours * settings.hourlyRate;
          total += shiftAmount;
          
          console.log(`💰 Found single shift ${combination.combination} (${combination.hours}h) = Rs ${shiftAmount.toFixed(2)}`);
          
          // Check if this date is up to and INCLUDING today for month-to-date calculation
          if (workMonth === today.getMonth() && workYear === today.getFullYear() && workDate.getDate() <= today.getDate()) {
            monthToDate += shiftAmount;
            console.log(`📈 Added to month-to-date: Rs ${shiftAmount.toFixed(2)}`);
          }
        } else {
          console.log(`❌ No single shift combination found for ${shiftId}`);
        }
      });
      
      // Also check for multi-shift combinations (for backward compatibility)
      if (dayShifts.length > 1) {
        const sortedShifts = [...dayShifts].sort();
        const combinationKey = sortedShifts.join('+');
        
        console.log(`🔍 Looking for multi-shift combination: ${combinationKey}`);
        
        const multiCombination = settings.shiftCombinations.find(combo => {
          const comboKey = combo.id.replace(/AM/g, '9-4');
          return comboKey === combinationKey;
        });
        
        if (multiCombination && settings.hourlyRate) {
          // Subtract individual shift amounts already added
          const individualTotal = dayShifts.reduce((sum, shiftId) => {
            const singleCombo = settings.shiftCombinations.find(combo => combo.id === shiftId);
            return sum + (singleCombo ? singleCombo.hours * settings.hourlyRate : 0);
          }, 0);
          
          const multiAmount = multiCombination.hours * settings.hourlyRate;
          const difference = multiAmount - individualTotal;
          
          total += difference;
          
          console.log(`💰 Found multi-combination ${multiCombination.combination}, adjusting by Rs ${difference.toFixed(2)}`);
          
          if (workMonth === today.getMonth() && workYear === today.getFullYear() && workDate.getDate() <= today.getDate()) {
            monthToDate += difference;
          }
        }
      }
    });
    
    console.log(`🎯 Final totals: Monthly=${total.toFixed(2)}, MTD=${monthToDate.toFixed(2)}`);
    
    return { totalAmount: total, monthToDateAmount: monthToDate };
  }, [
    schedule, 
    settings, 
    specialDates, 
    currentDate, 
    refreshKey,
    // Add these to ensure recalculation when data structure changes
    JSON.stringify(schedule),
    JSON.stringify(settings),
    JSON.stringify(specialDates)
  ]);

  return { totalAmount, monthToDateAmount };
};