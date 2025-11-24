import React from 'react';
import { User, Search } from 'lucide-react';
import { IMAGE_BASE_URL, PROFILE_BASE_URL } from '../constants';

interface PersonCardProps {
    person: any;
    onClick: (id: number) => void;
    isDarkMode: boolean;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick, isDarkMode }) => {
    return (
        <div 
            onClick={() => onClick(person.id)}
            className={`group relative rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-white shadow-sm hover:shadow-md'}`}
        >
            <div className="aspect-[2/3] w-full overflow-hidden bg-gray-200 relative">
                {person.profile_path ? (
                    <img 
                        src={`${PROFILE_BASE_URL}${person.profile_path}`} 
                        alt={person.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                        <User size={48} className="mb-2 opacity-50" />
                        <span className="text-xs text-center">暂无照片</span>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white text-xs line-clamp-2">
                        {person.known_for?.map((work: any) => work.title || work.name).join(' · ')}
                    </p>
                </div>
            </div>

            <div className="p-3">
                <h3 className={`font-bold text-sm truncate mb-1 ${isDarkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
                    {person.name}
                </h3>
                {person.known_for_department && (
                     <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                        {person.known_for_department === 'Acting' ? '演员' : person.known_for_department}
                    </span>
                )}
            </div>
        </div>
    );
};

export default PersonCard;

