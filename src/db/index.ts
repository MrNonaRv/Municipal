import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs/promises';
import path from 'path';

export const createPool = () => {
  if (process.env.DATABASE_URL) {
    console.log('[DB] Creating PostgreSQL pool using DATABASE_URL...');
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1') ? false : {
        rejectUnauthorized: false
      }
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: process.env.VERCEL ? 3 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });
};

const pool = createPool();

let _drizzle: any = null;
function getDrizzle() {
  if (!_drizzle) {
    _drizzle = drizzle(pool, { schema });
  }
  return _drizzle;
}

pool.on('error', (err) => {
  // Idle client errors are often harmless as the pool handles them.
  // We log as warning unless it's clearly a critical failure.
  console.warn('PostgreSQL Pool: Unexpected error on idle client:', err.message);
});

async function tableExists(client: any, tableName: string): Promise<boolean> {
  try {
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = $1
      );
    `, [tableName]);
    return res.rows[0]?.exists || false;
  } catch (e) {
    return false;
  }
}

async function initializePostgresSchema(pgPool: Pool) {
  const client = await pgPool.connect();
  try {
    console.log('[DB] Checking if PostgreSQL tables need to be created for Supabase/Postgres...');
    
    const usersExist = await tableExists(client, 'users');
    if (!usersExist) {
      console.log('[DB] Table "users" does not exist. Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          uid TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      console.log('[DB] Table "users" already exists, skipping creation.');
    }
    
    const employeesExist = await tableExists(client, 'employees');
    if (!employeesExist) {
      console.log('[DB] Table "employees" does not exist. Creating employees table...');
      await client.query(`
        CREATE TABLE employees (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          original_id TEXT NOT NULL,
          photo TEXT,
          surname TEXT NOT NULL DEFAULT '',
          first_name TEXT NOT NULL DEFAULT '',
          middle_name TEXT DEFAULT '',
          name_extension TEXT DEFAULT '',
          sex TEXT DEFAULT '',
          civil_status TEXT DEFAULT '',
          citizenship TEXT DEFAULT '',
          height TEXT DEFAULT '',
          weight TEXT DEFAULT '',
          blood_type TEXT DEFAULT '',
          residential_address TEXT DEFAULT '',
          permanent_address TEXT DEFAULT '',
          zip_code TEXT DEFAULT '',
          telephone TEXT DEFAULT '',
          cellphone TEXT DEFAULT '',
          email TEXT DEFAULT '',
          gsis_no TEXT DEFAULT '',
          pagibig_no TEXT DEFAULT '',
          philhealth_no TEXT DEFAULT '',
          sss_no TEXT DEFAULT '',
          tin TEXT DEFAULT '',
          agency_employee_no TEXT DEFAULT '',
          spouse_surname TEXT DEFAULT '',
          spouse_first_name TEXT DEFAULT '',
          spouse_middle_name TEXT DEFAULT '',
          spouse_occupation TEXT DEFAULT '',
          spouse_employer TEXT DEFAULT '',
          spouse_telephone TEXT DEFAULT '',
          children JSONB DEFAULT '[]'::jsonb,
          father_surname TEXT DEFAULT '',
          father_first_name TEXT DEFAULT '',
          father_middle_name TEXT DEFAULT '',
          mother_surname TEXT DEFAULT '',
          mother_first_name TEXT DEFAULT '',
          mother_middle_name TEXT DEFAULT '',
          education JSONB DEFAULT '[]'::jsonb,
          service_records JSONB DEFAULT '[]'::jsonb,
          attachments JSONB DEFAULT '[]'::jsonb,
          pds_scan TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      console.log('[DB] Table "employees" already exists, skipping creation.');
    }
    
    console.log('[DB] PostgreSQL tables checked and verified.');
  } catch (err: any) {
    console.error('[DB] Failed to initialize PostgreSQL tables:', err.message);
  } finally {
    client.release();
  }
}

// Resilient Fallback State
let useFallbackMode = !process.env.SQL_HOST && !process.env.DATABASE_URL;
let connectionChecked = false;

export async function checkConnection() {
  if (connectionChecked) return;
  
  if (useFallbackMode) {
    connectionChecked = true;
    return;
  }
  
  try {
    const client = await pool.connect();
    console.log('[DB] Successfully connected to PostgreSQL database.');
    client.release();
    
    // Automatically initialize PostgreSQL schema tables
    await initializePostgresSchema(pool);
    
    connectionChecked = true;
  } catch (err: any) {
    console.warn('[DB] Failed to connect to PostgreSQL database. Falling back to local JSON database.', err.message);
    useFallbackMode = true;
    connectionChecked = true;
  }
}

if (useFallbackMode) {
  console.log('[DB] No SQL_HOST environment variable set. Using local JSON database (local_db.json) fallback.');
}

const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_DB_PATH = IS_VERCEL 
  ? path.join('/tmp', 'local_db.json') 
  : path.join(process.cwd(), 'local_db.json');

export function isFallbackActive() {
  return useFallbackMode;
}

export function getLocalDbPath() {
  return LOCAL_DB_PATH;
}

async function readLocalJsonDb() {
  try {
    const content = await fs.readFile(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // Return empty database schema if file not found or corrupted
    return {
      users: [
        { id: 1, uid: 'dummy_desktop_user', email: 'desktop_user@local', createdAt: new Date().toISOString() }
      ],
      employees: []
    };
  }
}

async function saveLocalJsonDb(data: any) {
  try {
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Fallback DB] Failed to write local JSON database:', err);
  }
}

