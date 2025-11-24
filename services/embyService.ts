import { EmbyConfig, EmbyItem, EmbyUser } from '../types';

// 获取有效的服务器地址列表（按优先级排序）
const getServerUrls = (config: EmbyConfig): string[] => {
    const urls: string[] = [];
    
    // 优先尝试内网地址（通常更快）
    if (config.serverUrlInternal) {
        urls.push(config.serverUrlInternal);
    }
    
    // 然后尝试主地址（向后兼容）
    if (config.serverUrl) {
        urls.push(config.serverUrl);
    }
    
    // 最后尝试外网地址
    if (config.serverUrlExternal) {
        urls.push(config.serverUrlExternal);
    }
    
    // 去重并清理
    return [...new Set(urls.map(url => url.replace(/\/$/, '')))];
};

// 尝试连接多个地址，返回第一个成功的
const tryMultipleUrls = async <T>(
    urls: string[],
    requestFn: (url: string) => Promise<T>
): Promise<{ success: true, data: T, url: string } | { success: false, error: string }> => {
    const errors: string[] = [];
    
    for (const url of urls) {
        try {
            const data = await requestFn(url);
            return { success: true, data, url };
        } catch (e: any) {
            errors.push(`${url}: ${e.message}`);
            console.warn(`Failed to connect to ${url}:`, e.message);
        }
    }
    
    return { 
        success: false, 
        error: `所有地址均无法连接：\n${errors.join('\n')}` 
    };
};

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

export const validateEmbyConnection = async (config: EmbyConfig): Promise<{ success: boolean, url?: string, error?: string }> => {
    const urls = getServerUrls(config);
    
    if (urls.length === 0) {
        return { success: false, error: '未配置服务器地址' };
    }
    
    const result = await tryMultipleUrls(urls, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/System/Info?api_key=${config.apiKey}`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5秒超时
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    });
    
    if (result.success) {
        console.log(`Emby 连接成功，使用地址: ${result.url}`);
        return { success: true, url: result.url };
    } else {
        console.error("Emby connection failed:", result.error);
        return { success: false, error: result.error };
    }
};

export const getEmbyUsers = async (config: EmbyConfig): Promise<EmbyUser[]> => {
    try {
        const urls = getServerUrls(config);
        const result = await tryMultipleUrls(urls, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/Users?api_key=${config.apiKey}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        });
        
        if (result.success) {
            return result.data;
        }
        return [];
    } catch (e) {
        console.error("Failed to fetch Emby users", e);
        return [];
    }
};

export const fetchEmbyLibraries = async (config: EmbyConfig): Promise<any[]> => {
    try {
        const urls = getServerUrls(config);
        const result = await tryMultipleUrls(urls, async (baseUrl) => {
            const response = await fetch(`${baseUrl}/Library/VirtualFolders?api_key=${config.apiKey}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        });
        
        if (result.success) {
            return result.data;
        }
        throw new Error('Failed to fetch libraries');
    } catch (e) {
        console.error("Failed to fetch Emby libraries", e);
        return [];
    }
};

const fetchItemsForParent = async (
    baseUrl: string, 
    apiKey: string, 
    parentId: string | null, 
    startIndex: number, 
    limit: number
): Promise<EmbyItem[]> => {
    const parentParam = parentId ? `&ParentId=${parentId}` : '';
    const url = `${baseUrl}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&IsMissing=false${parentParam}&Fields=ProviderIds,SeriesId,ParentIndexNumber,IndexNumber&StartIndex=${startIndex}&Limit=${limit}&api_key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch batch');
    const data = await response.json();
    return data.Items || [];
};

const getCountForParent = async (baseUrl: string, apiKey: string, parentId: string | null): Promise<number> => {
    const parentParam = parentId ? `&ParentId=${parentId}` : '';
    const url = `${baseUrl}/Items?Recursive=true&IncludeItemTypes=Movie,Series,Episode&IsMissing=false${parentParam}&Limit=0&api_key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch count');
    return (await response.json()).TotalRecordCount;
};

export const fetchEmbyLibrary = async (
    config: EmbyConfig, 
    onProgress?: (current: number, total: number, status: string) => void,
    selectedLibraries?: string[]
): Promise<{ ids: Set<string>, items: EmbyItem[] }> => {
    try {
        const urls = getServerUrls(config);
        if (urls.length === 0) {
            throw new Error('未配置服务器地址');
        }
        
        // 先尝试连接，找到可用的地址
        if (onProgress) onProgress(0, 0, '正在尝试连接服务器...');
        
        let baseUrl = '';
        const connectionResult = await validateEmbyConnection(config);
        if (connectionResult.success && connectionResult.url) {
            baseUrl = connectionResult.url;
        } else {
            // 如果验证失败，尝试直接使用第一个地址
            baseUrl = urls[0];
        }
        
        console.log(`使用 Emby 地址: ${baseUrl}`);
        
        // Determine which parents to query
        // If selectedLibraries is empty or undefined, we query "all" (parentId = null)
        // BUT if selectedLibraries is provided but empty array, it implies "Sync Nothing" which might be weird. 
        // Let's assume undefined/empty array means "All" for backward compatibility, 
        // UNLESS we strictly enforce selection. 
        // If the user selected libraries, we iterate. If not, we do one global fetch.
        
        let targets: (string | null)[] = [null];
        if (selectedLibraries && selectedLibraries.length > 0) {
            targets = selectedLibraries;
        }
        
        // 1. Calculate Total Count
        let totalCount = 0;
        const counts: number[] = [];
        
        if (onProgress) onProgress(0, 0, '正在连接服务器...');

        for (const target of targets) {
            const count = await getCountForParent(baseUrl, config.apiKey, target);
            counts.push(count);
            totalCount += count;
        }

        if (totalCount === 0) return { ids: new Set(), items: [] };

        // 2. Fetch Items
        const BATCH_SIZE = 2000;
        const librarySet = new Set<string>();
        const seriesMap = new Map<string, string>();
        const allItems: EmbyItem[] = [];
        let globalFetched = 0;

        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const count = counts[i];
            let fetchedForTarget = 0;

            while (fetchedForTarget < count) {
                if (onProgress) onProgress(globalFetched, totalCount, `正在同步媒体库 (${globalFetched}/${totalCount})...`);
            
                const items = await fetchItemsForParent(baseUrl, config.apiKey, target, fetchedForTarget, BATCH_SIZE);
            if (items.length === 0) break;
            
            allItems.push(...items);
                fetchedForTarget += items.length;
                globalFetched += items.length;
            }
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
