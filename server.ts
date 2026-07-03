import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { PassThrough } from 'stream';
import initialDatabase from './database.json';

import { db } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { eq } from 'drizzle-orm';

async function getDummyUser() {
  return await getOrCreateUser('dummy_desktop_user', 'desktop_user@local');
}

dotenv.config();

let currentDirname = '';
try {
  currentDirname = __dirname;
} catch (e) {
  try {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  } catch (e2) {
    currentDirname = process.cwd();
  }
}

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

let dbFilePath = '';
if (IS_VERCEL) {
  dbFilePath = path.join('/tmp', 'database.json');
} else {
  dbFilePath = path.join(currentDirname, 'database.json');
}
const DB_FILE = dbFilePath;

interface DatabaseSchema {
  [id: string]: string;
}

let dbCache: DatabaseSchema = {};

async function findDatabaseJson() {
  const candidates = [
    path.join(currentDirname, 'database.json'),
    path.join(currentDirname, '..', 'database.json'),
    path.join(process.cwd(), 'database.json')
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (e) {}
  }
  return null;
}

let firebaseApp: any = null;
let firestoreDb: any = null;

async function initFirebase() {
  try {
    let configRaw = '';
    const configPaths = [
      path.join(currentDirname, 'firebase-applet-config.json'),
      path.join(currentDirname, '..', 'firebase-applet-config.json'),
      path.join(process.cwd(), 'firebase-applet-config.json')
    ];
    for (const p of configPaths) {
      try {
        configRaw = await fs.readFile(p, 'utf-8');
        if (configRaw) break;
      } catch (e) {}
    }
    if (configRaw) {
      const config = JSON.parse(configRaw);
      if (config && config.projectId) {
        console.log('[Firebase] Initializing Firebase client SDK with Project ID:', config.projectId);
        firebaseApp = initializeApp(config);
        const dbId = config.firestoreDatabaseId || '(default)';
        console.log('[Firebase] Initializing Firestore with Project:', config.projectId, 'Database:', dbId);
        firestoreDb = getFirestore(firebaseApp, dbId);
        return true;
      }
    }
  } catch (err: any) {
    console.error('[Firebase] Failed to initialize Firebase. If you see NOT_FOUND, ensure Firestore is enabled in the Firebase Console:', err.message);
  }
  return false;
}

