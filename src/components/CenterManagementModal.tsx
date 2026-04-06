import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserSession } from '../utils/indexedDB';

interface AttachedCenter {
  id: string;
  institution_code: string;
  marker: string;
  center_name: string;
}

interface CenterManagementModalProps {
  isOpen: boolean;
  staffName: string;
  currentDate?: string;
  currentShift?: string;
  userInstitution?: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onCenterChange?: (staffName: string, centerName: string, action: 'add' | 'remove', editorName: string) => void;
  onCentersUpdated?: () => void; // Add this prop to trigger refresh
}

export const CenterManagementModal: React.FC<CenterManagementModalProps> = ({
  isOpen,
  staffName,
  currentDate,
  currentShift,
  userInstitution,
  isAdmin,
  onClose,
  onCenterChange,
  onCentersUpdated
}) => {
  const [availableCenters, setAvailableCenters] = useState<AttachedCenter[]>([]);
  const [assignedCenters, setAssignedCenters] = useState<string[]>([]); // Store center names
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch available centers for user's institution
  useEffect(() => {
    if (isOpen && userInstitution) {
      fetchAvailableCenters();
    } else if (isOpen && isAdmin && !userInstitution) {
      // If admin and no userInstitution set, fetch all centers
      fetchAllCenters();
    }
    // Note: Non-admin users MUST have institution - it's compulsory during registration
    // If userInstitution is null for non-admin, modal will show empty list (correct behavior)
  }, [isOpen, userInstitution, isAdmin]);

  const fetchAvailableCenters = async () => {
    if (!userInstitution) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attached_centers')
        .select('*')
        .eq('institution_code', userInstitution)
        .order('marker', { ascending: true });

      if (error) throw error;
      if (data) {
        setAvailableCenters(data);
      }
    } catch (error) {
      console.error('Error fetching available centers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAllCenters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attached_centers')
        .select('*')
        .order('marker', { ascending: true });

      if (error) throw error;
      if (data) {
        setAvailableCenters(data);
      }
    } catch (error) {
      console.error('Error fetching all centers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch currently assigned centers for this staff member
  useEffect(() => {
    if (isOpen && staffName && currentDate && currentShift) {
      fetchAssignedCenters();
    }
  }, [isOpen, staffName, currentDate, currentShift]);

  const fetchAssignedCenters = async () => {
    if (!staffName || !currentDate || !currentShift) return;
    
    try {
      console.log('🔍 Fetching centers for staffName:', staffName);
      
      // Extract ID from staffName if it exists (format: NAME_ID or NAME_ID(R))
      const staffNameParts = staffName.replace('(R)', '').split('_');
      const hasIdFormat = staffNameParts.length > 1;
      
      let query = supabase
        .from('roster_entries')
        .select('change_description, assigned_name')
        .eq('date', currentDate)
        .eq('shift_type', currentShift);
      
      if (hasIdFormat) {
        // Use ID-based matching (unique identifier)
        const idNumber = staffNameParts[staffNameParts.length - 1];
        console.log('🔍 Using ID-based matching for ID:', idNumber);
        query = query.ilike('assigned_name', `%${idNumber}%`);
      } else {
        // Fallback: No ID format, try to match by full name variants
        const baseStaffName = staffName.replace(/\(R\)$/, '').trim();
        query = query.or(`assigned_name.eq.${staffName},assigned_name.eq.${baseStaffName}`);
      }
      
      const { data: entries, error } = await query;

      if (error) throw error;
      
      console.log('🔍 Found entries for center lookup:', entries);
      console.log('🔍 Total entries found:', entries?.length || 0);
      
      // Extract center names from change_description
      // Read from RIGHT to LEFT - only the LAST action (rightmost) for each center matters
      const centersSet = new Set<string>();
      entries?.forEach((entry: any) => {
        if (entry.change_description) {
          console.log('📋 Parsing change_description:', entry.change_description);
          
          // Parse new format: "[timestamp] Editor: Center Added/Removed: X"
          // Split by | to get individual log entries
          const logEntries = entry.change_description.split('|').map((e: string) => e.trim());
          
          console.log('📝 Split into log entries:', logEntries);
          
          // Track which centers we've already seen (right-to-left, so first occurrence is the latest)
          const processedCenters = new Set<string>();
          
          // Process from RIGHT to LEFT (last entry is most recent)
          for (let i = logEntries.length - 1; i >= 0; i--) {
            const logEntry = logEntries[i];
            const match = logEntry.match(/\[([^\]]+)\]\s+([^:]+):\s+Center (Added|Removed):\s*(.+)/);
            
            if (match) {
              const [, timestamp, editor, action, centerName] = match;
              
              // Strip out "(Original PDF: ...)" suffix if present
              const cleanCenterName = centerName.replace(/\s*\(Original PDF:[^)]+\)\s*$/, '').trim();
              
              console.log(`🔍 Processing (right-to-left): ${action}: ${centerName} at ${timestamp}`);
              console.log(`   Cleaned center name: ${cleanCenterName}`);
              
              // Only process each center once (the first time we see it = most recent action)
              if (!processedCenters.has(cleanCenterName)) {
                processedCenters.add(cleanCenterName);
                
                if (action === 'Added') {
                  centersSet.add(cleanCenterName);
                  console.log(`✅ Added ${cleanCenterName} (most recent action was Add)`);
                } else {
                  console.log(`❌ Skipped ${cleanCenterName} (most recent action was Remove)`);
                }
              }
            } else {
              console.log('⚠️ No match for log entry:', logEntry);
            }
          }
          
          // Fallback: Also check for old format for backwards compatibility (only if no new format found)
          if (processedCenters.size === 0) {
            console.log('⚠️ No new format entries found, checking old format...');
            if (entry.change_description.includes('Center Added:')) {
              const centerMatch = entry.change_description.match(/Center Added:\s*([^;|]+?)(?:\s*-\s*Marker:|\s*\||$)/);
              if (centerMatch && centerMatch[1].trim()) {
                const cleanCenterName = centerMatch[1].trim().replace(/\s*\(Original PDF:[^)]+\)\s*$/, '');
                centersSet.add(cleanCenterName);
              }
            }
            if (entry.change_description.includes('Center Removed:')) {
              const removedMatch = entry.change_description.match(/Center Removed:\s*([^;|]+)/);
              if (removedMatch && removedMatch[1].trim()) {
                const cleanCenterName = removedMatch[1].trim().replace(/\s*\(Original PDF:[^)]+\)\s*$/, '');
                centersSet.delete(cleanCenterName);
              }
            }
          }
        }
      });
      
      const centers = Array.from(centersSet);

      console.log('🎯 Final centers set:', centers);
      setAssignedCenters(centers);
      console.log('✅ Currently assigned centers:', centers);
    } catch (error) {
      console.error('Error fetching assigned centers:', error);
    }
  };

  const handleToggleCenter = async (centerName: string) => {
    if (!staffName || !currentDate || !currentShift) return;
      
    setSaving(true);
    try {
      const isAdding = !assignedCenters.includes(centerName);
        
      // Get current user info for logging
      const session = await getUserSession();
      let editorName = 'Unknown';
      if (session) {
        const { data: userData } = await supabase
          .from('staff_users')
          .select('surname, name')
          .eq('id', session.userId)
          .single();
          
        if (userData) {
          editorName = `${userData.surname}, ${userData.name}`;
        }
      }
        
      // Find the roster entry - use only ONE entry for all center changes
      // Extract ID from staffName if it exists (format: NAME_ID or NAME_ID(R))
      const staffNameParts = staffName.split('_');
      const hasIdFormat = staffNameParts.length > 1;
      
      let query = supabase
        .from('roster_entries')
        .select('id, change_description')
        .eq('date', currentDate)
        .eq('shift_type', currentShift);
      
      if (hasIdFormat) {
        // Use ID-based matching (unique identifier)
        const idNumber = staffNameParts[staffNameParts.length - 1].replace('(R)', '');
        query = query.ilike('assigned_name', `%${idNumber}%`);
      } else {
        // Fallback to full name match (with or without (R))
        query = query.or(`assigned_name.eq.${staffName},assigned_name.eq.${staffName}(R)`);
      }
      
      const { data: entries } = await query
        .order('created_at', { ascending: true })
        .limit(1);
        
      if (!entries || entries.length === 0) {
        alert('No roster entry found for this staff member');
        return;
      }
      
      // Use only the first entry - all center changes go into this single entry
      const entry = entries[0];
      let newChangeDescription = entry.change_description || '';
        
      console.log('📝 Before update - Entry ID:', entry.id);
      console.log('📝 Before update - change_description:', entry.change_description);
      console.log('📝 Action:', isAdding ? 'ADDING' : 'REMOVING', 'center:', centerName);
          
      // Format timestamp as DD-MM-YYYY HH:mm:ss
      const now = new Date();
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const hour = now.getHours().toString().padStart(2, '0');
      const minute = now.getMinutes().toString().padStart(2, '0');
      const second = now.getSeconds().toString().padStart(2, '0');
      const formattedTimestamp = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
          
      // Create a log entry with action, center, timestamp, and editor
      // Use simple format: "Center Added: X" or "Center Removed: X"
      const logEntry = `[${formattedTimestamp}] ${editorName}: Center ${isAdding ? 'Added' : 'Removed'}: ${centerName}`;
      
      // Append the new log entry to existing change_description
      newChangeDescription = newChangeDescription 
        ? `${newChangeDescription} | ${logEntry}`
        : logEntry;
        
      console.log('📝 After update - new change_description:', newChangeDescription);
      console.log('📝 Updating with editorName:', editorName);
          
      const { error: updateError } = await supabase
        .from('roster_entries')
        .update({
          change_description: newChangeDescription || null,
          last_edited_by: editorName,
          last_edited_at: formattedTimestamp
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('❌ Supabase update error:', updateError);
        throw updateError;
      }
      console.log('✅ Successfully updated roster entry in Supabase');
        
      // Update local state immediately to reflect the change
      if (isAdding) {
        setAssignedCenters([...assignedCenters, centerName]);
      } else {
        setAssignedCenters(assignedCenters.filter(c => c !== centerName));
      }
      
      // Notify parent to refresh roster data
      if (onCentersUpdated) {
        onCentersUpdated();
      }
        
      // Call parent handler if provided (for logging)
      // Always use base name (without (R)) for consistency in logs
      const baseStaffNameForLog = staffName.replace(/\(R\)$/, '').trim();
      if (onCenterChange) {
        onCenterChange(baseStaffNameForLog, centerName, isAdding ? 'add' : 'remove', editorName);
      }
        
      console.log(`✅ Successfully ${isAdding ? 'added' : 'removed'} center: ${centerName} for ${baseStaffNameForLog} by ${editorName}`);
    } catch (error) {
      console.error('Error toggling center:', error);
      alert('Failed to update center assignment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[999999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Manage Centers</h3>
              <p className="text-sm text-gray-600">{formatDisplayNameForUI(staffName)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading centers...</div>
          ) : availableCenters.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No centers configured for your institution
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Available Centers:</h4>
              
              {availableCenters.map((center) => {
                const isAssigned = assignedCenters.includes(center.center_name);
                
                return (
                  <div
                    key={center.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                      isAssigned
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                        {center.marker}
                      </span>
                      <span className="font-medium text-gray-900">{center.center_name}</span>
                    </div>
                    
                    <button
                      onClick={() => handleToggleCenter(center.center_name)}
                      disabled={saving}
                      className={`p-2 rounded transition-colors duration-200 ${
                        isAssigned
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isAssigned ? (
                        <Trash2 className="w-5 h-5" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          {assignedCenters.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Currently Assigned To:</h4>
              <div className="space-y-2">
                {(() => {
                  console.log('🎨 RENDERING assignedCenters:', assignedCenters);
                  return assignedCenters.map((centerName) => {
                    // Try to find the marker for this center
                    const centerData = availableCenters.find(c => c.center_name === centerName);
                    
                    return (
                      <div key={centerName} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2 flex-1">
                          {centerData && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {centerData.marker}
                            </span>
                          )}
                          <span className="font-medium text-green-900">{centerData?.center_name || centerName}</span>
                        </div>
                        <button
                          onClick={() => handleToggleCenter(centerName)}
                          disabled={saving}
                          className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Helper function
const formatDisplayNameForUI = (name: string): string => {
  // Simple formatting - remove ID suffix if present
  const parts = name.split('_');
  if (parts.length > 1) {
    return parts[0].replace(/_/g, ' ');
  }
  return name;
};

export default CenterManagementModal;
