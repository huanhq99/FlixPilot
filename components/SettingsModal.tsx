import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Server, CheckCircle2, AlertCircle, Loader2, Database, List, Trash2, Bell, Send, LayoutDashboard, Mail, Check, XCircle, Settings, Download, Upload, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmbyConfig, NotificationConfig } from '../types';
import { validateEmbyConnection, fetchEmbyLibrary } from '../services/embyService';
import { sendTelegramTest } from '../services/notificationService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: EmbyConfig, library?: Set<string>) => void;
    onSystemSettingsChange?: (settings: any) => void;
    currentConfig: EmbyConfig;
    isDarkMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, onSystemSettingsChange, currentConfig, isDarkMode }) => {
    const [activeTab, setActiveTab] = useState<'library' | 'notifications' | 'requests' | 'users' | 'system'>('library');
    
    // Library State
    const [url, setUrl] = useState(currentConfig.serverUrl);
    const [apiKey, setApiKey] = useState(currentConfig.apiKey);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStatusText, setSyncStatusText] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Notification State
    const [notifyConfig, setNotifyConfig] = useState<NotificationConfig>({});

    // Requests State
    const [requests, setRequests] = useState<any[]>([]);

    // System Settings
    const [scanInterval, setScanInterval] = useState(15);

    // Users State
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', isAdmin: false });

    useEffect(() => {
        if (isOpen) {
            setUrl(currentConfig.serverUrl);
            setApiKey(currentConfig.apiKey);
            setStatus('idle');
            setSyncProgress(0);
            setSyncStatusText('');
            
            // Load requests
            try {
                const savedReqs = localStorage.getItem('requests');
                if (savedReqs) setRequests(JSON.parse(savedReqs));
            } catch (e) { setRequests([]); }

            // Load notifications
            try {
                const savedNotify = localStorage.getItem('streamhub_notifications');
                if (savedNotify) setNotifyConfig(JSON.parse(savedNotify));
            } catch (e) { setNotifyConfig({}); }

            // Load system settings
            try {
                const savedSettings = localStorage.getItem('streamhub_settings');
                if (savedSettings) {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.scanInterval) setScanInterval(parsed.scanInterval);
                }
            } catch (e) { /* ignore */ }

            // Load users
            try {
                const savedUsers = localStorage.getItem('streamhub_users');
                if (savedUsers) setUsers(JSON.parse(savedUsers));
            } catch (e) { setUsers([]); }
        }
    }, [isOpen, currentConfig]);

    // Refresh requests when tab changes to 'requests'
    useEffect(() => {
        if (activeTab === 'requests') {
            try {
                const savedReqs = localStorage.getItem('requests');
                if (savedReqs) setRequests(JSON.parse(savedReqs));
            } catch (e) { setRequests([]); }
        }
    }, [activeTab]);

    const handleConnect = async () => {
        if (!url || !apiKey) return;
        setStatus('testing');
        const isValid = await validateEmbyConnection({ serverUrl: url, apiKey });
        setStatus(isValid ? 'success' : 'error');
        if (isValid) toast.success('连接成功');
        else toast.error('连接失败，请检查配置');
    };

    const handleFullSync = async () => {
        setIsSyncing(true);
        setSyncProgress(0);
        
        const newConfig = { serverUrl: url, apiKey };
        
        try {
            const { ids } = await fetchEmbyLibrary(newConfig, (current, total, text) => {
                setSyncStatusText(text);
                if (total > 0) {
                    setSyncProgress(Math.round((current / total) * 100));
                }
            });
            
            onSave(newConfig, ids);
            toast.success('媒体库同步完成');
        } catch (e) {
            toast.error('同步失败');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSaveNotifications = () => {
        localStorage.setItem('streamhub_notifications', JSON.stringify(notifyConfig));
        toast.success('通知设置已保存');
    };

    const handleSaveSystem = () => {
        const settings = { scanInterval };
        localStorage.setItem('streamhub_settings', JSON.stringify(settings));
        if (onSystemSettingsChange) onSystemSettingsChange(settings);
        toast.success('系统设置已保存');
    };

    const handleTestTelegram = async () => {
        const loadingToast = toast.loading('正在发送测试消息...');
        try {
            await sendTelegramTest(notifyConfig);
            toast.dismiss(loadingToast);
            toast.success('测试消息已发送，请检查您的 Telegram');
        } catch (e: any) {
            toast.dismiss(loadingToast);
            toast.error('发送失败: ' + e.message);
        }
    };

    const updateRequestStatus = (index: number, status: 'completed' | 'rejected') => {
        const newRequests = [...requests];
        newRequests[index].status = status;
        if (status === 'completed') newRequests[index].completedAt = new Date().toISOString();
        setRequests(newRequests);
        localStorage.setItem('requests', JSON.stringify(newRequests));
        toast.success(status === 'completed' ? '已标记为完成' : '已拒绝该请求');
    };

    const deleteRequest = (index: number) => {
        if (confirm('确定要删除这条请求吗？')) {
            const newRequests = requests.filter((_, i) => i !== index);
            setRequests(newRequests);
            localStorage.setItem('requests', JSON.stringify(newRequests));
            toast.success('请求已删除');
        }
    };

    const clearRequests = () => {
        if (confirm('确定要清空所有请求吗？')) {
            localStorage.removeItem('requests');
            setRequests([]);
            toast.success('所有请求已清空');
        }
    };

    const exportData = () => {
        const data = {
            auth: localStorage.getItem('streamhub_auth'),
            embyConfig: localStorage.getItem('embyConfig'),
            notifications: localStorage.getItem('streamhub_notifications'),
            settings: localStorage.getItem('streamhub_settings'),
            requests: localStorage.getItem('requests'),
            embyLibrary: localStorage.getItem('emby_library_cache') // Optional, might be huge
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamhub-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('备份已下载');
    };

    const importDataInputRef = useRef<HTMLInputElement>(null);
    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.auth) localStorage.setItem('streamhub_auth', data.auth);
                if (data.embyConfig) localStorage.setItem('embyConfig', data.embyConfig);
                if (data.notifications) localStorage.setItem('streamhub_notifications', data.notifications);
                if (data.settings) localStorage.setItem('streamhub_settings', data.settings);
                if (data.requests) localStorage.setItem('requests', data.requests);
                if (data.users) localStorage.setItem('streamhub_users', data.users);
                // Skip library cache import as it might be stale or huge, better to resync
                
                toast.success('数据恢复成功，页面即将刷新');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                toast.error('导入失败：文件格式错误');
            }
        };
        reader.readAsText(file);
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password) {
            toast.error('请输入用户名和密码');
            return;
        }
        
        if (users.some(u => u.username === newUser.username)) {
            toast.error('用户名已存在');
            return;
        }

        const user = {
            id: 'user-' + Date.now(),
            username: newUser.username,
            password: newUser.password,
            isAdmin: newUser.isAdmin,
            createdAt: Date.now()
        };

        const updatedUsers = [...users, user];
        setUsers(updatedUsers);
        localStorage.setItem('streamhub_users', JSON.stringify(updatedUsers));
        setNewUser({ username: '', password: '', isAdmin: false });
        toast.success('用户创建成功');
    };

    const handleDeleteUser = (userId: string) => {
        if (users.length <= 1) {
            toast.error('无法删除最后一个用户');
            return;
        }
        
        if (confirm('确定要删除该用户吗？')) {
            const updatedUsers = users.filter(u => u.id !== userId);
            setUsers(updatedUsers);
            localStorage.setItem('streamhub_users', JSON.stringify(updatedUsers));
            toast.success('用户已删除');
        }
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
            <span className="truncate">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-5xl h-[85vh] max-h-[800px] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                
                {/* Sidebar */}
                <div className={`w-full md:w-64 shrink-0 p-4 md:p-6 border-b md:border-b-0 md:border-r flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible scrollbar-hide ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h2 className={`hidden md:flex text-xl font-bold mb-8 items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <LayoutDashboard className="text-indigo-500" /> 管理面板
                    </h2>
                    
                    <div className="flex md:flex-col gap-2 flex-1">
                        <TabButton id="library" icon={<Database size={18} />} label="媒体库" />
                        <TabButton id="notifications" icon={<Bell size={18} />} label="通知服务" />
                        <TabButton id="requests" icon={<List size={18} />} label="求片管理" />
                        <TabButton id="users" icon={<Users size={18} />} label="用户管理" />
                        <TabButton id="system" icon={<Settings size={18} />} label="系统设置" />
                    </div>

                    <div className={`hidden md:block mt-auto pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                        <button onClick={onClose} className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'hover:bg-white/5 text-zinc-500' : 'hover:bg-slate-100 text-slate-500'}`}>
                            关闭面板
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Header */}
                    <div className={`h-14 md:h-16 px-4 md:px-8 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <h3 className={`font-bold text-base md:text-lg truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {activeTab === 'library' && '媒体库连接与同步'}
                            {activeTab === 'notifications' && '消息通知配置'}
                            {activeTab === 'requests' && `用户求片管理 (${requests.length})`}
                            {activeTab === 'users' && `用户账号管理 (${users.length})`}
                            {activeTab === 'system' && '系统通用设置'}
                        </h3>
                        <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        
                        {/* Library Tab */}
                        {activeTab === 'library' && (
                            <div className="max-w-xl space-y-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>服务器地址</label>
                                        <input 
                                            type="text" 
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="http://192.168.1.10:8096"
                                            className={`w-full p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        />
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
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleConnect}
                                            disabled={status === 'testing' || !url || !apiKey}
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
                                            <Mail size={18} className="text-orange-500" /> 邮件通知 (SMTP)
                                        </h4>
                                        {/* Email config omitted for brevity, but structure remains same */}
                                        <p className={`text-sm opacity-60 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>暂未开放邮件通知配置UI，请等待后续更新。</p>
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
                                {requests.length === 0 ? (
                                    <div className="text-center py-20 opacity-50">
                                        <List size={48} className="mx-auto mb-4" />
                                        <p>暂无求片记录</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-end mb-4">
                                            <button onClick={clearRequests} className="text-xs text-red-500 flex items-center gap-1 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                <Trash2 size={14} /> 清空所有记录
                                            </button>
                                        </div>
                                        <div className="grid gap-4">
                                            {requests.map((req, idx) => (
                                                <div key={idx} className={`p-4 rounded-xl border flex gap-4 transition-all hover:shadow-md ${isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                                                    <div className="w-16 aspect-[2/3] bg-gray-200 rounded-lg shrink-0 overflow-hidden shadow-sm">
                                                        {req.posterUrl && <img src={`https://image.tmdb.org/t/p/w200${req.posterUrl}`} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className={`font-bold text-lg truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{req.title}</h4>
                                                            <div className="flex items-center gap-2">
                                                                {req.status === 'pending' ? (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => updateRequestStatus(idx, 'completed')}
                                                                            className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors"
                                                                            title="标记为已完成"
                                                                        >
                                                                            <Check size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => updateRequestStatus(idx, 'rejected')}
                                                                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                                            title="拒绝请求"
                                                                        >
                                                                            <XCircle size={16} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${req.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                        {req.status === 'completed' ? '已完成' : '已拒绝'}
                                                                    </span>
                                                                )}
                                                                <button 
                                                                    onClick={() => deleteRequest(idx)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}
                                                                    title="删除记录"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs opacity-60 mt-1 mb-3">
                                                            <span>{req.year}</span>
                                                            <span>•</span>
                                                            <span>{req.mediaType === 'movie' ? '电影' : '剧集'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-200 dark:border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                    {req.requestedBy?.[0]?.toUpperCase() || 'U'}
                                                                </div>
                                                                <span className="text-xs font-medium opacity-80">{req.requestedBy}</span>
                                                            </div>
                                                            <span className="text-[10px] opacity-40 font-mono">
                                                                {new Date(req.requestDate).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="max-w-xl space-y-8">
                                <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                                    <Users size={20} className="shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold mb-1">用户管理</p>
                                        <p className="opacity-80">管理系统登录账号。管理员拥有所有权限，普通用户仅可浏览和提交求片。</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>添加新用户</h4>
                                    <form onSubmit={handleAddUser} className="grid gap-4 sm:grid-cols-12 bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text" 
                                                placeholder="用户名"
                                                value={newUser.username}
                                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <input 
                                                type="text" 
                                                placeholder="密码"
                                                value={newUser.password}
                                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                                className={`w-full px-3 py-2 rounded-lg border text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center">
                                            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={newUser.isAdmin}
                                                    onChange={e => setNewUser({...newUser, isAdmin: e.target.checked})}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className={isDarkMode ? 'text-zinc-300' : 'text-slate-600'}>管理员</span>
                                            </label>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <button 
                                                type="submit"
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                添加
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-4">
                                    <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>用户列表</h4>
                                    <div className="space-y-2">
                                        {users.map((user) => (
                                            <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.isAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        {user.username[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            {user.username}
                                                            {user.isAdmin && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-bold">ADMIN</span>}
                                                        </div>
                                                        <div className={`text-[10px] opacity-50 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                            创建于: {new Date(user.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="删除用户"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* System Tab */}
                        {activeTab === 'system' && (
                            <div className="max-w-xl space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            <RefreshCw size={14} /> 自动扫描间隔 (分钟)
                                        </label>
                                        <p className={`text-xs mb-2 ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                            系统后台定期扫描 Emby 服务器新入库媒体的时间间隔。
                                        </p>
                                        <div className="flex gap-4">
                                            <input 
                                                type="number" 
                                                min="1"
                                                max="1440"
                                                value={scanInterval}
                                                onChange={(e) => setScanInterval(parseInt(e.target.value) || 15)}
                                                className={`w-32 p-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                            />
                                            <button 
                                                onClick={handleSaveSystem}
                                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                                            >
                                                保存设置
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10 space-y-4">
                                        <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            <Database size={18} className="text-blue-500" /> 数据备份与恢复
                                        </h4>
                                        <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                            导出所有配置（包括密钥、通知设置、求片记录等）到本地 JSON 文件。
                                        </p>
                                        
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={exportData}
                                                className={`flex-1 py-3 rounded-xl border border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'border-zinc-700 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <Download size={16} /> 导出备份
                                            </button>
                                            <button 
                                                onClick={() => importDataInputRef.current?.click()}
                                                className={`flex-1 py-3 rounded-xl border border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-all ${isDarkMode ? 'border-zinc-700 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <Upload size={16} /> 恢复数据
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={importDataInputRef} 
                                                className="hidden" 
                                                accept=".json" 
                                                onChange={handleImportData}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                                        <div className={`text-center text-xs ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                                            <p>StreamHub Monitor v1.0.0</p>
                                            <p className="mt-1">Built with React, Vite & Love</p>
                                        </div>
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