async function loadDb() {
  // First, initialize Firebase if possible
  await initFirebase();

  // Load from local file first as primary or fallback
  try {
    let content = '';
    if (IS_VERCEL) {
      try {
        await fs.access(DB_FILE);
        content = await fs.readFile(DB_FILE, 'utf-8');
      } catch (err) {
        const sourcePath = await findDatabaseJson();
        if (sourcePath) {
          try {
            content = await fs.readFile(sourcePath, 'utf-8');
          } catch (readErr) {
            content = JSON.stringify(initialDatabase);
          }
        } else {
          content = JSON.stringify(initialDatabase);
        }
        await fs.writeFile(DB_FILE, content, 'utf-8');
        console.log('Initialized database.json in /tmp');
      }
    } else {
      try {
        const dbPath = await findDatabaseJson() || DB_FILE;
        content = await fs.readFile(dbPath, 'utf-8');
      } catch (err) {
        content = JSON.stringify(initialDatabase);
        await fs.writeFile(DB_FILE, content, 'utf-8');
      }
    }
    dbCache = JSON.parse(content || '{}');
  } catch (error: any) {
    console.error('Failed to load JSON database:', error);
    dbCache = { ...initialDatabase } as any;
  }

  // Now, try loading from Firestore (if initialized)
  if (firestoreDb) {
    try {
      console.log('[Firebase] Loading records from Firestore "app_data" collection...');
      const querySnapshot = await getDocs(collection(firestoreDb, 'app_data'));
      if (!querySnapshot.empty) {
        const firestoreCache: DatabaseSchema = {};
        const chunkIndicators: Record<string, number> = {};
        const chunkData: Record<string, string> = {};

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            if (data.chunks) {
              chunkIndicators[docSnap.id] = data.chunks;
            } else if (docSnap.id.includes('_chunk_')) {
              chunkData[docSnap.id] = data.value;
            } else if (typeof data.value === 'string') {
              firestoreCache[docSnap.id] = data.value;
            }
          }
        });

        // Reassemble chunks
        for (const id in chunkIndicators) {
          const numChunks = chunkIndicators[id];
          let fullStr = '';
          for (let i = 0; i < numChunks; i++) {
            fullStr += chunkData[`${id}_chunk_${i}`] || '';
          }
          firestoreCache[id] = fullStr;
        }

        // Merge Firestore records into dbCache (Firestore is master)
        dbCache = { ...dbCache, ...firestoreCache };
        console.log(`[Firebase] Successfully loaded and merged ${querySnapshot.size} records from Firestore.`);
      } else {
        console.log('[Firebase] Firestore "app_data" collection is empty. Seeding Firestore with initial database...');
        // If Firestore is empty, seed it with the current dbCache records so they are saved to Firestore!
        for (const [key, val] of Object.entries(dbCache)) {
          if (typeof val === 'string') {
            try {
              // Firestore limits doc size to 1MB. encrypted val + metadata shouldn't exceed it.
              if (val.length > 900000) {
                console.warn(`[Firebase] Skipping seeding record ${key} to Firestore because it is too large (${val.length} bytes).`);
                continue;
              }
              await setDoc(doc(firestoreDb, 'app_data', key), { value: val });
            } catch (e) {
              console.error(`[Firebase] Failed to write employee ID=${key} to Firestore:`, e);
            }
          }
        }
        console.log('[Firebase] Successfully seeded Firestore with initial records.');
      }
    } catch (err) {
      console.error('[Firebase] Failed to load/sync from Firestore:', err);
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

async function seedRealEmployeesIfNeeded() {
  try {
    const dummyUser = await getDummyUser();
    const existing = await db.select().from(employees).limit(1);
    if (existing.length === 0) {
      console.log('[Seed] Database is empty. Seeding real employees from database.json...');
      const recordsToSeed: any[] = [];
      
      for (const [key, value] of Object.entries(initialDatabase)) {
        if (value && typeof value === 'object' && 'surname' in value) {
          const empVal = value as any;
          recordsToSeed.push({
            userId: dummyUser.id,
            originalId: empVal.id || key,
            photo: empVal.photo || null,
            surname: empVal.surname || '',
            firstName: empVal.firstName || '',
            middleName: empVal.middleName || '',
            nameExtension: empVal.nameExtension || '',
            sex: empVal.sex || '',
            civilStatus: empVal.civilStatus || '',
            citizenship: empVal.citizenship || '',
            height: empVal.height || '',
            weight: empVal.weight || '',
            bloodType: empVal.bloodType || '',
            residentialAddress: empVal.residentialAddress || '',
            permanentAddress: empVal.permanentAddress || '',
            zipCode: empVal.zipCode || '',
            telephone: empVal.telephone || '',
            cellphone: empVal.cellphone || '',
            email: empVal.email || '',
            gsisNo: empVal.gsisNo || '',
            pagibigNo: empVal.pagibigNo || '',
            philhealthNo: empVal.philhealthNo || '',
            sssNo: empVal.sssNo || '',
            tin: empVal.tin || '',
            agencyEmployeeNo: empVal.agencyEmployeeNo || '',
            spouseSurname: empVal.spouseSurname || '',
            spouseFirstName: empVal.spouseFirstName || '',
            spouseMiddleName: empVal.spouseMiddleName || '',
            spouseOccupation: empVal.spouseOccupation || '',
            spouseEmployer: empVal.spouseEmployer || '',
            spouseTelephone: empVal.spouseTelephone || '',
            children: empVal.children || [],
            fatherSurname: empVal.fatherSurname || '',
            fatherFirstName: empVal.fatherFirstName || '',
            fatherMiddleName: empVal.fatherMiddleName || '',
            motherSurname: empVal.motherSurname || '',
            motherFirstName: empVal.motherFirstName || '',
            motherMiddleName: empVal.motherMiddleName || '',
            education: empVal.education || [],
            serviceRecords: empVal.serviceRecords || [],
            attachments: empVal.attachments || [],
            pdsScan: empVal.pdsScan || null
          });
        }
      }
      
      if (recordsToSeed.length > 0) {
        console.log(`[Seed] Found ${recordsToSeed.length} real employee records to seed.`);
        for (const record of recordsToSeed) {
          await db.insert(employees).values(record);
        }
        console.log(`[Seed] Successfully seeded ${recordsToSeed.length} real employee records.`);
      } else {
        console.log('[Seed] No matching employee records found in database.json.');
      }
    } else {
      console.log(`[Seed] Database already contains employees. Skipping seeding.`);
    }
  } catch (error) {
    console.error('[Seed] Failed to seed real employees:', error);
  }
}

async function ensureDbLoaded() {
  if (!dbLoaded) {
    await loadDb();
    await seedRealEmployeesIfNeeded();
    dbLoaded = true;
  }
}

// Middleware to lazily load DB on requests
app.use(async (req, res, next) => {
  const isApi = req.url.startsWith('/api') || (req.route && req.route.path.startsWith('/api'));
  const isHealth = req.url === '/api/health' || req.url === '/health' || req.url.startsWith('/api/health?');
  
  if (isApi && !isHealth) {
    await ensureDbLoaded();
  }
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/employees', async (req, res) => {
  try {
    const dummyUser = await getDummyUser();
    const records = await db.select().from(employees).where(eq(employees.userId, dummyUser.id));
    
    // Convert back to original frontend model
    const employeesData = records.map(record => ({
      id: record.originalId,
      photo: record.photo,
      surname: record.surname,
      firstName: record.firstName,
      middleName: record.middleName,
      nameExtension: record.nameExtension,
      sex: record.sex,
      civilStatus: record.civilStatus,
      citizenship: record.citizenship,
      height: record.height,
      weight: record.weight,
      bloodType: record.bloodType,
      residentialAddress: record.residentialAddress,
      permanentAddress: record.permanentAddress,
      zipCode: record.zipCode,
      telephone: record.telephone,
      cellphone: record.cellphone,
      email: record.email,
      gsisNo: record.gsisNo,
      pagibigNo: record.pagibigNo,
      philhealthNo: record.philhealthNo,
      sssNo: record.sssNo,
      tin: record.tin,
      agencyEmployeeNo: record.agencyEmployeeNo,
      spouseSurname: record.spouseSurname,
      spouseFirstName: record.spouseFirstName,
      spouseMiddleName: record.spouseMiddleName,
      spouseOccupation: record.spouseOccupation,
      spouseEmployer: record.spouseEmployer,
      spouseTelephone: record.spouseTelephone,
      children: record.children || [],
      fatherSurname: record.fatherSurname,
      fatherFirstName: record.fatherFirstName,
      fatherMiddleName: record.fatherMiddleName,
      motherSurname: record.motherSurname,
      motherFirstName: record.motherFirstName,
      motherMiddleName: record.motherMiddleName,
      education: record.education || [],
      serviceRecords: record.serviceRecords || [],
      attachments: record.attachments || [],
      pdsScan: record.pdsScan
    }));

    res.json(employeesData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Supabase Storage Server-Side Integration
async function getSupabaseConfig(): Promise<{ supabaseUrl: string; supabaseKey: string; supabaseBucket: string }> {
  // Check if env variables exist first (can override database config)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseBucket: process.env.SUPABASE_BUCKET || 'records',
    };
  }

  const configStr = dbCache['supabase_config'];
  if (!configStr) {
    throw new Error('Supabase Storage is not linked. Please configure it in the Settings/Data Center modal.');
  }

  let config: any;
  try {
    config = JSON.parse(decrypt(configStr));
  } catch (err) {
    config = JSON.parse(configStr);
  }

  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Invalid Supabase configuration.');
  }

  return {
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    supabaseBucket: config.supabaseBucket || 'records',
  };
}

async function getSupabaseClient() {
  const { supabaseUrl, supabaseKey, supabaseBucket } = await getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing.');
  }
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
  return { client, bucket: supabaseBucket };
}

app.get('/api/supabase/config', async (req, res) => {
  try {
    // Check if env variables are set (acting as active auto-connection)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.json({
        connected: true,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseBucket: process.env.SUPABASE_BUCKET || 'records',
      });
    }

    const configStr = dbCache['supabase_config'];
    if (!configStr) {
      return res.json({ connected: false });
    }

    let config: any;
    try {
      config = JSON.parse(decrypt(configStr));
    } catch (err) {
      config = JSON.parse(configStr);
    }

    return res.json({
      connected: true,
      supabaseUrl: config.supabaseUrl || '',
      supabaseBucket: config.supabaseBucket || 'records',
    });
  } catch (error) {
    console.error(error);
    res.json({ connected: false });
  }
});

