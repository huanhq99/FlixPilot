import { EmbyConfig, EmbyItem } from '../types';

export const validateEmbyConnection = async (config: EmbyConfig): Promise<boolean> => {
    try {
        // Clean URL
        const baseUrl = config.serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/System/Info?api_key=${config.apiKey}`);
        return response.ok;
    } catch (e) {
        console.error("Emby connection failed", e);
        return false;
    }
};

export const fetchEmbyLibrary = async (config: EmbyConfig): Promise<Set<string>> => {
    try {
        const baseUrl = config.serverUrl.replace(/\/$/, '');
        // Fetch Movies, Series, and Episodes
        // Fields=ProviderIds is crucial for matching
        // Fields=SeriesId,ParentIndexNumber,IndexNumber needed for Episodes
        const url = `${baseUrl}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&Fields=ProviderIds,SeriesId,ParentIndexNumber,IndexNumber&api_key=${config.apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch Emby library');
        
        const data = await response.json();
        const items: EmbyItem[] = data.Items || [];
        
        const librarySet = new Set<string>();
        const seriesMap = new Map<string, string>(); // EmbySeriesId -> TmdbId
        
        // First pass: Process Movies and Series
        items.forEach(item => {
            if (item.Type === 'Movie' && item.ProviderIds?.Tmdb) {
                librarySet.add(`movie_${item.ProviderIds.Tmdb}`);
            } else if (item.Type === 'Series' && item.ProviderIds?.Tmdb) {
                librarySet.add(`tv_${item.ProviderIds.Tmdb}`);
                seriesMap.set(item.Id, item.ProviderIds.Tmdb);
            }
        });

        // Second pass: Process Episodes
        items.forEach(item => {
            if (item.Type === 'Episode' && item.SeriesId && item.IndexNumber !== undefined) {
                const tmdbSeriesId = seriesMap.get(item.SeriesId);
                // Default to Season 1 if ParentIndexNumber is missing? No, usually 0 or present.
                // If ParentIndexNumber is undefined, it might be a flat structure, but standard TV shows have seasons.
                // We'll use 1 as fallback or 0? Let's use item.ParentIndexNumber ?? 1? 
                // Actually, for Specials it is 0. If undefined, maybe it's not properly organized.
                // But let's trust Emby returns it.
                const seasonNumber = item.ParentIndexNumber ?? 1; 
                
                if (tmdbSeriesId) {
                    // Key format: tv_{tmdbId}_s{season}_e{episode}
                    librarySet.add(`tv_${tmdbSeriesId}_s${seasonNumber}_e${item.IndexNumber}`);
                }
            }
        });
        
        return librarySet;
    } catch (e) {
        console.error("Failed to fetch Emby library", e);
        return new Set();
    }
};
