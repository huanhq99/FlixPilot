import { EmbyConfig, EmbyItem, EmbyUser } from '../types';

export const loginEmby = async (serverUrl: string, username: string, password?: string): Promise<{ user: EmbyUser, accessToken: string } | null> => {
    try {
        const baseUrl = serverUrl.replace(/\/$/, '');
        const body = {
            Username: username,
            Pw: password || '',
        };
        
        const response = await fetch(`${baseUrl}/Users/AuthenticateByName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Emby-Authorization': 'MediaBrowser Client="StreamHub", Device="Web", DeviceId="StreamHubWeb", Version="1.0.0"'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('Login failed');
        
        const data = await response.json();
        return {
            user: data.User,
            accessToken: data.AccessToken
        };
    } catch (e) {
        console.error("Emby login failed", e);
        return null;
    }
};

export const validateEmbyConnection = async (config: EmbyConfig): Promise<boolean> => {
    try {
        const baseUrl = config.serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/System/Info?api_key=${config.apiKey}`);
        return response.ok;
    } catch (e) {
        console.error("Emby connection failed", e);
        return false;
    }
};

export const getEmbyUsers = async (config: EmbyConfig): Promise<EmbyUser[]> => {
    try {
        const baseUrl = config.serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/Users?api_key=${config.apiKey}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Failed to fetch Emby users", e);
        return [];
    }
};

export const fetchEmbyLibrary = async (
    config: EmbyConfig, 
    onProgress?: (current: number, total: number, status: string) => void
): Promise<{ ids: Set<string>, items: EmbyItem[] }> => {
    try {
        const baseUrl = config.serverUrl.replace(/\/$/, '');
        // Remove UserId param to ensure global sync
        
        // 1. Get Total Count first
        if (onProgress) onProgress(0, 0, '正在连接服务器...');
        // Add IsMissing=false to exclude missing episodes/movies
        const countUrl = `${baseUrl}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&IsMissing=false&Limit=0&api_key=${config.apiKey}`;
        const countRes = await fetch(countUrl);
        if (!countRes.ok) throw new Error('Failed to fetch count');
        const totalCount = (await countRes.json()).TotalRecordCount;

        if (totalCount === 0) return { ids: new Set(), items: [] };

        // 2. Fetch in batches
        const BATCH_SIZE = 2000;
        const librarySet = new Set<string>();
        const seriesMap = new Map<string, string>();
        let fetchedCount = 0;
        
        const allItems: EmbyItem[] = [];

        while (fetchedCount < totalCount) {
            if (onProgress) onProgress(fetchedCount, totalCount, `正在同步媒体库索引 (${fetchedCount}/${totalCount})...`);
            
            const url = `${baseUrl}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&IsMissing=false&Fields=ProviderIds,SeriesId,ParentIndexNumber,IndexNumber&StartIndex=${fetchedCount}&Limit=${BATCH_SIZE}&api_key=${config.apiKey}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch batch');
            
            const data = await response.json();
            const items: EmbyItem[] = data.Items || [];
            
            if (items.length === 0) break;
            
            allItems.push(...items);
            fetchedCount += items.length;
        }

        if (onProgress) onProgress(totalCount, totalCount, '正在构建索引...');

        // Debug: Log breakdown
        const breakdown = allItems.reduce((acc, item) => {
            acc[item.Type] = (acc[item.Type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        console.log('Emby Library Breakdown:', breakdown);

        // Process Data
        // First pass: Movies and Series
        allItems.forEach(item => {
            if (item.Type === 'Movie' && item.ProviderIds?.Tmdb) {
                librarySet.add(`movie_${item.ProviderIds.Tmdb}`);
            } else if (item.Type === 'Series' && item.ProviderIds?.Tmdb) {
                librarySet.add(`tv_${item.ProviderIds.Tmdb}`);
                seriesMap.set(item.Id, item.ProviderIds.Tmdb);
            }
        });

        // Second pass: Episodes
        allItems.forEach(item => {
            if (item.Type === 'Episode' && item.SeriesId && item.IndexNumber !== undefined) {
                const tmdbSeriesId = seriesMap.get(item.SeriesId);
                const seasonNumber = item.ParentIndexNumber ?? 1; 
                
                if (tmdbSeriesId) {
                    librarySet.add(`tv_${tmdbSeriesId}_s${seasonNumber}_e${item.IndexNumber}`);
                }
            }
        });
        
        if (onProgress) onProgress(totalCount, totalCount, '完成');
        return { ids: librarySet, items: allItems };

    } catch (e) {
        console.error("Failed to fetch Emby library", e);
        if (onProgress) onProgress(0, 0, '同步失败');
        return { ids: new Set(), items: [] };
    }
};