app.post('/api/supabase/config', async (req, res) => {
  try {
    const { supabaseUrl, supabaseKey, supabaseBucket } = req.body;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(400).json({ error: 'Missing supabaseUrl or supabaseKey' });
    }

    const config = {
      supabaseUrl,
      supabaseKey,
      supabaseBucket: supabaseBucket || 'records',
    };

    const encryptedData = encrypt(JSON.stringify(config));
    dbCache['supabase_config'] = encryptedData;
    await saveDb();

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'app_data', 'supabase_config'), { value: encryptedData });
        console.log('[Firebase] Synchronized Supabase configuration to Firestore.');
      } catch (fsErr) {
        console.error('[Firebase] Failed to write Supabase config to Firestore:', fsErr);
      }
    }

    res.json({
      success: true,
      connected: true,
      supabaseUrl,
      supabaseBucket: supabaseBucket || 'records',
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to save Supabase configuration' });
  }
});

app.post('/api/supabase/disconnect', async (req, res) => {
  try {
    if (dbCache['supabase_config']) {
      delete dbCache['supabase_config'];
      await saveDb();
    }
    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'app_data', 'supabase_config'));
        console.log('[Firebase] Synchronized Supabase disconnection to Firestore.');
      } catch (fsErr) {
        console.error('[Firebase] Failed to delete Supabase config from Firestore:', fsErr);
      }
    }
    res.json({ success: true, connected: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to unlink Supabase Storage' });
  }
});

