// Main PDF parser that orchestrates all the smaller components
import { RosterFormData } from '../../types/roster';
import { PDFLoader } from './pdfLoader';
import { BoxParser } from './boxParser';

export interface ParsedRosterData {
  entries: RosterFormData[];
  errors: string[];
  warnings: string[];
}

class PDFRosterParser {
  private pdfLoader = new PDFLoader();
  private boxParser = new BoxParser();

  async parsePDF(file: File): Promise<ParsedRosterData> {
    const result: ParsedRosterData = {
      entries: [],
      errors: [],
      warnings: []
    };

    try {
      console.log('📄 Starting smart PDF parsing...');
      
      // Load PDF
      const pdf = await this.pdfLoader.loadPDF(file);
      console.log('📄 PDF loaded successfully, pages:', pdf.numPages);

      const allParsedEntries: ParsedEntry[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📄 Processing page ${pageNum}...`);
        
        const page = await pdf.getPage(pageNum);
        const textItems = await this.pdfLoader.extractTextFromPage(page);
        
        // Use box-based parsing approach
        const pageEntries = this.boxParser.parsePageAsBoxes(textItems);
        allParsedEntries.push(...pageEntries);
      }

      // Build final entries
      result.entries = allParsedEntries
        .filter(entry => {
          // Filter out entries with invalid dates
          if (!entry.date || entry.date === '') {
            console.log(`⚠️ Skipping entry with invalid/empty date:`, entry);
            result.warnings.push(`Skipped entry for ${entry.assignedName} - ${entry.shiftType}: Invalid date`);
            return false;
          }
          return true;
        })
        .map(entry => ({
          date: entry.date,
          shiftType: entry.shiftType,
          assignedName: entry.assignedName,
          changeDescription: 'Imported from PDF'
        }));
      
      // DEBUGGING: Analyze what we found vs what we expected
      console.log('📊 PARSING ANALYSIS:');
      console.log(`📊 Total parsed entries: ${allParsedEntries.length}`);
      console.log(`📊 Final unique entries: ${result.entries.length}`);
      
      // Group by date to see which dates are missing entries
      const entriesByDate = result.entries.reduce((groups, entry) => {
        if (!groups[entry.date]) groups[entry.date] = [];
        groups[entry.date].push(entry);
        return groups;
      }, {} as Record<string, any[]>);
      
      // Show first few entries to debug date format
      console.log('📊 FIRST 10 ENTRIES (to check date format):');
      result.entries.slice(0, 10).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.assignedName} | ${entry.shiftType} | ${entry.date}`);
      });
      
      console.log('📄 Box-based PDF parsing completed successfully!');

    } catch (error) {
      console.error('❌ PDF parsing error:', error);
      result.errors.push(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Apply Saturday shift logic corrections
    result.entries = this.applySaturdayShiftLogic(result.entries);

    return result;
  }

  /**
   * Apply Saturday shift logic:
   * - Normal Saturday: Convert 4-10 to 12-10 (unless 9-4 is present)
   * - Special Saturday: Keep 4-10 if 9-4 is present
   */
  private applySaturdayShiftLogic(entries: RosterFormData[]): RosterFormData[] {
    // Group entries by date to analyze each day
    const entriesByDate = entries.reduce((groups, entry) => {
      if (!groups[entry.date]) groups[entry.date] = [];
      groups[entry.date].push(entry);
      return groups;
    }, {} as Record<string, RosterFormData[]>);

    const correctedEntries: RosterFormData[] = [];

    Object.entries(entriesByDate).forEach(([date, dateEntries]) => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

      if (dayOfWeek === 6) { // Saturday
        // Check if this Saturday has any 9-4 shifts (indicating it's a special day)
        const has9to4 = dateEntries.some(entry => entry.shiftType === 'Morning Shift (9-4)');
        
        if (!has9to4) {
          // Normal Saturday: Convert all 4-10 shifts to 12-10
          dateEntries.forEach(entry => {
            if (entry.shiftType === 'Evening Shift (4-10)') {
              correctedEntries.push({
                ...entry,
                shiftType: 'Saturday Regular (12-10)',
                changeDescription: 'Imported from PDF (Saturday 4-10 converted to 12-10)'
              });
            } else {
              correctedEntries.push(entry);
            }
          });
        } else {
          // Special Saturday: Keep 4-10 shifts as they are (since 9-4 is present)
          dateEntries.forEach(entry => {
            correctedEntries.push(entry);
          });
        }
      } else {
        // Not Saturday: Keep all entries as they are
        dateEntries.forEach(entry => {
          correctedEntries.push(entry);
        });
      }
    });

    return correctedEntries;
  }
}

export const pdfRosterParser = new PDFRosterParser();