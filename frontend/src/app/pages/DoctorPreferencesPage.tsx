import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Brain, Users, Activity, Heart, Baby, Eye, Thermometer, Sparkles, Check } from "lucide-react";
import { motion } from "motion/react";

const specialties = [
    { id: "gen", name: "General Medicine", icon: <Thermometer size={20} /> },
    { id: "cardio", name: "Cardiology", icon: <Heart size={20} /> },
    { id: "ortho", name: "Orthopedics", icon: <Activity size={20} /> },
    { id: "neuro", name: "Neurology", icon: <Brain size={20} /> },
    { id: "pedia", name: "Pediatrics", icon: <Baby size={20} /> },
    { id: "ophthal", name: "Ophthalmology", icon: <Eye size={20} /> },
];

export default function DoctorPreferencesPage(): React.JSX.Element {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [prefs, setPrefs] = useState({
        genderPref: "Any",
        ageRange: "All Ages",
    });

    const [saving, setSaving] = useState(false);
    const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080";

    React.useEffect(() => {
        const fetchPrefs = async () => {
            const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
            const user = userStr ? JSON.parse(userStr) : null;
            if (!user) return;

            try {
                const resp = await fetch(`${API_URL}/api/doctor/${user.id}/clinic-details`);
                if (resp.ok) {
                    const data = await resp.json();
                    setPrefs({
                        genderPref: data.genderPreference || "Any",
                        ageRange: data.targetAgeRange || "All Ages",
                    });
                }
            } catch (e) {
                console.error("Failed to fetch preferences", e);
            }
        };
        fetchPrefs();
    }, []);

    const handleNext = async () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            setSaving(true);
            const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            try {
                await fetch(`${API_URL}/api/doctor/${user.id}/clinical-preferences`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": token ? `Bearer ${token}` : ""
                    },
                    body: JSON.stringify({
                        genderPreference: prefs.genderPref.toUpperCase(),
                        targetAgeRange: prefs.ageRange === "All Ages" ? "ADULT" : (prefs.ageRange.includes("Pediatrics") ? "CHILD" : (prefs.ageRange.includes("Geriatrics") ? "SENIOR" : "ADULT"))
                    })
                });
                navigate("/doctor-onboarding");
            } catch (e) {
                console.error("Failed to save preferences", e);
                navigate("/doctor-onboarding");
            } finally {
                setSaving(false);
            }
        }
    };

    const colors = {
        bg: "#020617",
        card: "#0F172A",
        accent: "#3B82F6",
        border: "rgba(255,255,255,0.05)"
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden font-sans">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-6">
                        <Sparkles size={28} />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-white">Doctor Onboarding</h1>
                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Step {step} of 2 • Customizing Professional Profile</p>
                </div>

                <div className="glass-card-dark p-8 sm:p-10 border-white/5 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-500" style={{ width: `${(step/2)*100}%` }} />

                    {step === 1 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold mb-2 text-slate-100">Patient Demographics</h2>
                                <p className="text-xs sm:text-sm text-slate-400">Do you have a preference for patient gender?</p>
                            </div>
                            <div className="space-y-4">
                                {["Male", "Female", "Any"].map((gender) => (
                                    <button
                                        key={gender}
                                        onClick={() => setPrefs({ ...prefs, genderPref: gender })}
                                        className={`w-full p-4 sm:p-6 rounded-2xl border flex items-center justify-between transition-all hover:bg-white/5 ${prefs.genderPref === gender ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/[0.02]'}`}
                                    >
                                        <span className="font-semibold text-slate-200">{gender} Patients</span>
                                        {prefs.genderPref === gender && <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold mb-2 text-slate-100">Clinical Focus</h2>
                                <p className="text-xs sm:text-sm text-slate-400">What is the target age group for your practice?</p>
                            </div>
                            <div className="space-y-4">
                                {["Pediatrics (0-18)", "General (18-60)", "Geriatrics (60+)", "All Ages"].map((age) => (
                                    <button
                                        key={age}
                                        onClick={() => setPrefs({ ...prefs, ageRange: age })}
                                        className={`w-full p-4 sm:p-6 rounded-2xl border flex items-center justify-between transition-all hover:bg-white/5 ${prefs.ageRange === age ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/[0.02]'}`}
                                    >
                                        <span className="font-semibold text-slate-200">{age}</span>
                                        {prefs.ageRange === age && <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"><Check size={14} className="text-white" /></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-12 flex flex-col-reverse sm:flex-row items-center justify-between gap-6 sm:gap-0 w-full">
                        <button 
                            disabled={step === 1}
                            onClick={() => setStep(step - 1)}
                            className={`text-xs font-black uppercase tracking-[0.2em] transition-opacity ${step === 1 ? 'opacity-0 hidden sm:block' : 'opacity-50 hover:opacity-100 w-full sm:w-auto py-2 sm:py-0 text-center'}`}
                        >
                            Back
                        </button>
                        <button 
                            onClick={handleNext}
                            className={`h-12 sm:h-14 px-6 sm:px-10 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 w-full sm:w-auto`}
                        >
                            {step === 2 ? "Save Profile" : "Continue"} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-center gap-8 opacity-30 grayscale pointer-events-none">
                    <Activity size={24} />
                    <Heart size={24} />
                    <Users size={24} />
                </div>
            </motion.div>
        </div>
    );
}
