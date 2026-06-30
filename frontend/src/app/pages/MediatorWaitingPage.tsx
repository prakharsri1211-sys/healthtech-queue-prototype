import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ShieldAlert, LogOut, Loader2, Bell, CheckCircle2, MapPin, Stethoscope, ArrowRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

export default function MediatorWaitingPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<"unassigned" | "loading" | "linked" | "countdown">("loading");
    const [assignmentData, setAssignmentData] = useState<any>(null);
    const [countdownTime, setCountdownTime] = useState<string>("00:00:00");

    useEffect(() => {
        const checkStatus = async () => {
            const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
            if (!userStr) {
                navigate("/login");
                return;
            }
            const user = JSON.parse(userStr);
            const token = user.token;

            try {
                const resp = await fetch(`${API}/api/mediator/${user.id}/session-info`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.assigned) {
                        setAssignmentData(data);
                        if (data.isLive) {
                            setStatus("linked");
                        } else {
                            setStatus("countdown");
                        }
                    } else {
                        setStatus("unassigned");
                    }
                }
            } catch (e) {
                console.error("Assignment check failed", e);
                // Break the loop if we can't reach the server
                navigate("/login?error=sync_failed");
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    useEffect(() => {
        if (status !== "countdown" || !assignmentData?.startTime) return;
        
        const updateCountdown = () => {
            const now = new Date();
            const [hours, minutes, seconds] = assignmentData.startTime.split(':').map(Number);
            
            const target = new Date();
            target.setHours(hours || 9, minutes || 0, seconds || 0, 0);
            
            const diff = target.getTime() - now.getTime();
            
            if (diff <= 0) {
                setStatus("linked");
                return;
            }
            
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            setCountdownTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [status, assignmentData]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="w-full min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <AnimatePresence mode="wait">
                    {status === "loading" ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center space-y-4"
                        >
                            <Loader2 size={48} className="text-blue-500 animate-spin mx-auto" />
                            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Synchronizing Credentials...</p>
                        </motion.div>
                    ) : status === "unassigned" ? (
                        <motion.div 
                            key="unassigned"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="glass-card-dark p-6 sm:p-10 rounded-[48px] border-white/5 text-center space-y-8 shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto shadow-inner">
                                <ShieldAlert size={40} />
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black tracking-tight">Access Restricted</h1>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Your account is not yet linked to a medical facility. Please wait for a Doctor to initiate a handshake via the Staff Management portal.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 animate-pulse">
                                <Bell size={18} className="text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoring for link requests...</span>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button onClick={handleLogout} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                    <LogOut size={18} />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </motion.div>
                    ) : status === "countdown" ? (
                        <motion.div 
                            key="countdown"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="glass-card-dark p-6 sm:p-10 rounded-[48px] border-blue-500/30 bg-blue-500/5 text-center space-y-8 shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-500 mx-auto shadow-inner">
                                <Clock size={40} />
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black tracking-tight">Session Starting Soon</h1>
                                <p className="text-slate-400 text-sm">
                                    You are assigned to {assignmentData?.doctorName}. The dashboard will unlock when the session begins.
                                </p>
                            </div>
                            
                            <div className="p-6 rounded-3xl bg-[#020617] border border-white/10 text-center font-mono text-4xl font-black tracking-widest text-blue-400 shadow-inner">
                                {countdownTime}
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button onClick={handleLogout} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                                    <LogOut size={18} />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="linked"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="glass-card-dark p-6 sm:p-10 rounded-[48px] border-emerald-500/30 bg-emerald-500/5 text-center space-y-8 shadow-2xl"
                        >
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto shadow-inner">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black tracking-tight">Assignment Confirmed</h1>
                                <p className="text-slate-400 text-sm">
                                    Your account has been successfully linked to the following medical facility.
                                </p>
                            </div>

                            <div className="space-y-4 text-left">
                                <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <MapPin className="text-blue-500" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Clinic</p>
                                        <p className="font-bold">{assignmentData.clinicName}</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <Stethoscope className="text-blue-500" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Doctor</p>
                                        <p className="font-bold">{assignmentData.doctorName}</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => navigate("/mediator-dashboard")}
                                className="w-full h-16 rounded-[28px] bg-blue-600 text-white font-black text-lg uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group"
                            >
                                <span>Enter Dashboard</span>
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
