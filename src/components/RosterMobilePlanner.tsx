import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDisplayNameForUI } from '../utils/rosterDisplayName';

// Simple toast notification
const showToast = (message: string, type: 'error' | 'success' = 'error') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-6 py-3 rounded-lg shadow-xl z-[200] text-white text-base font-medium ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2000);
};

interface RosterMobilePlannerProps {
  onClose: () => void;
  institutionCode: string | null;
}

export const RosterMobilePlanner: React.FC<RosterMobilePlannerProps> = ({ onClose, institutionCode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [staffList, setStaffList] = useState<Array<{ id: string; display_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  
  // Available centers for this institution
  const [availableCenters, setAvailableCenters] = useState<Array<{ marker: string; name: string }>>([]);
  
  // Groups state
  interface StaffGroup {
    id: string;
    name: string;
    members: string[];
    institution_code: string;
  }
  const [groups, setGroups] = useState<StaffGroup[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [showReplacing, setShowReplacing] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<Set<string>>(new Set());
  const [replacingCount, setReplacingCount] = useState<number>(0);
  
  // Selection and drag state
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [rosterAssignments, setRosterAssignments] = useState<Record<string, Array<{ staffName: string; markers: string[] }>>>({});
  const [draggedStaff, setDraggedStaff] = useState<{ name: string; groupMembers?: string[]; replacingMarkers?: string[] } | null>(null);
  const [dragOver, setDragOver] = useState<{ dateKey: string; shiftId: string } | null>(null);
  
  // Unified pointer drag state (works for both mouse and touch)
  const [pointerDragState, setPointerDragState] = useState<{
    isDragging: boolean;
    staffName: string;
    groupMembers?: string[];
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  
  // Staff list swipe state
  const [staffListSwipe, setStaffListSwipe] = useState<{
    isSwiping: boolean;
    startX: number;
    scrollLeft: number;
  } | null>(null);
  const staffListScrollRef = React.useRef<HTMLDivElement>(null);
  
  // Cell assignment long press for marker toggle
  const [cellLongPress, setCellLongPress] = useState<{
    dateKey: string;
    shiftId: string;
    index: number;
    timer: NodeJS.Timeout | null;
  } | null>(null);
  const [showMarkerMenu, setShowMarkerMenu] = useState<{
    visible: boolean;
    dateKey: string;
    shiftId: string;
    index: number;
  } | null>(null);
  
  // Clear roster confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [calendarZoom, setCalendarZoom] = useState<number>(1);
  const [lastTouchDistance, setLastTouchDistance] = useState<number>(0);
  
  // Assignment drag state for moving between cells
  const [assignmentDrag, setAssignmentDrag] = useState<{
    isDragging: boolean;
    staffName: string;
    sourceDateKey: string;
    sourceShiftId: string;
    sourceIndex: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showSettings) {
        setShowSettings(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

  const shifts = [
    { id: 'morning', label: '9hrs\n-\n16hrs', color: 'bg-blue-50' },
    { id: 'evening', label: '16hrs\n-\n22hrs', color: 'bg-orange-50' },
    { id: 'night', label: '22hrs\n-\n9hrs', color: 'bg-purple-50' }
  ];

  const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  // Group management
  const groupExists = (members: string[]) => {
    const sorted = [...members].sort().join(',');
    return groups.some(g => [...g.members].sort().join(',') === sorted);
  };

  const handleAddGroup = async () => {
    if (selectedStaff.size < 2) {
      showToast('Select at least 2 staff', 'error');
      return;
    }
    if (groupExists(Array.from(selectedStaff))) {
      showToast('Group already exists', 'error');
      return;
    }

    let num = 1;
    while (groups.some(g => g.name === `Group ${num}`)) num++;
    const name = groupNameInput.trim() || `Group ${num}`;

    try {
      const { data, error } = await supabase
        .from('staff_groups')
        .insert({ name, members: Array.from(selectedStaff), institution_code: institutionCode })
        .select()
        .single();

      if (error) throw error;
      setGroups(prev => [...prev, data]);
      setShowAddGroupModal(false);
      setGroupNameInput('');
      setSelectedStaff(new Set());
      showToast(`"${data.name}" created`, 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await supabase.from('staff_groups').delete().eq('id', groupId);
      const updated = groups.filter(g => g.id !== groupId);
      const renumbered = await Promise.all(
        updated.map(async (g, i) => {
          const newName = `Group ${i + 1}`;
          if (g.name !== newName) {
            await supabase.from('staff_groups').update({ name: newName }).eq('id', g.id);
            return { ...g, name: newName };
          }
          return g;
        })
      );
      setGroups(renumbered);
      showToast('Group deleted', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const openEditGroup = (group: StaffGroup) => {
    setEditingGroupId(group.id);
    // Filter out (R) entries to get actual staff members
    const staffMembers = group.members.filter(m => m !== '(R)');
    const rCount = group.members.filter(m => m === '(R)').length;
    setSelectedStaffForEdit(new Set(staffMembers));
    setReplacingCount(rCount);
  };

  const saveEditedGroup = async () => {
    if (!editingGroupId || selectedStaffForEdit.size < 2) {
      showToast('Need at least 2 staff', 'error');
      return;
    }
    try {
      // Add (R) placeholders to the members array
      const members = Array.from(selectedStaffForEdit);
      for (let i = 0; i < replacingCount; i++) {
        members.push('(R)');
      }
      
      await supabase
        .from('staff_groups')
        .update({ members })
        .eq('id', editingGroupId);
      setGroups(prev => prev.map(g => 
        g.id === editingGroupId ? { ...g, members } : g
      ));
      setEditingGroupId(null);
      setReplacingCount(0);
      showToast('Group updated', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Long press for selection
  const handleLongPressStart = (staffName: string) => {
    console.log('👆 Long press started on:', staffName);
    
    // Don't start long press if we're already dragging
    if (pointerDragState?.isDragging || assignmentDrag?.isDragging) {
      console.log('❌ Long press blocked - already dragging');
      return;
    }
    
    // Clear any existing timer first
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    const timer = setTimeout(() => {
      console.log('⏰ Timeout callback fired! Checking conditions...');
      console.log('   longPressTimer:', longPressTimer ? 'exists' : 'null');
      console.log('   pointerDragState?.isDragging:', pointerDragState?.isDragging);
      console.log('   assignmentDrag?.isDragging:', assignmentDrag?.isDragging);
      
      // Triple-check: ensure timer still exists and we're not dragging
      if (!longPressTimer || pointerDragState?.isDragging || assignmentDrag?.isDragging) {
        console.log('❌ Long press cancelled - drag detected or timer cleared');
        return;
      }
      
      console.log('✅ All checks passed - toggling selection');
      setSelectedStaff(prev => {
        const newSet = new Set(prev);
        if (newSet.has(staffName)) {
          newSet.delete(staffName);
          console.log('✅ Deselected:', staffName);
        } else {
          newSet.add(staffName);
          console.log('✅ Selected:', staffName);
        }
        return newSet;
      });
    }, 2000);
    
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    console.log('👆 Long press ended');
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      console.log('❌ Long press cancelled (released too early)');
    }
  };

  // Unified pointer drag handlers (works on both mobile and desktop)
  const handlePointerDown = (e: React.PointerEvent, name: string, members?: string[]) => {
    // Only handle primary button (left click) or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    console.log('👆 Pointer down:', name);
    
    const dragInfo = {
      isDragging: false,
      staffName: name,
      groupMembers: members,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      dropTarget: null as { dateKey: string; shiftId: string } | null,
      tapCount: 1,
      lastTapTime: Date.now()
    };
    
    setPointerDragState(dragInfo);
    
    // Capture pointer to track movement outside element
    (e.target as Element).setPointerCapture(e.pointerId);
    
    // Add global listeners for move and up events using native events
    const handleGlobalMove = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - dragInfo.startX);
      const deltaY = Math.abs(e.clientY - dragInfo.startY);
      
      console.log('📍 Global pointer move - deltaX:', deltaX.toFixed(1), 'deltaY:', deltaY.toFixed(1));
      
      // If moved more than 10px, start dragging
      if (!dragInfo.isDragging && (deltaX > 10 || deltaY > 10)) {
        console.log('🎯 Drag started:', dragInfo.staffName);
        dragInfo.isDragging = true;
        
        // Cancel any pending double-tap
        dragInfo.tapCount = 0;
      }
      
      if (dragInfo.isDragging) {
        dragInfo.currentX = e.clientX;
        dragInfo.currentY = e.clientY;
        
        // Update React state for ghost rendering
        setPointerDragState({ ...dragInfo });
        
        // Check what's under the pointer
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('[data-cell]');
        
        if (cell) {
          const dateKey = (cell as HTMLElement).dataset.dateKey || '';
          const shiftId = (cell as HTMLElement).dataset.shiftId || '';
          console.log('✅ Found cell:', dateKey, shiftId);
          dragInfo.dropTarget = { dateKey, shiftId };
          setDragOver({ dateKey, shiftId });
        } else {
          console.log('❌ No cell found under pointer');
          dragInfo.dropTarget = null;
          setDragOver(null);
        }
      }
    };
    
    const handleGlobalUp = (e: PointerEvent) => {
      console.log('👆 Global pointer up - isDragging:', dragInfo.isDragging, 'dropTarget:', dragInfo.dropTarget);
      
      if (dragInfo.isDragging && dragInfo.dropTarget) {
        // Drop the staff
        console.log('📥 Drop at:', dragInfo.dropTarget.dateKey, dragInfo.dropTarget.shiftId);
        if (dragInfo.groupMembers) {
          dragInfo.groupMembers.forEach(m => addStaffToCell(m, dragInfo.dropTarget!.dateKey, dragInfo.dropTarget!.shiftId));
          showToast(`Added ${dragInfo.groupMembers.length} staff`, 'success');
        } else {
          addStaffToCell(dragInfo.staffName, dragInfo.dropTarget.dateKey, dragInfo.dropTarget.shiftId);
        }
      } else if (!dragInfo.isDragging) {
        // Check for double tap
        const currentTime = Date.now();
        const timeDiff = currentTime - dragInfo.lastTapTime;
        
        if (timeDiff < 300 && dragInfo.tapCount === 1) {
          // Double tap detected!
          console.log('👆👆 Double tap detected on:', name);
          setSelectedStaff(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) {
              newSet.delete(name);
              console.log('✅ Deselected:', name);
            } else {
              newSet.add(name);
              console.log('✅ Selected:', name);
            }
            return newSet;
          });
          dragInfo.tapCount = 0;
        } else {
          // First tap
          dragInfo.tapCount = 1;
          dragInfo.lastTapTime = currentTime;
          
          // Reset tap count after 300ms
          setTimeout(() => {
            dragInfo.tapCount = 0;
          }, 300);
        }
      } else {
        console.log('⚠️ Dragging but no drop target');
      }
      
      setPointerDragState(null);
      setDragOver(null);
      
      // Remove global listeners
      document.removeEventListener('pointermove', handleGlobalMove);
      document.removeEventListener('pointerup', handleGlobalUp);
      
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore errors
      }
    };
    
    document.addEventListener('pointermove', handleGlobalMove);
    document.addEventListener('pointerup', handleGlobalUp);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDragState) {
      console.log('⚠️ handlePointerMove called but no pointerDragState');
      return;
    }
    
    const deltaX = Math.abs(e.clientX - pointerDragState.startX);
    const deltaY = Math.abs(e.clientY - pointerDragState.startY);
    
    console.log('📍 Pointer move - deltaX:', deltaX.toFixed(1), 'deltaY:', deltaY.toFixed(1), 'isDragging:', pointerDragState.isDragging);
    
    // If moved more than 10px, start dragging
    if (!pointerDragState.isDragging && (deltaX > 10 || deltaY > 10)) {
      console.log('🎯 Drag started:', pointerDragState.staffName);
      
      // Immediately cancel and nullify long press timer
      if (longPressTimer) {
        console.log('❌ Cancelling long press timer due to drag');
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        console.log('✅ Long press timer cleared and set to null');
      } else {
        console.log('⚠️ No long press timer to cancel');
      }
      
      // Update to dragging state with current position
      setPointerDragState(prev => prev ? {
        ...prev,
        isDragging: true,
        currentX: e.clientX,
        currentY: e.clientY
      } : null);
    } else if (pointerDragState.isDragging) {
      // Update position while dragging
      setPointerDragState(prev => prev ? {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY
      } : null);
    }
    
    // Check what's under the pointer (only when dragging)
    if (pointerDragState.isDragging) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      console.log('🔍 Element under pointer:', el?.tagName, el?.className);
      const cell = el?.closest('[data-cell]');
      
      if (cell) {
        const dateKey = (cell as HTMLElement).dataset.dateKey || '';
        const shiftId = (cell as HTMLElement).dataset.shiftId || '';
        console.log('✅ Found cell:', dateKey, shiftId);
        setDragOver({ dateKey, shiftId });
      } else {
        console.log('❌ No cell found under pointer');
        setDragOver(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    console.log('👆 Pointer up - pointerDragState:', pointerDragState ? 'exists' : 'null', 'dragOver:', dragOver ? `${dragOver.dateKey}-${dragOver.shiftId}` : 'null');
    
    if (!pointerDragState) {
      handleLongPressEnd();
      return;
    }
    
    if (pointerDragState.isDragging && dragOver) {
      // Drop the staff
      console.log('📥 Drop at:', dragOver.dateKey, dragOver.shiftId);
      if (pointerDragState.groupMembers) {
        pointerDragState.groupMembers.forEach(m => addStaffToCell(m, dragOver.dateKey, dragOver.shiftId));
        showToast(`Added ${pointerDragState.groupMembers.length} staff`, 'success');
      } else {
        addStaffToCell(pointerDragState.staffName, dragOver.dateKey, dragOver.shiftId);
      }
    } else if (!pointerDragState.isDragging) {
      // It was a click/tap without movement - cancel long press
      console.log('👆 Quick tap - cancelling long press');
      handleLongPressEnd();
    } else {
      console.log('⚠️ Dragging but no drop target');
    }
    
    setPointerDragState(null);
    setDragOver(null);
    
    // Release pointer capture
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore errors if pointer wasn't captured
    }
  };

  const handlePointerCancel = () => {
    setPointerDragState(null);
    setDragOver(null);
  };

  // Long press on cell assignment to toggle markers (like desktop right-click)
  const handleAssignmentLongPressStart = (dateKey: string, shiftId: string, index: number, staffName: string) => {
    console.log('👆 Assignment long press started:', staffName);
    
    // Clear any existing timer
    if (cellLongPress?.timer) {
      clearTimeout(cellLongPress.timer);
    }
    
    const timer = setTimeout(() => {
      console.log('⏰ Assignment long press triggered! Showing marker menu');
      setShowMarkerMenu({
        visible: true,
        dateKey,
        shiftId,
        index
      });
    }, 1500); // 1.5 seconds for mobile
    
    setCellLongPress({ dateKey, shiftId, index, timer });
  };

  const handleAssignmentLongPressEnd = () => {
    console.log('👆 Assignment long press ended');
    if (cellLongPress?.timer) {
      clearTimeout(cellLongPress.timer);
      setCellLongPress(null);
      console.log('❌ Assignment long press cancelled');
    }
  };

  // Toggle marker on assignment
  const toggleMarker = (marker: string) => {
    if (!showMarkerMenu) return;
    
    const { dateKey, shiftId, index } = showMarkerMenu;
    const key = `${dateKey}-${shiftId}`;
    
    setRosterAssignments(prev => {
      const updated = { ...prev };
      const assignments = updated[key];
      
      if (assignments && assignments[index]) {
        const currentAssignment = assignments[index];
        let newMarkers: string[];
        
        if (currentAssignment.markers.includes(marker)) {
          // Remove marker
          newMarkers = currentAssignment.markers.filter(m => m !== marker);
        } else {
          // Add marker
          newMarkers = [...currentAssignment.markers, marker];
        }
        
        const newAssignments = [...assignments];
        newAssignments[index] = {
          ...currentAssignment,
          markers: newMarkers
        };
        
        updated[key] = newAssignments;
      }
      
      return updated;
    });
    
    setShowMarkerMenu(null);
  };

  // Assignment pointer drag handlers
  const handleAssignmentPointerDown = (e: React.PointerEvent, dateKey: string, shiftId: string, index: number, staffName: string) => {
    // Only handle primary button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    // If already dragging another assignment, ignore this
    if (assignmentDrag?.isDragging) return;
    
    console.log('👆 Assignment pointer down:', staffName);
    
    setAssignmentDrag({
      isDragging: false,
      staffName,
      sourceDateKey: dateKey,
      sourceShiftId: shiftId,
      sourceIndex: index,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY
    });
    
    // Start long press timer
    handleAssignmentLongPressStart(dateKey, shiftId, index, staffName);
    
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleAssignmentPointerMove = (e: React.PointerEvent) => {
    if (!assignmentDrag) return;
    
    const deltaX = Math.abs(e.clientX - assignmentDrag.startX);
    const deltaY = Math.abs(e.clientY - assignmentDrag.startY);
    
    // If moved more than 10px, start dragging
    if (!assignmentDrag.isDragging && (deltaX > 10 || deltaY > 10)) {
      console.log('🎯 Assignment drag started:', assignmentDrag.staffName);
      setAssignmentDrag(prev => prev ? { ...prev, isDragging: true } : null);
      
      // Cancel long press since we're dragging
      console.log('❌ Cancelling assignment long press due to drag');
      handleAssignmentLongPressEnd();
    }
    
    if (assignmentDrag.isDragging) {
      setAssignmentDrag(prev => prev ? {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY
      } : null);
      
      // Check what's under the pointer
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest('[data-cell]');
      
      if (cell) {
        const dateKey = (cell as HTMLElement).dataset.dateKey || '';
        const shiftId = (cell as HTMLElement).dataset.shiftId || '';
        setDragOver({ dateKey, shiftId });
      } else {
        setDragOver(null);
      }
    }
  };

  const handleAssignmentPointerUp = (e: React.PointerEvent) => {
    if (!assignmentDrag) {
      handleAssignmentLongPressEnd();
      return;
    }
    
    // Prevent any default behavior (including scroll)
    e.preventDefault();
    e.stopPropagation();
    
    if (assignmentDrag.isDragging && dragOver) {
      // Move assignment to new cell
      console.log('📥 Assignment drop at:', dragOver.dateKey, dragOver.shiftId);
      
      const sourceKey = `${assignmentDrag.sourceDateKey}-${assignmentDrag.sourceShiftId}`;
      const targetKey = `${dragOver.dateKey}-${dragOver.shiftId}`;
      
      setRosterAssignments(prev => {
        const updated = { ...prev };
        const sourceAssignments = updated[sourceKey];
        
        if (sourceAssignments && sourceAssignments[assignmentDrag.sourceIndex]) {
          // Get the assignment
          const assignment = sourceAssignments[assignmentDrag.sourceIndex];
          
          // Remove from source
          const newSourceAssignments = sourceAssignments.filter((_, idx) => idx !== assignmentDrag.sourceIndex);
          if (newSourceAssignments.length > 0) {
            updated[sourceKey] = newSourceAssignments;
          } else {
            delete updated[sourceKey];
          }
          
          // Add to target
          if (!updated[targetKey]) {
            updated[targetKey] = [];
          }
          updated[targetKey] = [...updated[targetKey], assignment];
        }
        
        return updated;
      });
      
      showToast(`Moved ${assignmentDrag.staffName}`, 'success');
    } else if (!assignmentDrag.isDragging) {
      // It was a tap without movement - cancel long press, do nothing
      // User needs to intentionally hold for 2 seconds
      handleAssignmentLongPressEnd();
    }
    
    setAssignmentDrag(null);
    setDragOver(null);
    
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore errors
    }
  };

  const handleAssignmentPointerCancel = () => {
    setAssignmentDrag(null);
    setDragOver(null);
  };

  // Staff list header swipe handlers
  const handleStaffListHeaderPointerDown = (e: React.PointerEvent) => {
    if (!staffListScrollRef.current) return;
    
    setStaffListSwipe({
      isSwiping: false,
      startX: e.clientX,
      scrollLeft: staffListScrollRef.current.scrollLeft
    });
  };

  const handleStaffListHeaderPointerMove = (e: React.PointerEvent) => {
    if (!staffListSwipe || !staffListScrollRef.current) return;
    
    const deltaX = e.clientX - staffListSwipe.startX;
    
    // If moved more than 5px, start swiping
    if (!staffListSwipe.isSwiping && Math.abs(deltaX) > 5) {
      setStaffListSwipe(prev => prev ? { ...prev, isSwiping: true } : null);
    }
    
    if (staffListSwipe.isSwiping) {
      e.preventDefault();
      staffListScrollRef.current.scrollLeft = staffListSwipe.scrollLeft - deltaX;
    }
  };

  const handleStaffListHeaderPointerUp = () => {
    setStaffListSwipe(null);
  };

  // Desktop HTML5 drag handlers (fallback)
  const handleDragStart = (e: React.DragEvent, name: string, members?: string[]) => {
    console.log('🎯 HTML5 Drag started:', name);
    
    // Cancel any pending long press timer
    if (longPressTimer) {
      console.log('❌ Cancelling long press timer due to HTML5 drag');
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // If dragging a group, extract (R) count and filter them out
    let groupMembers = members;
    let replacingMarkers: string[] = [];
    if (members) {
      const rCount = members.filter(m => m === '(R)').length;
      replacingMarkers = Array(rCount).fill('(R)');
      groupMembers = members.filter(m => m !== '(R)');
    }
    
    setDraggedStaff({ name, groupMembers, replacingMarkers: replacingMarkers.length > 0 ? replacingMarkers : undefined });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', name);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string, shiftId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver({ dateKey, shiftId });
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, dateKey: string, shiftId: string) => {
    e.preventDefault();
    console.log('📥 Drop received at:', dateKey, shiftId);
    
    // Check if this is an assignment drag (cell to cell)
    const dragData = e.dataTransfer.getData('text/plain');
    if (dragData) {
      try {
        const parsed = JSON.parse(dragData);
        if (parsed.type === 'assignment') {
          console.log('🔄 Moving assignment from', parsed.sourceDateKey, parsed.sourceShiftId, 'to', dateKey, shiftId);
          
          // Check for duplicate in target cell
          const targetKey = `${dateKey}-${shiftId}`;
          const targetAssignments = rosterAssignments[targetKey] || [];
          if (targetAssignments.some((a: any) => a.staffName === parsed.staffName)) {
            showToast('Already assigned in this cell', 'error');
            setDraggedStaff(null);
            setDragOver(null);
            return;
          }
          
          // Remove from source
          setRosterAssignments(prev => {
            const updated = { ...prev };
            const sourceKey = `${parsed.sourceDateKey}-${parsed.sourceShiftId}`;
            const sourceAssignments = updated[sourceKey] || [];
            updated[sourceKey] = sourceAssignments.filter((_: any, idx: number) => idx !== parsed.sourceIndex);
            
            // Add to target
            const targetAssignments = updated[targetKey] || [];
            updated[targetKey] = [...targetAssignments, { staffName: parsed.staffName, markers: parsed.markers }];
            
            return updated;
          });
          showToast('Assignment moved', 'success');
          setDraggedStaff(null);
          setDragOver(null);
          return;
        }
      } catch (err) {
        // Not JSON, continue with normal drop
      }
    }
    
    // Normal drop from staff list
    if (draggedStaff) {
      if (draggedStaff.groupMembers) {
        // Add each group member WITHOUT (R) markers
        draggedStaff.groupMembers.forEach(m => {
          addStaffToCell(m, dateKey, shiftId, []);
        });
        
        // Add (R) placeholders as separate entries
        if (draggedStaff.replacingMarkers && draggedStaff.replacingMarkers.length > 0) {
          const key = `${dateKey}-${shiftId}`;
          const rCount = draggedStaff.replacingMarkers.length;
          setRosterAssignments(prev => {
            const existing = prev[key] || [];
            const rPlaceholders = Array(rCount).fill(null).map(() => ({ staffName: '', markers: ['(R)'] }));
            return {
              ...prev,
              [key]: [...existing, ...rPlaceholders]
            };
          });
          const msg = `Added ${draggedStaff.groupMembers.length} staff + ${rCount}(R) placeholder(s)`;
          showToast(msg, 'success');
        } else {
          showToast(`Added ${draggedStaff.groupMembers.length} staff`, 'success');
        }
      } else {
        // Single staff drop - check for empty (R) slots
        const key = `${dateKey}-${shiftId}`;
        const existing = rosterAssignments[key] || [];

        // Check if staff already exists in this cell (with or without (R))
        if (existing.some(a => a.staffName === draggedStaff.name)) {
          showToast('Already assigned', 'error');
          setDraggedStaff(null);
          setDragOver(null);
          return;
        }
        
        const emptyRIndex = existing.findIndex(a => !a.staffName && a.markers.includes('(R)'));
        if (emptyRIndex !== -1) {
          // Fill the empty (R) slot with this staff + (R) marker
          setRosterAssignments(prev => {
            const updated = { ...prev };
            const assignments = [...(updated[key] || [])];
            assignments[emptyRIndex] = { staffName: draggedStaff.name, markers: ['(R)'] };
            updated[key] = assignments;
            return updated;
          });
          showToast(`${draggedStaff.name}(R) assigned to (R) slot`, 'success');
        } else {
          // No empty (R) slot, add normally
          addStaffToCell(draggedStaff.name, dateKey, shiftId);
        }
      }
    }
    
    setDraggedStaff(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    console.log('🏁 Drag ended');
    setDraggedStaff(null);
    setDragOver(null);
  };

  const fetchStaffList = async () => {
    if (!institutionCode) {
      console.warn('⚠️ No institution code provided');
      showToast('No institution code', 'error');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_users')
        .select('id, roster_display_name, surname, name')
        .eq('institution_code', institutionCode)
        .order('surname', { ascending: true });

      if (error) throw error;
      const mappedData = (data || [])
        .map((staff: any) => ({
          id: staff.id,
          display_name: staff.roster_display_name 
            ? formatDisplayNameForUI(staff.roster_display_name)
            : `${staff.surname} ${staff.name}`.toUpperCase(),
          original_name: staff.roster_display_name // Keep original for filtering
        }))
        .filter((staff: { original_name: string }) => {
          // Filter out admin 5274
          const originalName = staff.original_name || '';
          return !(originalName.includes('_5274') || originalName.endsWith('5274'));
        })
        .map(({ id, display_name }: { id: string; display_name: string }) => ({ id, display_name })); // Remove original_name
      
      console.log('✅ Staff loaded:', mappedData.length, 'staff members');
      setStaffList(mappedData);
    } catch (error: any) {
      showToast(error.message || 'Failed to load staff', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!institutionCode) return;
    try {
      const { data, error } = await supabase
        .from('staff_groups')
        .select('*')
        .eq('institution_code', institutionCode)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchAvailableCenters = async () => {
    if (!institutionCode) return;
    try {
      const { data, error } = await supabase
        .from('attached_centers')
        .select('marker, center_name')
        .eq('institution_code', institutionCode)
        .order('marker', { ascending: true });
      
      if (error) throw error;
      setAvailableCenters(data?.map((c: any) => ({ marker: c.marker, name: c.center_name })) || []);
    } catch (error) {
      console.error('Error fetching available centers:', error);
    }
  };

  // Load data on mount and when institution changes
  useEffect(() => {
    fetchStaffList();
    fetchGroups();
    fetchAvailableCenters();
  }, [institutionCode]);

  const addStaffToCell = (staffName: string, dateKey: string, shiftId: string, markers?: string[]) => {
    const key = `${dateKey}-${shiftId}`;
    const existing = rosterAssignments[key] || [];
    if (existing.some(a => a.staffName === staffName)) {
      showToast('Already assigned', 'error');
      return;
    }
    const assignmentMarkers = markers || (showReplacing ? ['(R)'] : []);
    setRosterAssignments(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { staffName, markers: assignmentMarkers }]
    }));
    showToast(`${staffName}${assignmentMarkers.length > 0 ? assignmentMarkers.join('') : ''} added`, 'success');
  };

  const removeAssignment = (dateKey: string, shiftId: string, idx: number) => {
    const key = `${dateKey}-${shiftId}`;
    setRosterAssignments(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        updated[key] = updated[key].filter((_, i) => i !== idx);
        if (updated[key].length === 0) delete updated[key];
      }
      return updated;
    });
  };

  // Print roster to PDF (same weekly format as desktop RosterPlanner)
  const handlePrintRoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print', 'error');
      return;
    }

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Group days by week
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    
    days.forEach((day, index) => {
      currentWeek.push(day);
      
      // Start new week after Saturday or at end of month
      if (day.getDay() === 6 || index === days.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    // Generate HTML for each week
    let weeksHtml = '';
    
    // Shift labels for print (single line format)
    const shiftLabels = {
      morning: '9hrs-16hrs',
      evening: '16hrs-22hrs',
      night: '22hrs-9hrs'
    };
    
    weeks.forEach((week, weekIndex) => {
      // Get week date range for header
      const weekStart = week[0];
      const weekEnd = week[week.length - 1];
      
      // Format dates as DD MM YYYY
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };
      
      const weekHeader = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
      
      weeksHtml += `
        <div style="margin-bottom: 30px;">
          <h2 style="text-align: center; font-size: 14px; margin-bottom: 10px; color: #374151;">${weekHeader}</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
            <thead>
              <tr>
                <th style="width: 80px; background-color: #f3f4f6 !important; border: 1px solid #d1d5db; padding: 3px; font-weight: 600;"></th>
                ${['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((dayName, dayIndex) => {
                  const day = week.find(d => d.getDay() === dayIndex);
                  const dateStr = day ? formatDate(day) : '';
                  return `<th style="background-color: #f3f4f6 !important; border: 1px solid #d1d5db; padding: 3px; text-align: center; font-size: 7px;">
                    ${dayName}<br>${dateStr}
                  </th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${shifts.map(shift => `
                <tr>
                  <td style="background-color: #f3f4f6 !important; border: 1px solid #d1d5db; padding: 3px; font-weight: bold; text-align: center; vertical-align: middle; width: 80px; font-size: 7px;">
                    ${shiftLabels[shift.id as keyof typeof shiftLabels]}
                  </td>
                  ${[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                    const day = week.find(d => d.getDay() === dayIndex);
                    if (!day) {
                      return '<td style="border: 1px solid #d1d5db; padding: 3px;"></td>';
                    }
                    
                    const dateKey = formatDateKey(day);
                    const key = `${dateKey}-${shift.id}`;
                    const assignments = rosterAssignments[key] || [];
                    
                    const cellContent = assignments.map((assignment: any) => {
                      const markersPrefix = assignment.markers && assignment.markers.length > 0 
                        ? assignment.markers.filter((m: string) => m !== '(R)').join('')
                        : '';
                      const hasReplacing = assignment.markers && assignment.markers.includes('(R)');
                      const replacingSuffix = hasReplacing ? ' (R)' : '';
                      
                      return `<div style="background-color: white; padding: 2px 4px; margin-bottom: 2px; border-radius: 2px; font-size: 8px; line-height: 1.2;">
                        ${markersPrefix ? `<span style="color: black; font-weight: bold;">${markersPrefix}</span>` : ''}${assignment.staffName}${replacingSuffix ? `<span style="color: black; font-weight: 600;">${replacingSuffix}</span>` : ''}
                      </div>`;
                    }).join('');
                    
                    const bgColor = shift.id === 'morning' ? '#eff6ff' : shift.id === 'evening' ? '#fff7ed' : '#faf5ff';
                    
                    return `<td style="border: 1px solid #d1d5db; padding: 3px; vertical-align: top; background-color: ${bgColor} !important;">
                      ${cellContent}
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    });
    
    // Build complete HTML for printing
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Roster Planner - ${monthName}</title>
        <style>
          @media print {
            @page {
              size: landscape;
              margin: 10mm;
            }
            
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
          }
          
          h1 {
            text-align: center;
            font-size: 18px;
            margin-bottom: 20px;
            color: #1f2937;
          }
        </style>
      </head>
      <body>
        <h1>Roster Planner - ${monthName}</h1>
        ${weeksHtml}
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      
      // Close the print window after print dialog is dismissed
      // This works for both "Print" and "Cancel" actions
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 1000);
    }, 250);
    
    showToast('Print dialog opened', 'success');
  };

  // Save roster to Supabase
  const handleSaveRoster = async () => {
    if (!institutionCode) {
      showToast('No institution code found', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare roster data
      const rosterData = Object.entries(rosterAssignments).map(([key, assignments]) => {
        // Key format: "YYYY-MM-DD-shiftId" - need to extract date and shift correctly
        const lastHyphenIndex = key.lastIndexOf('-');
        const dateKey = key.substring(0, lastHyphenIndex);
        const shiftId = key.substring(lastHyphenIndex + 1);
        
        return assignments.map((assignment: any) => ({
          institution_code: institutionCode,
          date: dateKey,
          shift_id: shiftId,
          staff_name: assignment.staffName,
          markers: assignment.markers,
          created_at: new Date().toISOString()
        }));
      }).flat();

      if (rosterData.length === 0) {
        showToast('No roster data to save', 'error');
        return;
      }

      // Delete existing roster for this institution and month
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      await supabase
        .from('roster_assignments')
        .delete()
        .eq('institution_code', institutionCode)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      // Insert new roster data
      const { error } = await supabase
        .from('roster_assignments')
        .insert(rosterData);

      if (error) throw error;

      showToast(`Saved ${rosterData.length} assignments`, 'success');
    } catch (error: any) {
      console.error('Error saving roster:', error);
      showToast(error.message || 'Failed to save roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Import roster from Supabase
  const handleImportRoster = async () => {
    if (!institutionCode) {
      showToast('No institution code found', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Get current month range
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // Fetch roster from Supabase
      const { data, error } = await supabase
        .from('roster_assignments')
        .select('*')
        .eq('institution_code', institutionCode)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast('No roster data found for this month', 'error');
        return;
      }

      // Convert to roster assignments format
      const newAssignments: Record<string, Array<{ staffName: string; markers: string[] }>> = {};
      
      data.forEach((item: any) => {
        const key = `${item.date}-${item.shift_id}`;
        if (!newAssignments[key]) {
          newAssignments[key] = [];
        }
        
        newAssignments[key].push({
          staffName: item.staff_name,
          markers: item.markers || []
        });
      });

      setRosterAssignments(newAssignments);
      showToast(`Imported ${data.length} assignments from database`, 'success');
    } catch (error: any) {
      console.error('Error importing roster:', error);
      showToast(error.message || 'Failed to import roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show clear roster confirmation modal
  const handleClearRoster = () => {
    if (!institutionCode) {
      showToast('No institution code found', 'error');
      return;
    }
    
    setShowClearConfirm(true);
  };

  // Execute clear roster after confirmation
  const executeClearRoster = async () => {
    try {
      setLoading(true);
      setShowClearConfirm(false);
      
      // Get current month range
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // Clear roster assignments from planner
      setRosterAssignments({});
      
      // Also clear from Supabase
      await supabase
        .from('roster_assignments')
        .delete()
        .eq('institution_code', institutionCode)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      showToast(`Cleared roster for ${monthName}`, 'success');
    } catch (error: any) {
      console.error('Error clearing roster:', error);
      showToast(error.message || 'Failed to clear roster', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel clear roster
  const cancelClearRoster = () => {
    setShowClearConfirm(false);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="roster-mobile-container fixed inset-0 bg-white z-50 flex flex-col select-none"
        style={{ touchAction: 'manipulation', WebkitOverflowScrolling: 'touch' }}>

<style>{`
  .overflow-x-auto, .overflow-y-auto {
    -webkit-overflow-scrolling: touch !important;
    scroll-behavior: smooth;
  }
  
  .overscroll-contain {
    overscroll-behavior: contain !important;
  }
  
  table {
    touch-action: pan-x pan-y !important;
  }
  
  /* Custom scrollbar for better visibility */
  .overflow-x-auto::-webkit-scrollbar {
    height: 8px;
  }
  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;
  }
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;
  }
`}</style>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {/* Month Selector - Centered */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">Roster Planner - {monthName}</h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Settings and Close Buttons */}
        <div className="relative flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        
        </div>
        {/* Settings Dropdown Menu */}
        {showSettings && (
          <div 
            className="absolute right-0 top-14 bg-white border rounded-lg shadow-lg py-2 z-[60] min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                handlePrintRoster();
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>🖨️</span>
              <span>Print Roster</span>
            </button>
            
            <button
              onClick={() => {
                handleSaveRoster();
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Roster</span>
            </button>
            
            <button
              onClick={() => {
                handleImportRoster();
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <span>📥</span>
              <span>Import Roster</span>
            </button>
            
            <button
              onClick={() => {
                handleClearRoster();
                setShowSettings(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <span>🗑️</span>
              <span>Clear Roster</span>
            </button>
          </div>
        )}
      </div>

      {/* Calendar - Separate scrollable container */}
      <div 
        className="flex-1 overflow-auto cursor-grab active:cursor-grabbing"
        style={{ WebkitOverflowScrolling: 'touch', position: 'relative', touchAction: 'pan-x pan-y pinch-zoom' }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
              Math.pow(touch2.clientX - touch1.clientX, 2) +
              Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            setLastTouchDistance(distance);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
              Math.pow(touch2.clientX - touch1.clientX, 2) +
              Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            if (lastTouchDistance > 0) {
              const scale = distance / lastTouchDistance;
              setCalendarZoom(prev => {
                const newZoom = prev * scale;
                return Math.min(Math.max(newZoom, 0.5), 2);
              });
            }
            setLastTouchDistance(distance);
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) {
            setLastTouchDistance(0);
          }
        }}
        onMouseDown={(e) => {
          // Don't start calendar scroll if we're dragging a staff or assignment
          if (pointerDragState || assignmentDrag) {
            console.log('⚠️ Skipping calendar scroll - drag in progress');
            return;
          }
          
          const el = e.currentTarget;
          const startX = e.pageX - el.offsetLeft;
          const startY = e.pageY - el.offsetTop;
          const scrollLeft = el.scrollLeft;
          const scrollTop = el.scrollTop;
          
          const handleMouseMove = (e: MouseEvent) => {
            const x = e.pageX - el.offsetLeft;
            const y = e.pageY - el.offsetTop;
            const walkX = (x - startX) * 2; // Scroll speed
            const walkY = (y - startY) * 2;
            el.scrollLeft = scrollLeft - walkX;
            el.scrollTop = scrollTop - walkY;
          };
          
          const handleMouseUp = () => {
            el.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('mouseup', handleMouseUp);
          };
          
          el.addEventListener('mousemove', handleMouseMove);
          el.addEventListener('mouseup', handleMouseUp);
        }}>
      
        <div style={{ transform: `scale(${calendarZoom})`, transformOrigin: 'top left', transition: 'transform 0.1s ease', width: `${100 / calendarZoom}%`, minWidth: `${100 / calendarZoom}%` }}>
        <table className="w-full text-xs min-w-max">
          <thead className="sticky top-0 bg-gray-100 z-40 shadow-md">
            <tr>
              <th className="border p-1 bg-gray-200 w-16 sticky left-0 z-50">Shift</th>
              {days.map(day => {
                const dayName = day.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                const dayNum = String(day.getDate()).padStart(2, '0');
                const monthNum = String(day.getMonth() + 1).padStart(2, '0');
                const yearNum = String(day.getFullYear());
                return (
                  <th key={day.toISOString()} className="border p-1 bg-gray-100 min-w-[70px] whitespace-nowrap">
                    <div className="text-[10px] font-bold">{dayName}</div>
                    <div className="text-[9px]">{dayNum} {monthNum} {yearNum}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shifts.map(shift => (
              <tr key={shift.id}>
                <td 
                  className="border p-2 bg-gray-100 font-bold sticky left-0 z-30 text-xs min-w-[70px] shadow-lg"
                  style={{ backgroundColor: '#f3f4f6' }}>
                  <div className="flex flex-col items-center leading-tight">
                    {shift.label.split('\n').map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
                  </div>
                </td>
                {days.map(day => {
                  const dateKey = formatDateKey(day);
                  const key = `${dateKey}-${shift.id}`;
                  const assignments = rosterAssignments[key] || [];
                  return (
                    <td
                      key={key}
                      data-cell="true"
                      data-date-key={dateKey}
                      data-shift-id={shift.id}
                      onDragOver={(e) => handleDragOver(e, dateKey, shift.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey, shift.id)}
                      className={`${shift.color} border p-1 min-h-[80px] align-top`}
                    >
                      {assignments.length === 0 ? (
                        <div className="text-gray-400 text-[10px] text-center py-2">Drop</div>
                      ) : (
                        assignments.map((a, idx) => {
                          const isPlaceholder = !a.staffName && a.markers.includes('(R)');
                          return (
                          <div 
                            key={idx} 
                            draggable={!isPlaceholder}
                            onDragStart={!isPlaceholder ? (e) => {
                              console.log('🎯 Assignment drag started:', a.staffName, 'from', dateKey, shift.id);
                              e.dataTransfer.setData('text/plain', JSON.stringify({
                                type: 'assignment',
                                staffName: a.staffName,
                                markers: a.markers,
                                sourceDateKey: dateKey,
                                sourceShiftId: shift.id,
                                sourceIndex: idx
                              }));
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggedStaff({ name: a.staffName });
                            } : undefined}
                            onDragEnd={!isPlaceholder ? () => { setDraggedStaff(null); setDragOver(null); } : undefined}
                            className={`text-[10px] px-1 py-0.5 mb-1 rounded relative cursor-move select-none pr-4 ${
                              isPlaceholder ? 'bg-purple-50 border border-purple-300 text-purple-700 font-semibold' : 'bg-white'
                            }`}
                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                            onPointerDown={(e) => !isPlaceholder && handleAssignmentPointerDown(e, dateKey, shift.id, idx, a.staffName)}
                            onPointerMove={!isPlaceholder ? handleAssignmentPointerMove : undefined}
                            onPointerUp={!isPlaceholder ? handleAssignmentPointerUp : undefined}
                            onPointerCancel={!isPlaceholder ? handleAssignmentPointerCancel : undefined}>
                            <span>
                              {isPlaceholder ? (
                                <span className="text-purple-600">(R)</span>
                              ) : (
                                <>
                                  {a.markers.filter(m => m !== '(R)').map((m, i) => <span key={i} className="font-bold">{m}</span>)}
                                  {a.staffName}
                                  {a.markers.includes('(R)') && <span className="font-semibold">(R)</span>}
                                </>
                              )}
                            </span>
                            {!isPlaceholder && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Cancel any pending long press
                                  if (cellLongPress?.timer) {
                                    clearTimeout(cellLongPress.timer);
                                    setCellLongPress(null);
                                  }
                                  removeAssignment(dateKey, shift.id, idx);
                                }} 
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  // Cancel any pending long press
                                  if (cellLongPress?.timer) {
                                    clearTimeout(cellLongPress.timer);
                                    setCellLongPress(null);
                                  }
                                }}
                                className="absolute right-0.5 top-0 text-red-500 font-bold px-1 z-10"
                                style={{ lineHeight: '1' }}>
                                ×
                              </button>
                            )}
                          </div>
                        );
                        })
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>
      {/* Staff List Panel - Separate scrollable container */}
      <div className="bg-gray-50 border-t flex flex-col" style={{ maxHeight: '40vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b">
          <div className="text-xs text-gray-600 font-medium">
            {showGroups 
              ? 'Staff Groups' 
              : showReplacing 
                ? `Available Staff (R)` 
                : 'Available Staff'} ({showGroups ? groups.length : staffList.length})
          </div>
          <button 
            onClick={() => {
              if (!showGroups && !showReplacing) {
                // INDIVIDUAL -> REPLACING
                setShowReplacing(true);
              } else if (!showGroups && showReplacing) {
                // REPLACING -> GROUP
                setShowReplacing(false);
                setShowGroups(true);
              } else {
                // GROUP -> INDIVIDUAL
                setShowGroups(false);
              }
            }}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
          >
            {!showGroups && !showReplacing ? 'INDIVIDUAL' : !showGroups && showReplacing ? 'REPLACING' : 'GROUPS'}
          </button>
        </div>
        
        {/* Scrollable staff list area */}
        <div 
          ref={staffListScrollRef}
          className="overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onMouseDown={(e) => {
            const el = e.currentTarget;
            const startX = e.pageX - el.offsetLeft;
            const scrollLeft = el.scrollLeft;
            
            const handleMouseMove = (e: MouseEvent) => {
              const x = e.pageX - el.offsetLeft;
              const walkX = (x - startX) * 2; // Scroll speed
              el.scrollLeft = scrollLeft - walkX;
            };
            
            const handleMouseUp = () => {
              el.removeEventListener('mousemove', handleMouseMove);
              el.removeEventListener('mouseup', handleMouseUp);
            };
            
            el.addEventListener('mousemove', handleMouseMove);
            el.addEventListener('mouseup', handleMouseUp);
          }}>
          <div className="flex gap-2 p-2 min-w-max">
            {showGroups ? (
              groups.map(group => (
                <div key={group.id} 
                  className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg px-2 py-2 min-w-[120px] cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, group.name, group.members)}
                  onDragEnd={() => { setDraggedStaff(null); setDragOver(null); }}
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                  }}>
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-purple-900 text-xs">{group.name}</div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditGroup(group)} className="text-blue-500 text-sm">✏️</button>
                      <button onClick={() => { if (confirm(`Delete ${group.name}?`)) handleDeleteGroup(group.id); }} className="text-red-500 text-lg font-bold">×</button>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-700 mt-1">
                    {group.members.filter(m => m !== '(R)').map((m, i) => <div key={i}>• {m}</div>)}
                    {group.members.filter(m => m === '(R)').map((m, i) => <div key={`r-${i}`} className="text-purple-600 font-semibold">{m}</div>)}
                  </div>
                </div>
              ))
            ) : (
              staffList.map(staff => {
                const isSelected = selectedStaff.has(staff.display_name);
                // Apply formatDisplayNameForUI to strip ID and handle admin 5274
                const displayName = showReplacing 
                  ? `${formatDisplayNameForUI(staff.display_name)}(R)` 
                  : formatDisplayNameForUI(staff.display_name);
                return (
                  <div key={staff.id}
                    draggable={!isSelected}
                    onDragStart={(e) => {
                      console.log('🎯 HTML5 Drag started:', staff.display_name);
                      if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        setLongPressTimer(null);
                      }
                      handleDragStart(e, staff.display_name);
                    }}
                    onDragEnd={() => { setDraggedStaff(null); setDragOver(null); }}
                    onPointerDown={(e) => {
                      console.log('👆 Pointer down on:', staff.display_name, '- Selected:', isSelected);
                      handlePointerDown(e, staff.display_name);
                    }}
                    className={`px-3 py-2 rounded border text-sm whitespace-nowrap cursor-move select-none ${isSelected ? 'bg-green-50 border-green-400' : showReplacing ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-white border-gray-200'}`}
                    style={{ 
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      textOverflow: 'clip',
                      overflow: 'visible',
                      outline: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}>
                    {displayName}{isSelected && <span className="ml-1 text-green-600">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Add Group button - outside scroll area */}
        {!showGroups && selectedStaff.size >= 2 && !groupExists(Array.from(selectedStaff)) && (
          <div className="p-2 border-t">
            <button onClick={() => setShowAddGroupModal(true)} className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm">
              + Add Group ({selectedStaff.size})
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="font-bold mb-3">Create Group</h3>
            <div className="mb-3 max-h-32 overflow-y-auto">{Array.from(selectedStaff).map((n, i) => <div key={i} className="text-sm py-1">• {n}</div>)}</div>
            <input type="text" value={groupNameInput} onChange={(e) => setGroupNameInput(e.target.value)} placeholder="Name (optional)" className="w-full px-3 py-2 border rounded mb-3" />
            <div className="flex gap-2">
              <button onClick={() => { setShowAddGroupModal(false); setGroupNameInput(''); }} className="flex-1 px-3 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleAddGroup} className="flex-1 px-3 py-2 bg-green-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Marker Toggle Menu - Long press on assignment */}
      {showMarkerMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]" onClick={() => setShowMarkerMenu(null)}>
          <div className="bg-white rounded-lg p-4 max-w-xs w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3 text-gray-800">Toggle Markers</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {/* Clear all markers */}
              <button 
                onClick={() => {
                  if (!showMarkerMenu) return;
                  const { dateKey, shiftId, index } = showMarkerMenu;
                  const key = `${dateKey}-${shiftId}`;
                  
                  setRosterAssignments(prev => {
                    const updated = { ...prev };
                    const assignments = updated[key];
                    
                    if (assignments && assignments[index]) {
                      const newAssignments = [...assignments];
                      newAssignments[index] = {
                        ...assignments[index],
                        markers: []
                      };
                      updated[key] = newAssignments;
                    }
                    
                    return updated;
                  });
                  
                  setShowMarkerMenu(null);
                }}
                className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 rounded border border-red-200 text-left text-sm">
                Clear All Markers
              </button>
              
              {/* (R) variant - Replacing - toggle */}
              <button 
                onClick={() => toggleMarker('(R)')}
                className="w-full px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 text-left text-sm">
                <span className="font-semibold">(R)</span> - Replacing
              </button>

              {/* Center markers - toggle */}
              {availableCenters.map(center => (
                <button
                  key={center.marker}
                  onClick={() => toggleMarker(center.marker)}
                  className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 text-left text-sm"
                >
                  <span className="font-bold">{center.marker}</span> - {center.name}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowMarkerMenu(null)}
              className="mt-3 w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm max-h-[80vh] flex flex-col">
            <h3 className="font-bold mb-3">Edit Group</h3>
            <div className="flex-1 overflow-y-auto mb-3">
              {staffList.map(staff => {
                const sel = selectedStaffForEdit.has(staff.display_name);
                return (
                  <button key={staff.id} onClick={() => setSelectedStaffForEdit(prev => { const s = new Set(prev); sel ? s.delete(staff.display_name) : s.add(staff.display_name); return s; })}
                    className={`w-full text-left px-3 py-2 rounded border text-sm mb-1 ${sel ? 'bg-purple-100 border-purple-400' : 'bg-white'}`}>
                    {sel && <span className="mr-2">✓</span>}{staff.display_name}
                  </button>
                );
              })}
              
              {/* (R) Replacing section */}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600 font-medium mb-2">Replacing (R)</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setReplacingCount(prev => Math.max(0, prev - 1))}
                    className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-xl flex items-center justify-center">
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold text-purple-700">{replacingCount}</div>
                    <div className="text-xs text-gray-500">{replacingCount === 1 ? 'replacer' : 'replacers'}</div>
                  </div>
                  <button 
                    onClick={() => setReplacingCount(prev => prev + 1)}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xl flex items-center justify-center">
                    +
                  </button>
                </div>
                {replacingCount > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    {Array.from({ length: replacingCount }, (_, i) => (
                      <div key={i} className="text-purple-600 font-semibold">(R)</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingGroupId(null); setReplacingCount(0); }} className="flex-1 px-3 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={saveEditedGroup} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Roster Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">⚠️ Confirm Clear Roster</h3>
              
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2">
                  Are you sure you want to clear <span className="font-semibold text-red-600">ALL</span> roster assignments for:
                </p>
                <p className="text-lg font-bold text-center text-gray-900 bg-red-50 p-3 rounded-lg border border-red-200">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500 mt-3 text-center">This action cannot be undone.</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelClearRoster}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeClearRoster}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Yes, Clear Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
