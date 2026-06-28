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
app.get('/api/employees', async (req, res) => {
  try {
    const records = Object.values(dbCache);
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
