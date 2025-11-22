
import { TrendingUp, Clock, Star } from 'lucide-react';

// Helper to get env variables from window.env (Docker runtime) or import.meta.env (Build time)
const getEnv = (key: string, defaultVal: string) => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.env && window.env[key]) {
        // @ts-ignore
        return window.env[key];
    }
    return import.meta.env[`VITE_${key}`] || defaultVal;
};

export const TMDB_API_KEY = getEnv('TMDB_API_KEY', '');
export const TMDB_BASE_URL = getEnv('TMDB_API_URL', 'https://api.themoviedb.org/3');
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
export const PROFILE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

export const REGIONS = [
    { label: '全部', code: '' },
    { label: '华语', code: 'zh' },
    { label: '英语', code: 'en' },
    { label: '日本', code: 'ja' },
    { label: '韩国', code: 'ko' },
    { label: '泰国', code: 'th' }
];

export const PLATFORMS = [
    { label: '全部', id: '' },
    { label: 'Netflix', id: '8' },
    { label: 'Disney+', id: '337' },
    { label: 'Prime Video', id: '9' },
    { label: 'Apple TV+', id: '350' },
    { label: 'WeTV', id: '336' },
    { label: 'iQIYI', id: '446' },
    { label: 'Youku', id: '447' }
];

export const TYPES = [
    { label: '全部', val: 'all' },
    { label: '电影', val: 'movie' },
    { label: '剧集', val: 'tv' }
];

const currentYear = new Date().getFullYear();
export const YEARS = ['全部', (currentYear + 1).toString(), currentYear.toString(), ...Array.from({length: 14}, (_, i) => (currentYear - 1 - i).toString()), '更早'];

export const SORTS = [
  { key: 'popularity.desc', label: '热门', icon: TrendingUp },
  { key: 'primary_release_date.desc', label: '最新', icon: Clock },
  { key: 'vote_average.desc', label: '高分', icon: Star }
];

export const PROVIDER_MAP: Record<string, string> = {
    'Tencent Video': 'WeTV',
    'WeTV': 'WeTV',
    'iQIYI': 'iQIYI',
    'Youku': 'Youku',
    'Bilibili': 'Bilibili',
    'Mango TV': 'Mango TV',
    'Netflix': 'Netflix',
    'Disney Plus': 'Disney+',
    'Amazon Prime Video': 'Prime Video',
    'Apple TV': 'Apple TV+',
    'Apple TV Plus': 'Apple TV+',
    'HBO Max': 'HBO Max',
    'Max': 'HBO Max',
    'Hulu': 'Hulu',
    'Peacock': 'Peacock',
    'Paramount Plus': 'Paramount+',
    'Google Play Movies': 'Google Play',
    'YouTube': 'YouTube'
};

// Define strict brand colors for badges
export const PLATFORM_BADGE_STYLES: Record<string, string> = {
    'Netflix': 'bg-[#E50914] text-white border-transparent shadow-md shadow-red-900/20',
    'Disney+': 'bg-[#01147C] text-white border-white/10 shadow-md shadow-blue-900/20',
    'Prime Video': 'bg-[#00A8E1] text-black border-transparent shadow-md shadow-cyan-900/20',
    'Apple TV+': 'bg-black text-white border border-white/20 shadow-md shadow-gray-900/20',
    'WeTV': 'bg-[#ff6b00] text-white border-transparent shadow-md shadow-orange-900/20',
    'iQIYI': 'bg-[#00cc36] text-white border-transparent shadow-md shadow-green-900/20',
    'Youku': 'bg-[#2883ff] text-white border-transparent shadow-md shadow-blue-900/20',
    'Bilibili': 'bg-[#fb7299] text-white border-transparent shadow-md shadow-pink-900/20',
    'Mango TV': 'bg-[#ff5f00] text-white border-transparent shadow-md shadow-orange-900/20',
    'HBO Max': 'bg-[#5418e9] text-white border-transparent shadow-md shadow-purple-900/20',
    'Hulu': 'bg-[#1ce783] text-black border-transparent shadow-md shadow-green-900/20',
    'YouTube': 'bg-[#FF0000] text-white border-transparent shadow-md shadow-red-900/20',
    'Google Play': 'bg-white text-slate-800 border-slate-200 shadow-md'
};

export const POSTER_COLORS = [
  "from-red-900 to-black", 
  "from-blue-900 to-black", 
  "from-emerald-900 to-black",
  "from-purple-900 to-black",
  "from-amber-900 to-black"
];
