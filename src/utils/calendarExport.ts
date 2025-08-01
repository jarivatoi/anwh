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
  message: string;
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
        message: 'No shifts found for export',
        entriesExported: 0,
        errors: ['No shifts found for this staff member in the selected month']
      };
    }
    
    // Export directly to calendar
    try {
      await this.exportDirectlyToCalendar(staffEntries, staffName, month, year);
      
      return {
        success: true,
        message: 'Successfully exported to your calendar',
        entriesExported: staffEntries.length,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to export to calendar',
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
   * Export directly to calendar applications
   */
  private async exportDirectlyToCalendar(
    entries: RosterEntry[], 
    staffName: string, 
    month: number, 
    year: number
  ): Promise<void> {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Try multiple direct calendar integration methods
    
    // Method 1: Try Calendar API (if available)
    if (await this.tryCalendarAPI(entries, staffName, month, year)) {
      return;
    }
    
    // Method 2: Try native calendar integration
    if (await this.tryNativeCalendarIntegration(entries, staffName, month, year)) {
      return;
    }
    
    // Method 3: Try Web Share API with calendar intent
    if (await this.tryWebShareCalendar(entries, staffName, month, year)) {
      return;
    }
    
    // Method 4: Try direct calendar URL schemes
    if (await this.tryCalendarURLSchemes(entries, staffName, month, year)) {
      return;
    }
    
    // Fallback: Show instructions for manual import
    throw new Error('Direct calendar integration not available. Please use your calendar app\'s import feature.');
  }
  
  /**
   * Try Calendar API integration (Google Calendar, Outlook, etc.)
   */
  private async tryCalendarAPI(entries: RosterEntry[], staffName: string, month: number, year: number): Promise<boolean> {
    try {
      // Check if Google Calendar API is available
      if ((window as any).gapi && (window as any).gapi.client && (window as any).gapi.client.calendar) {
        console.log('📅 Using Google Calendar API');
        
        for (const entry of entries) {
          const shiftTimes = this.getShiftTimes(entry.shift_type);
          const date = new Date(entry.date);
          
          const startDateTime = new Date(date);
          startDateTime.setHours(shiftTimes.startHour, shiftTimes.startMinute);
          
          const endDateTime = new Date(date);
          if (shiftTimes.endHour < shiftTimes.startHour) {
            endDateTime.setDate(endDateTime.getDate() + 1);
          }
          endDateTime.setHours(shiftTimes.endHour, shiftTimes.endMinute);
          
          const event = {
            summary: `${entry.shift_type} - X-ray Department`,
            description: `Work shift: ${entry.shift_type}\nAssigned to: ${entry.assigned_name}\nLocation: X-ray Department`,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'Indian/Mauritius'
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'Indian/Mauritius'
            },
            location: 'X-ray Department'
          };
          
          await (window as any).gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
          });
        }
        
        return true;
      }
    } catch (error) {
      console.log('❌ Google Calendar API failed:', error);
    }
    
    return false;
  }
  
  /**
   * Try native calendar integration (iOS/Android)
   */
  private async tryNativeCalendarIntegration(entries: RosterEntry[], staffName: string, month: number, year: number): Promise<boolean> {
    try {
      // Check if we're in a mobile app with calendar access
      if ((window as any).DeviceCalendarPlugin || (navigator as any).calendar) {
        console.log('📅 Using native calendar integration');
        
        const calendarPlugin = (window as any).DeviceCalendarPlugin || (navigator as any).calendar;
        
        for (const entry of entries) {
          const shiftTimes = this.getShiftTimes(entry.shift_type);
          const date = new Date(entry.date);
          
          const startDateTime = new Date(date);
          startDateTime.setHours(shiftTimes.startHour, shiftTimes.startMinute);
          
          const endDateTime = new Date(date);
          if (shiftTimes.endHour < shiftTimes.startHour) {
            endDateTime.setDate(endDateTime.getDate() + 1);
          }
          endDateTime.setHours(shiftTimes.endHour, shiftTimes.endMinute);
          
          await calendarPlugin.createEvent({
            title: `${entry.shift_type} - X-ray Department`,
            notes: `Work shift: ${entry.shift_type}\nAssigned to: ${entry.assigned_name}`,
            startDate: startDateTime,
            endDate: endDateTime,
            location: 'X-ray Department'
          });
        }
        
        return true;
      }
    } catch (error) {
      console.log('❌ Native calendar integration failed:', error);
    }
    
    return false;
  }
  
  /**
   * Try Web Share API with calendar intent
   */
  private async tryWebShareCalendar(entries: RosterEntry[], staffName: string, month: number, year: number): Promise<boolean> {
    try {
      if (navigator.share) {
        console.log('📅 Using Web Share API for calendar');
        
        // Create calendar events as text that can be shared to calendar apps
        const eventsText = entries.map(entry => {
          const shiftTimes = this.getShiftTimes(entry.shift_type);
          const date = new Date(entry.date);
          
          const startTime = `${shiftTimes.startHour.toString().padStart(2, '0')}:${shiftTimes.startMinute.toString().padStart(2, '0')}`;
          const endTime = `${shiftTimes.endHour.toString().padStart(2, '0')}:${shiftTimes.endMinute.toString().padStart(2, '0')}`;
          
          return `${date.toLocaleDateString()} ${startTime}-${endTime}: ${entry.shift_type}`;
        }).join('\n');
        
        await navigator.share({
          title: `${staffName} Work Schedule`,
          text: `Work Schedule for ${staffName}:\n\n${eventsText}`,
        });
        
        return true;
      }
    } catch (error) {
      console.log('❌ Web Share API failed:', error);
    }
    
    return false;
  }
  
  /**
   * Try calendar URL schemes (iOS/Android deep links)
   */
  private async tryCalendarURLSchemes(entries: RosterEntry[], staffName: string, month: number, year: number): Promise<boolean> {
    try {
      // For single events, we can use calendar URL schemes
      if (entries.length === 1) {
        const entry = entries[0];
        const shiftTimes = this.getShiftTimes(entry.shift_type);
        const date = new Date(entry.date);
        
        const startDateTime = new Date(date);
        startDateTime.setHours(shiftTimes.startHour, shiftTimes.startMinute);
        
        const endDateTime = new Date(date);
        if (shiftTimes.endHour < shiftTimes.startHour) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }
        endDateTime.setHours(shiftTimes.endHour, shiftTimes.endMinute);
        
        // Create calendar URL for iOS/Android
        const title = encodeURIComponent(`${entry.shift_type} - X-ray Department`);
        const details = encodeURIComponent(`Work shift: ${entry.shift_type}\nAssigned to: ${entry.assigned_name}`);
        const location = encodeURIComponent('X-ray Department');
        
        // Format dates for URL scheme
        const startDate = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Try iOS Calendar URL scheme
        const iosUrl = `calshow:${startDate}`;
        
        // Try Google Calendar URL scheme
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
        
        // Try opening the URL
        window.open(googleUrl, '_blank');
        
        return true;
      }
    } catch (error) {
      console.log('❌ Calendar URL schemes failed:', error);
    }
    
    return false;
  }
  
  /**
   * Generate iCal content (fallback method)
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
}

// Create singleton instance
export const calendarExportManager = new CalendarExportManager();