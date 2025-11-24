import React, { useState, useEffect } from 'react';
import { Server, User, Lock, LogIn, Shield, Ghost, Loader2, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';
import { loginEmby } from '../services/embyService';
import { AuthState } from '../types';

interface LoginProps {
    onLogin: (auth: AuthState) => void;
    isDarkMode: boolean;
}

const Login: React.FC<LoginProps> = ({ onLogin, isDarkMode }) => {
    const [mode, setMode] = useState<'login' | 'setup'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Local Account State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Emby Config State (Optional during setup)
    const [configureEmby, setConfigureEmby] = useState(false);
    const [embyUrl, setEmbyUrl] = useState('');
    const [embyUser, setEmbyUser] = useState('');
    const [embyPass, setEmbyPass] = useState('');

    // Check if system is initialized
    useEffect(() => {
        try {
            const users = localStorage.getItem('streamhub_users');
            if (!users) {
                setMode('setup');
            } else {
                setMode('login');
            }
        } catch (e) {
            setMode('setup');
        }
    }, []);

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('请输入用户名和密码');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let embyConfig = null;

            // Try to connect to Emby if configured
            if (configureEmby && embyUrl && embyUser) {
                try {
                    const result = await loginEmby(embyUrl, embyUser, embyPass);
                    if (result) {
                        embyConfig = {
                            serverUrl: embyUrl,
                            username: embyUser,
                            accessToken: result.accessToken,
                            userId: result.user.Id
                        };
                    }
                } catch (err) {
                    console.error('Emby connection failed during setup', err);
                    setError('无法连接到 Emby 服务器，请检查配置或取消勾选');
                    setLoading(false);
                    return;
                }
            }

            // Create Admin User
            const newUser = {
                id: 'admin-' + Date.now(),
                username,
                password, // In real app, hash this!
                isAdmin: true,
                embyConfig,
                createdAt: Date.now()
            };

            // Save to LocalStorage
            const users = [newUser];
            localStorage.setItem('streamhub_users', JSON.stringify(users));

            // Auto Login
            const authState: AuthState = {
                isAuthenticated: true,
                user: {
                    Id: newUser.id,
                    Name: newUser.username,
                    Policy: { IsAdministrator: true }
                } as any,
                serverUrl: embyConfig?.serverUrl || '',
                accessToken: embyConfig?.accessToken || '',
                isAdmin: true,
                isGuest: false
            };

            onLogin(authState);

        } catch (err) {
            setError('设置失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setLoading(true);
        setError('');

        try {
            // 1. Check Local Users
            let users: any[] = [];
            try {
                const usersStr = localStorage.getItem('streamhub_users');
                users = usersStr ? JSON.parse(usersStr) : [];
            } catch (e) {
                users = [];
            }
            
            const localUser = users.find((u: any) => u.username === username && u.password === password);

            if (localUser) {
                // Login successful
                const authState: AuthState = {
                    isAuthenticated: true,
                    user: {
                        Id: localUser.id,
                        Name: localUser.username,
                        Policy: { IsAdministrator: localUser.isAdmin }
                    } as any,
                    serverUrl: localUser.embyConfig?.serverUrl || '',
                    accessToken: localUser.embyConfig?.accessToken || '',
                    isAdmin: localUser.isAdmin,
                    isGuest: false
                };
                onLogin(authState);
                return;
            }
            
            setError('用户名或密码错误');
        } catch (err) {
            setError('登录失败');
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
                        {mode === 'setup' ? '初始化管理员账号' : '登录您的账户'}
                    </p>
                </div>

                <form onSubmit={mode === 'setup' ? handleSetup : handleLogin} className="space-y-4">
                    
                    {/* Common Fields */}
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
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                placeholder="admin"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            密码
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    {/* Setup Only Fields */}
                    {mode === 'setup' && (
                        <>
                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                    确认密码
                                </label>
                                <div className="relative">
                                    <CheckCircle2 className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                                    <input 
                                        type="password" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Settings2 size={18} className="text-indigo-500" />
                                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>配置 Emby 服务器</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={configureEmby} onChange={e => setConfigureEmby(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {configureEmby && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <input 
                                            type="text" 
                                            value={embyUrl}
                                            onChange={(e) => setEmbyUrl(e.target.value)}
                                            placeholder="http://192.168.1.10:8096"
                                            className={`w-full px-3 py-2 rounded-lg border text-xs ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                        <input 
                                            type="text" 
                                            value={embyUser}
                                            onChange={(e) => setEmbyUser(e.target.value)}
                                            placeholder="Emby 用户名"
                                            className={`w-full px-3 py-2 rounded-lg border text-xs ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                        <input 
                                            type="password" 
                                            value={embyPass}
                                            onChange={(e) => setEmbyPass(e.target.value)}
                                            placeholder="Emby 密码"
                                            className={`w-full px-3 py-2 rounded-lg border text-xs ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'setup' ? <Shield size={20} /> : <LogIn size={20} />)}
                        {mode === 'setup' ? '创建管理员账户' : '登录'}
                    </button>

                    {mode === 'login' && (
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className={`w-full border-t ${isDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className={`px-2 ${isDarkMode ? 'bg-[#18181b] text-zinc-500' : 'bg-white text-slate-500'}`}>
                                    或者
                                </span>
                            </div>
                        </div>
                    )}

                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={handleGuestLogin}
                            className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                        >
                            <Ghost size={20} />
                            游客访问
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;
