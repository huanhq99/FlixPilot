import { EmbyConfig, NotificationConfig } from '../types';

// 播放记录项
export interface PlaybackRecord {
    userId: string;
    userName: string;
    itemId: string;
    itemName: string;
    itemType: 'Movie' | 'Episode' | 'Series';
    seriesName?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    playbackDate: string;
    playedDuration: number; // 秒
    totalDuration: number; // 秒
    playedPercentage: number;
    deviceName?: string;
}

// 用户统计
export interface UserStats {
    userId: string;
    userName: string;
    totalPlayCount: number;
    totalDuration: number; // 秒
    movieCount: number;
    episodeCount: number;
    favoriteGenre?: string;
}

// 内容统计
export interface ContentStats {
    itemId: string;
    itemName: string;
    itemType: string;
    playCount: number;
    uniqueViewers: number;
    posterUrl?: string;
}

// 日报/周报数据
export interface PlaybackReport {
    type: 'daily' | 'weekly';
    startDate: string;
    endDate: string;
    generatedAt: string;
    
    // 总体统计
    totalPlays: number;
    totalDuration: number; // 秒
    activeUsers: number;
    newContent: number;
    
    // 用户排行
    topUsers: UserStats[];
    
    // 热门内容
    topMovies: ContentStats[];
    topShows: ContentStats[];
    
    // 播放记录
    recentPlays: PlaybackRecord[];
}

// 获取服务器地址
const getServerUrl = (config: EmbyConfig): string => {
    return config.serverUrlInternal || config.serverUrl || config.serverUrlExternal || '';
};

// 获取 Emby/Jellyfin 播放活动记录
export const fetchPlaybackActivity = async (
    config: EmbyConfig,
    startDate: Date,
    endDate: Date
): Promise<PlaybackRecord[]> => {
    const baseUrl = getServerUrl(config).replace(/\/$/, '');
    if (!baseUrl || !config.apiKey) {
        throw new Error('Emby 配置不完整');
    }

    const records: PlaybackRecord[] = [];
    
    try {
        // 获取所有用户
        const usersRes = await fetch(`${baseUrl}/Users?api_key=${config.apiKey}`);
        if (!usersRes.ok) throw new Error('获取用户列表失败');
        const users = await usersRes.json();

        // 获取每个用户的播放历史
        for (const user of users) {
            try {
                // 使用 Items 接口获取已播放的内容
                const playedUrl = `${baseUrl}/Users/${user.Id}/Items?` + new URLSearchParams({
                    IncludeItemTypes: 'Movie,Episode',
                    Recursive: 'true',
                    IsPlayed: 'true',
                    SortBy: 'DatePlayed',
                    SortOrder: 'Descending',
                    Limit: '100',
                    Fields: 'DateCreated,Overview,ProviderIds,SeriesInfo,UserData',
                    api_key: config.apiKey
                });

                const res = await fetch(playedUrl);
                if (!res.ok) continue;

                const data = await res.json();
                const items = data.Items || [];

                for (const item of items) {
                    const userData = item.UserData;
                    if (!userData?.LastPlayedDate) continue;

                    const playedDate = new Date(userData.LastPlayedDate);
                    if (playedDate < startDate || playedDate > endDate) continue;

                    records.push({
                        userId: user.Id,
                        userName: user.Name,
                        itemId: item.Id,
                        itemName: item.Name,
                        itemType: item.Type,
                        seriesName: item.SeriesName,
                        seasonNumber: item.ParentIndexNumber,
                        episodeNumber: item.IndexNumber,
                        playbackDate: userData.LastPlayedDate,
                        playedDuration: (userData.PlaybackPositionTicks || 0) / 10000000,
                        totalDuration: (item.RunTimeTicks || 0) / 10000000,
                        playedPercentage: userData.PlayedPercentage || (userData.Played ? 100 : 0),
                    });
                }
            } catch (e) {
                console.warn(`获取用户 ${user.Name} 播放记录失败:`, e);
            }
        }

        return records;
    } catch (e) {
        console.error('获取播放活动失败:', e);
        throw e;
    }
};

// 获取当前活动会话（谁正在看什么）
export const fetchActiveSessions = async (config: EmbyConfig): Promise<any[]> => {
    const baseUrl = getServerUrl(config).replace(/\/$/, '');
    if (!baseUrl || !config.apiKey) {
        return [];
    }

    try {
        const res = await fetch(`${baseUrl}/Sessions?api_key=${config.apiKey}`);
        if (!res.ok) return [];
        
        const sessions = await res.json();
        return sessions.filter((s: any) => s.NowPlayingItem);
    } catch (e) {
        console.error('获取活动会话失败:', e);
        return [];
    }
};

// 生成日报数据
export const generateDailyReport = async (config: EmbyConfig): Promise<PlaybackReport> => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return generateReport(config, 'daily', startOfDay, endOfDay);
};

// 生成周报数据
export const generateWeeklyReport = async (config: EmbyConfig): Promise<PlaybackReport> => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // 本周日
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return generateReport(config, 'weekly', startOfWeek, endOfWeek);
};

