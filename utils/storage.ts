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
    } catch (e) {
      console.error(`Failed to set localStorage key: ${key}`, e);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export const storage = new StorageManager();
