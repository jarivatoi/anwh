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
  
  // Track recently edited entry IDs to skip realtime updates for the editing user
  const recentlyEditedIdsRef = useRef<Set<string>>(new Set());
  const EDIT_TIMEOUT = 3000; // 3 seconds to clear from tracking
  
  // Keep ref updated with current user
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Load current user from session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const session = await getUserSession();
        if (session) {
          const { data: userData, error } = await supabase
            .from('staff_users')
            .select('*')
            .eq('id', session.userId)
            .single();
          
          if (error) {
            console.error('Error fetching user:', error);
          }
          setCurrentUser(userData || null);
        }
      } catch (err) {
        console.error('Error loading current user:', err);
      }
    };
    
    loadUser();
  }, []);

  // Track mounted status and clear entries on mount
  useEffect(() => {
    isMountedRef.current = true;
    // Clear entries immediately to prevent showing stale data before institution filter
    setEntries([]);
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
      }
      
      const { data, error: fetchError } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      // Deduplicate entries - keep only the LATEST entry per date/shift/person
      const deduplicatedData = data ? deduplicateRosterEntries(data) : [];
      
      // If no data found and we filtered by institution, try without filter as fallback
      if ((!data || data.length === 0) && userInstitution) {
        const { data: allData, error: allDataError } = await supabase
          .from('roster_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (allDataError) {
          console.error('Error fetching unfiltered data:', allDataError);
        }
        
        if (isMountedRef.current) {
          const deduplicatedAllData = allData ? deduplicateRosterEntries(allData) : [];
          setEntries(deduplicatedAllData);
        }
      } else {
        // Use the already-deduplicated data
        if (isMountedRef.current) {
          setEntries(deduplicatedData);
        }
      }
    } catch (err) {
      console.error('Error loading roster entries:', err);
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
      // Get entry details before deletion for sync
      const entryToDelete = entries.find(e => e.id === id);
      
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
      
      // Dispatch rosterUpdated event to trigger special date re-sync
      if (entryToDelete) {
        window.dispatchEvent(new CustomEvent('rosterUpdated', {
          detail: { type: 'deletion', entry: entryToDelete }
        }));
      }
    } catch (err) {
      console.error('❌ Error removing entry:', err);
      throw err;
    }
  }, [entries]);

  // Register an entry ID as recently edited (to skip realtime for this user)
  // Can optionally update the entry in local state immediately or later
  const registerRecentEdit = useCallback((entryId: string, updatedData?: Partial<RosterEntry>, applyUpdateLater?: boolean) => {
    console.log('📝 Registering recent edit:', entryId, updatedData, applyUpdateLater ? '(delayed update)' : '(immediate update)');
    recentlyEditedIdsRef.current.add(entryId);
    
    // If we have updated data and should apply immediately, update local state
    if (updatedData && !applyUpdateLater) {
      setEntries(prev => {
        const updatedEntries = prev.map(entry => 
          entry.id === entryId ? { ...entry, ...updatedData } : entry
        );
        return deduplicateRosterEntries(updatedEntries);
      });
    }
    
    // Remove from tracking after timeout
    setTimeout(() => {
      recentlyEditedIdsRef.current.delete(entryId);
      console.log('🗑️ Cleared recent edit tracking:', entryId);
    }, EDIT_TIMEOUT);
  }, []);
  
  // Apply pending update to an entry (called after animation completes)
  const applyPendingUpdate = useCallback((entryId: string, updatedData: Partial<RosterEntry>) => {
    console.log('🔄 Applying pending update to entry:', entryId, updatedData);
    setEntries(prev => {
      const updatedEntries = prev.map(entry => 
        entry.id === entryId ? { ...entry, ...updatedData } : entry
      );
      return deduplicateRosterEntries(updatedEntries);
    });
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) {
      return;
    }

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
            if (!isMountedRef.current) {
              return;
            }

            // Check if this event is for the user's institution
            const userInstitution = currentUserRef.current?.posting_institution || currentUserRef.current?.institution_code;
            const eventInstitution = payload.new?.institution_code || payload.old?.institution_code;
            
            // If user has institution filter and event has different institution, skip it
            if (userInstitution && eventInstitution && userInstitution !== eventInstitution) {
              return;
            }

            // Skip realtime update if this entry was recently edited by the current user
            const entryId = payload.new?.id || payload.old?.id;
            if (entryId && recentlyEditedIdsRef.current.has(entryId)) {
              console.log('⏭️ Skipping realtime update for recently edited entry:', entryId);
              return;
            }

            // Handle different types of changes
            if (payload.eventType === 'INSERT' && payload.new) {
              setEntries(prev => {
                const updatedEntries = [...prev, payload.new as RosterEntry];
                return deduplicateRosterEntries(updatedEntries);
              });
              
              // Dispatch animation event for other users
              window.dispatchEvent(new CustomEvent('rosterNameChangeAnimation', {
                detail: {
                  entryId: payload.new.id,
                  oldName: null, // New entry, no old name
                  newName: payload.new.assigned_name
                }
              }));
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              // Check if this is a name change by comparing with existing entry
              const oldEntry = entries.find(e => e.id === payload.new.id);
              const isNameChange = oldEntry && oldEntry.assigned_name !== payload.new.assigned_name;
              
              setEntries(prev => {
                const updatedEntries = prev.map(entry => 
                  entry.id === payload.new.id ? payload.new as RosterEntry : entry
                );
                // CRITICAL: Re-run deduplication after update because the dedup key
                // (date|shift|assigned_name) may have changed if the name was edited
                return deduplicateRosterEntries(updatedEntries);
              });
              
              // If name changed, dispatch animation event for other users
              if (isNameChange && oldEntry) {
                console.log('🎬 Realtime name change detected for other users:', {
                  entryId: payload.new.id,
                  oldName: oldEntry.assigned_name,
                  newName: payload.new.assigned_name
                });
                
                window.dispatchEvent(new CustomEvent('rosterNameChangeAnimation', {
                  detail: {
                    entryId: payload.new.id,
                    oldName: oldEntry.assigned_name,
                    newName: payload.new.assigned_name
                  }
                }));
              }
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setEntries(prev => prev.filter(entry => entry.id !== payload.old.id));
            }

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', {
              detail: payload
            }));

          } catch (error) {
            console.error('Error handling real-time update:', error);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('🔔 Realtime subscription status:', status);
        if (isMountedRef.current) {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            console.log('✅ Realtime connected successfully');
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
            console.error('❌ Realtime channel error');
          } else if (status === 'TIMED_OUT') {
            setRealtimeStatus('error');
            console.error('⏱️ Realtime connection timed out');
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disconnected');
            console.log('🔌 Realtime connection closed');
          }
        }
      });

    // Initial load - but only after currentUser is loaded
    if (currentUserRef.current) {
      loadEntries();
    }

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up realtime channel');
      supabase.removeChannel(channel);
    };
  }, []); // Remove loadEntries from dependencies to prevent recreating channel

  // Load roster entries when currentUser is ready (separate from real-time setup)
  useEffect(() => {
    if (currentUserRef.current) {
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
    removeEntry,
    registerRecentEdit,
    applyPendingUpdate
  };
};