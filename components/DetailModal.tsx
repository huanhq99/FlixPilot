import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowLeft, Star, Clock, CheckCircle2, Film, PlayCircle, Youtube, User, Terminal, HelpCircle, Calendar, X, Tv, Layers, LayoutList, Disc, MonitorPlay, Globe, Languages, Library, Send, AlertCircle, MessageSquare
} from 'lucide-react';
import { MediaItem, Episode, AuthState } from '../types';
import { IMAGE_BASE_URL, PROFILE_BASE_URL } from '../constants';
import { fetchSeasonDetails, fetchCollectionDetails, fetchRecommendations, processMediaItem } from '../services/tmdbService';

interface DetailModalProps {
    selectedMedia: MediaItem;
    onClose: () => void;
    isDarkMode: boolean;
    embyLibrary?: Set<string>;
    authState?: AuthState;
    onRequest?: (item: MediaItem, options?: { resolution: string; note: string }) => void;
    onPersonClick?: (personId: number) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ selectedMedia, onClose, isDarkMode, embyLibrary, authState, onRequest, onPersonClick }) => {
    const isStreaming = selectedMedia.status === 'streaming';
    const isReleased = selectedMedia.status === 'released';
    const isTV = selectedMedia.mediaType === 'tv';
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const [opacity, setOpacity] = useState(0);
    
    const [selectedSeason, setSelectedSeason] = useState<number | null>(
        selectedMedia.seasons && selectedMedia.seasons.length > 0 ? selectedMedia.seasons[0].season_number : null
    );
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    
    const [collectionItems, setCollectionItems] = useState<MediaItem[]>([]);
    const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
    const [relatedLoading, setRelatedLoading] = useState(false);

    // Request Modal State
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [resolution, setResolution] = useState('Any');
    const [requestNote, setRequestNote] = useState('');

    let statusText = selectedMedia.badgeLabel;
    let statusIcon = <Clock size={14}/>;
    let statusColor = 'text-slate-500';
    let statusBg = 'bg-slate-100 border-slate-200';

    // Priority: Brand Color
    if (selectedMedia.badgeColorClass) {
        statusBg = selectedMedia.badgeColorClass; 
        statusColor = 'text-white'; 
        statusIcon = <CheckCircle2 size={14}/>;
    }
    // Fallback
    else if (isStreaming) {
        statusIcon = <CheckCircle2 size={14}/>;
        statusColor = 'text-emerald-400';
        statusBg = 'bg-emerald-500/10 border-emerald-500/20';
    } else if (isReleased) {
        statusIcon = <Film size={14}/>;
        statusColor = 'text-blue-400';
        statusBg = 'bg-blue-500/10 border-blue-500/20';
    } else {
        statusColor = 'text-amber-400';
        statusBg = 'bg-amber-500/10 border-amber-500/20';
    }

    useEffect(() => {
        if (isTV && selectedSeason !== null) {
            const loadEpisodes = async () => {
                setEpisodesLoading(true);
                const data = await fetchSeasonDetails(selectedMedia.id, selectedSeason);
                setEpisodes(data);
                setEpisodesLoading(false);
            };
            loadEpisodes();
        }
    }, [selectedMedia.id, selectedSeason, isTV]);

    // Fetch Collection & Recommendations
    useEffect(() => {
        const loadRelated = async () => {
            setRelatedLoading(true);
            setCollectionItems([]);
            setRecommendations([]);

            try {
            // 1. Fetch Collection (if exists)
            if (selectedMedia.collectionId) {
                const colData = await fetchCollectionDetails(selectedMedia.collectionId);
                if (colData && colData.parts) {
                    // Process parts into MediaItems
                    const parts = colData.parts
                        .filter((p: any) => p.id !== selectedMedia.id) // Exclude current
                        .map((p: any) => processMediaItem(p, {}, 'movie'))
                        .sort((a: MediaItem, b: MediaItem) => (a.releaseDate > b.releaseDate ? 1 : -1));
                    setCollectionItems(parts);
                }
            }

            // 2. Fetch Recommendations (Always)
            const recData = await fetchRecommendations(selectedMedia.id, selectedMedia.mediaType);
            if (recData) {
                const recs = recData
                    .slice(0, 10)
                    .map((r: any) => processMediaItem(r, {}, r.media_type || selectedMedia.mediaType));
                setRecommendations(recs);
            }
            } catch (error) {
                console.error("Error fetching related content:", error);
            } finally {
            setRelatedLoading(false);
            }
        };
        loadRelated();
    }, [selectedMedia.id, selectedMedia.collectionId, selectedMedia.mediaType]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const scrollTop = scrollRef.current.scrollTop;
            const maxScroll = 300; 
            const newOpacity = Math.min(scrollTop / maxScroll, 1);
            setOpacity(newOpacity);
        }
    };

    const handleSubmitRequest = () => {
        if (onRequest) {
            onRequest(selectedMedia, {
                resolution: resolution,
                note: requestNote
            });
            setShowRequestForm(false);
        }
    };

    const RelatedCard = ({ item }: { item: MediaItem }) => (
        <div className={`flex-shrink-0 w-32 md:w-40 snap-start`}>
            <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 relative group cursor-pointer">
                {item.posterUrl ? (
                    <img src={item.posterUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" alt={item.title} />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${item.posterColor} flex items-center justify-center`}>
                        <span className="text-white/30 font-bold text-xs">{item.posterText}</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
            <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
            <p className={`text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{item.year}</p>
        </div>
    );

    const isInLibrary = embyLibrary?.has(`${selectedMedia.mediaType}_${selectedMedia.id}`);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>
            
            <div className={`relative w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}`}>
                
                {/* Floating Header Bar */}
                <div 
                    className={`absolute top-0 left-0 right-0 h-16 z-20 flex items-center justify-between px-4 transition-all duration-300`}
                    style={{ backgroundColor: isDarkMode ? `rgba(24, 24, 27, ${opacity})` : `rgba(255, 255, 255, ${opacity})`, backdropFilter: opacity > 0.8 ? 'blur(12px)' : 'none' }}
                >
                    <h3 
                        className={`font-bold text-lg truncate ml-12 transition-opacity duration-300 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                        style={{ opacity: opacity > 0.8 ? 1 : 0 }}
                    >
                        {selectedMedia.title}
                    </h3>
                <button 
                    onClick={onClose}
                        className={`p-2 rounded-full transition-all ${opacity > 0.5 ? (isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900') : 'bg-black/20 hover:bg-black/40 text-white backdrop-blur-md'}`}
                >
                    <X size={20} />
                </button>
                </div>

                {/* Request Form Overlay */}
                {showRequestForm && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                        <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>提交求片请求</h3>
                                <button onClick={() => setShowRequestForm(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                        期望分辨率
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['Any', '4K', '1080p', '720p'].map(res => (
                                            <button
                                                key={res}
                                                onClick={() => setResolution(res)}
                                                className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                                                    resolution === res
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : isDarkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {res === 'Any' ? '不限' : res}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-xs font-bold uppercase tracking-wider block mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                        备注 / 版本要求 (选填)
                                    </label>
                                    <textarea 
                                        value={requestNote}
                                        onChange={(e) => setRequestNote(e.target.value)}
                                        placeholder="例如：特效字幕版 / 导演剪辑版..."
                                        className={`w-full p-3 rounded-xl border outline-none transition-all text-sm min-h-[100px] ${
                                            isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                                        }`}
                                    />
                                </div>

                                <button 
                                    onClick={handleSubmitRequest}
                                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={18} /> 确认提交
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Scroll Container */}
                <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto scroll-smooth"
                >
                {/* Backdrop Section */}
                    <div className="relative w-full aspect-video md:aspect-[21/9]">
                    <div className="absolute inset-0">
                        {selectedMedia.backdropUrl ? (
                            <img 
                                src={IMAGE_BASE_URL + selectedMedia.backdropUrl} 
                                alt={selectedMedia.title}
                                className="w-full h-full object-cover"
                            />
                        ) : selectedMedia.posterUrl ? (
                            <img 
                                src={IMAGE_BASE_URL + selectedMedia.posterUrl} 
                                alt={selectedMedia.title}
                                className="w-full h-full object-cover blur-sm scale-110"
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                                <Film size={48} className="opacity-20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent"></div>
                    </div>
                    
                    {/* Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex items-end gap-6">
                        {/* Small Poster */}
                        <div className="w-24 md:w-32 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border-2 border-white/20 hidden md:block shrink-0">
                             {selectedMedia.posterUrl && (
                                <img 
                                    src={IMAGE_BASE_URL + selectedMedia.posterUrl} 
                                    alt={selectedMedia.title}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>

                        <div className="flex-1 min-w-0 mb-2 text-white shadow-black drop-shadow-md">
                             <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 bg-white/20 border-white/10 text-white backdrop-blur-md`}>
                                    {statusIcon}
                                    {statusText}
                                </span>
                                {isInLibrary && (
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 bg-emerald-500/80 border-emerald-500/20 text-white backdrop-blur-md">
                                        <Library size={12} />
                                        已入库
                                    </span>
                                )}
                                {selectedMedia.voteAverage > 0 && (
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 bg-yellow-500/80 text-white border border-yellow-500/20 backdrop-blur-md">
                                        <Star size={12} fill="currentColor" />
                                        {selectedMedia.voteAverage.toFixed(1)}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-1 truncate">
                                {selectedMedia.title}
                            </h2>
                            {selectedMedia.subtitle && (
                                <p className="text-lg font-medium opacity-80 truncate">
                                    {selectedMedia.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                    <div className="p-6 md:p-8 flex flex-col gap-6">
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {isInLibrary ? (
                            <button className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2">
                                <PlayCircle size={20} />
                                立即播放
                            </button>
                        ) : (
                            <button 
                                    onClick={() => {
                                        if (authState?.isAuthenticated) {
                                            setShowRequestForm(true);
                                        } else if (onRequest) {
                                            // Trigger login hint or flow if not authenticated (handled by parent usually)
                                            onRequest(selectedMedia); 
                                        }
                                    }}
                                disabled={!authState?.isAuthenticated}
                                className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                                    authState?.isAuthenticated 
                                    ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95' 
                                    : 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                                }`}
                            >
                                <MonitorPlay size={20} />
                                {authState?.isAuthenticated ? '求片 / 点播' : '登录后求片'}
                            </button>
                        )}
                        
                        <button className={`px-4 py-2.5 rounded-xl font-bold border transition-all flex items-center gap-2 ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                            <Youtube size={20} />
                            预告片
                        </button>
                    </div>

                    {/* Action Buttons & Info Grid */}
                    <div className="space-y-6 md:space-y-8">
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                            <button className="flex items-center justify-center gap-2 px-8 py-3 md:py-3.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 w-full sm:w-auto text-sm md:text-base">
                                <PlayCircle size={20} className="md:w-[22px] md:h-[22px] text-white/20" fill="currentColor" /> 
                                {isStreaming ? '前往播放' : '全网搜搜'}
                            </button>
                            {selectedMedia.videos && selectedMedia.videos.length > 0 && (
                                <button 
                                    onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedMedia.videos![0].key}`, '_blank')}
                                    className={`flex items-center justify-center gap-2 px-6 py-3 md:py-3.5 rounded-full font-medium transition-all border w-full sm:w-auto text-sm md:text-base ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}
                                >
                                    <Youtube size={20} className="md:w-[22px] md:h-[22px] text-red-500"/> 预告片
                                </button>
                            )}
                        </div>

                        {/* Re-positioned Info Grid (Formerly Sidebar) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Platform Info */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center gap-2 text-xs font-bold opacity-50 uppercase tracking-wider">
                                    <MonitorPlay size={14} /> 播放渠道
                                </div>
                                <div className="flex items-center justify-between">
                                    {selectedMedia.hasProvider ? (
                                        <>
                                            <span className={`px-3 py-1.5 rounded text-sm font-bold border ${selectedMedia.badgeColorClass || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'}`}>
                                                {selectedMedia.platform}
                                            </span>
                                            <span className={`text-xs font-mono px-2 py-1 rounded border ${isDarkMode ? 'border-white/10 text-zinc-400' : 'border-slate-200 text-slate-500'}`}>
                                                {selectedMedia.providerRegion}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="flex items-center gap-2 text-sm opacity-60">
                                            <HelpCircle size={16}/> 暂无确切源
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Release Timeline */}
                            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center gap-2 text-xs font-bold opacity-50 uppercase tracking-wider">
                                    <Calendar size={14} /> 发行时间表
                                </div>
                                <div className="space-y-2">
                                    {selectedMedia.releaseDates?.theatrical && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1.5 opacity-70"><Film size={12}/> 院线上映</span>
                                            <span className="font-mono font-medium">{selectedMedia.releaseDates.theatrical}</span>
                                        </div>
                                    )}
                                    {selectedMedia.releaseDates?.digital && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1.5 opacity-70"><MonitorPlay size={12}/> 数字上线</span>
                                            <span className={`font-mono font-medium ${isStreaming ? 'text-emerald-500' : ''}`}>{selectedMedia.releaseDates.digital}</span>
                                        </div>
                                    )}
                                    {(!selectedMedia.releaseDates?.theatrical && !selectedMedia.releaseDates?.digital) && (
                                         <div className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1.5 opacity-70"><Calendar size={12}/> 综合日期</span>
                                            <span className="font-mono font-medium">{selectedMedia.releaseDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 3: Origin & Specs */}
                            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center gap-2 text-xs font-bold opacity-50 uppercase tracking-wider">
                                    <Globe size={14} /> 产地与规格
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] opacity-50 block">地区</span>
                                        <span className="text-sm font-medium">{selectedMedia.region}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] opacity-50 block">语言</span>
                                        <span className="text-sm font-medium uppercase">{selectedMedia.original_language || 'N/A'}</span>
                                    </div>
                                </div>
                                {isTV && (
                                    <div className="pt-2 mt-auto border-t border-dashed border-white/10 flex justify-between items-center text-xs">
                                        <span className="opacity-60">最新</span>
                                        {selectedMedia.lastEpisodeToAir ? (
                                            <span className="text-indigo-500 font-bold">S{selectedMedia.lastEpisodeToAir.season_number} E{selectedMedia.lastEpisodeToAir.episode_number}</span>
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TV Seasons & Episodes Section */}
                    {isTV && selectedMedia.seasons && selectedMedia.seasons.length > 0 && (
                        <section className="animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <Layers size={20} className="text-indigo-500"/> 剧集详情
                                </h3>
                                <span className={`text-xs font-mono px-2 py-1 rounded ${isDarkMode ? 'bg-white/10 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                                    共 {selectedMedia.numberOfSeasons || selectedMedia.seasons.length} 季
                                    {selectedMedia.numberOfEpisodes ? ` · ${selectedMedia.numberOfEpisodes} 集` : ''}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-none">
                                {selectedMedia.seasons.map(season => (
                                    <button
                                        key={season.id}
                                        onClick={() => setSelectedSeason(season.season_number)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                                            selectedSeason === season.season_number
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                            : (isDarkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
                                        }`}
                                    >
                                        {season.name}
                                    </button>
                                ))}
                            </div>

                            <div className={`rounded-2xl border divide-y ${isDarkMode ? 'bg-white/5 border-white/5 divide-white/5' : 'bg-white border-slate-200 divide-slate-100'}`}>
                                {episodesLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className={`mt-2 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>加载分集信息...</p>
                                    </div>
                                ) : episodes.length > 0 ? (
                                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20">
                                        {episodes.map(episode => {
                                            const inLibrary = embyLibrary?.has(`tv_${selectedMedia.id}_s${episode.season_number}_e${episode.episode_number}`);
                                            return (
                                                <div key={episode.id} className={`p-4 flex gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                                                    <div className="w-32 aspect-video shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-800 relative">
                                                        {episode.still_path ? (
                                                            <img src={`${IMAGE_BASE_URL}${episode.still_path}`} className="w-full h-full object-cover" alt={episode.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                                <Film size={20} />
                                                            </div>
                                                        )}
                                                        
                                                        {inLibrary && (
                                                            <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-md z-10" title="已入库">
                                                                <CheckCircle2 size={12} strokeWidth={3} />
                                                            </div>
                                                        )}

                                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono backdrop-blur-sm">
                                                            E{episode.episode_number}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className={`font-bold text-sm truncate flex items-center gap-2 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                                                                {episode.name}
                                                                {inLibrary && <span className="text-[10px] text-emerald-500 border border-emerald-500/30 px-1 rounded bg-emerald-500/10">已入库</span>}
                                                            </h4>
                                                            <span className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                                <Star size={10} fill="currentColor"/> {episode.vote_average.toFixed(1)}
                                                            </span>
                                                        </div>
                                                        <div className={`text-xs mt-1 mb-2 line-clamp-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                            {episode.overview || '暂无本集简介'}
                                                        </div>
                                                        <div className={`text-[10px] font-mono ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                                            播出日期: {episode.air_date}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-sm opacity-50">暂无分集信息</div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Layout Grid for Synopsis & Cast (Side by Side on Large Screens, Stacked on Small) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-8">
                            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Film size={20} className="text-indigo-500"/> 剧情简介
                            </h3>
                            <div className={`p-6 rounded-2xl border text-lg leading-relaxed ${isDarkMode ? 'bg-white/5 border-white/5 text-zinc-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                {selectedMedia.overview || "暂无中文剧情简介。"}
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                             <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <User size={20} className="text-indigo-500"/> 主要演员
                            </h3>
                            <div className="space-y-3">
                                {selectedMedia.cast && selectedMedia.cast.length > 0 ? selectedMedia.cast.map(actor => (
                                        <div 
                                            key={actor.id} 
                                            onClick={() => onPersonClick && onPersonClick(actor.id)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50 hover:scale-105'}`}
                                        >
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shrink-0">
                                            {actor.profile_path ? (
                                                <img src={`${PROFILE_BASE_URL}${actor.profile_path}`} className="w-full h-full object-cover" alt={actor.name} />
                                            ) : (
                                                <User className="w-full h-full p-2 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{actor.name}</p>
                                            <p className={`text-xs truncate ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{actor.character}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>暂无演职员信息</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Collection Section */}
                    {collectionItems.length > 0 && (
                        <div className="mt-10">
                            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Library size={20} className="text-indigo-500"/> {selectedMedia.collectionName || '系列合集'}
                            </h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
                                {collectionItems.map(item => (
                                    <RelatedCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations Section */}
                    {recommendations.length > 0 && (
                        <div className="mt-10">
                            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Disc size={20} className="text-indigo-500"/> 猜你喜欢
                            </h3>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x">
                                {recommendations.map(item => (
                                    <RelatedCard key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailModal;
