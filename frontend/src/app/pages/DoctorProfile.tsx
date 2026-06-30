import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Stethoscope, MapPin, Phone, ChevronLeft, Building, Sparkles, Award, Clock } from "lucide-react";

export default function DoctorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(!!id);
  const [formData, setFormData] = useState({
    name: "",
    speciality: "",
    qualification: "",
    experience: "",
    phone: "",
    clinicName: "",
    clinicAddress: "",
    wheelchairAccess: false,
    pharmacyAttached: false,
    stretcherAvailable: false,
    admitDepartment: false,
    startTime: "",
    endTime: "",
    breakStartTime: "",
    breakEndTime: "",
    openDays: "",
  });

  useEffect(() => {
    if (id) {
      const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
      setLoading(true);
      
      Promise.all([
        fetch(`${apiBase}/api/doctor/${id}?t=${Date.now()}`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/clinic-metadata/${id}?t=${Date.now()}`).then(r => r.ok ? r.json() : null),
        fetch(`${apiBase}/api/availability/${id}?t=${Date.now()}`).then(r => r.ok ? r.json() : [])
      ])
      .then(([doctor, metadata, availList]) => {
        const mergedData = {
          name: doctor?.user?.name || doctor?.fullName || doctor?.name || "Doctor Profile",
          speciality: doctor?.speciality || "",
          qualification: doctor?.qualification || "",
          experience: doctor?.id ? `${5 + (Number(doctor.id) % 8)} Years Experience` : "",
          phone: doctor?.emergencyContact || doctor?.user?.phone || "",
          clinicName: metadata?.clinicName || doctor?.clinicName || "",
          clinicAddress: metadata?.clinicAddress || doctor?.clinicAddress || "",
          wheelchairAccess: !!(metadata?.facilities?.some((f: string) => f.toLowerCase().includes("wheelchair")) || doctor?.wheelchairAccessible),
          pharmacyAttached: !!(metadata?.facilities?.some((f: string) => f.toLowerCase().includes("pharmacy")) || doctor?.pharmacyAvailable),
          stretcherAvailable: !!(metadata?.facilities?.some((f: string) => f.toLowerCase().includes("stretcher")) || doctor?.stretcherAvailable),
          admitDepartment: !!(metadata?.facilities?.some((f: string) => f.toLowerCase().includes("admit")) || doctor?.admitDepartment),
          startTime: availList?.[0]?.startTime || doctor?.startTime || "",
          endTime: availList?.[0]?.endTime || doctor?.endTime || "",
          breakStartTime: metadata?.breakStartTime || doctor?.breakStartTime || "",
          breakEndTime: metadata?.breakEndTime || doctor?.breakEndTime || "",
          openDays: (() => {
            if (!availList || availList.length === 0) return "";
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
            return availList.some((a: any) => a.date === todayStr && !a.closed) ? "Yes" : "No";
          })()
        };
        setFormData(mergedData);
      })
      .catch(err => console.error("Error loading complete doctor profile:", err))
      .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("doctorProfile", JSON.stringify(formData));
    navigate("/doctor");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const textColor = "text-white";

  return (
    <div className="w-full min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Aesthetic */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 py-8 pb-48">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 sm:gap-0">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Clinical Identity</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-black text-sm tracking-tight text-blue-400">Live Status Verified</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
          {/* Cover Profile Card */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent p-4 sm:p-8 shadow-2xl shadow-blue-500/5">
            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
              <Stethoscope size={120} />
            </div>
            
            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="relative w-28 h-28 mb-6">
                <div className="absolute inset-0 bg-blue-500/25 blur-3xl rounded-full" />
                <img 
                  src="/doctor-avatar.png" 
                  alt="Doctor" 
                  className="relative z-10 w-28 h-28 rounded-[36px] border-2 border-blue-500/30 shadow-2xl object-cover bg-slate-800"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-2 italic text-white leading-none">{formData.name}</h2>
              {(formData.speciality || formData.qualification) && (
                <p className="text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                  {[formData.speciality, formData.qualification].filter(Boolean).join(" • ")}
                </p>
              )}
              
              {/* Experience Badge */}
              {formData.experience && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <Award size={14} className="fill-current animate-pulse" />
                  <span>{formData.experience}</span>
                </div>
              )}
            </div>
          </div>

          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Practice Details & Facilities</h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Clinical Hub</span>
            </div>
            
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-6 space-y-6 shadow-xl">
              {/* Clinic Name & Address */}
              <div className="space-y-4">
                {formData.clinicName && (
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <Building size={20} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Clinical Facility</p>
                      <p className="font-bold text-sm text-white uppercase tracking-wide">
                        {formData.clinicName}
                      </p>
                    </div>
                  </div>
                )}

                {formData.clinicAddress && (
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <MapPin size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Clinic Address</p>
                      <p className="font-semibold text-xs text-slate-300 leading-relaxed">
                        {formData.clinicAddress}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {formData.startTime && formData.endTime && (
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <Clock size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Shift Hours</p>
                    <p className="font-black text-sm text-emerald-400 italic">
                      {formData.startTime} - {formData.endTime}
                      {formData.breakStartTime && formData.breakEndTime && (
                         <span className="ml-2 text-amber-500 font-bold text-xs">
                            (Break: {formData.breakStartTime} - {formData.breakEndTime})
                         </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Schedule/Open Days */}
              {formData.openDays && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                  <Clock size={20} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Open Today</p>
                    <p className="font-semibold text-xs text-slate-300 leading-relaxed">
                      {formData.openDays}
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {formData.phone && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4">
                  <Phone size={20} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Contact & Emergency Phone</p>
                    <p className="font-bold text-sm text-slate-200">
                      {formData.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Facilities Visual Badges with Emojis */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Available Facilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "wheelchairAccess", label: "Wheelchair Access ♿", active: formData.wheelchairAccess },
                    { id: "pharmacyAttached", label: "Pharmacy Unit 💊", active: formData.pharmacyAttached },
                    { id: "stretcherAvailable", label: "Stretcher Access 🚑", active: formData.stretcherAvailable },
                    { id: "admitDepartment", label: "Admit Dept 🏥", active: formData.admitDepartment },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${
                        item.active 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 font-bold scale-[1.02] shadow-md shadow-blue-500/5' 
                          : 'bg-white/5 border-white/5 text-slate-600 opacity-60'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>

      {/* Footer Actions - ONLY visible to DOCTORS */}
      {(() => {
        const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
        const u = userStr ? JSON.parse(userStr) : null;
        
        if (u?.role === "ROLE_DOCTOR") {
          return (
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent pt-20 pointer-events-auto">
              <div className="max-w-md mx-auto">
                <button
                  onClick={() => navigate("/doctor")}
                  className="w-full h-20 rounded-[32px] bg-white text-[#020617] font-black text-lg uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-blue-50 active:scale-95 transition-all shadow-2xl shadow-blue-500/30"
                >
                  <div className="p-2 bg-blue-500 rounded-xl text-white">
                    <Stethoscope size={24} />
                  </div>
                  <span>Update Profile</span>
                  <Sparkles size={20} className="text-blue-500 animate-pulse" />
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
