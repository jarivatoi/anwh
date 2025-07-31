export interface AuthCode {
  code: string;
  name: string;
}

export const authCodes: AuthCode[] = [
  // Regular Staff - ID-based codes
  { code: 'B165', name: 'BHEKUR' },
  { code: 'B196', name: 'BHOLLOORAM' },
  { code: 'D28B', name: 'DHUNNY' },
  { code: 'D07D', name: 'DOMUN' },
  { code: 'H301', name: 'FOKEERCHAND' },
  { code: 'S069', name: 'GHOORAN' },
  { code: 'H13D', name: 'HOSENBUX' },
  { code: 'J149', name: 'JUMMUN' },
  { code: 'M176', name: 'MAUDHOO' },
  { code: 'N28C', name: 'NARAYYA' },
  { code: 'P09A', name: 'PITTEA' },
  { code: 'R16G', name: 'RUNGADOO' },
  { code: 'T16G', name: 'TEELUCK' },
  { code: 'V160', name: 'VEERASAWMY' },
  
  // Radiographers (R) - 99 suffix
  { code: 'B16R', name: 'BHEKUR(R)' },
  { code: 'B19R', name: 'BHOLLOORAM(R)' },
  { code: 'D28R', name: 'DHUNNY(R)' },
  { code: 'D07R', name: 'DOMUN(R)' },
  { code: 'H30R', name: 'FOKEERCHAND(R)' },
  { code: 'H13R', name: 'HOSENBUX(R)' },
  { code: 'J14R', name: 'JUMMUN(R)' },
  { code: 'M17R', name: 'MAUDHOO(R)' },
  { code: 'N28R', name: 'NARAYYA(R)' },
  { code: 'P09R', name: 'PITTEA(R)' },
  { code: 'R16R', name: 'RUNGADOO(R)' },
  { code: 'T16R', name: 'TEELUCK(R)' },
  { code: 'V16R', name: 'VEERASAWMY(R)' },
  
  // Admin Code
  { code: '5274', name: 'ADMIN' },
];

// Available staff names for dropdowns and validation
export const availableNames = authCodes
  .filter(auth => auth.name !== 'ADMIN') // Exclude ADMIN from staff selection
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