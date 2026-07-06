import express from 'express';
import { google } from 'googleapis';
import { PassThrough } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export let sharedDriveConfig: { accessToken: string | null; user: any; storageProvider: string | null } | null = null;

export async function loadGDriveConfig(firestoreDb: any, currentDirname: string) {
  const GDRIVE_CONFIG_FILE = path.join(currentDirname, 'gdrive_config.json');
  try {
    try {
      const content = await fs.readFile(GDRIVE_CONFIG_FILE, 'utf-8');
      sharedDriveConfig = JSON.parse(content);
      console.log('[Google Drive Config] Loaded local configuration:', sharedDriveConfig?.user?.email);
    } catch (e) {}

    if (firestoreDb) {
      const docRef = doc(firestoreDb, 'system_sync', 'google_drive_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        sharedDriveConfig = {
          accessToken: data.accessToken || null,
          user: data.user || null,
          storageProvider: data.storageProvider || null
        };
        console.log('[Google Drive Config] Restored configuration from Firestore:', sharedDriveConfig?.user?.email);
        await fs.writeFile(GDRIVE_CONFIG_FILE, JSON.stringify(sharedDriveConfig, null, 2), 'utf-8');
      } else if (sharedDriveConfig) {
        console.log('[Google Drive Config] Seeding Firestore with local configuration...');
        await setDoc(docRef, sharedDriveConfig);
      }
    }
  } catch (err) {
    console.error('[Google Drive Config] Failed to load Google Drive config:', err);
  }
}

export async function saveGDriveConfig(firestoreDb: any, currentDirname: string, config: any) {
  const GDRIVE_CONFIG_FILE = path.join(currentDirname, 'gdrive_config.json');
  sharedDriveConfig = config;
  try {
    await fs.writeFile(GDRIVE_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    if (firestoreDb) {
      const docRef = doc(firestoreDb, 'system_sync', 'google_drive_config');
      await setDoc(docRef, config);
    }
    console.log('[Google Drive Config] Saved shared configuration:', config?.user?.email);
  } catch (err) {
    console.error('[Google Drive Config] Failed to save Google Drive config:', err);
  }
}

export async function deleteGDriveConfig(firestoreDb: any, currentDirname: string) {
  const GDRIVE_CONFIG_FILE = path.join(currentDirname, 'gdrive_config.json');
  sharedDriveConfig = null;
  try {
    try {
      await fs.unlink(GDRIVE_CONFIG_FILE);
    } catch (e) {}
    if (firestoreDb) {
      const docRef = doc(firestoreDb, 'system_sync', 'google_drive_config');
      await deleteDoc(docRef);
    }
    console.log('[Google Drive Config] Deleted shared configuration');
  } catch (err) {
    console.error('[Google Drive Config] Failed to delete Google Drive config:', err);
  }
}

export function setupDriveRoutes(app: express.Express, firestoreDb: any, currentDirname: string) {
  app.get('/api/drive/config', async (req, res) => {
    try {
      res.json({ config: sharedDriveConfig });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to get drive config' });
    }
  });

  app.post('/api/drive/config', async (req, res) => {
    try {
      const { accessToken, user, storageProvider } = req.body;
      const config = { accessToken, user, storageProvider };
      await saveGDriveConfig(firestoreDb, currentDirname, config);
      res.json({ success: true, config });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save drive config' });
    }
  });

  app.delete('/api/drive/config', async (req, res) => {
    try {
      await deleteGDriveConfig(firestoreDb, currentDirname);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete drive config' });
    }
  });

  app.post('/api/drive/upload', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }

      const { fileName, mimeType, fileData, folderName } = req.body;

      if (!fileName || !mimeType || !fileData) {
        return res.status(400).json({ error: 'Missing fileName, mimeType, or fileData' });
      }

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ 
        access_token: accessToken,
        token_type: 'Bearer'
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      let rootFolderId = '';
      try {
        const folderResponse = await drive.files.list({
          q: "name = 'GovRecords_Attachments' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          fields: 'files(id)',
          spaces: 'drive',
        });

        if (folderResponse.data.files && folderResponse.data.files.length > 0) {
          rootFolderId = folderResponse.data.files[0].id!;
        } else {
          const createFolderResponse = await drive.files.create({
            requestBody: {
              name: 'GovRecords_Attachments',
              mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
          });
          rootFolderId = createFolderResponse.data.id!;
        }
      } catch (err: any) {
        console.warn('Error finding/creating root folder:', err);
        if (err.code === 401 || err.response?.status === 401 || err.message?.includes('invalid authentication credentials')) {
          return res.status(401).json({ error: 'Google Drive authentication expired or invalid. Please reconnect.' });
        }
      }

      let finalFolderId = rootFolderId;

      if (folderName && rootFolderId) {
        try {
          const subFolderResponse = await drive.files.list({
            q: `name = '${folderName.replace(/'/g, "\\'")}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            spaces: 'drive',
          });

          if (subFolderResponse.data.files && subFolderResponse.data.files.length > 0) {
            finalFolderId = subFolderResponse.data.files[0].id!;
          } else {
            const createSubFolderResponse = await drive.files.create({
              requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [rootFolderId],
              },
              fields: 'id',
            });
            finalFolderId = createSubFolderResponse.data.id!;
          }
        } catch (err) {
          console.warn(`Error finding/creating subfolder '${folderName}':`, err);
        }
      }

      const base64Data = fileData.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');
      const bufferStream = new PassThrough();
      bufferStream.end(buffer);

      const fileMetadata: any = {
        name: fileName,
      };
      
      if (finalFolderId) {
        fileMetadata.parents = [finalFolderId];
      }

      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      res.json({
        success: true,
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
      });

    } catch (error: any) {
      console.error('Drive upload error:', error);
      if (error.code === 401 || error.response?.status === 401 || error.message?.includes('invalid authentication credentials')) {
        return res.status(401).json({ error: 'Google Drive authentication expired or invalid.' });
      }
      res.status(500).json({ error: error.message || 'Failed to upload to Google Drive' });
    }
  });

  app.get('/api/drive/download/:fileId', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }

      const fileId = req.params.fileId;
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ 
        access_token: accessToken,
        token_type: 'Bearer'
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const metadata = await drive.files.get({
        fileId,
        fields: 'name, mimeType',
      });

      const buffer = Buffer.from(response.data as ArrayBuffer);
      res.setHeader('Content-Type', metadata.data.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.data.name || 'file')}"`);
      res.send(buffer);

    } catch (error: any) {
      console.error('Drive download error:', error);
      if (error.code === 401 || error.response?.status === 401 || error.message?.includes('invalid authentication credentials')) {
        return res.status(401).json({ error: 'Google Drive authentication expired or invalid.' });
      }
      res.status(500).json({ error: error.message || 'Failed to download from Google Drive' });
    }
  });

  app.delete('/api/drive/delete/:fileId', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }

      const fileId = req.params.fileId;
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ 
        access_token: accessToken,
        token_type: 'Bearer'
      });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      await drive.files.delete({ fileId });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Drive delete error:', error);
      if (error.code === 401 || error.response?.status === 401 || error.message?.includes('invalid authentication credentials')) {
        return res.status(401).json({ error: 'Google Drive authentication expired or invalid.' });
      }
      res.status(500).json({ error: error.message || 'Failed to delete from Google Drive' });
    }
  });
}
