import React from "react";
import { useNavigate } from "react-router";
import { User, Activity, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function RoleSelectionPage(): React.JSX.Element {
    const navigate = useNavigate();

    const roles = [
        {
            id: "doctor",
            title: "Doctor",
            description: "Manage clinic, queue & patient care.",
            icon: Activity,
            gradient: "from-blue-500/20 to-indigo-500/20",
            accent: "text-blue-500 dark:text-blue-400",
            iconBg: "bg-blue-500/10"
        },
        {
            id: "mediator",
            title: "Mediator",
            description: "Coordinate flow & assist clinic ops.",
            icon: ShieldCheck,
            gradient: "from-emerald-500/20 to-teal-500/20",
            accent: "text-emerald-500 dark:text-emerald-400",
            iconBg: "bg-emerald-500/10"
        },
        {
            id: "patient",
            title: "User (Patient Portal)",
            description: "Book care for yourself & 5 others.",
            icon: User,
            gradient: "from-amber-500/20 to-orange-500/20",
            accent: "text-amber-500 dark:text-amber-400",
            iconBg: "bg-amber-500/10"
        },
    ];

    const handleRoleSelect = (roleId: string) => {
        navigate(`/signup?role=${roleId}`);
    };

    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 overflow-x-hidden relative transition-colors duration-300">
            {/* Ambient Background Glows - Made more subtle */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/5 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-400/5 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
            </div>

            <div className="relative w-full max-w-lg z-10">
                <header className="text-center mb-12 animate-in fade-in slide-in-from-top duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-6 shadow-sm">
                        <Sparkles size={12} className="text-blue-500 dark:text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Join Evolution</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-slate-800 dark:text-white">
                        Select Your Path
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Choose a role to initialize your specialized health portal.</p>
                </header>

                <div className="space-y-4">
                    {roles.map((role, i) => (
                        <motion.button
                            key={role.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            onClick={() => handleRoleSelect(role.id)}
                            className="group relative w-full flex flex-col sm:flex-row items-center gap-5 p-6 glass-panel interactive-card overflow-hidden text-center sm:text-left"
                        >
                            {/* Inner Gradient Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                            
                            <div className={`relative z-10 w-16 h-16 rounded-2xl ${role.iconBg} border border-slate-200/50 dark:border-white/5 flex items-center justify-center ${role.accent} group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                                <role.icon size={32} />
                            </div>

                            <div className="relative z-10 flex-1 min-w-0">
                                <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-800 dark:text-white transition-colors">
                                    {role.title}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">
                                    {role.description}
                                </p>
                            </div>

                            <div className="relative z-10 p-2 rounded-xl bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-300">
                                <ChevronRight size={20} className="text-slate-400 dark:text-white" />
                            </div>
                        </motion.button>
                    ))}
                </div>

                <div className="mt-12 text-center animate-in fade-in duration-1000 delay-500">
                    <button
                        onClick={() => navigate("/")}
                        className="text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        </div>
    );
}
