import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Calendar, CreditCard, ChevronRight, Sparkles, Activity, ShieldCheck, ArrowRight, UserCircle, Users, Wallet, AlertCircle, LogOut } from "lucide-react";
const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

export default function DoctorOnboarding(): React.JSX.Element {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [launchError, setLaunchError] = React.useState("");

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login', { replace: true });
    };

    const handleLaunch = async () => {
        try {
            const token = user?.token;
            const dId = user?.doctorId || user?.id;
            if (!dId) {
                setLaunchError("Doctor ID not found. Please log out and back in.");
                setTimeout(() => setLaunchError(""), 5000);
                return;
            }
            const resp = await fetch(`${API}/api/doctor/${dId}/hired-mediator`, {
                headers: { "Authorization": token ? `Bearer ${token}` : "" }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (!data.assigned) {
                    setLaunchError("Mediator not assigned yet. Please complete staff setup. Click here to assign staff.");
                    setTimeout(() => setLaunchError(""), 8000);
                    return;
                }
                navigate(`/doctor/dashboard/${dId}`);
            } else {
                // Endpoint returned non-ok (e.g. mediator not found yet) — navigate anyway
                navigate(`/doctor/dashboard/${dId}`);
            }
        } catch (e) {
            const dId = user?.doctorId || user?.id;
            if (dId) {
                navigate(`/doctor/dashboard/${dId}`);
            } else {
                setLaunchError("Failed to verify staff setup.");
                setTimeout(() => setLaunchError(""), 5000);
            }
        }
    };

    const steps = [
        {
            id: "schedule",
            title: "Schedule Management",
            description: "Configure your clinical availability and operating hours to begin accepting patients.",
            icon: <Calendar className="text-blue-400" size={32} />,
            path: "/schedule-management",
            color: "blue",
            status: "Primary"
        },
        {
            id: "staff",
            title: "Staff & Mediator Setup",
            description: "Assign and verify your clinical mediators to enable dashboard launch and patient flow.",
            icon: <Users className="text-purple-400" size={32} />,
            path: "/doctor/manage-staff",
            color: "purple",
            status: "Action Required"
        },
        {
            id: "infrastructure",
            title: "Infrastructure Capabilities",
            description: "Register your practice unit's operational capabilities, from triage to critical care.",
            icon: <Activity className="text-rose-400" size={32} />,
            path: "/clinic-infrastructure",
            color: "rose",
            status: "Required"
        },
        {
            id: "account",
            title: "Financial & Professional Vault",
            description: "Authorize your medical registration and secure your clinical revenue payout channels.",
            icon: <CreditCard className="text-emerald-400" size={32} />,
            path: "/account-setup",
            color: "emerald",
            status: "Mandatory"
        },
        {
            id: "preferences",
            title: "Clinical Parameters",
            description: "Define your patient demographic preferences, clinical focus areas, and target age groups.",
            icon: <Users className="text-amber-400" size={32} />,
            path: "/doctor-preferences",
            color: "amber",
            status: "Optimization"
        },
        {
            id: "financial",
            title: "Financial Dashboard",
            description: "View your real-time clinic revenue, balances, and initiate payouts.",
            icon: <Wallet className="text-green-400" size={32} />,
            path: "/doctor-balance",
            color: "green",
            status: "Revenue"
        }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col p-6 md:p-12 relative overflow-y-auto overflow-x-hidden">
            {/* Header for Logout */}
            <div className="fixed top-6 right-6 sm:top-8 sm:right-10 z-[100]">
              <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-xl shadow-black/50 border border-white/5" title="Logout">
                <LogOut size={16} />
              </button>
            </div>

            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-6xl relative z-10"
                >
                <div className="text-center mb-16 mt-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <Sparkles size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Clinical Onboarding Phase 1</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter mb-4">Welcome, {user.fullName || "Specialist"}</h1>
                    <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed font-bold">
                        Initialize your professional footprint. Choose a module below to complete your clinical authorization and activate your dashboard.
                    </p>
                </div>

                {launchError && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="max-w-xl mx-auto mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col gap-3 text-rose-400 shadow-lg"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle size={20} className="shrink-0" />
                            <span 
                                className={`font-bold text-sm ${launchError.includes("assign staff") ? "cursor-pointer underline hover:text-white transition-colors" : ""}`}
                                onClick={() => launchError.includes("assign staff") && navigate("/doctor/manage-staff")}
                            >
                                {launchError}
                            </span>
                        </div>
                        {launchError.includes("Mediator not assigned") && (
                            <button 
                                onClick={() => navigate("/doctor/manage-staff")}
                                className="mt-2 w-fit px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-colors flex items-center gap-2"
                            >
                                <Users size={14} />
                                <span>Go to Staff Setup</span>
                            </button>
                        )}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => navigate(step.path)}
                            className="group relative text-left cursor-pointer"
                        >
                            <div className={`absolute -inset-0.5 bg-gradient-to-r from-${step.color}-500 to-indigo-500 rounded-[32px] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 pointer-events-none`} />
                            <div className="glass-card-dark p-8 rounded-[32px] border-white/5 relative overflow-hidden h-full flex flex-col justify-between hover:border-white/10 transition-all hover:translate-y-[-4px]">
                                <div>
                                    <div className="flex items-center justify-between mb-8">
                                        <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner`}>
                                            {step.icon}
                                        </div>
                                        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                                            <span className={`text-[10px] font-black uppercase tracking-widest text-${step.color}-400`}>{step.status}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black mb-3 group-hover:text-blue-400 transition-colors">{step.title}</h3>
                                    <p className="text-slate-500 text-xs leading-relaxed font-bold">
                                        {step.description}
                                    </p>
                                </div>
                                
                                <div className="mt-10 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Initialize Module</span>
                                    <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-${step.color}-500 group-hover:text-black transition-all`}>
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    {(user.role === "doctor" || user.role === "ROLE_DOCTOR") && (
                        <motion.button 
                            whileHover={{ scale: launchError ? 1 : 1.02 }}
                            whileTap={{ scale: launchError ? 1 : 0.98 }}
                            onClick={handleLaunch}
                            disabled={!!launchError}
                            className={`w-full max-w-md h-20 rounded-[32px] ${launchError ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-black cursor-pointer shadow-2xl shadow-white/10 group'} font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 relative overflow-hidden`}
                        >
                            {!launchError && <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-10" />}
                            <span>Launch Clinical Dashboard</span>
                            <ChevronRight size={20} className={!launchError ? "group-hover:translate-x-1 transition-transform" : ""} />
                        </motion.button>
                    )}
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                       Clinical authorization complete. Proceed to live operations.
                    </p>
                </div>

                <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-center text-slate-600">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Active</span>
                    </div>
                </div>
            </motion.div>
            </div>
        </div>
    );
}
