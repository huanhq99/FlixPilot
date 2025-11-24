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
    
    // Try common endpoints - 优先使用 /api/v1/* 路径（反代通常配置了这个路径）
    // 注意：从错误日志看，/v2/* 和 /v1/* 路径（没有 /api/ 前缀）会被 CORS 阻止
    // 但是从错误看，/api/v1/plugin/plugin_list 能到达服务器，说明路径是对的
    // 根据 MoviePilot 实际使用的 API 端点
    // 从用户提供的日志看，MoviePilot 使用 ?token= 作为查询参数
    // 优先使用实际存在的端点（从用户日志中看到的）
    const endpoints = [
        '/api/v1/plugin/remotes', // 插件列表（从日志看确实使用了 ?token=，优先尝试）
        '/api/v1/system/message', // 系统消息（不需要特殊权限）
        '/api/v1/dashboard/statistic', // 仪表板统计（可能不需要特殊权限）
        '/api/v1/system/info', // 系统信息
    ];

    const authMethods = [
        // MoviePilot 可能使用的认证方式（根据常见 API 模式）
        { name: 'Authorization (raw)', header: 'Authorization', value: config.moviePilotToken }, // 直接使用 Token，不加 Bearer
        { name: 'X-Api-Key', header: 'X-Api-Key', value: config.moviePilotToken }, // 注意大小写
        { name: 'X-API-Key', header: 'X-API-Key', value: config.moviePilotToken },
        { name: 'Bearer Token', header: 'Authorization', value: `Bearer ${config.moviePilotToken}` },
        { name: 'token Header', header: 'token', value: config.moviePilotToken },
        { name: 'apikey Header', header: 'apikey', value: config.moviePilotToken },
    ];

    // Clean token - remove any whitespace
    const cleanToken = config.moviePilotToken.trim();

    // 0. Check if service is reachable (try root path, might be reverse proxy)
    let serviceReachable = false;
    try {
        console.log(`Checking service connectivity: ${baseUrl}`);
        const rootCheck = await fetch(`${baseUrl}/`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        // Any response means service is reachable
        serviceReachable = true;
        console.log(`Service is reachable (status: ${rootCheck.status})`);
    } catch (e) {
        console.warn('Service connectivity check failed:', e);
    }

    let connectionError = '';
    let lastStatusCode = 0;
    let lastErrorUrl = '';

    // 🎯 首先尝试查询参数方式（MoviePilot 实际使用的方式，从用户日志确认）
    console.log('🎯 ========== 优先尝试查询参数认证方式（MoviePilot 实际使用的方式）==========');
    console.log(`Token: ${cleanToken.substring(0, 10)}...`);
    console.log(`Base URL: ${baseUrl}`);
    
    for (const endpoint of endpoints) {
        if (!endpoint.startsWith('/api/v1/')) {
            console.log(`跳过非 /api/v1/ 端点: ${endpoint}`);
            continue;
        }
        
        try {
            const url = `${baseUrl}${endpoint}?token=${encodeURIComponent(cleanToken)}`;
            console.log(`\n📡 [查询参数方式] 尝试端点: ${endpoint}`);
            console.log(`📡 [查询参数方式] 完整 URL: ${url.replace(cleanToken, '***')}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'omit'
            });
            
            console.log(`📡 [查询参数方式] 响应状态: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                console.log(`✅✅✅ 连接成功！使用查询参数方式，端点: ${endpoint}`);
                console.log(`✅ 响应数据:`, data);
                return { 
                    success: true, 
                    message: `连接成功！\n端点: ${endpoint}\n认证方式: 查询参数 (?token=...)`,
                    method: 'Query Parameter'
                };
            } else {
                console.log(`❌ [查询参数方式] 失败，端点: ${endpoint}, 状态: ${response.status}`);
                
                // 尝试读取错误详情
                let errorDetail = '';
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorData.message || errorData.msg || '';
                    console.log(`❌ 错误详情:`, errorData);
                } catch {
                    const text = await response.text().catch(() => '');
                    errorDetail = text;
                    console.log(`❌ 错误详情 (文本):`, text);
                }
                
                lastStatusCode = response.status;
                lastErrorUrl = `${baseUrl}${endpoint}`;
                
                if (response.status === 401 || response.status === 403) {
                    connectionError = `认证失败 (${response.status}): ${errorDetail || 'Token 可能无效'}`;
                } else if (response.status === 404) {
                    console.log(`⚠️ 端点不存在 (404)，继续尝试下一个端点`);
                    // 404 不一定是认证问题，可能是端点不对，继续尝试
                }
            }
        } catch (e: any) {
            console.error(`❌ [查询参数方式] 请求异常，端点: ${endpoint}`, e);
            console.error(`❌ 错误类型: ${e.name}, 消息: ${e.message}`);
            if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
                connectionError = '无法连接到服务器（可能是 CORS 问题）';
                console.error(`⚠️ 可能是 CORS 问题，请求被浏览器阻止`);
            }
        }
    }
    
    console.log('\n🔄 ========== 查询参数方式全部失败，尝试 Header 认证方式 ==========\n');

    // 如果查询参数方式失败，再尝试 Header 方式
    console.log('🔄 查询参数方式失败，尝试 Header 认证方式');
    for (const endpoint of endpoints) {
        for (const authMethod of authMethods) {
            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                };
                
                // 根据认证方式设置 Header
                if (authMethod.header === 'Authorization') {
                    if (authMethod.name === 'Bearer Token') {
                        headers[authMethod.header] = `Bearer ${cleanToken}`;
                    } else {
                        headers[authMethod.header] = cleanToken; // 直接使用 Token，不加 Bearer
                    }
                } else {
                    headers[authMethod.header] = cleanToken;
                }

                console.log(`Testing MP connection: ${baseUrl}${endpoint} with ${authMethod.name}`);
                console.log(`Request headers:`, headers);

                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'GET',
                    headers,
                    credentials: 'omit' // 不发送 cookie，避免干扰
                });

                if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    return { 
                        success: true, 
                        message: `连接成功！\n端点: ${endpoint}\n认证方式: ${authMethod.name}`,
                        method: authMethod.name
                    };
                } else {
                    // 记录最后一次错误状态
                    lastStatusCode = response.status;
                    lastErrorUrl = `${baseUrl}${endpoint}`;
                    
                    // 尝试读取错误详情
                    let errorDetail = '';
                    try {
                        const errorData = await response.json();
                        errorDetail = errorData.detail || errorData.message || errorData.msg || errorData.error || '';
                        console.log(`API Error Response:`, errorData);
                    } catch {
                        const text = await response.text().catch(() => '');
                        errorDetail = text;
                        console.log(`API Error Response (text):`, text);
                    }
                    
                    // 记录响应头，可能有有用的信息
                    console.log(`Response headers for ${endpoint}:`, Object.fromEntries(response.headers.entries()));
                    
                    if (response.status === 401 || response.status === 403) {
                        // 记录详细的认证错误信息
                        if (!connectionError || connectionError.includes('所有尝试均失败') || !connectionError.includes('认证失败')) {
                            connectionError = `认证失败 (${response.status})${errorDetail ? ': ' + errorDetail : ''}\n\n使用的 Token: ${cleanToken.substring(0, 10)}...\n\n请检查：\n1. Token 是否完整（复制时不要遗漏）\n2. Token 是否已过期或失效\n3. 在 MoviePilot 中重新生成 Token`;
                        }
                        console.log(`认证失败 - 端点: ${endpoint}, 方式: ${authMethod.name}, 状态: ${response.status}, 详情: ${errorDetail}`);
                    } else if (response.status === 404) {
                        // 404 可能是路径不对，继续尝试其他路径
                        console.log(`Path not found (404): ${endpoint}`);
                    } else {
                        if (!connectionError || connectionError.includes('所有尝试均失败')) {
                            connectionError = `服务器返回错误: ${response.status} ${response.statusText}${errorDetail ? '\n详情: ' + errorDetail : ''}`;
                        }
                    }
                }
            } catch (e: any) {
                console.error(`MP Test failed for ${endpoint} ${authMethod.name}`, e);
                if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
                    // 这通常是 CORS 或网络问题
                    connectionError = `无法连接到服务器。\n\n可能原因：\n1. 跨域(CORS)限制：浏览器阻止了请求\n2. 网络连接问题\n3. 反代配置问题\n\n解决方案：\n- 检查浏览器控制台 (F12) 查看 CORS 错误\n- 确认反代服务器允许跨域请求\n- 或在 MoviePilot 配置中允许 StreamHub 的域名`;
                } else if (e.name === 'AbortError') {
                    connectionError = '请求超时。请检查网络连接或服务响应速度。';
                } else {
                    connectionError = `请求出错: ${e.message}`;
                }
            }
        }
    }


    // 如果所有尝试都失败，给出详细诊断信息
    let diagnosticMessage = '';
    
    // 检查是否是 CORS 错误（从错误消息判断）
    const isCorsError = connectionError.includes('跨域') || connectionError.includes('CORS') || connectionError.includes('Failed to fetch');
    
    if (serviceReachable || isCorsError) {
        // 服务可达或可能是 CORS 问题
        if (isCorsError || (!lastStatusCode && connectionError.includes('Failed to fetch'))) {
            diagnosticMessage = `⚠️ 跨域(CORS)限制问题\n\n从浏览器直接访问 MoviePilot 会被跨域策略阻止。\n\n解决方案：\n1. 在 MoviePilot 的反代配置中添加 CORS 头：\n   add_header 'Access-Control-Allow-Origin' '*' always;\n   add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;\n   add_header 'Access-Control-Allow-Headers' 'Authorization, X-API-Key, Content-Type' always;\n\n2. 或者在 MoviePilot 设置中配置允许跨域的域名\n\n3. 或者通过后端代理访问（需要后端支持）\n\n💡 提示：按 F12 打开浏览器控制台，查看 Network 标签的具体错误信息`;
        } else if (lastStatusCode === 401 || lastStatusCode === 403) {
            // 能返回 401/403，说明请求能到达服务器，CORS 没问题，但 Token 认证失败
            diagnosticMessage = `🔐 Token 认证失败 (${lastStatusCode})\n\n${connectionError || '所有认证方式均失败'}\n\n📝 诊断：\n请求能到达 MoviePilot 服务器，但 Token 验证失败。\n\n✅ 解决步骤：\n1. 登录 MoviePilot (${baseUrl})\n2. 进入"设置" → "API密钥"或"安全设置"\n3. 重新生成 API Token\n4. 完整复制新 Token（不要有空格）\n5. 粘贴到 StreamHub 设置中\n\n🔍 如果重新生成 Token 后还是失败：\n- 检查反代配置是否正确转发 Authorization Header\n- 查看 MoviePilot 日志确认 API 请求详情\n- 确认 Token 权限是否足够`;
        } else if (lastStatusCode === 404) {
            diagnosticMessage = `服务在线，但 API 路径未找到 (404)。\n\n可能原因：\n1. 反代配置中 API 路径未正确配置\n2. MoviePilot 的 API 路径可能与预期不同\n3. 建议检查反代服务器配置，确保 /api/* 路径正确转发到 MoviePilot 服务\n\n尝试的路径: ${lastErrorUrl || '未知'}`;
        } else {
            diagnosticMessage = `服务在线，但连接失败。\n\n${connectionError || '所有尝试均失败'}\n\n最后错误状态: ${lastStatusCode || '未知'}\n\n建议：\n1. 检查反代服务器配置\n2. 查看浏览器控制台 (F12) 的 Network 标签\n3. 确认 MoviePilot 服务正常运行`;
        }
    } else {
        // 服务不可达
        diagnosticMessage = `无法连接到服务器。\n\n请检查：\n1. 地址是否正确 (${baseUrl})\n2. 服务是否正常运行\n3. 网络是否畅通\n4. 如果是反代，确认反代服务正常运行\n\n💡 提示：虽然你能在浏览器中访问 ${baseUrl}，但从代码中 fetch 可能被阻止。\n按 F12 打开浏览器控制台，查看 Network 标签的具体错误。`;
    }

    return { 
        success: false, 
        message: diagnosticMessage
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
