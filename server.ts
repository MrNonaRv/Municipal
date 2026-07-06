import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import { exec } from 'child_process';
import os from 'os';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { google } from 'googleapis';
import initialDatabase from './database.json';

import { db, isFallbackActive, getLocalDbPath } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { loadGDriveConfig, setupDriveRoutes } from "./src/api/drive.ts";
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
  await loadGDriveConfig(firestoreDb, currentDirname);

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
        
        // Sync the newly seeded records to Firestore immediately
        await syncDrizzleToFirestore();
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

let lastDbSyncTime: string | null = null;

async function syncDrizzleToFirestore() {
  if (!isFallbackActive() || !firestoreDb) return;
  
  try {
    const localDbPath = getLocalDbPath();
    let content = '';
    try {
      content = await fs.promises.readFile(localDbPath, 'utf-8');
    } catch (err) {
      console.log('[Firebase] Local Drizzle DB file not found, skipping Firestore sync.');
      return;
    }
    
    console.log(`[Firebase] Syncing local Drizzle database (${content.length} bytes) to Firestore...`);
    const updatedAt = new Date().toISOString();
    lastDbSyncTime = updatedAt;
    
    if (content.length > 900000) {
      const numChunks = Math.ceil(content.length / 800000);
      await setDoc(doc(firestoreDb, 'system_sync', 'drizzle_local_db'), { 
        chunks: numChunks,
        updatedAt
      });
      for (let i = 0; i < numChunks; i++) {
        const chunk = content.slice(i * 800000, (i + 1) * 800000);
        await setDoc(doc(firestoreDb, 'system_sync', `drizzle_local_db_chunk_${i}`), { value: chunk });
      }
    } else {
      await setDoc(doc(firestoreDb, 'system_sync', 'drizzle_local_db'), { 
        value: content,
        updatedAt
      });
    }
    console.log('[Firebase] Drizzle fallback sync complete.');
  } catch (err) {
    console.error('[Firebase] Failed to sync Drizzle fallback to Firestore:', err);
  }
}

async function loadDrizzleFromFirestore() {
  if (!isFallbackActive() || !firestoreDb) return;
  
  try {
    const docRef = doc(firestoreDb, 'system_sync', 'drizzle_local_db');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (lastDbSyncTime && data.updatedAt && lastDbSyncTime === data.updatedAt) {
        return; // Already up to date
      }
      
      console.log('[Firebase] Attempting to restore Drizzle local database from Firestore...');
      let content = '';
      
      if (data.chunks) {
        console.log(`[Firebase] Restoring chunked database (${data.chunks} chunks)...`);
        for (let i = 0; i < data.chunks; i++) {
          const chunkSnap = await getDoc(doc(firestoreDb, 'system_sync', `drizzle_local_db_chunk_${i}`));
          if (chunkSnap.exists()) {
            content += chunkSnap.data().value;
          }
        }
      } else {
        content = data.value;
      }
      
      if (content) {
        const localDbPath = getLocalDbPath();
        await fs.promises.writeFile(localDbPath, content, 'utf-8');
        lastDbSyncTime = data.updatedAt || null;
        console.log(`[Firebase] Successfully restored Drizzle local database (${content.length} bytes) from Firestore.`);
      }
    } else {
      console.log('[Firebase] No Drizzle local database found in Firestore system_sync/drizzle_local_db.');
    }
  } catch (err) {
    console.error('[Firebase] Failed to restore Drizzle fallback from Firestore:', err);
  }
}

let isInitializing = false;

