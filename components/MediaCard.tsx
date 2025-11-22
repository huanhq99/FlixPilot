import React, { useState } from 'react';
import { PlayCircle, Star, ImageIcon } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaCardProps {
    item: MediaItem;
    viewMode: 'grid' | 'list';
    onClick: (id: number, type: 'movie' | 'tv') => void;
    isDarkMode: boolean;
}

const MediaCard: React.FC<MediaCardProps> = React.memo(({ item, viewMode, onClick, isDarkMode }) => {
    const [imgError, setImgError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Default Colors
    let badgeClass = 'bg-black/60 border-white/10 text-white';
    let statusClass = 'border-slate-200 bg-slate-100 text-slate-500';

    // 1. Priority: Specific Brand Color
    if (item.badgeColorClass) {
        badgeClass = item.badgeColorClass;
        statusClass = item.badgeColorClass.replace('text-white', '').replace('text-black', '') + ' text-white opacity-90'; 
    } 
    // 2. Fallback: Status Color
    else if (item.status === 'streaming') {
        badgeClass = 'bg-indigo-600/95 border-indigo-400/30 shadow-md text-white';
        statusClass = 'bg-indigo-600 text-white border-indigo-600';
    } else if (item.status === 'released') {
        badgeClass = 'bg-blue-600/90 border-blue-400/30 shadow-sm text-white';
        statusClass = 'bg-blue-600 text-white border-blue-600';
    } else {
        statusClass = 'bg-amber-500 text-white border-amber-500';
    }

    // TV Specific Badge (e.g., S1 E8)
    const tvUpdateBadge = item.mediaType === 'tv' && item.lastEpisodeToAir 
        ? `S${item.lastEpisodeToAir.season_number} E${item.lastEpisodeToAir.episode_number}` 
        : null;

    if (viewMode === 'list') {
        return (
            <div 
                onClick={() => onClick(item.id, item.mediaType)} 
                className={`group flex gap-3 sm:gap-4 border p-2 rounded-xl transition-all cursor-pointer items-center ${
                    isDarkMode 
                    ? 'bg-zinc-900/20 hover:bg-zinc-900/50 border-white/5 hover:border-white/10' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
            >
                <div className="w-10 sm:w-12 aspect-[2/3] shrink-0 rounded-lg overflow-hidden relative bg-gray-200 dark:bg-zinc-800">
                    {(!item.posterUrl || imgError) ? (
                         <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${item.posterColor}`}>
                            <span className="text-white/30 font-bold text-xs">{item.posterText}</span>
                         </div>
                    ) : (
                        <img 
                            src={item.posterUrl} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            onError={() => setImgError(true)} 
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 sm:gap-4 items-center">
                    <div className="col-span-7 sm:col-span-5 md:col-span-4">
                        <h3 className={`text-xs sm:text-sm font-bold truncate flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {item.title}
                            <span className={`text-[10px] sm:text-xs font-normal ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                ({item.year})
                            </span>
                        </h3>
                        <p className={`text-[10px] truncate ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{item.subtitle}</p>
                    </div>
                    <div className={`col-span-2 text-[10px] hidden md:block ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                        <div>{item.releaseDate}</div>
                        {tvUpdateBadge && (
                            <div className={`mt-0.5 font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{tvUpdateBadge}</div>
                        )}
                    </div>
                    <div className="col-span-3 sm:col-span-3 md:col-span-2">
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${
                           item.badgeColorClass ? item.badgeColorClass + ' border-opacity-20' : statusClass
                        } max-w-full truncate block text-center`}>
                            {item.badgeLabel}
                        </span>
                    </div>
                    <div className="col-span-2 sm:col-span-4 text-right flex justify-end gap-2 items-center">
                        {item.voteAverage > 0 && (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                                <Star size={10} className="sm:w-3 sm:h-3" fill="currentColor"/> {item.voteAverage.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={() => onClick(item.id, item.mediaType)} 
            className="group cursor-pointer flex flex-col h-full"
        >
            <div className={`relative aspect-[2/3] w-full mb-3 rounded-xl overflow-hidden shadow-lg transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-xl ${isDarkMode ? 'bg-zinc-800 shadow-black/50' : 'bg-slate-200 shadow-slate-200'}`}>
                {(!item.posterUrl || imgError) ? (
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.posterColor} flex flex-col items-center justify-center p-2 text-center`}>
                        <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                        <span className="text-white/20 font-black text-3xl tracking-tighter rotate-[-10deg] select-none">
                            {item.posterText}
                        </span>
                        <ImageIcon className="text-white/10 mt-2" size={24} />
                    </div>
                ) : (
                    <>
                        <img 
                            src={item.posterUrl} 
                            alt={item.title}
                            className={`w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setLoaded(true)}
                            onError={() => setImgError(true)}
                        />
                        {!loaded && <div className={`absolute inset-0 animate-pulse ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`}></div>}
                    </>
                )}
                
                {/* Top Left Badge (Platform/Status) */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[85%] z-10">
                    <span className={`px-2 py-0.5 rounded backdrop-blur-md text-[10px] font-bold border ${badgeClass} truncate w-full shadow-lg`}>
                        {item.badgeLabel}
                    </span>
                </div>

                {/* Top Right Rating */}
                {item.voteAverage > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 shadow-lg z-10">
                        <Star size={8} fill="currentColor" />
                        <span className="text-[10px] font-bold">{item.voteAverage.toFixed(1)}</span>
                    </div>
                )}

                {/* Bottom Transparent Gradient Layer */}
                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0 pointer-events-none"></div>

                {/* Bottom Info Elements */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-10 flex items-center justify-between">
                    {/* Type Pill */}
                    <span className="text-[10px] font-bold text-white/90 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 shadow-sm">
                        {item.type}
                    </span>
                    
                    {/* Date / Episode Info */}
                    <span className={`text-[11px] font-bold font-mono drop-shadow-md ${tvUpdateBadge ? 'text-indigo-300' : 'text-zinc-200'}`}>
                        {tvUpdateBadge || (item.releaseDate === 'TBA' ? '待定' : item.releaseDate)}
                    </span>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px] z-20">
                    <PlayCircle size={48} className="text-white drop-shadow-2xl transform scale-75 group-hover:scale-100 transition-all duration-300" fill="rgba(255,255,255,0.2)" />
                </div>
            </div>

            {/* Text Info */}
            <div className="space-y-1 px-1 flex-1 flex flex-col mt-2">
                <h3 className={`text-xs md:text-sm font-bold truncate transition-colors w-full ${isDarkMode ? 'text-zinc-100 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'}`} title={item.title}>
                    {item.title}
                    <span className={`ml-1.5 font-normal opacity-60 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                        ({item.year})
                    </span>
                </h3>
                <p className={`text-[10px] md:text-xs truncate opacity-60 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {item.subtitle || ' '}
                </p>
            </div>
        </div>
    );
});

export default MediaCard;