import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Activity,
  Shield,
  Stethoscope,
  Zap,
  ArrowLeft,
  Microscope,
  HeartPulse,
  CloudLightning,
  Sparkles,
} from "lucide-react";

/* ── Static Clinic Infrastructure Capabilities ── */
const ALL_CAPABILITIES = [
  {
    id: "triage-1",
    name: "Automated Triage",
    description: "AI-assisted patient prioritization and initial screening protocol.",
    icon: <Activity className="text-blue-400" />,
    category: "triage",
  },
  {
    id: "diag-1",
    name: "Vitals Telemetry",
    description: "Real-time synchronization of blood pressure, SpO2, and heart rate.",
    icon: <HeartPulse className="text-emerald-400" />,
    category: "diagnostics",
  },
  {
    id: "critical-1",
    name: "Oxygen Infrastructure",
    description: "Centralized O2 supply and monitoring for emergency stabilization.",
    icon: <Zap className="text-rose-400" />,
    category: "critical",
  },
  {
    id: "general-1",
    name: "Digital Prescriptions",
    description: "E-record integration and pharmacy network synchronization.",
    icon: <Stethoscope className="text-amber-400" />,
    category: "general",
  },
  {
    id: "diag-2",
    name: "Pathology Integration",
    description: "Direct lab-to-dashboard report transmission pipeline.",
    icon: <Microscope className="text-indigo-400" />,
    category: "diagnostics",
  },
  {
    id: "critical-2",
    name: "ER Stabilization",
    description: "Critical care equipment for immediate life-support intervention.",
    icon: <Shield className="text-rose-500" />,
    category: "critical",
  },
];

export default function UnauthorizedPage(): React.JSX.Element {
  const navigate = useNavigate();
  const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

  const [doctorSpeciality, setDoctorSpeciality] = useState<string>("");
  const [clinicDetails, setClinicDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real doctor data from the booking context
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
        const u = userStr ? JSON.parse(userStr) : null;
        const token = u?.token;
        const bookingInfo = localStorage.getItem("bookingInfo");
        let doctorId: string | null = null;

        if (bookingInfo) {
          try {
            const parsed = JSON.parse(bookingInfo);
            doctorId = parsed.doctorId ? String(parsed.doctorId) : null;
          } catch (e) {}
        }

        if (doctorId && token) {
          const res = await fetch(`${API}/api/doctor/${doctorId}/details`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setClinicDetails(data);
            setDoctorSpeciality(data.speciality || "");
          }
        }
      } catch (e) {
        console.error("[UnauthorizedPage] Failed to load clinic details:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchClinicData();
  }, [API]);

  // Determine which capabilities are actually active based on clinic data
  const activeCapabilities = clinicDetails
    ? ALL_CAPABILITIES.filter((cap) => {
        if (cap.id === "general-1" && clinicDetails.pharmacyAvailable) return true;
        if (cap.id === "critical-1" && clinicDetails.oxygenAvailable) return true;
        if (cap.id === "triage-1" && clinicDetails.triageAvailable) return true;
        if (cap.id === "diag-1" && clinicDetails.vitalsAvailable) return true;
        if (cap.id === "diag-2" && clinicDetails.pathologyAvailable) return true;
        if (cap.id === "critical-2" && clinicDetails.erAvailable) return true;
        return false;
      })
    : [];

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
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit"
              style={{ position: "relative", zIndex: 20 }}
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center">
                  <Sparkles size={18} className="text-blue-400" />
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                  Clinic Overview
                </h1>
              </div>
              <p className="text-slate-500 max-w-xl text-sm font-bold leading-relaxed">
                A read-only view of clinical infrastructure capabilities available at this clinic.
              </p>
            </div>
          </div>
        </header>

        {/* ═══ Doctor Speciality ═══ */}
        {doctorSpeciality && (
          <section className="mb-12">
            <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Doctor Speciality
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Stethoscope size={20} />
                </div>
                <span className="text-lg font-bold">{doctorSpeciality}</span>
              </div>
            </div>
          </section>
        )}

        {/* ═══ SECTION 1: Infrastructure Capabilities ═══ */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/20 flex items-center justify-center">
              <CloudLightning size={20} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">Infrastructure Capabilities</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Operational capabilities deployed across clinical units
              </p>
            </div>
          </div>

          {/* Capability Cards — only show if doctor has configured them */}
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading clinic details...</div>
          ) : activeCapabilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCapabilities.map((cap) => (
                <motion.div
                  key={cap.id}
                  whileHover={{ y: -4 }}
                  className="p-8 rounded-3xl border bg-white/5 border-white/5 hover:border-white/10 transition-all relative overflow-hidden group"
                >
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center mb-6 shadow-inner border border-white/5 transition-transform group-hover:scale-110 duration-500">
                      {cap.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black tracking-tight">{cap.name}</h3>
                      <p className="text-slate-500 text-xs font-bold leading-relaxed pr-8">
                        {cap.description}
                      </p>
                    </div>
                    <div className="mt-8 flex items-center gap-3">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg bg-white/5 text-slate-400">
                        CAT: {cap.category}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] text-center text-slate-500">
              <p className="text-sm font-bold">No infrastructure details have been configured by the doctor yet.</p>
            </div>
          )}
        </section>

        {/* ═══ Patient Demographics (only doctor-selected) ═══ */}
        {clinicDetails && (clinicDetails.genderPreference || clinicDetails.ageGroup) && (
          <section className="mb-20">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
              Patient Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clinicDetails.genderPreference && (
                <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                    Gender Preference
                  </h4>
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <span className="font-bold text-sm">{clinicDetails.genderPreference}</span>
                  </div>
                </div>
              )}
              {clinicDetails.ageGroup && (
                <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">
                    Target Age Group
                  </h4>
                  <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <span className="font-bold text-sm">{clinicDetails.ageGroup}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Medical Compliance Verified</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-800" />
            <div className="flex items-center gap-2">
              <Activity size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Global Telemetry Active</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
