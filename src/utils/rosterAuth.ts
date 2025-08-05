export interface AuthCode {
  code: string;
  name: string;
  title?: string;
  employeeId?: string;
  firstName?: string;
  surname?: string;
}

export const authCodes: AuthCode[] = [
  // Regular Staff - ID-based codes
  { code: 'B165', name: 'BHEKUR', title: 'MIT', employeeId: '47510', firstName: 'Yashdev', surname: 'BHEKUR' },
  { code: 'B196', name: 'BHOLLOORAM', title: 'MIT', employeeId: '47510', firstName: 'Sawan', surname: 'BHOLLOORAM' },
  { code: 'D28B', name: 'DHUNNY', title: 'MIT', employeeId: '30060', firstName: 'Leetarvind', surname: 'DHUNNY' },
  { code: 'D07D', name: 'DOMUN', title: 'SMIT', employeeId: '59300', firstName: 'Shamir', surname: 'DOMUN' },
  { code: 'H301', name: 'FOKEERCHAND', title: 'MIT', employeeId: '37185', firstName: 'Needeema', surname: 'FOKEERCHAND' },
  { code: 'S069', name: 'GHOORAN', title: 'MIT', employeeId: '38010', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
  { code: 'H13D', name: 'HOSENBUX', title: 'SMIT', employeeId: '48810', firstName: 'Zameer', surname: 'HOSENBUX' },
  { code: 'J149', name: 'JUMMUN', title: 'MIT', employeeId: '47510', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
  { code: 'M17G', name: 'MAUDHOO', title: 'MIT', employeeId: '38010', firstName: 'Chandanee', surname: 'MAUDHOO' },
  { code: 'N28C', name: 'NARAYYA', title: 'MIT', employeeId: '38010', firstName: 'Viraj', surname: 'NARAYYA' },
  { code: 'P09A', name: 'PITTEA', title: 'SMIT', employeeId: '59300', firstName: 'Pokhiraj', surname: 'PITTEA' },
  { code: 'R16G', name: 'RUNGADOO', title: 'SMIT', employeeId: '59300', firstName: 'Manee', surname: 'RUNGADOO' },
  { code: 'T16G', name: 'TEELUCK', title: 'SMIT', employeeId: '59300', firstName: '', surname: 'TEELUCK' },
  { code: 'V160', name: 'VEERASAWMY', title: 'SMIT', employeeId: '59300', firstName: 'Goindah', surname: 'VEERASAWMY' },
  
  // Radiographers (R) - 99 suffix
  { code: 'B16R', name: 'BHEKUR(R)', title: 'MIT', employeeId: '47510', firstName: 'Yashdev', surname: 'BHEKUR' },
  { code: 'B19R', name: 'BHOLLOORAM(R)', title: 'MIT', employeeId: '47510', firstName: 'Sawan', surname: 'BHOLLOORAM' },
  { code: 'D28R', name: 'DHUNNY(R)', title: 'MIT', employeeId: '30060', firstName: 'Leetarvind', surname: 'DHUNNY' },
  { code: 'D07R', name: 'DOMUN(R)', title: 'SMIT', employeeId: '59300', firstName: 'Shamir', surname: 'DOMUN' },
  { code: 'H30R', name: 'FOKEERCHAND(R)', title: 'MIT', employeeId: '37185', firstName: 'Needeema', surname: 'FOKEERCHAND' },
  { code: 'H13R', name: 'HOSENBUX(R)', title: 'MIT', employeeId: '48810', firstName: 'Zameer', surname: 'HOSENBUX' },
  { code: 'S06R', name: 'GHOORAN(R)', title: 'MIT', employeeId: '38010', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
  { code: 'J14R', name: 'JUMMUN(R)', title: 'MIT', employeeId: '47510', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
  { code: 'M17R', name: 'MAUDHOO(R)', title: 'MIT', employeeId: '38010', firstName: 'Chandanee', surname: 'MAUDHOO' },
  { code: 'N28R', name: 'NARAYYA(R)', title: 'MIT', employeeId: '38010', firstName: 'Viraj', surname: 'NARAYYA' },
  { code: 'P09R', name: 'PITTEA(R)', title: 'SMIT', employeeId: '59300', firstName: 'Pokhiraj', surname: 'PITTEA' },
  { code: 'R21R', name: 'RUNGADOO(R)', title: 'SMIT', employeeId: '59300', firstName: 'Manee', surname: 'RUNGADOO' },
  { code: 'T16R', name: 'TEELUCK(R)', title: 'SMIT', employeeId: '59300', firstName: '', surname: 'TEELUCK' },
  { code: 'V16R', name: 'VEERASAWMY(R)', title: 'SMIT', employeeId: '59300', firstName: 'Goindah', surname: 'VEERASAWMY' },
  
  // Admin Code
  { code: '5274', name: 'ADMIN', title: 'ADMIN' }
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

// Helper functions to get staff information
export function getStaffInfo(staffName: string): AuthCode | null {
  return authCodes.find(auth => auth.name === staffName) || null;
}

export function getStaffFullName(staffName: string): string {
  const staffInfo = getStaffInfo(staffName);
  if (!staffInfo) return staffName;
  
  const firstName = staffInfo.firstName || '';
  const surname = staffInfo.surname || staffInfo.name;
  
  return firstName ? `${firstName} ${surname}` : surname;
}

export function getStaffEmployeeId(staffName: string): string {
  const staffInfo = getStaffInfo(staffName);
  return staffInfo?.employeeId || '';
}