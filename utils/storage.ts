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
  FAVORITES: 'streamhub_favorites', // 用户收藏夹
  SEARCH_HISTORY: 'streamhub_search_history', // 搜索历史
  USER_RATINGS: 'streamhub_user_ratings', // 用户评分
  CUSTOM_TAGS: 'streamhub_custom_tags', // 自定义标签
  MEDIA_TAGS: 'streamhub_media_tags', // 媒体标签关联
  WATCH_HISTORY: 'streamhub_watch_history', // 观影记录
  SUBSCRIPTIONS: 'streamhub_subscriptions', // 订阅提醒
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

  // 不应该同步到服务器的敏感 key
  private sensitiveKeys = new Set([
    STORAGE_KEYS.AUTH,  // 认证信息绝不同步
    'streamhub_token',   // API token
  ]);

  // Sync methods
  async loadFromServer(authToken?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch('/api/db', { headers });
      if (response.ok) {
        const data = await response.json();
        // Merge server data with local storage, server takes precedence
        // 但不覆盖敏感信息
        Object.keys(data).forEach(key => {
          if (!this.sensitiveKeys.has(key)) {
            localStorage.setItem(key, JSON.stringify(data[key]));
          }
        });
        console.log('Data loaded from server');
      } else if (response.status === 401) {
        console.log('需要认证才能同步数据');
      }
    } catch (e) {
      console.error('Failed to load data from server:', e);
    }
  }

  async saveToServer(authToken?: string): Promise<void> {
    try {
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // 敏感信息不同步到服务器
        if (key && !this.sensitiveKeys.has(key)) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      await fetch('/api/db', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error('Failed to save data to server:', e);
    }
  }
}

export const storage = new StorageManager();
