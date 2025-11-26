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

const PROXY_URL = '/api/proxy/moviepilot';

/**
 * 获取本地存储中的 StreamHub 管理员 token
 * 优先使用 `streamhub_token`，其次尝试 `streamhub_auth.accessToken` 或 `streamhub_auth.token`
 */
function getLocalAuthToken(): string {
    const tokenDirect = localStorage.getItem('streamhub_token');
    if (tokenDirect) return tokenDirect;
    const authStr = localStorage.getItem('streamhub_auth');
    if (!authStr) return '';
    try {
        const auth = JSON.parse(authStr);
        return auth.accessToken || auth.token || '';
    } catch {
        return '';
    }
}

export const testMoviePilotConnection = async (config: NotificationConfig): Promise<{ success: boolean, message: string, method?: string }> => {
    if (!config.moviePilotUrl) {
        return { success: false, message: '请先配置 MoviePilot 地址' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    let cleanToken = config.moviePilotToken?.trim() || '';
    
    // 如果没有 Token，但有用户名密码，先尝试登录获取 Token
    if (!cleanToken && config.moviePilotUsername && config.moviePilotPassword) {
        console.log('🔐 使用用户名密码登录获取 Token...');
        try {
            const loginUrl = `${baseUrl}/api/v1/login/access-token`;
            const loginResponse = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getLocalAuthToken()}`
                },
                body: JSON.stringify({
                    target_url: loginUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: `username=${encodeURIComponent(config.moviePilotUsername)}&password=${encodeURIComponent(config.moviePilotPassword)}`
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                if (loginData.access_token) {
                    cleanToken = loginData.access_token;
                    console.log('✅ 登录成功，已获取 Token');
                } else {
                    return { success: false, message: '登录失败：未返回 Token' };
                }
            } else {
                const errorText = await loginResponse.text();
                return { success: false, message: `登录失败 (${loginResponse.status}): ${errorText}` };
            }
        } catch (e: any) {
            return { success: false, message: `登录失败: ${e.message}` };
        }
    }
    
    if (!cleanToken) {
        return { success: false, message: '请先配置 MoviePilot Token 或用户名密码' };
    }
    
    // Endpoints to test
    const endpoints = [
        '/api/v1/plugin/remotes', 
        '/api/v1/system/message',
        '/api/v1/dashboard/statistic',
        '/api/v1/system/info',
    ];

    let connectionError = '';

    console.log('🎯 ========== 使用后端代理测试 MoviePilot 连接 ==========');
    
    for (const endpoint of endpoints) {
        try {
            // Construct target URL
            const targetUrl = `${baseUrl}${endpoint}?token=${encodeURIComponent(cleanToken)}`;
            
            console.log(`\n📡 [代理] 尝试连接: ${targetUrl.replace(cleanToken, '***')}`);
            
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Authorization header for server.js requireAuth middleware if needed
                    'Authorization': `Bearer ${getLocalAuthToken()}`
                },
                body: JSON.stringify({
                    target_url: targetUrl,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
            });
            
            console.log(`📡 [代理] 响应状态: ${response.status} ${response.statusText}`);
            
            let responseData: any = null;
            try {
                responseData = await response.json();
                console.log(`📡 [代理] 响应数据:`, responseData);
            } catch {
                const text = await response.text().catch(() => '');
                console.log(`📡 [代理] 响应文本:`, text);
            }
            
            if (response.ok) {
                console.log(`✅✅✅ 连接成功！(通过代理)`);
                return { 
                    success: true, 
                    message: `连接成功！\n(通过后端代理转发)\n端点: ${endpoint}`,
                    method: 'Backend Proxy'
                };
            } else {
                let errorDetail = '';
                if (responseData) {
                    errorDetail = responseData.detail || responseData.message || JSON.stringify(responseData);
                }
                
                if (response.status === 401 || response.status === 403) {
                     connectionError = `认证失败 (${response.status}): ${errorDetail}`;
                } else {
                     connectionError = `服务器错误 (${response.status}): ${errorDetail}`;
                }
                console.log(`❌ [代理] 失败: ${connectionError}`);
            }
        } catch (e: any) {
             console.error(`❌ [代理] 请求异常`, e);
             connectionError = `代理请求失败: ${e.message}`;
        }
    }

    return { 
        success: false, 
        message: `连接失败: ${connectionError}\n\n请检查:\n1. MoviePilot 地址是否正确\n2. Token 或用户名密码是否正确\n3. MoviePilot 是否正常运行\n4. 后端服务是否正常运行`
    };
};

export const subscribeToMoviePilot = async (config: NotificationConfig, item: MediaItem): Promise<{ success: boolean, message: string }> => {
    if (!config.moviePilotUrl || !config.moviePilotToken) {
        return { success: false, message: '未配置 MoviePilot' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    const endpoint = item.mediaType === 'movie' 
        ? '/api/v1/subscribe/movie' 
        : '/api/v1/subscribe/tv';
    
    const cleanToken = config.moviePilotToken.trim();

    const payload = {
        name: item.title,
        year: item.year,
        tmdbid: item.id,
        season: item.mediaType === 'tv' ? 1 : undefined,
    };

    console.log('Subscribing to MP (via Proxy):', `${baseUrl}${endpoint}`, payload);

    try {
        // Try with token in query param first (most reliable based on logs)
        const targetUrl = `${baseUrl}${endpoint}?token=${encodeURIComponent(cleanToken)}`;
        
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getLocalAuthToken()}`
            },
            body: JSON.stringify({
                target_url: targetUrl,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: payload
            })
        });

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
                return { success: false, message: `订阅失败: ${json.detail || json.message || 'Unknown Error'}` };
            } catch {
                return { success: false, message: `订阅失败 (${response.status}): ${text}` };
            }
        }

    } catch (e: any) {
        console.error('MoviePilot Subscription Failed:', e);
        return { success: false, message: `订阅失败: ${e.message}` };
    }
};
