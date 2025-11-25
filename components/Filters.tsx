import React, { useState } from 'react';
import { Layers, MapPin, Calendar, Filter, X, Tv, Tag, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { TYPES, REGIONS, YEARS, SORTS, PLATFORMS, GENRES } from '../constants';
import { FilterState } from '../types';

// 快速筛选预设
const QUICK_PRESETS = [
    { label: '高分电影', icon: '🏆', filters: { type: 'movie', sort: 'vote_average.desc', genre: '', region: '', platform: '', year: '全部' } },
    { label: '热门剧集', icon: '🔥', filters: { type: 'tv', sort: 'popularity.desc', genre: '', region: '', platform: '', year: '全部' } },
    { label: '新番动画', icon: '🎌', filters: { type: 'tv', genre: '16', region: 'ja', sort: 'primary_release_date.desc', platform: '', year: '全部' } },
    { label: '华语新片', icon: '🇨🇳', filters: { type: 'movie', region: 'zh', sort: 'primary_release_date.desc', genre: '', platform: '', year: '全部' } },
    { label: '经典恐怖', icon: '👻', filters: { type: 'movie', genre: '27', sort: 'vote_average.desc', region: '', platform: '', year: '全部' } },
];

interface FiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    debouncedSearchTerm: string;
    clearSearch: () => void;
    isDarkMode: boolean;
}

const Filters: React.FC<FiltersProps> = ({ filters, setFilters, debouncedSearchTerm, clearSearch, isDarkMode }) => {
    const [showAllGenres, setShowAllGenres] = useState(false);
    
    const updateFilter = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const FilterRow = ({ label, icon: Icon, options, current, onChange, valueKey = 'val', labelKey = 'label' }: any) => (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2">
            <div className={`flex items-center gap-2 w-full sm:w-16 shrink-0 pt-1 sm:pt-0 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                <Icon size={14} />
                <span className="text-xs font-bold opacity-80">{label}</span>
            </div>
            <div className="flex flex-nowrap sm:flex-wrap gap-2 flex-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
                {options.map((opt: any) => {
                    const value = typeof opt === 'string' ? opt : opt[valueKey || 'code'];
                    const text = typeof opt === 'string' ? opt : opt[labelKey || 'label'];
                    const isActive = current === value;

                    return (
                        <button
                            key={value}
                            onClick={() => onChange(value)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border whitespace-nowrap ${
                                isActive
                                    ? (isDarkMode ? 'bg-white text-black border-transparent' : 'bg-slate-900 text-white border-transparent')
                                    : (isDarkMode ? 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5' : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100')
                            }`}
                        >
                            {text}
                        </button>
                    )
                })}
            </div>
        </div>
    );

    // 类型筛选 - 支持折叠展开
    const GenreFilterRow = () => {
        const VISIBLE_COUNT = 8; // 默认显示8个
        const visibleGenres = showAllGenres ? GENRES : GENRES.slice(0, VISIBLE_COUNT);
        const hasMore = GENRES.length > VISIBLE_COUNT;
        
        return (
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 py-2">
                <div className={`flex items-center gap-2 w-full sm:w-16 shrink-0 pt-1 sm:pt-0 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                    <Tag size={14} />
                    <span className="text-xs font-bold opacity-80">类型</span>
                </div>
                <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                        {visibleGenres.map((opt) => {
                            const isActive = filters.genre === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => updateFilter('genre', opt.id)}
                                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border whitespace-nowrap ${
                                        isActive
                                            ? (isDarkMode ? 'bg-white text-black border-transparent' : 'bg-slate-900 text-white border-transparent')
                                            : (isDarkMode ? 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5' : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100')
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                        {hasMore && (
                            <button
                                onClick={() => setShowAllGenres(!showAllGenres)}
                                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 flex items-center gap-1 ${
                                    isDarkMode 
                                        ? 'text-indigo-400 hover:bg-indigo-500/10' 
                                        : 'text-indigo-600 hover:bg-indigo-50'
                                }`}
                            >
                                {showAllGenres ? (
                                    <>收起 <ChevronUp size={12} /></>
                                ) : (
                                    <>更多 <ChevronDown size={12} /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (debouncedSearchTerm) {
        return (
            <div className={`flex items-center justify-between px-2 py-4 animate-fade-in ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-indigo-500 font-bold">搜索结果:</span>
                    <span className="font-bold text-lg">"{debouncedSearchTerm}"</span>
                </div>
                <button 
                    onClick={clearSearch} 
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-500 underline transition-colors"
                >
                    <X size={14} /> 清除搜索
                </button>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl p-5 backdrop-blur-sm border transition-colors duration-300 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200/60 shadow-sm'}`}>
            {/* 快速筛选预设 */}
            <div className={`flex items-center gap-2 pb-4 mb-4 border-b overflow-x-auto scrollbar-none ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    <Sparkles size={12} /> 快速筛选
                </span>
                {QUICK_PRESETS.map((preset, idx) => (
                    <button
                        key={idx}
                        onClick={() => setFilters(prev => ({ ...prev, ...preset.filters }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
                            isDarkMode 
                                ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                    >
                        <span>{preset.icon}</span>
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className={`flex flex-col gap-1 divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                <FilterRow label="分类" icon={Layers} options={TYPES} current={filters.type} onChange={(v: string) => updateFilter('type', v)} valueKey="val" />
                <GenreFilterRow />
                <FilterRow label="地区" icon={MapPin} options={REGIONS} current={filters.region} onChange={(v: string) => updateFilter('region', v)} valueKey="code" />
                <FilterRow label="平台" icon={Tv} options={PLATFORMS} current={filters.platform} onChange={(v: string) => updateFilter('platform', v)} valueKey="id" />
                <FilterRow label="年份" icon={Calendar} options={YEARS} current={filters.year} onChange={(v: string) => updateFilter('year', v)} />
            </div>

            <div className={`flex items-center justify-between mt-4 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <div className={`flex items-center gap-2 text-[10px] flex-wrap ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                    <Filter size={10} className="shrink-0" />
                    {filters.type !== 'all' || filters.genre || filters.region || filters.platform || filters.year !== '全部' ? (
                        <>
                            <span className="shrink-0">已选:</span>
                            {filters.type !== 'all' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {TYPES.find(t => t.val === filters.type)?.label}
                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateFilter('type', 'all')} />
                                </span>
                            )}
                            {filters.genre && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {GENRES.find(g => g.id === filters.genre)?.label}
                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateFilter('genre', '')} />
                                </span>
                            )}
                            {filters.region && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {REGIONS.find(r => r.code === filters.region)?.label}
                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateFilter('region', '')} />
                                </span>
                            )}
                            {filters.platform && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {PLATFORMS.find(p => p.id === filters.platform)?.label}
                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateFilter('platform', '')} />
                                </span>
                            )}
                            {filters.year !== '全部' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {filters.year}
                                    <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateFilter('year', '全部')} />
                                </span>
                            )}
                        </>
                    ) : (
                        <span>本周热门</span>
                    )}
                </div>

                <div className={`flex items-center gap-2 rounded-lg p-1 border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    {SORTS.map(sort => {
                        const Icon = sort.icon;
                        const isActive = filters.sort === sort.key;
                        return (
                            <button
                                key={sort.key}
                                onClick={() => updateFilter('sort', sort.key)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                                    isActive
                                        ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white text-indigo-600 shadow-sm')
                                        : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-900')
                                }`}
                                title={sort.label}
                            >
                                <Icon size={12} />
                                <span className="hidden sm:inline">{sort.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default Filters;