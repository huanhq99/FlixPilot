import React, { useState, useEffect } from 'react';
import { Server, User, Lock, LogIn, Shield, Ghost, Loader2, AlertCircle, CheckCircle2, Settings2, Tv, KeyRound } from 'lucide-react';
import { loginEmby } from '../services/embyService';
import { AuthState, EmbyConfig } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';

interface LoginProps {
    onLogin: (auth: AuthState) => void;
    isDarkMode: boolean;
    embyConfig?: EmbyConfig; // 从后端配置传入
    needsSetup?: boolean; // 是否需要首次设置密码
    adminUsername?: string; // 管理员用户名（从后端获取）
    onSetupComplete?: (token: string) => void; // 设置密码完成回调
    onPasswordLogin?: (token: string) => void; // 密码登录成功回调
}

const Login: React.FC<LoginProps> = ({ 
    onLogin, 
    isDarkMode, 
    embyConfig,
    needsSetup = false,
    adminUsername = 'admin',
    onSetupComplete,
    onPasswordLogin
}) => {
    const [mode, setMode] = useState<'password' | 'emby'>('password');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Password State
    const [username, setUsername] = useState(adminUsername);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Emby Login State
    const [embyUser, setEmbyUser] = useState('');
    const [embyPass, setEmbyPass] = useState('');
    
    // 检查后端是否配置了 Emby
    const isEmbyConfigured = !!(embyConfig?.serverUrl && embyConfig?.apiKey);

    // 首次设置密码
    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) {
            setError('请输入用户名');
            return;
        }
        if (!password) {
            setError('请输入密码');
            return;
        }
        if (password.length < 6) {
            setError('密码至少6个字符');
            return;
        }
        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                setSuccess('账号设置成功！');
                setTimeout(() => {
                    onSetupComplete?.(data.token);
                }, 1000);
            } else {
                setError(data.error || '设置失败');
            }
        } catch (err) {
            setError('网络错误，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 密码登录
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError('请输入密码');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.ok && data.success) {
                setSuccess('登录成功！');
                setTimeout(() => {
                    onPasswordLogin?.(data.token);
                }, 500);
            } else {
                setError(data.error || '用户名或密码错误');
            }
        } catch (err) {
            setError('网络错误，请重试');
        } finally {
            setLoading(false);
        }
    };

    // Emby 登录
    const handleEmbyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!embyUser || !embyPass) {
            setError('请输入 Emby 用户名和密码');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const serverUrl = embyConfig!.serverUrl;
            const result = await loginEmby(serverUrl, embyUser, embyPass);
            
            if (result) {
                const authState: AuthState = {
                    isAuthenticated: true,
                    user: result.user,
                    serverUrl: serverUrl,
                    accessToken: result.accessToken,
                    isAdmin: result.user.Policy?.IsAdministrator || false,
                    isGuest: false
                };
                onLogin(authState);
            } else {
                setError('Emby 用户名或密码错误');
            }
        } catch (err) {
            setError('无法连接到 Emby 服务器');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
            <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#18181b] border border-white/10' : 'bg-white'}`}>
                <div className="text-center mb-8">
                    <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Stream<span className="text-indigo-500">Hub</span>
                    </h1>
                    <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {needsSetup ? '🔐 首次使用，请设置管理员密码' : '登录以访问控制台'}
                    </p>
                </div>

                {/* 登录方式选择 - 仅当后端配置了 Emby 且不是首次设置时显示 */}
                {!needsSetup && isEmbyConfigured && (
                    <div className={`flex rounded-xl p-1 mb-6 ${isDarkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                        <button
                            type="button"
                            onClick={() => setMode('password')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                mode === 'password'
                                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm')
                                    : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                            }`}
                        >
                            <KeyRound size={16} />
                            密码登录
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('emby')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                mode === 'emby'
                                    ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 shadow-sm')
                                    : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                            }`}
                        >
                            <Tv size={16} />
                            Emby 账户
                        </button>
                    </div>
                )}

                {/* 密码登录/设置表单 */}
                {(needsSetup || mode === 'password') && (
                    <form onSubmit={needsSetup ? handleSetupPassword : handlePasswordLogin} className="space-y-4">
                        {/* 用户名 */}
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
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                    placeholder="admin"
                                    autoFocus={needsSetup}
                                />
                            </div>
                        </div>

                        {/* 密码 */}
                        <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                {needsSetup ? '设置密码' : '密码'}
                            </label>
                            <div className="relative">
                                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                    placeholder="••••••"
                                    autoFocus={!needsSetup}
                                />
                            </div>
                        </div>

                        {needsSetup && (
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
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-emerald-500 text-sm bg-emerald-500/10 p-3 rounded-lg">
                                <CheckCircle2 size={16} />
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (needsSetup ? <Shield size={20} /> : <LogIn size={20} />)}
                            {needsSetup ? '设置密码并登录' : '登录'}
                        </button>

                        {!needsSetup && (
                            <p className={`text-xs text-center ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                密码在 config.json 中配置，或首次访问时设置
                            </p>
                        )}
                    </form>
                )}

                {/* Emby 登录表单 */}
                {!needsSetup && mode === 'emby' && (
                    <form onSubmit={handleEmbyLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                Emby 用户名
                            </label>
                            <div className="relative">
                                <User className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                                <input 
                                    type="text" 
                                    value={embyUser}
                                    onChange={(e) => setEmbyUser(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                    placeholder="Emby 用户名"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                Emby 密码
                            </label>
                            <div className="relative">
                                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`} size={18} />
                                <input 
                                    type="password" 
                                    value={embyPass}
                                    onChange={(e) => setEmbyPass(e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all font-mono text-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                    placeholder="••••••"
                                />
                            </div>
                        </div>

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
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Tv size={20} />}
                            使用 Emby 账户登录
                        </button>

                        <p className={`text-xs text-center ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                            使用你的 Emby 服务器账户登录
                        </p>
                    </form>
                )}

                {/* 游客入口 - 始终显示（除了首次设置） */}
                {!needsSetup && (
                    <>
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

                        <button
                            type="button"
                            onClick={() => {
                                onLogin({
                                    isAuthenticated: true,
                                    user: null,
                                    serverUrl: '',
                                    accessToken: '',
                                    isAdmin: false,
                                    isGuest: true
                                });
                            }}
                            className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                        >
                            <Ghost size={20} />
                            游客访问（仅浏览）
                        </button>

                        <p className={`text-xs text-center mt-2 ${isDarkMode ? 'text-zinc-600' : 'text-slate-400'}`}>
                            游客可浏览内容，但无法使用管理功能
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
