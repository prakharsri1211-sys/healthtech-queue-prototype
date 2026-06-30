import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
    ChevronLeft, ChevronRight, Activity, Heart, Thermometer, Brain,
    Baby, Eye, Star, MapPin, Stethoscope, Loader2, AlertCircle, RefreshCw, Clock
} from "lucide-react";

// ─── Icon mapping ────────────────────────────────────────────────────────────
// Maps known specialty keywords to a colour gradient + icon.
// Any specialty NOT listed here falls back to a generic icon/gradient.
const SPECIALTY_STYLES: Record<string, { icon: React.ReactElement; gradient: string }> = {
    "general": { icon: <Thermometer size={28} />, gradient: "from-teal-500/20 to-emerald-500/20" },
    "cardio": { icon: <Heart size={28} />, gradient: "from-rose-500/20 to-orange-500/20" },
    "ortho": { icon: <Activity size={28} />, gradient: "from-blue-500/20 to-indigo-500/20" },
    "neuro": { icon: <Brain size={28} />, gradient: "from-purple-500/20 to-fuchsia-500/20" },
    "pedia": { icon: <Baby size={28} />, gradient: "from-amber-500/20 to-yellow-500/20" },
    "ophthal": { icon: <Eye size={28} />, gradient: "from-sky-500/20 to-cyan-500/20" },
    "dentist": { icon: <Stethoscope size={28} />, gradient: "from-pink-500/20 to-rose-500/20" },
};

const FALLBACK_GRADIENTS = [
    "from-violet-500/20 to-purple-500/20",
    "from-cyan-500/20 to-teal-500/20",
    "from-lime-500/20 to-green-500/20",
    "from-orange-500/20 to-amber-500/20",
    "from-blue-500/20 to-sky-500/20",
    "from-fuchsia-500/20 to-pink-500/20",
];

