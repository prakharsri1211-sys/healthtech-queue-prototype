import React, { useEffect, useState, useMemo, useCallback } from "react";
import { APP_STATUS, APP_ROLES } from "../utils/constants";
import {
  Calendar,
  Users,
  Activity,
  Heart,
  TrendingUp,
  Save,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  LogOut,
  Stethoscope,
  Sun,
  Moon,
  Crown,
  ArrowLeft,
  Clock,
  TrendingDown,
} from "lucide-react";
import useWebSocket from "react-use-websocket";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

interface Patient {
  id: string;
  name: string;
  patientName?: string;
  age?: number;
  patientAge?: number;
  tokenNumber?: number;
  diagnosis?: string;
  bp?: string;
  heartRate?: string;
  status?: string;
  isUrgent?: boolean;
  isPremium?: boolean;
  appointmentTime?: string;
  doctorId?: string;
  tier?: string | null;
}
export default function DoctorDashboard(): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [emergencyAudio, setEmergencyAudio] = useState<HTMLAudioElement | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftStarted, setShiftStarted] = useState(false);
  const [timeToShift, setTimeToShift] = useState("Calculating...");
  const navigate = useNavigate();
  const [todayAvailability, setTodayAvailability] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [hasPlayedOvertimeChime, setHasPlayedOvertimeChime] = useState(false);
  const lastProcessedMessageRef = React.useRef<any>(null);

  const playOvertimeChime = useCallback(() => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        const createHarmonic = (freq: number, decayDuration: number, volume: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Instant hit (ding)
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
            // Exponential ring-out
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayDuration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + decayDuration);
        };

        // Fundamental pitch (C6)
        const baseFreq = 1046.50; 
        
        // Play multiple frequencies to simulate a metallic bell strike
        createHarmonic(baseFreq, 3.0, 0.5);            // Fundamental
        createHarmonic(baseFreq * 2.0, 2.0, 0.3);      // Harmonic 2
        createHarmonic(baseFreq * 2.4, 1.5, 0.2);      // Inharmonic
        createHarmonic(baseFreq * 3.2, 1.0, 0.1);      // Higher shimmer
    } catch (e) {
      console.warn('Audio Context failed to play overtime chime', e);
    }
  }, []);

  const apiUrl = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
  const wsUrl = apiUrl.replace("http", "ws") + "/ws-queue";

  useEffect(() => {
    const fetchTodayAvail = async () => {
      const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = storedUser ? JSON.parse(storedUser) : null;
      if (!u?.id) return;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const docId = u.doctorId || u.id;
      const token = u.token;
      
      try {
        const resp = await fetch(`${apiUrl}/api/availability/doctor/${docId}`, {
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
        if (resp.ok) {
          const data = await resp.json();
          const futureAvail = data
            .filter((a: any) => a.date >= todayStr)
            .sort((a: any, b: any) => a.date.localeCompare(b.date))[0];
          if (futureAvail) setTodayAvailability(futureAvail);
        }
      } catch (e) {
        console.error("Failed to fetch today availability", e);
      }
    };
    fetchTodayAvail();
  }, [apiUrl, user]);

  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState({ premium: 0, standard: 0 });

  useEffect(() => {
    const fetchTodayStats = async () => {
      const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = storedUser ? JSON.parse(storedUser) : null;
      if (!u?.id) return;
      const docId = u.doctorId || u.id;
      const token = u.token;
      
      try {
        const targetDate = todayAvailability?.date || new Date().toISOString().split('T')[0];

        const statsResp = await fetch(`${apiUrl}/api/finance/stats/${docId}?date=${targetDate}`, {
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
        if (statsResp.ok) {
          const stats = await statsResp.json();
          setTodayRevenue(stats.todayRevenue || 0);
          setTodayCount(stats.processedPatients || 0);
        }

        const resp = await fetch(`${apiUrl}/api/appointments/doctor/${docId}`, {
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
        if (resp.ok) {
          const data = await resp.json();
          const todayAppts = data.filter((a: any) => a.date === targetDate && ![APP_STATUS.COMPLETED, APP_STATUS.CANCELLED, APP_STATUS.NO_SHOW].includes(a.status));
          setTodayAppointments(todayAppts);
          
          const premium = todayAppts.filter((a: any) => String(a.tier).toUpperCase() === 'PREMIUM' || a.isPremium).length;
          setRevenueStats({
            premium: premium,
            standard: todayAppts.length - premium
          });
        }
      } catch (e) {
        console.error("Failed to fetch today stats", e);
      }
    };
    
    fetchTodayStats();
    
    let debounceTimer: any;
    (window as any).refreshStats = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchTodayStats, 800);
    };
    
    return () => clearTimeout(debounceTimer);
  }, [apiUrl, user, todayAvailability]);

  useEffect(() => {
    const raw = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = raw ? JSON.parse(raw) : null;

    if (!u) {
      navigate("/");
      return;
    }
    
    // ROLE GUARD: Prevent non-doctors from accessing this dashboard
    if (u.role !== APP_ROLES.DOCTOR) {
      console.warn("[SECURITY] Unauthorized Doctor Access Attempt by:", u.role);
      const target = u.role === APP_ROLES.MEDIATOR ? "/mediator" : "/patient-portal";
      navigate(target);
      return;
    }
    
    setUser(u);
    
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now);

      // --- Issue 1 Fix: Use earliest appointment time as the shift gate ---
      // Fix: Find the absolute earliest time between clinic schedule AND booked appointments
      let startTimeStr: string | null = null;
      let shiftDate: string | null = todayAvailability?.date || null;
      
      let clinicStartMinutes = Infinity;
      if (todayAvailability?.startTime) {
        const parts = todayAvailability.startTime.split(':');
        clinicStartMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1] || '0');
      }

      if (todayAppointments && todayAppointments.length > 0) {
        // Parse all appointment timeSlots and find the earliest
        const parsedTimes = todayAppointments
          .map((a: any) => {
            if (!a.timeSlot || a.timeSlot === 'Direct Walk-in') return null;
            const parts = a.timeSlot.split(' ');
            const hm = parts[0].split(':');
            let h = parseInt(hm[0]);
            const m = parseInt(hm[1] || '0');
            if (parts[1]?.toUpperCase() === 'PM' && h < 12) h += 12;
            if (parts[1]?.toUpperCase() === 'AM' && h === 12) h = 0;
            return { h, m, raw: a.timeSlot };
          })
          .filter(Boolean) as { h: number; m: number; raw: string }[];

        if (parsedTimes.length > 0) {
          parsedTimes.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
          const earliest = parsedTimes[0];
          const apptMinutes = earliest.h * 60 + earliest.m;
          
          if (apptMinutes < clinicStartMinutes) {
              startTimeStr = `${String(earliest.h).padStart(2, '0')}:${String(earliest.m).padStart(2, '0')}:00`;
          }
        }
      }

      // Fallback to clinic availability start time
      if (!startTimeStr && todayAvailability?.startTime) {
        startTimeStr = todayAvailability.startTime;
      }

      if (!startTimeStr) {
        setTimeToShift("Awaiting Schedule");
        return;
      }

      let shiftTime = new Date(now);
      if (shiftDate) {
        const [y, mon, d] = shiftDate.split("-").map(Number);
        shiftTime = new Date(y, mon - 1, d);
      }
      const [h, m, s] = startTimeStr.split(":").map(Number);
      shiftTime.setHours(h, m || 0, s || 0, 0);

      if (now.getTime() >= shiftTime.getTime()) {
        if (todayAvailability?.closed) {
          setTimeToShift("Clinic Closed Today");
        } else {
          setTimeToShift("READY");
        }
      } else {
        const diff = shiftTime.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

        if (days > 0) {
          setTimeToShift(`${days}d ${hrs}h ${mins}m ${secs}s`);
        } else {
          setTimeToShift(`${hrs}h ${mins}m ${secs}s`);
        }
      }

      // Check for Overtime
      if (todayAvailability?.endTime) {
        let endTime = new Date(now);
        if (shiftDate) {
          const [y, mon, d] = shiftDate.split("-").map(Number);
          endTime = new Date(y, mon - 1, d);
        }
        const [eh, em, es] = todayAvailability.endTime.split(":").map(Number);
        endTime.setHours(eh, em || 0, es || 0, 0);

        if (now.getTime() > endTime.getTime() && patients.length > 0) {
          if (!isOvertime) {
             setIsOvertime(true);
             if (!hasPlayedOvertimeChime) {
                playOvertimeChime();
                setHasPlayedOvertimeChime(true);
             }
          }
        } else {
          setIsOvertime(false);
          setHasPlayedOvertimeChime(false);
        }
      }
    };
    
    // Call immediately to avoid the 1-second delay and flickering
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    
    return () => clearInterval(timer);
  }, [navigate, todayAvailability, todayAppointments]);

  useEffect(() => {
    const fetchInitialShiftStatus = async () => {
      const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = storedUser ? JSON.parse(storedUser) : null;
      if (!u?.id) return;
      const docId = u.doctorId || u.id;
      const token = u.token;

      try {
        const resp = await fetch(`${apiUrl}/api/doctor/${docId}/clinic-details`, {
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
        if (resp.ok) {
          const data = await resp.json();
          // Issue 2 Fix: Do not auto-start shift from backend on load; always enforce countdown until explicit start
          // if (data.shiftStarted) setShiftStarted(true); 
        }
      } catch (e) {
        console.error("Failed to fetch initial shift status", e);
      }
    };
    fetchInitialShiftStatus();
  }, [apiUrl, user]);

  const { lastJsonMessage: queueMessage, sendMessage } = useWebSocket(
    wsUrl,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 9999,
      reconnectInterval: 3000,
      share: true,
      heartbeat: {
        message: JSON.stringify({ type: 'ping' }),
        returnMessage: JSON.stringify({ type: 'pong' }),
        timeout: 10000,
        interval: 15000,
      }
    }
  );

  useEffect(() => {
    if (queueMessage && queueMessage !== lastProcessedMessageRef.current) {
      lastProcessedMessageRef.current = queueMessage;
      const msg: any = queueMessage;
      if (msg.type === "QUEUE_UPDATE" || msg.type === "QUEUE_SYNC") {
        const allPatients = Array.isArray(msg.patients) ? msg.patients : [];
        if (user?.id) {
          setPatients(
            allPatients.filter(
              (p: any) => String(p.doctorId) === String(user.doctorId || user.id)
            )
          );
        } else {
          setPatients(allPatients);
        }
        (window as any).refreshStats?.();
      } else if (msg.type === "PATIENT_DISCHARGED") {
        setPatients(prev => prev.filter(p => String(p.id) !== String(msg.patientId)));
        (window as any).refreshStats?.();
      } else if (msg.type === "EMERGENCY_ALERT") {
        setEmergencyActive(true);
        setEmergencyData(msg);
        // Instant Web Audio API alarm — no network latency
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const playAlarmCycle = () => {
            if (!(window as any).__emergencyAlarmActive) return;
            // High-pitched urgent siren sweep
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = "sawtooth";
            osc1.frequency.setValueAtTime(800, ctx.currentTime);
            osc1.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.5);
            osc1.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.0);
            osc2.type = "square";
            osc2.frequency.setValueAtTime(600, ctx.currentTime);
            osc2.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.5);
            osc2.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.0);
            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.setValueAtTime(0.35, ctx.currentTime + 0.9);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.0);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 1.0);
            osc2.stop(ctx.currentTime + 1.0);
            setTimeout(playAlarmCycle, 1200);
          };
          (window as any).__emergencyAlarmActive = true;
          (window as any).__emergencyAudioCtx = ctx;
          playAlarmCycle();
        } catch (e) {
          console.warn("Web Audio emergency alarm failed:", e);
        }
      } else if (msg.type === "SHIFT_STARTED") {
        const msgDocId = msg.doctorId?.toString();
        const userDocId = (user?.doctorId || user?.id)?.toString();
        if (msgDocId === userDocId) {
           setShiftStarted(true);
        }
      }
    }
  }, [queueMessage, user]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    if (user?.id) {
      fetchQueue();
    }
  }, [user]);

  const fetchQueue = useCallback(async () => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      const resp = await fetch(`${apiUrl}/api/mediator/queue/all`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          setPatients(
            data.filter((p: any) => String(p.doctorId) === String(user?.doctorId || user?.id))
          );
        }
      }
    } catch (e) {
      console.error("Fetch failed", e);
      setPatients([]);
    }
  }, [apiUrl, user]);

  const handleDoctorReady = useCallback(async () => {
    const docId = user?.doctorId || user?.id;
    if (docId) {
      // Optimistic UI update: instantly hide the overlay and show notification
      setShiftStarted(true);
      setNotification("Shift started: Mediator and patients are now synchronized.");
      setTimeout(() => setNotification(null), 4000);

      // Run API call in background without awaiting it to avoid UI blocking
      const token = user.token;
      fetch(`${apiUrl}/api/doctor/${docId}/start-shift`, {
        method: "POST",
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      }).catch(e => console.error("API shift start failed", e));

      sendMessage(
        JSON.stringify({ 
          type: "SHIFT_STARTED", 
          doctorId: docId.toString(),
          doctorName: user.fullName || user.username
        })
      );
      setNotification("Shift started: Mediator and patients are now synchronized.");
      setTimeout(() => setNotification(null), 4000);
    }
  }, [apiUrl, user, sendMessage]);

  const handleDischarge = useCallback((id: number | string) => {
    // Optimistic UI Update: instantly remove from patient array to avoid UI lag
    setPatients(prev => prev.filter(p => String(p.id) !== String(id)));
    setTodayAppointments(prev => prev.filter((p: any) => String(p.patientId) !== String(id) && String(p.id) !== String(id)));
    
    sendMessage(
      JSON.stringify({ type: "DISCHARGE", patientId: id.toString() })
    );
  }, [sendMessage]);

  const safePatients = useMemo(() => Array.isArray(patients) ? patients : [], [patients]);
  const activePatient = useMemo(() => safePatients.find((p) => p.status === APP_STATUS.IN_SESSION), [safePatients]);
  
  const sortedPatients = useMemo(() => {
    return [...safePatients].sort(
      (a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0)
    );
  }, [safePatients]);

  const safeId = useCallback((p: any, index: number = 0) => {
    if (p.id) return p.id.toString();
    if (p.appointmentId) return p.appointmentId.toString();
    if (p.patientId) return p.patientId.toString();
    return `fallback-${index}-${p.name || p.patientName || 'anon'}`;
  }, []);

  const textColor = darkMode ? "text-white" : "text-[#0F172A]";
  const subTextColor = darkMode ? "text-slate-400" : "text-[#374151]";
  const glassBg = darkMode
    ? "bg-slate-900/90 border-white/10 backdrop-blur-sm shadow-xl"
    : "bg-white shadow-2xl border-slate-200 backdrop-blur-3xl";
  const borderCol = darkMode ? "border-white/10" : "border-slate-300";

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Activity size={48} className="text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-500 ${
        darkMode ? "bg-[#020617] text-white" : "bg-slate-50 text-slate-900"
      } selection:bg-blue-500/30 overflow-x-hidden overflow-y-scroll pt-4 pb-32`}
    >
      {/* Slide-down Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:translate-x-0 z-[9999] px-6 py-4 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-2xl flex items-center gap-3 border border-rose-500"
          >
            <AlertTriangle size={20} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[5%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative max-w-6xl mx-auto px-4 sm:px-6 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl">
            <Activity size={32} />
          </div>
          <div className="flex flex-col items-center sm:items-start">
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none mb-2 ${textColor}`}>
              Doctor Dashboard
            </h1>
            <div className="flex flex-col items-center sm:items-start gap-1 w-full">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${subTextColor}`}>
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <span className="hidden sm:inline"> • </span>
                  <br className="block sm:hidden" />
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-3 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Stethoscope size={10} className="text-blue-500 shrink-0" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-blue-400">
                    {user.fullName || user.username}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-blue-400 mx-1 shrink-0" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-blue-400">
                    {user?.speciality || "Clinical Specialist"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Users size={10} className="text-indigo-500 shrink-0" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-400">
                    Authenticated Access
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 w-full md:w-auto">
          <button
            id="toggle-dark-mode"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-2xl border transition-colors ${
              darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-blue-600" />}
          </button>
          <button
            onClick={() => navigate("/doctor-onboarding")}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest border transition-all flex-1 md:flex-initial justify-center ${
              darkMode ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span className="truncate">Onboarding</span>
          </button>
          <button
            id="logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/");
            }}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-2xl bg-rose-600 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-500 transition-all flex-1 md:flex-initial justify-center"
          >
            <LogOut size={14} className="shrink-0" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </header>

      {/* OVERTIME MODE BANNER */}
      <AnimatePresence>
        {isOvertime && shiftStarted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-amber-500/20 border-b border-amber-500/30 backdrop-blur-md"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center gap-3 text-amber-500 font-bold text-sm tracking-wide">
              <Clock size={16} className="animate-pulse" />
              <span>OVERTIME MODE ENGAGED: Extending shift to serve remaining patients</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Shift Countdown Overlay */}
      <AnimatePresence>
        {!shiftStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col overflow-y-auto"
          >
             {/* Header for Onboarding Button */}
             <div className="w-full p-4 sm:p-8 flex justify-start z-[9999] relative shrink-0">
               <button
                 onClick={() => navigate("/doctor-onboarding")}
                 className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest border border-slate-600 transition-all shadow-2xl"
               >
                 <ArrowLeft size={16} />
                 <span>Onboarding</span>
               </button>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center relative w-full h-full">
                 <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/5 rounded-full blur-[150px]" />
                 </div>

                 <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative z-10 space-y-8"
             >
                <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                    <Clock size={48} className="text-blue-500 animate-pulse" />
                </div>
                 <div>
                    <h2 className="text-sm font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Shift Readiness Protocol</h2>
                    <h1 className="text-2xl sm:text-5xl lg:text-8xl font-black tracking-tighter italic text-white leading-none transition-all">
                       {timeToShift === "Awaiting Schedule" ? "NO SCHEDULE" : timeToShift === "READY" ? "" : "CONSULTATIONS START IN"}<br/>
                       <span className="text-blue-500">{timeToShift}</span>
                    </h1>
                    <div className="flex items-center justify-center gap-4 mt-8">
                      {timeToShift === "READY" && (!todayAvailability || !todayAvailability.closed) && (
                        <button
                            onClick={handleDoctorReady}
                            className="px-12 py-4 rounded-full bg-blue-600 text-white text-sm font-black uppercase tracking-widest hover:bg-blue-500 border border-blue-500 transition-all active:scale-95 mx-auto shadow-2xl shadow-blue-500/20"
                        >
                            <span>START CONSULTATIONS</span>
                        </button>
                      )}
                    </div>
                 </div>
                <div className="flex flex-col items-center gap-6 pt-8">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="text-center p-4 rounded-3xl bg-white/10 border border-white/10">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Patients Remaining</p>
                         <p className="text-3xl font-black text-white italic">{todayAppointments.length} Patients</p>
                      </div>
                      <div className="text-center p-4 rounded-3xl bg-blue-500/20 border border-blue-500/20">
                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Queue Status</p>
                         <p className="text-3xl font-black text-blue-400 italic">#{sortedPatients[0]?.tokenNumber || "1"}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                         <Crown size={14} className="text-amber-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{revenueStats.premium} Elite Slots</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-500/20 border border-white/10">
                         <Users size={14} className="text-slate-400" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{revenueStats.standard} Standard Slots</span>
                      </div>
                   </div>
                </div>
                
                <p className="text-xs font-bold text-slate-600 max-w-md mx-auto uppercase tracking-widest pt-12">
                   Dashboard will automatically activate at shift launch.<br/>
                   Ensuring patient privacy and medical integrity.
                </p>
             </motion.div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-6">
        {/* Emergency Persistence Layer */}
        <AnimatePresence>
          {emergencyActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-rose-950/90 backdrop-blur-2xl"
            >
              <div className="w-[95%] sm:max-w-lg p-6 sm:p-12 rounded-[64px] bg-rose-600 text-white shadow-[0_20px_100px_rgba(225,29,72,0.6)] relative max-h-[85vh] overflow-y-auto border-4 border-white/20 text-center mx-auto">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-8"
                >
                  <AlertTriangle size={48} className="text-white fill-current" />
                </motion.div>
                
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">Urgent Action Required</h2>
                <p className="text-xl font-bold text-white/90 mb-10 leading-relaxed uppercase tracking-widest">
                  Emergency Summons Initiated: <br/>
                  <span className="text-3xl text-white underline decoration-white/40">{emergencyData?.patientName || "Priority Patient"}</span>
                </p>
                
                <button
                  onClick={() => {
                    setEmergencyActive(false);
                    // Stop Web Audio API alarm
                    (window as any).__emergencyAlarmActive = false;
                    try {
                      const ctx = (window as any).__emergencyAudioCtx;
                      if (ctx && ctx.state !== 'closed') ctx.close();
                    } catch (e) {}
                    // Legacy fallback: stop old HTML Audio if any
                    if (emergencyAudio) {
                      try {
                        emergencyAudio.pause();
                        emergencyAudio.currentTime = 0;
                      } catch (e) {}
                      setEmergencyAudio(null);
                    }
                  }}
                  className="w-full py-6 rounded-3xl bg-white text-rose-600 text-xl font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-2xl active:scale-95"
                >
                  Confirm Awareness 
                </button>
                
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                  Clinic Operations Suspended Until Acknowledgement
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Top KPI & Quick Actions Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              onClick={() => navigate("/schedule-management")}
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-[32px] cursor-pointer ${glassBg} border ${borderCol} flex flex-col justify-between hover:border-blue-500/50 transition-all`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Calendar size={20} />
                </div>
                <ChevronRight size={16} className={subTextColor} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${subTextColor}`}>Module</p>
                <h3 className={`text-lg font-black tracking-tight ${textColor} leading-tight mt-1`}>Schedule<br/>Management</h3>
              </div>
            </motion.div>

            <motion.div
              onClick={() => navigate("/doctor-balance")}
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-[32px] cursor-pointer ${glassBg} border ${borderCol} flex flex-col justify-between hover:border-emerald-500/50 transition-all`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <TrendingUp size={20} />
                </div>
                <ChevronRight size={16} className={subTextColor} />
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${subTextColor}`}>Module</p>
                <h3 className={`text-lg font-black tracking-tight ${textColor} leading-tight mt-1`}>Financial<br/>Vault</h3>
              </div>
            </motion.div>

            <div className={`p-6 rounded-[32px] ${darkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"} border flex flex-col justify-between`}>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-500 mb-4">
                  <Users size={20} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-indigo-500`}>Total Booked Today</p>
                  <h3 className={`text-3xl font-black tracking-tighter text-indigo-500 mt-1`}>{todayAppointments.length} Patients</h3>
                </div>
            </div>

            <div className={`p-6 rounded-[32px] ${darkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-100"} border flex flex-col justify-between`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-amber-500`}>Total Revenue Today</p>
                  <h3 className={`text-3xl font-black tracking-tighter text-amber-500 mt-1`}>₹{todayRevenue}</h3>
                </div>
            </div>
          </div>

          {todayAppointments.length > 0 && !shiftStarted && (
            <div className={`${glassBg} p-5 sm:p-10 rounded-[48px] border ${borderCol} max-w-4xl mx-auto flex flex-col items-center justify-center relative overflow-hidden shadow-2xl text-center mb-12`}>
              <h2 className="text-3xl font-black mb-4">Ready to Launch Clinical Dashboard?</h2>
              <p className="text-lg font-bold mb-8 text-slate-400">{todayAppointments.length} appointments today</p>
              <button 
                onClick={handleDoctorReady}
                className="px-12 py-4 rounded-full bg-blue-600 text-white text-sm font-black uppercase tracking-widest hover:bg-blue-500 border border-blue-500 transition-all active:scale-95 shadow-2xl shadow-blue-500/20"
              >
                ▶ START CONSULTATIONS
              </button>
            </div>
          )}

          {/* Active Patient Card */}
          {shiftStarted && (
            <>
              <div className={`${glassBg} p-5 sm:p-10 rounded-[48px] border ${borderCol} min-h-[500px] max-w-4xl mx-auto flex flex-col justify-center relative overflow-hidden shadow-2xl shadow-blue-500/5`}>
            <div className={`absolute top-0 right-0 p-4 sm:p-12 opacity-[0.03] ${darkMode ? "text-white" : "text-blue-900"} rotate-12 pointer-events-none`}>
              <Heart className="w-48 h-48 sm:w-[300px] sm:h-[300px]" />
            </div>

            {activePatient ? (
              <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">
                      Clinical Session Active
                    </span>
                    {activePatient.isUrgent && (
                      <span className="px-4 py-1.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse shadow-sm">
                        Emergency Override
                      </span>
                    )}
                  </div>
                  <h2 className={`text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter ${textColor} drop-shadow-2xl`}>
                    {activePatient.patientName || activePatient.name}
                  </h2>
                  <p className={`font-bold uppercase tracking-[0.4em] text-[10px] ${subTextColor} opacity-60`}>
                    Target Diagnostic: <span className="text-blue-500 font-black italic">{activePatient.diagnosis || "Pending Evaluation"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl">
                  {[
                    { label: "Patient Age", val: activePatient.patientAge || activePatient.age || "N/A", icon: <Users size={24} className="text-emerald-500" /> },
                    { label: "Service Tier", val: String(activePatient.tier).toUpperCase() === 'PREMIUM' ? "Elite" : "Standard", icon: <Crown size={24} className="text-amber-500" /> },
                  ].map((v, i) => (
                    <div
                      key={i}
                      className={`p-8 rounded-[40px] ${
                        darkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100 shadow-inner"
                      } border flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95`}
                    >
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{v.label}</p>
                      <div className="flex items-center gap-3">
                        {v.icon}
                        <p className={`text-3xl font-black tracking-tighter ${textColor}`}>{v.val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 w-full max-w-2xl pt-8 border-t border-slate-500/5">
                  <button
                    id="discharge-btn"
                    onClick={() => handleDischarge(activePatient.id)}
                    className="h-20 rounded-[32px] bg-blue-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-4 hover:translate-y-[-2px] active:translate-y-[0px]"
                  >
                    <Save size={20} />
                    <span>AUTHORIZE DISCHARGE</span>
                  </button>
                  <button
                    onClick={() => sendMessage(JSON.stringify({ type: 'RESTORE_TO_QUEUE', patientId: activePatient.id.toString() }))}
                    className="mt-4 h-12 rounded-[20px] bg-transparent border border-slate-500/30 text-slate-400 font-bold text-xs uppercase tracking-[0.1em] hover:bg-slate-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    <span>RETURN TO PATIENT LIST</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 opacity-30 flex flex-col items-center gap-6">
                <Stethoscope size={80} className="text-slate-500" />
                <div className="space-y-2">
                  <p className={`text-sm font-black uppercase tracking-[0.4em] ${subTextColor}`}>Awaiting Clinical Entry</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${subTextColor} opacity-60`}>Signal readiness to the mediator to begin next session</p>
                </div>
              </div>
            )}
          </div>

          {/* Queue List */}
          <div className="space-y-12">
            <h2 className={`text-sm font-black uppercase tracking-[0.4em] ${subTextColor} text-center border-b border-white/5 pb-4`}>
              Secondary Processing Stream
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedPatients
                .filter((p) => !activePatient || safeId(p, -1) !== safeId(activePatient, -1))
                .filter((p) => p.status !== APP_STATUS.IN_SESSION)
                .map((p, i) => (
                  <motion.div
                    key={safeId(p, i)}
                    layout
                    onClick={() => setSelectedPatient(p)}
                    className={`p-6 rounded-[32px] border transition-all group cursor-pointer ${borderCol} ${glassBg} hover:scale-[1.01] ${
                      p.status !== APP_STATUS.ARRIVED && p.status !== APP_STATUS.WAITING ? "opacity-40 grayscale" : ""
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${
                          String(p.tier).toUpperCase() === 'PREMIUM' ? "bg-amber-500/20 text-amber-600" : "bg-blue-500/10 text-blue-500 shadow-inner"
                        }`}
                      >
                        <span className="text-sm">
                          {String(p.tier).toUpperCase() === 'PREMIUM' ? p.appointmentTime || "ELITE" : `#${p.tokenNumber || i + 1}`}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-black text-lg tracking-tight ${textColor}`}>{p.patientName || p.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${p.status === APP_STATUS.ARRIVED ? "text-emerald-500" : subTextColor}`}>
                            {p.status}
                          </span>
                          {String(p.tier).toUpperCase() === 'PREMIUM' && <Sparkles size={10} className="text-amber-500" />}
                        </div>
                      </div>
                      <ChevronRight size={18} className={`${subTextColor} group-hover:translate-x-1 transition-transform`} />
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
          </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`fixed bottom-0 left-0 right-0 min-h-[7rem] py-4 ${
          darkMode ? "bg-[#020617]" : "bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
        } backdrop-blur-3xl border-t ${borderCol} z-50 px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6`}
      >
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-4 sm:gap-12 font-black">
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest">Global Status</span>
            <span className="text-[10px] sm:text-xs text-emerald-500 italic">SYSTEMS NOMINAL</span>
          </div>
          <div className="flex flex-col border-l border-slate-500/20 pl-4 sm:pl-12">
            <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest">Active Hub</span>
            <span className={`text-[10px] sm:text-xs uppercase italic ${textColor}`}>NEW DELHI CENTRAL</span>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center justify-center gap-2 sm:gap-3">
          {[
            { icon: <Calendar size={16} className="shrink-0" />, label: "SCHEDULE", path: "/schedule-management" },
            { icon: <TrendingUp size={16} className="shrink-0" />, label: "REVENUE", path: "/doctor-balance" },
          ].map((item, i) => (
            <button
              key={i}
              id={`footer-btn-${item.label.toLowerCase()}`}
              onClick={() => navigate(item.path)}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-3 px-2 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[12px] uppercase tracking-widest transition-all ${
                darkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              } border`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </footer>

      {/* Patient Detail Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={`${glassBg} border ${borderCol} max-w-2xl w-full p-12 rounded-[48px] shadow-2xl relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 text-blue-500">
                 <Users size={200} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                      Upcoming Patient Detail
                    </span>
                    <h2 className={`text-3xl sm:text-5xl font-black tracking-tighter ${textColor}`}>{selectedPatient.patientName || selectedPatient.name}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={24} className="rotate-90" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Queue Position</p>
                    <p className="text-2xl font-black text-white italic">#{selectedPatient.tokenNumber || "N/A"}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimated Age</p>
                    <p className="text-2xl font-black text-white italic">{selectedPatient.patientAge || selectedPatient.age || "N/A"} Years</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Service Tier</p>
                    <p className={`text-2xl font-black italic ${String(selectedPatient.tier).toUpperCase() === 'PREMIUM' ? "text-amber-500" : "text-blue-400"}`}>
                      {String(selectedPatient.tier).toUpperCase() === 'PREMIUM' ? "Elite Access" : "Standard"}
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-2xl font-black text-emerald-500 italic uppercase">{selectedPatient.status}</p>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Protocol Note</p>
                     <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                       Patient is verified and awaiting clinical entry. Details will be fully unlocked during active session.
                     </p>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="w-full h-16 rounded-[24px] bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