// 通用报告生成
const generateReport = async (
    config: EmbyConfig,
    type: 'daily' | 'weekly',
    startDate: Date,
    endDate: Date
): Promise<PlaybackReport> => {
    const records = await fetchPlaybackActivity(config, startDate, endDate);
    
    // 统计用户数据
    const userMap = new Map<string, UserStats>();
    records.forEach(r => {
        if (!userMap.has(r.userId)) {
            userMap.set(r.userId, {
                userId: r.userId,
                userName: r.userName,
                totalPlayCount: 0,
                totalDuration: 0,
                movieCount: 0,
                episodeCount: 0
            });
        }
        const stats = userMap.get(r.userId)!;
        stats.totalPlayCount++;
        stats.totalDuration += r.playedDuration;
        if (r.itemType === 'Movie') stats.movieCount++;
        if (r.itemType === 'Episode') stats.episodeCount++;
    });

    // 统计内容数据
    const movieMap = new Map<string, ContentStats>();
    const showMap = new Map<string, ContentStats>();
    
    records.forEach(r => {
        if (r.itemType === 'Movie') {
            if (!movieMap.has(r.itemId)) {
                movieMap.set(r.itemId, {
                    itemId: r.itemId,
                    itemName: r.itemName,
                    itemType: 'Movie',
                    playCount: 0,
                    uniqueViewers: 0
                });
            }
            movieMap.get(r.itemId)!.playCount++;
        } else if (r.itemType === 'Episode' && r.seriesName) {
            const seriesKey = r.seriesName;
            if (!showMap.has(seriesKey)) {
                showMap.set(seriesKey, {
                    itemId: r.itemId,
                    itemName: r.seriesName,
                    itemType: 'Series',
                    playCount: 0,
                    uniqueViewers: 0
                });
            }
            showMap.get(seriesKey)!.playCount++;
        }
    });

    // 计算唯一观看者
    movieMap.forEach((stats, id) => {
        stats.uniqueViewers = new Set(records.filter(r => r.itemId === id).map(r => r.userId)).size;
    });
    showMap.forEach((stats, name) => {
        stats.uniqueViewers = new Set(records.filter(r => r.seriesName === name).map(r => r.userId)).size;
    });

    // 排序
    const topUsers = Array.from(userMap.values())
        .sort((a, b) => b.totalPlayCount - a.totalPlayCount)
        .slice(0, 10);
    
    const topMovies = Array.from(movieMap.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5);
    
    const topShows = Array.from(showMap.values())
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5);

    return {
        type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString(),
        totalPlays: records.length,
        totalDuration: records.reduce((sum, r) => sum + r.playedDuration, 0),
        activeUsers: userMap.size,
        newContent: 0, // 可以后续添加新入库统计
        topUsers,
        topMovies,
        topShows,
        recentPlays: records.slice(0, 20)
    };
};

// 格式化时长
export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
};

// 生成 Telegram 报告消息
export const formatReportForTelegram = (report: PlaybackReport): string => {
    const title = report.type === 'daily' ? '📊 每日观影报告' : '📊 每周观影报告';
    const dateRange = report.type === 'daily' 
        ? new Date(report.startDate).toLocaleDateString('zh-CN')
        : `${new Date(report.startDate).toLocaleDateString('zh-CN')} - ${new Date(report.endDate).toLocaleDateString('zh-CN')}`;
    
    let message = `${title}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `📅 ${dateRange}\n\n`;
    
    // 总体统计
    message += `📈 总体统计\n`;
    message += `├ 播放次数: ${report.totalPlays} 次\n`;
    message += `├ 观看时长: ${formatDuration(report.totalDuration)}\n`;
    message += `└ 活跃用户: ${report.activeUsers} 人\n\n`;
    
    // 用户排行
    if (report.topUsers.length > 0) {
        message += `👑 用户排行\n`;
        report.topUsers.slice(0, 5).forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const prefix = index === report.topUsers.slice(0, 5).length - 1 ? '└' : '├';
            message += `${prefix} ${medal} ${user.userName}: ${user.totalPlayCount}次 (${formatDuration(user.totalDuration)})\n`;
        });
        message += '\n';
    }
    
    // 热门电影
    if (report.topMovies.length > 0) {
        message += `🎬 热门电影\n`;
        report.topMovies.forEach((movie, index) => {
            const prefix = index === report.topMovies.length - 1 ? '└' : '├';
            message += `${prefix} ${movie.itemName} (${movie.playCount}次播放)\n`;
        });
        message += '\n';
    }
    
    // 热门剧集
    if (report.topShows.length > 0) {
        message += `📺 热门剧集\n`;
        report.topShows.forEach((show, index) => {
            const prefix = index === report.topShows.length - 1 ? '└' : '├';
            message += `${prefix} ${show.itemName} (${show.playCount}集播放)\n`;
        });
        message += '\n';
    }
    
    message += `━━━━━━━━━━━━━━━\n`;
    message += `⏰ 生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`;
    
    return message;
};

// 发送报告到 Telegram
export const sendReportToTelegram = async (
    config: NotificationConfig,
    report: PlaybackReport
): Promise<boolean> => {
    if (!config.telegramBotToken || !config.telegramChatId) {
        console.warn('Telegram 未配置');
        return false;
    }

    const message = formatReportForTelegram(report);

    try {
        const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.telegramChatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('发送 Telegram 报告失败:', error);
            return false;
        }

        return true;
    } catch (e) {
        console.error('发送 Telegram 报告异常:', e);
        return false;
    }
};
