/**
 * Client-side service for Supabase Storage operations.
 * Communicates exclusively with our server-side proxy API to hide secrets.
 */

export interface SupabaseStatus {
  connected: boolean;
  supabaseUrl?: string;
  supabaseBucket?: string;
}

// Memory cache for connection status
let supabaseStatusCache: SupabaseStatus | null = null;
let statusListeners: Array<(status: SupabaseStatus) => void> = [];

export const addStatusListener = (callback: (status: SupabaseStatus) => void) => {
  statusListeners.push(callback);
  if (supabaseStatusCache) {
    callback(supabaseStatusCache);
  }
};

export const removeStatusListener = (callback: (status: SupabaseStatus) => void) => {
  statusListeners = statusListeners.filter(cb => cb !== callback);
};

const notifyListeners = (status: SupabaseStatus) => {
  supabaseStatusCache = status;
  statusListeners.forEach(cb => {
    try {
      cb(status);
    } catch (err) {
      console.error(err);
    }
  });
};

/**
 * Checks the Supabase connection status on the server.
 */
export const checkSupabaseStatus = async (): Promise<SupabaseStatus> => {
  try {
    const res = await fetch('/api/supabase/config');
    if (res.ok) {
      const data: SupabaseStatus = await res.json();
      notifyListeners(data);
      return data;
    }
  } catch (err) {
    console.error('Failed to fetch Supabase status:', err);
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
  checkSupabaseStatus().then(status => {
    if (status.connected) {
      if (onAuthSuccess) {
        onAuthSuccess({ email: 'linked-bucket@supabase' }, 'server_proxy_token');
      }
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });

  // Return unsubscribe
  return () => {};
};

/**
 * Gets the current connection status (returns dummy token if connected to trigger connected UI state).
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (supabaseStatusCache) {
    return supabaseStatusCache.connected ? 'server_proxy_token' : null;
  }
  const status = await checkSupabaseStatus();
  return status.connected ? 'server_proxy_token' : null;
};

/**
 * Unlinks the Supabase service-wide connection.
 */
export const logout = async () => {
  try {
    const res = await fetch('/api/supabase/disconnect', { method: 'POST' });
    if (res.ok) {
      notifyListeners({ connected: false });
    } else {
      throw new Error('Failed to disconnect Supabase');
    }
  } catch (err) {
    console.error('Disconnect error:', err);
    throw err;
  }
};

/**
 * Saves a Supabase config configuration to the server database.
 */
export const saveSupabaseConfig = async (
  supabaseUrl: string,
  supabaseKey: string,
  supabaseBucket: string
): Promise<SupabaseStatus> => {
  const res = await fetch('/api/supabase/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      supabaseUrl,
      supabaseKey,
      supabaseBucket,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save configuration');
  }

  const data: SupabaseStatus = await res.json();
  notifyListeners(data);
  return data;
};

/**
 * Uploads a file to Supabase using the server-side client.
 */
export const uploadFileToSupabase = async (
  fileBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string; url: string; webViewLink?: string; webContentLink?: string }> => {
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

  const res = await fetch('/api/supabase/upload', {
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
    throw new Error(data.error || 'Failed to upload scanned document to Supabase');
  }

  return await res.json();
};

/**
 * Downloads a file from Supabase as a Blob.
 */
export const downloadFileFromSupabase = async (fileId: string): Promise<Blob> => {
  const res = await fetch(`/api/supabase/download/${encodeURIComponent(fileId)}`);
  if (!res.ok) {
    throw new Error(`Failed to download file from Supabase (${res.statusText})`);
  }
  return await res.blob();
};

/**
 * Deletes a file from Supabase.
 */
export const deleteFileFromSupabase = async (fileId: string): Promise<void> => {
  const res = await fetch(`/api/supabase/delete/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete file from Supabase');
  }
};
