import { useState, useEffect } from "react";
import { Activity, AlertCircle, CheckCircle, Clock, Globe, Laptop, Server, Smartphone, Trash2, Copy } from "lucide-react";

interface TelemetryLog {
    id: string;
    timestamp: string;
    level: string;
    source: string;
    message: string;
    stackTrace: string;
    url: string;
    userAgent: string;
    userId: string;
    resolved: boolean;
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<TelemetryLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    const fetchLogs = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";
            const res = await fetch(`${API_URL}/api/telemetry/logs`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    const markResolved = async (id: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";
            await fetch(`${API_URL}/api/telemetry/logs/${id}/resolve`, { method: "PATCH" });
            fetchLogs();
        } catch (e) {
            console.error(e);
        }
    };

    const parseUserAgent = (ua: string) => {
        if (!ua) return "Unknown Device";
        let browser = "Unknown Browser";
        let os = "Unknown OS";
        
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome/Brave";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        
        if (ua.includes("Win")) os = "Windows";
        else if (ua.includes("Mac")) os = "MacOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

        return `${os} • ${browser}`;
    };

    const copyLog = (log: TelemetryLog) => {
        const content = `[${log.source}] ${log.timestamp}\nMessage: ${log.message}\n\nStackTrace:\n${log.stackTrace || 'None'}\n\nURL: ${log.url || 'N/A'}`;
        navigator.clipboard.writeText(content);
    };

    const filteredLogs = logs.filter(log => {
        if (filter === "UNRESOLVED") return !log.resolved && log.source !== "ACCESS";
        if (filter === "FRONTEND") return log.source === "FRONTEND";
        if (filter === "BACKEND") return log.source === "BACKEND";
        if (filter === "ACCESS") return log.source === "ACCESS";
        return true;
    });

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Activity className="text-blue-500" />
                            Global Telemetry
                        </h1>
                        <p className="text-slate-400 font-medium">Real-time error monitoring across all devices and servers.</p>
                    </div>
                    <div className="flex gap-2">
                        {["ALL", "UNRESOLVED", "FRONTEND", "BACKEND", "ACCESS"].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-slate-500 py-20 animate-pulse font-bold tracking-widest">LOADING TELEMETRY...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
                        <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                        <h2 className="text-xl font-bold text-slate-300 mb-2">System Healthy</h2>
                        <p className="text-slate-500">No errors matching the current filter.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredLogs.map(log => (
                            <div key={log.id} className={`p-6 rounded-2xl border transition-all ${log.source === 'ACCESS' ? 'border-purple-500/20 bg-purple-500/5' : log.resolved ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60' : log.source === 'FRONTEND' ? 'border-orange-500/20 bg-orange-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${log.source === 'ACCESS' ? 'bg-purple-500/20 text-purple-400' : log.source === 'FRONTEND' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {log.source === 'ACCESS' ? <Globe size={24} /> : log.source === 'FRONTEND' ? <Smartphone size={24} /> : <Server size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${log.source === 'ACCESS' ? 'bg-purple-500/20 text-purple-400' : log.source === 'FRONTEND' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {log.source}
                                                </span>
                                                <span className="text-slate-400 text-xs font-mono flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                                {log.resolved && log.source !== 'ACCESS' && (
                                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400">
                                                        RESOLVED
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-white break-words">{log.message}</h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => copyLog(log)} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center gap-2 transition-all">
                                            <Copy size={14} />
                                            <span className="text-xs font-bold uppercase tracking-wider">Copy</span>
                                        </button>
                                        {!log.resolved && log.source !== 'ACCESS' && (
                                            <button onClick={() => markResolved(log.id)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 text-xs font-bold uppercase tracking-wider transition-all">
                                                Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                    {log.url && (
                                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-start gap-3">
                                            <Globe size={16} className="text-slate-500 shrink-0 mt-0.5" />
                                            <span className="text-xs font-mono text-slate-400 break-all">{log.url}</span>
                                        </div>
                                    )}
                                    {log.userAgent && (
                                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <Laptop size={16} className="text-slate-500 shrink-0" />
                                                <span className="text-sm font-bold text-slate-200">{parseUserAgent(log.userAgent)}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 break-all">{log.userAgent}</span>
                                        </div>
                                    )}
                                </div>

                                {log.stackTrace && (
                                    <div className="mt-4 bg-black/60 rounded-xl p-4 overflow-x-auto border border-white/5 relative group">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Stack Trace</div>
                                        <pre className="text-[11px] font-mono text-slate-400 leading-relaxed">
                                            {log.stackTrace}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
