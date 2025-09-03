import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { StaffMember } from '../utils/staffApi';
import { authCodes, AuthCode, updateAuthCodes } from '../utils/rosterAuth';

export const useStaffData = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const isMountedRef = useRef(true);

  // Track mounted status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Convert StaffMember to AuthCode format
  const convertToAuthCode = (staff: StaffMember): AuthCode => ({
    code: staff.code,
    name: staff.name,
    title: staff.title,
    salary: staff.salary,
    employeeId: staff.employee_id,
    firstName: staff.first_name,
    surname: staff.surname
  });

  // Update local auth codes when staff data changes
  const updateLocalAuthCodes = useCallback(async (staffList: StaffMember[]) => {
    try {
      const authCodesList = staffList.map(convertToAuthCode);
      console.log('🔄 Updating local auth codes with server data:', authCodesList.length, 'entries');
      
      // Update the rosterAuth module
      await updateAuthCodes(authCodesList);
      
      console.log('✅ Local auth codes updated successfully');
    } catch (error) {
      console.error('❌ Failed to update local auth codes:', error);
    }
  }, []);

  const loadStaffMembers = useCallback(async () => {
    if (!supabase) {
      console.log('⚠️ Supabase not available, using local auth codes');
      
      // Convert local auth codes to staff member format
      const localStaffMembers: StaffMember[] = authCodes
        .filter(auth => auth.name !== 'ADMIN') // Exclude ADMIN from staff list
        .map(auth => ({
          id: auth.code, // Use code as ID for local data
          code: auth.code,
          name: auth.name,
          title: auth.title || 'MIT',
          salary: auth.salary || 0,
          employee_id: auth.employeeId || '',
          first_name: auth.firstName || '',
          surname: auth.surname || auth.name,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated_by: 'LOCAL'
        }));
      
      if (isMountedRef.current) {
        setStaffMembers(localStaffMembers);
        setError('Using local staff data - database not available');
        setLoading(false);
      }
      return;
    }

    try {
      setError(null);
      console.log('🔄 Loading staff members from Supabase...');
      
      const { data, error: fetchError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('is_active', true)
        .order('surname', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (isMountedRef.current) {
        setStaffMembers(data || []);
        console.log('✅ Loaded staff members from Supabase:', data?.length || 0);
        
        // Update local auth codes with server data
        if (data && data.length > 0) {
          await updateLocalAuthCodes(data);
        }
      }
    } catch (err) {
      console.error('❌ Error loading staff members:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load staff members');
        
        // Fallback to local auth codes on error
        const localStaffMembers: StaffMember[] = authCodes
          .filter(auth => auth.name !== 'ADMIN')
          .map(auth => ({
            id: auth.code,
            code: auth.code,
            name: auth.name,
            title: auth.title || 'MIT',
            salary: auth.salary || 0,
            employee_id: auth.employeeId || '',
            first_name: auth.firstName || '',
            surname: auth.surname || auth.name,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_updated_by: 'LOCAL'
          }));
        
        setStaffMembers(localStaffMembers);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [updateLocalAuthCodes]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) {
      console.log('⚠️ Supabase not available for real-time staff updates');
      return;
    }

    console.log('📡 Setting up staff real-time subscription...');
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel('staff_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_members'
        },
        async (payload) => {
          try {
            console.log('📡 Staff real-time update received:', payload);
            
            if (!isMountedRef.current) {
              console.log('⚠️ Component unmounted, ignoring staff real-time update');
              return;
            }

            // Handle different types of changes
            if (payload.eventType === 'INSERT' && payload.new) {
              const newStaff = payload.new as StaffMember;
              if (newStaff.is_active) {
                setStaffMembers(prev => {
                  const exists = prev.some(staff => staff.id === newStaff.id);
                  if (!exists) {
                    const updated = [...prev, newStaff].sort((a, b) => a.surname.localeCompare(b.surname));
                    updateLocalAuthCodes(updated);
                    return updated;
                  }
                  return prev;
                });
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedStaff = payload.new as StaffMember;
              setStaffMembers(prev => {
                const updated = prev
                  .map(staff => staff.id === updatedStaff.id ? updatedStaff : staff)
                  .filter(staff => staff.is_active) // Remove inactive staff
                  .sort((a, b) => a.surname.localeCompare(b.surname));
                updateLocalAuthCodes(updated);
                return updated;
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              const deletedStaff = payload.old as StaffMember;
              setStaffMembers(prev => {
                const updated = prev.filter(staff => staff.id !== deletedStaff.id);
                updateLocalAuthCodes(updated);
                return updated;
              });
            }

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('staffRealtimeUpdate', {
              detail: payload
            }));

          } catch (error) {
            console.error('❌ Error handling staff real-time update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Staff real-time subscription status:', status);
        
        if (isMountedRef.current) {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            console.log('✅ Staff real-time connection established');
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
            console.log('❌ Staff real-time connection error');
          } else if (status === 'TIMED_OUT') {
            setRealtimeStatus('error');
            console.log('⏰ Staff real-time connection timed out');
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disconnected');
            console.log('🔌 Staff real-time connection closed');
          }
        }
      });

    // Initial load
    loadStaffMembers();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up staff real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [loadStaffMembers, updateLocalAuthCodes]);

  return {
    staffMembers,
    loading,
    error,
    realtimeStatus,
    loadStaffMembers
  };
};