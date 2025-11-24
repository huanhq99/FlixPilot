import { NotificationConfig, MediaItem } from '../types';

export const sendTelegramTest = async (config: NotificationConfig) => {
    if (!config.telegramBotToken || !config.telegramChatId) {
        throw new Error('请先配置 Bot Token 和 Chat ID');
    }

    // Mock Item
    const mockItem: MediaItem = {
        id: 12345,
        title: '铁血战士：杀戮之王',
        year: '2025',
        mediaType: 'movie',
        posterUrl: '/9Jk9r9r9r9r9r9r9r9r9r9r9r9.jpg', // Won't work for real fetch but logic stands
        backdropUrl: null,
        overview: '故事跨越时空，从维京时代到幕府日本至二战时期，讲述三个铁血战士的勇猛事迹。人类的宿命是否将从此改写？',
        type: '电影',
        subtitle: '',
        platform: null,
        hasProvider: false,
        providerRegion: '',
        status: 'released',
        badgeLabel: '',
        releaseDate: '2025-01-01',
        region: 'US',
        voteAverage: 0,
        posterColor: '',
        posterText: ''
    };

    // For test, use a reliable placeholder image since TMDB sometimes blocks Telegram servers
    const testPoster = 'https://placehold.co/600x900/2b2d31/ffffff.png?text=TEST+POSTER';

    await sendTelegramNotification(config, { ...mockItem, posterUrl: null }, 'admin', testPoster);
};

export const sendTelegramNotification = async (
    config: NotificationConfig, 
    item: MediaItem, 
    requestedBy: string,
    overridePosterUrl?: string,
    notificationType: 'request' | 'completed' | 'auto_scan' = 'request'
) => {
    if (!config.telegramBotToken || !config.telegramChatId) return;

    const typeTag = item.mediaType === 'movie' ? '#电影' : '#剧集';
    const tmdbUrl = `https://www.themoviedb.org/${item.mediaType}/${item.id}`;
    const posterUrl = overridePosterUrl || (item.posterUrl ? `https://image.tmdb.org/t/p/w500${item.posterUrl}` : null);
    
    let titleLine = `用户: ${requestedBy} 给您发来一条求片信息`;
    let tagLine = `🏷️ 标签: #用户提交求片`;

    if (notificationType === 'completed') {
        titleLine = `✅ 求片已完成！(用户: ${requestedBy})`;
        tagLine = `🏷️ 标签: #求片完成`;
    } else if (notificationType === 'auto_scan') {
        titleLine = `🆕 系统检测到新片入库`;
        tagLine = `🏷️ 标签: #新片入库`;
    }

    const caption = `
名称: ${item.title} (${item.year})

${titleLine}

${tagLine}
🗂️ 类型: ${typeTag}

简介: ${item.overview ? item.overview.substring(0, 100) + (item.overview.length > 100 ? '...' : '') : '暂无简介'}
`.trim();

    const keyboard = {
        inline_keyboard: [[
            { text: "TMDB链接", url: tmdbUrl }
        ]]
    };

    try {
        let sent = false;

        // Try sending photo first if available
        if (posterUrl) {
            try {
                const formData = new FormData();
                formData.append('chat_id', config.telegramChatId);
                formData.append('parse_mode', 'HTML');
                formData.append('caption', caption);
                formData.append('photo', posterUrl);
                formData.append('reply_markup', JSON.stringify(keyboard));

                const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                
                if (res.ok) {
                    sent = true;
                } else {
                    console.warn('Telegram sendPhoto failed, falling back to text message');
                }
            } catch (e) {
                console.warn('Telegram sendPhoto error:', e);
            }
        }

        // Fallback to text message if photo failed or no photo
        if (!sent) {
            const formData = new FormData();
            formData.append('chat_id', config.telegramChatId);
            formData.append('parse_mode', 'HTML');
            formData.append('text', caption);
            formData.append('reply_markup', JSON.stringify(keyboard));

            const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({ description: 'Unknown Error' }));
                throw new Error(`Telegram Error: ${err.description}`);
            }
        }
        
        return true;
    } catch (e) {
        console.error('Failed to send Telegram notification', e);
        throw e;
    }
};

// --- MoviePilot Integration ---

