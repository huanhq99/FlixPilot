import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MonitorPlay, 
  Search, 
  LayoutGrid,
  List as ListIcon,
  Sun,
  Moon,
  Loader2,
  Film,
  RefreshCw,
  ArrowUp,
  Settings,
  LogOut,
  User as UserIcon,
  ScrollText,
  X,
  Heart,
  Dices,
  History,
  Share2,
  Sparkles,
  Calendar,
  Star as StarIcon,
  BarChart3
} from 'lucide-react';
import { TMDB_API_KEY, TMDB_BASE_URL } from './constants';
import { MediaItem, FilterState, EmbyConfig, AuthState, RequestItem, FavoriteItem, UserRating, CustomTag, MediaTag, WatchHistory, Subscription } from './types';
import { processMediaItem, fetchDetails, fetchPersonDetails, getTmdbConfig } from './services/tmdbService';
import { fetchEmbyLibrary } from './services/embyService';
import { sendTelegramNotification } from './services/notificationService';
import { storage, STORAGE_KEYS } from './utils/storage';
import { logger, LogEntry } from './utils/logger';
import { ToastProvider, useToast } from './components/Toast';
import Filters from './components/Filters';
import MediaCard from './components/MediaCard';
import DetailModal from './components/DetailModal';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import PersonModal from './components/PersonModal';
import MyListModal from './components/MyListModal';
import CalendarModal from './components/CalendarModal';
import PlaybackReportModal from './components/PlaybackReportModal';

