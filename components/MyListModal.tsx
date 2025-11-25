import React, { useState } from 'react';
import { X, Clock, CheckCircle2, XCircle, Loader2, Heart, Film, Tv, Trash2 } from 'lucide-react';
import { RequestItem, FavoriteItem } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface MyListModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    requests: RequestItem[];
    favorites: FavoriteItem[];
    currentUser?: string;
    onRemoveFavorite: (id: number, mediaType: 'movie' | 'tv') => void;
    onMediaClick: (id: number, type: 'movie' | 'tv') => void;
}

const MyListModal: React.FC<MyListModalProps> = ({
    isOpen,
    onClose,
    isDarkMode,
    requests,
    favorites,
    currentUser,
    onRemoveFavorite,
    onMediaClick
}) => {
    const [activeTab, setActiveTab] = useState<'requests' | 'favorites'>('requests');

    if (!isOpen) return null;

    // 过滤当前用户的请求
    const userRequests = requests.filter(r => r.requestedBy === currentUser);
    const userFavorites = favorites.filter(f => f.addedBy === currentUser);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'rejected':
                return <XCircle size={14} className="text-red-500" />;
            case 'processing':
                return <Loader2 size={14} className="text-blue-500 animate-spin" />;
            default:
                return <Clock size={14} className="text-amber-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed': return '已完成';
            case 'rejected': return '已拒绝';
            case 'processing': return '处理中';
            default: return '等待中';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === 'requests'
                                    ? 'bg-indigo-600 text-white'
                                    : isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            我的求片 ({userRequests.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('favorites')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === 'favorites'
                                    ? 'bg-pink-500 text-white'
                                    : isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            <Heart size={14} /> 收藏夹 ({userFavorites.length})
                        </button>
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'requests' ? (
                        userRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 opacity-50">
                                <Film size={48} className="mb-4" />
                                <p className="text-sm">暂无求片记录</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {userRequests.map(item => (
                                    <div 
                                        key={`${item.mediaType}-${item.id}`}
                                        onClick={() => onMediaClick(item.id, item.mediaType)}
                                        className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            isDarkMode 
                                                ? 'bg-zinc-900/50 border-white/5 hover:border-white/10' 
                                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                        }`}
                                    >
                                        <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-gray-200">
                                            {item.posterUrl && (
                                                <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.mediaType === 'movie' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {item.mediaType === 'movie' ? '电影' : '剧集'}
                                                </span>
                                                <h3 className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {item.title}
                                                </h3>
                                                <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                    ({item.year})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(item.status)}
                                                    {getStatusText(item.status)}
                                                </span>
                                                <span className={isDarkMode ? 'text-zinc-500' : 'text-slate-400'}>
                                                    {new Date(item.requestDate).toLocaleDateString()}
                                                </span>
                                                {item.resolutionPreference && item.resolutionPreference !== 'Any' && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        {item.resolutionPreference}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        userFavorites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 opacity-50">
                                <Heart size={48} className="mb-4" />
                                <p className="text-sm">收藏夹为空</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {userFavorites.map(item => (
                                    <div 
                                        key={`${item.mediaType}-${item.id}`}
                                        className="group relative"
                                    >
                                        <div 
                                            onClick={() => onMediaClick(item.id, item.mediaType)}
                                            className={`aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all group-hover:scale-105 ${
                                                isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'
                                            }`}
                                        >
                                            {item.posterUrl && (
                                                <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFavorite(item.id, item.mediaType);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="mt-2">
                                            <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {item.title}
                                            </h4>
                                            <p className={`text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                {item.year}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyListModal;
