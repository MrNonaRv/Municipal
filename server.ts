import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'default-32-char-key-for-local-dev-only-!!!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(text: string) {
  const [ivHex, authTagHex, encrypted] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Low-dependency JSON Database
const IS_VERCEL = !!process.env.VERCEL;
const DB_FILE = IS_VERCEL
  ? path.join('/tmp', 'database.json')
  : path.join(process.cwd(), 'database.json');

interface DatabaseSchema {
  [id: string]: string;
}

let dbCache: DatabaseSchema = {};

async function loadDb() {
  try {
    if (IS_VERCEL) {
      // Check if file exists in /tmp. If not, copy it from working directory
      try {
        await fs.access(DB_FILE);
      } catch (err) {
        const sourcePath = path.join(process.cwd(), 'database.json');
        try {
          await fs.copyFile(sourcePath, DB_FILE);
          console.log('Copied database.json to /tmp for Vercel write access');
        } catch (copyErr) {
          console.warn('Could not copy database.json to /tmp, initializing empty:', copyErr);
          await fs.writeFile(DB_FILE, '{}', 'utf-8');
        }
      }
    }

    const content = await fs.readFile(DB_FILE, 'utf-8');
    dbCache = JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      dbCache = {};
      await saveDb();
    } else {
      console.error('Failed to load JSON database:', error);
    }
  }
}

async function saveDb() {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save JSON database:', error);
  }
}

const app = express();
app.use(express.json({ limit: '50mb' }));

let dbLoaded = false;
async function ensureDbLoaded() {
  if (!dbLoaded) {
    await loadDb();
    dbLoaded = true;
  }
}

// Middleware to lazily load DB on requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    await ensureDbLoaded();
  }
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/employees', async (req, res) => {
  try {
    const keys = Object.keys(dbCache).filter(key => key !== 'google_drive_config');
    const records = keys.map(key => dbCache[key]);
    const employees = records.map(encryptedData => {
      try {
        return JSON.parse(decrypt(encryptedData));
      } catch (e) {
        // If decryption fails, maybe it's not encrypted yet? (for migration)
        try {
          return JSON.parse(encryptedData);
        } catch (e2) {
          return null;
        }
      }
    }).filter(Boolean);
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Google Drive Server-Side Integration
async function getGoogleAccessToken(): Promise<{ token: string; folderId?: string }> {
  const configStr = dbCache['google_drive_config'];
  if (!configStr) {
    throw new Error('Google Drive is not linked. Please configure a Service Account JSON in the Data Center first.');
  }

  let config: any;
  try {
    config = JSON.parse(decrypt(configStr));
  } catch (err) {
    config = JSON.parse(configStr);
  }

  if (config.type === 'service_account') {
    if (!config.serviceAccountKey) {
      throw new Error('Service Account key is missing.');
    }
    const sa = typeof config.serviceAccountKey === 'string' ? JSON.parse(config.serviceAccountKey) : config.serviceAccountKey;
    const privateKey = sa.private_key.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const base64UrlEncode = (obj: any) => {
      return Buffer.from(JSON.stringify(obj))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const sHeader = base64UrlEncode(header);
    const sPayload = base64UrlEncode(payload);
    const signatureInput = `${sHeader}.${sPayload}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google token exchange failed: ${res.statusText} - ${errText}`);
    }

    const data: any = await res.json();
    return { token: data.access_token, folderId: config.folderId };
  }

  throw new Error('Unsupported Google Drive configuration type.');
}

app.get('/api/drive/config', async (req, res) => {
  try {
    const configStr = dbCache['google_drive_config'];
    if (!configStr) {
      return res.json({ connected: false });
    }

    let config: any;
    try {
      config = JSON.parse(decrypt(configStr));
    } catch (err) {
      config = JSON.parse(configStr);
    }

    if (config.type === 'service_account') {
      let email = 'Service Account';
      try {
        const sa = typeof config.serviceAccountKey === 'string' ? JSON.parse(config.serviceAccountKey) : config.serviceAccountKey;
        email = sa.client_email || email;
      } catch (e) {}

      return res.json({
        connected: true,
        type: 'service_account',
        email: email,
        folderId: config.folderId || ''
      });
    }

    res.json({ connected: false });
  } catch (error) {
    console.error(error);
    res.json({ connected: false });
  }
});

