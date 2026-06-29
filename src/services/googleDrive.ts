/**
 * Client-side service for Google Drive operations.
 * Communicates exclusively with our server-side proxy API.
 */

export interface GoogleDriveStatus {
  connected: boolean;
  type?: 'service_account';
  email?: string;
  folderId?: string;
}

// Memory cache for connection status
let driveStatusCache: GoogleDriveStatus | null = null;
let statusListeners: Array<(status: GoogleDriveStatus) => void> = [];

export const addStatusListener = (callback: (status: GoogleDriveStatus) => void) => {
  statusListeners.push(callback);
  if (driveStatusCache) {
    callback(driveStatusCache);
  }
};

export const removeStatusListener = (callback: (status: GoogleDriveStatus) => void) => {
  statusListeners = statusListeners.filter(cb => cb !== callback);
};

const notifyListeners = (status: GoogleDriveStatus) => {
  driveStatusCache = status;
  statusListeners.forEach(cb => {
    try {
      cb(status);
    } catch (err) {
      console.error(err);
    }
  });
};

/**
 * Checks the Google Drive connection status on the server.
 */
export const checkDriveStatus = async (): Promise<GoogleDriveStatus> => {
  try {
    const res = await fetch('/api/drive/config');
    if (res.ok) {
      const data: GoogleDriveStatus = await res.json();
      notifyListeners(data);
      return data;
    }
  } catch (err) {
    console.error('Failed to fetch Drive status:', err);
  }
  const fallback = { connected: false };
  notifyListeners(fallback);
  return fallback;
};

/**
 * Initializes the auth state listener for compatibility with existing codebase.
 */
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check status immediately
  checkDriveStatus().then(status => {
    if (status.connected) {
      if (onAuthSuccess) {
        onAuthSuccess({ email: status.email || 'linked-account@gdrive' }, 'server_proxy_token');
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Return unsubscribe dummy
  return () => {};
};

/**
 * Dummy sign-in function for compatibility.
 * Configured system connection should be handled in the settings modal.
 */
export const googleSignIn = async (): Promise<any> => {
  throw new Error('Please configure System Google Drive via the Data Center instead of a personal login popup.');
};

/**
 * Gets the current access token status (returns dummy token if connected to trigger connected UI state).
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (driveStatusCache) {
    return driveStatusCache.connected ? 'server_proxy_token' : null;
  }
  const status = await checkDriveStatus();
  return status.connected ? 'server_proxy_token' : null;
};

/**
 * Unlinks the Google Drive service-wide connection.
 */
export const logout = async () => {
  try {
    const res = await fetch('/api/drive/disconnect', { method: 'POST' });
    if (res.ok) {
      notifyListeners({ connected: false });
    } else {
      throw new Error('Failed to disconnect');
    }
  } catch (err) {
    console.error('Disconnect error:', err);
    throw err;
  }
};

/**
 * Saves a Google Service Account key configuration to the server database.
 */
export const saveServiceAccountConfig = async (
  serviceAccountKey: string,
  folderId?: string
): Promise<GoogleDriveStatus> => {
  const res = await fetch('/api/drive/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      serviceAccountKey,
      folderId,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save configuration');
  }

  const data: GoogleDriveStatus = await res.json();
  notifyListeners(data);
  return data;
};

/**
 * Uploads a file to Google Drive using the server-side Service Account.
 */
export const uploadFileToDrive = async (
  fileBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink?: string; webContentLink?: string }> => {
  // Convert Blob to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileBlob);
  });
  
  const base64Data = await base64Promise;

  const res = await fetch('/api/drive/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      mimeType,
      fileData: base64Data,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload scanned document to Google Drive');
  }

  return await res.json();
};

/**
 * Downloads a file from Google Drive as a Blob.
 */
export const downloadFileFromDrive = async (fileId: string): Promise<Blob> => {
  const res = await fetch(`/api/drive/download/${fileId}`);
  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (${res.statusText})`);
  }
  return await res.blob();
};

/**
 * Deletes a file from Google Drive.
 */
export const deleteFileFromDrive = async (fileId: string): Promise<void> => {
  const res = await fetch(`/api/drive/delete/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete file from Google Drive');
  }
};