function AppContent() {
  const toast = useToast();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isDarkMode, setIsDarkMode] = useState(() => storage.get(STORAGE_KEYS.DARK_MODE, false));

  // Person Modal State
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [personCredits, setPersonCredits] = useState<any[]>([]);

  // Auth State
  const [authState, setAuthState] = useState<AuthState>(() => 
    storage.get(STORAGE_KEYS.AUTH, {
          isAuthenticated: false,
          user: null,
          serverUrl: '',
          accessToken: '',
          isAdmin: false,
          isGuest: false
    })
  );

  // Emby State
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showMyList, setShowMyList] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPlaybackReport, setShowPlaybackReport] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleOpenLogs = () => {
      setLogs(logger.getLogs());
      setShowLogs(true);
  };

  const handleClearLogs = () => {
      logger.clear();
      setLogs([]);
  };

  const [embyConfig, setEmbyConfig] = useState<EmbyConfig>(() => {
      const savedAuth = storage.get<AuthState | null>(STORAGE_KEYS.AUTH, null);
      if (savedAuth?.isAuthenticated) {
          return { serverUrl: savedAuth.serverUrl, apiKey: savedAuth.accessToken };
      }
      return storage.get(STORAGE_KEYS.EMBY_CONFIG, { serverUrl: '', apiKey: '' });
  });
  const [embyLibrary, setEmbyLibrary] = useState<Set<string>>(() => {
      const saved = storage.get<string[]>(STORAGE_KEYS.EMBY_LIBRARY, []);
      return new Set(saved);
  });
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(() => 
      storage.get('streamhub_selected_libraries', [])
  );
  const [syncingEmby, setSyncingEmby] = useState(false);
  const [syncInterval, setSyncInterval] = useState(() => storage.get(STORAGE_KEYS.SYNC_INTERVAL, 15));

  // 收藏夹状态
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => 
    storage.get(STORAGE_KEYS.FAVORITES, [])
  );

  // 用户评分状态
  const [userRatings, setUserRatings] = useState<UserRating[]>(() =>
    storage.get(STORAGE_KEYS.USER_RATINGS, [])
  );

  // 自定义标签状态
  const [customTags, setCustomTags] = useState<CustomTag[]>(() =>
    storage.get(STORAGE_KEYS.CUSTOM_TAGS, [])
  );

  // 媒体标签关联
  const [mediaTags, setMediaTags] = useState<MediaTag[]>(() =>
    storage.get(STORAGE_KEYS.MEDIA_TAGS, [])
  );

  // 观影记录
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>(() =>
    storage.get(STORAGE_KEYS.WATCH_HISTORY, [])
  );

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => 
    storage.get(STORAGE_KEYS.SEARCH_HISTORY, [])
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // System Settings
  const [systemSettings, setSystemSettings] = useState(() => {
      try {
          const saved = localStorage.getItem('streamhub_settings');
          return saved ? JSON.parse(saved) : { scanInterval: 15, websiteTitle: 'StreamHub - Global Media Monitor', faviconUrl: '' };
      } catch (e) {
          return { scanInterval: 15, websiteTitle: 'StreamHub - Global Media Monitor', faviconUrl: '' };
      }
  });

  const [filters, setFilters] = useState<FilterState>({
      type: 'all',
      genre: '',
      region: '',
      platform: '',
      year: '全部',
      sort: 'popularity.desc'
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storage.set(STORAGE_KEYS.DARK_MODE, isDarkMode);
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
      document.title = systemSettings.websiteTitle || 'StreamHub - Global Media Monitor';
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = systemSettings.faviconUrl || '/favicon.svg';
  }, [systemSettings.websiteTitle, systemSettings.faviconUrl]);

  // Handle Login
  const handleLogin = useCallback((auth: AuthState) => {
      setAuthState(auth);
      storage.set(STORAGE_KEYS.AUTH, auth);
      
      if (!auth.isGuest) {
          // 优先使用后端配置的 Emby，其次使用登录时获取的
          const currentEmbyConfig = storage.get(STORAGE_KEYS.EMBY_CONFIG, { serverUrl: '', apiKey: '' });
          const newConfig = currentEmbyConfig.apiKey 
              ? currentEmbyConfig  // 使用后端配置
              : { serverUrl: auth.serverUrl, apiKey: auth.accessToken }; // 使用登录获取的
          
          setEmbyConfig(newConfig);
          
          // Trigger sync if server is configured
          if (newConfig.serverUrl && newConfig.apiKey) {
              console.log('🔄 登录成功，开始同步 Emby 媒体库...');
              syncEmbyLibrary(newConfig);
          }
      }
  }, []);

  const handleLogout = () => {
      const emptyAuth = {
          isAuthenticated: false,
          user: null,
          serverUrl: '',
          accessToken: '',
          isAdmin: false,
          isGuest: false
      };
      setAuthState(emptyAuth);
      localStorage.removeItem('streamhub_auth');
      setEmbyLibrary(new Set());
  };

  // Initial Emby Sync
  useEffect(() => {
      if (authState.isAuthenticated && embyConfig.serverUrl && embyConfig.apiKey) {
          syncEmbyLibrary(embyConfig);
      }
  }, []); 

  // 从后端加载配置 (config.json) - 后端配置优先!
  useEffect(() => {
      fetch('/api/config')
          .then(res => res.json())
          .then(serverConfig => {
              console.log('📦 后端配置:', serverConfig);
              
              // 后端配置了 Emby 就用后端的 (后端优先!)
              if (serverConfig.emby?.configured && serverConfig.emby.serverUrl) {
                  console.log('✅ 使用后端 Emby 配置:', serverConfig.emby.serverUrl);
                  const newConfig = {
                      serverUrl: serverConfig.emby.serverUrl,
                      serverUrlInternal: serverConfig.emby.serverUrlInternal || '',
                      serverUrlExternal: serverConfig.emby.serverUrlExternal || '',
                      apiKey: serverConfig.emby.apiKey
                  };
                  setEmbyConfig(newConfig);
                  storage.set(STORAGE_KEYS.EMBY_CONFIG, newConfig);
              }
              
              // 后端配置了 MoviePilot 就用后端的
              if (serverConfig.moviepilot?.configured && serverConfig.moviepilot.url) {
                  console.log('✅ 使用后端 MoviePilot 配置:', serverConfig.moviepilot.url);
                  const localNotify = storage.get(STORAGE_KEYS.NOTIFICATIONS, {}) as any;
                  const newNotify = {
                      ...localNotify,
                      moviePilotUrl: serverConfig.moviepilot.url,
                      moviePilotUsername: serverConfig.moviepilot.username,
                      moviePilotSubscribeUser: serverConfig.moviepilot.subscribeUser
                  };
                  storage.set(STORAGE_KEYS.NOTIFICATIONS, newNotify);
              }
              
              // 后端配置了 Telegram 就用后端的
              if (serverConfig.telegram?.configured && serverConfig.telegram.botToken) {
                  console.log('✅ 使用后端 Telegram 配置');
                  const localNotify = storage.get(STORAGE_KEYS.NOTIFICATIONS, {}) as any;
                  const newNotify = {
                      ...localNotify,
                      telegramBotToken: serverConfig.telegram.botToken,
                      telegramChatId: serverConfig.telegram.chatId
                  };
                  storage.set(STORAGE_KEYS.NOTIFICATIONS, newNotify);
              }
          })
          .catch(err => console.error('获取后端配置失败:', err));
  }, []);

  const checkRequestsStatus = (ids: Set<string>) => {
      const existingRequests = JSON.parse(localStorage.getItem('requests') || '[]');
      let requestsChanged = false;
      const notifyConfig = JSON.parse(localStorage.getItem('streamhub_notifications') || '{}');

      const updatedRequests = existingRequests.map((req: any) => {
          if (req.status === 'pending') {
             const key = `${req.mediaType}_${req.id}`;
             if (ids.has(key)) {
                 requestsChanged = true;
                 
                 // Send Notification for Completed Request
                 if (notifyConfig.telegramBotToken && notifyConfig.telegramChatId) {
                     sendTelegramNotification(notifyConfig, req, req.requestedBy, undefined, 'completed')
                        .catch(e => console.error('Failed to notify completion', e));
                 }
                 
                 return { ...req, status: 'completed', completedAt: new Date().toISOString() };
             }
          }
          return req;
      });

      if (requestsChanged) {
          localStorage.setItem('requests', JSON.stringify(updatedRequests));
      }
  };

  const syncEmbyLibrary = useCallback(async (config: EmbyConfig, isAutoScan = false) => {
      setSyncingEmby(true);
      
      try {
          // Use current selected libraries for sync
          const { ids, items } = await fetchEmbyLibrary(config, undefined, selectedLibraryIds);
      
      if (isAutoScan && embyLibrary.size > 0) {
              // Detect new items
          const newItems = items.filter(item => {
              if (!item.ProviderIds?.Tmdb) return false;
              const type = item.Type === 'Series' ? 'tv' : 'movie';
              const key = `${type}_${item.ProviderIds.Tmdb}`;
              return !embyLibrary.has(key);
          });
          
              // Detect deleted items (optional)
              const deletedItems: string[] = [];
              embyLibrary.forEach(key => {
                  if (!ids.has(key)) {
                      deletedItems.push(key);
                  }
              });

              if (deletedItems.length > 0) {
                  console.log(`Detected ${deletedItems.length} deleted items:`, deletedItems.slice(0, 5));
              }
              
              // Send notifications in parallel
          if (newItems.length > 0) {
                  const notifyConfig = storage.get<any>(STORAGE_KEYS.NOTIFICATIONS, {});
              if (notifyConfig.telegramBotToken && notifyConfig.telegramChatId) {
                      const notificationPromises = newItems.map(async (item) => {
                      try {
                          const type = item.Type === 'Series' ? 'tv' : 'movie';
                          const tmdbId = parseInt(item.ProviderIds?.Tmdb || '0');
                              if (!tmdbId) return;

                          const detailData = await fetchDetails(tmdbId, type);
                          const mediaItem: MediaItem = processMediaItem({
                              id: tmdbId,
                              media_type: type,
                              title: item.Name,
                          } as any, detailData, type);

                          await sendTelegramNotification(notifyConfig, mediaItem, 'System', undefined, 'auto_scan');
                      } catch (e) {
                          console.error('Failed to notify for new item', item.Name, e);
                      }
                      });
                      
                      // Wait for all notifications (with timeout)
                      await Promise.allSettled(notificationPromises);
              }
          }
      }

      checkRequestsStatus(ids);
      
      setEmbyLibrary(ids);
          storage.set(STORAGE_KEYS.EMBY_LIBRARY, Array.from(ids));
      } catch (error) {
          console.error('Sync failed:', error);
      } finally {
      setSyncingEmby(false);
      }
  }, [embyLibrary, checkRequestsStatus]);

  // Auto Scan Interval (Configurable)
  useEffect(() => {
      if (!authState.isAuthenticated || !embyConfig.serverUrl) return;
      
      const intervalMs = syncInterval * 60 * 1000;
      const interval = setInterval(() => {
          syncEmbyLibrary(embyConfig, true);
      }, intervalMs); 

      return () => clearInterval(interval);
  }, [authState.isAuthenticated, embyConfig, syncInterval, syncEmbyLibrary]);

  const handleSaveSettings = useCallback((newConfig: EmbyConfig, library?: Set<string>, newSyncInterval?: number, newSelectedLibIds?: string[]) => {
      setEmbyConfig(newConfig);
      storage.set(STORAGE_KEYS.EMBY_CONFIG, newConfig);

      if (newSyncInterval !== undefined) {
          setSyncInterval(newSyncInterval);
          storage.set(STORAGE_KEYS.SYNC_INTERVAL, newSyncInterval);
      }

      if (newSelectedLibIds) {
          setSelectedLibraryIds(newSelectedLibIds);
          storage.set('streamhub_selected_libraries', newSelectedLibIds);
      }

      // Update Auth State as well to keep them in sync
      if (authState.isAuthenticated) {
          const newAuth: AuthState = {
              ...authState,
              serverUrl: newConfig.serverUrl,
              accessToken: newConfig.apiKey
          };
          setAuthState(newAuth);
          storage.set(STORAGE_KEYS.AUTH, newAuth);
      }

      if (library) {
          setEmbyLibrary(library);
          storage.set(STORAGE_KEYS.EMBY_LIBRARY, Array.from(library));
          checkRequestsStatus(library);
      } else {
          syncEmbyLibrary(newConfig);
      }
  }, [authState, checkRequestsStatus, syncEmbyLibrary]);

  // 计算用户配额信息
  const quotaInfo = React.useMemo(() => {
      const existingRequests = storage.get<RequestItem[]>(STORAGE_KEYS.REQUESTS, []);
      const userRequests = existingRequests.filter(r => r.requestedBy === authState.user?.Name);
      const movieUsed = userRequests.filter(r => r.mediaType === 'movie').length;
      const tvUsed = userRequests.filter(r => r.mediaType === 'tv').length;
      return {
          movieUsed,
          movieLimit: systemSettings.movieRequestLimit || 0,
          tvUsed,
          tvLimit: systemSettings.tvRequestLimit || 0
      };
  }, [authState.user?.Name, systemSettings.movieRequestLimit, systemSettings.tvRequestLimit]);

  const handleRequest = useCallback((item: MediaItem, options?: { resolution: string; note: string }) => {
      const existingRequests = storage.get<RequestItem[]>(STORAGE_KEYS.REQUESTS, []);
      
      // Check limit - 电影和剧集分开计算
      const userRequests = existingRequests.filter(r => r.requestedBy === authState.user?.Name);
      const userMovieRequests = userRequests.filter(r => r.mediaType === 'movie');
      const userTvRequests = userRequests.filter(r => r.mediaType === 'tv');
      
      const movieLimit = systemSettings.movieRequestLimit || 0;
      const tvLimit = systemSettings.tvRequestLimit || 0;
      
      if (!authState.isAdmin) {
          if (item.mediaType === 'movie' && movieLimit > 0 && userMovieRequests.length >= movieLimit) {
              toast.showToast(`电影求片数量已达上限 (${movieLimit})`, 'error');
              return 'limit_reached';
          }
          if (item.mediaType === 'tv' && tvLimit > 0 && userTvRequests.length >= tvLimit) {
              toast.showToast(`剧集求片数量已达上限 (${tvLimit})`, 'error');
              return 'limit_reached';
          }
      }

      const isRequested = existingRequests.some((r) => r.id === item.id && r.mediaType === item.mediaType);
      
      if (isRequested) {
          toast.showToast('您已经提交过此请求', 'warning');
          return 'already_requested';
      }

      const newRequest: RequestItem = {
          ...item,
          backdropUrl: item.backdropUrl,
          requestDate: new Date().toISOString(),
          requestedBy: authState.user?.Name || 'Unknown',
          status: 'pending',
          resolutionPreference: options?.resolution as any,
          notes: options?.note
      };
      
      const updatedRequests = [...existingRequests, newRequest];
      storage.set(STORAGE_KEYS.REQUESTS, updatedRequests);

      // Send Notification
      const notifyConfig = storage.get<any>(STORAGE_KEYS.NOTIFICATIONS, {});
      if (notifyConfig.telegramBotToken && notifyConfig.telegramChatId) {
          sendTelegramNotification(notifyConfig, item, authState.user?.Name || 'Guest', options?.note)
            .catch(err => console.error('Failed to send notification', err));
      }

      toast.showToast('请求已提交！管理员审核后将自动下载', 'success');
      return 'success';
  }, [authState.user, toast, systemSettings.movieRequestLimit, systemSettings.tvRequestLimit]);

  // 收藏功能
  const isFavorite = useCallback((id: number, mediaType: 'movie' | 'tv') => {
    return favorites.some(f => f.id === id && f.mediaType === mediaType);
  }, [favorites]);

  const toggleFavorite = useCallback((item: MediaItem) => {
    const isAlreadyFavorite = favorites.some(f => f.id === item.id && f.mediaType === item.mediaType);
    
    if (isAlreadyFavorite) {
      const newFavorites = favorites.filter(f => !(f.id === item.id && f.mediaType === item.mediaType));
      setFavorites(newFavorites);
      storage.set(STORAGE_KEYS.FAVORITES, newFavorites);
      toast.showToast('已从收藏夹移除', 'info');
    } else {
      const newFavorite: FavoriteItem = {
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        posterUrl: item.posterUrl,
        year: item.year,
        addedAt: new Date().toISOString(),
        addedBy: authState.user?.Name || 'Unknown'
      };
      const newFavorites = [...favorites, newFavorite];
      setFavorites(newFavorites);
      storage.set(STORAGE_KEYS.FAVORITES, newFavorites);
      toast.showToast('已添加到收藏夹', 'success');
    }
  }, [favorites, authState.user?.Name, toast]);

  const removeFavorite = useCallback((id: number, mediaType: 'movie' | 'tv') => {
    const newFavorites = favorites.filter(f => !(f.id === id && f.mediaType === mediaType));
    setFavorites(newFavorites);
    storage.set(STORAGE_KEYS.FAVORITES, newFavorites);
    toast.showToast('已从收藏夹移除', 'info');
  }, [favorites, toast]);

  // 用户评分功能
  const rateMedia = useCallback((mediaId: number, mediaType: 'movie' | 'tv', title: string, posterUrl: string | null, rating: number, comment?: string) => {
    const existingIndex = userRatings.findIndex(r => r.mediaId === mediaId && r.mediaType === mediaType);
    const newRating: UserRating = {
      mediaId,
      mediaType,
      title,
      posterUrl,
      rating,
      comment,
      ratedAt: new Date().toISOString(),
      ratedBy: authState.user?.Name || 'Unknown'
    };

    let newRatings: UserRating[];
    if (existingIndex >= 0) {
      newRatings = [...userRatings];
      newRatings[existingIndex] = newRating;
      toast.showToast('评分已更新', 'success');
    } else {
      newRatings = [...userRatings, newRating];
      toast.showToast(`已为 "${title}" 打分 ${rating} 分`, 'success');
    }
    
    setUserRatings(newRatings);
    storage.set(STORAGE_KEYS.USER_RATINGS, newRatings);
  }, [userRatings, authState.user?.Name, toast]);

  const getUserRating = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    return userRatings.find(r => r.mediaId === mediaId && r.mediaType === mediaType);
  }, [userRatings]);

  // 标签功能
  const addCustomTag = useCallback((tag: Omit<CustomTag, 'id' | 'createdAt' | 'createdBy'>) => {
    const newTag: CustomTag = {
      ...tag,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      createdBy: authState.user?.Name || 'Unknown'
    };
    const newTags = [...customTags, newTag];
    setCustomTags(newTags);
    storage.set(STORAGE_KEYS.CUSTOM_TAGS, newTags);
    toast.showToast(`标签 "${tag.name}" 已创建`, 'success');
  }, [customTags, authState.user?.Name, toast]);

  const removeCustomTag = useCallback((tagId: string) => {
    const newTags = customTags.filter(t => t.id !== tagId);
    setCustomTags(newTags);
    storage.set(STORAGE_KEYS.CUSTOM_TAGS, newTags);
    // 同时删除关联
    const newMediaTags = mediaTags.filter(mt => mt.tagId !== tagId);
    setMediaTags(newMediaTags);
    storage.set(STORAGE_KEYS.MEDIA_TAGS, newMediaTags);
    toast.showToast('标签已删除', 'info');
  }, [customTags, mediaTags, toast]);

  const toggleMediaTag = useCallback((mediaId: number, mediaType: 'movie' | 'tv', tagId: string) => {
    const existingIndex = mediaTags.findIndex(
      mt => mt.mediaId === mediaId && mt.mediaType === mediaType && mt.tagId === tagId
    );

    let newMediaTags: MediaTag[];
    if (existingIndex >= 0) {
      newMediaTags = mediaTags.filter((_, i) => i !== existingIndex);
    } else {
      const newMediaTag: MediaTag = {
        mediaId,
        mediaType,
        tagId,
        addedAt: new Date().toISOString(),
        addedBy: authState.user?.Name || 'Unknown'
      };
      newMediaTags = [...mediaTags, newMediaTag];
    }
    
    setMediaTags(newMediaTags);
    storage.set(STORAGE_KEYS.MEDIA_TAGS, newMediaTags);
  }, [mediaTags, authState.user?.Name]);

  const getMediaTags = useCallback((mediaId: number, mediaType: 'movie' | 'tv') => {
    const tagIds = mediaTags
      .filter(mt => mt.mediaId === mediaId && mt.mediaType === mediaType)
      .map(mt => mt.tagId);
    return customTags.filter(t => tagIds.includes(t.id));
  }, [mediaTags, customTags]);

  // 观影记录功能
  const addToWatchHistory = useCallback((mediaId: number, mediaType: 'movie' | 'tv', title: string, posterUrl: string | null, progress?: number, season?: number, episode?: number) => {
    const existingIndex = watchHistory.findIndex(w => w.mediaId === mediaId && w.mediaType === mediaType);
    
    const newEntry: WatchHistory = {
      mediaId,
      mediaType,
      title,
      posterUrl,
      watchedAt: new Date().toISOString(),
      watchedBy: authState.user?.Name || 'Unknown',
      progress,
      season,
      episode
    };

    let newHistory: WatchHistory[];
    if (existingIndex >= 0) {
      newHistory = [...watchHistory];
      newHistory[existingIndex] = newEntry;
    } else {
      newHistory = [newEntry, ...watchHistory].slice(0, 100); // 最多保留100条
    }

    setWatchHistory(newHistory);
    storage.set(STORAGE_KEYS.WATCH_HISTORY, newHistory);
  }, [watchHistory, authState.user?.Name]);

  const markAsWatched = useCallback((item: MediaItem) => {
    addToWatchHistory(item.id, item.mediaType, item.title, item.posterUrl, 100);
    toast.showToast(`已将 "${item.title}" 标记为看过`, 'success');
  }, [addToWatchHistory, toast]);

  // 搜索历史功能
  const addToSearchHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, newHistory);
  }, [searchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    storage.set(STORAGE_KEYS.SEARCH_HISTORY, []);
  }, []);

  // 随机发现功能
  const handleRandomDiscover = useCallback(async () => {
    toast.showToast('正在随机挑选...', 'info');
    try {
      const { baseUrl } = getTmdbConfig();
      const randomPage = Math.floor(Math.random() * 100) + 1;
      const types = ['movie', 'tv'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      const response = await fetch(`${baseUrl}/discover/${randomType}?page=${randomPage}&language=zh-CN&sort_by=popularity.desc&vote_count.gte=100`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.results.length);
        const randomItem = data.results[randomIndex];
        openModal(randomItem.id, randomType as 'movie' | 'tv');
        toast.showToast(`为你推荐: ${randomItem.title || randomItem.name}`, 'success');
      }
    } catch (err) {
      console.error('Random discover failed:', err);
      toast.showToast('随机推荐失败，请重试', 'error');
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        // 搜索时清除 genre 筛选（搜索 API 不支持 genre）
        if (searchTerm && filters.genre) {
            setFilters(prev => ({ ...prev, genre: '' }));
            toast.showToast('搜索不支持类型筛选，已自动清除', 'info');
        }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Data Loading Logic
  useEffect(() => {
    if (authState.isAuthenticated) {
        setPage(1);
        fetchData(1, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [authState.isAuthenticated, debouncedSearchTerm, filters]);

  useEffect(() => {
      if (loading || loadingMore || page >= totalPages) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) handleLoadMore();
      }, { threshold: 0.5 });
      if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
      return () => observerRef.current?.disconnect();
  }, [loading, loadingMore, page, totalPages, mediaList]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchData = async (pageNum: number, isReset = false) => {
    if (isReset) {
        setLoading(true);
        setMediaList([]);
    } else {
        setLoadingMore(true);
    }
    setError(null);

    try {
        let endpoint = '';
        let params = `&page=${pageNum}&language=zh-CN&include_adult=false`;

        if (debouncedSearchTerm) {
            endpoint = '/search/multi';
            params += `&query=${encodeURIComponent(debouncedSearchTerm)}`;
        } else {
            const isDefaultTrending = filters.type === 'all' && filters.genre === '' && filters.region === '' && filters.platform === '' && filters.year === '全部' && filters.sort === 'popularity.desc';
            if (isDefaultTrending) {
                endpoint = '/trending/all/week';
            } else {
                const targetType = filters.type === 'tv' ? 'tv' : 'movie';
                endpoint = `/discover/${targetType}`;
                params += `&sort_by=${filters.sort}`;
                
                if (filters.sort === 'primary_release_date.desc') {
                    const nextYear = new Date().getFullYear() + 1;
                    params += `&release_date.lte=${nextYear}-12-31`;
                }
                
                if (filters.region) params += `&with_original_language=${filters.region}`;
                
                // Genre (类型) 筛选
                if (filters.genre) params += `&with_genres=${filters.genre}`;

                // Platform Logic
                if (filters.platform) {
                    if (filters.platform === '447') { // Youku
                        if (targetType === 'tv') params += `&with_networks=48460`; 
                        else params += `&with_companies=48460`;
                        }
                    else if (filters.platform === '446') { // iQIYI
                         if (targetType === 'tv') params += `&with_networks=172414`; 
                        else params += `&with_companies=172414`;
                        }
                    else if (filters.platform === '336') { // Tencent
                        if (targetType === 'tv') params += `&with_networks=74457|84946`; 
                        else params += `&with_companies=74457|84946`;
                        }
                    else {
                        params += `&with_watch_providers=${filters.platform}`;
                        params += `&watch_region=US`;
                    }
                }
                
                if (filters.year !== '全部' && filters.year !== '更早') {
                    if (targetType === 'movie') params += `&primary_release_year=${filters.year}`;
                    else params += `&first_air_date_year=${filters.year}`;
                } else if (filters.year === '更早') {
                    if (targetType === 'movie') params += `&primary_release_date.lte=2010-01-01`;
                    else params += `&first_air_date.lte=2010-01-01`;
                }
            }
        }

        const { baseUrl } = getTmdbConfig();
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const response = await fetch(`${baseUrl}/${cleanEndpoint}?${params.substring(1)}`); // 移除开头的 &
        if (!response.ok) throw new Error('API 请求失败');
        const data = await response.json();
        setTotalPages(Math.min(data.total_pages, 500));

        const detailedPromises = data.results.map(async (item: any) => {
            if (item.media_type === 'person') return null;
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            try {
                const detailRes = await fetch(
                    `${baseUrl}/${type}/${item.id}?language=zh-CN&append_to_response=watch/providers,release_dates`
                );
                const detailData = await detailRes.json();
                return processMediaItem(item, detailData, type);
            } catch (e) {
                return processMediaItem(item, {}, type);
            }
        });

        const detailedResults = (await Promise.all(detailedPromises)).filter(Boolean) as MediaItem[];

        if (isReset) {
            setMediaList(detailedResults);
        } else {
            setMediaList(prev => [...prev, ...detailedResults]);
        }

    } catch (err) {
        console.error(err);
        setError('无法连接监控网络');
    } finally {
        setLoading(false);
        setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
        setPage(prev => prev + 1);
        fetchData(page + 1, false);
    }
  };

  const openModal = async (id: number, type: 'movie' | 'tv') => {
      const existing = mediaList.find(m => m.id === id);
      if (!existing) return;
      setSelectedMedia(existing);
      try {
          const detailData = await fetchDetails(id, type);
          setSelectedMedia(prev => prev ? ({
              ...prev,
              genres: detailData.genres || [],
              runtime: detailData.runtime || (detailData.episode_run_time ? detailData.episode_run_time[0] : 0),
              cast: detailData.credits?.cast?.slice(0, 6) || [],
              videos: detailData.videos?.results || [],
              numberOfEpisodes: detailData.number_of_episodes || prev.numberOfEpisodes,
              numberOfSeasons: detailData.number_of_seasons || prev.numberOfSeasons,
          }) : null);
      } catch (e) {
          console.error("Failed to fetch full details", e);
      }
  };

  const openPersonModal = async (personId: number) => {
      try {
          const data = await fetchPersonDetails(personId);
          if (data) {
              setSelectedPerson(data);
              setPersonCredits(data.combined_credits?.cast || []);
          }
      } catch (e) {
          console.error("Failed to open person details", e);
      }
  };

  const clearFilters = () => {
    setFilters({ type: 'all', genre: '', region: '', platform: '', year: '全部', sort: 'popularity.desc' });
    setSearchTerm('');
  };

  // 清除单个筛选
  const clearSingleFilter = (key: keyof FilterState) => {
    const defaultValues: Record<string, string> = {
      type: 'all',
      genre: '',
      region: '',
      platform: '',
      year: '全部',
      sort: 'popularity.desc'
    };
    setFilters(prev => ({ ...prev, [key]: defaultValues[key] }));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // 根据屏幕宽度计算骨架屏数量
  const getSkeletonCount = () => {
    if (typeof window === 'undefined') return 14;
    const width = window.innerWidth;
    if (width < 640) return 6;      // 3 cols * 2 rows
    if (width < 768) return 8;      // 4 cols * 2 rows
    if (width < 1024) return 10;    // 5 cols * 2 rows
    if (width < 1280) return 12;    // 6 cols * 2 rows
    return 14;                       // 7 cols * 2 rows
  };

  const SkeletonCard = () => (
      <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'} animate-pulse`}>
          <div className="aspect-[2/3] w-full bg-black/10"></div>
          <div className="p-3 space-y-2">
              <div className={`h-3 rounded w-3/4 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-300'}`}></div>
              <div className="flex gap-2">
                 <div className={`h-2 rounded w-1/4 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-300'}`}></div>
                 <div className={`h-2 rounded w-1/4 ${isDarkMode ? 'bg-zinc-700' : 'bg-slate-300'}`}></div>
              </div>
          </div>
      </div>
  );

  // Load data from server on mount
  useEffect(() => {
    const initData = async () => {
      await storage.loadFromServer();
      // Force re-render or update state if needed, but since we use storage.get() in initial state,
      // we might need to reload the page or update state.
      // For simplicity, we just load it. The user might need to refresh if it's the very first load on a new device.
      // Better: Update critical states after load.
      setAuthState(storage.get(STORAGE_KEYS.AUTH, { isAuthenticated: false, user: null, serverUrl: '' }));
      setIsDarkMode(storage.get(STORAGE_KEYS.DARK_MODE, false));
    };
    initData();
  }, []);

  if (!authState.isAuthenticated) {
      return <Login onLogin={handleLogin} isDarkMode={isDarkMode} embyConfig={embyConfig} />;
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 pb-20">
      {selectedMedia && (
          <DetailModal 
            selectedMedia={selectedMedia} 
            onClose={() => setSelectedMedia(null)} 
            isDarkMode={isDarkMode}
            embyLibrary={embyLibrary}
            authState={authState}
            onRequest={handleRequest}
            onPersonClick={openPersonModal}
            quotaInfo={quotaInfo}
            isFavorite={isFavorite(selectedMedia.id, selectedMedia.mediaType)}
            onToggleFavorite={toggleFavorite}
            userRating={getUserRating(selectedMedia.id, selectedMedia.mediaType)}
            onRate={rateMedia}
            customTags={customTags}
            mediaTags={getMediaTags(selectedMedia.id, selectedMedia.mediaType)}
            onAddTag={addCustomTag}
            onRemoveTag={removeCustomTag}
            onToggleMediaTag={toggleMediaTag}
            onMarkAsWatched={markAsWatched}
          />
      )}

      {selectedPerson && (
          <PersonModal
            person={selectedPerson}
            credits={personCredits}
            onClose={() => setSelectedPerson(null)}
            onMediaClick={(id, type) => {
                setSelectedPerson(null);
                openModal(id, type);
            }}
            isDarkMode={isDarkMode}
          />
      )}

      <MyListModal
        isOpen={showMyList}
        onClose={() => setShowMyList(false)}
        isDarkMode={isDarkMode}
        requests={storage.get(STORAGE_KEYS.REQUESTS, [])}
        favorites={favorites}
        currentUser={authState.user?.Name}
        onRemoveFavorite={removeFavorite}
        onMediaClick={(id, type) => {
            setShowMyList(false);
            openModal(id, type);
        }}
      />

      <CalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        isDarkMode={isDarkMode}
        onMediaClick={(id, type) => {
            setShowCalendar(false);
            openModal(id, type);
        }}
      />

      <PlaybackReportModal
        isOpen={showPlaybackReport}
        onClose={() => setShowPlaybackReport(false)}
        isDarkMode={isDarkMode}
        embyConfig={embyConfig}
        notificationConfig={storage.get(STORAGE_KEYS.NOTIFICATIONS, {})}
      />

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onSave={handleSaveSettings}
        onSystemSettingsChange={setSystemSettings}
        currentConfig={embyConfig}
        isDarkMode={isDarkMode}
        initialSelectedLibraries={selectedLibraryIds}
      />

      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${isDarkMode ? 'bg-black/70 border-white/5' : 'bg-white/70 border-slate-200'}`}>
        <div className="max-w-[1400px] mx-auto px-3 md:px-6 h-14 md:h-16 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="relative group cursor-pointer" onClick={clearFilters}>
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur transition duration-200 group-hover:opacity-40"></div>
                <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white ring-1 ring-white/10">
                  <MonitorPlay size={18} strokeWidth={2.5} className="md:w-5 md:h-5" />
                </div>
            </div>
            
            <div className="flex flex-col hidden md:flex cursor-default">
              <h1 className={`font-bold tracking-tight leading-none text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Stream<span className="text-indigo-500">Hub</span>
              </h1>
              <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                全球媒体监控
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0">
            {/* 搜索框 - 带历史记录 */}
            <div className="relative group w-full max-w-[200px] sm:max-w-xs md:max-w-md transition-all focus-within:max-w-full md:focus-within:w-96">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="搜索..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    addToSearchHistory(searchTerm.trim());
                    setShowSearchHistory(false);
                  }
                }}
                className={`w-full rounded-full pl-9 pr-10 py-1.5 md:py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:bg-zinc-800' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <X size={14} />
                </button>
              )}
              
              {/* 搜索历史下拉 */}
              {showSearchHistory && searchHistory.length > 0 && !searchTerm && (
                <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-50 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                      <History size={12} /> 搜索历史
                    </span>
                    <button 
                      onClick={clearSearchHistory}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      清除
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {searchHistory.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSearchTerm(term); setShowSearchHistory(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 随机发现按钮 */}
            <button
              onClick={handleRandomDiscover}
              className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${isDarkMode ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500' : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'} shadow-lg shadow-purple-500/20`}
              title="随机发现"
            >
              <Dices size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
            
            <div className={`hidden sm:flex p-1 rounded-lg border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDarkMode ? 'bg-zinc-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-slate-400')}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDarkMode ? 'bg-zinc-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-slate-400')}`}>
                <ListIcon size={16} />
              </button>
            </div>

            {authState.isAdmin && (
                <>
                <button 
                    onClick={handleOpenLogs}
                    className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 relative flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    title="系统日志"
                >
                    <ScrollText size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                <button 
                onClick={() => setShowSettings(true)}
                className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 relative flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Emby 设置"
                >
                <Settings size={16} className={`md:w-[18px] md:h-[18px] ${syncingEmby ? 'animate-spin' : ''}`} />
                {embyLibrary.size > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900"></span>
                )}
                </button>
                </>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
                {/* 观影报告按钮 - 仅管理员可见 */}
                {authState.isAdmin && (
                    <button 
                        onClick={() => setShowPlaybackReport(true)}
                        className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${isDarkMode ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                        title="观影统计报告"
                    >
                        <BarChart3 size={16} className="md:w-[18px] md:h-[18px]" />
                    </button>
                )}
                
                {/* 日历按钮 */}
                <button 
                    onClick={() => setShowCalendar(true)}
                    className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${isDarkMode ? 'bg-zinc-800 text-cyan-400 hover:bg-zinc-700' : 'bg-cyan-50 text-cyan-500 hover:bg-cyan-100'}`}
                    title="上映日历"
                >
                    <Calendar size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
                
                {/* 我的列表按钮 */}
                <button 
                    onClick={() => setShowMyList(true)}
                    className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 relative ${isDarkMode ? 'bg-zinc-800 text-pink-400 hover:bg-zinc-700' : 'bg-pink-50 text-pink-500 hover:bg-pink-100'}`}
                    title="我的列表"
                >
                    <Heart size={16} className="md:w-[18px] md:h-[18px]" fill={favorites.length > 0 ? 'currentColor' : 'none'} />
                    {favorites.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {favorites.length > 9 ? '9+' : favorites.length}
                        </span>
                    )}
                </button>
                <div className="hidden md:flex flex-col items-end mr-1">
                    <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {authState.user?.Name || 'Guest'}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {authState.isAdmin ? 'ADMIN' : authState.isGuest ? 'GUEST' : 'USER'}
                    </span>
                </div>
                <button 
                    onClick={handleLogout}
                    className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                    title="退出登录"
                >
                    <LogOut size={16} className="md:w-[18px] md:h-[18px]" />
                </button>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 md:p-2 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 ${isDarkMode ? 'bg-zinc-800 text-yellow-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isDarkMode ? <Sun size={16} className="md:w-[18px] md:h-[18px]" /> : <Moon size={16} className="md:w-[18px] md:h-[18px]" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 md:px-6 pt-4 md:pt-8">
        <div className="space-y-6">
          <Filters 
            filters={filters} 
            setFilters={setFilters} 
            debouncedSearchTerm={debouncedSearchTerm} 
            clearSearch={() => setSearchTerm('')} 
            isDarkMode={isDarkMode}
          />

          {loading && !loadingMore ? (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                {[...Array(getSkeletonCount())].map((_, i) => <SkeletonCard key={i} />)}
             </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-4">
                    <RefreshCw size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">连接中断</h3>
                <p className="text-sm opacity-60 max-w-xs">{error}</p>
                <button onClick={() => fetchData(1, true)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700">重试</button>
            </div>
          ) : mediaList.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-slate-200 text-slate-400'}`}>
              <Film size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">没有找到相关内容</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 min-[450px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8 animate-fade-in">
                  {mediaList.map((item, index) => (
                    <div 
                      key={`${item.id}-${item.mediaType}`} 
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                    >
                      <MediaCard 
                          item={item} 
                          viewMode="grid" 
                          onClick={openModal} 
                          isDarkMode={isDarkMode}
                          isInLibrary={embyLibrary.has(`${item.mediaType}_${item.id}`)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3 animate-fade-in">
                  {mediaList.map((item, index) => (
                    <div 
                      key={`${item.id}-${item.mediaType}`}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                    >
                      <MediaCard 
                          item={item} 
                          viewMode="list" 
                          onClick={openModal} 
                          isDarkMode={isDarkMode}
                          isInLibrary={embyLibrary.has(`${item.mediaType}_${item.id}`)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div ref={loadMoreRef} className="h-20 flex items-center justify-center w-full mt-8">
                  {loadingMore ? (
                       <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-500">
                           <Loader2 size={16} className="animate-spin" />
                           <span className="text-xs font-bold">正在加载更多...</span>
                       </div>
                  ) : page >= totalPages ? (
                      <span className={`text-xs ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>—— 到底了 ——</span>
                  ) : null}
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* 返回顶部按钮 - 优化动画 */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3.5 rounded-full shadow-xl backdrop-blur-md transition-all duration-500 z-30 group ${
          showScrollTop 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-24 opacity-0 scale-75 pointer-events-none'
        } ${isDarkMode 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30' 
            : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-slate-200/50 border border-slate-200'
        }`}
      >
        <ArrowUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
      </button>

      {/* Log Modal */}
      {showLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className={`w-full max-w-2xl h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                  <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                      <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          <ScrollText size={18} className="text-indigo-500" /> 系统日志
                      </h3>
                      <div className="flex gap-2">
                          <button onClick={handleClearLogs} className="text-xs text-red-500 hover:underline px-2">清空</button>
                          <button onClick={() => setShowLogs(false)} className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                              <X size={18} />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                      {logs.length === 0 ? (
                          <div className="text-center opacity-50 py-10">暂无日志</div>
                      ) : (
                          logs.map(log => (
                              <div key={log.id} className={`p-2 rounded border flex gap-2 ${
                                  log.type === 'error' ? (isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600') :
                                  log.type === 'success' ? (isDarkMode ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-600') :
                                  log.type === 'warning' ? (isDarkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-yellow-50 border-yellow-100 text-yellow-600') :
                                  (isDarkMode ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-slate-50 border-slate-100 text-slate-600')
                              }`}>
                                  <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                  <span className="break-all">{log.message}</span>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
