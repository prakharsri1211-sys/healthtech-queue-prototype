import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { Calendar, Clock, Crown, Ticket, ChevronLeft, ChevronRight, AlertCircle, ArrowRight, Sparkles, ShieldCheck, Stethoscope, MapPin, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { BookingEtaBar } from "../components/patient/BookingEtaBar";

type BookingTier = "premium" | "free" | null;

const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

interface FullAvailability {
  date: string;
  isOpen: boolean;
  bookedCount: number;
  patientCapacity: number;
  startTime?: string;
  endTime?: string;
}

export default function Booking() {
  const navigate = useNavigate();

  // ── STRICT INLINE ROUTE GUARD ──
  const [isBlocked, setIsBlocked] = useState(() => {
      const info = localStorage.getItem("bookingInfo");
      const patientStr = sessionStorage.getItem("selectedPatient");
      let currentPatientId = null;
      if (patientStr) {
          try {
              const p = JSON.parse(patientStr);
              currentPatientId = String(p.id || p.patientId);
          } catch (e) {}
      }
      if (info) {
          try {
              const parsed = JSON.parse(info);
              const todayStr = new Date().toISOString().split("T")[0];
              if (parsed.date === todayStr && parsed.status !== "COMPLETED" && String(parsed.patientId) === currentPatientId) {
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

  const { state } = useLocation();
  const [doctor, setDoctor] = useState<any>(null);
  const [clinicDetails, setClinicDetails] = useState<any>(null);
  
  useEffect(() => {
    if (state?.doctor) {
      setDoctor(state.doctor);
      sessionStorage.setItem("booking_doctor", JSON.stringify(state.doctor));
      
      // Fetch clinic infrastructure and operating hours
      Promise.all([
        fetch(`${API}/api/clinic-metadata/${state.doctor.id}`).then(r => r.ok ? r.json() : null),
        fetch(`${API}/api/doctor/${state.doctor.id}/clinic-details`).then(r => r.ok ? r.json() : null)
      ])
        .then(([metadata, details]) => {
          setClinicDetails({
            wheelchairAccess: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("wheelchair")),
            pharmacyAttached: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("pharmacy")),
            stretcherAvailable: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("stretcher")),
            admitDepartment: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("admit")),
            startTime: details?.startTime || state.doctor.startTime || "",
            endTime: details?.endTime || state.doctor.endTime || "",
            breakStartTime: details?.breakStartTime || state.doctor.breakStartTime || "",
            breakEndTime: details?.breakEndTime || state.doctor.breakEndTime || "",
          });
        })
        .catch(console.error);
    } else {
      const stored = sessionStorage.getItem("booking_doctor");
      if (stored) {
        const d = JSON.parse(stored);
        setDoctor(d);
        Promise.all([
          fetch(`${API}/api/clinic-metadata/${d.id}`).then(r => r.ok ? r.json() : null),
          fetch(`${API}/api/doctor/${d.id}/clinic-details`).then(r => r.ok ? r.json() : null)
        ])
          .then(([metadata, details]) => {
            setClinicDetails({
              wheelchairAccess: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("wheelchair")),
              pharmacyAttached: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("pharmacy")),
              stretcherAvailable: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("stretcher")),
              admitDepartment: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("admit")),
              startTime: details?.startTime || d.startTime || "",
              endTime: details?.endTime || d.endTime || "",
              breakStartTime: details?.breakStartTime || d.breakStartTime || "",
              breakEndTime: details?.breakEndTime || d.breakEndTime || "",
            });
          })
          .catch(console.error);
      } else {
        navigate("/");
      }
    }
  }, [state, navigate]);

  const [selectedTier, setSelectedTier] = useState<BookingTier>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState("10");
  const [pickerMinute, setPickerMinute] = useState("30");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, FullAvailability>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [hasTodayAppointment, setHasTodayAppointment] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [inlineWarning, setInlineWarning] = useState<string | null>(null);

  const [activeAppointments, setActiveAppointments] = useState<any[]>([]);
  const [checkingActive, setCheckingActive] = useState(true);

  // ETA & Location State
  const [patientLat, setPatientLat] = useState<string>("");
  const [patientLng, setPatientLng] = useState<string>("");
  const [manualLocation, setManualLocation] = useState(false);
  const [etaInfo, setEtaInfo] = useState<{ travelTimeMinutes: number, queueWaitTimeMinutes: number, totalTimeMinutes: number, distanceKm: number } | null>(null);

  const handlePasteCoordinates = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const parts = pastedText.split(/[\s,]+/);
    if (parts.length >= 2) {
      const lat = parts[0].trim();
      const lng = parts[1].trim();
      if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
        e.preventDefault();
        setPatientLat(lat);
        setPatientLng(lng);
      }
    }
  };

  // Native GPS fetching removed - now handled by BookingEtaBar Map

  useEffect(() => {
    if (doctor?.id) {
      fetch(`${API}/api/appointments/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          patientLat: patientLat || null,
          patientLng: patientLng || null
        })
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setEtaInfo(data);
      })
      .catch(err => console.error("Preview fetch error:", err));
    }
  }, [doctor?.id, patientLat, patientLng]);

  // Sync Logic: Fetch from SQL Backend
  const fetchGlobalAvailability = useCallback(async () => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      setSyncing(true);
      const docId = doctor?.id || 1;
      const syncUrl = `${API}/api/availability/doctor/${docId}`;
      console.log(`[Booking] Fetching availability from: ${syncUrl}`);
      
      const resp = await fetch(syncUrl, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log(`[Booking] Received ${data.length} availability records for DocID ${docId}`);
        const map: Record<string, FullAvailability> = {};
        
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");
        
        data.forEach((e: any) => {
           let isOpen = !e.closed;
           
           map[e.date] = {
             date: e.date,
             isOpen: isOpen,
             bookedCount: 0,
             patientCapacity: e.patientCapacity || 20,
             startTime: e.startTime ? e.startTime.slice(0, 5) : "",
             endTime: e.endTime ? e.endTime.slice(0, 5) : ""
            };
        });
        console.log("[Booking] Mapped Availability Map:", map);
        setAvailabilityMap(map);
      } else {
        console.error(`[Booking] API Fetch Failed for DocID ${docId}`, resp.status);
      }
    } catch (e) {
      console.error("Global sync failed:", e);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [doctor]);

  useEffect(() => {
    fetchGlobalAvailability();
    const patientStr = sessionStorage.getItem("selectedPatient");
    if (patientStr) {
      const p = JSON.parse(patientStr);
      setSelectedPatient(p);
      
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = userStr ? JSON.parse(userStr) : null;
      const token = u?.token;

      setCheckingActive(true);
      fetch(`${API}/api/appointments/patient/${p.id}/check-active`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      })
        .then(async r => {
          if (r.ok) {
            const data = await r.json();
            setActiveAppointments(data.activeAppointments || []);
            
            // If they already have an appointment for today, keep them on page and show inline warning
            if (data.todayAppointment) {
              localStorage.setItem("bookingInfo", JSON.stringify(data.todayAppointment));
              setInlineWarning("An active appointment already exists.");
              return;
            }

            // Patient has a COMPLETED appointment today
            // We no longer block today's date, allowing them to book a different doctor.
            if (data.hadTodayAppointment) {
              localStorage.setItem("hadAppointmentToday", "true");
            } else {
              localStorage.removeItem("hadAppointmentToday");
            }
          }
        })
        .catch(console.error)
        .finally(() => setCheckingActive(false));
    } else {
        navigate("/patient-portal");
    }
  }, [navigate, fetchGlobalAvailability]);

  // Redirection Guard: If user selects a date they already have an appointment for, show inline warning, do NOT redirect.
  useEffect(() => {
    if (selectedDate && activeAppointments.length > 0) {
      const existing = activeAppointments.find(a => a.date === selectedDate);
      if (existing) {
        console.log(`[Booking] Patient already booked for ${selectedDate}.`);
        localStorage.setItem("bookingInfo", JSON.stringify(existing));
        setInlineWarning("An active appointment already exists.");
      }
    }
  }, [selectedDate, activeAppointments]);

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(s => parseInt(s, 10));
    return (h * 60) + m;
  };

  const applyCustomTime = (h: string, m: string) => {
    let hr = parseInt(h);
    let min = parseInt(m);
    if (isNaN(hr) || hr < 0 || hr > 23) {
      setTimeError("Invalid hour");
      return;
    }
    if (isNaN(min) || min < 0 || min > 59) {
      setTimeError("Invalid minute");
      return;
    }

    const selectedTotalMinutes = (hr * 60) + min;
    const avail = availabilityMap[selectedDate || ""];
    
    // Fallback to clinic details if availability map is missing the specific date
    const startStr = avail?.startTime || clinicDetails?.startTime || "";
    const endStr = avail?.endTime || clinicDetails?.endTime || "";
    const breakStartStr = clinicDetails?.breakStartTime || "";
    const breakEndStr = clinicDetails?.breakEndTime || "";
    
    if (!startStr || !endStr) {
      setTimeError("Clinic hours not defined");
      return;
    }

    const startTotalMinutes = parseTimeToMinutes(startStr);
    const endTotalMinutes = parseTimeToMinutes(endStr);

    // Prevent booking past times if the selected date is today
    const now = new Date();
    const isToday = selectedDate === format(now, "yyyy-MM-dd");
    
    if (isToday) {
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      if (selectedTotalMinutes < currentTotalMinutes) {
        setTimeError("Cannot book a time in the past.");
        setSelectedTime(null);
        return;
      }
    }

    if (selectedTotalMinutes < startTotalMinutes || selectedTotalMinutes >= endTotalMinutes) {
      setTimeError(`Outside clinic hours (${startStr} - ${endStr})`);
      setSelectedTime(null);
      return;
    }

    // Check break slots
    if (breakStartStr && breakEndStr) {
      const breakStartMins = parseTimeToMinutes(breakStartStr);
      const breakEndMins = parseTimeToMinutes(breakEndStr);
      if (selectedTotalMinutes >= breakStartMins && selectedTotalMinutes < breakEndMins) {
        setTimeError(`Doctor is on break (${breakStartStr} - ${breakEndStr})`);
        setSelectedTime(null);
        return;
      }
    }

    setTimeError(null);
    setSelectedTime(`${hr.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    setShowTimePicker(false);
  };

  const handleBooking = async () => {
    if (selectedDate === format(new Date(), "yyyy-MM-dd") && hasTodayAppointment) {
      setBookingError("Policy Restriction: You have already had an appointment today. Only one admission per day is permitted.");
      return;
    }

    if (selectedDate === format(new Date(), "yyyy-MM-dd") && doctor?.endTime) {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [eh, em] = doctor.endTime.split(":").map(Number);
      const endTotalMinutes = eh * 60 + (em || 0);
      
      if (currentTotalMinutes >= endTotalMinutes) {
        setBookingError("Clinic hours have officially concluded for today. The Doctor is in Overtime Mode and no new walk-ins or bookings are accepted.");
        return;
      }
    }

    if (selectedDate === format(new Date(), "yyyy-MM-dd") && selectedTier === "premium" && selectedTime) {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const selectedTotalMinutes = parseTimeToMinutes(selectedTime);
      if (selectedTotalMinutes < currentTotalMinutes) {
        setBookingError("The selected time slot has already passed. Please select a future time.");
        return;
      }
    }

    if (selectedDate && (selectedTier === "free" || selectedTime)) {
      if (!doctor || !doctor.id) {
         setBookingError("Critical Error: Doctor session lost. Please return and select the doctor again.");
         setTimeout(() => navigate("/specialty-selection"), 3000);
         return;
      }

      const userStr = localStorage.getItem("currentUser") || localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : { id: "p1", name: "Guest User" };
      const token = user?.token;

      const docId = doctor.id;
      const patient = selectedPatient || user;
      
      console.log(`[Booking] Attempting booking for DocID: ${docId}, PatientID: ${patient.id}`);
      
      try {
        setSyncing(true);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error("Request timed out after 60 seconds due to server delay.")), 60000); // 60 seconds timeout
        
        // Mission 3: Race Condition Fix - Re-verify availability
        const verifyResp = await fetch(`${API}/api/availability/doctor/${docId}`, {
           headers: { "Authorization": token ? `Bearer ${token}` : "" },
           signal: controller.signal
        });
        if (verifyResp.ok) {
           const availData = await verifyResp.json();
           const todayAvail = availData.find((a: any) => a.date === selectedDate);
           if (todayAvail && todayAvail.closed) {
              setBookingError("Transmission Error: This clinic has just transitioned to 'Closed' status for the selected date.");
              setSyncing(false);
              clearTimeout(timeoutId);
              return;
           }
        }

        const isPremium = selectedTier === 'premium';
         const payload = {
            patientId: (patient.id || user.id || "p1").toString(), 
            doctorId: docId, 
            date: selectedDate, 
            timeSlot: isPremium ? selectedTime! : "Direct Walk-in", 
            isPremium, 
            tokenNumber: 0,
            accessType: selectedTier === 'premium' ? "PREMIUM" : "STANDARD",
            patientLatitude: patientLat ? parseFloat(patientLat) : null,
            patientLongitude: patientLng ? parseFloat(patientLng) : null
         };
        
        const resp = await fetch(`${API}/api/appointments`, {
           method: "POST", 
           headers: { 
             "Content-Type": "application/json",
             "Authorization": token ? `Bearer ${token}` : ""
           },
           body: JSON.stringify(payload),
           signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.status === 200 || resp.status === 201) {
          const result = await resp.json();
          localStorage.setItem("bookingInfo", JSON.stringify(result));
          setActiveAppointments(prev => [...prev, result]);
          navigate("/tracker", { replace: true });
        } else if (resp.status === 409) {
          setSyncing(false);
          const result = await resp.json().catch(() => ({}));
          
          if (result.message && result.message.includes("You already have an appointment scheduled with this doctor for this day")) {
            setBookingError("You already have an appointment scheduled with this doctor for this day. Please select a different date or choose another doctor.");
            return;
          } else if (result.message && result.message.includes("active appointment today")) {
            setBookingError("Strict Policy: You currently have an active appointment today. You cannot book another appointment until you are discharged.");
            return;
          } else if (result.error && result.error.includes("An active appointment already exists Availabe slot :-")) {
            setBookingError(result.error);
            return;
          } else if (result.error === "Slot Conflict") {
            setBookingError(result.message || "The 11:55 slot is prioritized. The next available slot is 12:10. Please manually select a new time slot below.");
            return;
          } else {
            const appointment = result.appointment || result;
            if (appointment) {
              localStorage.setItem("bookingInfo", JSON.stringify(appointment));
            }
            setInlineWarning("An active appointment already exists.");
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          setBookingError("Booking Failure: " + (errData.error || errData.message || "Slot no longer available"));
        }
      } catch (e: any) {
        console.error("Booking error:", e);
        setBookingError("Booking Error: " + (e?.message || "Network request failed. Check your connection and try again."));
      } finally {
        setSyncing(false);
      }
    }
  };

  const subTextColor = "text-slate-600";

  if (isBlocked) return null;
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-50 selection:bg-sky-500/30 overflow-x-hidden transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 py-10 pb-32">
        <header className="mb-10">
           <div className="flex flex-row justify-between items-center mb-8 gap-4">
              <button onClick={() => selectedTier ? setSelectedTier(null) : navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 group hover:text-white transition-all"><ChevronLeft size={16} /><span>RETURN</span></button>
              <div className="flex items-center gap-3"><RefreshCw size={14} className={`text-emerald-500 ${syncing ? 'animate-spin' : ''}`} /><div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">{selectedPatient?.name || "Root Account"}</div></div>
           </div>
          {doctor && (
            <div className="p-4 rounded-3xl bg-white/5 border border-white/5 mb-8 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-sky-500/20 shadow-inner shrink-0 bg-slate-800">
                  <img src="/doctor-avatar.png" alt="Doctor" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-white capitalize">{doctor.name}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex-wrap">
                    <span>{doctor.specialty || doctor.speciality}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                    <span>{doctor.clinic || doctor.clinicName || "Private Practice"}</span>
                  </div>
                </div>
              </div>
              
              {clinicDetails && (
                <div className="flex flex-col gap-3 pt-3 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {clinicDetails.wheelchairAccess && (
                      <div className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Wheelchair
                      </div>
                    )}
                    {clinicDetails.pharmacyAttached && (
                      <div className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pharmacy
                      </div>
                    )}
                    {clinicDetails.stretcherAvailable && (
                      <div className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Stretcher
                      </div>
                    )}
                    {clinicDetails.admitDepartment && (
                      <div className="px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Admission
                      </div>
                    )}
                  </div>

                  {clinicDetails.startTime && clinicDetails.endTime && (
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock size={12} className="text-sky-400" />
                      <span>{clinicDetails.startTime} - {clinicDetails.endTime}</span>
                      {clinicDetails.breakStartTime && clinicDetails.breakEndTime && (
                         <span className="text-amber-500 ml-1">
                            (Break: {clinicDetails.breakStartTime} - {clinicDetails.breakEndTime})
                         </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <h1 className="text-2xl sm:text-5xl font-black tracking-tighter mb-3 text-slate-200">{selectedTier ? "Finalize Admission" : "Select Care Track"}</h1>
          
          {doctor && doctor.id && (
            <div className="mt-8">
              <BookingEtaBar 
                doctorId={doctor.id} 
                onLocationChange={(coords) => {
                  setPatientLat(coords.lat.toString());
                  setPatientLng(coords.lng.toString());
                }} 
              />
            </div>
          )}
        </header>

        <AnimatePresence>
          {bookingError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-rose-600/20 mb-6"
            >
               <AlertCircle size={18} />
               <span>{bookingError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!selectedTier ? (
            <div className="flex flex-col gap-6">
              <button onClick={() => setSelectedTier("premium")} className="group glass-card-dark p-4 sm:p-8 rounded-[40px] text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/5 relative overflow-hidden"><div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-10 transition-all duration-700"><Crown size={200} /></div><div className="relative z-10"><h3 className="text-2xl sm:text-3xl font-black mb-1 text-white">Priority Elite</h3><p className="text-slate-400 text-sm mb-8 leading-relaxed">Dedicated time slot with zero clinical waiting duration.</p><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest"><span>Secure Spot</span><ArrowRight size={16} /></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">₹650</span></div></div></button>
              <button onClick={() => setSelectedTier("free")} className="group glass-card-dark p-4 sm:p-8 rounded-[40px] text-left transition-all hover:border-sky-500/40 hover:bg-sky-500/5 relative overflow-hidden"><div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-10 transition-all duration-700"><Ticket size={200} /></div><div className="relative z-10"><h3 className="text-2xl sm:text-3xl font-black mb-1 text-white">Standard Access</h3><p className="text-slate-400 text-sm mb-8 leading-relaxed">Automated turn-based universal healthcare queue.</p><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sky-400 font-black text-xs uppercase tracking-widest"><span>Enter Queue</span><ArrowRight size={16} /></div><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Standard Fee</span></div></div></button>
            </div>
          ) : (
            <div className="space-y-12">
              <section className="space-y-6">
                 <div className="flex justify-between items-center px-2">
                    <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"><ChevronLeft size={16} /></button>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{format(calendarMonth, "MMMM yyyy")}</span>
                    <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"><ChevronRight size={16} /></button>
                 </div>
                 
                 <div className="grid grid-cols-7 gap-2">
                  {["S","M","T","W","T","F","S"].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-600 p-2 uppercase tracking-widest">{d}</div>)}
                  {Array.from({ length: getDay(startOfMonth(calendarMonth)) }).map((_, i) => (<div key={`blank-${i}`} />))}
                  {eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map((day, i) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const avail = availabilityMap[dateStr];
                    const isDayToday = isToday(day);
                    const isBlockedToday = isDayToday && hasTodayAppointment;
                    const isDoctorOpen = avail?.isOpen;
                    
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const isPast = day.getTime() < todayDate.getTime();
                    
                    let clickable = !isBlockedToday && isDoctorOpen && !isPast;
                    
                    let bg = "rgba(255,255,255,0.02)";
                    let bord = "rgba(255,255,255,0.05)";
                    let sc = 1;
                    
                    const isSelected = selectedDate === dateStr;
                    
                    if (isDayToday) bord = "#3b82f6";
                    if (clickable) { bg = "rgba(16,185,129,0.08)"; bord = "rgba(16,185,129,0.2)"; }
                    if (isSelected) { bg = selectedTier === 'premium' ? "rgba(245,158,11,0.2)" : "rgba(14,165,233,0.2)"; bord = selectedTier === 'premium' ? "#F59E0B" : "#0EA5E9"; sc = 1.1; }
                    if (isBlockedToday) { bg = "rgba(239,68,68,0.1)"; bord = "rgba(239,68,68,0.3)"; clickable = false; }

                    return (
                      <button
                        key={i} disabled={!clickable} onClick={() => setSelectedDate(dateStr)}
                        style={{ backgroundColor: bg, border: `1px solid ${bord}`, scale: sc }}
                        className={`relative aspect-square rounded-full flex flex-col items-center justify-center transition-all ${clickable ? 'hover:scale-105 active:scale-95' : 'opacity-40 cursor-not-allowed'}`}
                      >
                        <span className={`text-[13px] font-semibold ${clickable ? 'text-white' : 'text-slate-500'}`}>{format(day, "d")}</span>
                        
                        <div className="absolute bottom-1.5 flex items-center justify-center gap-1">
                          {isDayToday && <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />}
                          {isDoctorOpen && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />}
                        </div>
                      </button>
                    );
                  })}
                 </div>
                 {hasTodayAppointment && (
                    <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase text-center tracking-widest shadow-2xl">Today Admission Exhausted • Select Future Slot</div>
                 )}
              </section>

              {inlineWarning && (
                 <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2 mb-4">
                   <AlertCircle size={16} />
                   <span>{inlineWarning}</span>
                 </div>
              )}

              {selectedTier === "premium" && selectedDate && (
                 <section className="space-y-6">
                    <div className="flex items-center justify-between px-2 text-amber-500 uppercase font-black text-[10px] tracking-widest"><span>Elite Slot Configuration (24H)</span><Clock size={14} /></div>
                    <div className="relative">
                       <button onClick={() => setShowTimePicker(!showTimePicker)} className={`w-full h-20 sm:h-28 glass-card-dark border-2 rounded-[32px] px-6 sm:px-8 text-2xl sm:text-5xl font-black flex items-center justify-between transition-all group ${timeError ? 'border-rose-500/50 text-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : (selectedTime ? 'border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.2)]' : 'border-white/10 text-white')}`}>
                          <span>{selectedTime || "Select Time..."}</span>
                          <Clock className="w-8 h-8 sm:w-10 sm:h-10 group-hover:rotate-12 transition-transform" />
                       </button>
                       
                       <AnimatePresence>
                          {timeError && (
                             <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute -top-12 left-0 w-full p-2.5 rounded-2xl bg-rose-600 text-white text-[9px] font-black uppercase text-center tracking-widest shadow-2xl flex items-center justify-center gap-2">
                                <AlertCircle size={14} /> {timeError}
                             </motion.div>
                          )}
                       </AnimatePresence>

                       {showTimePicker && (
                          <div className="absolute top-[100px] left-0 w-full glass-card-dark rounded-[40px] border border-white/10 p-8 z-50 shadow-[0_45px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col gap-6">
                             <div className="flex items-center justify-center gap-3 sm:gap-6">
                                <input type="text" value={pickerHour} onChange={e => setPickerHour(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-white/5 text-white font-black text-3xl sm:text-5xl text-center outline-none" placeholder="HH" />
                                <span className="text-3xl sm:text-5xl font-black text-slate-700">:</span>
                                <input type="text" value={pickerMinute} onChange={e => setPickerMinute(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-white/5 text-white font-black text-3xl sm:text-5xl text-center outline-none" placeholder="MM" />
                             </div>
                             <button onClick={() => applyCustomTime(pickerHour, pickerMinute)} className="w-full py-5 rounded-[28px] bg-white text-black font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Update Config</button>
                          </div>
                       )}
                    </div>
                 </section>
              )}

              <div className={`p-6 sm:p-8 rounded-[48px] border-2 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 shadow-2xl transition-all duration-500 ${selectedTier === 'premium' ? 'bg-amber-400/10 border-amber-400 shadow-amber-400/10' : 'bg-cyan-500/10 border-cyan-500 shadow-cyan-500/10'}`}>
                 <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${selectedTier === 'premium' ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-white'}`}>
                       {selectedTier === 'premium' ? <Crown size={28} /> : <Ticket size={28} />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Care Track Secure</span>
                       <span className={`text-sm font-black ${selectedTier === 'premium' ? 'text-amber-400' : 'text-cyan-400'}`}>
                          {selectedTier === 'premium' ? "Priority Elite Access" : "Standard Clinical Care"}
                       </span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className={`text-3xl font-black tracking-tighter ${selectedTier === 'premium' ? 'text-amber-400' : 'text-cyan-400'}`}>₹{selectedTier === 'premium' ? '650' : '500'}</div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sync Verified</span>
                 </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {(selectedTier === "free" ? selectedDate : (selectedDate && selectedTime)) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent pt-24 z-[100] pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button 
              onClick={handleBooking} 
              disabled={syncing || checkingActive}
              className={`w-full h-24 rounded-[40px] ${selectedTier === 'premium' ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-white'} font-black uppercase text-xl shadow-2xl flex items-center justify-center gap-4 transition-all group shadow-emerald-500/10 ${syncing || checkingActive ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
               <span>{syncing ? "Provisioning..." : checkingActive ? "Verifying Session..." : "Provision Medical Ticket"}</span>
               {syncing || checkingActive ? <RefreshCw size={24} className="animate-spin" /> : <Sparkles size={24} className="group-hover:rotate-45 transition-transform animate-pulse" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
