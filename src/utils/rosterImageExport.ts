import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface RosterImageExportOptions {
  month: number;
  year: number;
  title?: string;
}

export class RosterImageExporter {
  
  /**
   * Export roster table as image to PDF
   */
  async exportRosterAsImage(options: RosterImageExportOptions): Promise<void> {
    const { month, year, title = 'X-ray ANWH Roster' } = options;
    
    console.log('📸 Starting roster image export...');
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    try {
      // Find the roster table element
      const tableElement = document.querySelector('table') as HTMLElement;
      if (!tableElement) {
        throw new Error('Roster table not found. Please make sure you are on the Table View.');
      }
      
      console.log('📸 Found roster table, preparing for capture...');
      
      // Store original styles to restore later
      const originalStyles = new Map<Element, string>();
      
      // Temporarily disable animations and optimize for capture
      const elementsToOptimize = document.querySelectorAll('*');
      elementsToOptimize.forEach(element => {
        const htmlElement = element as HTMLElement;
        originalStyles.set(element, htmlElement.style.cssText);
        
        // Disable animations and transitions
        htmlElement.style.animation = 'none';
        htmlElement.style.transition = 'none';
        htmlElement.style.transform = 'none';
        
        // Fix text rendering for better PDF quality
        if (htmlElement.style.fontSize) {
          const currentSize = parseInt(htmlElement.style.fontSize);
          if (currentSize > 8) {
            htmlElement.style.fontSize = Math.max(8, currentSize * 0.85) + 'px';
          }
        }
        
        // Convert scrolling text to normal wrapped text
        if (htmlElement.classList.contains('scrolling-text') || 
            htmlElement.style.animation?.includes('scroll')) {
          htmlElement.style.whiteSpace = 'normal';
          htmlElement.style.wordWrap = 'break-word';
          htmlElement.style.overflow = 'visible';
          htmlElement.style.textOverflow = 'clip';
          htmlElement.style.lineHeight = '1.2';
        }
        
        // Handle special date text - only show text before asterisk
        if (htmlElement.textContent && htmlElement.textContent.includes('*')) {
          const textBeforeAsterisk = htmlElement.textContent.split('*')[0].trim();
          if (textBeforeAsterisk) {
            htmlElement.textContent = textBeforeAsterisk;
          }
        }
      });
      
      // Force layout recalculation
      tableElement.offsetHeight;
      
      console.log('📸 Capturing table as image...');
      
      // Capture the table with high quality settings
      const canvas = await html2canvas(tableElement, {
        scale: 3, // Higher resolution for better text quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 15000,
        logging: false,
        width: tableElement.scrollWidth,
        height: tableElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        ignoreElements: (element) => {
          // Ignore spinning elements and animations
          return element.classList.contains('animate-spin') || 
                 element.classList.contains('animate-pulse') ||
                 element.style.animation?.includes('spin') ||
                 element.style.animation?.includes('pulse');
        }
      });
      
      console.log('📸 Image captured, creating PDF...');
      
      // Create PDF document
      const doc = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calculate dimensions to fit the image on the page
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 3) - 20; // Extra space for title
      
      // Calculate scaling to fit image on page
      const imageAspectRatio = canvas.width / canvas.height;
      const availableAspectRatio = availableWidth / availableHeight;
      
      let imageWidth, imageHeight;
      if (imageAspectRatio > availableAspectRatio) {
        // Image is wider, scale by width
        imageWidth = availableWidth;
        imageHeight = availableWidth / imageAspectRatio;
      } else {
        // Image is taller, scale by height
        imageHeight = availableHeight;
        imageWidth = availableHeight * imageAspectRatio;
      }
      
      // Center the image on the page
      const imageX = (pageWidth - imageWidth) / 2;
      const imageY = margin + 20; // Leave space for title
      
      // Add title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${title} - ${monthNames[month]} ${year}`, pageWidth / 2, 15, { align: 'center' });
      
      // Add the image to PDF
      const imageData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imageData, 'PNG', imageX, imageY, imageWidth, imageHeight);
      
      // Add footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pageHeight - 5);
      
      // Restore original styles
      originalStyles.forEach((originalStyle, element) => {
        (element as HTMLElement).style.cssText = originalStyle;
      });
      
      // Force layout recalculation after restoring styles
      tableElement.offsetHeight;
      
      // Save the PDF
      const filename = `Roster_Image_${monthNames[month]}_${year}.pdf`;
      doc.save(filename);
      
      console.log('✅ Roster image export completed:', filename);
      
    } catch (error) {
      console.error('❌ Roster image export failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const rosterImageExporter = new RosterImageExporter();