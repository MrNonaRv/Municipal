import { Employee } from '../types/employee';

// Cache keys
const CACHE_KEY = 'gers_employees_cache';
const QUEUE_KEY = 'gers_sync_queue';

export type WorkMode = 'auto' | 'local' | 'online';

export const getWorkMode = (): WorkMode => {
  return 'auto';
};

export const setWorkMode = (mode: WorkMode): void => {
  window.dispatchEvent(new CustomEvent('gers_work_mode_change', { detail: 'auto' }));
};

// In-memory server reachability cache
let lastServerReachable = true;

export const setServerReachable = (reachable: boolean): void => {
  if (lastServerReachable !== reachable) {
    lastServerReachable = reachable;
    window.dispatchEvent(new CustomEvent('gers_server_reachability_change', { detail: reachable }));
  }
};

export const getServerReachable = (): boolean => {
  return lastServerReachable;
};

export const checkServerConnection = async (): Promise<boolean> => {
  const mode = getWorkMode();
  console.log(`[checkServerConnection] Checking connection. WorkMode: ${mode}, navigator.onLine: ${navigator.onLine}`);
  if (mode === 'local') {
    console.log('[checkServerConnection] WorkMode is "local", skipping connection check and marking server unreachable.');
    setServerReachable(false);
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[checkServerConnection] Connection check timed out after 10000ms.');
      controller.abort();
    }, 10000);
    
    console.log('[checkServerConnection] Fetching /api/health...');
    const response = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    console.log(`[checkServerConnection] /api/health response received. Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
      const wasReachable = lastServerReachable;
      console.log(`[checkServerConnection] Server is reachable. wasReachable was: ${wasReachable}`);
      setServerReachable(true);
      // If we just reconnected and we have items in sync queue, automatically trigger a sync!
      const pendingCount = getSyncQueue().length;
      if (!wasReachable && pendingCount > 0) {
        console.log(`[checkServerConnection] Connection recovered and we have ${pendingCount} pending items. Triggering auto-sync.`);
        syncOfflineData();
      }
      return true;
    } else {
      console.warn(`[checkServerConnection] Server returned non-OK status: ${response.status}`);
      setServerReachable(false);
      return false;
    }
  } catch (e: any) {
    console.error('[checkServerConnection] Connection check failed with error:', e);
    setServerReachable(false);
    return false;
  }
};

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
    const parsed = raw ? JSON.parse(raw) : [];
    console.log(`[getLocalCache] Loaded ${parsed.length} employees from local storage.`);
    return parsed;
  } catch (e) {
    console.error('[getLocalCache] Failed to parse local employee cache', e);
    return [];
  }
};

// Helper to save local cache
export const saveLocalCache = (employees: Employee[]): void => {
  try {
    console.log(`[saveLocalCache] Saving ${employees.length} employees to local storage.`);
    localStorage.setItem(CACHE_KEY, JSON.stringify(employees));
  } catch (e) {
    console.error('[saveLocalCache] Failed to save local employee cache', e);
  }
};

// Helper to get sync queue
export const getSyncQueue = (): SyncItem[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (parsed.length > 0) {
      console.log(`[getSyncQueue] Found ${parsed.length} pending items in the sync queue.`);
    }
    return parsed;
  } catch (e) {
    console.error('[getSyncQueue] Failed to parse sync queue', e);
    return [];
  }
};

// Helper to save sync queue
export const saveSyncQueue = (queue: SyncItem[]): void => {
  try {
    console.log(`[saveSyncQueue] Saving sync queue with ${queue.length} items.`);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[saveSyncQueue] Failed to save sync queue', e);
  }
};

// Add to sync queue (merging duplicates)
export const addToSyncQueue = (item: Omit<SyncItem, 'timestamp'>): void => {
  console.log(`[addToSyncQueue] Queueing item: ID=${item.id}, Type=${item.type}`);
  const queue = getSyncQueue();
  const existingIdx = queue.findIndex(q => q.id === item.id);
  const newItem = { ...item, timestamp: Date.now() };

  if (existingIdx >= 0) {
    console.log(`[addToSyncQueue] Found existing item for ID=${item.id} at index ${existingIdx}. Overwriting.`);
    queue[existingIdx] = newItem;
  } else {
    console.log(`[addToSyncQueue] Adding new item for ID=${item.id} to queue.`);
    queue.push(newItem);
  }
  saveSyncQueue(queue);
  
  // Dispatch custom event to notify UI
  window.dispatchEvent(new CustomEvent('gers_sync_status_change'));
};

export const removeFromSyncQueue = (id: string): void => {
  console.log(`[removeFromSyncQueue] Removing ID=${id} from sync queue.`);
  const queue = getSyncQueue().filter(q => q.id !== id);
  saveSyncQueue(queue);
  window.dispatchEvent(new CustomEvent('gers_sync_status_change'));
};

// Sync History Management
export interface SyncHistoryEvent {
  id: string;
  timestamp: string;
  type: 'SYNC_START' | 'SYNC_SUCCESS' | 'SYNC_ERROR' | 'SYNC_ITEM_SUCCESS' | 'SYNC_ITEM_ERROR' | 'ONLINE_STATUS_CHANGE' | 'WORK_MODE_CHANGE';
  message: string;
  details?: any;
}

const HISTORY_KEY = 'gers_sync_history';

export const getSyncHistory = (): SyncHistoryEvent[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const addSyncHistoryEvent = (event: Omit<SyncHistoryEvent, 'id' | 'timestamp'>) => {
  const history = getSyncHistory();
  const newEvent: SyncHistoryEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
  history.unshift(newEvent); // Add to beginning
  // Keep only last 20 events to avoid unbounded growth
  const trimmed = history.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent('gers_sync_history_change'));
};

// Flag to prevent overlapping sync operations
let isSyncing = false;

// Sync function to process queue
export const syncOfflineData = async (
  onProgress?: (status: 'syncing' | 'success' | 'error', pendingCount: number) => void
): Promise<void> => {
  const mode = getWorkMode();
  console.log(`[syncOfflineData] Starting sync. WorkMode: ${mode}, isSyncing: ${isSyncing}`);
  
  if (mode === 'local') {
    console.log('[syncOfflineData] WorkMode is "local". Skipping sync processing.');
    if (onProgress) onProgress('success', getSyncQueue().length);
    return;
  }
  if (isSyncing) {
    console.warn('[syncOfflineData] Sync is already in progress. Aborting duplicate sync request.');
    return;
  }
  const queue = getSyncQueue();
  if (queue.length === 0) {
    console.log('[syncOfflineData] Sync queue is empty. Nothing to sync.');
    if (onProgress) onProgress('success', 0);
    return;
  }

  isSyncing = true;
  if (onProgress) onProgress('syncing', queue.length);
  
  addSyncHistoryEvent({
    type: 'SYNC_START',
    message: `Started syncing ${queue.length} items.`,
  });

  try {
    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
    const failedItems: SyncItem[] = [];
    let connectionDropped = false;

    console.log(`[syncOfflineData] Processing ${sortedQueue.length} items in temporal order...`);

    for (const item of sortedQueue) {
      if (connectionDropped) {
        console.warn(`[syncOfflineData] Skipping item ${item.id} because previous connection dropped.`);
        failedItems.push(item);
        continue;
      }
      
      console.log(`[syncOfflineData] Syncing item ID=${item.id}, Type=${item.type}...`);
      try {
        if (item.type === 'PUT') {
          if (!item.data) throw new Error('No data provided for PUT operation');
          console.log(`[syncOfflineData] Sending POST /api/employees for ID=${item.id}`);
          const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
          console.log(`[syncOfflineData] POST response status: ${response.status} ${response.statusText}`);
          if (!response.ok) throw new Error(`Server returned error status: ${response.status}`);
        } else if (item.type === 'DELETE') {
          console.log(`[syncOfflineData] Sending DELETE /api/employees/${item.id}`);
          const response = await fetch(`/api/employees/${item.id}`, {
            method: 'DELETE'
          });
          console.log(`[syncOfflineData] DELETE response status: ${response.status} ${response.statusText}`);
          if (!response.ok) throw new Error(`Server returned error status: ${response.status}`);
        }
        console.log(`[syncOfflineData] Successfully synced item ${item.id}`);
        addSyncHistoryEvent({
          type: 'SYNC_ITEM_SUCCESS',
          message: `Successfully synced item: ${item.type} for ${item.id}`,
        });
      } catch (err: any) {
        console.error(`[syncOfflineData] Failed to sync item ${item.id}:`, err);
        failedItems.push(item);
        addSyncHistoryEvent({
          type: 'SYNC_ITEM_ERROR',
          message: `Failed to sync item: ${item.type} for ${item.id}`,
          details: err.message
        });
        if (mode === 'auto') {
          connectionDropped = true;
          setServerReachable(false);
          console.warn('[syncOfflineData] Server connection dropped during sync. Marking server unreachable.');
        }
      }
    }

    console.log(`[syncOfflineData] Finished processing. Remaining failed items: ${failedItems.length}`);
    saveSyncQueue(failedItems);
    window.dispatchEvent(new CustomEvent('gers_sync_status_change'));

    if (failedItems.length > 0) {
      console.error(`[syncOfflineData] Sync finished with errors. ${failedItems.length} items remain in queue.`);
      addSyncHistoryEvent({
        type: 'SYNC_ERROR',
        message: `Sync finished with ${failedItems.length} failed items.`,
      });
      if (onProgress) onProgress('error', failedItems.length);
    } else {
      console.log('[syncOfflineData] All items synced successfully! Fetching latest employees list to refresh cache...');
      addSyncHistoryEvent({
        type: 'SYNC_SUCCESS',
        message: 'All items synchronized successfully.',
      });
      if (onProgress) onProgress('success', 0);
      try {
        const latestResponse = await fetch('/api/employees');
        console.log(`[syncOfflineData] Refresh fetch status: ${latestResponse.status}`);
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          console.log(`[syncOfflineData] Successfully refreshed cache with ${latestData.length} records.`);
          saveLocalCache(latestData);
          setServerReachable(true);
          window.dispatchEvent(new CustomEvent('gers_data_synced', { detail: latestData }));
        } else {
          console.warn(`[syncOfflineData] Refresh fetch failed with status: ${latestResponse.status}`);
        }
      } catch (e: any) {
        console.error('[syncOfflineData] Sync succeeded but failed to refresh local cache', e);
      }
    }
  } catch (error: any) {
    console.error('[syncOfflineData] Critical error during offline data sync:', error);
    if (onProgress) onProgress('error', queue.length);
  } finally {
    isSyncing = false;
  }
};

// Check connection status
export const isOnline = (): boolean => {
  const mode = getWorkMode();
  let result = false;
  if (mode === 'local') {
    result = false;
  } else if (mode === 'online') {
    result = navigator.onLine;
  } else {
    result = navigator.onLine && lastServerReachable;
  }
  console.log(`[isOnline] Evaluated online status: ${result}. WorkMode: ${mode}, navigator.onLine: ${navigator.onLine}, lastServerReachable: ${lastServerReachable}`);
  return result;
};

// Main API wrapper functions with transparent offline fallback

export const dbGetAll = async (): Promise<Employee[]> => {
  const mode = getWorkMode();
  const online = navigator.onLine;
  console.log(`[dbGetAll] Fetching all employees. Mode: ${mode}, navigator.onLine: ${online}, lastServerReachable: ${lastServerReachable}`);
  
  if (mode === 'local') {
    console.log('[dbGetAll] Mode is "local". Returning local cache.');
    return getLocalCache();
  }
  if (mode === 'auto' && (!online || !lastServerReachable)) {
    console.warn(`[dbGetAll] Offline fallback (online: ${online}, reachable: ${lastServerReachable}). Returning local cache.`);
    return getLocalCache();
  }
  try {
    console.log('[dbGetAll] Fetching from /api/employees...');
    const response = await fetch('/api/employees');
    console.log(`[dbGetAll] Response received: ${response.status} ${response.statusText}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    console.log(`[dbGetAll] Loaded ${data.length} employees from server. Saving to local cache.`);
    saveLocalCache(data);
    setServerReachable(true);
    return data;
  } catch (error: any) {
    console.warn('[dbGetAll] Failed to fetch employees from server, falling back to local cache:', error);
    if (mode === 'auto') {
      console.log('[dbGetAll] Marking server unreachable due to fetch failure.');
      setServerReachable(false);
    }
    return getLocalCache();
  }
};

