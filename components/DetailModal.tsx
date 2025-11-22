import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Star, Clock, CheckCircle2, Film, PlayCircle, Youtube, User, Terminal, HelpCircle, Calendar, X, Tv, Layers, LayoutList, Disc, MonitorPlay, Globe, Languages
} from 'lucide-react';
import { MediaItem, Episode } from '../types';
import { IMAGE_BASE_URL, PROFILE_BASE_URL } from '../constants';
import { fetchSeasonDetails } from '../services/tmdbService';

interface DetailModalProps {
    selectedMedia: MediaItem;
    onClose: () => void;
    isDarkMode: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({ selectedMedia, onClose, isDarkMode }) => {
    const isStreaming = selectedMedia.status === 'streaming';
    const isReleased = selectedMedia.status === 'released';
    const isTV = selectedMedia.mediaType === 'tv';
    
    const [selectedSeason, setSelectedSeason] = useState<number | null>(
        selectedMedia.seasons && selectedMedia.seasons.length > 0 ? selectedMedia.seasons[0].season_number : null
    );
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [episodesLoading, setEpisodesLoading] = useState(false);

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

    // TV Specific Badge (e.g., S1 E8)
    const tvUpdateBadge = selectedMedia.mediaType === 'tv' && selectedMedia.lastEpisodeToAir 
        ? `S${selectedMedia.lastEpisodeToAir.season_number} E${selectedMedia.lastEpisodeToAir.episode_number}` 
        : null;

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

    return (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${isDarkMode ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
            {/* Hero Section */}
            <div className="relative h-[45vh] md:h-[55vh] w-full">
                {selectedMedia.backdropUrl ? (
                    <img src={selectedMedia.backdropUrl} className="w-full h-full object-cover" alt="backdrop" />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${selectedMedia.posterColor}`}></div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-[#09090b]' : 'from-slate-50'} via-transparent to-transparent`}></div>
                
                <div className="absolute top-4 left-4 z-20">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all border border-white/10"
                    >
                        <ArrowLeft size={18} /> <span className="text-sm font-medium">返回</span>
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                            {selectedMedia.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-white/90">
                            <span className={`px-2.5 py-1 rounded border font-bold flex items-center gap-1.5 backdrop-blur-md ${statusBg} ${statusColor} ${selectedMedia.badgeColorClass ? 'border-white/20' : ''}`}>
                                {statusIcon}
                                {statusText}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400 font-bold bg-black/30 px-2 py-1 rounded backdrop-blur-md">
                                <Star size={14} fill="currentColor" /> {selectedMedia.voteAverage.toFixed(1)}
                            </span>
                            
                            {/* TV Episode Badge in Hero */}
                            {tvUpdateBadge && (
                                <span className="bg-indigo-600 text-white px-2.5 py-1 rounded font-bold backdrop-blur-md shadow-lg shadow-indigo-500/30">
                                    {tvUpdateBadge}
                                </span>
                            )}

                            <span className="bg-white/10 px-2 py-1 rounded backdrop-blur-md">{selectedMedia.year}</span>
                            
                            {selectedMedia.runtime && (
                                <span className="bg-white/10 px-2 py-1 rounded backdrop-blur-md">{selectedMedia.runtime} 分钟</span>
                            )}
                            {selectedMedia.genres?.slice(0, 3).map(g => (
                                <span key={g.id} className="px-2 py-1 rounded-full text-xs border border-white/20 bg-white/5 backdrop-blur-md">
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                <div className="space-y-10">
                    
                    {/* Action Buttons & Info Grid */}
                    <div className="space-y-8">
                        <div className="flex flex-wrap gap-4">
                            <button className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95">
                                <PlayCircle size={22} fill="currentColor" className="text-white/20" /> 
                                {isStreaming ? '前往播放' : '全网搜搜'}
                            </button>
                            {selectedMedia.videos && selectedMedia.videos.length > 0 && (
                                <button 
                                    onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedMedia.videos![0].key}`, '_blank')}
                                    className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}
                                >
                                    <Youtube size={22} className="text-red-500"/> 预告片
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
                                        {episodes.map(episode => (
                                            <div key={episode.id} className={`p-4 flex gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                                                <div className="w-32 aspect-video shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-800 relative">
                                                    {episode.still_path ? (
                                                        <img src={`${IMAGE_BASE_URL}${episode.still_path}`} className="w-full h-full object-cover" alt={episode.name} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                            <Film size={20} />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono backdrop-blur-sm">
                                                        E{episode.episode_number}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`font-bold text-sm truncate ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                                                            {episode.name}
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
                                        ))}
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
                                    <div key={actor.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
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
                </div>
            </div>
        </div>
    );
};

export default DetailModal;