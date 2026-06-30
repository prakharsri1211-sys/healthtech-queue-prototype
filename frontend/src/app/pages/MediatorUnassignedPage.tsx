import { useEffect } from "react";
import { useNavigate } from "react-router";
import { LogOut, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

export default function MediatorUnassignedPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const checkAssignment = async () => {
            const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
            const u = userStr ? JSON.parse(userStr) : null;
            if (!u || !u.id) return;
            
            try {
                const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
                const resp = await fetch(`${API}/api/mediator/${u.id}/session-info`, {
                    headers: { "Authorization": `Bearer ${u.token}` }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.assigned) {
                        navigate("/mediator");
                    }
                }
            } catch (e) {
                console.error("Failed to check assignment", e);
            }
        };

        checkAssignment();
        const interval = setInterval(checkAssignment, 5000);
        return () => clearInterval(interval);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md glass-card-dark p-10 rounded-[48px] border-white/5 text-center space-y-8 shadow-2xl"
            >
                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto shadow-inner">
                    <ShieldAlert size={40} />
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight">Access Restricted</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        No clinic or doctor has been allotted yet.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={handleLogout} className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                        <LogOut size={18} />
                        <span>Log Out</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
