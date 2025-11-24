import React from 'react';
import { X, MapPin, Calendar, User, Film } from 'lucide-react';
import { MediaItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface PersonModalProps {
    person: any;
    credits: any[];
    onClose: () => void;
    onMediaClick: (id: number, type: 'movie' | 'tv') => void;
    isDarkMode: boolean;
}

const PersonModal: React.FC<PersonModalProps> = ({ person, credits, onClose, onMediaClick, isDarkMode }) => {
    const sortedCredits = credits
        .filter(c => c.poster_path)
        .sort((a, b) => {
            const dateA = a.release_date || a.first_air_date || '0000';
            const dateB = b.release_date || b.first_air_date || '0000';
            return dateB.localeCompare(dateA);
        });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>
            
            <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#18181b] text-white' : 'bg-white text-slate-900'}`}>
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col md:flex-row">
                    {/* Left: Profile */}
                    <div className={`w-full md:w-1/3 p-6 md:p-8 flex flex-col items-center text-center border-b md:border-b-0 md:border-r ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden shadow-2xl mb-6 border-4 border-white/10">
                            {person.profile_path ? (
                                <img src={`${IMAGE_BASE_URL}${person.profile_path}`} className="w-full h-full object-cover" alt={person.name} />
                            ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <User size={64} className="text-gray-400" />
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{person.name}</h2>
                        {person.also_known_as && person.also_known_as.length > 0 && (
                            <p className={`text-xs mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                {person.also_known_as.find((n: string) => /[\u4e00-\u9fa5]/.test(n)) || person.place_of_birth}
                            </p>
                        )}
                        
                        <div className={`w-full space-y-3 text-sm ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                            {person.birthday && (
                                <div className="flex items-center justify-between w-full px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5">
                                    <span className="flex items-center gap-2 opacity-70"><Calendar size={14} /> 生日</span>
                                    <span className="font-mono">{person.birthday}</span>
                                </div>
                            )}
                            {person.place_of_birth && (
                                <div className="flex items-center justify-between w-full px-4 py-2 rounded-lg bg-black/5 dark:bg-white/5">
                                    <span className="flex items-center gap-2 opacity-70"><MapPin size={14} /> 出生地</span>
                                    <span className="truncate max-w-[150px]" title={person.place_of_birth}>{person.place_of_birth}</span>
                                </div>
                            )}
                        </div>

                        {person.biography && (
                            <div className={`mt-6 text-left text-xs leading-relaxed line-clamp-[10] ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                {person.biography}
                            </div>
                        )}
                    </div>

                    {/* Right: Credits */}
                    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Film className="text-indigo-500" /> 参演作品 ({sortedCredits.length})
                        </h3>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                            {sortedCredits.map((item: any) => (
                                <div 
                                    key={`${item.media_type}-${item.id}`} 
                                    onClick={() => onMediaClick(item.id, item.media_type)}
                                    className="group cursor-pointer"
                                >
                                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-200 relative mb-2 shadow-sm transition-all group-hover:shadow-lg group-hover:scale-105">
                                        {item.poster_path ? (
                                            <img src={`${IMAGE_BASE_URL}${item.poster_path}`} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">N/A</div>
                                        )}
                                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm font-mono">
                                            {(item.release_date || item.first_air_date || '').substring(0, 4)}
                                        </div>
                                    </div>
                                    <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-zinc-200' : 'text-slate-700'}`}>
                                        {item.title || item.name}
                                    </h4>
                                    <p className={`text-[10px] truncate ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                        as {item.character || 'Unknown'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonModal;

