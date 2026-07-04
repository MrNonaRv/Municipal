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

export const checkServerConnection = async (retries = 2): Promise<boolean> => {
  const mode = getWorkMode();
  if (mode === 'local') {
    setServerReachable(false);
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for cold starts
    
    // Try both /api/health and /health as fallbacks
    const endpoints = ['/api/health', '/health'];
    let success = false;
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${window.location.origin}${endpoint}`;
        const response = await fetch(fullUrl, { 
          method: 'GET',
          cache: 'no-cache',
          signal: controller.signal 
        });
        
        if (response.ok) {
          success = true;
          break;
        }
      } catch (innerErr) {
        // Continue to next endpoint
      }
    }
    
    clearTimeout(timeoutId);
    
    if (success) {
      const wasReachable = lastServerReachable;
      setServerReachable(true);
      const pendingCount = getSyncQueue().length;
      if (!wasReachable && pendingCount > 0) {
        window.dispatchEvent(new CustomEvent('gers_trigger_sync'));
      }
      return true;
    } else if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return checkServerConnection(retries - 1);
    }
    setServerReachable(false);
    return false;
  } catch (e: any) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return checkServerConnection(retries - 1);
    }
    setServerReachable(false);
    return false;
  }
};

export interface SyncItem {
  id: string;
  type: 'PUT' | 'DELETE';
  data?: Employee;
  timestamp: number;
  retryCount?: number;
  lastError?: string;
}

const PARKED_KEY = 'gers_parked_sync_items';

export const getParkedItems = (): SyncItem[] => {
  try {
    const raw = localStorage.getItem(PARKED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return parsed;
  } catch (e) {
    console.error('[getParkedItems] Failed to parse parked items', e);
    return [];
  }
};

export const saveParkedItems = (items: SyncItem[]): void => {
  try {
    localStorage.setItem(PARKED_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[saveParkedItems] Failed to save parked items', e);
  }
};

export const parkSyncItem = (item: SyncItem): void => {
  console.log(`[parkSyncItem] Parking stuck item ID=${item.id}, Type=${item.type} due to repeated failures.`);
  const items = getParkedItems();
  if (!items.some(i => i.id === item.id && i.timestamp === item.timestamp)) {
    items.push(item);
    saveParkedItems(items);
  }
};

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

// Activity Log Management
export interface ActivityLog {
  id: string;
  timestamp: string;
  actionType: 'ADD' | 'MODIFY' | 'DELETE' | 'IMPORT' | 'CLEAR';
  message: string;
  details?: {
    employeeName: string;
    changes?: string[];
  };
}

const LOGS_KEY = 'gers_activity_logs';

export const getActivityLogs = (): ActivityLog[] => {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const addActivityLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
  const logs = getActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  // Keep only the last 100 logs
  const trimmed = logs.slice(0, 100);
  localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent('gers_activity_logs_change'));
};

export const clearActivityLogs = () => {
  localStorage.removeItem(LOGS_KEY);
  window.dispatchEvent(new CustomEvent('gers_activity_logs_change'));
};

export const compareEmployeeChanges = (oldEmp: Employee | undefined, newEmp: Employee) => {
  const fullName = `${newEmp.firstName || ''} ${newEmp.surname || ''}`.trim() || 'Unnamed Employee';
  if (!oldEmp) {
    return {
      actionType: 'ADD' as const,
      message: `Created new employee dossier for ${fullName}`,
      changes: ['Dossier created with initial information']
    };
  }

  const changes: string[] = [];

  // 1. Name Check
  const oldName = `${oldEmp.firstName || ''} ${oldEmp.surname || ''}`.trim();
  const newName = `${newEmp.firstName || ''} ${newEmp.surname || ''}`.trim();
  if (oldName !== newName) {
    changes.push(`Changed name from "${oldName || 'None'}" to "${newName}"`);
  }

  // 2. Photo Check
  if (oldEmp.photo !== newEmp.photo) {
    if (newEmp.photo) {
      changes.push('Uploaded new profile photo');
    } else {
      changes.push('Removed profile photo');
    }
  }

  // 3. PDS Scan Check
  if (oldEmp.pdsScan !== newEmp.pdsScan) {
    if (newEmp.pdsScan) {
      changes.push('Uploaded/Updated scanned Personal Data Sheet (PDS)');
    } else {
      changes.push('Removed scanned Personal Data Sheet (PDS)');
    }
  }

  // 4. Contact/Personal Details
  if (oldEmp.email !== newEmp.email) changes.push(`Updated email address to "${newEmp.email || 'None'}"`);
  if (oldEmp.cellphone !== newEmp.cellphone) changes.push(`Updated cellphone to "${newEmp.cellphone || 'None'}"`);
  if (oldEmp.civilStatus !== newEmp.civilStatus) changes.push(`Updated civil status to "${newEmp.civilStatus || 'None'}"`);
  if (oldEmp.residentialAddress !== newEmp.residentialAddress) changes.push(`Updated residential address`);
  
  // 5. Government ID Numbers
  if (oldEmp.gsisNo !== newEmp.gsisNo) changes.push(`Updated GSIS ID number`);
  if (oldEmp.pagibigNo !== newEmp.pagibigNo) changes.push(`Updated Pag-IBIG number`);
  if (oldEmp.philhealthNo !== newEmp.philhealthNo) changes.push(`Updated PhilHealth number`);
  if (oldEmp.sssNo !== newEmp.sssNo) changes.push(`Updated SSS number`);
  if (oldEmp.tin !== newEmp.tin) changes.push(`Updated TIN number`);

  // 6. Family check (Children)
  const oldChildrenCount = oldEmp.children?.length || 0;
  const newChildrenCount = newEmp.children?.length || 0;
  if (oldChildrenCount !== newChildrenCount) {
    changes.push(`Updated family details: changed children count from ${oldChildrenCount} to ${newChildrenCount}`);
  }

  // 7. Education Check
  const oldEduCount = oldEmp.education?.length || 0;
  const newEduCount = newEmp.education?.length || 0;
  if (oldEduCount !== newEduCount) {
    changes.push(`Updated education profile: changed records count from ${oldEduCount} to ${newEduCount}`);
  }

  // 8. Service Record Check
  const oldSrvCount = oldEmp.serviceRecords?.length || 0;
  const newSrvCount = newEmp.serviceRecords?.length || 0;
  if (oldSrvCount !== newSrvCount) {
    changes.push(`Updated service records: changed entries count from ${oldSrvCount} to ${newSrvCount}`);
  }

  // 9. Attachments Check
  const oldAtts = oldEmp.attachments || [];
  const newAtts = newEmp.attachments || [];
  
  // Find added/removed attachments
  const oldIds = new Set(oldAtts.map(a => a.id));
  const newIds = new Set(newAtts.map(a => a.id));
  
  const added = newAtts.filter(a => !oldIds.has(a.id));
  const removed = oldAtts.filter(a => !newIds.has(a.id));

  added.forEach(a => {
    changes.push(`Uploaded document attachment: "${a.name}" (${a.fileName})`);
  });
  removed.forEach(a => {
    changes.push(`Removed document attachment: "${a.name}"`);
  });

  // If there are no detectable fine-grained changes, add a generic edit statement
  if (changes.length === 0) {
    changes.push('Updated dossier details');
  }

  return {
    actionType: 'MODIFY' as const,
    message: `Modified employee dossier of ${fullName}`,
    changes
  };
};

// Flag to prevent overlapping sync operations
let isSyncing = false;
let lastSyncTime = 0;

export const getIsSyncing = (): boolean => {
  // If syncing has been "active" for more than 5 minutes, assume it's stuck and allow retry
  if (isSyncing && Date.now() - lastSyncTime > 300000) {
    console.warn('[getIsSyncing] Sync appears stuck (active for >5m). Resetting.');
    isSyncing = false;
  }
  return isSyncing || !!syncRetryTimeout;
};

let syncRetryCount = 0;
let syncRetryTimeout: NodeJS.Timeout | null = null;
const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY = 2000;

export const resetSyncRetry = () => {
  syncRetryCount = 0;
  if (syncRetryTimeout) {
    clearTimeout(syncRetryTimeout);
    syncRetryTimeout = null;
  }
};

// Sync function to process queue
export const syncOfflineData = async (
  onProgress?: (status: 'syncing' | 'success' | 'error' | 'retrying', pendingCount: number, retryData?: { attempt: number, nextRetryDelay: number }) => void
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
  
  if (syncRetryTimeout) {
    clearTimeout(syncRetryTimeout);
    syncRetryTimeout = null;
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    console.log('[syncOfflineData] Sync queue is empty. Nothing to sync.');
    if (onProgress) onProgress('success', 0);
    return;
  }

  isSyncing = true;
  lastSyncTime = Date.now();
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
          const payloadStr = JSON.stringify(item.data);
          let response;
          if (payloadStr.length > 500000) { // If larger than 500KB, use chunking
            console.log(`[syncOfflineData] Payload is ${payloadStr.length} bytes, using chunked upload`);
            const uploadId = item.id + '-' + Date.now();
            const CHUNK_SIZE = 500000;
            const totalChunks = Math.ceil(payloadStr.length / CHUNK_SIZE);
            
            for (let i = 0; i < totalChunks; i++) {
              const chunkData = payloadStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              response = await fetch('/api/employees/chunk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uploadId,
                  chunkIndex: i,
                  totalChunks,
                  data: chunkData
                })
              });
              if (!response.ok) {
                 throw new Error(`Server returned error status during chunk ${i}: ${response.status}`);
              }
            }
          } else {
            response = await fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payloadStr
            });
            console.log(`[syncOfflineData] POST response status: ${response.status} ${response.statusText}`);
            if (!response.ok) throw new Error(`Server returned error status: ${response.status}`);
          }
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
        
        // Track retries per individual item
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err.message || String(err);
        
        if (item.retryCount >= 5) {
          console.error(`[syncOfflineData] Item ${item.id} reached maximum individual retries (5). Parking it to prevent blocking.`);
          parkSyncItem(item);
          addSyncHistoryEvent({
            type: 'SYNC_ITEM_ERROR',
            message: `Permanently failed to sync item: ${item.type} for ${item.id} (Max retries reached). Item parked.`,
            details: item.lastError
          });
          // Dispatch custom event to notify App.tsx to display a notification/toast about the parked item
          window.dispatchEvent(new CustomEvent('gers_sync_parked_item', { detail: item }));
        } else {
          failedItems.push(item);
          addSyncHistoryEvent({
            type: 'SYNC_ITEM_ERROR',
            message: `Failed to sync item (Attempt ${item.retryCount}/5): ${item.type} for ${item.id}`,
            details: item.lastError
          });
        }
        
        // Only drop connection if it's likely a network error, not a logic error
        const isNetworkError = err.message?.includes('Failed to fetch') || 
                               err.message?.includes('NetworkError') || 
                               err.message?.includes('Aborted') ||
                               err.message?.includes('timeout');
                               
        if (mode === 'auto' && isNetworkError) {
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
      
      if (syncRetryCount < MAX_RETRY_COUNT) {
        syncRetryCount++;
        const delay = BASE_RETRY_DELAY * Math.pow(2, syncRetryCount - 1);
        console.log(`[syncOfflineData] Scheduling retry ${syncRetryCount}/${MAX_RETRY_COUNT} in ${delay}ms`);
        
        if (onProgress) onProgress('retrying', failedItems.length, { attempt: syncRetryCount, nextRetryDelay: delay });
        
        if (syncRetryTimeout) clearTimeout(syncRetryTimeout);
        syncRetryTimeout = setTimeout(() => {
          syncOfflineData(onProgress);
        }, delay);
      } else {
        console.error('[syncOfflineData] Max retry attempts reached. Stopping retries.');
        if (onProgress) onProgress('error', failedItems.length);
        resetSyncRetry();
      }
    } else {
      resetSyncRetry();
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
          const contentType = latestResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const latestData = await latestResponse.json();
            console.log(`[syncOfflineData] Successfully refreshed cache with ${latestData.length} records.`);
            saveLocalCache(latestData);
            setServerReachable(true);
            window.dispatchEvent(new CustomEvent('gers_data_synced', { detail: latestData }));
          } else {
            console.warn(`[syncOfflineData] Refresh fetch returned non-JSON response (likely HTML). Skipping cache refresh.`);
          }
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
  const online = isOnline();
  
  if (mode === 'local' || !online) {
    console.log(`[dbGetAll] Mode: ${mode}, Online: ${online}. Returning local cache.`);
    return getLocalCache();
  }
  
  try {
    const response = await fetch('/api/employees');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        saveLocalCache(data);
        setServerReachable(true);
        return data;
      } else {
        console.warn(`[dbGetAll] Server returned non-JSON response (likely HTML during restart). Using cache.`);
        return getLocalCache();
      }
    }
    console.warn(`[dbGetAll] Server returned non-OK status: ${response.status}. Using cache.`);
    return getLocalCache();
  } catch (error) {
    console.error('[dbGetAll] Fetch failed. Using cache.', error);
    setServerReachable(false);
    return getLocalCache();
  }
};

export const dbPut = async (emp: Employee): Promise<void> => {
  console.log(`[dbPut] Saving employee ID=${emp.id} (${emp.surname || ''}, ${emp.firstName || ''}).`);
  
  // Update local cache immediately
  const cache = getLocalCache();
  const idx = cache.findIndex(e => e.id === emp.id);
  const oldEmp = idx >= 0 ? cache[idx] : undefined;
  
  // Log the activity
  const comparison = compareEmployeeChanges(oldEmp, emp);
  addActivityLog({
    actionType: comparison.actionType,
    message: comparison.message,
    details: {
      employeeName: `${emp.firstName || ''} ${emp.surname || ''}`.trim() || 'Unnamed Employee',
      changes: comparison.changes
    }
  });

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
    const payloadStr = JSON.stringify(emp);
    let response;
    if (payloadStr.length > 500000) { // If larger than 500KB, use chunking
      console.log(`[dbPut] Payload is ${payloadStr.length} bytes, using chunked upload`);
      const uploadId = emp.id + '-' + Date.now();
      const CHUNK_SIZE = 500000;
      const totalChunks = Math.ceil(payloadStr.length / CHUNK_SIZE);
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = payloadStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        response = await fetch('/api/employees/chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            chunkIndex: i,
            totalChunks,
            data: chunkData
          })
        });
        if (!response.ok) {
           throw new Error(`Server returned error status during chunk ${i}: ${response.status}`);
        }
      }
    } else {
      console.log(`[dbPut] Sending POST /api/employees for ID=${emp.id}...`);
      response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr
      });
    }
    
    console.log(`[dbPut] Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    setServerReachable(true);
    removeFromSyncQueue(emp.id);
    if (getSyncQueue().length > 0) {
      console.log('[dbPut] Sync queue has pending items. Triggering syncOfflineData.');
      window.dispatchEvent(new CustomEvent('gers_trigger_sync'));
    }
  } catch (error: any) {
    console.warn(`[dbPut] Failed to save employee ${emp.id} to server. Saving offline to sync queue.`, error);
    if (mode === 'auto') {
      console.log('[dbPut] Marking server unreachable due to save failure.');
      setServerReachable(false);
    }
    addToSyncQueue({ id: emp.id, type: 'PUT', data: emp });
    window.dispatchEvent(new CustomEvent('gers_trigger_sync'));
  }
};

