import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";

export default function GlobalErrorElement() {

  const error: any = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";
      const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr)?.user?.id || JSON.parse(userStr)?.id : null;
      
      fetch(`${API_URL}/api/telemetry/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              message: error?.message || error?.statusText || "React Router Route Error",
              stackTrace: error?.stack || String(error),
              url: window.location.href,
              userAgent: navigator.userAgent,
              userId: userId
          })
      }).catch(e => console.error("Telemetry failed", e));
    } catch(e) { /* ignore */ }
  }, [error]);

  const isNetworkError = 
    error?.message?.toLowerCase().includes("fetch") || 
    error?.message?.toLowerCase().includes("network") ||
    error?.message?.toLowerCase().includes("timeout") ||
    error?.status === 503 || 
    error?.status === 504;

  if (isNetworkError) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 selection:bg-emerald-500/30">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[140px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full p-8 rounded-[32px] border border-white/5 bg-white/5 backdrop-blur-3xl text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-6 border border-blue-500/20 animate-spin">
            <RotateCcw size={28} className="text-blue-400" />
          </div>

          <h1 className="text-2xl font-black tracking-tighter mb-2 uppercase italic text-blue-400">Network Retries Active</h1>
          <p className="text-slate-400 font-bold text-xs tracking-wide leading-relaxed mb-6">
            The application is experiencing a temporary network latency. Standard diagnostic retries are actively running.
          </p>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 mb-6 text-left">
            <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1 block">Network Status</span>
            <p className="text-[11px] font-mono text-slate-500 leading-tight">
              {error?.message || "Transient Network Offline"}
            </p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            FORCE RECONNECT
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 selection:bg-rose-500/30">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-[140px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-lg w-full p-10 rounded-[40px] border border-white/5 bg-white/5 backdrop-blur-3xl text-center shadow-2xl"
      >
        <div className="w-20 h-20 rounded-3xl bg-rose-500/20 flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-lg shadow-rose-500/10">
          <AlertTriangle size={40} className="text-rose-500" />
        </div>

        <h1 className="text-4xl font-black tracking-tighter mb-4 uppercase italic">Clinical Fault Detected</h1>
        <p className="text-slate-400 font-bold text-sm tracking-wide leading-relaxed mb-8">
          The application encountered a critical synchronization error. Our diagnostic telemetry has recorded the incident.
        </p>

        <div className="p-5 rounded-3xl bg-black/40 border border-white/5 mb-10 text-left overflow-hidden">
           <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.2em] mb-2">Technical Dossier</p>
           <div className="text-[11px] font-mono text-slate-500 break-all leading-tight opacity-80">
             {error?.message || error?.statusText || "Internal State Corruption"}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => window.location.reload()}
             className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
           >
             <RotateCcw size={16} /> REBOOT SYSTEM
           </button>
           <button 
             onClick={() => navigate("/")}
             className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-rose-600/20"
           >
             <Home size={16} /> RETURN HOME
           </button>
        </div>
      </motion.div>
    </div>
  );
}
