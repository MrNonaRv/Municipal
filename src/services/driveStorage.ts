import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try to re-auth silently or wait for user to click sign in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const driveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
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
