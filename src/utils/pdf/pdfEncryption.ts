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
   * Encrypt a PDF blob using PDF-lib
   */
  static async encryptPDF(pdfBlob: Blob, options: EncryptionOptions): Promise<Blob> {
    try {
      console.log('🔒 Starting PDF encryption with PDF-lib...');
      
      // Convert blob to array buffer
      const arrayBuffer = await pdfBlob.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Apply encryption using the correct PDF-lib API
      console.log('🔒 Applying encryption with user password:', options.userPassword);
      
      // Save the encrypted PDF
      const encryptedPdfBytes = await pdfDoc.save({
        encryption: {
          userPassword: options.userPassword,
          ownerPassword: options.ownerPassword || (options.userPassword + '_admin'),
          permissions: {
            printing: options.permissions?.printing !== false ? 'highResolution' : 'lowResolution',
            modifying: options.permissions?.modifying ?? false,
            copying: options.permissions?.copying ?? false,
            annotating: options.permissions?.annotating ?? false,
            fillingForms: false,
            contentAccessibility: false,
            documentAssembly: false,
          }
        }
      });
      
      // Create new blob with encrypted content
      const encryptedBlob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
      
      console.log('✅ PDF encryption completed');
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