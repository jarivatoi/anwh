import React, { useState } from 'react';
import { Calendar, FileText, Grid3X3, Settings } from 'lucide-react';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';
import { useRosterData } from '../hooks/useRosterData';

interface RosterPanelProps {
  setActiveTab: (tab: string) => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({ setActiveTab }) => {
  const [activeView, setActiveView] = useState<'table' | 'card' | 'log'>('table');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { entries, loading, error, refreshEntries } = useRosterData();

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const renderViewContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-600">
          <p>Error loading roster data: {error}</p>
        </div>
      );
    }

    switch (activeView) {
      case 'table':
        return (
          <RosterTableView
            entries={entries}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
            onRefresh={refreshEntries}
          />
        );
      case 'card':
        return (
          <RosterCardView
            entries={entries}
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
            onRefresh={refreshEntries}
          />
        );
      case 'log':
        return (
          <RosterLogView
            entries={entries}
            onRefresh={refreshEntries}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* View Toggle Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('table')}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'table'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Table
          </button>
          <button
            onClick={() => setActiveView('card')}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'card'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Card
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'log'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Log
          </button>
        </div>
        
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </button>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {renderViewContent()}
      </div>
    </div>
  );
};