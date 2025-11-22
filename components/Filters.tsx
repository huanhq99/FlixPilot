import React from 'react';
import { Layers, MapPin, Calendar, Filter, X, Tv } from 'lucide-react';
import { TYPES, REGIONS, YEARS, SORTS, PLATFORMS } from '../constants';
import { FilterState } from '../types';

interface FiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    debouncedSearchTerm: string;
    clearSearch: () => void;
    isDarkMode: boolean;
}

const Filters: React.FC<FiltersProps> = ({ filters, setFilters, debouncedSearchTerm, clearSearch, isDarkMode }) => {
    
    const updateFilter = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const FilterRow = ({ label, icon: Icon, options, current, onChange, valueKey = 'val', labelKey = 'label' }: any) => (
        <div className="flex items-start sm:items-center gap-4 py-2">
            <div className={`flex items-center gap-2 w-16 shrink-0 pt-1 sm:pt-0 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                <Icon size={14} />
                <span className="text-xs font-bold opacity-80">{label}</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
                {options.map((opt: any) => {
                    const value = typeof opt === 'string' ? opt : opt[valueKey || 'code'];
                    const text = typeof opt === 'string' ? opt : opt[labelKey || 'label'];
                    const isActive = current === value;

                    return (
                        <button
                            key={value}
                            onClick={() => onChange(value)}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border ${
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
            <div className={`flex flex-col gap-1 divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                <FilterRow label="分类" icon={Layers} options={TYPES} current={filters.type} onChange={(v: string) => updateFilter('type', v)} valueKey="val" />
                <FilterRow label="地区" icon={MapPin} options={REGIONS} current={filters.region} onChange={(v: string) => updateFilter('region', v)} valueKey="code" />
                <FilterRow label="平台" icon={Tv} options={PLATFORMS} current={filters.platform} onChange={(v: string) => updateFilter('platform', v)} valueKey="id" />
                <FilterRow label="年份" icon={Calendar} options={YEARS} current={filters.year} onChange={(v: string) => updateFilter('year', v)} />
            </div>

            <div className={`flex items-center justify-between mt-4 pt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                <div className={`flex items-center gap-2 text-[10px] ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                    <Filter size={10} />
                    <span>模式: {filters.type !== 'all' || filters.region || filters.platform || filters.year !== '全部' ? '筛选中' : '本周热门'}</span>
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