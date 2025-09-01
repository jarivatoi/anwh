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
  { code: 'B165', name: 'BHEKUR', title: 'MIT', salary: 47510, employeeId: 'B16048123000915', firstName: 'Yashdev', surname: 'BHEKUR' },
  { code: 'B196', name: 'BHOLLOORAM', title: 'MIT', salary: 47510, employeeId: 'B19118118005356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
  { code: 'D28B', name: 'DHUNNY', title: 'MIT', salary: 30060, employeeId: '0280876127778', firstName: 'Leetarvind', surname: 'DHUNNY' },
  { code: 'D07D', name: 'DOMUN', title: 'SMIT', salary: 59300, employeeId: 'D07027340003110', firstName: 'Shamir', surname: 'DOMUN' },
  { code: 'H301', name: 'FOKEERCHAND', title: 'MIT', salary: 37185, employeeId: 'H30038612000061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
  { code: 'S069', name: 'GHOORAN', title: 'MIT', salary: 38010, employeeId: 'S06781460103939', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
  { code: 'H13D', name: 'HOSENBUX', title: 'MIT', salary: 48810, employeeId: 'H13038118012901', firstName: 'Zameer', surname: 'HOSENBUX' },
  { code: 'J149', name: 'JUMMUN', title: 'MIT', salary: 47510, employeeId: 'J14037926000909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
  { code: 'M17G', name: 'MAUDHOO', title: 'MIT', salary: 38010, employeeId: 'M17038026006966', firstName: 'Chandanee', surname: 'MAUDHOO' },
  { code: 'N28C', name: 'NARAYYA', title: 'MIT', salary: 38010, employeeId: 'N280881240162C', firstName: 'Viraj', surname: 'NARAYYA' },
  { code: 'P09A', name: 'PITTEA', title: 'SMIT', salary: 59300, employeeId: 'P09117119004134', firstName: 'Subiraj', surname: 'PITTEA' },
  { code: 'R16G', name: 'RUNGADOO', title: 'SMIT', salary: 59300, employeeId: 'R21057240011866', firstName: 'Manee', surname: 'RUNGADOO' },
  { code: 'T16G', name: 'TEELUCK', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
  { code: 'V160', name: 'VEERASAWMY', title: 'SMIT', salary: 59300, employeeId: 'V16046642044100', firstName: 'Goindah', surname: 'VEERASAWMY' },
  
  // Radiographers (R) - 99 suffix
  { code: 'B16R', name: 'BHEKUR(R)', title: 'MIT', salary: 47510, employeeId: 'B16048123000915', firstName: 'Yashdev', surname: 'BHEKUR' },
  { code: 'B19R', name: 'BHOLLOORAM(R)', title: 'MIT', salary: 47510, employeeId: 'B19118118005356', firstName: 'Sawan', surname: 'BHOLLOORAM' },
  { code: 'D28R', name: 'DHUNNY(R)', title: 'MIT', salary: 30060, employeeId: '0280876127778', firstName: 'Leetarvind', surname: 'DHUNNY' },
  { code: 'D07R', name: 'DOMUN(R)', title: 'SMIT', salary: 59300, employeeId: 'D07027340003110', firstName: 'Shamir', surname: 'DOMUN' },
  { code: 'H30R', name: 'FOKEERCHAND(R)', title: 'MIT', salary: 37185, employeeId: 'H30038612000061', firstName: 'Needeema', surname: 'FOKEERCHAND' },
  { code: 'H13R', name: 'HOSENBUX(R)', title: 'MIT', salary: 48810, employeeId: 'H13038118012901', firstName: 'Zameer', surname: 'HOSENBUX' },
  { code: 'S06R', name: 'GHOORAN(R)', title: 'MIT', salary: 38010, employeeId: 'S06781460103939', firstName: 'Bibi Sharinaaz', surname: 'SAMTALLY-GHOORAN' },
  { code: 'J14R', name: 'JUMMUN(R)', title: 'MIT', salary: 47510, employeeId: 'J14037926000909', firstName: 'Bibi Nawsheen', surname: 'JUMMUN' },
  { code: 'M17R', name: 'MAUDHOO(R)', title: 'MIT', salary: 38010, employeeId: 'M17038026006966', firstName: 'Chandanee', surname: 'MAUDHOO' },
  { code: 'N28R', name: 'NARAYYA(R)', title: 'MIT', salary: 38010, employeeId: 'N280881240162C', firstName: 'Viraj', surname: 'NARAYYA' },
  { code: 'P09R', name: 'PITTEA(R)', title: 'SMIT', salary: 59300, employeeId: 'P09117119004134', firstName: 'Subiraj', surname: 'PITTEA' },
  { code: 'R21R', name: 'RUNGADOO(R)', title: 'SMIT', salary: 59300, employeeId: 'R21057240011866', firstName: 'Manee', surname: 'RUNGADOO' },
  { code: 'T16R', name: 'TEELUCK(R)', title: 'SMIT', salary: 59300, employeeId: '', firstName: '', surname: 'TEELUCK' },
  { code: 'V16R', name: 'VEERASAWMY(R)', title: 'SMIT', salary: 59300, employeeId: 'V16046642044100', firstName: 'Goindah', surname: 'VEERASAWMY' },
  
  // Admin Code
  { code: '5274', name: 'ADMIN', title: 'ADMIN', salary: 0, employeeId: '', firstName: '', surname: '' }
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
  'Saturday Regular (12-10)',
  'Evening Shift (4-10)',
  'Night Duty',
  'Sunday/Public Holiday/Special'
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

export function getStaffSalary(staffName: string): number {
  const staffInfo = getStaffInfo(staffName);
  return staffInfo?.salary || 0;
}

/**
 * Update the auth codes array and persist to file
 */
export async function updateAuthCodes(newAuthCodes: AuthCode[]): Promise<void> {
  try {
    console.log('💾 Updating rosterAuth.ts with new auth codes...');
    
    // Generate the new file content
    const fileContent = generateRosterAuthFileContent(newAuthCodes);
    
    // Write to file using fetch API to update the source file
    const response = await fetch('/api/update-roster-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: fileContent })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update rosterAuth.ts file');
    }
    
    // Update the in-memory array
    authCodes.length = 0;
    authCodes.push(...newAuthCodes);
    
    console.log('✅ Successfully updated rosterAuth.ts');
    
  } catch (error) {
    console.error('❌ Failed to update rosterAuth.ts:', error);
    throw new Error('Failed to save changes to rosterAuth.ts. Changes are temporary until page refresh.');
  }
}

/**
 * Generate the complete rosterAuth.ts file content
 */
function generateRosterAuthFileContent(authCodes: AuthCode[]): string {
  const authCodesString = authCodes.map(auth => {
    return `  { code: '${auth.code}', name: '${auth.name}', title: '${auth.title || 'MIT'}', salary: ${auth.salary || 0}, employeeId: '${auth.employeeId || ''}', firstName: '${auth.firstName || ''}', surname: '${auth.surname || ''}' }`;
  }).join(',\n');

  return `export interface AuthCode {
  code: string;
  name: string;
  title?: string;
  employeeId?: string;
  firstName?: string;
  surname?: string;
}

export const authCodes: AuthCode[] = [
${authCodesString}
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
  'Saturday Regular (12-10)',
  'Evening Shift (4-10)',
  'Night Duty',
  'Sunday/Public Holiday/Special'
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
  
  return firstName ? \`\${firstName} \${surname}\` : surname;
}

export function getStaffEmployeeId(staffName: string): string {
  const staffInfo = getStaffInfo(staffName);
  return staffInfo?.employeeId || '';
}

export function getStaffSalary(staffName: string): number {
  const staffInfo = getStaffInfo(staffName);
  return staffInfo?.salary || 0;
}

/**
 * Update the auth codes array and persist to file
 */
export async function updateAuthCodes(newAuthCodes: AuthCode[]): Promise<void> {
  try {
    console.log('💾 Updating rosterAuth.ts with new auth codes...');
    
    // Update the in-memory array immediately for instant UI updates
    authCodes.length = 0;
    authCodes.push(...newAuthCodes);
    
    // Force refresh of derived arrays
    refreshDerivedArrays();
    
    console.log('✅ Successfully updated rosterAuth.ts in memory');
    
    // Note: In a real application, you would also persist to a database or file
    // For now, changes persist until page refresh
    
  } catch (error) {
    console.error('❌ Failed to update rosterAuth.ts:', error);
    throw new Error('Failed to save changes. Please try again.');
  }
}

/**
 * Refresh derived arrays after auth codes change
 */
function refreshDerivedArrays(): void {
  // Force recalculation of availableNames by clearing and rebuilding
  const newAvailableNames = authCodes
    .filter(auth => auth.name !== 'ADMIN')
    .filter(auth => auth.name !== 'MIT' && auth.name !== 'SMIT')
    .map(auth => auth.name)
    .sort((a, b) => {
      const aHasR = a.includes('(R)');
      const bHasR = b.includes('(R)');
      
      if (aHasR && !bHasR) return -1;
      if (!aHasR && bHasR) return 1;
      
      return a.localeCompare(b);
    });
  
  // Update the exported array
  (availableNames as any).length = 0;
  (availableNames as any).push(...newAvailableNames);
  
  console.log('🔄 Refreshed derived arrays with new auth codes');
}
}