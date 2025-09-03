import { supabase } from '../lib/supabase';

export interface StaffMember {
  id: string;
  code: string;
  name: string;
  title: string;
  salary: number;
  employee_id: string;
  first_name: string;
  surname: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_updated_by: string;
}

export const fetchStaffMembers = async (): Promise<StaffMember[]> => {
  if (!supabase) {
    console.log('⚠️ Supabase not available - using local fallback');
    return [];
  }

  try {
    console.log('🔄 Fetching staff members from Supabase...');
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('is_active', true)
      .order('surname', { ascending: true });

    if (error) {
      console.log('⚠️ Staff table does not exist yet, using local defaults:', error.message);
      return [];
    }

    console.log('✅ Successfully fetched staff members:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.log('⚠️ Could not fetch staff members, using local defaults:', error);
    return [];
  }
};

export const addStaffMember = async (staffData: Omit<StaffMember, 'id' | 'created_at' | 'updated_at'>, editorName: string): Promise<StaffMember> => {
  if (!supabase) {
    throw new Error('Database not available.');
  }

  try {
    console.log('💾 Adding staff member to Supabase:', staffData);
    
    const entryData = {
      ...staffData,
      last_updated_by: editorName
    };

    const { data, error } = await supabase
      .from('staff_members')
      .upsert([entryData], { onConflict: 'code' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding staff member:', error);
      throw new Error(`Failed to add staff member: ${error.message}`);
    }

    console.log('✅ Successfully added staff member:', data);
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('staffMemberAdded', {
      detail: data
    }));
    
    return data;
  } catch (error) {
    console.error('❌ Network error adding staff member:', error);
    throw error;
  }
};

export const updateStaffMember = async (id: string, staffData: Partial<StaffMember>, editorName: string): Promise<StaffMember> => {
  if (!supabase) {
    throw new Error('Database not available.');
  }

  try {
    console.log('🔄 Updating staff member in Supabase:', { id, staffData });
    
    const updateData = {
      ...staffData,
      last_updated_by: editorName,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('staff_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating staff member:', error);
      throw new Error(`Failed to update staff member: ${error.message}`);
    }

    console.log('✅ Successfully updated staff member:', data);
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('staffMemberUpdated', {
      detail: data
    }));
    
    return data;
  } catch (error) {
    console.error('❌ Network error updating staff member:', error);
    throw error;
  }
};

export const deleteStaffMember = async (id: string, editorName: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Database not available.');
  }

  try {
    console.log('🗑️ Deleting staff member from Supabase:', id);
    
    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('staff_members')
      .update({ 
        is_active: false, 
        last_updated_by: editorName,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error deleting staff member:', error);
      throw new Error(`Failed to delete staff member: ${error.message}`);
    }

    console.log('✅ Successfully deleted staff member:', data);
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('staffMemberDeleted', {
      detail: { id, deletedStaff: data }
    }));
    
  } catch (error) {
    console.error('❌ Network error deleting staff member:', error);
    throw error;
  }
};