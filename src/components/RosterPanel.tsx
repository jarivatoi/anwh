import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Upload, Download, FileText, Settings, Users, Clock, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2, Edit3, RotateCcw, Save, X, Filter, Search, Eye, EyeOff, MoreVertical, RefreshCw, List, Grid, BarChart3, FileSpreadsheet, Zap } from 'lucide-react';
import { RosterEntry, RosterChangeLog, RosterFilter, RosterViewMode } from '../types/roster';
import { useRosterData } from '../hooks/useRosterData';
import { rosterApi } from '../utils/rosterApi';
import { PDFImportModal } from './PDFImportModal';
import { EditDetailsModal } from './EditDetailsModal';
import { SpecialDateModal } from './SpecialDateModal';
import { StaffSelectionModal } from './StaffSelectionModal';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';
import { MonthlyReportsModal } from './MonthlyReportsModal';
import { rosterListGenerator } from '../utils/pdf/rosterListGenerator';
import { monthlyReportGenerator } from '../utils/pdf/monthlyReportGenerator';
import { individualBillGenerator } from '../utils/pdf/individualBillGenerator';
import { annexureGenerator } from '../utils/pdf/annexureGenerator';

interface RosterPanelProps {
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
  onOpenCalendarExportModal: () => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({ setActiveTab, onOpenCalendarExportModal }) => {
  // State management
  const [showPDFImportModal, setShowPDFImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSpecialDateModal, setShowSpecialDateModal] = useState(false);
  const [showStaffSelectionModal, setShowStaffSelectionModal] = useState(false);
  const [showMonthlyReportsModal, setShowMonthlyReportsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('');
  const [viewMode, setViewMode] = useState<RosterViewMode>('table');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<RosterFilter>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    shiftType: 'all',
    staffName: '',
    showEditedOnly: false,
    showOriginalOnly: false
  });

  // Data hooks
  const { 
    entries, 
    changeLogs, 
    isLoading, 
    error, 
    refreshData,
    updateEntry,
    deleteEntry,
    addSpecialDate,
    removeSpecialDate
  } = useRosterData();

