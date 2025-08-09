import React, { useState, useEffect } from 'react';
import { useRosterData } from '../hooks/useRosterData';
import { RosterTableView } from './RosterTableView';
import { RosterCardView } from './RosterCardView';
import { RosterLogView } from './RosterLogView';

interface RosterPanelProps {
  activeView: 'table' | 'card' | 'log';
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExportToCalendar: () => void;
  setActiveTab: (tab: string) => void;
}

export const RosterPanel: React.FC<RosterPanelProps> = ({
  activeView,
  selectedDate,
  onDateChange,
  onExportToCalendar,
  setActiveTab
}) => {
  const {
    entries,
    loading,
    error,
    realtimeStatus,
    onRefresh
  } = useRosterData();

  const renderActiveView = () => {
    switch (activeView) {
      case 'table':
        return (
          <RosterTableView
            entries={entries}
            loading={loading}
            error={error}
            realtimeStatus={realtimeStatus}
            onRefresh={onRefresh}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onExportToCalendar={onExportToCalendar}
            setActiveTab={setActiveTab}
          />
        );
      case 'card':
        return (
          <RosterCardView
            entries={entries}
            loading={loading}
            error={error}
            realtimeStatus={realtimeStatus}
            onRefresh={onRefresh}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onExportToCalendar={onExportToCalendar}
            setActiveTab={setActiveTab}
          />
        );
      case 'log':
        return (
          <RosterLogView
            entries={entries}
            loading={loading}
            error={error}
            realtimeStatus={realtimeStatus}
            onRefresh={onRefresh}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onExportToCalendar={onExportToCalendar}
            setActiveTab={setActiveTab}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="roster-panel">
      {renderActiveView()}
    </div>
  );
};