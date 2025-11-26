import React, { useState, useEffect } from 'react';
import { X, Save, Server, CheckCircle2, AlertCircle, Loader2, User, ShieldCheck, Database, List, Trash2, Bell, Send, MessageSquare, LayoutDashboard, Users, Mail, Check, XCircle, Clock, Filter, Download, AlertOctagon, MonitorPlay, Film, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { checkForUpdates, UpdateInfo } from '../services/updateService';
import { EmbyConfig, EmbyUser, NotificationConfig, RequestItem } from '../types';
import { validateEmbyConnection, getEmbyUsers, fetchEmbyLibrary, fetchEmbyLibraries } from '../services/embyService';
import { sendTelegramTest, sendTelegramNotification, testMoviePilotConnection, subscribeToMoviePilot } from '../services/notificationService';
import { logger } from '../utils/logger';
import { testTmdbConnection } from '../services/tmdbService';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { useToast } from './Toast';
import { APP_VERSION, TMDB_API_KEY, TMDB_BASE_URL } from '../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: EmbyConfig, library?: Set<string>, syncInterval?: number, selectedLibIds?: string[]) => void;
    currentConfig: EmbyConfig;
    isDarkMode: boolean;
    initialSelectedLibraries?: string[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig, isDarkMode, initialSelectedLibraries = [] }) => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'library' | 'notifications' | 'requests' | 'users' | 'system' | 'stats'>('library');
    
    // Library State
    const [url, setUrl] = useState(currentConfig.serverUrl);
    const [urlInternal, setUrlInternal] = useState(currentConfig.serverUrlInternal || '');
    const [urlExternal, setUrlExternal] = useState(currentConfig.serverUrlExternal || '');
    const [apiKey, setApiKey] = useState(currentConfig.apiKey);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncInterval, setSyncInterval] = useState(() => storage.get(STORAGE_KEYS.SYNC_INTERVAL, 15));
    
    // Multi-Library Selection State
    const [libraries, setLibraries] = useState<any[]>([]);
    const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>(initialSelectedLibraries);
    const [loadingLibraries, setLoadingLibraries] = useState(false);

    // Notification State
    const [notifyConfig, setNotifyConfig] = useState<NotificationConfig>({});

    // Requests State
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');

    // Users State
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });
    const [isImportingUsers, setIsImportingUsers] = useState(false);

    // System Settings
    const [websiteTitle, setWebsiteTitle] = useState('StreamHub - Global Media Monitor');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [movieRequestLimit, setMovieRequestLimit] = useState(0); // 0 = Unlimited
    const [tvRequestLimit, setTvRequestLimit] = useState(0); // 0 = Unlimited
    
    // TMDB Settings
    const [tmdbApiKey, setTmdbApiKey] = useState('');
    const [tmdbProxyUrl, setTmdbProxyUrl] = useState('');
    const [testingTmdb, setTestingTmdb] = useState(false);

    // Update Check State
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [serverVersion, setServerVersion] = useState<string>(APP_VERSION);

    useEffect(() => {
        if (isOpen) {
            setUrl(currentConfig.serverUrl || '');
            setUrlInternal(currentConfig.serverUrlInternal || '');
            setUrlExternal(currentConfig.serverUrlExternal || '');
            setApiKey(currentConfig.apiKey || '');
            setStatus('idle');
            setSyncProgress(0);
            setSyncStatusText('');
            setSyncInterval(storage.get(STORAGE_KEYS.SYNC_INTERVAL, 15));
            
            // Load requests
            setRequests(storage.get<RequestItem[]>(STORAGE_KEYS.REQUESTS, []));

            // Load notifications from localStorage first
            const localNotify = storage.get(STORAGE_KEYS.NOTIFICATIONS, {});
            setNotifyConfig(localNotify);
            
            // Load users
            setUsers(storage.get(STORAGE_KEYS.USERS, []));
            
            // Fetch server config and merge with local
            fetch('/api/config')
                .then(res => res.json())
                .then(data => {
                    if (data.version) {
                        setServerVersion(data.version);
                    }
                    
                    // 一次性合并所有服务器配置，避免多次 setState 覆盖
                    setNotifyConfig(prev => {
                        const merged = { ...prev };
                        
                        // 合并 Telegram 配置
                        if (data.telegram?.configured) {
                            merged.telegramBotToken = data.telegram.botToken || prev.telegramBotToken;
                            merged.telegramChatId = data.telegram.chatId || prev.telegramChatId;
                        }
                        
                        // 合并 MoviePilot 配置
                        if (data.moviepilot?.configured) {
                            merged.moviePilotUrl = data.moviepilot.url || prev.moviePilotUrl;
                            merged.moviePilotUsername = data.moviepilot.username || prev.moviePilotUsername;
                            merged.moviePilotPassword = data.moviepilot.password || prev.moviePilotPassword;
                            merged.moviePilotSubscribeUser = data.moviepilot.subscribeUser || prev.moviePilotSubscribeUser;
                        }
                        
                        return merged;
                    });
                    
                    // 合并服务器端 TMDB 配置
                    if (data.tmdb?.configured && data.tmdb.apiKey) {
                        setTmdbApiKey(data.tmdb.apiKey);
                        setTmdbProxyUrl(data.tmdb.baseUrl || '');
                    }
                })
                .catch(err => console.error('Failed to fetch server config:', err));

             // Load system settings
            try {
                const savedSettings = localStorage.getItem('streamhub_settings');
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.scanInterval) setSyncInterval(parsed.scanInterval); // Legacy support?
                    if (parsed.websiteTitle) setWebsiteTitle(parsed.websiteTitle);
                    if (parsed.faviconUrl) setFaviconUrl(parsed.faviconUrl);
                    if (parsed.movieRequestLimit !== undefined) setMovieRequestLimit(parsed.movieRequestLimit);
                    if (parsed.tvRequestLimit !== undefined) setTvRequestLimit(parsed.tvRequestLimit);
                    // 向后兼容旧配置
                    if (parsed.requestLimit && !parsed.movieRequestLimit) {
                        setMovieRequestLimit(parsed.requestLimit);
                        setTvRequestLimit(parsed.requestLimit);
                    }
                }
                
                // Load TMDB settings
                const tmdbConfig = storage.get(STORAGE_KEYS.TMDB_CONFIG, {}) as any;
                setTmdbApiKey(tmdbConfig.apiKey || '');
                setTmdbProxyUrl(tmdbConfig.baseUrl || '');
            } catch (e) { /* ignore */ }

            // Try fetch libraries if already configured
            if (currentConfig.serverUrl && currentConfig.apiKey) {
                loadLibraries(currentConfig);
            }
        }
    }, [isOpen, currentConfig]);

    const loadLibraries = async (config: EmbyConfig) => {
        setLoadingLibraries(true);
        try {
            const libs = await fetchEmbyLibraries(config);
            setLibraries(libs);
        } catch (e) {
            console.error("Failed to load libraries", e);
        } finally {
            setLoadingLibraries(false);
        }
    };

    // Refresh requests when tab changes to 'requests'
    useEffect(() => {
        if (activeTab === 'requests') {
            setRequests(storage.get<RequestItem[]>(STORAGE_KEYS.REQUESTS, []));
        }
        if (activeTab === 'users') {
            setUsers(storage.get(STORAGE_KEYS.USERS, []));
        }
    }, [activeTab]);

    const handleConnect = async () => {
        if (!apiKey) return;
        // 至少需要一个地址
        if (!url && !urlInternal && !urlExternal) {
            toast.showToast('请至少填写一个服务器地址', 'warning');
            return;
        }
        
        setStatus('testing');
        const config: EmbyConfig = { 
            serverUrl: url || urlInternal || urlExternal || '', // 向后兼容
            serverUrlInternal: urlInternal || undefined,
            serverUrlExternal: urlExternal || undefined,
            apiKey 
        };
        const result = await validateEmbyConnection(config);
        setStatus(result.success ? 'success' : 'error');
        
        if (result.success) {
            loadLibraries(config);
            if (result.url) {
                toast.showToast(`连接成功！使用地址: ${result.url}`, 'success');
            }
        } else {
            toast.showToast(result.error || '连接失败', 'error');
        }
    };

    const toggleLibrarySelection = (libId: string) => {
        setSelectedLibraryIds(prev => {
            if (prev.includes(libId)) {
                return prev.filter(id => id !== libId);
            } else {
                return [...prev, libId];
            }
        });
    };

    const handleFullSync = async () => {
        setIsSyncing(true);
        setSyncProgress(0);
        
        const newConfig: EmbyConfig = { 
            serverUrl: url || urlInternal || urlExternal || '',
            serverUrlInternal: urlInternal || undefined,
            serverUrlExternal: urlExternal || undefined,
            apiKey 
        };
        
        const { ids } = await fetchEmbyLibrary(newConfig, (current, total, text) => {
            setSyncStatusText(text);
            if (total > 0) {
                setSyncProgress(Math.round((current / total) * 100));
            }
        }, selectedLibraryIds);
        
        setIsSyncing(false);
        onSave(newConfig, ids, syncInterval, selectedLibraryIds);
    };

    const handleSaveNotifications = () => {
        storage.set(STORAGE_KEYS.NOTIFICATIONS, notifyConfig);
        toast.showToast('通知设置已保存', 'success');
    };

    const handleTestTelegram = async () => {
        try {
            await sendTelegramTest(notifyConfig);
            toast.showToast('测试消息已发送，请检查您的 Telegram', 'success');
        } catch (e: any) {
            toast.showToast('发送失败: ' + e.message, 'error');
        }
    };

    const [testingMP, setTestingMP] = useState(false);
    const handleTestMoviePilot = async () => {
        if (!notifyConfig.moviePilotUrl) {
            toast.showToast('请先填写 MoviePilot 地址', 'warning');
            return;
        }
        if (!notifyConfig.moviePilotToken && (!notifyConfig.moviePilotUsername || !notifyConfig.moviePilotPassword)) {
            toast.showToast('请提供 Token 或用户名密码', 'warning');
            return;
        }
        setTestingMP(true);
        try {
            const result = await testMoviePilotConnection(notifyConfig);
            if (result.success) {
                toast.showToast(result.message, 'success');
            } else {
                toast.showToast(result.message, 'error');
            }
        } catch (e: any) {
            toast.showToast('测试失败: ' + e.message, 'error');
        } finally {
            setTestingMP(false);
        }
    };

    const updateRequestStatus = async (index: number, status: 'completed' | 'rejected') => {
        const newRequests = [...requests];
        const request = newRequests[index];
        newRequests[index].status = status;
        
        if (status === 'completed') {
            newRequests[index].completedAt = new Date().toISOString();
            
            // Trigger MoviePilot subscription
            if (notifyConfig.moviePilotUrl && (notifyConfig.moviePilotToken || (notifyConfig.moviePilotUsername && notifyConfig.moviePilotPassword))) {
                toast.showToast('正在推送到 MoviePilot...', 'info');
                try {
                    // Cast request to any to satisfy MediaItem type (RequestItem has compatible fields)
                    const result = await subscribeToMoviePilot(notifyConfig, request as any);
                    if (result.success) {
                        toast.showToast('MoviePilot 订阅成功', 'success');
                        logger.add(`[MoviePilot] 成功订阅: ${request.title}`, 'success');
                    } else {
                        toast.showToast(`MoviePilot 订阅失败: ${result.message}`, 'error');
                        logger.add(`[MoviePilot] 订阅失败 (${request.title}): ${result.message}`, 'error');
                    }
                } catch (e: any) {
                    logger.add(`[MoviePilot] 订阅异常 (${request.title}): ${e.message}`, 'error');
                }
            }
        }
        
        setRequests(newRequests);
        storage.set(STORAGE_KEYS.REQUESTS, newRequests);
        toast.showToast(`请求已标记为 ${status === 'completed' ? '已完成' : '已拒绝'}`, 'success');
    };

    const deleteRequest = (id: number) => {
        if (confirm('确定要删除这条请求吗？')) {
            const newRequests = requests.filter((r) => r.id !== id);
            setRequests(newRequests);
            storage.set(STORAGE_KEYS.REQUESTS, newRequests);
            toast.showToast('请求已删除', 'info');
        }
    };

    const clearRequests = () => {
        if (confirm('确定要清空所有请求吗？')) {
            storage.set(STORAGE_KEYS.REQUESTS, []);
            setRequests([]);
            toast.showToast('所有请求已清空', 'success');
        }
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) {
            toast.showToast('请输入用户名和密码', 'warning');
            return;
        }

        const existingUser = users.find(u => u.username === newUser.username);
        if (existingUser) {
            toast.showToast('用户名已存在', 'error');
            return;
        }

        const user = {
            id: 'user-' + Date.now(),
            username: newUser.username,
            password: newUser.password,
            isAdmin: newUser.isAdmin,
            createdAt: Date.now(),
            type: 'local'
        };

        const updatedUsers = [...users, user];
        storage.set(STORAGE_KEYS.USERS, updatedUsers);
        setUsers(updatedUsers);
        setNewUser({ username: '', password: '', isAdmin: false });
        toast.showToast('用户添加成功', 'success');
    };

    const handleDeleteUser = (userId: string) => {
        if (confirm('确定要删除这个用户吗？')) {
            const updatedUsers = users.filter(u => u.id !== userId);
            storage.set(STORAGE_KEYS.USERS, updatedUsers);
            setUsers(updatedUsers);
            toast.showToast('用户已删除', 'info');
        }
    };

    const handleImportEmbyUsers = async () => {
        if (!currentConfig.serverUrl || !currentConfig.apiKey) {
            toast.showToast('请先配置 Emby 连接', 'error');
            return;
        }
        setIsImportingUsers(true);
        try {
            const embyUsers = await getEmbyUsers(currentConfig);
            if (embyUsers && embyUsers.length > 0) {
                let addedCount = 0;
                const updatedUsers = [...users];
                
                embyUsers.forEach(embyUser => {
                    if (!updatedUsers.find(u => u.username === embyUser.Name)) {
                        updatedUsers.push({
                            id: 'emby-' + embyUser.Id,
                            username: embyUser.Name,
                            password: '', // Emby users authenticate against Emby, no local password needed really, but logic might differ
                            isAdmin: embyUser.Policy?.IsAdministrator || false,
                            createdAt: Date.now(),
                            type: 'emby',
                            embyId: embyUser.Id
                        });
                        addedCount++;
                    }
                });

                if (addedCount > 0) {
                    storage.set(STORAGE_KEYS.USERS, updatedUsers);
                    setUsers(updatedUsers);
                    toast.showToast(`成功导入 ${addedCount} 个 Emby 用户`, 'success');
                } else {
                    toast.showToast('没有发现新用户', 'info');
                }
            } else {
                toast.showToast('未找到 Emby 用户', 'warning');
            }
        } catch (e) {
            toast.showToast('导入失败', 'error');
        } finally {
            setIsImportingUsers(false);
        }
    };
    
    const handleTestTmdb = async () => {
        setTestingTmdb(true);
        try {
            // TMDB 现在通过后端代理，直接测试
            const result = await testTmdbConnection();
            toast.showToast(`TMDB 连接成功！延迟: ${result.latency}ms`, 'success');
        } catch (e: any) {
            toast.showToast('TMDB 连接失败: ' + e.message, 'error');
        } finally {
            setTestingTmdb(false);
        }
    };

    const handleSaveSystem = () => {
        const settings = { scanInterval: syncInterval, websiteTitle, faviconUrl, movieRequestLimit, tvRequestLimit };
        localStorage.setItem('streamhub_settings', JSON.stringify(settings));
        
        storage.set(STORAGE_KEYS.TMDB_CONFIG, {
            apiKey: tmdbApiKey,
            baseUrl: tmdbProxyUrl
        });

        toast.showToast('系统设置已保存 (请刷新页面生效)', 'success');
    };

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        try {
            const info = await checkForUpdates();
            setUpdateInfo(info);
            if (info.hasUpdate) {
                toast.showToast(`发现新版本 v${info.latestVersion}！`, 'success');
            } else {
                toast.showToast('当前已是最新版本', 'success');
            }
        } catch (e) {
            toast.showToast('检查更新失败，请稍后重试', 'error');
        } finally {
            setCheckingUpdate(false);
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " 年前";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " 个月前";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " 天前";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " 小时前";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " 分钟前";
        return Math.floor(seconds) + " 秒前";
    };

    const filteredRequests = requests.filter(req => {
        if (requestFilter === 'all') return true;
        return req.status === requestFilter;
    });

    // Helper to get user request count
    const getUserRequestCount = (username: string) => {
        return requests.filter(r => r.requestedBy === username).length;
    };

    if (!isOpen) return null;

    const TabButton = ({ id, icon, label }: { id: typeof activeTab, icon: React.ReactNode, label: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === id 
                ? (isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') 
                : (isDarkMode ? 'text-zinc-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50')
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-6xl h-[800px] rounded-2xl shadow-2xl overflow-hidden flex ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                
                {/* Sidebar */}
                <div className={`w-64 shrink-0 p-6 border-r flex flex-col ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h2 className={`text-xl font-bold mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <LayoutDashboard className="text-indigo-500" /> 管理面板
                    </h2>
                    
                    <div className="space-y-2 flex-1">
                        <TabButton id="library" icon={<Database size={18} />} label="媒体库设置" />
                        <TabButton id="notifications" icon={<Bell size={18} />} label="通知服务" />
                        <TabButton id="requests" icon={<List size={18} />} label="用户求片" />
                        <TabButton id="users" icon={<Users size={18} />} label="账号管理" />
                        <TabButton id="stats" icon={<BarChart3 size={18} />} label="数据统计" />
                        <TabButton id="system" icon={<Server size={18} />} label="系统设置" />
                    </div>

                    <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                        <div className={`text-center mb-3 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                            <span className="font-mono">v{APP_VERSION}</span>
                        </div>
                        <button onClick={onClose} className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-white/5 text-zinc-500' : 'hover:bg-slate-100 text-slate-500'}`}>
                            关闭面板
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className={`h-16 px-8 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {activeTab === 'library' && '媒体库连接与同步'}
                            {activeTab === 'notifications' && '消息通知配置'}
                            {activeTab === 'requests' && `用户求片管理 (${requests.length})`}
                            {activeTab === 'users' && `用户账号管理 (${users.length})`}
                            {activeTab === 'stats' && '数据统计与分析'}
                            {activeTab === 'system' && '系统设置与个性化'}
                        </h3>
                        <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        
                        {/* Library Tab */}
                        {activeTab === 'library' && (
                            <div className="max-w-xl space-y-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            内网地址（优先）
                                        </label>
                                        <input 
                                            type="text" 
                                            value={urlInternal}
                                            onChange={(e) => setUrlInternal(e.target.value)}
                                            placeholder="http://192.168.1.10:8096"
                                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        />
                                        <p className="text-xs opacity-60">同一局域网内访问，速度更快（可选）</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            外网地址
                                        </label>
                                        <input 
                                            type="text" 
                                            value={urlExternal}
                                            onChange={(e) => setUrlExternal(e.target.value)}
                                            placeholder="https://emby.example.com"
                                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        />
                                        <p className="text-xs opacity-60">公网访问地址（可选）</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            默认地址（向后兼容）
                                        </label>
                                        <input 
                                            type="text" 
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="http://192.168.1.10:8096"
                                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        />
                                        <p className="text-xs opacity-60">如果没有填写内网/外网地址，将使用此地址</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>API 密钥 (API Key)</label>
                                        <input 
                                            type="password" 
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Emby API Key"
                                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            <Clock size={14} />
                                            自动扫描间隔 (分钟)
                                        </label>
                                        <select
                                            value={syncInterval}
                                            onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                                            className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        >
                                            <option value={5}>5 分钟</option>
                                            <option value={10}>10 分钟</option>
                                            <option value={15}>15 分钟（推荐）</option>
                                            <option value={30}>30 分钟</option>
                                            <option value={60}>60 分钟</option>
                                        </select>
                                        <p className="text-xs opacity-60">系统将定期检查 Emby 新增内容</p>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleConnect}
                                            disabled={status === 'testing' || !apiKey || (!url && !urlInternal && !urlExternal)}
                                            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                                                status === 'success' 
                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                                : (isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')
                                            }`}
                                        >
                                            {status === 'testing' ? <Loader2 size={16} className="animate-spin" /> : status === 'success' ? <CheckCircle2 size={16} /> : <Server size={16} />}
                                            {status === 'testing' ? '测试中...' : status === 'success' ? '连接正常' : '测试连接'}
                                        </button>
                                    </div>
                                </div>

                                {/* Library Selection Grid */}
                                {(status === 'success' || libraries.length > 0) && (
                                    <div className="space-y-3">
                                        <h4 className={`font-bold text-sm flex items-center justify-between ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <span>选择要同步的媒体库</span>
                                            <span className="text-xs font-normal opacity-60">
                                                {selectedLibraryIds.length} / {libraries.length} 已选
                                            </span>
                                        </h4>
                                        
                                        {loadingLibraries ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 size={24} className="animate-spin text-indigo-500" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                                {libraries.map(lib => (
                                                    <div 
                                                        key={lib.Id}
                                                        onClick={() => toggleLibrarySelection(lib.Id)}
                                                        className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                                                            selectedLibraryIds.includes(lib.Id)
                                                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                                                            : isDarkMode 
                                                                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="truncate font-medium text-sm">{lib.Name}</span>
                                                        </div>
                                                        {selectedLibraryIds.includes(lib.Id) && <CheckCircle2 size={16} className="shrink-0" />}
                                                    </div>
                                                ))}
                                                {libraries.length === 0 && (
                                                    <p className="col-span-2 text-center text-xs opacity-50 py-2">未找到任何媒体库</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>全量同步</h4>
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                拉取服务器所有媒体索引，用于比对本地状态。
                                            </p>
                                        </div>
                                        <button 
                                            onClick={handleFullSync}
                                            disabled={isSyncing}
                                            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
                                                isSyncing 
                                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed dark:bg-zinc-800' 
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
                                            }`}
                                        >
                                            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                                            {isSyncing ? '同步中...' : '开始同步'}
                                        </button>
                                    </div>
                                    
                                    {isSyncing && (
                                        <div className="space-y-2">
                                            <div className="h-2 w-full bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                                    style={{ width: `${syncProgress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-center opacity-60 font-mono">{syncStatusText}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="max-w-xl space-y-8">
                                <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold mb-1">关于通知服务</p>
                                        <p className="opacity-80">配置后，当有新的求片请求时，系统将自动发送通知到指定渠道。</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <Send size={18} className="text-sky-500" /> Telegram Bot
                                            </h4>
                                            <button 
                                                onClick={handleTestTelegram}
                                                className="text-xs text-sky-500 hover:underline font-medium"
                                            >
                                                发送测试消息
                                            </button>
                                        </div>

                                        {/* Telegram Preview Card */}
                                        <div className="bg-[#7289da]/10 p-4 rounded-xl border border-[#7289da]/20">
                                            <div className="max-w-[280px] mx-auto bg-white dark:bg-[#2b2d31] rounded-lg overflow-hidden shadow-sm text-sm">
                                                <div className="aspect-video bg-gray-200 relative">
                                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                                                        [海报图片]
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <p className="font-bold text-[#2b2d31] dark:text-gray-100">名称: 铁血战士: 杀戮之王 (2025)</p>
                                                    <p className="text-gray-600 dark:text-gray-300">用户: admin 给您发来一条求片信息</p>
                                                    <div className="text-blue-500">
                                                        🏷️ 标签: #用户提交求片<br/>
                                                        🗂️ 类型: #剧集
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                                                        简介: 故事跨越时空，从维京时代到幕府日本至二战时期...
                                                    </p>
                                                </div>
                                                <div className="bg-[#4b5563]/10 p-2 text-center">
                                                    <span className="text-xs font-bold text-gray-500">TMDB链接 ↗</span>
                                                </div>
                                            </div>
                                            <p className="text-center text-xs mt-2 opacity-60">消息预览样式</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Bot Token</label>
                                            <input 
                                                type="text" 
                                                value={notifyConfig.telegramBotToken || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, telegramBotToken: e.target.value})}
                                                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Chat ID</label>
                                            <input 
                                                type="text" 
                                                value={notifyConfig.telegramChatId || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, telegramChatId: e.target.value})}
                                                placeholder="-100123456789"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Download size={18} className="text-emerald-500" /> MoviePilot 自动化集成
                                        </h4>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>MoviePilot 地址 (带端口)</label>
                                            <input 
                                                type="text" 
                                                value={notifyConfig.moviePilotUrl || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotUrl: e.target.value})}
                                                placeholder="http://192.168.1.10:3000"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>API Token (Authorization)</label>
                                            <input 
                                                type="password" 
                                                value={notifyConfig.moviePilotToken || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotToken: e.target.value})}
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                            <p className="text-xs opacity-60">
                                                如果你不需要自动化下载，请留空。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <div className="flex items-center justify-between">
                                            <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <Download size={18} className="text-purple-500" /> MoviePilot 对接
                                            </h4>
                                            <button 
                                                onClick={handleTestMoviePilot}
                                                disabled={testingMP || !notifyConfig.moviePilotUrl || (!notifyConfig.moviePilotToken && (!notifyConfig.moviePilotUsername || !notifyConfig.moviePilotPassword))}
                                                className="text-xs text-purple-500 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                            >
                                                {testingMP ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                测试连接
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>MoviePilot 地址</label>
                                            <input 
                                                type="text" 
                                                value={notifyConfig.moviePilotUrl || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotUrl: e.target.value})}
                                                placeholder="https://mp.example.com:7777"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                认证方式
                                            </label>
                                            <p className="text-xs opacity-60">
                                                推荐：使用用户名密码，系统会自动登录获取 Token
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>用户名</label>
                                                <input 
                                                    type="text" 
                                                    value={notifyConfig.moviePilotUsername || ''}
                                                    onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotUsername: e.target.value})}
                                                    placeholder="admin"
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>密码</label>
                                                <input 
                                                    type="password" 
                                                    value={notifyConfig.moviePilotPassword || ''}
                                                    onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotPassword: e.target.value})}
                                                    placeholder="••••••"
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                或直接填写 JWT Token（高级）
                                            </label>
                                            <input 
                                                type="password" 
                                                value={notifyConfig.moviePilotToken || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotToken: e.target.value})}
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                            <p className="text-xs opacity-60">
                                                如果填写了用户名密码，此项可留空
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                订阅用户名（可选）
                                            </label>
                                            <input 
                                                type="text" 
                                                value={notifyConfig.moviePilotSubscribeUser || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, moviePilotSubscribeUser: e.target.value})}
                                                placeholder="留空则使用登录用户"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                            <p className="text-xs opacity-60">
                                                指定订阅记录到哪个 MoviePilot 用户名下
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Mail size={18} className="text-orange-500" /> 邮件通知 (SMTP)
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>SMTP 服务器</label>
                                                <input 
                                                    type="text" 
                                                    value={notifyConfig.emailSmtpServer || ''}
                                                    onChange={(e) => setNotifyConfig({...notifyConfig, emailSmtpServer: e.target.value})}
                                                    placeholder="smtp.gmail.com"
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>端口</label>
                                                <input 
                                                    type="number" 
                                                    value={notifyConfig.emailSmtpPort || ''}
                                                    onChange={(e) => setNotifyConfig({...notifyConfig, emailSmtpPort: parseInt(e.target.value)})}
                                                    placeholder="587"
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>发件人邮箱</label>
                                            <input 
                                                type="email" 
                                                value={notifyConfig.emailSender || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, emailSender: e.target.value})}
                                                placeholder="sender@example.com"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>密码 / 应用专用密码</label>
                                            <input 
                                                type="password" 
                                                value={notifyConfig.emailPassword || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, emailPassword: e.target.value})}
                                                placeholder="••••••••"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>接收通知邮箱</label>
                                            <input 
                                                type="email" 
                                                value={notifyConfig.emailRecipient || ''}
                                                onChange={(e) => setNotifyConfig({...notifyConfig, emailRecipient: e.target.value})}
                                                placeholder="admin@example.com"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <button 
                                            onClick={handleSaveNotifications}
                                            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            <Save size={18} /> 保存配置
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Requests Tab */}
                        {activeTab === 'requests' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`flex p-1 rounded-lg border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                                        {(['all', 'pending', 'completed', 'rejected'] as const).map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => setRequestFilter(filter)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                                                    requestFilter === filter 
                                                    ? (isDarkMode ? 'bg-zinc-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') 
                                                    : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600')
                                                }`}
                                            >
                                                {filter === 'all' ? '全部' : filter === 'pending' ? '待处理' : filter === 'completed' ? '已完成' : '已拒绝'}
                                            </button>
                                        ))}
                                    </div>

                                    {requests.length > 0 && (
                                        <button onClick={clearRequests} className="text-xs text-red-500 flex items-center gap-1 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 size={14} /> 清空记录
                                        </button>
                                    )}
                                </div>

                                {filteredRequests.length === 0 ? (
                                    <div className="text-center py-20 opacity-50">
                                        <List size={48} className="mx-auto mb-4" />
                                        <p>暂无相关记录</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {filteredRequests.map((req) => (
                                            <div key={req.id} className={`group relative rounded-xl overflow-hidden border transition-all hover:shadow-lg ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                                
                                                {/* Banner Background */}
                                                {req.backdropUrl && (
                                                    <div className="absolute inset-0 h-32 opacity-20 transition-opacity group-hover:opacity-30">
                                                        <img src={`https://image.tmdb.org/t/p/w500${req.backdropUrl}`} className="w-full h-full object-cover" />
                                                        <div className={`absolute inset-0 bg-gradient-to-b ${isDarkMode ? 'from-transparent to-zinc-900' : 'from-transparent to-white'}`}></div>
                                                    </div>
                                                )}

                                                <div className="relative p-4 flex gap-4 items-start">
                                                    {/* Poster */}
                                                    <div className="w-16 aspect-[2/3] bg-gray-200 rounded-lg shrink-0 overflow-hidden shadow-lg ring-1 ring-black/10">
                                                        {req.posterUrl ? (
                                                            <img src={`https://image.tmdb.org/t/p/w200${req.posterUrl}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                                                <List size={20} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className={`font-bold text-lg truncate pr-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                                    {req.title} <span className="text-sm font-normal opacity-60">({req.year})</span>
                                                                </h4>
                                                                
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                                        req.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                                        req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                                        'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                                    }`}>
                                                                        {req.status === 'completed' ? '已完成' : req.status === 'rejected' ? '已拒绝' : '待处理'}
                                                                    </span>
                                                                    
                                                                    {req.mediaType === 'tv' && (
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}`}>
                                                                            TV Series
                                                                        </span>
                                                                    )}

                                                                    {req.resolutionPreference && req.resolutionPreference !== 'Any' && (
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20`}>
                                                                            {req.resolutionPreference}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {req.notes && (
                                                                    <div className={`mt-2 text-xs p-2 rounded flex items-start gap-2 ${isDarkMode ? 'bg-white/5 text-zinc-300' : 'bg-slate-50 text-slate-600'}`}>
                                                                        <MessageSquare size={12} className="shrink-0 mt-0.5" />
                                                                        <span>{req.notes}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {req.status === 'pending' && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => updateRequestStatus(requests.findIndex(r => r.id === req.id), 'completed')}
                                                                            className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
                                                                            title="标记为已完成"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => updateRequestStatus(requests.findIndex(r => r.id === req.id), 'rejected')}
                                                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                                            title="拒绝请求"
                                                                        >
                                                                            <XCircle size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button 
                                                                    onClick={() => deleteRequest(req.id)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-500 hover:text-red-500' : 'hover:bg-slate-100 text-slate-400 hover:text-red-500'}`}
                                                                    title="删除记录"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Footer info */}
                                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-[#18181b]">
                                                                    {req.requestedBy?.[0]?.toUpperCase() || 'U'}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                                        {req.requestedBy}
                                                                    </span>
                                                                    <span className="text-[10px] opacity-50">
                                                                        {timeAgo(req.requestDate)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            
                                                            {req.completedAt && (
                                                                <div className="text-[10px] opacity-50 flex items-center gap-1">
                                                                    <CheckCircle2 size={10} />
                                                                    完成于 {new Date(req.completedAt).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>用户清单</h4>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => setActiveTab('users')} // Just for refresh
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            刷新列表
                                        </button>
                                        <button 
                                            onClick={handleImportEmbyUsers}
                                            disabled={isImportingUsers}
                                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            {isImportingUsers ? <Loader2 size={16} className="animate-spin"/> : <Download size={16} />}
                                            导入 Emby 用户
                                        </button>
                                    </div>
                                </div>

                                {/* User Table */}
                                <div className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'}`}>
                                    <table className="w-full text-left text-sm">
                                        <thead className={`${isDarkMode ? 'bg-white/5 text-zinc-400' : 'bg-slate-50 text-slate-500'}`}>
                                            <tr>
                                                <th className="p-4 font-medium">用户</th>
                                                <th className="p-4 font-medium">请求数</th>
                                                <th className="p-4 font-medium">类型</th>
                                                <th className="p-4 font-medium">角色</th>
                                                <th className="p-4 font-medium">加入时间</th>
                                                <th className="p-4 font-medium text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                                            {users.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center opacity-50">暂无用户</td>
                                                </tr>
                                            ) : (
                                                users.map((user) => (
                                                    <tr key={user.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.isAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {user.username[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.username}</div>
                                                                    <div className="text-xs opacity-50">{user.type === 'emby' ? '已连接到 Emby' : '本地账户'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono">
                                                            {getUserRequestCount(user.username)}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                                user.type === 'emby' 
                                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                            }`}>
                                                                {user.type === 'emby' ? 'Emby 用户' : '本地用户'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {user.isAdmin ? (
                                                                <span className="text-indigo-500 font-bold flex items-center gap-1">
                                                                    <ShieldCheck size={14} /> 管理员
                                                                </span>
                                                            ) : (
                                                                <span className="opacity-60">访客</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-xs opacity-60 font-mono">
                                                            {new Date(user.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button 
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="删除用户"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-6 rounded-2xl border flex items-center justify-between gap-6 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-500/10">
                                    <div>
                                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>快速添加本地用户</h4>
                                        <p className="text-xs opacity-60 mt-1">创建不依赖 Emby 的本地账号</p>
                                    </div>
                                    <form onSubmit={handleAddUser} className="flex gap-3 items-center">
                                        <input 
                                            type="text" 
                                            placeholder="用户名"
                                            value={newUser.username}
                                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                                            className={`px-3 py-2 rounded-lg border text-sm w-32 ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="密码"
                                            value={newUser.password}
                                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                                            className={`px-3 py-2 rounded-lg border text-sm w-32 ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none whitespace-nowrap">
                                            <input 
                                                type="checkbox" 
                                                checked={newUser.isAdmin}
                                                onChange={e => setNewUser({...newUser, isAdmin: e.target.checked})}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-600'}>管理员</span>
                                        </label>
                                        <button 
                                            type="submit"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            添加
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Stats Tab */}
                        {activeTab === 'stats' && (
                            <div className="space-y-8">
                                {/* Overview Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                                <List size={18} className="text-indigo-500" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>总求片</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{requests.length}</div>
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                                                <CheckCircle2 size={18} className="text-emerald-500" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>已完成</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{requests.filter(r => r.status === 'completed').length}</div>
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                                                <Clock size={18} className="text-amber-500" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>待处理</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{requests.filter(r => r.status === 'pending').length}</div>
                                    </div>
                                    
                                    <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                                <Users size={18} className="text-blue-500" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>活跃用户</span>
                                        </div>
                                        <div className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{new Set(requests.map(r => r.requestedBy)).size}</div>
                                    </div>
                                </div>

                                {/* User Activity Ranking */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <h4 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <TrendingUp size={18} className="text-indigo-500" /> 用户活跃度排行
                                    </h4>
                                    <div className="space-y-3">
                                        {(() => {
                                            const userStats: Record<string, number> = requests.reduce((acc, r) => {
                                                acc[r.requestedBy] = (acc[r.requestedBy] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>);
                                            const sortedUsers = Object.entries(userStats)
                                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                                .slice(0, 10);
                                            const maxCount = (sortedUsers[0]?.[1] as number) || 1;
                                            
                                            if (sortedUsers.length === 0) {
                                                return <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>暂无数据</p>;
                                            }
                                            
                                            return sortedUsers.map(([user, count], idx) => (
                                                <div key={user} className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        idx === 0 ? 'bg-yellow-500 text-white' :
                                                        idx === 1 ? 'bg-slate-400 text-white' :
                                                        idx === 2 ? 'bg-amber-600 text-white' :
                                                        isDarkMode ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className={`w-24 text-sm font-medium truncate ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>{user}</span>
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-700">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${((count as number) / maxCount) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-mono font-bold ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{count}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* Popular Requests */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <h4 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Film size={18} className="text-blue-500" /> 热门电影请求
                                        </h4>
                                        <div className="space-y-2">
                                            {(() => {
                                                const movieRequests = requests.filter(r => r.mediaType === 'movie');
                                                const movieCounts = movieRequests.reduce((acc, r) => {
                                                    const key = `${r.id}-${r.title}`;
                                                    if (!acc[key]) acc[key] = { title: r.title, year: r.year, count: 0, posterUrl: r.posterUrl };
                                                    acc[key].count++;
                                                    return acc;
                                                }, {} as Record<string, any>);
                                                const topMovies = Object.values(movieCounts).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
                                                
                                                if (topMovies.length === 0) {
                                                    return <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>暂无电影请求</p>;
                                                }
                                                
                                                return topMovies.map((movie: any, idx) => (
                                                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                                        <div className="w-8 h-12 rounded overflow-hidden bg-slate-200 dark:bg-zinc-700 shrink-0">
                                                            {movie.posterUrl && <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{movie.title}</p>
                                                            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{movie.year}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                                            {movie.count}次
                                                        </span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                    
                                    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                        <h4 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <MonitorPlay size={18} className="text-purple-500" /> 热门剧集请求
                                        </h4>
                                        <div className="space-y-2">
                                            {(() => {
                                                const tvRequests = requests.filter(r => r.mediaType === 'tv');
                                                const tvCounts = tvRequests.reduce((acc, r) => {
                                                    const key = `${r.id}-${r.title}`;
                                                    if (!acc[key]) acc[key] = { title: r.title, year: r.year, count: 0, posterUrl: r.posterUrl };
                                                    acc[key].count++;
                                                    return acc;
                                                }, {} as Record<string, any>);
                                                const topTvs = Object.values(tvCounts).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
                                                
                                                if (topTvs.length === 0) {
                                                    return <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>暂无剧集请求</p>;
                                                }
                                                
                                                return topTvs.map((tv: any, idx) => (
                                                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                                        <div className="w-8 h-12 rounded overflow-hidden bg-slate-200 dark:bg-zinc-700 shrink-0">
                                                            {tv.posterUrl && <img src={tv.posterUrl} alt="" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{tv.title}</p>
                                                            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{tv.year}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                                            {tv.count}次
                                                        </span>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Request Timeline */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <h4 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <Activity size={18} className="text-emerald-500" /> 最近7天求片趋势
                                    </h4>
                                    <div className="flex items-end justify-between gap-2 h-32">
                                        {(() => {
                                            const last7Days = Array.from({ length: 7 }, (_, i) => {
                                                const date = new Date();
                                                date.setDate(date.getDate() - (6 - i));
                                                return date.toISOString().split('T')[0];
                                            });
                                            
                                            const dayCounts = last7Days.map(day => {
                                                return requests.filter(r => r.requestDate?.startsWith(day)).length;
                                            });
                                            
                                            const maxDayCount = Math.max(...dayCounts, 1);
                                            
                                            return last7Days.map((day, idx) => (
                                                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                                    <div className="w-full flex justify-center">
                                                        <div 
                                                            className={`w-full max-w-8 rounded-t-lg transition-all duration-500 ${
                                                                isDarkMode ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-emerald-500 to-emerald-300'
                                                            }`}
                                                            style={{ height: `${Math.max((dayCounts[idx] / maxDayCount) * 100, 8)}px` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] font-mono ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                        {new Date(day).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>

                                {/* Type Distribution */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                    <h4 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <BarChart3 size={18} className="text-pink-500" /> 类型分布
                                    </h4>
                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-24 h-24">
                                                <svg className="w-full h-full transform -rotate-90">
                                                    <circle cx="48" cy="48" r="40" fill="none" stroke={isDarkMode ? '#27272a' : '#e2e8f0'} strokeWidth="12" />
                                                    <circle 
                                                        cx="48" cy="48" r="40" fill="none" 
                                                        stroke="#3b82f6" strokeWidth="12"
                                                        strokeDasharray={`${(requests.filter(r => r.mediaType === 'movie').length / Math.max(requests.length, 1)) * 251.2} 251.2`}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{requests.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                    <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>电影</span>
                                                </div>
                                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {requests.filter(r => r.mediaType === 'movie').length} ({requests.length > 0 ? Math.round(requests.filter(r => r.mediaType === 'movie').length / requests.length * 100) : 0}%)
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                                    <span className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-slate-600'}`}>剧集</span>
                                                </div>
                                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {requests.filter(r => r.mediaType === 'tv').length} ({requests.length > 0 ? Math.round(requests.filter(r => r.mediaType === 'tv').length / requests.length * 100) : 0}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                         {/* System Tab (added back missing from my mind) */}
                        {activeTab === 'system' && (
                             <div className="max-w-xl space-y-8">
                                {/* Version Info */}
                                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>StreamHub Monitor</h4>
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                前端: v{APP_VERSION} | 后端: {serverVersion}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-2xl font-bold font-mono ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                v{serverVersion}
                                            </div>
                                            <button
                                                onClick={handleCheckUpdate}
                                                disabled={checkingUpdate}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                                                    isDarkMode 
                                                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                                                    : 'bg-white hover:bg-slate-50 text-slate-700 shadow-sm border border-slate-200'
                                                }`}
                                            >
                                                {checkingUpdate ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                                                检查更新
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {updateInfo && updateInfo.hasUpdate && (
                                        <div className={`mt-4 p-3 rounded-lg text-sm ${isDarkMode ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold flex items-center gap-2">
                                                    <CheckCircle2 size={16} /> 发现新版本: v{updateInfo.latestVersion}
                                                </span>
                                                <a 
                                                    href={updateInfo.downloadUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="underline opacity-80 hover:opacity-100"
                                                >
                                                    前往下载
                                                </a>
                                            </div>
                                            <div className="opacity-80 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                                                {updateInfo.releaseNotes}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>TMDB 设置</h4>
                                        
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                <Database size={14} /> API Key
                                            </label>
                                            <input
                                                type="text"
                                                value={tmdbApiKey}
                                                onChange={(e) => setTmdbApiKey(e.target.value)}
                                                placeholder={TMDB_API_KEY || "Enter TMDB API Key"}
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                <Server size={14} /> API Base URL / Proxy
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={tmdbProxyUrl}
                                                    onChange={(e) => setTmdbProxyUrl(e.target.value)}
                                                    placeholder={TMDB_BASE_URL}
                                                    className={`flex-1 p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                                <button
                                                    onClick={handleTestTmdb}
                                                    disabled={testingTmdb}
                                                    className={`px-4 rounded-xl font-bold text-sm transition-colors ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                                >
                                                    {testingTmdb ? <Loader2 size={18} className="animate-spin" /> : '测试'}
                                                </button>
                                            </div>
                                            <p className="text-xs opacity-60">留空则使用默认值。如需使用代理，请输入完整的 URL (例如: https://api.tmdb.org/3)</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>个性化设置</h4>
                                        
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                <MonitorPlay size={14} /> 网站标题
                                            </label>
                                            <input
                                                type="text"
                                                value={websiteTitle}
                                                onChange={(e) => setWebsiteTitle(e.target.value)}
                                                placeholder="StreamHub - Global Media Monitor"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                <Film size={14} /> 网站图标 URL
                                            </label>
                                            <input
                                                type="text"
                                                value={faviconUrl}
                                                onChange={(e) => setFaviconUrl(e.target.value)}
                                                placeholder="/favicon.svg"
                                                className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 space-y-4">
                                        <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <AlertOctagon size={18} className="text-red-500" /> 求片限制策略
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                    🎬 电影限额 (0 为不限)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={movieRequestLimit}
                                                    onChange={(e) => setMovieRequestLimit(parseInt(e.target.value) || 0)}
                                                    min={0}
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                    📺 剧集限额 (0 为不限)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={tvRequestLimit}
                                                    onChange={(e) => setTvRequestLimit(parseInt(e.target.value) || 0)}
                                                    min={0}
                                                    className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs opacity-60">仅针对普通用户生效，管理员不受限制。电影和剧集分开计算配额。</p>
                                    </div>

                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <button
                                            onClick={handleSaveSystem}
                                            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            <Save size={18} /> 保存所有设置
                                        </button>
                                    </div>
                                </div>
                             </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
