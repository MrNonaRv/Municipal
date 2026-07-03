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
      cachedAccessToken = null;
      localStorage.removeItem('google_drive_access_token');
      localStorage.removeItem('gers_drive_user');
      if (onAuthFailure) onAuthFailure();
    }
  });
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
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    isSigningIn = false;
    console.error('Sign in error:', error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked. Please allow popups for this site.');
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

const clearDriveAuth = () => {
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
  localStorage.removeItem('gers_drive_user');
  window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { 
    detail: { connected: false, provider: null, user: null } 
  }));
};

export const driveLogout = async () => {
  await auth.signOut();
  clearDriveAuth();
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
    const error = await response.json();
    if (response.status === 401) {
      clearDriveAuth();
      throw new Error('Google Drive session expired. Please reconnect your account.');
    }
    throw new Error(error.error || 'Failed to upload to Google Drive');
  }

  const result = await response.json();
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
    const error = await response.json();
    if (response.status === 401) {
      clearDriveAuth();
      throw new Error('Google Drive session expired. Please reconnect your account.');
    }
    throw new Error(error.error || 'Failed to delete file from Google Drive');
  }
};
