import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Film, Tv, Star, Play } from 'lucide-react';
import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    onMediaClick: (id: number, type: 'movie' | 'tv') => void;
}

interface CalendarItem {
    id: number;
    title: string;
    date: string;
    type: 'movie' | 'tv';
    posterUrl: string | null;
    voteAverage: number;
    overview: string;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, isDarkMode, onMediaClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'all' | 'movie' | 'tv'>('all');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 获取当月第一天是星期几
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    useEffect(() => {
        if (isOpen) {
            fetchUpcoming();
        }
    }, [isOpen, currentDate, viewType]);

    const fetchUpcoming = async () => {
        setLoading(true);
        try {
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            
            const items: CalendarItem[] = [];

            // 获取电影
            if (viewType === 'all' || viewType === 'movie') {
                const movieRes = await fetch(
                    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=zh-CN&region=CN&primary_release_date.gte=${startDate}&primary_release_date.lte=${endDate}&sort_by=primary_release_date.asc`
                );
                const movieData = await movieRes.json();
                movieData.results?.forEach((m: any) => {
                    items.push({
                        id: m.id,
                        title: m.title || m.original_title,
                        date: m.release_date,
                        type: 'movie',
                        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null,
                        voteAverage: m.vote_average || 0,
                        overview: m.overview || ''
                    });
                });
            }

            // 获取剧集
            if (viewType === 'all' || viewType === 'tv') {
                const tvRes = await fetch(
                    `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=zh-CN&first_air_date.gte=${startDate}&first_air_date.lte=${endDate}&sort_by=first_air_date.asc`
                );
                const tvData = await tvRes.json();
                tvData.results?.forEach((t: any) => {
                    items.push({
                        id: t.id,
                        title: t.name || t.original_name,
                        date: t.first_air_date,
                        type: 'tv',
                        posterUrl: t.poster_path ? `https://image.tmdb.org/t/p/w185${t.poster_path}` : null,
                        voteAverage: t.vote_average || 0,
                        overview: t.overview || ''
                    });
                });
            }

            setCalendarItems(items);
        } catch (error) {
            console.error('Failed to fetch calendar items:', error);
        }
        setLoading(false);
    };

    const getItemsForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return calendarItems.filter(item => item.date === dateStr);
    };

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (day: number) => {
        const today = new Date();
        return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    };

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

    if (!isOpen) return null;

    // 生成日历格子
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-6xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl ${
                isDarkMode ? 'bg-zinc-900' : 'bg-white'
            }`}>
                {/* Header */}
                <div className={`sticky top-0 z-10 p-4 border-b ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Calendar className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                上映日历
                            </h2>
                            
                            {/* 类型筛选 */}
                            <div className={`flex gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                {[
                                    { key: 'all', label: '全部' },
                                    { key: 'movie', label: '电影', icon: Film },
                                    { key: 'tv', label: '剧集', icon: Tv }
                                ].map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setViewType(key as any)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                                            viewType === key
                                                ? isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow'
                                                : isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {Icon && <Icon size={14} />}
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* 月份导航 */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={prevMonth}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className={`text-lg font-bold min-w-[140px] text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {year}年 {monthNames[month]}
                                </span>
                                <button
                                    onClick={nextMonth}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            
                            <button
                                onClick={goToToday}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                今天
                            </button>
                            
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-lg transition-colors ${
                                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* 星期标题 */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {dayNames.map(day => (
                                    <div
                                        key={day}
                                        className={`text-center py-2 text-sm font-medium ${
                                            isDarkMode ? 'text-zinc-500' : 'text-slate-500'
                                        }`}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* 日期格子 */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, idx) => {
                                    if (day === null) {
                                        return <div key={`empty-${idx}`} className="aspect-square" />;
                                    }

                                    const items = getItemsForDay(day);
                                    const hasItems = items.length > 0;

                                    return (
                                        <div
                                            key={day}
                                            className={`aspect-square p-1 rounded-lg border transition-all ${
                                                isToday(day)
                                                    ? 'border-indigo-500 bg-indigo-500/10'
                                                    : hasItems
                                                        ? isDarkMode ? 'border-zinc-700 bg-zinc-800/50' : 'border-slate-200 bg-slate-50'
                                                        : isDarkMode ? 'border-zinc-800/50' : 'border-slate-100'
                                            }`}
                                        >
                                            <div className={`text-xs font-medium mb-1 ${
                                                isToday(day)
                                                    ? 'text-indigo-500'
                                                    : isDarkMode ? 'text-zinc-400' : 'text-slate-600'
                                            }`}>
                                                {day}
                                            </div>
                                            
                                            {/* 内容项目 */}
                                            <div className="space-y-0.5 max-h-[80px] overflow-y-auto scrollbar-hide">
                                                {items.slice(0, 3).map(item => (
                                                    <button
                                                        key={`${item.type}-${item.id}`}
                                                        onClick={() => onMediaClick(item.id, item.type)}
                                                        className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-colors ${
                                                            item.type === 'movie'
                                                                ? isDarkMode ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                : isDarkMode ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                        }`}
                                                        title={item.title}
                                                    >
                                                        {item.type === 'movie' ? '🎬' : '📺'} {item.title}
                                                    </button>
                                                ))}
                                                {items.length > 3 && (
                                                    <div className={`text-[10px] px-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                        +{items.length - 3} 更多
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 本月上映列表 */}
                            {calendarItems.length > 0 && (
                                <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                    <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        本月上映 ({calendarItems.length})
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {calendarItems.slice(0, 12).map(item => (
                                            <button
                                                key={`${item.type}-${item.id}`}
                                                onClick={() => onMediaClick(item.id, item.type)}
                                                className={`group text-left rounded-xl overflow-hidden transition-all hover:scale-105 ${
                                                    isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-slate-100 hover:bg-slate-200'
                                                }`}
                                            >
                                                <div className="aspect-[2/3] relative">
                                                    {item.posterUrl ? (
                                                        <img
                                                            src={item.posterUrl}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center ${
                                                            isDarkMode ? 'bg-zinc-700' : 'bg-slate-200'
                                                        }`}>
                                                            {item.type === 'movie' ? <Film size={32} /> : <Tv size={32} />}
                                                        </div>
                                                    )}
                                                    
                                                    {/* 日期标签 */}
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
                                                        {item.date?.split('-').slice(1).join('/')}
                                                    </div>
                                                    
                                                    {/* 类型标签 */}
                                                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        item.type === 'movie' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                    }`}>
                                                        {item.type === 'movie' ? '电影' : '剧集'}
                                                    </div>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Play size={32} className="text-white" fill="white" />
                                                    </div>
                                                </div>
                                                
                                                <div className="p-2">
                                                    <h4 className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {item.title}
                                                    </h4>
                                                    {item.voteAverage > 0 && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Star size={12} className="text-amber-400" fill="currentColor" />
                                                            <span className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                                {item.voteAverage.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarModal;
