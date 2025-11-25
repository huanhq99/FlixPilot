import { TMDB_API_KEY, TMDB_BASE_URL, IMAGE_BASE_URL, BACKDROP_BASE_URL, PROVIDER_MAP, POSTER_COLORS, PLATFORM_BADGE_STYLES } from '../constants';
import { MediaItem, Episode, Season } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const getTmdbConfig = () => {
    const stored = storage.get(STORAGE_KEYS.TMDB_CONFIG, {});
    return {
        apiKey: stored.apiKey || TMDB_API_KEY,
        baseUrl: stored.baseUrl || TMDB_BASE_URL
    };
};

export const testTmdbConnection = async (apiKey: string, baseUrl: string) => {
    const start = Date.now();
    try {
        const url = `${baseUrl}/configuration?api_key=${apiKey}`;
        const response = await fetch(url);
        const end = Date.now();
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        await response.json();
        return { success: true, latency: end - start };
    } catch (error) {
        throw error;
    }
};

// Helper to check regions
const checkRegions = ['CN', 'US', 'HK', 'TW', 'JP', 'KR', 'SG', 'GB'];
const checkTypes = ['flatrate', 'buy', 'rent'];

// Helper to process a single item with its details
export const processMediaItem = (baseItem: any, detailData: any, mediaType: 'movie' | 'tv'): MediaItem => {
    const title = baseItem.title || baseItem.name;
    const providers = detailData['watch/providers']?.results || {};
    let platform = null;
    let providerRegion = '';

    // Provider Logic
    for (const region of checkRegions) {
        if (providers[region]) {
            for (const pType of checkTypes) {
                if (providers[region][pType]?.length > 0) {
                    const rawName = providers[region][pType][0].provider_name;
                    const mappedName = PROVIDER_MAP[rawName] || rawName;
                    const suffix = pType === 'buy' ? '(购)' : (pType === 'rent' ? '(租)' : '');
                    platform = mappedName + suffix;
                    providerRegion = region;
                    break;
                }
            }
        }
        if (platform) break;
    }

    if (!platform && Object.keys(providers).length > 0) {
        const allRegions = Object.keys(providers);
        for (const region of allRegions) {
            if (providers[region]) {
                for (const pType of checkTypes) {
                    if (providers[region][pType]?.length > 0) {
                        const rawName = providers[region][pType][0].provider_name;
                        const mappedName = PROVIDER_MAP[rawName] || rawName;
                        platform = `${mappedName} (${region})`;
                        providerRegion = region;
                        break;
                    }
                }
            }
            if (platform) break;
        }
    }

    // Determine Brand Color Class
    let badgeColorClass = '';
    if (platform) {
        // Fuzzy match logic for cases like "WeTV (TH)" to match "WeTV"
        const matchedKey = Object.keys(PLATFORM_BADGE_STYLES).find(key => platform?.includes(key));
        if (matchedKey) {
            badgeColorClass = PLATFORM_BADGE_STYLES[matchedKey];
        }
    }

    // Release Date & Status Logic
    let releaseDateStr = 'TBA';
    let status: MediaItem['status'] = 'pending';
    let badgeLabel = '待上映';
    let releaseDates: MediaItem['releaseDates'] = {};

    const today = new Date();
    let digitalDate: string | null = null;
    let theatricalDate: string | null = baseItem.release_date || detailData.release_date;

    if (mediaType === 'movie') {
        // Extract specific release dates
        if (detailData.release_dates?.results) {
            // Flatten all dates from all regions
            const allDates = detailData.release_dates.results.flatMap((r: any) => r.release_dates);
            
            // Type 3: Theatrical, Type 4: Digital, Type 5: Physical
            // We find the earliest valid date or just the first one available
            // Priority: CN -> US -> Any
            const regionPriority = (r: any) => r.iso_3166_1 === 'CN' ? 2 : (r.iso_3166_1 === 'US' ? 1 : 0);

            // Helper to find best date for a specific type
            const findBestDate = (type: number) => {
                const candidates = detailData.release_dates.results
                    .filter((r: any) => r.release_dates.some((d: any) => d.type === type))
                    .map((r: any) => ({
                        ...r.release_dates.find((d: any) => d.type === type),
                        iso_3166_1: r.iso_3166_1
                    }))
                    .sort((a: any, b: any) => regionPriority(b) - regionPriority(a)); // Sort by region priority
                
                return candidates.length > 0 ? candidates[0].release_date.split('T')[0] : null;
            };

            releaseDates.theatrical = findBestDate(3);
            releaseDates.digital = findBestDate(4);
            releaseDates.physical = findBestDate(5);

            if (releaseDates.digital) digitalDate = releaseDates.digital;
            if (releaseDates.theatrical) theatricalDate = releaseDates.theatrical;
        }

        if (platform) {
            status = 'streaming';
            badgeLabel = platform;
            releaseDateStr = digitalDate || theatricalDate || '已上线';
        } else if (digitalDate && new Date(digitalDate) <= today) {
            status = 'streaming';
            badgeLabel = '数字版已出';
            releaseDateStr = digitalDate;
        } else if (theatricalDate && new Date(theatricalDate) <= today) {
            status = 'released';
            badgeLabel = '已上映';
            releaseDateStr = theatricalDate || '已上映';
        } else {
            status = 'pending';
            badgeLabel = '待上映';
            releaseDateStr = theatricalDate || '待定';
        }
    } else {
        const firstAir = baseItem.first_air_date;
        const lastAir = detailData.last_episode_to_air?.air_date;

        if (platform) {
            status = 'streaming';
            badgeLabel = platform;
            releaseDateStr = lastAir ? `更新至 ${lastAir}` : '热播中';
        } else if (firstAir && new Date(firstAir) <= today) {
            status = 'released';
            badgeLabel = '已开播';
            releaseDateStr = firstAir;
        } else {
            status = 'pending';
            badgeLabel = '待开播';
            releaseDateStr = firstAir || '待定';
        }
    }

    const getRegionName = (lang: string) => {
        if (!lang) return '其他';
        if (['zh', 'cn', 'hk', 'tw'].includes(lang)) return '华语';
        if (['en'].includes(lang)) return '英语地区';
        if (['ja'].includes(lang)) return '日本';
        if (['ko'].includes(lang)) return '韩国';
        return '其他';
    };

    // Process Seasons (For TV)
    let seasons: Season[] = [];
    if (mediaType === 'tv' && detailData.seasons) {
        seasons = detailData.seasons.map((s: any) => ({
            id: s.id,
            name: s.name,
            season_number: s.season_number,
            episode_count: s.episode_count,
            poster_path: s.poster_path,
            air_date: s.air_date
        })).filter((s: Season) => s.season_number > 0);
    }

    // FIX: Determine year from raw data, not the formatted releaseDateStr
    const rawDate = mediaType === 'movie' ? (baseItem.release_date || detailData.release_date) : baseItem.first_air_date;
    const yearStr = rawDate ? rawDate.substring(0, 4) : 'TBA';

    return {
        id: baseItem.id,
        title: title,
        subtitle: baseItem.original_title || baseItem.original_name,
        overview: baseItem.overview,
        type: mediaType === 'movie' ? '电影' : '剧集',
        mediaType: mediaType,
        platform: platform,
        hasProvider: !!platform,
        providerRegion: providerRegion,
        status: status,
        badgeLabel: badgeLabel,
        badgeColorClass: badgeColorClass,
        releaseDate: releaseDateStr,
        releaseDates: releaseDates,
        year: yearStr, // Use the correctly extracted year
        region: getRegionName(baseItem.original_language),
        voteAverage: baseItem.vote_average || 0,
        posterUrl: (baseItem.poster_path || detailData.poster_path) ? `${IMAGE_BASE_URL}${baseItem.poster_path || detailData.poster_path}` : null,
        backdropUrl: (baseItem.backdrop_path || detailData.backdrop_path) ? `${BACKDROP_BASE_URL}${baseItem.backdrop_path || detailData.backdrop_path}` : null,
        posterColor: POSTER_COLORS[Math.floor(Math.random() * POSTER_COLORS.length)],
        posterText: (title || 'N/A').substring(0, 2).toUpperCase(),
        
        // TV Specifics
        numberOfSeasons: detailData.number_of_seasons,
        numberOfEpisodes: detailData.number_of_episodes,
        seasons: seasons,
        lastEpisodeToAir: detailData.last_episode_to_air,
        nextEpisodeToAir: detailData.next_episode_to_air,
        
        // Collection Info
        collectionId: detailData.belongs_to_collection?.id,
        collectionName: detailData.belongs_to_collection?.name,
    };
};

