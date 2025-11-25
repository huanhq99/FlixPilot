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

// 登录 MoviePilot 获取 JWT Token
const loginToMoviePilot = async (baseUrl: string, username: string, password: string): Promise<string | null> => {
    try {
        const loginUrl = `${baseUrl}/api/v1/login/access-token`;
        console.log('正在登录 MoviePilot...');
        
        // 尝试直连
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ MoviePilot 登录成功（直连）');
                return data.access_token;
            }
        } catch (e) {
            console.log('直连登录失败，尝试代理...');
        }
        
        // 尝试代理
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_url: loginUrl,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: formData.toString()
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.access_token) {
                console.log('✅ MoviePilot 登录成功（代理）');
                return data.access_token;
            }
        }
        
        console.error('❌ MoviePilot 登录失败');
        return null;
    } catch (error) {
        console.error('MoviePilot 登录异常:', error);
        return null;
    }
};

export const testMoviePilotConnection = async (config: NotificationConfig): Promise<{ success: boolean, message: string, method?: string }> => {
    if (!config.moviePilotUrl) {
        return { success: false, message: '请先配置 MoviePilot 地址' };
    }
    
    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    
    // 如果提供了用户名密码，先登录获取 Token
    let cleanToken = config.moviePilotToken?.trim() || '';
    if (!cleanToken && config.moviePilotUsername && config.moviePilotPassword) {
        const token = await loginToMoviePilot(baseUrl, config.moviePilotUsername, config.moviePilotPassword);
        if (!token) {
            return { success: false, message: '登录失败，请检查用户名和密码' };
        }
        cleanToken = token;
    }
    
    if (!cleanToken) {
        return { success: false, message: '请提供 Token 或用户名密码' };
    }
    
    // Endpoints to test (优先测试 MCP 端点，因为它支持 API Key)
    const endpoints = [
        '/api/v1/mcp/tools', // MCP 工具列表 (支持 API Key)
        '/api/v1/site', // 站点列表
        '/api/v1/system/env', // 系统环境
    ];

    let connectionError = '';

    console.log('🎯 ========== 测试 MoviePilot 连接 ==========');
    
    // 构造多种认证头组合
    const authHeadersList = [
        { 'Authorization': `Bearer ${cleanToken}` },
        { 'X-API-KEY': cleanToken },
        { 'Authorization': cleanToken },
        { 'token': cleanToken }
    ];

    for (const endpoint of endpoints) {
        // 尝试不同的 Query Param (token vs apikey)
        const targetUrls = [
            `${baseUrl}${endpoint}?token=${encodeURIComponent(cleanToken)}`,
            `${baseUrl}${endpoint}?apikey=${encodeURIComponent(cleanToken)}`
        ];

        for (const targetUrl of targetUrls) {
            // 1. 尝试直连 (Direct Connection)
            try {
                console.log(`\n📡 [直连] 尝试连接: ${targetUrl.replace(cleanToken, '***')}`);
                
                // 尝试不同的 Header 组合
                for (const authHeaders of authHeadersList) {
                    try {
                        const response = await fetch(targetUrl, {
                            method: 'GET',
                            headers: { 
                                'Accept': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                ...authHeaders
                            }
                        });

                        if (response.ok) {
                            console.log(`✅✅✅ 连接成功！(直连)`);
                            return { 
                                success: true, 
                                message: `连接成功！\n(直连模式)\n端点: ${endpoint}`,
                                method: 'Direct'
                            };
                        } else {
                            console.log(`❌ [直连] 响应状态: ${response.status} (Headers: ${JSON.stringify(Object.keys(authHeaders))})`);
                        }
                    } catch (innerE) {
                        // ignore
                    }
                }
            } catch (e) {
                console.log(`❌ [直连] 请求异常 (可能是CORS或网络不通)，尝试代理...`);
            }

            // 2. 尝试代理 (Proxy Connection)
            try {
                console.log(`\n📡 [代理] 尝试连接: ${targetUrl.replace(cleanToken, '***')}`);
                
                const response = await fetch(PROXY_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        target_url: targetUrl,
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Authorization': `Bearer ${cleanToken}`,
                            'X-API-KEY': cleanToken
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
    }

    return { 
        success: false, 
        message: `连接失败: ${connectionError}\n\n请检查:\n1. MoviePilot 地址是否正确\n2. Token 是否正确\n3. MoviePilot 是否正常运行\n4. 后端服务是否正常运行`
    };
};

export const subscribeToMoviePilot = async (config: NotificationConfig, item: MediaItem): Promise<{ success: boolean, message: string }> => {
    if (!config.moviePilotUrl) {
        return { success: false, message: '未配置 MoviePilot 地址' };
    }

    const baseUrl = config.moviePilotUrl.replace(/\/$/, '');
    
    // 如果提供了用户名密码，先登录获取 Token
    let cleanToken = config.moviePilotToken?.trim() || '';
    if (!cleanToken && config.moviePilotUsername && config.moviePilotPassword) {
        const token = await loginToMoviePilot(baseUrl, config.moviePilotUsername, config.moviePilotPassword);
        if (!token) {
            return { success: false, message: '登录失败，请检查用户名和密码' };
        }
        cleanToken = token;
    }
    
    if (!cleanToken) {
        return { success: false, message: '请提供 Token 或用户名密码' };
    }

    // 使用 MCP Tools API 来添加订阅
    const mcpPayload: any = {
        tool_name: "add_subscribe",
        arguments: {
            title: item.title,
            year: String(item.year || ""),
            media_type: item.mediaType === 'movie' ? '电影' : '电视剧',
            tmdb_id: String(item.id)
        }
    };
    
    // 添加可选参数
    if (item.mediaType === 'tv') {
        mcpPayload.arguments.season = 1;
    }
    
    // 如果配置了订阅用户名，使用指定的用户名
    if (config.moviePilotSubscribeUser) {
        mcpPayload.arguments.username = config.moviePilotSubscribeUser;
    }

    const PROXY_URL = '/api/proxy/moviepilot';
    
    console.log('Starting MoviePilot subscription via MCP Tools API...');
    console.log('Payload:', mcpPayload);

    // 尝试通过代理调用 MCP Tools API
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_url: `${baseUrl}/api/v1/mcp/tools/call`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-API-KEY': cleanToken
                },
                body: mcpPayload
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('MCP Tools API response:', data);
            
            if (data.success) {
                return { success: true, message: data.result || '已成功添加到 MoviePilot 订阅' };
            } else {
                return { success: false, message: data.error || '订阅失败' };
            }
        } else {
            const text = await response.text();
            console.error('MCP Tools API failed:', text);
            return { success: false, message: `订阅失败: ${text}` };
        }
    } catch (e: any) {
        console.error('MCP Tools API exception:', e);
        return { success: false, message: `订阅失败: ${e.message}` };
    }
};
