import { PDFDocument } from 'pdf-lib';
import { authCodes } from '../rosterAuth';

export interface EncryptionOptions {
  userPassword: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
}

export class PDFEncryption {
  
  /**
   * Encrypt a PDF blob using PDF-lib with working encryption
   */
  static async encryptPDF(pdfBlob: Blob, options: EncryptionOptions): Promise<Blob> {
    try {
      console.log('🔒 Starting PDF encryption with PDF-lib...');
      
      // Convert blob to array buffer
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      console.log('🔒 Applying encryption with user password:', options.userPassword);
      
      // Save the encrypted PDF with proper encryption settings
      const encryptedPdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Disable object streams for better compatibility
        encryption: {
          userPassword: options.userPassword,
          ownerPassword: options.ownerPassword || (options.userPassword + '_owner'),
          permissions: {
            printing: options.permissions?.printing !== false ? 'highResolution' : 'lowResolution',
            modifying: options.permissions?.modifying === true,
            copying: options.permissions?.copying === true,
            annotating: options.permissions?.annotating === true,
            fillingForms: false,
            contentAccessibility: false,
            documentAssembly: false,
          }
        }
      });
      
      // Create new blob with encrypted content
      const encryptedBlob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
      
      console.log('✅ PDF encryption completed successfully');
      return encryptedBlob;
      
    } catch (error) {
      console.error('❌ PDF encryption failed:', error);
      throw new Error(`PDF encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get staff authentication code for encryption
   */
  static getStaffCode(staffName: string): string {
    // Find the staff member's auth code
    const staffAuth = authCodes.find((auth: any) => {
      const baseName = auth.name.replace(/\(R\)$/, '').trim().toUpperCase();
      const searchBaseName = staffName.replace(/\(R\)$/, '').trim().toUpperCase();
      return baseName === searchBaseName;
    });
    
    if (staffAuth) {
      console.log(`🔑 Found auth code for ${staffName}: ${staffAuth.code}`);
      return staffAuth.code;
    }
    
    console.warn(`⚠️ No auth code found for ${staffName}, using default`);
    return '0000'; // Default fallback
  }
  
  /**
   * Generate encrypted filename
   */
  static generateEncryptedFilename(originalFilename: string): string {
    const extension = '.pdf';
    const nameWithoutExt = originalFilename.replace(extension, '');
    return `${nameWithoutExt}_Protected${extension}`;
  }
}