function evaluateCondition(item: any, condition: any): boolean {
  if (!condition) return true;
  let columnName = '';
  let value: any = undefined;
  if (condition && Array.isArray(condition.queryChunks)) {
    const columnChunk = condition.queryChunks.find((chunk: any) => chunk && chunk.table !== undefined && chunk.name !== undefined);
    if (columnChunk) columnName = columnChunk.name;
    const paramChunk = condition.queryChunks.find((chunk: any) => chunk && chunk.value !== undefined && chunk.table === undefined && !Array.isArray(chunk.value));
    if (paramChunk) value = paramChunk.value;
  }
  let itemKey = columnName;
  if (columnName === 'user_id') itemKey = 'userId';
  else if (columnName === 'original_id') itemKey = 'originalId';
  else if (columnName === 'created_at') itemKey = 'createdAt';
  else if (columnName === 'uid') itemKey = 'uid';
  
  const itemVal = item[itemKey] !== undefined ? item[itemKey] : item[columnName];
  return itemVal === value;
}

const selectBuilder = {
  from: (table: any) => {
    let whereCondition: any = undefined;
    let limitValue: number | undefined = undefined;

    const execute = async () => {
      const data = await readLocalJsonDb();
      let list = (table === schema.employees ? data.employees : data.users) || [];
      if (whereCondition) {
        list = list.filter((item: any) => evaluateCondition(item, whereCondition));
      }
      if (limitValue !== undefined) {
        list = list.slice(0, limitValue);
      }
      return list;
    };

    const builderObj = {
      where: (condition: any) => {
        whereCondition = condition;
        return builderObj;
      },
      limit: (n: number) => {
        limitValue = n;
        return builderObj;
      },
      then: (onfulfilled: any) => {
        return execute().then(onfulfilled);
      }
    };

    return builderObj;
  }
};

const updateBuilder = (table: any) => {
  return {
    set: (data: any) => {
      return {
        where: (condition: any) => {
          const resultPromise = (async () => {
            const dbData = await readLocalJsonDb();
            const list = (table === schema.employees ? dbData.employees : dbData.users) || [];
            for (let i = 0; i < list.length; i++) {
              if (evaluateCondition(list[i], condition)) {
                list[i] = { ...list[i], ...data };
              }
            }
            await saveLocalJsonDb(dbData);
            return { rowCount: 1 };
          })();
          return {
            then: (onfulfilled: any) => resultPromise.then(onfulfilled)
          };
        }
      };
    }
  };
};

const insertBuilder = (table: any) => {
  return {
    values: (data: any) => {
      const runInsert = async () => {
        const dbData = await readLocalJsonDb();
        const list = (table === schema.employees ? dbData.employees : dbData.users) || [];
        let insertedItems: any[] = [];
        const itemsToInsert = Array.isArray(data) ? data : [data];
        for (const item of itemsToInsert) {
          if (table === schema.users) {
            const existingIdx = list.findIndex((u: any) => u.uid === item.uid);
            if (existingIdx >= 0) {
              list[existingIdx] = { ...list[existingIdx], ...item };
              insertedItems.push(list[existingIdx]);
            } else {
              const newItem = { id: list.length + 1, createdAt: new Date().toISOString(), ...item };
              list.push(newItem);
              insertedItems.push(newItem);
            }
          } else {
            const newItem = { id: list.length + 1, createdAt: new Date().toISOString(), ...item };
            list.push(newItem);
            insertedItems.push(newItem);
          }
        }
        await saveLocalJsonDb(dbData);
        return insertedItems;
      };
      const promise = runInsert();
      const onConflictBuilder = {
        returning: () => {
          return {
            then: (onfulfilled: any) => promise.then(onfulfilled)
          };
        }
      };
      return {
        onConflictDoUpdate: (config: any) => onConflictBuilder,
        returning: () => onConflictBuilder,
        then: (onfulfilled: any) => promise.then(onfulfilled)
      };
    }
  };
};

const deleteBuilder = (table: any) => {
  return {
    where: (condition: any) => {
      const resultPromise = (async () => {
        const dbData = await readLocalJsonDb();
        const list = (table === schema.employees ? dbData.employees : dbData.users) || [];
        const newList = list.filter((item: any) => !evaluateCondition(item, condition));
        if (table === schema.employees) {
          dbData.employees = newList;
        } else {
          dbData.users = newList;
        }
        await saveLocalJsonDb(dbData);
        return { rowCount: 1 };
      })();
      return {
        then: (onfulfilled: any) => resultPromise.then(onfulfilled)
      };
    }
  };
};

export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (useFallbackMode) {
      if (prop === 'select') return () => selectBuilder;
      if (prop === 'insert') return insertBuilder;
      if (prop === 'update') return updateBuilder;
      if (prop === 'delete') return deleteBuilder;
    }
    
    // Ensure we've at least tried to connect if not in fallback mode
    if (!connectionChecked) {
      // Note: We can't await here in a getter, but the first real query will handle it via its own async nature if we're careful.
      // However, checkConnection is fast if already checked.
      checkConnection();
    }

    const realDb = getDrizzle();
    const val = (realDb as any)[prop];
    if (typeof val === 'function') {
      return val.bind(realDb);
    }
    return val;
  }
});
