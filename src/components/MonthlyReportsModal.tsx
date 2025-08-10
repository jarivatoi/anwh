import React, { useState } from 'react';
import { X, FileText, Download, Calendar } from 'lucide-react';
import { RosterEntry } from '../types/roster';
import { monthlyReportGenerator } from '../utils/pdf/monthlyReportGenerator';

interface MonthlyReportsModalProps {
  entries: RosterEntry[];
  onClose: () => void;
}

export const MonthlyReportsModal: React.FC<MonthlyReportsModalProps> = ({
  entries,
  onClose
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await monthlyReportGenerator.generateMonthlyReport({
        month: selectedMonth,
        year: selectedYear,
        entries
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
      alert('Error generating monthly report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get available years from entries
  const availableYears = Array.from(
    new Set(entries.map(entry => new Date(entry.date).getFullYear()))
  ).sort((a, b) => b - a);

  // Count entries for selected month/year
  const monthEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === selectedMonth && entryDate.getFullYear() === selectedYear;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Monthly Reports</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Select Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Report Preview</h3>
            <p className="text-sm text-gray-600">
              <strong>Period:</strong> {monthNames[selectedMonth]} {selectedYear}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Entries:</strong> {monthEntries.length} roster entries
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || monthEntries.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>

          {monthEntries.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                No roster entries found for {monthNames[selectedMonth]} {selectedYear}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};