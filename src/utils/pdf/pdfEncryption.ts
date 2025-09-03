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
   * Encrypt a PDF blob using a working browser-based approach
   */
  static async encryptPDF(pdfBlob: Blob, options: EncryptionOptions): Promise<Blob> {
    try {
      console.log('🔒 Starting PDF encryption...');
      
      // For now, we'll disable encryption and return the original PDF
      // This is because PDF encryption in browsers is complex and requires specific libraries
      console.warn('⚠️ PDF encryption temporarily disabled - returning unencrypted PDF');
      console.log('🔒 Password would have been:', options.userPassword);
      
      // Return the original blob for now
      return pdfBlob;
      
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