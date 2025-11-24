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
  User as UserIcon
} from 'lucide-react';
import { TMDB_API_KEY, TMDB_BASE_URL, APP_VERSION } from './constants';
import { MediaItem, FilterState, EmbyConfig, AuthState, RequestItem } from './types';
import { processMediaItem, fetchDetails, fetchPersonDetails } from './services/tmdbService';
import { fetchEmbyLibrary } from './services/embyService';
import { sendTelegramNotification, subscribeToMoviePilot } from './services/notificationService';
import { storage, STORAGE_KEYS } from './utils/storage';
import { ToastProvider, useToast } from './components/Toast';
import Filters from './components/Filters';
import MediaCard from './components/MediaCard';
import DetailModal from './components/DetailModal';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import PersonModal from './components/PersonModal';
import PersonCard from './components/PersonCard';

function AppContent() {
  const toast = useToast();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [personList, setPersonList] = useState<any[]>([]); // New state for people results
  const [searchType, setSearchType] = useState<'media' | 'person'>('media'); // Toggle state
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

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
          const newConfig = { serverUrl: auth.serverUrl, apiKey: auth.accessToken };
          setEmbyConfig(newConfig);
          // Trigger sync only if server is configured
          if (newConfig.serverUrl) {
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

  const handleRequest = useCallback((item: MediaItem, options?: { resolution: string; note: string }) => {
      const existingRequests = storage.get<RequestItem[]>(STORAGE_KEYS.REQUESTS, []);
      
      // Check limit
      const userRequests = existingRequests.filter(r => r.requestedBy === authState.user?.Name);
      if (!authState.isAdmin && systemSettings.requestLimit > 0 && userRequests.length >= systemSettings.requestLimit) {
          toast.showToast(`求片数量已达上限 (${systemSettings.requestLimit})`, 'error');
          return 'limit_reached';
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

      // MoviePilot Subscription
      if (notifyConfig.moviePilotUrl && notifyConfig.moviePilotToken) {
          subscribeToMoviePilot(notifyConfig, item)
            .then(res => {
                if (res.success) {
                    toast.showToast(res.message, 'success');
                } else {
                    toast.showToast(res.message, 'warning');
                }
            })
            .catch(e => console.error('MoviePilot failed', e));
      } else {
          toast.showToast('请求已提交！管理员审核后将自动下载', 'success');
      }

      return 'success';
  }, [authState.user, toast, systemSettings.requestLimit]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 800);
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
            // Updated Search Logic to handle mixed results or separated
            // Using multi-search to get everything, then filtering client-side for better UX or server-side
            endpoint = '/search/multi';
            params += `&query=${encodeURIComponent(debouncedSearchTerm)}`;
        } else {
            // ... existing trending/discover logic ...
            const isDefaultTrending = filters.type === 'all' && filters.region === '' && filters.platform === '' && filters.year === '全部' && filters.sort === 'popularity.desc';
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

        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        const response = await fetch(`${TMDB_BASE_URL}/${cleanEndpoint}?api_key=${TMDB_API_KEY}${params}`);
        if (!response.ok) throw new Error('API 请求失败');
        const data = await response.json();
        setTotalPages(Math.min(data.total_pages, 500));

        // Separate People and Media
        const rawResults = data.results || [];
        
        // 1. Handle People
        const people = rawResults.filter((item: any) => item.media_type === 'person');
        
        // 2. Handle Media (Movies/TV)
        const mediaItems = rawResults.filter((item: any) => item.media_type !== 'person');

        const detailedPromises = mediaItems.map(async (item: any) => {
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            try {
                const detailRes = await fetch(
                    `${TMDB_BASE_URL}/${type}/${item.id}?api_key=${TMDB_API_KEY}&language=zh-CN&append_to_response=watch/providers,release_dates`
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
            setPersonList(people); // Set people results
        } else {
            setMediaList(prev => [...prev, ...detailedResults]);
            setPersonList(prev => [...prev, ...people]); // Append people
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
      let mediaItem = mediaList.find(m => m.id === id && m.mediaType === type);
      
      if (!mediaItem) {
          try {
              // If not in list, fetch basic details to show modal immediately
              const detailData = await fetchDetails(id, type);
              mediaItem = processMediaItem(
                  { id, media_type: type, ...detailData }, // Simulate base item from detail data
                  detailData, 
                  type
              );
          } catch (e) {
              console.error("Failed to fetch item for modal", e);
              return;
          }
      }

      setSelectedMedia(mediaItem);
      
      // Fetch full details (refresh)
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
    setFilters({ type: 'all', region: '', platform: '', year: '全部', sort: 'popularity.desc' });
    setSearchTerm('');
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

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

  if (!authState.isAuthenticated) {
      return <Login onLogin={handleLogin} isDarkMode={isDarkMode} />;
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
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                  全球媒体监控
                </span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  v{APP_VERSION}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0">
            <div className="relative group w-full max-w-[200px] sm:max-w-xs md:max-w-md transition-all focus-within:max-w-full md:focus-within:w-96">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input 
                type="text" 
                placeholder="搜索..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-full pl-9 pr-4 py-1.5 md:py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:bg-zinc-800' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'}`}
              />
            </div>
            
            <div className={`hidden sm:flex p-1 rounded-lg border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? (isDarkMode ? 'bg-zinc-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-slate-400')}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? (isDarkMode ? 'bg-zinc-700 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDarkMode ? 'text-zinc-500' : 'text-slate-400')}`}>
                <ListIcon size={16} />
              </button>
            </div>

            {authState.isAdmin && (
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
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
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
                {[...Array(14)].map((_, i) => <SkeletonCard key={i} />)}
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
          ) : (mediaList.length === 0 && personList.length === 0) ? (
            <div className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-slate-200 text-slate-400'}`}>
              <Film size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">没有找到相关内容</p>
            </div>
          ) : (
            <>
              {/* Person Results Section */}
              {debouncedSearchTerm && personList.length > 0 && (
                  <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          <UserIcon className="text-indigo-500" size={20} />
                          <span>相关人物</span>
                      </h2>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                          {personList.map((person) => (
                              <PersonCard 
                                  key={person.id}
                                  person={person}
                                  onClick={openPersonModal}
                                  isDarkMode={isDarkMode}
                              />
                          ))}
                      </div>
                      <div className={`my-8 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}></div>
                  </div>
              )}

              {/* Media Results Section */}
              {mediaList.length > 0 && (
                  <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-3 min-[450px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
                        {mediaList.map((item) => (
                            <MediaCard 
                                key={`${item.id}-${item.mediaType}`} 
                                item={item} 
                                viewMode="grid" 
                                onClick={openModal} 
                                isDarkMode={isDarkMode}
                                isInLibrary={embyLibrary.has(`${item.mediaType}_${item.id}`)}
                            />
                        ))}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                        {mediaList.map((item) => (
                            <MediaCard 
                                key={`${item.id}-${item.mediaType}`} 
                                item={item} 
                                viewMode="list" 
                                onClick={openModal} 
                                isDarkMode={isDarkMode}
                                isInLibrary={embyLibrary.has(`${item.mediaType}_${item.id}`)}
                            />
                        ))}
                        </div>
                    )}
                  </>
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
      
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 z-30 ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white text-indigo-600 hover:bg-slate-50'}`}
      >
        <ArrowUp size={20} />
      </button>
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
