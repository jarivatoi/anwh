import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RosterEntry } from '../types/roster';

export const useRosterData = () => {
  const [entries, setEntries] = useState<RosterEntry[]>([]);
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

  const loadEntries = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured. Please check your setup.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Loading roster entries...');
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('roster_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error loading entries:', fetchError);
        setError(`Database error: ${fetchError.message}`);
        return;
      }

      if (isMountedRef.current) {
        setEntries(data || []);
        console.log('✅ Loaded entries:', data?.length || 0);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      console.log('🗑️ Removing entry:', id);
      
      // Get the entry details before deletion for sync
      const { data: entryToDelete, error: fetchError } = await supabase
        .from('roster_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch entry: ${fetchError.message}`);
      }

      const { error } = await supabase
        .from('roster_entries')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete entry: ${error.message}`);
      }

      // Update local state
      if (isMountedRef.current) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
      }

      // Dispatch event for calendar synchronization
      if (entryToDelete) {
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
      }

      console.log('✅ Entry removed successfully');
    } catch (err) {
      console.error('❌ Error removing entry:', err);
      throw err;
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) {
      console.log('⚠️ Supabase not available, skipping real-time setup');
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
        (payload) => {
          if (!isMountedRef.current) {
            console.warn('Component unmounted, ignoring real-time update');
            return;
          }

          try {
            console.log('📡 Real-time update received:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newEntry = payload.new as RosterEntry;
              setEntries(prev => {
                const exists = prev.some(entry => entry.id === newEntry.id);
                if (exists) return prev;
                return [newEntry, ...prev];
              });
              
              // Dispatch event for other components
              window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', {
                detail: { type: 'INSERT', entry: newEntry }
              }));
              
            } else if (payload.eventType === 'UPDATE') {
              const updatedEntry = payload.new as RosterEntry;
              setEntries(prev => prev.map(entry => 
                entry.id === updatedEntry.id ? updatedEntry : entry
              ));
              
              // Dispatch event for other components
              window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', {
                detail: { type: 'UPDATE', entry: updatedEntry }
              }));
              
            } else if (payload.eventType === 'DELETE') {
              const deletedEntry = payload.old as RosterEntry;
              setEntries(prev => prev.filter(entry => entry.id !== deletedEntry.id));
              
              // Dispatch event for other components
              window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', {
                detail: { type: 'DELETE', entry: deletedEntry }
              }));
            }
          } catch (error) {
            console.error('❌ Error handling real-time update:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          console.log('✅ Real-time connection established');
        } else if (status === 'CHANNEL_ERROR') {
          setRealtimeStatus('error');
          console.error('❌ Real-time connection error');
        } else if (status === 'TIMED_OUT') {
          setRealtimeStatus('error');
          console.error('❌ Real-time connection timed out');
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
          console.log('📡 Real-time connection closed');
        }
      });

    // Initial load
    loadEntries();

    // Cleanup
    return () => {
      console.log('📡 Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
      setRealtimeStatus('disconnected');
    };
  }, [loadEntries]);

  return {
    entries,
    loading,
    error,
    realtimeStatus,
    loadEntries,
    removeEntry
  };
};