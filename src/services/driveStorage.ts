import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = localStorage.getItem('GersDriveAccessToken');
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try to recover from localStorage if possible
        const storedToken = localStorage.getItem('GersDriveAccessToken');
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      // Don't remove token from localStorage here automatically on transient failures
      // Only remove on explicit logout
      cachedAccessToken = null;
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
    localStorage.setItem('GersDriveAccessToken', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    isSigningIn = false;
    console.error('Sign in error:', error);
    
    // Gracefully handle user cancellation
    if (error.code === 'auth/popup-closed-by-user') {
      return null;
    }
    
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
    cachedAccessToken = localStorage.getItem('GersDriveAccessToken');
  }
  return cachedAccessToken;
};

export const driveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('GersDriveAccessToken');
};

export const uploadFileToDrive = async (
  fileBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ success: boolean; fileId: string; webViewLink?: string; webContentLink?: string }> => {
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
      fileData: dataUrl
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload to Google Drive');
  }

  return await response.json();
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
    throw new Error(error.error || 'Failed to delete file from Google Drive');
  }
};
