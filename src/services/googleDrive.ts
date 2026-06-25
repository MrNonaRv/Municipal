import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we have a user but no cached token, we can try to re-auth or trigger sign-in.
        // Usually we only have token from credentialFromResult after popup.
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

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Uploads a file (Blob or File) to Google Drive in two phases:
 * 1. Create file metadata (returns a fileId)
 * 2. Upload actual file content via PATCH
 * Then fetches full details including webViewLink and webContentLink.
 */
export const uploadFileToDrive = async (
  fileBlob: Blob,
  fileName: string,
  mimeType: string
): Promise<{ id: string; name: string; webViewLink?: string; webContentLink?: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive. Please log in first.');

  // Step 1: Create file metadata
  const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fileName,
      mimeType: mimeType,
    }),
  });

  if (!metadataResponse.ok) {
    const errText = await metadataResponse.text();
    throw new Error(`Failed to create metadata: ${metadataResponse.statusText} - ${errText}`);
  }

  const fileData = await metadataResponse.json();
  const fileId = fileData.id;

  // Step 2: Upload media content via PATCH
  const mediaResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': mimeType,
    },
    body: fileBlob,
  });

  if (!mediaResponse.ok) {
    // Clean up created metadata on failure
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    const errText = await mediaResponse.text();
    throw new Error(`Failed to upload content: ${mediaResponse.statusText} - ${errText}`);
  }

  // Step 3: Fetch file details
  const detailsResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink,mimeType`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (detailsResponse.ok) {
    return await detailsResponse.json();
  }

  return { id: fileId, name: fileName };
};

/**
 * Downloads a file from Google Drive and returns it as a Blob.
 */
export const downloadFileFromDrive = async (fileId: string): Promise<Blob> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive. Please log in first.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to download file: ${response.statusText} - ${errText}`);
  }

  return await response.blob();
};

/**
 * Lists files matching an optional query
 */
export const listFilesFromDrive = async (q?: string): Promise<any[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive. Please log in first.');

  let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,webContentLink,createdTime)&orderBy=createdTime%20desc';
  if (q) {
    url += `&q=${encodeURIComponent(q)}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to list files: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Deletes a file from Google Drive
 */
export const deleteFileFromDrive = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive. Please log in first.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to delete file: ${response.statusText} - ${errText}`);
  }
};