export const testMoviePilotConnection = async (config: NotificationConfig): Promise<{ success: boolean, message: string, method?: string }> => {
    if (!config.moviePilotUrl || !config.moviePilotToken) {
        return { success: false, message: '请先配置 MoviePilot 地址和 Token' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    
    // Try common endpoints
    const endpoints = [
        '/api/v1/user/me', // Best for token validation
        '/api/v1/site/site_list', // Check sites list
        '/api/v1/system/status',
        '/api/v1/plugin/plugin_list',
    ];

    const authMethods = [
        { name: 'Bearer Token', header: 'Authorization', value: `Bearer ${config.moviePilotToken}` },
        { name: 'Authorization (raw)', header: 'Authorization', value: config.moviePilotToken },
        { name: 'token Header', header: 'token', value: config.moviePilotToken },
    ];

    // Clean token - remove any whitespace
    const cleanToken = config.moviePilotToken.trim();

    // 0. Basic Connectivity Check (No Auth)
    try {
        console.log(`Testing connectivity to: ${baseUrl}`);
        await fetch(`${baseUrl}/api/v1/system/status`, { method: 'GET' }).catch(() => {});
        // We don't care about the result, just warming up / checking DNS
    } catch (e) {
        console.warn('Basic connectivity check failed:', e);
    }

    let connectionError = '';

    for (const endpoint of endpoints) {
        for (const authMethod of authMethods) {
            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    [authMethod.header]: authMethod.value.replace(config.moviePilotToken, cleanToken)
                };

                console.log(`Testing MP connection: ${baseUrl}${endpoint} with ${authMethod.name}`);

                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'GET',
                    headers
                });

                if (response.ok) {
                    return { 
                        success: true, 
                        message: `连接成功！\n端点: ${endpoint}\n认证方式: ${authMethod.name}`,
                        method: authMethod.name
                    };
                } else {
                    if (response.status === 401 || response.status === 403) {
                        connectionError = `认证失败 (${response.status})。请检查 Token 是否正确。`;
                    } else {
                        connectionError = `服务器返回错误: ${response.status} ${response.statusText}`;
                    }
                }
            } catch (e: any) {
                console.error(`MP Test failed for ${endpoint} ${authMethod.name}`, e);
                if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
                    connectionError = '无法连接到服务器。可能是跨域(CORS)限制、地址错误或网络不通。请尝试在 MoviePilot 设置中允许跨域，或使用反向代理。';
                } else {
                    connectionError = `请求出错: ${e.message}`;
                }
            }
        }
    }

    // If all failed, try with query parameter
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}?token=${cleanToken}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                return { 
                    success: true, 
                    message: `连接成功！\n端点: ${endpoint}\n认证方式: Query Parameter`,
                    method: 'Query Parameter'
                };
            }
        } catch (e) {
            // Continue
        }
    }

    return { 
        success: false, 
        message: `连接失败: ${connectionError || '所有尝试均失败'}\n\n请检查：\n1. Token 是否正确 (尝试重新生成)\n2. 地址是否包含 /api (不应包含)\n3. 是否存在跨域问题 (CORS)` 
    };
};

export const subscribeToMoviePilot = async (config: NotificationConfig, item: MediaItem): Promise<{ success: boolean, message: string }> => {
    if (!config.moviePilotUrl || !config.moviePilotToken) {
        return { success: false, message: '未配置 MoviePilot' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    // Determine endpoint based on type
    const endpoint = item.mediaType === 'movie' 
        ? '/api/v1/subscribe/movie' 
        : '/api/v1/subscribe/tv';
    
    const cleanToken = config.moviePilotToken.trim();

    // MoviePilot Payload Structure
    const payload = {
        name: item.title,
        year: item.year,
        tmdbid: item.id,
        season: item.mediaType === 'tv' ? 1 : undefined, // Default to Season 1
    };

    console.log('Subscribing to MP:', `${baseUrl}${endpoint}`, payload);

    try {
        // Try multiple authentication methods in sequence
        // This is a bit brute-force but ensures compatibility
        
        const methods = [
            { headers: { 'Authorization': `Bearer ${cleanToken}` } },
            { headers: { 'Authorization': cleanToken } },
            { headers: { 'token': cleanToken } },
            { param: `token=${cleanToken}` } // Fallback to query param
        ];

        let lastError = 'Unknown error';

        for (const method of methods) {
            try {
                let url = `${baseUrl}${endpoint}`;
                let options: RequestInit = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(method.headers || {})
                    },
                    body: JSON.stringify(payload)
                };

                if (method.param) {
                    url += `?${method.param}`;
                }

                const response = await fetch(url, options);

                if (response.ok) {
                    const data = await response.json();
                    if (data.success || data.code === 0) {
                        return { success: true, message: '已成功添加到 MoviePilot 订阅' };
                    } else {
                        return { success: false, message: data.message || data.detail || 'MoviePilot 返回错误' };
                    }
                } else {
                    const text = await response.text();
                    try {
                        const json = JSON.parse(text);
                        lastError = json.detail || json.message || `HTTP ${response.status}`;
                    } catch {
                        lastError = `HTTP ${response.status}: ${text.substring(0, 50)}`;
                    }
                    // Don't throw, try next method
                    console.warn(`MP Subscribe failed with method ${JSON.stringify(method)}: ${lastError}`);
                }
            } catch (e: any) {
                lastError = e.message;
                console.error(`MP Subscribe network error with method ${JSON.stringify(method)}:`, e);
            }
        }

        return { success: false, message: `订阅失败: ${lastError}` };

    } catch (e: any) {
        console.error('MoviePilot Subscription Failed:', e);
        return { success: false, message: `订阅失败: ${e.message}` };
    }
};
