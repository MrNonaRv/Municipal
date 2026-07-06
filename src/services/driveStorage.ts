import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = localStorage.getItem('google_drive_access_token');
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        localStorage.setItem('gers_drive_user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }));
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to re-auth silently or wait for user to click sign in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // If we are logged out of Firebase but have a saved token/user from the server, keep it!
      const savedToken = localStorage.getItem('google_drive_access_token');
      const savedUserRaw = localStorage.getItem('gers_drive_user');
      if (savedToken && savedUserRaw) {
        cachedAccessToken = savedToken;
        try {
          const savedUser = JSON.parse(savedUserRaw);
          if (onAuthSuccess) onAuthSuccess(savedUser as any, savedToken);
          return;
        } catch (e) {}
      }

      cachedAccessToken = null;
      localStorage.removeItem('google_drive_access_token');
      localStorage.removeItem('gers_drive_user');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const syncDriveConfigFromServer = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    const response = await fetch('/api/drive/config');
    if (response.ok) {
      const data = await response.json();
      if (data.config && data.config.accessToken) {
        cachedAccessToken = data.config.accessToken;
        localStorage.setItem('google_drive_access_token', cachedAccessToken);
        localStorage.setItem('gers_drive_user', JSON.stringify(data.config.user));
        localStorage.setItem('gers_storage_provider', 'gdrive');
        window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { 
          detail: { connected: true, provider: 'gdrive', user: data.config.user } 
        }));
        return { user: data.config.user, accessToken: cachedAccessToken };
      }
    }
  } catch (err) {
    console.error('[Drive Storage] Failed to sync drive config from server:', err);
  }
  return null;
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('google_drive_access_token', cachedAccessToken);
    
    const userData = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL
    };
    localStorage.setItem('gers_drive_user', JSON.stringify(userData));

    // Save to server persistently
    try {
      await fetch('/api/drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: cachedAccessToken,
          user: userData,
          storageProvider: 'gdrive'
        })
      });
    } catch (serverErr) {
      console.warn('Failed to save Google Drive config on server:', serverErr);
    }
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    isSigningIn = false;
    console.error('Sign in error:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was blocked or closed. If you are previewing this app, please open it in a new tab to sign in.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized in Firebase Console (Auth > Settings > Authorized Domains).');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('google_drive_access_token');
  }
  return cachedAccessToken;
};

const clearDriveAuth = async () => {
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
  localStorage.removeItem('gers_drive_user');
  
  // Clear on server persistently
  try {
    await fetch('/api/drive/config', {
      method: 'DELETE'
    });
  } catch (serverErr) {
    console.warn('Failed to delete Google Drive config on server:', serverErr);
  }

  window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { 
    detail: { connected: false, provider: null, user: null } 
  }));
};

export const driveLogout = async () => {
  await auth.signOut();
  await clearDriveAuth();
};

export const uploadFileToDrive = async (
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  folderName?: string
): Promise<{ success: boolean; id: string; name: string; webViewLink?: string; webContentLink?: string }> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  // Convert Blob to Data URL (Base64)
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileBlob);
  });

  const response = await fetch('/api/drive/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      fileName,
      mimeType,
      fileData: dataUrl,
      folderName
    })
  });

  if (!response.ok) {
    let errorMsg = 'Failed to upload to Google Drive';
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      }
    } catch (e) {
      console.warn('Could not parse error response');
    }
    if (response.status === 401) {
      clearDriveAuth();
      throw new Error('Google Drive session expired. Please reconnect your account.');
    }
    throw new Error(errorMsg);
  }

  let result;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      throw new Error('Server returned non-JSON response');
    }
  } catch (err) {
    throw new Error('Failed to parse response from server');
  }
  return {
    success: true,
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink,
    webContentLink: result.webContentLink
  };
};

export const downloadFileFromDrive = async (fileId: string): Promise<Blob> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const response = await fetch(`/api/drive/download/${encodeURIComponent(fileId)}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearDriveAuth();
      throw new Error('Google Drive session expired. Please reconnect your account.');
    }
    throw new Error(`Failed to download file from Google Drive (${response.statusText})`);
  }

  return await response.blob();
};

export const deleteFileFromDrive = async (fileId: string): Promise<void> => {
  const token = await getDriveAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const response = await fetch(`/api/drive/delete/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let errorMsg = 'Failed to delete file from Google Drive';
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      }
    } catch (e) {
      console.warn('Could not parse error response');
    }
    if (response.status === 401) {
      clearDriveAuth();
      throw new Error('Google Drive session expired. Please reconnect your account.');
    }
    throw new Error(errorMsg);
  }
};
