
import React, { useState, useEffect, useRef } from 'react';
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
  ArrowUp
} from 'lucide-react';
import { TMDB_API_KEY, TMDB_BASE_URL } from './constants';
import { MediaItem, FilterState } from './types';
import { processMediaItem, fetchDetails } from './services/tmdbService';
import Filters from './components/Filters';
import MediaCard from './components/MediaCard';
import DetailModal from './components/DetailModal';

export default function App() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 800);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    fetchData(1, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [debouncedSearchTerm, filters]);

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
                    params += `&with_watch_providers=${filters.platform}`;
                    
                    // Smart Region Logic:
                    // WeTV (336), iQIYI (446), Youku (447)
                    // TMDB data for these in 'CN' is often empty. 
                    // We switch to 'TW' (Taiwan) or 'SG' (Singapore) where data is better populated.
                    if (['336', '446', '447'].includes(filters.platform)) {
                        params += `&watch_region=TW`; 
                    } 
                    // Global Platforms default to US if not specified
                    else {
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

        const response = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}${params}`);
        if (!response.ok) throw new Error('API 请求失败');
        const data = await response.json();
        setTotalPages(Math.min(data.total_pages, 500));

        const detailedPromises = data.results.map(async (item: any) => {
            if (item.media_type === 'person') return null;
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
              // Re-process dates if detailed fetch gives more accuracy? 
              // Usually initial list fetch is enough, but for specific deep dives we could enhance here.
          }) : null);
      } catch (e) {
          console.error("Failed to fetch full details", e);
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

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 pb-20">
      {selectedMedia && (
          <DetailModal 
            selectedMedia={selectedMedia} 
            onClose={() => setSelectedMedia(null)} 
            isDarkMode={isDarkMode}
          />
      )}

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
          ) : mediaList.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-2xl ${isDarkMode ? 'border-zinc-800 text-zinc-600' : 'border-slate-200 text-slate-400'}`}>
              <Film size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">没有找到相关内容</p>
            </div>
          ) : (
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
                    />
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
      
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 z-30 ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${isDarkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white text-indigo-600 hover:bg-slate-50'}`}
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}
