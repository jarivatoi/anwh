import { supabase } from '../lib/supabase';
import { Institution } from '../types';
import { getUserSession } from './indexedDB';

/**
 * Get current user's institution based on their session
 * For Admin 5274, uses posting_institution; for others, uses institution_code
 */
export async function getCurrentUserInstitution(): Promise<string | null> {
  try {
    // Get session from IndexedDB (new method)
    const session = await getUserSession();
    
    if (!session) {
      console.warn('No session found for institution lookup');
      return null;
    }

    const { data: userData } = await supabase
      .from('staff_users')
      .select('id_number, institution_code, posting_institution')
      .eq('id_number', session.idNumber)
      .single();

    if (!userData) {
      console.warn('User data not found');
      return null;
    }

    // Admin 5274 can switch institutions via posting_institution
    // Others use their fixed institution_code
    const institution = userData.posting_institution || userData.institution_code;
    
    return institution || null;
  } catch (error) {
    console.error('Error getting current user institution:', error);
    return null;
  }
}

/**
 * Get institution details by code
 */
export async function getInstitutionByCode(code: string): Promise<Institution | null> {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn('Institution not found:', code);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching institution:', error);
    return null;
  }
}

/**
 * Get current institution details (combines both functions above)
 */
export async function getCurrentInstitutionDetails(): Promise<Institution | null> {
  const institutionCode = await getCurrentUserInstitution();
  
  if (!institutionCode) {
    return null;
  }

  return await getInstitutionByCode(institutionCode);
}

/**
 * Format institution header for PDF documents
 * Returns array of lines for the header
 */
export function formatInstitutionHeader(institution: Institution | null): string[] {
  if (!institution) {
    // No institution found - show generic header
    return [
      'X-RAY DEPARTMENT'
    ];
  }

  const lines: string[] = [];
  
  // Line 1: Department + Hospital Name + Address (all in one line, uppercase)
  const addressPart = institution.address ? ` - ${institution.address.toUpperCase()}` : '';
  lines.push(`X-RAY DEPARTMENT - ${institution.name.toUpperCase()}${addressPart}`);

  return lines;
}

/**
 * Get institution name for display
 */
export function getInstitutionDisplayName(institution: Institution | null): string {
  if (!institution) {
    return 'Jawaharlal Nehru Hospital';
  }
  
  return institution.name;
}
