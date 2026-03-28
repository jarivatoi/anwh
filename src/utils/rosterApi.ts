import { supabase } from '../lib/supabase';
import { RosterEntry, RosterFormData } from '../types/roster';
import { getUserSession } from './indexedDB';

export const fetchRosterEntries = async (): Promise<RosterEntry[]> => {
  if (!supabase) {
    console.error('⚠️ Supabase not available - check your configuration');
    throw new Error('Supabase not configured. Please set up your Supabase credentials in the .env file.');
  }

  try {
    // Get current user's institution for filtering
    let institutionCode: string | null = null;
    try {
      const session = await getUserSession();
      if (session) {
        const { data: userData } = await supabase
          .from('staff_users')
          .select('id_number, institution_code, posting_institution')
          .eq('id', session.userId)
          .single();
        
        // Admin 5274 can see all (no filter), others filtered by institution
        if (userData && !userData.id_number?.endsWith('5274')) {
          institutionCode = userData.posting_institution || userData.institution_code;
        }
      }
    } catch (err) {
      console.warn('Could not determine user institution:', err);
    }
    
    // Build query with optional institution filter
    let query = supabase
      .from('roster_entries')
      .select('*');
    
    if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
    }
    
    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching roster entries:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('❌ Network error fetching roster entries:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error: Unable to connect to database. Please check your internet connection and Supabase configuration.');
  }
};

export const addRosterEntry = async (formData: RosterFormData, editorName: string): Promise<RosterEntry> => {
  if (!supabase) {
    throw new Error('Database not available. Please check your connection.');
  }

  try {
    console.log('💾 Adding roster entry to Supabase:', formData);
    
    // Get current user's institution
    let institutionCode: string | undefined;
    try {
      const session = await getUserSession();
      if (session) {
        const { data: userData } = await supabase
          .from('staff_users')
          .select('institution_code, posting_institution')
          .eq('id', session.userId)
          .single();
        
        // Use posting_institution if available (for Admin 5274), otherwise institution_code
        institutionCode = userData?.posting_institution || userData?.institution_code;
      }
    } catch (err) {
      console.warn('Could not determine user institution:', err);
    }
    
    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const entryData = {
      date: formData.date,
      shift_type: formData.shiftType,
      assigned_name: formData.assignedName,
      last_edited_by: editorName,
      last_edited_at: timestamp,
      change_description: formData.changeDescription || null,
      institution_code: institutionCode || null // Add institution
    };

    const { data, error } = await supabase
      .from('roster_entries')
      .insert([entryData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding roster entry:', error);
      throw new Error(`Failed to add roster entry: ${error.message}`);
    }

    console.log('✅ Successfully added roster entry:', data);
    
    // ALSO add to IndexedDB for offline access
    try {
      const db = (window as any).rosterDb;
      if (db && db.addRosterEntry) {
        await db.addRosterEntry(data);
        console.log('✅ Synced new roster entry to IndexedDB:', data.id);
      }
    } catch (dbError) {
      console.warn('⚠️ Could not sync to IndexedDB:', dbError);
    }
    
    // Dispatch event for calendar synchronization with detailed logging
    const syncEvent = {
      date: formData.date,
      shiftType: formData.shiftType,
      assignedName: formData.assignedName,
      editorName: editorName,
      action: 'added'
    };
    window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
      detail: syncEvent
    }));
    
    return data;
  } catch (error) {
    console.error('❌ Network error adding roster entry:', error);
    // Re-throw with more specific error message
    if (error instanceof Error) {
      throw new Error(`Import failed: ${error.message}`);
    }
    throw new Error('Import failed: Network or database error');
  }
};

