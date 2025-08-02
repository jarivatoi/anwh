export interface AuthCode {
  code: string;
  name: string;
  title?: string;
}

export const authCodes: AuthCode[] = [
  // Regular Staff - ID-based codes
  { code: 'B165', name: 'BHEKUR', title: 'MIT' },
  { code: 'B196', name: 'BHOLLOORAM', title: 'MIT' },
  { code: 'D28B', name: 'DHUNNY', title: 'MIT' },
  { code: 'D07D', name: 'DOMUN', title: 'SMIT' },
  { code: 'H301', name: 'FOKEERCHAND', title: 'MIT' },
  { code: 'S069', name: 'GHOORAN', title: 'MIT' },
  { code: 'H13D', name: 'HOSENBUX', title: 'MIT' },
  { code: 'J149', name: 'JUMMUN', title: 'MIT' },
  { code: 'M17G', name: 'MAUDHOO', title: 'MIT' },
  { code: 'N28C', name: 'NARAYYA', title: 'MIT' },
  { code: 'P09A', name: 'PITTEA', title: 'SMIT' },
  { code: 'R16G', name: 'RUNGADOO', title: 'SMIT' },
  { code: 'T16G', name: 'TEELUCK', title: 'SMIT' },
  { code: 'V160', name: 'VEERASAWMY', title: 'SMIT' },
  
  // Radiographers (R) - 99 suffix
  { code: 'B16R', name: 'BHEKUR(R)', title: 'MIT' },
  { code: 'B19R', name: 'BHOLLOORAM(R)', title: 'MIT' },
  { code: 'D28R', name: 'DHUNNY(R)', title: 'MIT' },
  { code: 'D07R', name: 'DOMUN(R)', title: 'MIT' },
  { code: 'H30R', name: 'FOKEERCHAND(R)', title: 'MIT' },
  { code: 'H13R', name: 'HOSENBUX(R)', title: 'MIT' },
  { code: 'S06R', name: 'GHOORAN(R)', title: 'MIT' },
  { code: 'J14R', name: 'JUMMUN(R)', title: 'MIT' },
  { code: 'M17R', name: 'MAUDHOO(R)', title: 'MIT' },
  { code: 'N28R', name: 'NARAYYA(R)', title: 'MIT' },
  { code: 'P09R', name: 'PITTEA(R)', title: 'SMIT' },
  { code: 'R16R', name: 'RUNGADOO(R)', title: 'SMIT' },
  { code: 'T16R', name: 'TEELUCK(R)', title: 'SMIT' },
  { code: 'V16R', name: 'VEERASAWMY(R)', title: 'SMIT' },
  
  // Admin Code
  { code: '5274', name: 'ADMIN', title: 'ADMIN' },
  

];

// Available staff names for dropdowns and validation
export const availableNames = authCodes
  .filter(auth => auth.name !== 'ADMIN') // Exclude ADMIN from staff selection
  .filter(auth => auth.name !== 'MIT' && auth.name !== 'SMIT') // Exclude titles
  .map(auth => auth.name)
  .sort((a, b) => {
    const aHasR = a.includes('(R)');
    const bHasR = b.includes('(R)');
    
    // If one has (R) and other doesn't, (R) comes first
    if (aHasR && !bHasR) return -1;
    if (!aHasR && bHasR) return 1;
    
    // If both have (R) or both don't have (R), sort alphabetically
    return a.localeCompare(b);
  });

// Group sorting function: SMIT first, then names without (R), then names with (R)
export const sortByGroup = (names: string[]): string[] => {
  return [...names].sort((a, b) => {
    // Get auth entries for both names
    const authA = authCodes.find(auth => auth.name === a);
    const authB = authCodes.find(auth => auth.name === b);
    
    // Get titles (default to 'MIT' if not found)
    const titleA = authA?.title || 'MIT';
    const titleB = authB?.title || 'MIT';
    
    // Priority 1: SMIT comes first
    if (titleA === 'SMIT' && titleB !== 'SMIT') return -1;
    if (titleA !== 'SMIT' && titleB === 'SMIT') return 1;
    
    // Priority 2: Within same title group, names without (R) come before names with (R)
    if (titleA === titleB) {
      const aHasR = a.includes('(R)');
      const bHasR = b.includes('(R)');
      
      // Names without (R) come first
      if (!aHasR && bHasR) return -1;
      if (aHasR && !bHasR) return 1;
      
      // If both have same (R) status, sort alphabetically
      return a.localeCompare(b);
    }
    
    // Priority 3: If different titles (and neither is SMIT), sort by title then name
    const titleComparison = titleA.localeCompare(titleB);
    if (titleComparison !== 0) return titleComparison;
    
    // Same title, sort by name
    return a.localeCompare(b);
  });
};

// Get names sorted by group
export const getNamesSortedByGroup = (): string[] => {
  const names = authCodes
    .filter(auth => auth.name !== 'ADMIN') // Exclude ADMIN
    .map(auth => auth.name);
  
  return sortByGroup(names);
};

// Get names by specific title/group
export const getNamesByTitle = (title: string): string[] => {
  const names = authCodes
    .filter(auth => auth.title === title && auth.name !== 'ADMIN')
    .map(auth => auth.name);
  
  return sortByGroup(names);
};
// Shift types for the roster system
export const shiftTypes = [
  'Morning Shift (9-4)',
  'Evening Shift (4-10)',
  'Saturday (12-10)',
  'Night Duty',
  ];

// Admin code constant
export const ADMIN_CODE = '5274';

// Validation functions
export function validateAuthCode(code: string): string | null {
  const authEntry = authCodes.find(auth => auth.code === code.toUpperCase());
  return authEntry ? authEntry.name : null;
}

export function isAdminCode(code: string): boolean {
  return code.toUpperCase() === ADMIN_CODE;
}