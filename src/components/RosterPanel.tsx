import React, { useState, useEffect } from 'react';
import { RosterEntry } from '../types/roster';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { PDFImportModal } from './PDFImportModal';
import { CalendarExportModal } from './CalendarExportModal';
import { MonthlyReportsModal } from './MonthlyReportsModal';
import { ClearMonthModal } from './ClearMonthModal';
import { DeleteMonthModal } from './DeleteMonthModal';
import { rosterImageExporter } from '../utils/rosterImageExport';
import { Upload, Calendar, FileText, Trash2, Image, Grid, List } from 'lucide-react';

interface RosterPanelProps {
  entries: RosterEntry[];
  onDataChange: () => void;
}

export function RosterPanel({ entries, onDataChange }: RosterPanelProps) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showPDFImport, setShowPDFImport] = useState(false);
  const [showCalendarExport, setShowCalendarExport] = useState(false);
  const [showMonthlyReports, setShowMonthlyReports] = useState(false);
  const [showClearMonth, setShowClearMonth] = useState(false);
  const [showDeleteMonth, setShowDeleteMonth] = useState(false);

  const handleExportRosterImage = async () => {
    try {
      console.log('🖼️ Starting roster image export...');
      
      // Find the roster table/card container
      const rosterContainer = document.querySelector('[data-roster-container]') as HTMLElement;
      if (!rosterContainer) {
        throw new Error('Unable to find roster container element');
      }

      await rosterImageExporter.exportRosterAsImage(rosterContainer);
      console.log('✅ Roster image export completed successfully');
    } catch (error) {
      console.error('❌ Roster image export failed:', error);
      alert(`Failed to export roster image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Roster Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              {entries.length} entries loaded
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                Cards
              </button>
            </div>

            {/* Action buttons */}
            <button
              onClick={() => setShowPDFImport(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Import PDF
            </button>
            
            <button
              onClick={() => setShowCalendarExport(true)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              Export Calendar
            </button>
            
            <button
              onClick={() => setShowMonthlyReports(true)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Reports
            </button>
            
            <button
              onClick={handleExportRosterImage}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Image className="w-4 h-4" />
              Export Image
            </button>
            
            <button
              onClick={() => setShowClearMonth(true)}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear Month
            </button>
            
            <button
              onClick={() => setShowDeleteMonth(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Month
            </button>
          </div>
        </div>
      </div>

      {/* Roster Content */}
      <div data-roster-container className="bg-white rounded-lg shadow-sm border border-gray-200">
        {viewMode === 'table' ? (
          <RosterTableView entries={entries} onDataChange={onDataChange} />
        ) : (
          <RosterCardView entries={entries} onDataChange={onDataChange} />
        )}
      </div>

      {/* Modals */}
      {showPDFImport && (
        <PDFImportModal
          onClose={() => setShowPDFImport(false)}
          onImportComplete={onDataChange}
        />
      )}

      {showCalendarExport && (
        <CalendarExportModal
          entries={entries}
          onClose={() => setShowCalendarExport(false)}
        />
      )}

      {showMonthlyReports && (
        <MonthlyReportsModal
          entries={entries}
          onClose={() => setShowMonthlyReports(false)}
        />
      )}

      {showClearMonth && (
        <ClearMonthModal
          entries={entries}
          onClose={() => setShowClearMonth(false)}
          onClearComplete={onDataChange}
        />
      )}

      {showDeleteMonth && (
        <DeleteMonthModal
          entries={entries}
          onClose={() => setShowDeleteMonth(false)}
          onDeleteComplete={onDataChange}
        />
      )}
    </div>
  );
}