export const updateRosterEntry = async (id: string, formData: RosterFormData, editorName: string): Promise<RosterEntry> => {
  if (!supabase) {
    throw new Error('Supabase not available. Please configure your Supabase credentials in .env file or src/lib/supabase.ts');
  }

  try {
    console.log('🔄 Updating roster entry in Supabase:', { id, formData });
    
    // First, get the current entry to check for existing change descriptions
    const { data: currentEntry, error: fetchError } = await supabase
      .from('roster_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current entry:', fetchError);
      throw new Error(`Failed to fetch current entry: ${fetchError.message}`);
    }

    // CRITICAL: Check if this is a name change that should trigger removal from calendar
    const isNameChange = currentEntry.assigned_name !== formData.assignedName;
    const oldAssignedName = currentEntry.assigned_name;
    
    console.log('🔍 UPDATE: Name change detection:', {
      oldName: oldAssignedName,
      newName: formData.assignedName,
      isNameChange,
      editorName
    });
    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Handle change description with original PDF tracking
    let newChangeDescription = formData.changeDescription;
    
    // If this is the first edit from a PDF import, preserve the original assignment
    if (currentEntry.change_description === 'Imported from PDF') {
      newChangeDescription = `${formData.changeDescription} (Original PDF: ${currentEntry.assigned_name})`;
    } else if (currentEntry.change_description && currentEntry.change_description.includes('(Original PDF:')) {
      // For subsequent edits, preserve the existing original PDF info
      const existingOriginal = currentEntry.change_description.match(/\(Original PDF: ([^)]+)\)/);
      if (existingOriginal) {
        newChangeDescription = `${formData.changeDescription} (Original PDF: ${existingOriginal[1]})`;
      }
    }
    
    const updateData = {
      date: formData.date,
      shift_type: formData.shiftType,
      assigned_name: formData.assignedName,
      last_edited_by: editorName,
      last_edited_at: timestamp,
      change_description: newChangeDescription || null,
      text_color: formData.textColor || null
      // Note: institution_code should not change on update - it's set on insert
    };

    const { data, error } = await supabase
      .from('roster_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating roster entry:', error);
      throw new Error(`Failed to update roster entry: ${error.message}`);
    }

    console.log('✅ Successfully updated roster entry:', data);
    
    // ALSO update IndexedDB for offline access
    try {
      const db = (window as any).rosterDb;
      if (db && db.updateRosterEntry) {
        await db.updateRosterEntry(data);
        console.log('✅ Synced roster entry to IndexedDB:', data.id);
      }
    } catch (dbError) {
      console.warn('⚠️ Could not sync to IndexedDB:', dbError);
    }
    
    // CRITICAL: If this is a name change, dispatch REMOVAL event for the old name first
    if (isNameChange) {
      console.log('🗑️ UPDATE: Dispatching removal event for old name:', oldAssignedName);
      const removalEvent = {
        date: formData.date,
        shiftType: formData.shiftType,
        assignedName: oldAssignedName, // Use the OLD name for removal
        editorName: editorName,
        action: 'removed'
      };
      window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
        detail: removalEvent
      }));
      console.log('✅ UPDATE: Removal event dispatched for:', oldAssignedName);
      
      // Small delay to ensure removal is processed first
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Dispatch event for calendar synchronization with detailed logging
    const syncEvent = {
      date: formData.date,
      shiftType: formData.shiftType,
      assignedName: formData.assignedName,
      editorName: editorName,
      action: 'updated'
    };
    window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
      detail: syncEvent
    }));
    console.log('✅ UPDATE: Addition event dispatched for:', formData.assignedName);
    
    return data;
  } catch (error) {
    console.error('❌ Network error updating roster entry:', error);
    throw error;
  }
};

