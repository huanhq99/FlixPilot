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
        '/api/v1/system/info',
        '/api/v1/system/version',
        '/api/system/info',
        '/api/system/version',
        '/system/info',
    ];

    const authMethods = [
        { name: 'Bearer Token', header: 'Authorization', value: `Bearer ${config.moviePilotToken}` },
        { name: 'X-API-Key', header: 'X-API-Key', value: config.moviePilotToken },
        { name: 'Authorization (no Bearer)', header: 'Authorization', value: config.moviePilotToken },
    ];

    for (const endpoint of endpoints) {
        for (const authMethod of authMethods) {
            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    [authMethod.header]: authMethod.value
                };

                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'GET',
                    headers
                });

                if (response.ok) {
                    return { 
                        success: true, 
                        message: `连接成功！使用端点: ${endpoint}，认证方式: ${authMethod.name}`,
                        method: authMethod.name
                    };
                }
            } catch (e) {
                // Continue to next method
            }
        }
    }

    // If all failed, try with query parameter
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}?token=${config.moviePilotToken}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                return { 
                    success: true, 
                    message: `连接成功！使用端点: ${endpoint}，认证方式: Query Parameter`,
                    method: 'Query Parameter'
                };
            }
        } catch (e) {
            // Continue
        }
    }

    return { 
        success: false, 
        message: '无法连接到 MoviePilot，请检查：\n1. 地址是否正确（如 http://192.168.1.10:3000）\n2. Token 是否正确\n3. MoviePilot 服务是否运行中' 
    };
};

export const subscribeToMoviePilot = async (config: NotificationConfig, item: MediaItem): Promise<{ success: boolean, message: string }> => {
    if (!config.moviePilotUrl || !config.moviePilotToken) {
        return { success: false, message: '未配置 MoviePilot' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    const endpoint = '/api/v1/subscribe'; // Adjust based on actual MoviePilot API
    
    // MoviePilot Payload Structure
    const payload = {
        name: item.title,
        year: item.year,
        type: item.mediaType === 'movie' ? '电影' : '电视剧',
        tmdbid: item.id,
        doubanid: '', // Optional
        season: item.mediaType === 'tv' ? 1 : undefined, // Default to Season 1 for new TV requests
    };

    try {
        // Try multiple authentication methods
        // Method 1: Bearer token (most common)
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        // Try Bearer first, if fails, try X-API-Key
        headers['Authorization'] = `Bearer ${config.moviePilotToken}`;
        
        let response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        // If 403, try X-API-Key header instead
        if (response.status === 403) {
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': config.moviePilotToken
            };
            response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
        }

        // If still 403, try query parameter
        if (response.status === 403) {
            headers = {
                'Content-Type': 'application/json'
            };
            response = await fetch(`${baseUrl}${endpoint}?token=${config.moviePilotToken}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorMsg = errorJson.detail || errorJson.message || errorText;
            } catch {
                // Keep original error text
            }
            throw new Error(`HTTP ${response.status}: ${errorMsg}`);
        }

        const data = await response.json();
        
        if (data.success || data.code === 0 || response.status === 200) {
             return { success: true, message: '已成功推送到 MoviePilot 订阅' };
        } else {
             return { success: false, message: data.message || data.detail || 'MoviePilot 返回未知错误' };
        }

    } catch (e: any) {
        console.error('MoviePilot Subscription Failed:', e);
        return { success: false, message: `订阅失败: ${e.message}` };
    }
};
