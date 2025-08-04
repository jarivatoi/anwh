import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, FileText, Users, Plus, Upload, Trash2, RotateCcw, Download } from 'lucide-react';
import { useRosterData } from '../hooks/useRosterData';
import { RosterTableView } from './TabNavigation';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';
import { PDFImportModal } from './PDFImportModal';
import { addRosterEntry, clearAllRosterEntries, clearMonthRosterEntries } from '../utils/rosterApi';
import { validateAuthCode, isAdminCode } from '../utils/rosterAuth';
import { RosterFormData, ViewType } from '../types/roster';

interface RosterPanelProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExportToCalendar: () => void;
  setActiveTab: (tab: 'calendar' | 'settings' | 'data' | 'roster') => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({
  selectedDate,
  onDateChange,
  onExportToCalendar,
  setActiveTab
}) => {
  const { entries, loading, error, realtimeStatus, loadEntries } = useRosterData();
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [showPDFImport, setShowPDFImport] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);

  // Handle PDF import
  const handlePDFImport = async (entries: RosterFormData[], editorName: string) => {
    try {
      console.log(`📄 Importing ${entries.length} entries from PDF...`);
      
      for (const entry of entries) {
        await addRosterEntry(entry, editorName);
      }
      
      console.log('✅ PDF import completed successfully');
      alert(`✅ Successfully imported ${entries.length} roster entries from PDF!`);
      
      // Refresh data
      await loadEntries();
    } catch (error) {
      console.error('❌ PDF import failed:', error);
      alert('❌ Failed to import PDF data. Please try again.');
    }
  };

  // Handle admin authentication
  const handleAdminAuth = (authCode: string) => {
    const editorName = validateAuthCode(authCode);
    if (editorName && isAdminCode(authCode)) {
      setIsAdminAuthenticated(true);
      setAdminName(editorName);
      return true;
    }
    return false;
  };

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await loadEntries();
    } catch (error) {
      console.error('Failed to refresh roster data:', error);
    }
  }, [loadEntries]);

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <FileText className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Roster Error</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Roster Management</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Real-time status indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500' :
                realtimeStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-600">
                {realtimeStatus === 'connected' ? 'Live' : 
                 realtimeStatus === 'connecting' ? 'Connecting' :
                 realtimeStatus === 'error' ? 'Error' : 'Offline'}
              </span>
            </div>
            
            {/* PDF Import Button */}
            <button
              onClick={() => setShowPDFImport(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import PDF</span>
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-2">
          {[
            { id: 'table' as const, label: 'Table', icon: FileText },
            { id: 'card' as const, label: 'Cards', icon: Users },
            { id: 'log' as const, label: 'Activity Log', icon: RotateCcw }
          ].map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors duration-200 ${
                activeView === view.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <view.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeView === 'table' && (
        <RosterTableView
          entries={entries}
          loading={loading}
          realtimeStatus={realtimeStatus}
          onRefresh={handleRefresh}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          onExportToCalendar={onExportToCalendar}
          setActiveTab={setActiveTab}
        />
      )}

      {activeView === 'card' && (
        <RosterCardView
          entries={entries}
          loading={loading}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
        />
      )}

      {activeView === 'log' && (
        <RosterLogView
          entries={entries}
          loading={loading}
          selectedDate={selectedDate}
        />
      )}

      {/* PDF Import Modal */}
      <PDFImportModal
        isOpen={showPDFImport}
        onClose={() => setShowPDFImport(false)}
        onImport={handlePDFImport}
        isAdminAuthenticated={isAdminAuthenticated}
        adminName={adminName}
      />
    </div>
  );
};