export const deleteRosterEntry = async (id: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not available. Please configure your Supabase credentials in .env file or src/lib/supabase.ts');
  }

  try {
    console.log('🗑️ Deleting roster entry from Supabase:', id);
    
    // Get the entry details before deletion for sync
    const { data: entryToDelete, error: fetchError } = await supabase
      .from('roster_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching entry before deletion:', fetchError);
      throw new Error(`Failed to fetch entry before deletion: ${fetchError.message}`);
    }

    const { error } = await supabase
      .from('roster_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting roster entry:', error);
      throw new Error(`Failed to delete roster entry: ${error.message}`);
    }

    console.log('✅ Successfully deleted roster entry:', id);
    
    // ALSO remove from IndexedDB for offline access
    try {
      const db = (window as any).rosterDb;
      if (db && db.deleteRosterEntry) {
        await db.deleteRosterEntry(id);
        console.log('✅ Removed roster entry from IndexedDB:', id);
      }
    } catch (dbError) {
      console.warn('⚠️ Could not sync to IndexedDB:', dbError);
    }
    
    // Dispatch event for calendar synchronization with removal action
    if (entryToDelete) {
      console.log('🔄 Dispatching rosterCalendarSync event for removal:', {
        date: entryToDelete.date,
        shiftType: entryToDelete.shift_type,
        assignedName: entryToDelete.assigned_name,
        editorName: entryToDelete.last_edited_by || 'Unknown',
        action: 'removed'
      });
      
      const syncEvent = {
        date: entryToDelete.date,
        shiftType: entryToDelete.shift_type,
        assignedName: entryToDelete.assigned_name,
        editorName: entryToDelete.last_edited_by || 'Unknown',
        action: 'removed'
      };
      window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
        detail: syncEvent
      }));
      
      console.log('✅ rosterCalendarSync event dispatched for removal');
    }
  } catch (error) {
    console.error('❌ Network error deleting roster entry:', error);
    throw error;
  }
};

export const clearAllRosterEntries = async (institutionCode?: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not available. Please configure your Supabase credentials in .env file or src/lib/supabase.ts');
  }

  try {
    console.log('🗑️ Clearing roster entries from Supabase...');
    
    // Build query with optional institution filter
    let query = supabase.from('roster_entries').select('*', { count: 'exact', head: true });
    let deleteQuery = supabase.from('roster_entries').delete();
    
    if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
      deleteQuery = deleteQuery.eq('institution_code', institutionCode);
      console.log(`🏢 Filtering by institution: ${institutionCode}`);
    }
    
    // First, get count of entries to be deleted
    const { count, error: countError } = await query;
    
    if (countError) {
      console.error('❌ Error getting entry count:', countError);
    } else {
      console.log(`📊 Found ${count} entries to delete`);
    }
    
    const { error } = await deleteQuery;

    if (error) {
      console.error('❌ Error clearing roster entries:', error);
      throw new Error(`Failed to clear roster entries: ${error.message}`);
    }

    console.log(`✅ Successfully cleared ${count || 'unknown number of'} roster entries${institutionCode ? ` for ${institutionCode}` : ''}`);
  } catch (error) {
    console.error('❌ Network error clearing roster entries:', error);
    throw error;
  }
};

export const clearMonthRosterEntries = async (year: number, month: number, institutionCode?: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not available. Please configure your Supabase credentials in .env file or src/lib/supabase.ts');
  }

  try {
    // Create date range for the specific month (correctly calculate last day)
    const startDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    // Calculate the last day of the month correctly
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`🗑️ Clearing roster entries for ${month + 1}/${year} from Supabase...`);
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    // Build query with optional institution filter
    let query = supabase.from('roster_entries').select('*', { count: 'exact', head: true });
    let deleteQuery = supabase.from('roster_entries').delete()
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (institutionCode) {
      query = query.eq('institution_code', institutionCode);
      deleteQuery = deleteQuery.eq('institution_code', institutionCode);
      console.log(`🏢 Filtering by institution: ${institutionCode}`);
    }
    
    // First, get count of entries to be deleted
    const { count, error: countError } = await query;
    
    if (countError) {
      console.error('❌ Error getting month entry count:', countError);
    } else {
      console.log(`📊 Found ${count} entries to delete for ${month + 1}/${year}`);
    }
    
    const { error } = await deleteQuery;

    if (error) {
      console.error('❌ Error clearing month roster entries:', error);
      throw new Error(`Failed to clear month roster entries: ${error.message}`);
    }

    console.log(`✅ Successfully cleared ${count || 'unknown number of'} roster entries for ${month + 1}/${year}${institutionCode ? ` (${institutionCode})` : ''}`);
  } catch (error) {
    console.error('❌ Network error clearing month roster entries:', error);
    throw error;
  }
};

