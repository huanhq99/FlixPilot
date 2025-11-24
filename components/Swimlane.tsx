import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { MediaItem } from '../types';

interface SwimlaneProps {
    title: string;
    items: MediaItem[];
    onItemClick: (id: number, type: 'movie' | 'tv') => void;
    isDarkMode: boolean;
    embyLibrary: Set<string>;
    icon?: React.ReactNode;
}

const Swimlane: React.FC<SwimlaneProps> = ({ title, items, onItemClick, isDarkMode, embyLibrary, icon }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeft(scrollLeft > 0);
            setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="space-y-4 py-4 select-none">
            <div className="flex items-center justify-between px-1">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {icon}
                    {title}
                </h3>
            </div>

            <div className="group relative">
                {/* Left Arrow */}
                <button 
                    onClick={() => scroll('left')}
                    className={`absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center transition-opacity duration-300 ${showLeft ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronLeft size={32} className="text-white drop-shadow-lg" />
                </button>

                {/* Right Arrow */}
                <button 
                    onClick={() => scroll('right')}
                    className={`absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-black/60 to-transparent flex items-center justify-center transition-opacity duration-300 ${showRight ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronRight size={32} className="text-white drop-shadow-lg" />
                </button>

                {/* Content */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-4 overflow-x-auto py-6 scrollbar-none snap-x px-4"
                >
                    {items.map((item) => (
                        <div key={`${item.mediaType}-${item.id}`} className="w-[140px] sm:w-[160px] md:w-[180px] shrink-0 snap-start">
                            <MediaCard 
                                item={item}
                                viewMode="grid"
                                onClick={onItemClick}
                                isDarkMode={isDarkMode}
                                isInLibrary={embyLibrary.has(`${item.mediaType}_${item.id}`)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Swimlane;