app.post('/api/supabase/upload', async (req, res) => {
  try {
    const { fileName, mimeType, fileData } = req.body;
    if (!fileName || !mimeType || !fileData) {
      return res.status(400).json({ error: 'Missing fileName, mimeType, or fileData' });
    }

    const { client, bucket } = await getSupabaseClient();
    const fileBuffer = Buffer.from(fileData, 'base64');
    
    // Ensure clean unique filename
    const uniquePath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;

    const { data, error } = await client.storage
      .from(bucket)
      .upload(uniquePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(uniquePath);
    const publicUrl = publicUrlData?.publicUrl || '';

    // To prevent any client breakdown, we return fields expected by the client side:
    // id, name, url, webViewLink, webContentLink. All map to the same file.
    res.json({
      id: uniquePath,
      name: fileName,
      url: publicUrl,
      webViewLink: publicUrl,
      webContentLink: publicUrl,
    });
  } catch (error: any) {
    console.error('Server Supabase upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file to Supabase' });
  }
});

app.get('/api/supabase/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { client, bucket } = await getSupabaseClient();

    const { data, error } = await client.storage.from(bucket).download(fileId);
    if (error || !data) {
      throw error || new Error('Failed to download file from Supabase storage.');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    
    // Attempt to extract original filename from fileId (removes timestamp prefix)
    const underscoreIndex = fileId.indexOf('_');
    const filename = underscoreIndex !== -1 ? fileId.substring(underscoreIndex + 1) : fileId;

    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Server Supabase download error:', error);
    res.status(500).send(error.message || 'Failed to download file from Supabase');
  }
});

app.delete('/api/supabase/delete/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { client, bucket } = await getSupabaseClient();

    const { data, error } = await client.storage.from(bucket).remove([fileId]);
    if (error) {
      throw error;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Server Supabase delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file from Supabase' });
  }
});

