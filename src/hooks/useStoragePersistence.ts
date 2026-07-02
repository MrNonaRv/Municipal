import { useState, useEffect } from 'react';
import { getAccessToken, initAuth } from '../services/supabaseStorage';
import { getDriveAccessToken, initDriveAuth } from '../services/driveStorage';

export function useStoragePersistence() {
  const [isDriveConnected, setIsDriveConnected] = useState(() => {
    const provider = localStorage.getItem('gers_storage_provider');
    if (provider === 'supabase') return true;
    if (provider === 'gdrive') return !!localStorage.getItem('GersDriveAccessToken');
    return false;
  });

  const [driveUser, setDriveUser] = useState<any>(null);
  const [storageProvider, setStorageProvider] = useState<'supabase' | 'gdrive' | null>(() => {
    return localStorage.getItem('gers_storage_provider') as 'supabase' | 'gdrive' | null;
  });

  useEffect(() => {
    // 1. Initial Verification from cached tokens
    getAccessToken().then(token => {
      if (token && localStorage.getItem('gers_storage_provider') === 'supabase') {
        setIsDriveConnected(true);
        setStorageProvider('supabase');
      }
    });

    getDriveAccessToken().then(token => {
      if (token && (localStorage.getItem('gers_storage_provider') === 'gdrive' || !localStorage.getItem('gers_storage_provider'))) {
        setIsDriveConnected(true);
        setStorageProvider('gdrive');
      }
    });

    // 2. Setup Real-time Auth Listeners
    const unsubscribeSupabase = initAuth(
      (user, token) => {
        setIsDriveConnected(true);
        setDriveUser(user);
        setStorageProvider('supabase');
        localStorage.setItem('gers_storage_provider', 'supabase');
      },
      () => {
        if (localStorage.getItem('gers_storage_provider') === 'supabase') {
          // Verify we really lost access before clearing
          getAccessToken().then(token => {
            if (!token) {
              setIsDriveConnected(false);
              setDriveUser(null);
              setStorageProvider(null);
              localStorage.removeItem('gers_storage_provider');
            }
          });
        }
      }
    );

    const unsubscribeDrive = initDriveAuth(
      (user, token) => {
        setIsDriveConnected(true);
        setDriveUser(user);
        setStorageProvider('gdrive');
        localStorage.setItem('gers_storage_provider', 'gdrive');
      },
      () => {
        const hasToken = !!localStorage.getItem('GersDriveAccessToken');
        if (!hasToken && localStorage.getItem('gers_storage_provider') === 'gdrive') {
          setIsDriveConnected(false);
          setDriveUser(null);
          setStorageProvider(null);
          localStorage.removeItem('gers_storage_provider');
        }
      }
    );

    // 3. Listen for manual status changes (from UI toggles)
    const handleDriveStatusChanged = (e: any) => {
      setIsDriveConnected(e.detail.connected);
      if (e.detail.connected) {
        const provider = e.detail.provider || 'supabase';
        setStorageProvider(provider);
        setDriveUser(e.detail.user || { email: e.detail.email });
        localStorage.setItem('gers_storage_provider', provider);
      } else {
        setDriveUser(null);
        setStorageProvider(null);
        localStorage.removeItem('gers_storage_provider');
      }
    };

    window.addEventListener('gers_drive_status_changed', handleDriveStatusChanged);

    return () => {
      unsubscribeSupabase();
      unsubscribeDrive();
      window.removeEventListener('gers_drive_status_changed', handleDriveStatusChanged);
    };
  }, []);

  return {
    isDriveConnected,
    driveUser,
    storageProvider,
    setDriveUser,
    setIsDriveConnected,
    setStorageProvider
  };
}
