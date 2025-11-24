import React from 'react';
import { PlayCircle, Info } from 'lucide-react';
import { MediaItem } from '../types';

interface HeroSectionProps {
    item: MediaItem;
    onMoreInfo: () => void;
    isDarkMode: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ item, onMoreInfo, isDarkMode }) => {
    return (
        <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden rounded-3xl shadow-2xl mb-8 group select-none">
            {/* Background Image */}
            <div className="absolute inset-0">
                {item.backdropUrl ? (
                    <img 
                        src={item.backdropUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 pointer-events-none"
                    />
                ) : (
                    <div className={`w-full h-full ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'}`}></div>
                )}
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-[#18181b] via-[#18181b]/40' : 'from-white via-white/20'} to-transparent pointer-events-none`}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none"></div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 lg:w-1/2 flex flex-col gap-4 md:gap-6 z-10">
                {/* Status Badge */}
                <div className="flex items-center gap-2 animate-fade-in-up">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${item.badgeColorClass ? 'text-white border-white/20 bg-white/10' : 'text-white border-white/20 bg-black/30'}`}>
                        {item.badgeLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 bg-white/10 text-white backdrop-blur-md">
                        {item.type}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-lg animate-fade-in-up delay-100">
                    {item.title}
                </h1>

                {/* Overview */}
                <p className="text-sm md:text-lg text-gray-200 line-clamp-3 md:line-clamp-4 leading-relaxed drop-shadow-md animate-fade-in-up delay-200">
                    {item.overview}
                </p>

                {/* Actions */}
                <div className="flex gap-4 pt-2 animate-fade-in-up delay-300">
                    <button 
                        onClick={onMoreInfo}
                        className="px-8 py-3 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-lg shadow-white/10"
                    >
                        <Info size={20} />
                        了解更多
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