function getSpecialtyStyle(name: string, index: number): { icon: React.ReactElement; gradient: string } {
    const lower = name.toLowerCase();
    for (const [key, style] of Object.entries(SPECIALTY_STYLES)) {
        if (lower.includes(key)) return style;
    }
    return {
        icon: <Stethoscope size={28} />,
        gradient: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
    };
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface SpecialtyItem {
    name: string;
    doctorCount: number;
}

interface DoctorItem {
    id: number;
    name: string;
    speciality: string;
    qualification: string;
    clinicAddress: string;
    pharmacyAvailable: boolean;
    wheelchairAccessible: boolean;
    startTime?: string;
    endTime?: string;
    experience?: string;
    rating?: number;
    consultationFee?: number;
    estimatedWaitTime?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SpecialtySelectionPage(): React.JSX.Element | null {
    const navigate = useNavigate();
    const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

    // ── STRICT INLINE ROUTE GUARD ──
    const [isBlocked, setIsBlocked] = useState(() => {
        const info = localStorage.getItem("bookingInfo");
        if (info) {
            try {
                const parsed = JSON.parse(info);
                const todayStr = new Date().toISOString().split("T")[0];
                const patientStr = sessionStorage.getItem("selectedPatient");
                let currentPatientId = null;
                if (patientStr) {
                    const p = JSON.parse(patientStr);
                    currentPatientId = String(p.id || p.patientId);
                }
                
                if (parsed.date === todayStr && parsed.status !== "COMPLETED" && parsed.status !== "CANCELLED" && parsed.status !== "NO_SHOW" && String(parsed.patientId) === currentPatientId) {
                    return true;
                }
            } catch (e) {}
        }
        return false;
    });

    useEffect(() => {
        if (isBlocked) {
            navigate("/tracker", { replace: true });
        }
    }, [isBlocked, navigate]);

    const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
    const [doctors, setDoctors] = useState<DoctorItem[]>([]);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
    const [loadingSpecialties, setLoadingSpecialties] = useState(true);
    const [loadingDoctors, setLoadingDoctors] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch all distinct specialties on mount ──────────────────────────────
    const fetchSpecialties = async () => {
        const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
        const u = userStr ? JSON.parse(userStr) : null;
        const token = u?.token;

        setLoadingSpecialties(true);
        setError(null);
        try {
            const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
            const specUrl = `${apiBase}/api/specialties`;
            console.log(`[HealthScope] Syncing Clinical Specialties from: ${specUrl}`);
            
            const res = await fetch(specUrl, {
                headers: { "Authorization": token ? `Bearer ${token}` : "" }
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data: SpecialtyItem[] = await res.json();
            setSpecialties(data);
        } catch (err: any) {
            setError("Unable to load specialties. Check the backend is running.");
        } finally {
            setLoadingSpecialties(false);
        }
    };

    useEffect(() => { fetchSpecialties(); }, []);

    useEffect(() => {
        const checkActive = async () => {
            const patientStr = sessionStorage.getItem("selectedPatient");
            if (!patientStr) return;
            const p = JSON.parse(patientStr);
            const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
            const u = userStr ? JSON.parse(userStr) : null;
            const token = u?.token;

            try {
                const resp = await fetch(`${API}/api/appointments/patient/${p.id}/check-active`, {
                    headers: { "Authorization": token ? `Bearer ${token}` : "" }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.todayAppointment) {
                        console.log("[BookingGuard] Found active appointment via API. Redirecting.");
                        localStorage.setItem("bookingInfo", JSON.stringify(data.todayAppointment));
                        navigate("/tracker", { replace: true });
                        return;
                    }
                }
            } catch (e) {
                console.error("Redirection check failed", e);
            }

            // Fallback: Local Storage
            const info = localStorage.getItem("bookingInfo");
            if (info) {
                try {
                    const parsed = JSON.parse(info);
                    const todayStr = new Date().toISOString().split("T")[0];
                    if (parsed.date === todayStr && parsed.status !== "COMPLETED" && parsed.status !== "CANCELLED" && parsed.status !== "NO_SHOW" && String(parsed.patientId) === String(p.id || p.patientId)) {
                        navigate("/tracker", { replace: true });
                    }
                } catch (e) {}
            }
        };
        checkActive();
    }, [navigate, API]);

    // ── Session Guard: Ensure patient is selected
    useEffect(() => {
        const patient = sessionStorage.getItem("selectedPatient");
        if (!patient) {
            console.warn("[Security] No patient selected. Returning to portal.");
            navigate("/patient-portal");
        }
    }, [navigate]);

    // ── Fetch doctors when a specialty is selected ───────────────────────────
    const handleSelectSpecialty = async (name: string) => {
        const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
        const u = userStr ? JSON.parse(userStr) : null;
        const token = u?.token;

        setSelectedSpecialty(name);
        setLoadingDoctors(true);
        setError(null);
        try {
            const encoded = encodeURIComponent(name);
            const res = await fetch(`${API}/api/specialties/${encoded}/doctors`, {
                headers: { "Authorization": token ? `Bearer ${token}` : "" }
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data: DoctorItem[] = await res.json();
            setDoctors(data);
        } catch (err: any) {
            setError("Unable to load doctors for this specialty.");
            setDoctors([]);
        } finally {
            setLoadingDoctors(false);
        }
    };

    const handleBack = () => {
        if (selectedSpecialty) {
            setSelectedSpecialty(null);
            setDoctors([]);
            setError(null);
        } else {
            navigate(-1);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    if (isBlocked) return null;

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-sky-500/30">
            {/* Ambient glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative max-w-lg mx-auto px-6 py-10">
                {/* ── Header ── */}
                <header className="mb-10 animate-in fade-in slide-in-from-top duration-700">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white w-fit mb-6 sm:mb-8 shrink-0"
                    >
                        <ChevronLeft size={16} />
                        <span className="translate-y-[1px]">Back</span>
                    </button>

                    <h1 className="text-4xl font-black tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        {selectedSpecialty ? "Select Doctor" : "Health Scope"}
                    </h1>
                    <p className="text-slate-400 font-medium leading-relaxed">
                        {selectedSpecialty
                            ? `Showing specialists in ${selectedSpecialty}`
                            : "Select a clinical path to discover specialized care."}
                    </p>
                </header>

                {/* ── Error banner ── */}
                {error && (
                    <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <AlertCircle size={18} className="shrink-0" />
                        <p className="text-sm font-bold flex-1">{error}</p>
                        <button
                            onClick={() => selectedSpecialty ? handleSelectSpecialty(selectedSpecialty) : fetchSpecialties()}
                            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:text-rose-300 transition-colors"
                        >
                            <RefreshCw size={14} /> Retry
                        </button>
                    </div>
                )}

                {/* ── Specialty grid ── */}
                {!selectedSpecialty && (
                    <>
                        {loadingSpecialties ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 size={40} className="text-sky-400 animate-spin" />
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Loading Specialties…</p>
                            </div>
                        ) : specialties.length === 0 && !error ? (
                            <div className="text-center py-24 glass-card-dark border-dashed border-white/10">
                                <Activity size={48} className="mx-auto mb-4 text-slate-600" />
                                <h3 className="text-lg font-bold text-slate-400">No Specialties Found</h3>
                                <p className="text-sm text-slate-500 mt-1">No doctors have been registered yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-700">
                                {specialties.map((spec, i) => {
                                    const style = getSpecialtyStyle(spec.name, i);
                                    return (
                                        <button
                                            key={spec.name}
                                            id={`specialty-${spec.name.replace(/\s+/g, "-").toLowerCase()}`}
                                            onClick={() => handleSelectSpecialty(spec.name)}
                                            className="group relative overflow-hidden glass-card-dark p-6 text-left transition-all duration-300 active:scale-95 border-white/5 hover:border-sky-500/30"
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center bg-gradient-to-br ${style.gradient} border border-white/10 group-hover:border-sky-500/50 transition-colors`}>
                                                <div className="text-sky-400 group-hover:scale-110 transition-transform duration-500">
                                                    {style.icon}
                                                </div>
                                            </div>
                                            <h3 className="text-base font-bold mb-1 leading-tight">{spec.name}</h3>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-sky-400 transition-colors">
                                                {spec.doctorCount} {spec.doctorCount === 1 ? "Doctor" : "Doctors"} Available
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── Doctor list ── */}
                {selectedSpecialty && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-700">
                        {loadingDoctors ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <Loader2 size={40} className="text-sky-400 animate-spin" />
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Loading Doctors…</p>
                            </div>
                        ) : doctors.length === 0 && !error ? (
                            <div className="text-center py-20 glass-card-dark border-dashed border-white/10">
                                <Activity size={48} className="mx-auto mb-4 text-slate-600" />
                                <h3 className="text-lg font-bold text-slate-400">No Doctors Found</h3>
                                <p className="text-sm text-slate-500">No registered doctors for this specialty yet.</p>
                            </div>
                        ) : (
                            doctors.map((doc, i) => (
                                <div
                                    key={doc.id}
                                    id={`doctor-card-${doc.id}`}
                                    className="glass-card-dark p-5 border-white/5 hover:border-sky-500/20 transition-all group"
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    <div className="flex gap-5 items-center mb-5">
                                        <div className="relative shrink-0">
                                            <div className="absolute inset-0 bg-sky-500/10 blur-xl rounded-full" />
                                            <img 
                                                src="/doctor-avatar.png" 
                                                alt="Doctor" 
                                                className="relative z-10 w-16 h-16 rounded-2xl border border-white/10 shadow-lg object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 
                                                onClick={() => navigate(`/doctor-profile/${doc.id}`)}
                                                className="text-xl font-bold truncate cursor-pointer hover:text-sky-400 transition-colors"
                                            >
                                                {doc.name}
                                            </h3>
                                            <p className="text-xs font-bold uppercase tracking-wider text-sky-400 mt-0.5">
                                                {doc.speciality}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {doc.qualification && (
                                                    <span className="text-xs text-slate-400 font-medium">{doc.qualification}</span>
                                                )}
                                                {doc.experience && (
                                                    <>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="text-xs text-slate-400 font-medium">{doc.experience} Exp</span>
                                                    </>
                                                )}
                                                {doc.rating && (
                                                    <>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="flex items-center gap-0.5 text-xs text-amber-400 font-bold">
                                                            <Star size={10} fill="currentColor" /> {doc.rating}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold text-emerald-400">₹{doc.consultationFee || 500} Consultation</span>
                                                {doc.estimatedWaitTime && (
                                                    <div className="mt-1 flex items-center gap-1.5 bg-orange-500/10 w-fit px-2 py-1 rounded-md border border-orange-500/20">
                                                        <Clock size={12} className="text-orange-400" />
                                                        <span className="text-xs text-orange-400 font-medium">Wait: {doc.estimatedWaitTime.replace('m', ' mins')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta row */}
                                    <div className="flex flex-wrap gap-3 mb-5">
                                        {doc.clinicAddress && (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                <MapPin size={13} className="text-sky-400 shrink-0" />
                                                <span className="truncate max-w-[180px]">{doc.clinicAddress}</span>
                                            </div>
                                        )}
                                        {doc.startTime && doc.endTime && (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                <span className="text-emerald-400 font-bold">⏰</span>
                                                <span>{doc.startTime} – {doc.endTime}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Facility badges */}
                                    <div className="flex gap-2 mb-5">
                                        {doc.pharmacyAvailable && (
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Pharmacy
                                            </span>
                                        )}
                                        {doc.wheelchairAccessible && (
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Wheelchair
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                        <button
                                            id={`book-btn-${doc.id}`}
                                            onClick={() => navigate("/booking", { state: { doctor: doc } })}
                                            className="flex-[2] h-14 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Activity size={18} />
                                            Book Now
                                        </button>
                                        <button
                                            id={`profile-btn-${doc.id}`}
                                            onClick={() => navigate(`/doctor-profile/${doc.id}`)}
                                            className="flex-1 h-14 bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-400 group/profile"
                                            title="View Clinical Profile"
                                        >
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-sky-500/30 group-hover/profile:scale-110 transition-transform shrink-0">
                                                <img src="/doctor-avatar.png" alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                            <span className="hidden sm:inline">Specialist Info</span>
                                            <span className="sm:hidden">Info</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
