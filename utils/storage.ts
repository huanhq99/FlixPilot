/**
 * LocalStorage 统一管理工具
 * 避免重复的 JSON.parse/stringify 操作
 */

export const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  AUTH: 'streamhub_auth',
  EMBY_CONFIG: 'embyConfig',
  EMBY_LIBRARY: 'emby_library_cache',
  REQUESTS: 'requests',
  NOTIFICATIONS: 'streamhub_notifications',
  USERS: 'streamhub_users',
  SYNC_INTERVAL: 'sync_interval',
  TMDB_CONFIG: 'tmdb_config',
} as const;

class StorageManager {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Failed to parse localStorage key: ${key}`, e);
      return defaultValue;
    }
  }

  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // Debounce save to server to avoid too many requests
      this.debouncedSave();
    } catch (e) {
      console.error(`Failed to set localStorage key: ${key}`, e);
    }
  }

  private saveTimeout: any = null;
  private debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveToServer();
    }, 2000); // Save after 2 seconds of inactivity
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  // Sync methods
  async loadFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/db');
      if (response.ok) {
        const data = await response.json();
        // Merge server data with local storage, server takes precedence
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        console.log('Data loaded from server');
      }
    } catch (e) {
      console.error('Failed to load data from server:', e);
    }
  }

  async saveToServer(): Promise<void> {
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error('Failed to save data to server:', e);
    }
  }
}

export const storage = new StorageManager();
