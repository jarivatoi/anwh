// Extract staff names from PDF text items
import { availableNames } from '../rosterAuth';

export interface NamePosition {
  name: string;
  x: number;
  y: number;
}

export class NameExtractor {
  
  /**
   * STEP 1: Find ALL staff names in the PDF and store their positions
   */
  findAllStaffNames(textItems: Array<{text: string, x: number, y: number}>): NamePosition[] {
    const staffPositions: NamePosition[] = [];
    
    console.log('👥 STEP 1: Searching for ALL staff names in PDF...');
    console.log(`👥 Available staff names to search for: ${availableNames.length} names`);
    
    for (const item of textItems) {
      const matchedName = this.findMatchingStaffName(item.text);
      if (matchedName) {
        staffPositions.push({
          name: matchedName,
          x: item.x,
          y: item.y
        });
        console.log(`👤 Found staff: ${matchedName} at (${item.x}, ${item.y})`);
      }
    }
    
    console.log(`👥 Total staff positions found: ${staffPositions.length}`);
    
    // Group by name to see if any names appear multiple times
    const nameGroups = staffPositions.reduce((groups, pos) => {
      if (!groups[pos.name]) groups[pos.name] = [];
      groups[pos.name].push(pos);
      return groups;
    }, {} as Record<string, NamePosition[]>);
    
    console.log('👥 STAFF NAME FREQUENCY:');
    Object.entries(nameGroups).forEach(([name, positions]) => {
      console.log(`👤 ${name}: found ${positions.length} times`);
      if (positions.length > 10) {
        console.log(`   ⚠️ ${name} appears ${positions.length} times - this seems high!`);
      }
    });
    
    // Special debugging for VEERASAWMY(R)
    const veerasamyPositions = nameGroups['VEERASAWMY(R)'] || [];
    if (veerasamyPositions.length > 0) {
      console.log('🔍 SPECIAL DEBUG FOR VEERASAWMY(R):');
      veerasamyPositions.forEach((pos, index) => {
        console.log(`   Position ${index + 1}: (${pos.x}, ${pos.y})`);
      });
    }
    
    return staffPositions;
  }

  private findMatchingStaffName(text: string): string | null {
    // Clean the text
    const cleanText = text.trim().toUpperCase();
    
    // Skip very short text or obvious non-names
    if (cleanText.length < 3) return null;
    
    // Skip common non-name patterns
    const skipPatterns = [
      /^\d+$/, // Pure numbers
      /^[A-Z]{1,2}$/, // Single/double letters
      /SHIFT/i, /DUTY/i, /MORNING/i, /EVENING/i, /NIGHT/i, /SATURDAY/i, /SUNDAY/i,
      /HRS/i, /AM/i, /PM/i, /DATE/i, /TIME/i
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(cleanText)) return null;
    }
    
    // Check against available staff names
    for (const name of availableNames) {
      const nameUpper = name.toUpperCase();
      
      // Extract base name without (R) for comparison
      const baseName = nameUpper.replace(/\(R\)$/, '').trim();
      const cleanTextBase = cleanText.replace(/\(R\)$/, '').trim();
      
      // Exact match (with or without (R))
      if (cleanText === nameUpper) {
        return name;
      }
      
      // Base name match (without (R) suffix)
      if (cleanTextBase === baseName && baseName.length > 3) {
        return name;
      }
      
      // Partial match for longer names
      if ((cleanText.includes(nameUpper) && nameUpper.length > 4) ||
          (nameUpper.includes(cleanText) && cleanText.length > 4) ||
          (cleanTextBase.includes(baseName) && baseName.length > 4) ||
          (baseName.includes(cleanTextBase) && cleanTextBase.length > 4)) {
        return name;
      }
    }
    
    return null;
  }
}