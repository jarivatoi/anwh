import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RosterEntry } from '../types/roster';
import { StaffUser } from '../types';
import { getUserSession } from '../utils/indexedDB';

// Deduplicate roster entries - keep only the LATEST entry per date/shift/person
// This handles center add/remove actions that create multiple entries
const deduplicateRosterEntries = (entries: RosterEntry[]): RosterEntry[] => {
  const grouped = new Map<string, RosterEntry[]>();
  
  // Group entries by date/shift/assigned_name
  entries.forEach(entry => {
    const key = `${entry.date}|${entry.shift_type}|${entry.assigned_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(entry);
  });
  
  // For each group, keep only the LATEST entry (by last_edited_at)
  const result: RosterEntry[] = [];
  grouped.forEach((group, key) => {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      // Sort by last_edited_at descending and take the first (latest)
      const latest = group.sort((a, b) => {
        const dateA = a.last_edited_at ? new Date(a.last_edited_at).getTime() : 0;
        const dateB = b.last_edited_at ? new Date(b.last_edited_at).getTime() : 0;
        return dateB - dateA; // Descending - latest first
      })[0];
      
      result.push(latest);
    }
  });
  
  console.log('🔄 Deduplicated entries:', { before: entries.length, after: result.length });
  return result;
};

export const useRosterData = () => {
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const isMountedRef = useRef(true);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const currentUserRef = useRef<StaffUser | null>(null);
  
  // Keep ref updated with current user
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Load current user from session
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('👤 [useRosterData] Loading current user from IndexedDB...');
        const session = await getUserSession();
        console.log('📦 [useRosterData] Session:', session);
        if (session) {
          console.log('🔍 [useRosterData] Fetching user data for ID:', session.userId);
          const { data: userData, error } = await supabase
            .from('staff_users')
            .select('*')
            .eq('id', session.userId)
            .single();
          
          if (error) {
            console.error('❌ [useRosterData] Error fetching user:', error);
          } else {
            console.log('✅ [useRosterData] User loaded:', userData?.surname, userData?.name, 'Institution:', userData?.institution_code);
          }
          setCurrentUser(userData || null);
        } else {
          console.warn('⚠️ [useRosterData] No session found in IndexedDB');
        }
      } catch (err) {
        console.error('❌ [useRosterData] Error loading current user:', err);
      }
    };
    
    loadUser();
  }, []);

  // Track mounted status and clear entries on mount
  useEffect(() => {
    isMountedRef.current = true;
    // Clear entries immediately to prevent showing stale data before institution filter
    setEntries([]);
    console.log('🧹 [useRosterData] Cleared entries on mount');
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadEntries = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('🔄 Loading roster entries...');
      
      // Clear old data first to prevent showing stale data
      setEntries([]);
      
      // Determine institution filter
      let query = supabase
        .from('roster_entries')
        .select('*');
      
      // Filter by institution based on user's posting/institution
      const userInstitution = currentUserRef.current?.posting_institution || currentUserRef.current?.institution_code;
      
      if (userInstitution) {
        query = query.eq('institution_code', userInstitution);
        console.log('🏥 Filtering roster by institution:', userInstitution);
      } else {
        console.warn('⚠️ User has no institution set, showing all data');
      }
      
      const { data, error: fetchError } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      console.log('📊 Roster query result:', { 
        count: data?.length || 0,
        institution: userInstitution,
        hasData: !!data && data.length > 0
      });
      
      // Deduplicate entries - keep only the LATEST entry per date/shift/person
      const deduplicatedData = data ? deduplicateRosterEntries(data) : [];
      
      console.log('📊 After deduplication:', { 
        originalCount: data?.length || 0,
        deduplicatedCount: deduplicatedData.length
      });
      
      if (isMountedRef.current) {
        setEntries(deduplicatedData);
        console.log('✅ Loaded roster entries:', deduplicatedData.length);
      }

      // If no data found and we filtered by institution, try without filter as fallback
      if ((!data || data.length === 0) && userInstitution) {
        console.warn('⚠️ No data found with institution filter, trying without filter...');
        const { data: allData } = await supabase
          .from('roster_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
        
        console.log('📊 Fallback query result:', { count: allData?.length || 0 });
        
        if (isMountedRef.current) {
          const deduplicatedAllData = allData ? deduplicateRosterEntries(allData) : [];
          setEntries(deduplicatedAllData);
          console.log('✅ Loaded ALL roster entries (fallback):', deduplicatedAllData.length);

        }
      } else {
        if (isMountedRef.current) {
          setEntries(data || []);
          console.log('✅ Loaded roster entries:', data?.length || 0);
        }
      }
    } catch (err) {
      console.error('❌ Error loading roster entries:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load roster entries');
      }
    } finally {
      // Set loading to false immediately - let the component handle the animation
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // Removed currentUser dependency - now uses ref

  const removeEntry = useCallback(async (id: string) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error: deleteError } = await supabase
        .from('roster_entries')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Update local state
      if (isMountedRef.current) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
      }
    } catch (err) {
      console.error('❌ Error removing entry:', err);
      throw err;
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) {
      console.log('⚠️ Supabase not available for real-time updates');
      return;
    }

    console.log('📡 Setting up real-time subscription...');
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel('roster_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roster_entries'
        },
        (payload: any) => {
          try {
            console.log('📡 Real-time update received:', payload);
            
            if (!isMountedRef.current) {
              console.log('⚠️ Component unmounted, ignoring real-time update');
              return;
            }

            // Handle different types of changes
            if (payload.eventType === 'INSERT' && payload.new) {
              setEntries(prev => {
                const exists = prev.some(entry => entry.id === payload.new.id);
                if (!exists) {
                  return [payload.new as RosterEntry, ...prev];
                }
                return prev;
              });
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              setEntries(prev => 
                prev.map(entry => 
                  entry.id === payload.new.id ? payload.new as RosterEntry : entry
                )
              );
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setEntries(prev => 
                prev.filter(entry => entry.id !== payload.old.id)
              );
            }

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', {
              detail: payload
            }));

          } catch (error) {
            console.error('❌ Error handling real-time update:', error);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('📡 Real-time subscription status:', status);
        
        if (isMountedRef.current) {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            console.log('✅ Real-time connection established');
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
            console.log('❌ Real-time connection error');
          } else if (status === 'TIMED_OUT') {
            setRealtimeStatus('error');
            console.log('⏰ Real-time connection timed out');
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disconnected');
            console.log('🔌 Real-time connection closed');
          }
        }
      });

    // Initial load - but only after currentUser is loaded
    if (currentUserRef.current) {
      console.log('📋 [useRosterData] Current user ready, loading roster...');
      loadEntries();
    } else {
      console.log('⏳ [useRosterData] Waiting for current user to load...');
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [loadEntries]);

  // Load roster entries when currentUser is ready (separate from real-time setup)
  useEffect(() => {
    console.log('🔍 [useEffect] Checking if should load roster:', {
      currentUserRef: currentUserRef.current,
      currentUser_state: currentUser,
      hasInstitution: !!(currentUserRef.current?.posting_institution || currentUserRef.current?.institution_code)
    });
    
    if (currentUserRef.current) {
      console.log('📋 [useRosterData] Current user ready, loading roster...');
      loadEntries();
    }
  }, [currentUser, loadEntries]);

  // Listen for custom event to reload user data (e.g., after posting change)
  useEffect(() => {
    const handleUserUpdate = async () => {
      console.log('🔄 [useRosterData] User update event received, reloading user data...');
      const session = await getUserSession();
      if (session) {
        const { data: userData } = await supabase
          .from('staff_users')
          .select('*')
          .eq('id', session.userId)
          .single();
        setCurrentUser(userData || null);
        console.log('✅ [useRosterData] User reloaded with new posting:', userData?.posting_institution);
      }
    };
    
    window.addEventListener('userPostingChanged', handleUserUpdate);
    return () => window.removeEventListener('userPostingChanged', handleUserUpdate);
  }, []);

  return {
    entries,
    loading,
    error,
    realtimeStatus,
    loadEntries,
    removeEntry
  };
};