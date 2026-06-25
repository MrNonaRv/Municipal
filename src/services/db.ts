import { Employee } from '../types/employee';

// Cache keys
const CACHE_KEY = 'gers_employees_cache';
const QUEUE_KEY = 'gers_sync_queue';

export interface SyncItem {
  id: string;
  type: 'PUT' | 'DELETE';
  data?: Employee;
  timestamp: number;
}

// Helper to get local cache
export const getLocalCache = (): Employee[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse local employee cache', e);
    return [];
  }
};

// Helper to save local cache
export const saveLocalCache = (employees: Employee[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(employees));
  } catch (e) {
    console.error('Failed to save local employee cache', e);
  }
};

// Helper to get sync queue
export const getSyncQueue = (): SyncItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse sync queue', e);
    return [];
  }
};

// Helper to save sync queue
export const saveSyncQueue = (queue: SyncItem[]): void => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save sync queue', e);
  }
};

// Add to sync queue (merging duplicates)
export const addToSyncQueue = (item: Omit<SyncItem, 'timestamp'>): void => {
  const queue = getSyncQueue();
  const existingIdx = queue.findIndex(q => q.id === item.id);
  const newItem = { ...item, timestamp: Date.now() };

  if (existingIdx >= 0) {
    queue[existingIdx] = newItem;
  } else {
    queue.push(newItem);
  }
  saveSyncQueue(queue);
  
  // Dispatch custom event to notify UI
  window.dispatchEvent(new CustomEvent('gers_sync_status_change'));
};

// Flag to prevent overlapping sync operations
let isSyncing = false;

// Sync function to process queue
export const syncOfflineData = async (
  onProgress?: (status: 'syncing' | 'success' | 'error', pendingCount: number) => void
): Promise<void> => {
  if (isSyncing) return;
  const queue = getSyncQueue();
  if (queue.length === 0) {
    if (onProgress) onProgress('success', 0);
    return;
  }

  isSyncing = true;
  if (onProgress) onProgress('syncing', queue.length);

  try {
    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
    const failedItems: SyncItem[] = [];

    for (const item of sortedQueue) {
      try {
        if (item.type === 'PUT') {
          if (!item.data) throw new Error('No data provided for PUT operation');
          const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
          if (!response.ok) throw new Error('Server returned error status');
        } else if (item.type === 'DELETE') {
          const response = await fetch(`/api/employees/${item.id}`, {
            method: 'DELETE'
          });
          if (!response.ok) throw new Error('Server returned error status');
        }
      } catch (err) {
        console.error(`Failed to sync item ${item.id}`, err);
        failedItems.push(item);
      }
    }

    saveSyncQueue(failedItems);
    window.dispatchEvent(new CustomEvent('gers_sync_status_change'));

    if (failedItems.length > 0) {
      if (onProgress) onProgress('error', failedItems.length);
    } else {
      if (onProgress) onProgress('success', 0);
      try {
        const latestResponse = await fetch('/api/employees');
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          saveLocalCache(latestData);
          window.dispatchEvent(new CustomEvent('gers_data_synced', { detail: latestData }));
        }
      } catch (e) {
        console.warn('Sync succeeded but failed to refresh local cache', e);
      }
    }
  } catch (error) {
    console.error('Error during offline data sync:', error);
    if (onProgress) onProgress('error', queue.length);
  } finally {
    isSyncing = false;
  }
};

// Check connection status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Main API wrapper functions with transparent offline fallback

export const dbGetAll = async (): Promise<Employee[]> => {
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) throw new Error('Failed to fetch employees');
    const data = await response.json();
    saveLocalCache(data);
    return data;
  } catch (error) {
    console.warn('Failed to fetch employees from server, falling back to local cache:', error);
    const cached = getLocalCache();
    if (cached.length > 0) {
      return cached;
    }
    throw error;
  }
};

export const dbPut = async (emp: Employee): Promise<void> => {
  // Update local cache immediately
  const cache = getLocalCache();
  const idx = cache.findIndex(e => e.id === emp.id);
  if (idx >= 0) {
    cache[idx] = emp;
  } else {
    cache.push(emp);
  }
  saveLocalCache(cache);

  try {
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emp)
    });
    if (!response.ok) throw new Error('Failed to save employee');
    if (getSyncQueue().length > 0) {
      syncOfflineData();
    }
  } catch (error) {
    console.warn(`Failed to save employee ${emp.id} to server. Saving offline.`, error);
    addToSyncQueue({ id: emp.id, type: 'PUT', data: emp });
  }
};

export const dbDelete = async (id: string): Promise<void> => {
  // Update local cache immediately
  const cache = getLocalCache().filter(e => e.id !== id);
  saveLocalCache(cache);

  try {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete employee');
    if (getSyncQueue().length > 0) {
      syncOfflineData();
    }
  } catch (error) {
    console.warn(`Failed to delete employee ${id} on server. Queueing offline delete.`, error);
    addToSyncQueue({ id, type: 'DELETE' });
  }
};
