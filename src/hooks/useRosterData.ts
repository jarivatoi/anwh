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
      
      // Add timeout and better error handling for fetch operations
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const fetchPromise = fetchRosterEntries();
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (Array.isArray(data)) {
        console.log('✅ Fetched entries:', data.length);
        setEntries(data);
      } else {
        console.warn('⚠️ Invalid data format received, using empty array');
        setEntries([]);
      }
    } catch (err) {
      console.error('❌ Failed to load entries:', err);
      
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('Unable to connect to the database. Please check your internet connection and try again.');
      } else if (err instanceof Error && err.message.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else if (err instanceof Error) {
        setError(`Database error: ${err.message}`);
      } else {
        setError('Failed to load roster entries. Please check your connection and try again.');
      }
      
      // Set empty entries on error to prevent UI issues
      setEntries([]);
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
      // Add timeout for connection test
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection test timeout')), 5000)
      );
      
      const testPromise = supabase.from('roster_entries').select('id').limit(1);
      const { data, error } = await Promise.race([testPromise, timeoutPromise]);
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error.message);
        setLastConnectionError(`Connection test failed: ${error.message}`);
        return false;
      }
      console.log('✅ Supabase connection test successful');
      setLastConnectionError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Supabase connection test failed:', errorMessage);
      
      if (errorMessage.includes('Failed to fetch')) {
        setLastConnectionError('Network connection failed - please check your internet connection');
      } else if (errorMessage.includes('timeout')) {
        setLastConnectionError('Connection timeout - please try again');
      } else {
        setLastConnectionError(`Connection error: ${errorMessage}`);
      }
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
              
              // Validate payload structure
              if (!payload || typeof payload !== 'object') {
                console.warn('⚠️ Invalid payload received:', payload);
                return;
              }
              
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
              if (isMountedRef.current) {
                loadEntries();
              }
            } catch (error) {
              console.error('❌ Error handling real-time update:', error);
              // Set error state but don't throw to prevent subscription from failing
              setLastConnectionError(error instanceof Error ? error.message : 'Real-time update error');
              // Continue with subscription despite the error
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

  // Listen for manual refresh requests from other components
  useEffect(() => {
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