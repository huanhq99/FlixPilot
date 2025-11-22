import React, { useEffect, useRef } from 'react';
import { LogEntry, MediaItem } from '../types';

interface SidebarProps {
    mediaList: MediaItem[];
    logs: LogEntry[];
    isDarkMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ mediaList, logs, isDarkMode }) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const streamingCount = mediaList.filter(i => i.status === 'streaming').length;
    const progressWidth = mediaList.length > 0 ? (streamingCount / mediaList.length) * 100 : 0;

    return (
        <aside className="lg:col-span-3 space-y-6 hidden lg:block sticky top-24 h-fit">
            {/* Stats Card */}
            <div className={`rounded-2xl border p-5 backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'bg-white/5 border-white/5 shadow-none' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>总收录</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${isDarkMode ? 'text-white bg-white/10' : 'text-slate-700 bg-slate-100'}`}>
                        {mediaList.length}
                    </span>
                </div>
                <div className="space-y-3">
                    <div className={`flex items-center justify-between text-xs ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                        <span>可在线播放</span>
                        <span className="text-emerald-500 font-bold">{streamingCount}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${progressWidth}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Live Logs Terminal */}
            <div className={`rounded-2xl border overflow-hidden flex flex-col h-[320px] transition-colors duration-300 ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        System Logs
                    </span>
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                       <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                       <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-hidden relative p-4 font-mono">
                    <div className="absolute inset-0 overflow-y-auto space-y-2 p-4 scrollbar-none">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`text-[10px] leading-relaxed transition-all duration-300 ${log.highlight ? 'text-red-400' : 'text-slate-400'}`}>
                                <span className="opacity-40 mr-2">[{log.time}]</span>
                                <span className={log.highlight ? 'font-bold' : ''}>{log.msg}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                    {/* Scanline effect */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent bg-[length:100%_4px]"></div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
