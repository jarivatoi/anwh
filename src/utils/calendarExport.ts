import { RosterEntry } from '../types/roster';
import { validateAuthCode } from './rosterAuth';

export interface CalendarExportOptions {
  staffName: string;
  month: number;
  year: number;
  entries: RosterEntry[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  entriesExported: number;
  errors: string[];
}

/**
 * Calendar Export Manager - Generates iCal files for external calendar import
 */
export class CalendarExportManager {
  
  /**
   * Export staff shifts to iCal format
   */
  async exportToCalendar(options: CalendarExportOptions): Promise<ExportResult> {
    const { staffName, month, year, entries } = options;
    
    console.log('📅 Starting calendar export for:', {
      staffName,
      month: month + 1,
      year,
      totalEntries: entries.length
    });
    
    // Filter entries for the specific staff member and month
    const staffEntries = this.filterEntriesForStaff(entries, staffName, month, year);
    
    if (staffEntries.length === 0) {
      return {
        success: false,
        filename: '',
        entriesExported: 0,
        errors: ['No shifts found for this staff member in the selected month']
      };
    }
    
    // Generate iCal content
    const icalContent = this.generateICalContent(staffEntries, staffName, month, year);
    
    // Create filename
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const filename = `${staffName}_${monthNames[month]}_${year}_Shifts.ics`;
    
    // Download the file
    try {
      await this.downloadICalFile(icalContent, filename);
      
      return {
        success: true,
        filename,
        entriesExported: staffEntries.length,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        filename,
        entriesExported: 0,
        errors: [error instanceof Error ? error.message : 'Failed to download calendar file']
      };
    }
  }
  
  /**
   * Filter roster entries for specific staff member and month
   */
  private filterEntriesForStaff(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): RosterEntry[] {
    return entries.filter(entry => {
      // Check if entry belongs to this staff member (match base names)
      const entryBaseName = entry.assigned_name.replace(/\(R\)$/, '').trim().toUpperCase();
      const staffBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
      
      if (entryBaseName !== staffBaseName) {
        return false;
      }
      
      // Check if entry is in the specified month/year
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    });
  }
  
  /**
   * Generate iCal content from roster entries
   */
  private generateICalContent(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // iCal header
    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//X-ray ANWH//Roster Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${staffName} - ${monthNames[month]} ${year} Shifts`,
      `X-WR-CALDESC:Work shifts for ${staffName} in ${monthNames[month]} ${year}`,
      'X-WR-TIMEZONE:Indian/Mauritius'
    ].join('\r\n');
    
    // Add each shift as an event
    entries.forEach(entry => {
      const event = this.createICalEvent(entry);
      ical += '\r\n' + event;
    });
    
    // iCal footer
    ical += '\r\nEND:VCALENDAR';
    
    return ical;
  }
  
  /**
   * Create individual iCal event from roster entry
   */
  private createICalEvent(entry: RosterEntry): string {
    const date = new Date(entry.date);
    const dateStr = this.formatICalDate(date);
    
    // Get shift times
    const shiftTimes = this.getShiftTimes(entry.shift_type);
    
    // Create start and end datetime
    const startDateTime = this.formatICalDateTime(date, shiftTimes.startHour, shiftTimes.startMinute);
    const endDateTime = this.formatICalDateTime(
      shiftTimes.endHour < shiftTimes.startHour ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : date,
      shiftTimes.endHour,
      shiftTimes.endMinute
    );
    
    // Generate unique ID
    const uid = `${entry.id}@xray-anwh.com`;
    
    // Create timestamp
    const now = new Date();
    const timestamp = this.formatICalDateTime(now);
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${entry.shift_type}`,
      `DESCRIPTION:Work shift: ${entry.shift_type}\\nAssigned to: ${entry.assigned_name}\\nLocation: X-ray Department`,
      `LOCATION:X-ray Department`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      `CATEGORIES:WORK,SHIFT`,
      'END:VEVENT'
    ].join('\r\n');
  }
  
  /**
   * Get start and end times for different shift types
   */
  private getShiftTimes(shiftType: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
    const shiftTimes: Record<string, { startHour: number; startMinute: number; endHour: number; endMinute: number }> = {
      'Morning Shift (9-4)': { startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 },
      'Evening Shift (4-10)': { startHour: 16, startMinute: 0, endHour: 22, endMinute: 0 },
      'Saturday Regular (12-10)': { startHour: 12, startMinute: 0, endHour: 22, endMinute: 0 },
      'Night Duty': { startHour: 22, startMinute: 0, endHour: 9, endMinute: 0 }, // Next day
      'Sunday/Public Holiday/Special': { startHour: 9, startMinute: 0, endHour: 16, endMinute: 0 }
    };
    
    return shiftTimes[shiftType] || { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 };
  }
  
  /**
   * Format date for iCal (YYYYMMDD)
   */
  private formatICalDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  /**
   * Format datetime for iCal (YYYYMMDDTHHMMSS)
   */
  private formatICalDateTime(date: Date, hour?: number, minute?: number): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const h = (hour !== undefined ? hour : date.getHours()).toString().padStart(2, '0');
    const m = (minute !== undefined ? minute : date.getMinutes()).toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}T${h}${m}${s}`;
  }
  
  /**
   * Download iCal file
   */
  private async downloadICalFile(content: string, filename: string): Promise<void> {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    
    // Try Web Share API first (works well on mobile)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: 'text/calendar' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Work Schedule Export',
            text: 'Your work schedule calendar file'
          });
          return;
        }
      } catch (error) {
        console.log('Web Share API failed, using fallback');
      }
    }
    
    // Fallback: Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const calendarExportManager = new CalendarExportManager();