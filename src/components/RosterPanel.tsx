import React from 'react';
import { rosterListGenerator } from '../utils/pdf/rosterListGenerator';

interface RosterPanelProps {
  setActiveTab: (tab: string) => void;
  onOpenCalendarExportModal: () => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({ 
  setActiveTab, 
  onOpenCalendarExportModal 
}) => {
  const handleExportPDF = async () => {
    try {
      // Get current month and year
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      
      // Get roster entries from your data source
      // This would need to be connected to your actual roster data
      const entries = []; // Replace with actual roster entries
      
      await rosterListGenerator.generateRosterList({
        month,
        year,
        entries
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="roster-panel">
      <h2>Roster Panel</h2>
      <button onClick={handleExportPDF}>
        Export to PDF
      </button>
      <button onClick={onOpenCalendarExportModal}>
        Export Calendar
      </button>
    </div>
  );
};