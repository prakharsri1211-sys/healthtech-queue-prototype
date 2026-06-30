import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  Shield, 
  Stethoscope, 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  Microscope, 
  Syringe, 
  HeartPulse, 
  Thermometer,
  CloudLightning,
  ChevronRight,
  Sparkles,
  Clock
} from "lucide-react";

interface Capability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "triage" | "diagnostics" | "critical" | "general";
}

const CAPABILITIES: Capability[] = [
  {
    id: "wheelchairAccess",
    name: "Wheelchair Access",
    description: "Ensures the facility is fully accessible and navigable for wheelchair-bound patients.",
    icon: <Activity className="text-blue-400" />,
    category: "general"
  },
  {
    id: "pharmacyAttached",
    name: "Pharmacy Unit",
    description: "In-house or directly attached pharmacy for immediate medicine dispensing and E-records integration.",
    icon: <Syringe className="text-emerald-400" />,
    category: "general"
  },
  {
    id: "stretcherAvailable",
    name: "Stretcher Access",
    description: "Facility is equipped to handle stretcher-bound patients directly from emergency transports.",
    icon: <HeartPulse className="text-amber-400" />,
    category: "critical"
  },
  {
    id: "admitDepartment",
    name: "Admit Department",
    description: "In-patient admission capabilities and beds for extended observation or treatment.",
    icon: <Shield className="text-rose-500" />,
    category: "critical"
  }
];

export default function ClinicInfrastructure(): React.JSX.Element {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakStartTime, setBreakStartTime] = useState("");
  const [breakEndTime, setBreakEndTime] = useState("");

  const toggleCapability = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const loadFacilities = async () => {
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || !user.id) return;
      
      try {
        const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
        const res = await fetch(`${apiBase}/api/clinic-metadata/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.facilities && Array.isArray(data.facilities)) {
             setSelected(data.facilities);
          }
        }
        
        const docRes = await fetch(`${apiBase}/api/doctor/${user.id}/clinic-details`);
        if (docRes.ok) {
          const docData = await docRes.json();
          if (docData.startTime) setStartTime(docData.startTime.slice(0, 5));
          if (docData.endTime) setEndTime(docData.endTime.slice(0, 5));
          if (docData.breakStartTime) setBreakStartTime(docData.breakStartTime.slice(0, 5));
          if (docData.breakEndTime) setBreakEndTime(docData.breakEndTime.slice(0, 5));
        }
      } catch (err) {
        console.error("Error loading facilities:", err);
      }
    };
    loadFacilities();
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const user = userStr ? JSON.parse(userStr) : null;
    const docId = user?.doctorId || user?.id;
    if (docId) {
        try {
            const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
            await fetch(`${apiBase}/api/clinic-metadata/${docId}/facilities`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify(selected)
            });

            await fetch(`${apiBase}/api/doctor/${docId}/operating-hours`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    startTime: startTime || null,
                    endTime: endTime || null,
                    breakStartTime: breakStartTime || null,
                    breakEndTime: breakEndTime || null
                })
            });
        } catch (err) {
            console.error("Error saving facilities:", err);
        }
    } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    localStorage.removeItem("doctorProfile");
    setIsSubmitting(false);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/5 rounded-full blur-[140px] opacity-30" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => navigate("/doctor-onboarding")}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit"
              style={{ position: "relative", zIndex: 20 }}
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Return to Onboarding</span>
            </button>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/20 flex items-center justify-center">
                   <CloudLightning size={18} className="text-rose-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic">Infrastructure Capabilities</h1>
              </div>
              <p className="text-slate-500 max-w-xl text-sm font-bold leading-relaxed">
                Define the operational depth of your clinical unit. This configuration determines which specialized cases will be routed to your dashboard.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-10 h-16 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Synchronizing...</span>
            ) : (
              <>
                <span>Commit Configuration</span>
                <CheckCircle2 size={18} />
              </>
            )}
          </motion.button>
        </header>

        {/* Categories / Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Selected Assets", val: selected.length, color: "text-blue-400" },
            { label: "Deployment Level", val: selected.length > 4 ? "Tier 1" : "Basic", color: "text-rose-400" },
            { label: "Network Latency", val: "12ms", color: "text-emerald-400" },
            { label: "Sync Status", val: "Ready", color: "text-amber-400" },
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
              <span className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Global Operating Hours Section */}
        <div className="mb-12 p-8 rounded-[40px] border border-white/5 bg-white/[0.02] shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Global Clinic Hours</h2>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Base schedule for all available days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2"><CheckCircle2 size={14}/> Operational Window</label>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Start Time</span>
                     <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-blue-500/50 transition-colors" />
                  </div>
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">End Time</span>
                     <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-white outline-none focus:border-blue-500/50 transition-colors" />
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2"><CheckCircle2 size={14}/> Break Slot (Optional)</label>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Break Start</span>
                     <input type="time" value={breakStartTime} onChange={e => setBreakStartTime(e.target.value)} className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-amber-100 outline-none focus:border-amber-500/50 transition-colors" />
                  </div>
                  <div className="space-y-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-2">Break End</span>
                     <input type="time" value={breakEndTime} onChange={e => setBreakEndTime(e.target.value)} className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-amber-100 outline-none focus:border-amber-500/50 transition-colors" />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap) => (
            <motion.div
              key={cap.id}
              whileHover={{ y: -4 }}
              onClick={() => toggleCapability(cap.id)}
              className={`p-8 rounded-[40px] border transition-all cursor-pointer relative overflow-hidden group ${
                selected.includes(cap.id) 
                  ? "bg-white/10 border-white/20 shadow-2xl shadow-blue-500/10" 
                  : "bg-white/5 border-white/5 hover:border-white/10"
              }`}
            >
              {selected.includes(cap.id) && (
                <div className="absolute top-6 right-6 text-blue-400 animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 size={24} />
                </div>
              )}

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center mb-6 shadow-inner border border-white/5 transition-transform group-hover:scale-110 duration-500`}>
                  {cap.icon}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-white">{cap.name}</h3>
                    {selected.includes(cap.id) && <Sparkles size={14} className="text-blue-400 animate-pulse" />}
                  </div>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed pr-8">
                    {cap.description}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md bg-white/5 text-slate-400`}>
                    CAT: {cap.category}
                  </span>
                  {selected.includes(cap.id) && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400"
                    >
                      Active
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Decorative accent */}
              <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 transition-opacity duration-500 ${selected.includes(cap.id) ? "opacity-100" : ""}`} />
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <footer className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-600">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto text-center sm:text-left">
             <div className="flex items-center justify-center gap-2">
               <Shield size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Medical Compliance Verified</span>
             </div>
             <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-800" />
             <div className="flex items-center justify-center gap-2">
               <Activity size={16} />
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Global Telemetry Active</span>
             </div>
          </div>
          
          <button 
            onClick={() => navigate("/doctor-dashboard")}
            className="w-full sm:w-auto flex flex-row items-center justify-center gap-3 group px-8 py-4 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Bypass Registration</span>
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </footer>
      </div>
    </div>
  );
}
