import React, { useState, useEffect } from 'react';
import { Server, User, Lock, LogIn, Shield, Ghost, Loader2, AlertCircle } from 'lucide-react';
import { loginEmby } from '../services/embyService';
import { AuthState } from '../types';

interface LoginProps {
    onLogin: (auth: AuthState) => void;
    isDarkMode: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isDarkMode }) => {
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load saved server URL
    useEffect(() => {
        const savedUrl = localStorage.getItem('emby_server_url');
        if (savedUrl) setServerUrl(savedUrl);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverUrl || !username) return;

        setLoading(true);
        setError('');

        try {
            const result = await loginEmby(serverUrl, username, password);
            
            if (result) {
                localStorage.setItem('emby_server_url', serverUrl);
                // We don't save password or token in local storage for security in this demo, 
                // but in a real app we might save a token.
                
                onLogin({
                    isAuthenticated: true,
                    user: result.user,
                    serverUrl: serverUrl,
                    accessToken: result.accessToken,
                    isAdmin: result.user.Policy?.IsAdministrator || false,
                    isGuest: false
                });
            } else {
                setError('登录失败，请检查用户名或密码');
            }
        } catch (err) {
            setError('连接服务器失败');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = () => {
        onLogin({
            isAuthenticated: true,
            user: null,
            serverUrl: '',
            accessToken: '',
            isAdmin: false,
            isGuest: true
        });
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                <div className="text-center mb-8">
                    <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Stream<span className="text-indigo-500">Hub</span>
                    </h1>
                    <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                        登录您的 Emby 媒体服务器
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            服务器地址
                        </label>
                        <div className="relative">
                            <Server className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                            <input 
                                type="text" 
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                placeholder="http://192.168.1.10:8096"
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            用户名
                        </label>
                        <div className="relative">
                            <User className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Emby 用户名"
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            密码 (可选)
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="密码"
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={loading || !serverUrl || !username}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <LogIn size={18} />}
                        {loading ? '正在登录...' : '登录'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-dashed border-gray-200 dark:border-white/10">
                    <button 
                        onClick={handleGuestLogin}
                        className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-zinc-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    >
                        <Ghost size={18} /> 游客访问 (仅浏览)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
