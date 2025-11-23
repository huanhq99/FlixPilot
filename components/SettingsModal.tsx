import React, { useState, useEffect } from 'react';
import { X, Save, Server, CheckCircle2, AlertCircle, Loader2, User, ShieldCheck, Database, List, Trash2, Bell, Send, MessageSquare, LayoutDashboard, Users, Mail, Check, XCircle } from 'lucide-react';
import { EmbyConfig, EmbyUser, NotificationConfig } from '../types';
import { validateEmbyConnection, getEmbyUsers, fetchEmbyLibrary } from '../services/embyService';
import { sendTelegramTest, sendTelegramNotification } from '../services/notificationService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: EmbyConfig, library?: Set<string>) => void;
    currentConfig: EmbyConfig;
    isDarkMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig, isDarkMode }) => {
    const [activeTab, setActiveTab] = useState<'library' | 'notifications' | 'requests'>('library');
    
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

    useEffect(() => {
        if (isOpen) {
            setUrl(currentConfig.serverUrl);
            setApiKey(currentConfig.apiKey);
            setStatus('idle');
            setSyncProgress(0);
            setSyncStatusText('');
            
            // Load requests
            const savedReqs = localStorage.getItem('requests');
            if (savedReqs) setRequests(JSON.parse(savedReqs));

            // Load notifications
            const savedNotify = localStorage.getItem('streamhub_notifications');
            if (savedNotify) setNotifyConfig(JSON.parse(savedNotify));
        }
    }, [isOpen, currentConfig]);

    // Refresh requests when tab changes to 'requests'
    useEffect(() => {
        if (activeTab === 'requests') {
            const savedReqs = localStorage.getItem('requests');
            if (savedReqs) setRequests(JSON.parse(savedReqs));
        }
    }, [activeTab]);

    const handleConnect = async () => {
        if (!url || !apiKey) return;
        setStatus('testing');
        const isValid = await validateEmbyConnection({ serverUrl: url, apiKey });
        setStatus(isValid ? 'success' : 'error');
    };

    const handleFullSync = async () => {
        setIsSyncing(true);
        setSyncProgress(0);
        
        const newConfig = { serverUrl: url, apiKey };
        
        const { ids } = await fetchEmbyLibrary(newConfig, (current, total, text) => {
            setSyncStatusText(text);
            if (total > 0) {
                setSyncProgress(Math.round((current / total) * 100));
            }
        });
        
        setIsSyncing(false);
        onSave(newConfig, ids);
    };

    const handleSaveNotifications = () => {
        localStorage.setItem('streamhub_notifications', JSON.stringify(notifyConfig));
        alert('通知设置已保存');
    };

    const handleTestTelegram = async () => {
        try {
            await sendTelegramTest(notifyConfig);
            alert('测试消息已发送，请检查您的 Telegram');
        } catch (e: any) {
            alert('发送失败: ' + e.message);
        }
    };

    const updateRequestStatus = (index: number, status: 'completed' | 'rejected') => {
        const newRequests = [...requests];
        newRequests[index].status = status;
        setRequests(newRequests);
        localStorage.setItem('requests', JSON.stringify(newRequests));
    };

    const deleteRequest = (index: number) => {
        if (confirm('确定要删除这条请求吗？')) {
            const newRequests = requests.filter((_, i) => i !== index);
            setRequests(newRequests);
            localStorage.setItem('requests', JSON.stringify(newRequests));
        }
    };

    const clearRequests = () => {
        if (confirm('确定要清空所有请求吗？')) {
            localStorage.removeItem('requests');
            setRequests([]);
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
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-4xl h-[600px] rounded-2xl shadow-2xl overflow-hidden flex ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                
                {/* Sidebar */}
                <div className={`w-64 shrink-0 p-6 border-r flex flex-col ${isDarkMode ? 'border-white/5 bg-black/20' : 'border-slate-100 bg-slate-50/50'}`}>
                    <h2 className={`text-xl font-bold mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <LayoutDashboard className="text-indigo-500" /> 管理面板
                    </h2>
                    
                    <div className="space-y-2 flex-1">
                        <TabButton id="library" icon={<Database size={18} />} label="媒体库设置" />
                        <TabButton id="notifications" icon={<Bell size={18} />} label="通知服务" />
                        <TabButton id="requests" icon={<List size={18} />} label="用户求片" />
                    </div>

                    <div className={`mt-auto pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