export const dbDelete = async (id: string): Promise<void> => {
  console.log(`[dbDelete] Deleting employee ID=${id}.`);
  
  const oldCache = getLocalCache();
  const emp = oldCache.find(e => e.id === id);
  const fullName = emp ? `${emp.firstName || ''} ${emp.surname || ''}`.trim() : 'Unknown Employee';
  
  addActivityLog({
    actionType: 'DELETE',
    message: `Deleted employee dossier for ${fullName}`,
    details: {
      employeeName: fullName,
      changes: [`Completely removed employee profile and dossier data (ID: ${id})`]
    }
  });

  // Update local cache immediately
  const cache = oldCache.filter(e => e.id !== id);
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
      window.dispatchEvent(new CustomEvent('gers_trigger_sync'));
    }
  } catch (error: any) {
    console.warn(`[dbDelete] Failed to delete employee ${id} on server. Queueing offline delete.`, error);
    if (mode === 'auto') {
      console.log('[dbDelete] Marking server unreachable due to delete failure.');
      setServerReachable(false);
    }
    addToSyncQueue({ id, type: 'DELETE' });
    window.dispatchEvent(new CustomEvent('gers_trigger_sync'));
  }
};

export const dbClearAll = async (): Promise<void> => {
  console.log('[dbClearAll] Clearing all database cache and calling server wipe...');
  
  addActivityLog({
    actionType: 'CLEAR',
    message: `Wiped entire personnel database`,
    details: {
      employeeName: 'System-wide Purge',
      changes: ['Cleared all cached dossiers, pending updates, uploaded document attachments, and remote server databases.']
    }
  });

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
