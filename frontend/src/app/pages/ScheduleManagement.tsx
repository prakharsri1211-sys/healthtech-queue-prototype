import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Phone, ShieldAlert, Save, RefreshCw, TrendingUp, Users, Crown } from "lucide-react";
import { useNavigate } from "react-router";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths } from "date-fns";

const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

interface DayAvailability {
  id?: number;
  date: string; // YYYY-MM-DD
  isOpen: boolean;
  bookedCount: number;
  premiumCount?: number;
  standardCount?: number;
  startTime: string;
  endTime: string;
  premiumCapacity: number;
  standardCapacity: number;
}

export default function ScheduleManagement(): React.JSX.Element {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveMsgType, setSaveMsgType] = useState<"ok" | "err">("ok");
  const [dayConfig, setDayConfig] = useState({
    isOpen: false,
    startTime: "",
    endTime: "",
    premiumCapacity: 5,
    standardCapacity: 20,
  });
  const isPastSelected = selectedDate && selectedDate < new Date(new Date().setHours(0,0,0,0));
  // Track pending save so slider doesn't spam the API
  const [pendingSave, setPendingSave] = useState(false);

  // ── Refs to always hold the latest values (avoids stale-closure in effects) ──
  const availabilityRef = useRef<DayAvailability[]>([]);
  const selectedDateRef = useRef<Date | null>(null);
  const dayConfigRef = useRef(dayConfig);

  // Keep refs in sync
  useEffect(() => { availabilityRef.current = availability; }, [availability]);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  useEffect(() => { dayConfigRef.current = dayConfig; }, [dayConfig]);

  const getUser = () => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  };

  const getDoctorId = (u: any) => u?.doctorId || u?.id || 1;

  const [globalConfig, setGlobalConfig] = useState({
    startTime: "09:00",
    endTime: "17:00",
    breakStartTime: "",
    breakEndTime: ""
  });

  const fetchGlobalConfig = useCallback(async () => {
    const u = getUser();
    const docId = getDoctorId(u);
    try {
      const res = await fetch(`${API}/api/doctor/${docId}/clinic-details`);
      if (res.ok) {
        const data = await res.json();
        setGlobalConfig(prev => ({
          ...prev,
          startTime: data.startTime ? data.startTime.slice(0, 5) : "09:00",
          endTime: data.endTime ? data.endTime.slice(0, 5) : "17:00",
          breakStartTime: data.breakStartTime ? data.breakStartTime.slice(0, 5) : "",
          breakEndTime: data.breakEndTime ? data.breakEndTime.slice(0, 5) : ""
        }));
      }
    } catch (err) {
      console.error("Failed to fetch global config", err);
    }
  }, []);

  // Load from Backend
  const fetchAvailability = useCallback(async () => {
    const u = getUser();
    const token = u?.token;
    const docId = getDoctorId(u);



    try {
      setLoading(true);
      const resp = await fetch(`${API}/api/availability/doctor/${docId}`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        const mapped = data.map((e: any) => ({
           id: e.id,
           date: e.date,
           isOpen: !e.closed,
           bookedCount: e.bookedCount || 0,
           premiumCount: e.premiumCount || 0,
           standardCount: e.standardCount || 0,
           startTime: e.startTime ? e.startTime.slice(0, 5) : "",
           endTime: e.endTime ? e.endTime.slice(0, 5) : "",
           premiumCapacity: e.premiumCapacity || 0,
           standardCapacity: e.standardCapacity || 0
        }));
        setAvailability(mapped);
      } else {
        console.error("[ScheduleManagement] Failed to fetch availability:", resp.status);
      }
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
    fetchGlobalConfig();
  }, [fetchAvailability, fetchGlobalConfig]);

  // Keep dayConfig in sync when availability loads (avoids race condition when user clicks date before load completes)
  useEffect(() => {
    if (selectedDate) {
      const data = getDayData(selectedDate);
      if (data) {
        setDayConfig({
          isOpen: data.isOpen,
          startTime: data.startTime,
          endTime: data.endTime,
          premiumCapacity: data.premiumCapacity || 0,
          standardCapacity: data.standardCapacity || 0,
        });
      } else {
         // Default config for unconfigured days uses global config
         setDayConfig({
            isOpen: true,
            startTime: globalConfig.startTime,
            endTime: globalConfig.endTime,
            premiumCapacity: 10,
            standardCapacity: 30,
         });
      }
    }
  }, [availability, selectedDate, globalConfig]);

  // ── Auto-save: reads from refs so it always gets the LATEST state values ──
  useEffect(() => {
    if (!pendingSave) return;
    setPendingSave(false);

    // Read fresh values from refs — never stale
    const currentDate = selectedDateRef.current;
    const currentConfig = dayConfigRef.current;
    const currentAvailability = availabilityRef.current;

    if (!currentDate) return;

    const dateStr = format(currentDate, "yyyy-MM-dd");
    const u = getUser();
    const token = u?.token;
    
    // Resolve canonical doctorId
    let docId = u?.doctorId || u?.id || 1;
    
    console.log(`[ScheduleManagement] Sync Triggered - Date: ${dateStr}, Initial DocID: ${docId}`);

    const doSave = async () => {
      setSaving(true);
      setSaveMsg("SYNCING...");
      setSaveMsgType("ok");
      
      try {
        // Validation: If we suspect we are using an Account ID instead of a Doctor PK, 
        // the backend fallback in AvailabilityController usually handles it, 
        // but we verify here if the doctorId is actually the Account ID.
        
        const payload = {
          doctorId: docId,
          date: dateStr,
          startTime: currentConfig.startTime ? currentConfig.startTime + ":00" : null,
          endTime: currentConfig.endTime ? currentConfig.endTime + ":00" : null,
          closed: !currentConfig.isOpen,
          premiumCapacity: currentConfig.premiumCapacity,
          standardCapacity: currentConfig.standardCapacity,
        };

        console.log("[ScheduleManagement] Outgoing Payload:", payload);
        const saveUrl = `${API}/api/availability`;
        console.log("[ScheduleManagement] Sync Connection Target:", saveUrl);
        
        const resp = await fetch(saveUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          const saved = await resp.json();
          console.log("[ScheduleManagement] Save Success - Received ID:", saved.id);
          // Update local state with the returned DB id
          setAvailability(prev => {
            const exists = prev.find(e => e.date === dateStr);
            if (exists) {
              return prev.map(e => e.date === dateStr ? { ...e, id: saved.id } : e);
            } else {
              return [...prev, {
                id: saved.id,
                date: dateStr,
                isOpen: !saved.closed,
                bookedCount: 0,
                startTime: currentConfig.startTime,
                endTime: currentConfig.endTime,
                premiumCapacity: currentConfig.premiumCapacity,
                standardCapacity: currentConfig.standardCapacity,
              }];
            }
          });
          setSaveMsg("✓ SAVED");
          setSaveMsgType("ok");
        } else {
          const errText = await resp.text();
          console.error("[ScheduleManagement] Save Failed. Status:", resp.status, "Body:", errText);
          const cleanErr = errText.split("\n")[0].substring(0, 100);
          setSaveMsg(`SAVE FAILED (${resp.status}): ${cleanErr}`);
          setSaveMsgType("err");
        }
      } catch (e) {
        console.error("[ScheduleManagement] Network error:", e);
        setSaveMsg("✗ NETWORK ERROR");
        setSaveMsgType("err");
      } finally {
        setSaving(false);
        setTimeout(() => setSaveMsg(""), 3000);
      }
    };

    doSave();
  }, [pendingSave]);

  const getDayData = (date: Date): DayAvailability | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.find((e) => e.date === dateStr);
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    const data = getDayData(day);
    if (data) {
      setDayConfig({
        isOpen: data.isOpen,
        startTime: data.startTime,
        endTime: data.endTime,
        premiumCapacity: data.premiumCapacity || 0,
        standardCapacity: data.standardCapacity || 0,
      });
    } else {
      setDayConfig({ isOpen: false, startTime: "", endTime: "", premiumCapacity: 5, standardCapacity: 20 });
    }
  };

  // Update local state only; call triggerSave for immediate fields, not for slider (use Save button)
  const updateField = (field: "isOpen" | "startTime" | "endTime" | "premiumCapacity" | "standardCapacity", value: any, autoSave = true) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const newConfig = { ...dayConfig, [field]: value };
    setDayConfig(newConfig);

    setAvailability((prev) => {
      const exists = prev.find((e) => e.date === dateStr);
      if (exists) {
        return prev.map((e) =>
          e.date === dateStr
            ? { ...e, isOpen: newConfig.isOpen, startTime: newConfig.startTime, endTime: newConfig.endTime, premiumCapacity: newConfig.premiumCapacity, standardCapacity: newConfig.standardCapacity }
            : e
        );
      } else {
        return [...prev, { date: dateStr, isOpen: newConfig.isOpen, bookedCount: 0, startTime: newConfig.startTime, endTime: newConfig.endTime, premiumCapacity: newConfig.premiumCapacity, standardCapacity: newConfig.standardCapacity }];
      }
    });

    // Flag a pending save (runs in useEffect after state is committed)
    if (autoSave) {
      setPendingSave(true);
    }
  };

  const handleManualSave = () => {
    setPendingSave(true);
  };

  // Rendering logic
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = getDay(days[0]);

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0A0F1E] text-white p-4 sm:p-8 font-sans">
      <header className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6 sm:gap-0">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"><ChevronLeft size={24} /></button>
          <div><h1 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-3">Schedule Management<div className={`w-2 h-2 rounded-full bg-emerald-500 ${loading ? 'animate-pulse' : ''}`} /></h1><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Clinical Availability Sync System</p></div>
        </div>
        <div className="flex items-center gap-4">
           {saveMsg && (
             <div className={`px-6 py-3 border text-[10px] font-black uppercase tracking-widest rounded-2xl animate-in fade-in slide-in-from-right duration-300 ${
               saveMsgType === "ok"
                 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                 : "bg-rose-500/10 border-rose-500/20 text-rose-400"
             }`}>{saveMsg}</div>
           )}
           <button onClick={() => fetchAvailability()} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/10"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Calendar */}
        <div className="lg:col-span-8 glass-card p-6 sm:p-10 rounded-[48px] border border-white/5 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 sm:gap-0">
             <h2 className="text-2xl font-black tracking-tight">{format(currentMonth, "MMMM yyyy")}</h2>
             <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-3 bg-black/20 rounded-xl hover:bg-black/40"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 bg-black/20 rounded-xl hover:bg-black/40"><ChevronRight size={20} /></button>
             </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-4">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-500 uppercase py-2 tracking-widest">{d}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map((day, i) => {
              const data = getDayData(day);
              const isSel = selectedDate && isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              
              const isPast = day < new Date(new Date().setHours(0,0,0,0));
              
              let statusCol = "border-white/5 bg-white/[0.02]";
              if (data) {
                if (!data.isOpen) {
                  statusCol = "border-rose-500/40 bg-rose-500/10"; // RED: Closed
                } else {
                  const maxCap = (data.premiumCapacity || 0) + (data.standardCapacity || 0);
                  const util = data.bookedCount / (maxCap || 1);
                  if (util >= 1.0) statusCol = "border-rose-500 bg-rose-500/20"; // RED: Full
                  else if (util >= 0.7) statusCol = "border-amber-500 bg-amber-500/10"; // AMBER: Busy
                  else statusCol = "border-emerald-500/30 bg-emerald-500/5"; // GREEN: Available
                }
              }
              if (isPast) statusCol = "border-white/5 bg-slate-900/50 opacity-20 pointer-events-none grayscale";
              if (isSel) statusCol = "border-sky-500 bg-sky-500/30 ring-2 ring-sky-500/50";

              return (
                <button 
                  key={i} 
                  onClick={() => !isPast && handleDateClick(day)} 
                  disabled={isPast}
                  style={{ pointerEvents: isPast ? 'none' : 'auto' }}
                  className={`aspect-square rounded-full border flex flex-col items-center justify-center relative transition-all group active:scale-95 ${statusCol}`}
                >
                  <span className={`text-sm sm:text-base font-semibold ${isSel ? 'text-white' : 'text-slate-200'}`}>{format(day, "d")}</span>
                  
                  {/* Indicators underneath the text (Android Calendar style) */}
                  <div className="absolute bottom-1.5 sm:bottom-2.5 flex items-center justify-center gap-1">
                    {data?.isOpen && !isPast && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />}
                    {isTodayDay && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass-card p-6 sm:p-10 rounded-[48px] border border-white/5 bg-gradient-to-br from-white/5 via-transparent to-transparent">
              <h3 className="text-lg font-black uppercase tracking-widest text-slate-400 mb-8 pb-4 border-b border-white/5">Session Guard</h3>
              
              {!selectedDate ? (
                 <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30"><ShieldAlert size={48} /><p className="text-xs font-black uppercase tracking-widest">Select Date to Edit</p></div>
              ) : (
                 <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-500">
                    {/* Selected date display */}
                    <div className="text-center text-xs font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 rounded-2xl py-2 px-4">
                      {format(selectedDate, "EEEE, dd MMM yyyy")}
                    </div>

                    <div className="flex justify-between items-center">
                       <label className="text-xs font-black uppercase tracking-widest">Operational Status</label>
                       <button
                         id="operational-status-toggle"
                         onClick={() => !isPastSelected && updateField("isOpen", !dayConfig.isOpen)}
                         disabled={isPastSelected}
                         className={`w-20 h-10 rounded-full relative transition-all duration-500 p-1 ${isPastSelected ? 'bg-slate-800 opacity-50 cursor-not-allowed' : (dayConfig.isOpen ? 'bg-emerald-500' : 'bg-slate-700')}`}
                       >
                         <div className={`w-8 h-8 rounded-full bg-white shadow-xl transition-all duration-500 ${dayConfig.isOpen ? 'translate-x-10' : 'translate-x-0'}`} />
                       </button>
                    </div>

                    <div className="space-y-4">
                       <label className="text-xs font-black uppercase tracking-widest text-slate-500">Clinical Hours</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <span className="text-[10px] font-black uppercase text-slate-600">Start</span>
                             <input
                               type="time"
                               value={dayConfig.startTime}
                               onChange={e => updateField("startTime", e.target.value)}
                               disabled={isPastSelected}
                               className={`w-full h-14 bg-black/20 rounded-2xl border border-white/5 px-4 font-black outline-none focus:border-sky-500/50 ${isPastSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                             />
                          </div>
                          <div className="space-y-2">
                             <span className="text-[10px] font-black uppercase text-slate-600">End</span>
                             <input
                               type="time"
                               value={dayConfig.endTime}
                               onChange={e => updateField("endTime", e.target.value)}
                               disabled={isPastSelected}
                               className={`w-full h-14 bg-black/20 rounded-2xl border border-white/5 px-4 font-black outline-none focus:border-sky-500/50 ${isPastSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                             />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <label className="text-xs font-black uppercase tracking-widest text-slate-500">Slot Allocation</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                           <div className="flex items-center gap-2 mb-2">
                             <Crown size={14} className="text-amber-500" />
                             <span className="text-[10px] font-black uppercase text-amber-500">Premium Slots</span>
                           </div>
                           <input
                             type="number"
                             min="0"
                             value={dayConfig.premiumCapacity}
                             onChange={e => updateField("premiumCapacity", parseInt(e.target.value) || 0, false)}
                             onBlur={() => setPendingSave(true)}
                             className="w-full bg-black/20 border border-amber-500/20 rounded-xl py-2 px-4 text-white font-black outline-none"
                           />
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-500/10 border border-white/5">
                           <div className="flex items-center gap-2 mb-2">
                             <Users size={14} className="text-slate-400" />
                             <span className="text-[10px] font-black uppercase text-slate-400">Standard Slots</span>
                           </div>
                           <input
                             type="number"
                             min="0"
                             value={dayConfig.standardCapacity}
                             onChange={e => updateField("standardCapacity", parseInt(e.target.value) || 0, false)}
                             onBlur={() => setPendingSave(true)}
                             className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white font-black outline-none"
                           />
                         </div>
                       </div>
                    </div>

                    {/* Intelligent Distribution Monitor */}
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Physician Intelligence</span>
                          <TrendingUp size={14} className="text-emerald-500" />
                       </div>
                       <div className="space-y-4">
                          <div className="flex flex-col gap-1">
                             <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Total Daily Bookings</p>
                             <p className="text-2xl font-bold text-white">{getDayData(selectedDate)?.bookedCount || 0} <span className="text-sm font-medium text-slate-500 italic">Patients</span></p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-2 mb-1">
                                   <Crown size={12} className="text-emerald-500" />
                                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Premium Elite</p>
                                </div>
                                <p className="text-xl font-black text-white">{getDayData(selectedDate)?.premiumCount || 0} Slots</p>
                             </div>
                             <div className="p-4 rounded-2xl bg-slate-500/10 border border-white/5">
                                <div className="flex items-center gap-2 mb-1">
                                   <Users size={12} className="text-slate-400" />
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Standard Gen</p>
                                </div>
                                <p className="text-xl font-black text-white">{getDayData(selectedDate)?.standardCount || 0} Slots</p>
                             </div>
                          </div>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-emerald-500" style={{ width: '40%' }} />
                          <div className="h-full bg-slate-700" style={{ width: '60%' }} />
                       </div>
                       <p className="text-[9px] font-bold text-slate-600 uppercase italic">Tier-specific visualization enabled for priority handling.</p>
                    </div>

                    {/* Explicit Save Button */}
                    <button
                      id="save-schedule-btn"
                      onClick={handleManualSave}
                      disabled={saving}
                      className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 ${
                        saving
                          ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      {saving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                      ) : (
                        <><Save size={18} />Save Schedule</>
                      )}
                    </button>
                 </div>
              )}
           </div>

           <div className="p-4 sm:p-8 rounded-[40px] bg-sky-500/5 border border-sky-500/10"><p className="text-[10px] font-bold text-sky-400/60 uppercase leading-relaxed tracking-wider mb-6">Schedule changes are broadcasted in real-time to the Patient Booking Portal. Ensure clinical accuracy before persisting.</p><div className="flex gap-4"><div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500"><ShieldAlert size={20} /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-sky-500">Global Deployment</span><span className="text-xs font-black text-sky-300">Live Sync Enabled</span></div></div></div>
        </div>
      </main>
    </div>
  );
}
