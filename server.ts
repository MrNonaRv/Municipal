import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Create table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    )
  `);

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/employees', async (req, res) => {
    try {
      const rows = await db.all('SELECT data FROM employees');
      const employees = rows.map(row => {
        try {
          return JSON.parse(decrypt(row.data));
        } catch (e) {
          // If decryption fails, maybe it's not encrypted yet? (for migration)
          try {
            return JSON.parse(row.data);
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
      await db.run(
        'INSERT OR REPLACE INTO employees (id, data) VALUES (?, ?)',
        [employee.id, encryptedData]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save employee' });
    }
  });

  app.delete('/api/employees/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM employees WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

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

startServer();
