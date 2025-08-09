import React, { useState, useEffect } from 'react';
import { Server, Download, FileText, Calendar, Users, List, Eye, EyeOff } from 'lucide-react';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';
import { PDFImportModal } from './PDFImportModal';
import { MonthlyReportsModal } from './MonthlyReportsModal';
import { useRosterData } from '../hooks/useRosterData';
import { addRosterEntry } from '../utils/rosterApi';
import { RosterFormData, ViewType } from '../types/roster';
import { validateAuthCode, isAdminCode } from '../utils/rosterAuth';
import { rosterListGenerator } from '../utils/pdf/rosterListGenerator';

interface RosterPanelProps {
  setActiveTab: (tab: string) => void;
  onOpenCalendarExportModal: () => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({ 
  setActiveTab, 
  onOpenCalendarExportModal 
}) => {
  const [activeView, setActiveView] = useState<ViewType>('table');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPDFImportModal, setShowPDFImportModal] = useState(false);
  const [showMonthlyReportsModal, setShowMonthlyReportsModal] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Use the roster data hook
  const { entries, loading, error, realtimeStatus, loadEntries } = useRosterData();

  // Check authentication status
  useEffect(() => {
    if (authCode.length === 4) {
      const name = validateAuthCode(authCode);
      if (name && isAdminCode(authCode)) {
        setIsAuthenticated(true);
        setAdminName(name);
      } else {
        setIsAuthenticated(false);
        setAdminName(null);
      }
    } else {
      setIsAuthenticated(false);
      setAdminName(null);
    }
  }, [authCode]);

  const handlePDFImport = async (entries: RosterFormData[], editorName: string) => {
    try {
      console.log('📄 Importing PDF entries:', entries.length);
      
      for (const entry of entries) {
        await addRosterEntry(entry, editorName);
      }
      
      // Refresh data after import
      await loadEntries();
      
      alert(`✅ Successfully imported ${entries.length} roster entries!`);
    } catch (error) {
      console.error('❌ PDF import failed:', error);
      throw error;
    }
  };

  const handleExportPDF = async () => {
    try {
      // Get current month and year
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      
      await rosterListGenerator.generateRosterList({
        month,
        year,
        entries
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <Server className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Connection Error</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={loadEntries}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '24px',
      paddingTop: '24px'
    }}>
      {/* Header */}
      <div className="flex items-center justify-center space-x-3 mb-6">
        <Server className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900 text-center">Roster Management</h2>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          {/* Export to Calendar */}
          <button
            onClick={onOpenCalendarExportModal}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <Calendar className="w-4 h-4" />
            <span>Export to Calendar</span>
          </button>

          {/* Monthly Reports */}
          <button
            onClick={() => setShowMonthlyReportsModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
          >
            <FileText className="w-4 h-4" />
            <span>Monthly Reports</span>
          </button>
        </div>
      </div>

      {/* Admin Authentication */}
      {!isAuthenticated && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 text-center">Admin Authentication</h3>
          <div className="max-w-md mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authentication Code
            </label>
            <div className="flex justify-center space-x-3 mb-3">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  type={showPassword ? "text" : "password"}
                  value={authCode[index] || ''}
                  onChange={(e) => {
                    const newValue = e.target.value.toUpperCase();
                    if (newValue.length <= 1) {
                      const newCode = authCode.split('');
                      newCode[index] = newValue;
                      setAuthCode(newCode.join(''));
                      
                      // Auto-focus next input
                      if (newValue && index < 3) {
                        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`) as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    }
                  }}
                  data-index={index}
                  className="w-12 h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                  maxLength={1}
                  autoComplete="off"
                />
              ))}
              <button
                type="button"
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-lg ml-2"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-sm text-amber-700 text-center">
              Enter admin code to access roster management features
            </p>
          </div>
        </div>
      )}

      {/* Admin Features */}
      {isAuthenticated && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-center">
            <p className="text-green-700 mb-4">
              ✅ Authenticated as: <strong>{adminName}</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowPDFImportModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                <FileText className="w-4 h-4" />
                <span>Import PDF</span>
              </button>
              <button
                onClick={() => setShowMonthlyReportsModal(true)}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
              >
                <Users className="w-4 h-4" />
                <span>Generate Reports</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
          <button
            onClick={() => setActiveView('table')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeView === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4 inline mr-2" />
            Table
          </button>
          <button
            onClick={() => setActiveView('card')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeView === 'card'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Cards
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              activeView === 'log'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Log
          </button>
        </div>
      </div>

      {/* Roster Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeView === 'table' && (
          <RosterTableView
            entries={entries}
            loading={loading}
            realtimeStatus={realtimeStatus}
            onRefresh={loadEntries}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onExportToCalendar={onOpenCalendarExportModal}
            setActiveTab={setActiveTab}
          />
        )}
        
        {activeView === 'card' && (
          <RosterCardView
            entries={entries}
            loading={loading}
            realtimeStatus={realtimeStatus}
            onRefresh={loadEntries}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        )}
        
        {activeView === 'log' && (
          <RosterLogView
            entries={entries}
            loading={loading}
            selectedDate={selectedDate}
          />
        )}
      </div>

      {/* PDF Import Modal */}
      <PDFImportModal
        isOpen={showPDFImportModal}
        onClose={() => setShowPDFImportModal(false)}
        onImport={handlePDFImport}
        isAdminAuthenticated={isAuthenticated}
        adminName={adminName}
      />

      {/* Monthly Reports Modal */}
      <MonthlyReportsModal
        isOpen={showMonthlyReportsModal}
        onClose={() => setShowMonthlyReportsModal(false)}
        entries={entries}
        basicSalary={35000}
        hourlyRate={201.92}
        shiftCombinations={[
          { id: '9-4', combination: '9-4', hours: 6.5 },
          { id: '4-10', combination: '4-10', hours: 5.5 },
          { id: '12-10', combination: '12-10', hours: 9.5 },
          { id: 'N', combination: 'N', hours: 12.5 }
        ]}
      />
    </div>
  );
};