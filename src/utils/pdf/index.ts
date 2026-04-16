// Main PDF parser that orchestrates all the smaller components
import { RosterFormData } from '../../types/roster';
import { PDFLoader } from './pdfLoader';
import { BoxParser, type ParsedEntry } from './boxParser';
import { ListParser } from './listParser';
import { getCurrentInstitutionDetails } from '../institutionHelper';
import { processStaffWithAttachedCenter } from '../attachedCenters';

export interface ParsedRosterData {
  entries: RosterFormData[];
  errors: string[];
  warnings: string[];
}

class PDFRosterParser {
  private pdfLoader = new PDFLoader();
  public boxParser = new BoxParser(); // Make public for custom staff list
  private listParser = new ListParser();

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
        
        // Try both parsing approaches and use the one that finds more entries
        const boxEntries = this.boxParser.parsePageAsBoxes(textItems);
        const listEntries = this.listParser.parsePageAsList(textItems);
        
        console.log(`📄 Page ${pageNum} parsing results:`, {
          boxEntries: boxEntries.length,
          listEntries: listEntries.length
        });
        
        // Use the approach that found more valid entries (with valid dates)
        const validListEntries = listEntries.filter(entry => entry.date && entry.date !== '' && entry.date !== null);
        const validBoxEntries = boxEntries.filter(entry => entry.date && entry.date !== '' && entry.date !== null);
        
        const pageEntries = validListEntries.length > validBoxEntries.length ? listEntries : boxEntries;
        console.log(`📄 Page ${pageNum}: Using ${validListEntries.length > validBoxEntries.length ? 'list' : 'box'} parser (${pageEntries.length} total entries, ${validListEntries.length > validBoxEntries.length ? validListEntries.length : validBoxEntries.length} valid)`);
        
        allParsedEntries.push(...pageEntries);
      }

      // Build final entries with marker processing
      const institution = await getCurrentInstitutionDetails();
      
      result.entries = await Promise.all(allParsedEntries
        .filter(entry => {
          // Filter out entries with missing required fields
          const hasDate = entry.date && entry.date !== '' && entry.date !== null;
          const hasShift = entry.shiftType && entry.shiftType !== '' && entry.shiftType !== null;
          const hasStaff = entry.assignedName && entry.assignedName !== '' && entry.assignedName !== null;
          
          if (!hasDate) {
            console.log(`❌ FILTERING OUT: Missing date - ${entry.assignedName || 'unknown'} | ${entry.shiftType || 'unknown shift'}`);
          }
          if (!hasShift) {
            console.log(`❌ FILTERING OUT: Missing shift - ${entry.assignedName || 'unknown'} | ${entry.date || 'unknown date'}`);
          }
          if (!hasStaff) {
            console.log(`❌ FILTERING OUT: Missing staff - ${entry.date || 'unknown date'} | ${entry.shiftType || 'unknown shift'}`);
          }
          
          return hasDate && hasShift && hasStaff;
        })
        .map(async (entry) => {
          // STEP 1: Check if original PDF text has marker (use originalPdfText if available)
          const pdfText = (entry as any).originalPdfText || entry.assignedName;
          const hadMarker = pdfText.startsWith('*');
          
          console.log(`🔍 PDF IMPORT CHECK: assignedName="${entry.assignedName}", pdfText="${pdfText}", hadMarker=${hadMarker}`);
          
          // Extract the actual marker prefix (*, **, ***) from PDF text
          const markerMatch = pdfText.match(/^(\*+)/);
          const actualMarker = markerMatch ? markerMatch[1] : '*';
          
          // STEP 2: Process marker to extract center information (if institution supports attached centers)
          let processedName = entry.assignedName;
          let centerRemark: string | undefined;
          
          if (hadMarker && institution?.code) {
            // Create a version with the ACTUAL marker + full ID-based name for center lookup
            const nameWithMarker = `${actualMarker}${entry.assignedName}`;
            
            console.log(`🔎 EXTRACTED MARKER: "${actualMarker}" from "${pdfText}"`);
            console.log(`📞 Calling processStaffWithAttachedCenter with: "${nameWithMarker}" (marker: "${actualMarker}")`);
            const processed = await processStaffWithAttachedCenter(nameWithMarker, institution.code);
            // Use the clean name WITHOUT marker for storage (to match staff_users)
            processedName = processed.cleanName;
            centerRemark = processed.remark || undefined;
            
            console.log(`📬 Received from processStaffWithAttachedCenter: cleanName="${processed.cleanName}", remark="${processed.remark}"`);
            
            if (centerRemark) {
              console.log(`✅ Detected attached center: ${nameWithMarker} → Center: ${centerRemark}`);
            } else {
              console.log(`⚠️ No center returned for ${nameWithMarker}`);
            }
          } else if (hadMarker) {
            // Has marker but no institution - just strip the marker
            processedName = pdfText.replace(/^\*+/, '');
            console.log(`⚠️ Stripped marker but no institution: ${pdfText} → ${processedName}`);
          }
          
          // STEP 3: Include center remark in change_description if present
          // Format: | DD-MM-YYYY HH:MM:SS USER, Admin: Center Added: CENTER_NAME
          const changeDescription = centerRemark 
            ? `| ${new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }).replace(/\//g, '-')} USER, Admin: Center Added: ${centerRemark}`
            : '';
          
          console.log(`💾 PREPARING TO STORE: assignedName="${processedName}", changeDescription="${changeDescription}"`);
          
          return {
            date: entry.date,
            shiftType: entry.shiftType,
            assignedName: processedName, // Store WITHOUT marker (matches staff_users)
            changeDescription
          };
        }));
      
      // Remove duplicate entries (same date, shift, and staff)
      const uniqueEntries = new Map<string, typeof result.entries[0]>();
      result.entries.forEach(entry => {
        const key = `${entry.date}-${entry.shiftType}-${entry.assignedName}`;
        if (!uniqueEntries.has(key)) {
          uniqueEntries.set(key, entry);
        } else {
          console.log(`🔄 DUPLICATE REMOVED: ${entry.assignedName} | ${entry.shiftType} | ${entry.date}`);
        }
      });
      result.entries = Array.from(uniqueEntries.values());
      
      // DEBUGGING: Analyze what we found vs what we expected
      console.log('📊 PARSING ANALYSIS:');
      console.log(`📊 Total parsed entries: ${allParsedEntries.length}`);
      console.log(`📊 Valid entries (after filtering and deduplication): ${result.entries.length}`);
      
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