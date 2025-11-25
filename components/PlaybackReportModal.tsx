import React, { useState, useEffect } from 'react';
import { 
    X, BarChart3, TrendingUp, Users, Clock, Film, Tv, Play, 
    Calendar, Send, RefreshCw, Download, ChevronRight, Crown,
    Activity, Eye, Timer
} from 'lucide-react';
import { EmbyConfig, NotificationConfig } from '../types';
import { 
    PlaybackReport, 
    generateDailyReport, 
    generateWeeklyReport, 
    formatDuration,
    sendReportToTelegram,
    fetchActiveSessions
} from '../services/playbackStatsService';

interface PlaybackReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    embyConfig: EmbyConfig;
    notificationConfig: NotificationConfig;
}

const PlaybackReportModal: React.FC<PlaybackReportModalProps> = ({
    isOpen,
    onClose,
    isDarkMode,
    embyConfig,
    notificationConfig
}) => {
    const [activeTab, setActiveTab] = useState<'live' | 'daily' | 'weekly'>('daily');
    const [report, setReport] = useState<PlaybackReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadReport();
        }
    }, [isOpen, activeTab]);

    useEffect(() => {
        if (isOpen && activeTab === 'live') {
            loadActiveSessions();
            const interval = setInterval(loadActiveSessions, 10000); // 每10秒刷新
            return () => clearInterval(interval);
        }
    }, [isOpen, activeTab]);

    const loadReport = async () => {
        if (activeTab === 'live') return;
        
        setLoading(true);
        setError(null);
        try {
            const data = activeTab === 'daily' 
                ? await generateDailyReport(embyConfig)
                : await generateWeeklyReport(embyConfig);
            setReport(data);
        } catch (e: any) {
            setError(e.message || '加载报告失败');
        }
        setLoading(false);
    };

    const loadActiveSessions = async () => {
        try {
            const sessions = await fetchActiveSessions(embyConfig);
            setActiveSessions(sessions);
        } catch (e) {
            console.error('加载活动会话失败:', e);
        }
    };

    const handleSendToTelegram = async () => {
        if (!report) return;
        setSending(true);
        setSendSuccess(false);
        
        const success = await sendReportToTelegram(notificationConfig, report);
        
        setSending(false);
        setSendSuccess(success);
        
        if (success) {
            setTimeout(() => setSendSuccess(false), 3000);
        }
    };

    const handleExport = () => {
        if (!report) return;
        
        const data = JSON.stringify(report, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `playback-report-${report.type}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const TabButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : isDarkMode
                        ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    const StatCard = ({ icon: Icon, label, value, subValue, color }: any) => (
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div>
                    <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {value}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {label}
                    </div>
                    {subValue && (
                        <div className={`text-xs ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                            {subValue}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl ${
                isDarkMode ? 'bg-zinc-900' : 'bg-white'
            }`}>
                {/* Header */}
                <div className={`sticky top-0 z-10 p-4 border-b ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                                <BarChart3 size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    观影统计报告
                                </h2>
                                <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                    用户播放数据分析
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {report && activeTab !== 'live' && (
                                <>
                                    <button
                                        onClick={handleSendToTelegram}
                                        disabled={sending}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            sendSuccess
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        } disabled:opacity-50`}
                                    >
                                        {sending ? (
                                            <RefreshCw size={14} className="animate-spin" />
                                        ) : sendSuccess ? (
                                            '✓ 已发送'
                                        ) : (
                                            <>
                                                <Send size={14} />
                                                推送到 TG
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                                        }`}
                                        title="导出 JSON"
                                    >
                                        <Download size={18} />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={loadReport}
                                disabled={loading}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                                title="刷新"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={onClose}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <TabButton id="live" label="实时" icon={Activity} />
                        <TabButton id="daily" label="日报" icon={Calendar} />
                        <TabButton id="weekly" label="周报" icon={TrendingUp} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 overflow-auto max-h-[calc(90vh-140px)]">
                    {activeTab === 'live' ? (
                        /* 实时观看 */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    正在观看 ({activeSessions.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                        实时更新
                                    </span>
                                </div>
                            </div>

                            {activeSessions.length === 0 ? (
                                <div className={`text-center py-12 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    <Eye size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>暂无用户正在观看</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeSessions.map((session, idx) => {
                                        const item = session.NowPlayingItem;
                                        const isEpisode = item?.Type === 'Episode';
                                        const baseUrl = embyConfig.serverUrl?.replace(/\/$/, '');
                                        
                                        // 海报URL (竖图)
                                        const posterUrl = item && baseUrl 
                                            ? `${baseUrl}/Items/${isEpisode && item.SeriesId ? item.SeriesId : item.Id}/Images/Primary?maxHeight=200&api_key=${embyConfig.apiKey}`
                                            : '';
                                        
                                        // 背景图URL (横图)
                                        const backdropUrl = item && baseUrl
                                            ? `${baseUrl}/Items/${isEpisode && item.SeriesId ? item.SeriesId : item.Id}/Images/Backdrop?maxWidth=600&api_key=${embyConfig.apiKey}`
                                            : '';
                                        
                                        const title = item?.SeriesName || item?.Name || '未知内容';
                                        const subtitle = isEpisode && item?.Name ? item.Name : '';
                                        const year = item?.ProductionYear || '';
                                        
                                        return (
                                            <div
                                                key={idx}
                                                className={`relative rounded-2xl overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}
                                                style={{ minHeight: '120px' }}
                                            >
                                                {/* 背景横图 */}
                                                {backdropUrl && (
                                                    <div className="absolute inset-0">
                                                        <img 
                                                            src={backdropUrl} 
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                        {/* 渐变遮罩 */}
                                                        <div className={`absolute inset-0 ${isDarkMode 
                                                            ? 'bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/60' 
                                                            : 'bg-gradient-to-r from-white via-white/95 to-white/60'}`} 
                                                        />
                                                    </div>
                                                )}
                                                
                                                {/* 内容区域 */}
                                                <div className="relative flex items-center gap-4 p-4">
                                                    {/* 左侧海报 */}
                                                    <div className="w-16 h-24 rounded-lg overflow-hidden shadow-lg shrink-0 bg-zinc-700">
                                                        {posterUrl && (
                                                            <img 
                                                                src={posterUrl} 
                                                                alt={title}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                    
                                                    {/* 中间信息 */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className={`font-bold text-lg truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                                {title}
                                                            </h3>
                                                            {year && (
                                                                <span className={`text-sm shrink-0 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                                    ({year})
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {subtitle && (
                                                            <div className={`text-sm mb-2 truncate ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                                {subtitle}
                                                            </div>
                                                        )}
                                                        
                                                        {/* 播放状态标签 */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                                                <Play size={10} fill="currentColor" />
                                                                播放中
                                                            </span>
                                                        </div>
                                                        
                                                        {/* 用户信息 */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                {session.UserName?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                                {session.UserName || '未知用户'}
                                                            </span>
                                                            <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                                {session.DeviceName} • {session.Client}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw size={32} className={`animate-spin ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} />
                        </div>
                    ) : error ? (
                        <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                            <p>{error}</p>
                            <button
                                onClick={loadReport}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                重试
                            </button>
                        </div>
                    ) : report ? (
                        <div className="space-y-6">
                            {/* 统计卡片 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    icon={Play}
                                    label="播放次数"
                                    value={report.totalPlays}
                                    color="bg-indigo-500"
                                />
                                <StatCard
                                    icon={Timer}
                                    label="观看时长"
                                    value={formatDuration(report.totalDuration)}
                                    color="bg-purple-500"
                                />
                                <StatCard
                                    icon={Users}
                                    label="活跃用户"
                                    value={report.activeUsers}
                                    color="bg-emerald-500"
                                />
                                <StatCard
                                    icon={Film}
                                    label="内容类型"
                                    value={`${report.topMovies.length} 电影`}
                                    subValue={`${report.topShows.length} 剧集`}
                                    color="bg-amber-500"
                                />
                            </div>

                            {/* 用户排行榜 */}
                            {report.topUsers.length > 0 && (
                                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <Crown size={20} className="text-amber-500" />
                                        用户排行榜
                                    </h3>
                                    <div className="space-y-3">
                                        {report.topUsers.slice(0, 5).map((user, idx) => (
                                            <div key={user.userId} className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                    idx === 0 ? 'bg-yellow-500 text-white' :
                                                    idx === 1 ? 'bg-slate-400 text-white' :
                                                    idx === 2 ? 'bg-amber-600 text-white' :
                                                    isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        {user.userName}
                                                    </div>
                                                    <div className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                        {user.movieCount} 电影 • {user.episodeCount} 剧集
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                        {user.totalPlayCount} 次
                                                    </div>
                                                    <div className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                        {formatDuration(user.totalDuration)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 热门内容 */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* 热门电影 */}
                                {report.topMovies.length > 0 && (
                                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Film size={20} className="text-blue-500" />
                                            热门电影
                                        </h3>
                                        <div className="space-y-2">
                                            {report.topMovies.map((movie, idx) => (
                                                <div key={movie.itemId} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                            {idx + 1}.
                                                        </span>
                                                        <span className={`truncate ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                            {movie.itemName}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        {movie.playCount} 次
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 热门剧集 */}
                                {report.topShows.length > 0 && (
                                    <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Tv size={20} className="text-purple-500" />
                                            热门剧集
                                        </h3>
                                        <div className="space-y-2">
                                            {report.topShows.map((show, idx) => (
                                                <div key={show.itemName} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                            {idx + 1}.
                                                        </span>
                                                        <span className={`truncate ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                            {show.itemName}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                                        {show.playCount} 集
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 报告信息 */}
                            <div className={`text-center text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                报告生成时间: {new Date(report.generatedAt).toLocaleString('zh-CN')}
                            </div>
                        </div>
                    ) : (
                        <div className={`text-center py-12 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                            <p>暂无数据</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaybackReportModal;
