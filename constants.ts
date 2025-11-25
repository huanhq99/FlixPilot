// App Version
export const APP_VERSION = 'v2.1.12';

// TMDB Configuration
export const TMDB_API_KEY = (window as any).env?.TMDB_API_KEY || import.meta.env.VITE_TMDB_API_KEY || '';
export const TMDB_BASE_URL = import.meta.env.DEV 
    ? '/tmdb' 
    : ((window as any).env?.TMDB_API_URL || import.meta.env.VITE_TMDB_API_URL || 'https://api.themoviedb.org/3');

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';
export const PROFILE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

// Provider Mapping
export const PROVIDER_MAP: Record<string, string> = {
    "Netflix": "Netflix",
    "Disney Plus": "Disney+",
    "Amazon Prime Video": "Prime Video",
    "Apple TV Plus": "Apple TV+",
    "HBO Max": "HBO Max",
    "Hulu": "Hulu",
    "Peacock": "Peacock",
    "Paramount Plus": "Paramount+",
    "Bilibili": "Bilibili",
    "Tencent Video": "腾讯视频",
    "iQIYI": "爱奇艺",
    "Youku": "优酷",
    "Mango TV": "芒果TV"
};

// Poster Colors
export const POSTER_COLORS = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", 
    "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", 
    "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500", 
    "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", 
    "bg-rose-500"
];

// Platform Badge Styles
export const PLATFORM_BADGE_STYLES: Record<string, string> = {
    "Netflix": "bg-[#E50914] text-white",
    "Disney+": "bg-[#113CCF] text-white",
    "Prime Video": "bg-[#00A8E1] text-white",
    "Apple TV+": "bg-[#000000] text-white border border-gray-700",
    "HBO": "bg-[#240E3D] text-white",
    "Hulu": "bg-[#1CE783] text-black",
    "Bilibili": "bg-[#23ADE5] text-white",
    "腾讯视频": "bg-[#FF7F00] text-white",
    "爱奇艺": "bg-[#00CC4C] text-white",
    "优酷": "bg-[#00A4FF] text-white",
    "芒果TV": "bg-[#FF5F00] text-white"
};

// Filter Options
export const TYPES = [
    { val: 'all', label: '全部' },
    { val: 'movie', label: '电影' },
    { val: 'tv', label: '剧集' }
];

export const REGIONS = [
    { code: '', label: '全部' },
    { code: 'zh', label: '华语' },
    { code: 'en', label: '英语地区' },
    { code: 'ja', label: '日本' },
    { code: 'ko', label: '韩国' }
];

export const PLATFORMS = [
    { id: '', label: '全部' },
    { id: '337', label: 'Disney+' },
    { id: '350', label: 'Apple TV+' },
    { id: '8', label: 'Netflix' },
    { id: '9', label: 'Amazon Prime Video' },
    { id: '31', label: 'HBO Max' },
    { id: '15', label: 'Hulu' },
    { id: '446', label: '爱奇艺' },
    { id: '447', label: '优酷' },
    { id: '336', label: '腾讯视频' }
];

const currentYear = new Date().getFullYear();
export const YEARS = [
    '全部',
    ...Array.from({ length: currentYear - 2010 + 1 }, (_, i) => String(currentYear - i)),
    '更早'
];

import { TrendingUp, Calendar, Star, Heart } from 'lucide-react';

export const SORTS = [
    { key: 'popularity.desc', label: '热度', icon: TrendingUp },
    { key: 'primary_release_date.desc', label: '最新', icon: Calendar },
    { key: 'vote_average.desc', label: '评分', icon: Star },
    { key: 'vote_count.desc', label: '评价数', icon: Heart }
];
