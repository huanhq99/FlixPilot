import React, { useState, useEffect } from 'react';
import { X, Save, Server, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { EmbyConfig } from '../types';
import { validateEmbyConnection } from '../services/embyService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: EmbyConfig) => void;
    currentConfig: EmbyConfig;
    isDarkMode: boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentConfig, isDarkMode }) => {
    const [url, setUrl] = useState(currentConfig.serverUrl);
    const [apiKey, setApiKey] = useState(currentConfig.apiKey);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            setUrl(currentConfig.serverUrl);
            setApiKey(currentConfig.apiKey);
            setStatus('idle');
        }
    }, [isOpen, currentConfig]);

    const handleTest = async () => {
        if (!url || !apiKey) return;
        setStatus('testing');
        const isValid = await validateEmbyConnection({ serverUrl: url, apiKey });
        setStatus(isValid ? 'success' : 'error');
    };

    const handleSave = () => {
        onSave({ serverUrl: url, apiKey });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDarkMode ? 'bg-zinc-900 border border-white/10' : 'bg-white'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <Server className="text-indigo-500" /> Emby 库连接
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-slate-400'}`}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            服务器地址 (URL)
                        </label>
                        <input 
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="http://192.168.1.x:8096"
                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            API 密钥 (API Key)
                        </label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="在 Emby 控制台 -> 高级 -> API 密钥 中生成"
                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${isDarkMode ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                            {status === 'testing' && <span className="text-indigo-500 flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin"/> 连接测试中...</span>}
                            {status === 'success' && <span className="text-emerald-500 flex items-center gap-2 text-sm"><CheckCircle2 size={16}/> 连接成功</span>}
                            {status === 'error' && <span className="text-red-500 flex items-center gap-2 text-sm"><AlertCircle size={16}/> 连接失败，请检查地址和密钥</span>}
                        </div>
                        <button 
                            onClick={handleTest}
                            disabled={!url || !apiKey || status === 'testing'}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                        >
                            测试连接
                        </button>
                    </div>
                </div>

                <div className={`p-6 border-t flex justify-end gap-3 ${isDarkMode ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                    <button 
                        onClick={onClose}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!url || !apiKey}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save size={18} /> 保存并同步
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
