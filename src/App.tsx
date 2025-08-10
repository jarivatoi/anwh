import React, { useState, useEffect } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { RosterPanel } from './components/RosterPanel';
import { MenuPanel } from './components/MenuPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { RosterLogView } from './components/RosterLogView';
import { useRosterData } from './hooks/useRosterData';
import { updateManager } from './utils/updateManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('roster');
  const { entries, loading, error, refreshData } = useRosterData();

  useEffect(() => {
    // Initialize update manager
    updateManager.initialize();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roster data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading roster data: {error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="p-4">
          {activeTab === 'roster' && (
            <RosterPanel entries={entries} onDataChange={refreshData} />
          )}
          {activeTab === 'menu' && (
            <MenuPanel entries={entries} onDataChange={refreshData} />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel />
          )}
          {activeTab === 'log' && (
            <RosterLogView entries={entries} />
          )}
        </div>
      </div>
    </div>
  );
}