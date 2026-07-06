import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs/promises';
import path from 'path';

export const createPool = () => {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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

// Resilient Fallback State
let useFallbackMode = !(process.env.SQL_HOST || process.env.DATABASE_URL || process.env.POSTGRES_URL);
let connectionChecked = false;

async function checkConnection() {
  if (connectionChecked || useFallbackMode) return;
  
  try {
    const client = await pool.connect();
    console.log('[DB] Successfully connected to PostgreSQL database.');
    client.release();
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
    return {
      where: (condition: any) => {
        const resultPromise = (async () => {
          const data = await readLocalJsonDb();
          let list = (table === schema.employees ? data.employees : data.users) || [];
          if (condition) {
            list = list.filter((item: any) => evaluateCondition(item, condition));
          }
          return list;
        })();
        return {
          limit: (n: number) => {
            const limitPromise = (async () => {
              const list = await resultPromise;
              return list.slice(0, n);
            })();
            return {
              then: (onfulfilled: any) => limitPromise.then(onfulfilled)
            };
          },
          then: (onfulfilled: any) => resultPromise.then(onfulfilled)
        };
      },
      then: (onfulfilled: any) => {
        const resultPromise = (async () => {
          const data = await readLocalJsonDb();
          return (table === schema.employees ? data.employees : data.users) || [];
        })();
        return resultPromise.then(onfulfilled);
      }
    };
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
