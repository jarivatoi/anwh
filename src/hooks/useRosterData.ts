import { useState, useEffect, useCallback } from 'react';
import { RosterEntry, RosterFormData } from '../types/roster';
import { fetchRosterEntries, addRosterEntry, updateRosterEntry, deleteRosterEntry } from '../utils/rosterApi';
import { supabase } from '../lib/supabase';

export const useRosterData = () => {
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastConnectionError, setLastConnectionError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Connection management
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading entries from database...');
      const data = await fetchRosterEntries();
      console.log('✅ Fetched entries:', data.length);
      setEntries(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load roster entries. Please check your configuration.');
      }
      console.error('❌ Supabase connection test failed:', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      // CRITICAL: Always set loading to false, even if database is empty
      setLoading(false);
      console.log('✅ Loading state reset to false');
    }
  }, []);

  // Test Supabase connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      console.log('❌ Supabase client not initialized');
      return false;
    }
    
    try {
      const { data, error } = await supabase.from('roster_entries').select('id').limit(1);
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
        return false;
      }
      console.log('✅ Supabase connection test successful');
      return true;
    } catch (err) {
      console.error('❌ Supabase connection test failed:', err);
      return false;
    }
  }, []);

  // Setup real-time subscription with proper cleanup
  const setupRealtime = useCallback(async () => {
    if (!supabase || connectionAttempts >= maxRetries) {
      console.log('❌ Skipping real-time setup - max retries reached or no supabase client');
      setRealtimeStatus('error');
      return;
    }

    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log('❌ Supabase connection test failed, skipping real-time setup');
      setRealtimeStatus('error');
      setLastConnectionError('Connection test failed');
      return;
    }

    try {
      console.log(`🔄 Setting up real-time subscription (attempt ${connectionAttempts + 1}/${maxRetries})...`);
      setRealtimeStatus('connecting');
      setConnectionAttempts(prev => prev + 1);

      // Clean up existing channel first
      if (realtimeChannel) {
        console.log('🧹 Cleaning up existing real-time channel');
        await supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
      }

      // Create new channel with unique name
      const channelName = `roster_changes_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'roster_entries'
          },
          (payload) => {
            try {
              console.log('📡 Real-time update received:', payload);
              
              // Dispatch custom event for components to handle
              window.dispatchEvent(new CustomEvent('rosterRealtimeUpdate', { 
                detail: {
                  eventType: payload.eventType,
                  newRecord: payload.new,
                  oldRecord: payload.old,
                  timestamp: new Date().toISOString()
                }
              }));
              
              // Refresh data
              loadEntries();
            } catch (error) {
              console.error('❌ Error handling real-time update:', error);
              // Don't throw the error to prevent subscription from failing
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription active');
            setRealtimeStatus('connected');
            setConnectionAttempts(0); // Reset on successful connection
            setLastConnectionError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error');
            setRealtimeStatus('error');
            setLastConnectionError('Channel error');
            
            // Retry after delay if under max retries
            if (connectionAttempts < maxRetries) {
              setTimeout(() => {
                setupRealtime();
              }, retryDelay);
            }
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out');
            setRealtimeStatus('error');
            setLastConnectionError('Connection timed out');
            
            // Retry after delay if under max retries
            if (connectionAttempts < maxRetries) {
              setTimeout(() => {
                setupRealtime();
              }, retryDelay);
            }
          } else if (status === 'CLOSED') {
            console.log('🔌 Real-time connection closed');
            setRealtimeStatus('disconnected');
            
            // Only retry if we haven't exceeded max attempts
            if (connectionAttempts < maxRetries) {
              setTimeout(() => {
                setupRealtime();
              }, retryDelay);
            }
          }
        });

      setRealtimeChannel(channel);
      
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error);
      setRealtimeStatus('error');
      setLastConnectionError(error instanceof Error ? error.message : 'Unknown error');
      
      // Retry after delay if under max retries
      if (connectionAttempts < maxRetries) {
        setTimeout(() => {
          setupRealtime();
        }, retryDelay);
      }
    }
  }, [connectionAttempts, realtimeChannel, testConnection, loadEntries]);

  // Cleanup real-time subscription
  const cleanupRealtime = useCallback(async () => {
    if (realtimeChannel && supabase) {
      console.log('🧹 Cleaning up real-time subscription');
      try {
        await supabase.removeChannel(realtimeChannel);
        setRealtimeChannel(null);
        setRealtimeStatus('disconnected');
      } catch (error) {
        console.error('❌ Error cleaning up real-time subscription:', error);
      }
    }
  }, [realtimeChannel]);

  const addEntry = useCallback(async (formData: RosterFormData, editorName: string): Promise<RosterEntry> => {
    console.log('➕ Adding entry to database...');
    const newEntry = await addRosterEntry(formData, editorName);
    console.log('✅ Entry added successfully');
    
    // Notify other components to refresh manually
    window.dispatchEvent(new CustomEvent('rosterUpdated', { 
      detail: newEntry
    }));
    
    return newEntry;
  }, [loadEntries]);

  const updateEntry = useCallback(async (id: string, formData: RosterFormData, editorName: string): Promise<RosterEntry> => {
    console.log('✏️ Updating entry in database...');
    const updatedEntry = await updateRosterEntry(id, formData, editorName);
    console.log('✅ Entry updated successfully');
    
    // Update local state immediately
    setEntries(prev => prev.map(entry => 
      entry.id === id ? updatedEntry : entry
    ));
    
    // Notify other components to refresh manually
    window.dispatchEvent(new CustomEvent('rosterUpdated', { 
      detail: updatedEntry
    }));
    
    return updatedEntry;
  }, []);

  const removeEntry = useCallback(async (id: string): Promise<void> => {
    console.log('🗑️ Removing entry from database...');
    await deleteRosterEntry(id);
    console.log('✅ Entry removed successfully');
    
    // Update local state immediately
    setEntries(prev => prev.filter(entry => entry.id !== id));
    
    // Notify other components to refresh manually
    window.dispatchEvent(new CustomEvent('rosterUpdated', { 
      detail: { id, deleted: true }
    }));
  }, []);

  // Load entries and setup real-time on mount
  useEffect(() => {
    loadEntries();
    
    // Setup real-time after initial load
    const timer = setTimeout(() => {
      setupRealtime();
    }, 1000); // 1 second delay to ensure initial load completes
    
    return () => {
      clearTimeout(timer);
      cleanupRealtime();
    };
  }, [loadEntries]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealtime();
    };
  }, [cleanupRealtime]);

  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) return;
      
      try {
        console.warn('⚠️ Error loading roster data, trying IndexedDB:', err);
        try {
          const fallbackEntries = await getStoredRosterEntries();
          setRosterEntries(fallbackEntries);
          setError('Using offline data - Supabase connection failed');
        } catch (fallbackErr) {
          console.error('❌ Both Supabase and IndexedDB failed:', fallbackErr);
          setError('Failed to load roster data from both online and offline sources');
        }
        const { error } = await supabase
          .from('roster_entries')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.warn('⚠️ Supabase connection test failed:', error.message);
          console.log('ℹ️ App will work in offline mode using IndexedDB');
        } else {
          console.log('✅ Supabase connection test successful');
        }
      } catch (err) {
        console.warn('⚠️ Supabase connection test failed:', err);
        console.log('ℹ️ App will work in offline mode using IndexedDB');
      }
    };

    testConnection();
  }, []);

  // Original connection test (keeping for compatibility)
  useEffect(() => {
    const testConnection = async () => {
      if (!supabase) return;
      
      try {
        const { error } = await supabase.from('roster_entries').select('count', { count: 'exact', head: true });
        if (error) {
          console.warn('⚠️ Connection test error:', error.message);
        } else {
          console.log('✅ Connection test passed');
        }
      } catch (err) {
        console.warn('⚠️ Connection test network error:', err);
      }
    };

    const handleManualRefresh = () => {
      console.log('🔄 Manual refresh requested');
      loadEntries();
    };

    window.addEventListener('manualRefreshRequested', handleManualRefresh);
    return () => window.removeEventListener('manualRefreshRequested', handleManualRefresh);
  }, [loadEntries]);

  return {
    entries,
    loading,
    error,
    realtimeStatus,
    connectionAttempts,
    lastConnectionError,
    loadEntries,
    addEntry,
    updateEntry,
    removeEntry,
    realtimeChannel
  };
};