export const fetchDetails = async (id: number, mediaType: 'movie' | 'tv') => {
    const { apiKey, baseUrl } = getTmdbConfig();
    const response = await fetch(
        `${baseUrl}/${mediaType}/${id}?api_key=${apiKey}&language=zh-CN&append_to_response=credits,videos,release_dates`
    );
    return response.json();
};

export const fetchCollectionDetails = async (collectionId: number) => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        const response = await fetch(
            `${baseUrl}/collection/${collectionId}?api_key=${apiKey}&language=zh-CN`
        );
        return response.json();
    } catch (e) {
        console.error("Failed to fetch collection", e);
        return null;
    }
};

export const fetchRecommendations = async (id: number, mediaType: 'movie' | 'tv') => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        const response = await fetch(
            `${baseUrl}/${mediaType}/${id}/recommendations?api_key=${apiKey}&language=zh-CN&page=1`
        );
        const data = await response.json();
        return data.results || [];
    } catch (e) {
        console.error("Failed to fetch recommendations", e);
        return [];
    }
};

export const fetchSeasonDetails = async (tvId: number, seasonNumber: number) => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        const response = await fetch(
            `${baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=zh-CN`
        );
        const data = await response.json();
        return data.episodes || [];
    } catch (e) {
        console.error("Failed to fetch season details", e);
        return [];
    }
};

// --- NEW FUNCTIONS FOR DASHBOARD ---

export const fetchTrending = async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week') => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        const response = await fetch(
            `${baseUrl}/trending/${mediaType}/${timeWindow}?api_key=${apiKey}&language=zh-CN`
        );
        const data = await response.json();
        const processed = data.results.map((item: any) => {
            const type = item.media_type || (item.title ? 'movie' : 'tv');
            return processMediaItem(item, {}, type);
        });
        return processed;
    } catch (e) {
        return [];
    }
};

export const fetchDiscover = async (mediaType: 'movie' | 'tv', sortBy: string = 'popularity.desc', year?: string) => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        let url = `${baseUrl}/discover/${mediaType}?api_key=${apiKey}&language=zh-CN&sort_by=${sortBy}&page=1`;
        if (year) {
            if (mediaType === 'movie') url += `&primary_release_year=${year}`;
            else url += `&first_air_date_year=${year}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        return data.results.map((item: any) => processMediaItem(item, {}, mediaType));
    } catch (e) {
        return [];
    }
};

// --- PERSON DETAILS ---

export const fetchPersonDetails = async (personId: number) => {
    try {
        const { apiKey, baseUrl } = getTmdbConfig();
        const response = await fetch(
            `${baseUrl}/person/${personId}?api_key=${apiKey}&language=zh-CN&append_to_response=combined_credits`
        );
        return await response.json();
    } catch (e) {
        return null;
    }
};