async function ensureDbLoaded() {
  if (dbLoaded) return;
  
  if (isInitializing) {
    console.log('[DB] Database initialization already in progress, waiting...');
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  isInitializing = true;
  try {
    await initFirebase();
    // Restore Drizzle fallback from Firestore BEFORE seeding or other operations
    await loadDrizzleFromFirestore();
    
    await loadDb(); // Old sync system
    await seedRealEmployeesIfNeeded();
    dbLoaded = true;
    console.log('[DB] Database system initialization complete.');

    // If we are in AI Studio, ensure our local state is pushed to Firestore
    if (!process.env.VERCEL) {
      console.log('[DB] Running in AI Studio, triggering proactive sync to Firestore...');
      await syncDrizzleToFirestore();
    }
  } catch (err) {
    console.error('[DB] Critical error during database initialization:', err);
  } finally {
    isInitializing = false;
  }
}

// Middleware to lazily load DB on requests
app.use(async (req, res, next) => {
  const isApi = req.url.startsWith('/api') || (req.route && req.route.path.startsWith('/api'));
  const isHealth = req.url === '/api/health' || req.url === '/health' || req.url.startsWith('/api/health?');
  
  if (isApi && !isHealth) {
    if (process.env.VERCEL) {
      // In Vercel, serverless functions can have stale memory. Always verify with Firestore before proceeding.
      if (!isInitializing) {
        try {
          if (!dbLoaded) {
            await ensureDbLoaded();
          } else {
            await loadDrizzleFromFirestore(); // Check if there are new updates
          }
        } catch (e) {
          console.error('[Vercel] Error during DB check:', e);
        }
      }
    } else {
      await ensureDbLoaded();
    }
  }
  next();
});

// API Routes
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const result = await db.select().from(employees).limit(1);
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + (e instanceof Error ? e.message : String(e));
  }

  res.json({ 
    status: 'ok', 
    db: dbStatus,
    time: new Date().toISOString(),
    env: process.env.VERCEL ? 'vercel' : 'standalone',
    uptime: process.uptime()
  });
});

app.get('/api/debug/db-status', async (req, res) => {
  try {
    const records = await db.select().from(employees);
    const localDbPath = getLocalDbPath();
    const stats = await fs.stat(localDbPath).catch(() => null);
    
    let firestoreStatus = 'not_initialized';
    if (firestoreDb) {
      const docSnap = await getDoc(doc(firestoreDb, 'system_sync', 'drizzle_local_db'));
      firestoreStatus = docSnap.exists() ? 'exists' : 'missing';
    }

    res.json({
      env: process.env.VERCEL ? 'vercel' : 'aistudio',
      recordsCount: records.length,
      localDbFile: {
        path: localDbPath,
        exists: !!stats,
        size: stats?.size || 0,
        mtime: stats?.mtime
      },
      firestore: firestoreStatus,
      isFallback: isFallbackActive()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
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

// Google Drive Integration Endpoints
setupDriveRoutes(app, firestoreDb, currentDirname);



const uploadChunks = new Map<string, string[]>();

app.post('/api/employees/chunk', async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, data } = req.body;
    
    if (!uploadChunks.has(uploadId)) {
      uploadChunks.set(uploadId, new Array(totalChunks));
    }
    
    const chunks = uploadChunks.get(uploadId)!;
    chunks[chunkIndex] = data;
    
    // Check if all chunks are received
    const receivedCount = chunks.filter(c => c !== undefined).length;
    
    if (receivedCount === totalChunks) {
      const fullDataStr = chunks.join('');
      uploadChunks.delete(uploadId);
      
      const employee = JSON.parse(fullDataStr);
      req.body = employee;
      
      // Manually process the employee insertion/update
      const dummyUser = await getDummyUser();
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
      
      await syncDrizzleToFirestore();
      return res.json({ success: true, completed: true });
    } else {
      return res.json({ success: true, completed: false, received: receivedCount });
    }
  } catch (error: any) {
    console.error('Error in chunked upload:', error);
    res.status(500).json({ 
      error: 'Failed to process chunk',
      message: error.message,
      stack: error.stack
    });
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

    await syncDrizzleToFirestore();
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ 
      error: 'Failed to save employee', 
      message: error.message, 
      stack: error.stack 
    });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(employees).where(eq(employees.originalId, id));

    await syncDrizzleToFirestore();
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ 
      error: 'Failed to delete employee', 
      message: error.message, 
      stack: error.stack 
    });
  }
});

app.post('/api/employees/clear-all', async (req, res) => {
  try {
    const dummyUser = await getDummyUser();
    await db.delete(employees).where(eq(employees.userId, dummyUser.id));

    await syncDrizzleToFirestore();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to clear all data:', error);
    res.status(500).json({ error: 'Failed to clear all data', message: error.message, stack: error.stack });
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
