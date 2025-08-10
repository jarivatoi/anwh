import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface RosterImageExportOptions {
  month: number;
  year: number;
  title?: string;
}

export class RosterImageExporter {
  
  /**
   * Capture the roster table as an image and create a PDF
   */
  async exportRosterAsImage(options: RosterImageExportOptions): Promise<void> {
    const { month, year, title = 'X-ray Roster' } = options;
    
    console.log('📸 Starting roster image export...');
    
    try {
      // Find the roster table element
      const rosterTable = document.querySelector('table') as HTMLElement;
      if (!rosterTable) {
        throw new Error('Roster table not found. Please make sure you are on the Table View.');
      }
      
      console.log('📸 Found roster table, capturing as image...');
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(rosterTable, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: rosterTable.scrollWidth,
        height: rosterTable.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: rosterTable.scrollWidth,
        windowHeight: rosterTable.scrollHeight
      });
      
      console.log('📸 Image captured, creating PDF...');
      
      // Create PDF document
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate PDF dimensions (A4 landscape for better table fit)
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate scaling to fit the image in PDF while maintaining aspect ratio
      const imgAspectRatio = imgWidth / imgHeight;
      const pdfAspectRatio = pdfWidth / pdfHeight;
      
      let finalWidth, finalHeight;
      
      if (imgAspectRatio > pdfAspectRatio) {
        // Image is wider relative to PDF
        finalWidth = pdfWidth - 20; // 10mm margin on each side
        finalHeight = finalWidth / imgAspectRatio;
      } else {
        // Image is taller relative to PDF
        finalHeight = pdfHeight - 30; // 15mm margin top/bottom
        finalWidth = finalHeight * imgAspectRatio;
      }
      
      // Center the image
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;
      
      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const titleText = `${title} - ${monthNames[month]} ${year}`;
      pdf.text(titleText, pdfWidth / 2, 15, { align: 'center' });
      
      // Add the captured image
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y + 10, finalWidth, finalHeight);
      
      // Add footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 10, pdfHeight - 10);
      pdf.text('X-ray ANWH System', pdfWidth - 10, pdfHeight - 10, { align: 'right' });
      
      // Generate filename
      const filename = `Roster_Image_${monthNames[month]}_${year}.pdf`;
      
      // Save the PDF
      pdf.save(filename);
      
      console.log('✅ Roster image export completed:', filename);
      
    } catch (error) {
      console.error('❌ Roster image export failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const rosterImageExporter = new RosterImageExporter();