// Google Drive Integration Endpoints
app.post('/api/drive/upload', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    const { fileName, mimeType, fileData } = req.body;
    if (!fileName || !mimeType || !fileData) {
      return res.status(400).json({ error: 'Missing fileName, mimeType, or fileData' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Extract base64 data
    const base64Data = fileData.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    const bufferStream = new PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
      name: fileName,
      // You can specify a folder ID here if you want to group uploads
    };
    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    res.json({
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
    });
  } catch (error: any) {
    console.error('Drive upload error:', error);
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
    oauth2Client.setCredentials({ access_token: accessToken });
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
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({ fileId });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Drive delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete from Google Drive' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const employee = req.body;
    const dummyUser = await getDummyUser();
    
    // Upsert logic using originalId
    const existing = await db.select().from(employees).where(eq(employees.originalId, employee.id)).limit(1);
    
    if (existing.length > 0) {
      await db.update(employees).set({
        photo: employee.photo,
        surname: employee.surname,
        firstName: employee.firstName,
        middleName: employee.middleName,
        nameExtension: employee.nameExtension,
        sex: employee.sex,
        civilStatus: employee.civilStatus,
        citizenship: employee.citizenship,
        height: employee.height,
        weight: employee.weight,
        bloodType: employee.bloodType,
        residentialAddress: employee.residentialAddress,
        permanentAddress: employee.permanentAddress,
        zipCode: employee.zipCode,
        telephone: employee.telephone,
        cellphone: employee.cellphone,
        email: employee.email,
        gsisNo: employee.gsisNo,
        pagibigNo: employee.pagibigNo,
        philhealthNo: employee.philhealthNo,
        sssNo: employee.sssNo,
        tin: employee.tin,
        agencyEmployeeNo: employee.agencyEmployeeNo,
        spouseSurname: employee.spouseSurname,
        spouseFirstName: employee.spouseFirstName,
        spouseMiddleName: employee.spouseMiddleName,
        spouseOccupation: employee.spouseOccupation,
        spouseEmployer: employee.spouseEmployer,
        spouseTelephone: employee.spouseTelephone,
        children: employee.children || [],
        fatherSurname: employee.fatherSurname,
        fatherFirstName: employee.fatherFirstName,
        fatherMiddleName: employee.fatherMiddleName,
        motherSurname: employee.motherSurname,
        motherFirstName: employee.motherFirstName,
        motherMiddleName: employee.motherMiddleName,
        education: employee.education || [],
        serviceRecords: employee.serviceRecords || [],
        attachments: employee.attachments || [],
        pdsScan: employee.pdsScan
      }).where(eq(employees.originalId, employee.id));
    } else {
      await db.insert(employees).values({
        userId: dummyUser.id,
        originalId: employee.id,
        photo: employee.photo,
        surname: employee.surname,
        firstName: employee.firstName,
        middleName: employee.middleName,
        nameExtension: employee.nameExtension,
        sex: employee.sex,
        civilStatus: employee.civilStatus,
        citizenship: employee.citizenship,
        height: employee.height,
        weight: employee.weight,
        bloodType: employee.bloodType,
        residentialAddress: employee.residentialAddress,
        permanentAddress: employee.permanentAddress,
        zipCode: employee.zipCode,
        telephone: employee.telephone,
        cellphone: employee.cellphone,
        email: employee.email,
        gsisNo: employee.gsisNo,
        pagibigNo: employee.pagibigNo,
        philhealthNo: employee.philhealthNo,
        sssNo: employee.sssNo,
        tin: employee.tin,
        agencyEmployeeNo: employee.agencyEmployeeNo,
        spouseSurname: employee.spouseSurname,
        spouseFirstName: employee.spouseFirstName,
        spouseMiddleName: employee.spouseMiddleName,
        spouseOccupation: employee.spouseOccupation,
        spouseEmployer: employee.spouseEmployer,
        spouseTelephone: employee.spouseTelephone,
        children: employee.children || [],
        fatherSurname: employee.fatherSurname,
        fatherFirstName: employee.fatherFirstName,
        fatherMiddleName: employee.fatherMiddleName,
        motherSurname: employee.motherSurname,
        motherFirstName: employee.motherFirstName,
        motherMiddleName: employee.motherMiddleName,
        education: employee.education || [],
        serviceRecords: employee.serviceRecords || [],
        attachments: employee.attachments || [],
        pdsScan: employee.pdsScan
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(employees).where(eq(employees.originalId, id));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

app.post('/api/employees/clear-all', async (req, res) => {
  try {
    const dummyUser = await getDummyUser();
    await db.delete(employees).where(eq(employees.userId, dummyUser.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to clear all data:', error);
    res.status(500).json({ error: 'Failed to clear all data' });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = currentDirname.endsWith('dist') ? currentDirname : path.join(currentDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Automatically open browser if running locally (not in Vercel)
    if (!process.env.VERCEL && process.env.NODE_ENV === 'production') {
      try {
        const { exec } = require('child_process');
        const os = require('os');
        const url = `http://localhost:${PORT}`;
        const platform = os.platform();
        if (platform === 'win32') {
          exec(`start ${url}`);
        } else if (platform === 'darwin') {
          exec(`open ${url}`);
        } else {
          exec(`xdg-open ${url}`);
        }
      } catch (err) {
        console.error('Could not open browser automatically:', err);
      }
    }
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