app.post('/api/drive/config', async (req, res) => {
  try {
    const { serviceAccountKey, folderId } = req.body;
    if (!serviceAccountKey) {
      return res.status(400).json({ error: 'Missing serviceAccountKey' });
    }

    let parsedKey: any;
    try {
      parsedKey = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON format for Service Account Key' });
    }

    if (!parsedKey.client_email || !parsedKey.private_key) {
      return res.status(400).json({ error: 'Service Account Key is missing client_email or private_key fields' });
    }

    const config = {
      type: 'service_account',
      serviceAccountKey: parsedKey,
      folderId: folderId || '',
      email: parsedKey.client_email
    };

    const encryptedData = encrypt(JSON.stringify(config));
    dbCache['google_drive_config'] = encryptedData;
    await saveDb();

    res.json({
      success: true,
      connected: true,
      type: 'service_account',
      email: parsedKey.client_email,
      folderId: folderId || ''
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to save Google Drive configuration' });
  }
});

app.post('/api/drive/disconnect', async (req, res) => {
  try {
    if (dbCache['google_drive_config']) {
      delete dbCache['google_drive_config'];
      await saveDb();
    }
    res.json({ success: true, connected: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unlink Google Drive' });
  }
});

app.post('/api/drive/upload', async (req, res) => {
  try {
    const { fileName, mimeType, fileData } = req.body;
    if (!fileName || !mimeType || !fileData) {
      return res.status(400).json({ error: 'Missing fileName, mimeType, or fileData' });
    }

    const { token, folderId } = await getGoogleAccessToken();
    const fileBuffer = Buffer.from(fileData, 'base64');

    const metadataBody: any = {
      name: fileName,
      mimeType: mimeType,
    };
    if (folderId) {
      metadataBody.parents = [folderId];
    }

    const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataBody),
    });

    if (!metadataResponse.ok) {
      const errText = await metadataResponse.text();
      throw new Error(`Failed to create Google Drive metadata: ${errText}`);
    }

    const driveFile: any = await metadataResponse.json();
    const fileId = driveFile.id;

    const mediaResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: fileBuffer,
    });

    if (!mediaResponse.ok) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      const errText = await mediaResponse.text();
      throw new Error(`Failed to upload media content to Google Drive: ${errText}`);
    }

    const detailsResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,webContentLink,mimeType`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (detailsResponse.ok) {
      const details = await detailsResponse.json();
      return res.json(details);
    }

    res.json({ id: fileId, name: fileName });
  } catch (error: any) {
    console.error('Server Drive upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file to Google Drive' });
  }
});

app.get('/api/drive/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { token } = await getGoogleAccessToken();

    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let filename = 'document';
    let mimeType = 'application/octet-stream';
    if (metaRes.ok) {
      const meta: any = await metaRes.json();
      filename = meta.name || filename;
      mimeType = meta.mimeType || mimeType;
    }

    const mediaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mediaRes.ok) {
      const errText = await mediaRes.text();
      return res.status(mediaRes.status).send(`Failed to download file: ${errText}`);
    }

    const buffer = await mediaRes.arrayBuffer();
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Server Drive download error:', error);
    res.status(500).send(error.message || 'Failed to download file from Google Drive');
  }
});

app.delete('/api/drive/delete/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { token } = await getGoogleAccessToken();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Failed to delete file: ${errText}` });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Server Drive delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file from Google Drive' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const employee = req.body;
    const encryptedData = encrypt(JSON.stringify(employee));
    dbCache[employee.id] = encryptedData;
    await saveDb();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (dbCache[id]) {
      delete dbCache[id];
      await saveDb();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
