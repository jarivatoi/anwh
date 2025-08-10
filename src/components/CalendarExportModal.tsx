import React, { useState, useEffect } from 'react';
import { X, Calendar, Download, User, AlertTriangle } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { calendarExportManager } from '../utils/calendarExport';
import { availableNames } from '../utils/rosterAuth';

interface CalendarExportModalProps {
  entries: RosterEntry[];
  onClose: () => void;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  entries,
  onClose
}) => {
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (document.body) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
    }

    return () => {
      if (document.body) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.bottom = '';
      }
    };
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExporting, onClose]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleExport = async () => {
    if (!selectedStaff) {
      setError('Please select a staff member');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const result = await calendarExportManager.exportToCalendar({
        staffName: selectedStaff,
        month: selectedMonth,
        year: selectedYear,
        entries
      });

      if (result.success) {
        alert(`✅ Calendar exported successfully!\n\nFile: ${result.filename}\nEntries: ${result.entriesExported} shifts\n\nImport this file into your calendar app.`);
        onClose();
      } else {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isExporting) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full select-none"
        style={{ 
          userSelect: 'none', 
          WebkitUserSelect: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-200">
          {!isExporting && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
            Export to Calendar
          </h3>
          
          <p className="text-sm text-gray-600 text-center">
            Export shifts to iCal format for calendar apps
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Staff Member
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isExporting}
              >
                <option value="">Choose staff member...</option>
                {availableNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isExporting}
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isExporting}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Preview Info */}
            {selectedStaff && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Export Preview</span>
                </div>
                <p className="text-sm text-green-700">
                  Exporting shifts for <strong>{selectedStaff}</strong> in <strong>{monthNames[selectedMonth]} {selectedYear}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !selectedStaff}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Calendar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};