  // Quick actions ref for click outside
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close quick actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    if (showQuickActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showQuickActions]);

  // Handle PDF import success
  const handlePDFImportSuccess = useCallback(() => {
    console.log('📄 PDF import successful, refreshing data...');
    refreshData();
    setShowPDFImportModal(false);
  }, [refreshData]);

  // Handle entry edit
  const handleEditEntry = useCallback((entry: RosterEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  }, []);

  // Handle entry save
  const handleSaveEntry = useCallback(async (updatedEntry: RosterEntry) => {
    try {
      await updateEntry(updatedEntry);
      setShowEditModal(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  }, [updateEntry]);

  // Handle entry delete
  const handleDeleteEntry = useCallback(async (entryId: string) => {
    try {
      await deleteEntry(entryId);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  }, [deleteEntry]);

  // Handle special date management
  const handleAddSpecialDate = useCallback((date: string, shiftType: string, description: string) => {
    setSelectedDate(date);
    setSelectedShiftType(shiftType);
    setShowSpecialDateModal(true);
  }, []);

  // Handle staff selection
  const handleStaffSelection = useCallback((date: string, shiftType: string) => {
    setSelectedDate(date);
    setSelectedShiftType(shiftType);
    setShowStaffSelectionModal(true);
  }, []);

  // Generate roster list PDF
  const handleGenerateRosterList = useCallback(async () => {
    try {
      setShowQuickActions(false);
      await rosterListGenerator.generateRosterList({
        month: filter.month,
        year: filter.year,
        entries: entries
      });
    } catch (error) {
      console.error('Failed to generate roster list:', error);
      alert('Failed to generate roster list. Please try again.');
    }
  }, [filter.month, filter.year, entries]);

  // Generate monthly report
  const handleGenerateMonthlyReport = useCallback(async () => {
    try {
      setShowQuickActions(false);
      await monthlyReportGenerator.generateMonthlyReport({
        month: filter.month,
        year: filter.year,
        entries: entries
      });
    } catch (error) {
      console.error('Failed to generate monthly report:', error);
      alert('Failed to generate monthly report. Please try again.');
    }
  }, [filter.month, filter.year, entries]);

  // Generate individual bills
  const handleGenerateIndividualBills = useCallback(async () => {
    try {
      setShowQuickActions(false);
      await individualBillGenerator.generateIndividualBills({
        month: filter.month,
        year: filter.year,
        entries: entries
      });
    } catch (error) {
      console.error('Failed to generate individual bills:', error);
      alert('Failed to generate individual bills. Please try again.');
    }
  }, [filter.month, filter.year, entries]);

  // Generate annexure
  const handleGenerateAnnexure = useCallback(async () => {
    try {
      setShowQuickActions(false);
      await annexureGenerator.generateAnnexure({
        month: filter.month,
        year: filter.year,
        entries: entries
      });
    } catch (error) {
      console.error('Failed to generate annexure:', error);
      alert('Failed to generate annexure. Please try again.');
    }
  }, [filter.month, filter.year, entries]);

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter entries based on current filter
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    const entryMonth = entryDate.getMonth();
    const entryYear = entryDate.getFullYear();

    // Month and year filter
    if (entryMonth !== filter.month || entryYear !== filter.year) {
      return false;
    }

    // Shift type filter
    if (filter.shiftType !== 'all' && entry.shift_type !== filter.shiftType) {
      return false;
    }

    // Staff name filter
    if (filter.staffName && !entry.assigned_name.toLowerCase().includes(filter.staffName.toLowerCase())) {
      return false;
    }

    // Show edited only filter
    if (filter.showEditedOnly && !entry.last_edited_by) {
      return false;
    }

    // Show original only filter
    if (filter.showOriginalOnly && entry.last_edited_by) {
      return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading roster data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Roster Management</h1>
              <p className="text-gray-600">Manage staff schedules and generate reports</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              <Zap className="w-4 h-4" />
              <span>Quick Actions</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showQuickActions ? 'rotate-180' : ''}`} />
            </button>
            
            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowPDFImportModal(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors duration-200"
                >
                  <Upload className="w-5 h-5" />
                  <span>Import PDF</span>
                </button>
                
                <button
                  onClick={handleGenerateRosterList}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>Export PDF</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    // Open PDF preview in new tab
                    window.open('/roster-preview.pdf', '_blank');
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium transition-colors duration-200 select-none"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <FileText className="w-5 h-5" />
                  <span className="select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>Preview PDF</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    setShowMonthlyReportsModal(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors duration-200"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Monthly Reports</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    onOpenCalendarExportModal();
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors duration-200"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Export to Calendar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Month/Year Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Month & Year</label>
            <div className="flex space-x-2">
              <select
                value={filter.month}
                onChange={(e) => setFilter(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
              <select
                value={filter.year}
                onChange={(e) => setFilter(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Shift Type</label>
            <select
              value={filter.shiftType}
              onChange={(e) => setFilter(prev => ({ ...prev, shiftType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Shifts</option>
              <option value="Morning Shift (9-4)">Morning Shift (9-4)</option>
              <option value="Evening Shift (4-10)">Evening Shift (4-10)</option>
              <option value="Saturday Regular (12-10)">Saturday Regular (12-10)</option>
              <option value="Night Duty">Night Duty</option>
              <option value="Sunday/Public Holiday/Special">Sunday/Public Holiday/Special</option>
            </select>
          </div>

          {/* Staff Name Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Staff Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={filter.staffName}
                onChange={(e) => setFilter(prev => ({ ...prev, staffName: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* View Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">View Mode</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'card' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Grid className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setViewMode('log')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  viewMode === 'log' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter toggles */}
        <div className="flex items-center space-x-4 mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filter.showEditedOnly}
              onChange={(e) => setFilter(prev => ({ ...prev, showEditedOnly: e.target.checked, showOriginalOnly: false }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show edited only</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filter.showOriginalOnly}
              onChange={(e) => setFilter(prev => ({ ...prev, showOriginalOnly: e.target.checked, showEditedOnly: false }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show original only</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Edited Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredEntries.filter(entry => entry.last_edited_by).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Edit3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(filteredEntries.map(entry => entry.assigned_name)).size}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {viewMode === 'table' && (
          <RosterTableView
            entries={filteredEntries}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onAddSpecialDate={handleAddSpecialDate}
            onStaffSelection={handleStaffSelection}
          />
        )}
        
        {viewMode === 'card' && (
          <RosterCardView
            entries={filteredEntries}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onAddSpecialDate={handleAddSpecialDate}
            onStaffSelection={handleStaffSelection}
          />
        )}
        
        {viewMode === 'log' && (
          <RosterLogView
            changeLogs={changeLogs}
            entries={filteredEntries}
          />
        )}
      </div>

      {/* Modals */}
      <PDFImportModal
        isOpen={showPDFImportModal}
        onClose={() => setShowPDFImportModal(false)}
        onSuccess={handlePDFImportSuccess}
      />

      <EditDetailsModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        entry={selectedEntry}
        onSave={handleSaveEntry}
      />

      <SpecialDateModal
        isOpen={showSpecialDateModal}
        onClose={() => setShowSpecialDateModal(false)}
        date={selectedDate}
        shiftType={selectedShiftType}
        onAddSpecialDate={addSpecialDate}
        onRemoveSpecialDate={removeSpecialDate}
      />

      <StaffSelectionModal
        isOpen={showStaffSelectionModal}
        onClose={() => setShowStaffSelectionModal(false)}
        date={selectedDate}
        shiftType={selectedShiftType}
        entries={entries}
        onUpdateEntry={updateEntry}
      />

      <MonthlyReportsModal
        isOpen={showMonthlyReportsModal}
        onClose={() => setShowMonthlyReportsModal(false)}
        entries={entries}
        currentMonth={filter.month}
        currentYear={filter.year}
      />
    </div>
  );
};