export const dbPut = async (emp: Employee): Promise<void> => {
  console.log(`[dbPut] Saving employee ID=${emp.id} (${emp.surname || ''}, ${emp.firstName || ''}).`);
  
  // Update local cache immediately
  const cache = getLocalCache();
  const idx = cache.findIndex(e => e.id === emp.id);
  if (idx >= 0) {
    console.log(`[dbPut] Updating existing employee in local cache at index ${idx}.`);
    cache[idx] = emp;
  } else {
    console.log('[dbPut] Adding new employee to local cache.');
    cache.push(emp);
  }
  saveLocalCache(cache);

  const mode = getWorkMode();
  const online = navigator.onLine;
  
  if (mode === 'local') {
    console.log('[dbPut] Mode is "local". Adding to sync queue.');
    addToSyncQueue({ id: emp.id, type: 'PUT', data: emp });
    return;
  }
  if (mode === 'auto' && (!online || !lastServerReachable)) {
    console.warn(`[dbPut] Offline state detected (online: ${online}, reachable: ${lastServerReachable}). Queueing update.`);
    addToSyncQueue({ id: emp.id, type: 'PUT', data: emp });
    return;
  }

  try {
    console.log(`[dbPut] Sending POST /api/employees for ID=${emp.id}...`);
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emp)
    });
    console.log(`[dbPut] Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    setServerReachable(true);
    removeFromSyncQueue(emp.id);
    if (getSyncQueue().length > 0) {
      console.log('[dbPut] Sync queue has pending items. Triggering syncOfflineData.');
      syncOfflineData();
    }
  } catch (error: any) {
    console.warn(`[dbPut] Failed to save employee ${emp.id} to server. Saving offline to sync queue.`, error);
    if (mode === 'auto') {
      console.log('[dbPut] Marking server unreachable due to save failure.');
      setServerReachable(false);
    }
    addToSyncQueue({ id: emp.id, type: 'PUT', data: emp });
  }
};

export const dbDelete = async (id: string): Promise<void> => {
  console.log(`[dbDelete] Deleting employee ID=${id}.`);
  
  // Update local cache immediately
  const cache = getLocalCache().filter(e => e.id !== id);
  console.log(`[dbDelete] Removed from local cache. New cache count: ${cache.length}`);
  saveLocalCache(cache);

  const mode = getWorkMode();
  const online = navigator.onLine;
  
  if (mode === 'local') {
    console.log('[dbDelete] Mode is "local". Adding DELETE to sync queue.');
    addToSyncQueue({ id, type: 'DELETE' });
    return;
  }
  if (mode === 'auto' && (!online || !lastServerReachable)) {
    console.warn(`[dbDelete] Offline state detected (online: ${online}, reachable: ${lastServerReachable}). Queueing delete.`);
    addToSyncQueue({ id, type: 'DELETE' });
    return;
  }

  try {
    console.log(`[dbDelete] Sending DELETE /api/employees/${id}...`);
    const response = await fetch(`/api/employees/${id}`, {
      method: 'DELETE'
    });
    console.log(`[dbDelete] Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    setServerReachable(true);
    removeFromSyncQueue(id);
    if (getSyncQueue().length > 0) {
      console.log('[dbDelete] Sync queue has pending items. Triggering syncOfflineData.');
      syncOfflineData();
    }
  } catch (error: any) {
    console.warn(`[dbDelete] Failed to delete employee ${id} on server. Queueing offline delete.`, error);
    if (mode === 'auto') {
      console.log('[dbDelete] Marking server unreachable due to delete failure.');
      setServerReachable(false);
    }
    addToSyncQueue({ id, type: 'DELETE' });
  }
};

export const dbClearAll = async (): Promise<void> => {
  console.log('[dbClearAll] Clearing all database cache and calling server wipe...');
  
  // Clear local storage cache
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(QUEUE_KEY);
  
  // Mark system as cleared so we don't auto-seed
  localStorage.setItem('gers_seeded_blocked', 'true');

  const mode = getWorkMode();
  if (mode === 'local') {
    console.log('[dbClearAll] Mode is "local". Cleared local cache only.');
    window.dispatchEvent(new CustomEvent('gers_sync_status_change'));
    window.dispatchEvent(new CustomEvent('gers_data_synced', { detail: [] }));
    return;
  }

  try {
    const response = await fetch('/api/employees/clear-all', {
      method: 'POST'
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    console.log('[dbClearAll] Server database cleared successfully.');
    
    window.dispatchEvent(new CustomEvent('gers_sync_status_change'));
    window.dispatchEvent(new CustomEvent('gers_data_synced', { detail: [] }));
  } catch (error) {
    console.error('[dbClearAll] Failed to clear database on server:', error);
    throw error;
  }
};
