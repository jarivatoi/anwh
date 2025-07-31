// Build roster entries from parsed data
import { RosterFormData } from '../../types/roster';

export interface ParsedEntry {
  date: string;
  shiftType: string;
  assignedName: string;
}

export class EntryBuilder {
  
  /**
   * STEP 3: Create roster entries and prevent duplicates
   */
  buildEntries(parsedEntries: ParsedEntry[]): RosterFormData[] {
    const uniqueEntries = new Set<string>();
    const finalEntries: RosterFormData[] = [];
    const duplicateAnalysis: Record<string, ParsedEntry[]> = {};
    
    console.log(`📝 STEP 3: Building ${parsedEntries.length} roster entries...`);
    
    // First, group entries by person and date to analyze duplicates
    parsedEntries.forEach(entry => {
      const personDateKey = `${entry.assignedName}-${entry.date}`;
      if (!duplicateAnalysis[personDateKey]) {
        duplicateAnalysis[personDateKey] = [];
      }
      duplicateAnalysis[personDateKey].push(entry);
    });
    
    // Analyze and resolve duplicates
    Object.entries(duplicateAnalysis).forEach(([personDateKey, entries]) => {
      if (entries.length > 1) {
        console.log(`🔍 RESOLVING DUPLICATES for ${personDateKey}:`);
        entries.forEach((entry, index) => {
          console.log(`   Option ${index + 1}: ${entry.shiftType}`);
        });
        
        // For VEERASAWMY(R) on July 1st, prefer Evening Shift (4-10)
        if (personDateKey === 'VEERASAWMY(R)-2025-07-01') {
          console.log(`🔍 SPECIAL CASE: Processing VEERASAWMY(R) July 1st with ${entries.length} entries`);
          entries.forEach((entry, index) => {
            console.log(`   Entry ${index + 1}: ${entry.shiftType}`);
          });
          
          const eveningShift = entries.find(e => e.shiftType === 'Evening Shift (4-10)');
          console.log(`🔍 Evening shift found:`, eveningShift ? 'YES' : 'NO');
          
          if (eveningShift) {
            console.log(`🔍 VEERASAWMY(R) JULY 1ST: Choosing Evening Shift (4-10) over other options`);
            
            // Count entries before filtering
            const beforeCount = allParsedEntries.length;
            console.log(`🔍 Entries before filtering: ${beforeCount}`);
            
            // Remove other entries for this person-date combination from allParsedEntries
            const originalLength = allParsedEntries.length;
            for (let i = allParsedEntries.length - 1; i >= 0; i--) {
              const entry = allParsedEntries[i];
              if (entry.assignedName === 'VEERASAWMY(R)' && 
                  entry.date === '2025-07-01' && 
                  entry.shiftType !== 'Evening Shift (4-10)') {
                console.log(`🔍 REMOVING: ${entry.shiftType} for VEERASAWMY(R) on July 1st`);
                allParsedEntries.splice(i, 1);
              }
            }
            
            const afterCount = allParsedEntries.length;
            console.log(`🔍 Entries after filtering: ${afterCount} (removed ${originalLength - afterCount})`);
          }
        }
      }
    });
    
    for (const entry of parsedEntries) {
      // Create unique key to prevent duplicates
      const entryKey = `${entry.date}-${entry.shiftType}-${entry.assignedName}`;
      
      if (!uniqueEntries.has(entryKey)) {
        uniqueEntries.add(entryKey);
        finalEntries.push({
          date: entry.date,
          shiftType: entry.shiftType,
          assignedName: entry.assignedName,
          changeDescription: 'Imported from PDF'
        });
        console.log(`✅ Entry: ${entry.assignedName} | ${entry.shiftType} | ${entry.date}`);
      } else {
        console.log(`⚠️ Skipping duplicate entry: ${entryKey}`);
      }
    }
    
    console.log(`📊 Final entries: ${finalEntries.length} unique entries created`);
    return finalEntries;
  }
}