import { Attachment } from '../types/employee';
import { uploadFileToDrive as uploadFileToGDrive } from './driveStorage';
import { uploadFileToSupabase } from './supabaseStorage';
import { isOnline } from './db';

export interface SyncAttachmentResult {
  success: boolean;
  driveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

export const syncAttachment = async (
  file: File | Blob,
  fileName: string,
  provider: 'supabase' | 'gdrive'
): Promise<SyncAttachmentResult> => {
  if (!isOnline()) {
    return { success: false, error: 'Offline' };
  }

  try {
    let result;
    if (provider === 'gdrive') {
      result = await uploadFileToGDrive(file, fileName, file.type);
    } else {
      result = await uploadFileToSupabase(file, fileName, file.type);
    }

    return {
      success: true,
      driveFileId: result.id,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink
    };
  } catch (error: any) {
    console.error(`[AttachmentSync] Failed to sync to ${provider}:`, error);
    return { success: false, error: error.message || String(error) };
  }
};
