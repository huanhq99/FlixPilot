// API: Get server configuration (for frontend)
app.get('/api/config', (req, res) => {
    try {
        // Return configuration for frontend (hide passwords)
        const isEmbyConfigured = !!config.emby?.serverUrl && config.emby?.serverUrl !== 'http://your-emby-server:8096';
        const isMPConfigured = !!config.moviepilot?.url && config.moviepilot?.url !== 'https://your-moviepilot-server.com';
        const isTelegramConfigured = !!config.telegram?.botToken && !!config.telegram?.chatId;
        
        res.json({
            version: VERSION,
            tmdb: {
                configured: !!config.tmdb.apiKey && config.tmdb.apiKey !== 'your_tmdb_api_key_here',
                apiKey: config.tmdb.apiKey !== 'your_tmdb_api_key_here' ? config.tmdb.apiKey : '',
                baseUrl: config.tmdb.baseUrl || 'https://api.themoviedb.org/3'
            },
            // 返回 Emby 完整配置给前端使用
            emby: isEmbyConfigured ? {
                configured: true,
                serverUrl: config.emby.serverUrl,
                serverUrlInternal: config.emby.serverUrlInternal || '',
                serverUrlExternal: config.emby.serverUrlExternal || '',
                apiKey: config.emby.apiKey
            } : { configured: false },
            // 返回 MoviePilot 配置给前端使用
            moviepilot: isMPConfigured ? {
                configured: true,
                url: config.moviepilot.url,
                username: config.moviepilot.username,
                password: config.moviepilot.password,  // 返回密码供前端登录使用
                subscribeUser: config.moviepilot.subscribeUser
            } : { configured: false },
            // 返回 Telegram 配置给前端使用
            telegram: isTelegramConfigured ? {
                configured: true,
                botToken: config.telegram.botToken,
                chatId: config.telegram.chatId
            } : { configured: false },
            // 报告配置
            report: {
                enabled: config.report?.enabled || false,
                dailyTime: config.report?.dailyTime || '23:00',
                weeklyDay: config.report?.weeklyDay ?? 0,
                weeklyTime: config.report?.weeklyTime || '22:00'
            }
        });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});