export const updateAllStaffRemarksForDate = async (date: string, info: string, editorName: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not available. Please configure your Supabase credentials in .env file or src/lib/supabase.ts');
  }

  try {
    console.log(`📝 Updating all staff remarks for ${date} with info: "${info}"`);
    
    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    // Get all entries for this date
    const { data: dateEntries, error: fetchError } = await supabase
      .from('roster_entries')
      .select('*')
      .eq('date', date);

    if (fetchError) {
      console.error('❌ Error fetching entries for date:', fetchError);
      throw new Error(`Failed to fetch entries for date: ${fetchError.message}`);
    }

    if (!dateEntries || dateEntries.length === 0) {
      console.log(`ℹ️ No entries found for date ${date}`);
      return;
    }

    console.log(`📝 Found ${dateEntries.length} entries to update for ${date}`);

    // Update each entry's change_description to include special date info
    for (const entry of dateEntries) {
      let newChangeDescription = entry.change_description || '';
      
      // Remove any existing special date info
      newChangeDescription = newChangeDescription.replace(/Special Date: [^;]*;?\s*/g, '');
      
      // Add new special date info if provided
      if (info.trim()) {
        const specialInfo = `Special Date: ${info.trim()}`;
        newChangeDescription = newChangeDescription ? 
          `${specialInfo}; ${newChangeDescription}` : 
          specialInfo;
      }
      
      const { error: updateError } = await supabase
        .from('roster_entries')
        .update({
          change_description: newChangeDescription || null,
          last_edited_by: editorName,
          last_edited_at: timestamp
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error(`❌ Error updating entry ${entry.id}:`, updateError);
        throw new Error(`Failed to update entry: ${updateError.message}`);
      }
    }

    console.log(`✅ Successfully updated ${dateEntries.length} entries for ${date}`);
  } catch (error) {
    console.error('❌ Network error updating staff remarks:', error);
    throw error;
  }
};

/**
 * Synchronize roster entries when staff member's name changes
 * Updates assigned_name in all roster entries matching the staff's ID number
 */
export const syncRosterEntriesForStaff = async (
  idNumber: string,
  newRosterDisplayName: string
): Promise<void> => {
  try {
    console.log(`🔄 Syncing roster entries for ${idNumber} → ${newRosterDisplayName}`);
    
    // Find all roster entries with this ID number
    const { data: entries, error: fetchError } = await supabase
      .from('roster_entries')
      .select('id, assigned_name, date, shift_type')
      .eq('assigned_name', idNumber);
    
    if (fetchError) {
      console.error('❌ Error finding roster entries:', fetchError);
      return;
    }
    
    if (!entries || entries.length === 0) {
      console.log(`ℹ️ No roster entries found for ${idNumber}`);
      return;
    }
    
    console.log(`📋 Found ${entries.length} roster entries to update`);
    
    // Update each entry's assigned_name to the new roster_display_name
    for (const entry of entries) {
      const oldAssignedName = entry.assigned_name;
      
      const { error: updateError } = await supabase
        .from('roster_entries')
        .update({ 
          assigned_name: newRosterDisplayName,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', entry.id);
      
      if (updateError) {
        console.error(`❌ Error updating entry ${entry.id}:`, updateError);
      } else {
        console.log(`✅ Updated roster entry ${entry.id}: ${oldAssignedName} → ${newRosterDisplayName}`);
        
        // CRITICAL: Dispatch removal event for OLD name
        const removalEvent = {
          date: entry.date || '',
          shiftType: entry.shift_type || '',
          assignedName: oldAssignedName,
          editorName: 'System Sync',
          action: 'removed' as const
        };
        window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
          detail: removalEvent
        }));
        console.log(`🗑️ Sync: Dispatched removal for ${oldAssignedName}`);
        
        // Small delay to ensure removal is processed first
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Dispatch addition event for NEW name
        const additionEvent = {
          date: entry.date || '',
          shiftType: entry.shift_type || '',
          assignedName: newRosterDisplayName,
          editorName: 'System Sync',
          action: 'added' as const
        };
        window.dispatchEvent(new CustomEvent('rosterCalendarSync', {
          detail: additionEvent
        }));
        console.log(`✅ Sync: Dispatched addition for ${newRosterDisplayName}`);
      }
    }
    
    console.log(`✅ Successfully synced ${entries.length} roster entries for ${idNumber}`);
    
  } catch (err) {
    console.error('❌ Error syncing roster entries:', err);
  }
};