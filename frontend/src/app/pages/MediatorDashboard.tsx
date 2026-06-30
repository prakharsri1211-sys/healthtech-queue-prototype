import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { Users, AlertCircle, Phone, ArrowUp, ArrowDown, LogOut, Moon, Sun, Search, Zap, Crown, Ticket, Activity, BellRing, MapPin, Clock, AlertTriangle, Stethoscope, ArrowLeft } from "lucide-react";
import useWebSocket from "react-use-websocket";
import { motion, AnimatePresence } from "motion/react";
const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
import { APP_STATUS, APP_ROLES, ACTIVE_QUEUE_STATUSES } from "../utils/constants";

declare global {
  interface Window {
    dischargedPatientsCache?: Set<string>;
  }
}

interface Patient {
  id: string;
  patientId?: string;
  name: string;
  patientName?: string;
  tokenNumber: number;
  status: string;
  tier: string;
  appointmentTime?: string;
}

function OverdueCounter({ startTime, date }: { startTime: string; date?: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const [h, m, s] = startTime.split(":").map(Number);
      
      let shiftTime = new Date(now);
      if (date) {
        const [y, mon, d] = date.split("-").map(Number);
        shiftTime = new Date(y, mon - 1, d);
      }
      shiftTime.setHours(h || 0, m || 0, s || 0, 0);

      const diff = now.getTime() - shiftTime.getTime();
      if (diff <= 0) {
        setElapsed("00:00:00");
        return;
      }

      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

      setElapsed(`${hrs.toString().padStart(2, '0')}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, date]);

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Overdue By</div>
      <div className="relative flex items-center justify-center">
        {/* Pulsing Animated Countdown Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-rose-500/30 animate-ping" style={{ margin: "-12px" }} />
        <div className="px-8 py-4 rounded-3xl bg-slate-950 border border-rose-500/30 text-center font-mono text-3xl font-black tracking-widest text-rose-500 shadow-sm shadow-rose-500/10">
          {elapsed || "00:00:00"}
        </div>
      </div>
    </div>
  );
}

export default function MediatorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Flash state for showing session start confirmation
  const [sessionFlash, setSessionFlash] = useState<string | null>(null);
  const [shiftStarted, setShiftStarted] = useState(false);
  const [timeToShift, setTimeToShift] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [doctorReady, setDoctorReady] = useState(false);
  const [isOvertime, setIsOvertime] = useState(false);
  const [hasPlayedOvertimeChime, setHasPlayedOvertimeChime] = useState(false);
  const lastProcessedMessageRef = useRef<any>(null);

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const socketUrl = API.replace("http", "ws") + "/ws-queue";
  const { lastJsonMessage, lastMessage, sendMessage } = useWebSocket(socketUrl, {
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
  });

  const [clinicName, setClinicName] = useState("Loading...");

  useEffect(() => {
    fetchAssignment();
  }, []);

  const fetchAssignment = async () => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;
    const medId = u?.id;
    if (!medId) {
       navigate("/login");
       return;
    }
    
    try {
      const resp = await fetch(`${API}/api/mediator/${medId}/session-info`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (!data.assigned) {
           navigate("/mediator/unassigned");
           return;
        }
        setClinicName(data.clinicName || "Clinical Facility");
        setDoctorName(data.doctorName || "Assigned Doctor");
        setSessionInfo(data);
        if (data.doctorShiftStarted) {
          setShiftStarted(true);
        }
        
        if (data.doctorId) {
            fetchPatientsForDoctor(data.doctorId);
            const todayStr = new Date().toISOString().split('T')[0];
            fetch(`${API}/api/availability/doctor/${data.doctorId}`, {
              headers: { "Authorization": token ? `Bearer ${token}` : "" }
            })
              .then(r => r.json())
              .then(avail => {
                  if (Array.isArray(avail)) {
                      const futureAvail = avail
                        .filter((a: any) => a.date >= todayStr)
                        .sort((a: any, b: any) => a.date.localeCompare(b.date))[0];
                      if (futureAvail) {
                          setSessionInfo((prev: any) => ({ ...prev, date: futureAvail.date }));
                      }
                  }
              })
              .catch(console.error);
        }
      } else {
        navigate("/mediator/unassigned");
      }
    } catch (e) {
      navigate("/mediator/unassigned");
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    let msg: any = lastJsonMessage;
    if (!msg && lastMessage && lastMessage.data) {
      try {
        msg = JSON.parse(lastMessage.data);
      } catch (e) {
        // ignore
      }
    }
    
    if (msg && msg !== lastProcessedMessageRef.current) {
      lastProcessedMessageRef.current = msg;
      console.log("WebSocket received:", msg);
      
      // Keep a local set of discharged IDs to prevent race conditions returning them in QUEUE_SYNC
      if (!window.dischargedPatientsCache) {
          window.dischargedPatientsCache = new Set<string>();
      }

      if (msg.type === "QUEUE_SYNC") {
        const seen = new Set<string>();
        const sessDocId = sessionInfo?.doctorId?.toString();
        const deduped = (msg.patients || []).filter((p: any) => {
          const key = p.patientId || p.id;
          if (seen.has(key)) return false;
          seen.add(key);
          // Filter by this mediator's assigned doctor
          if (sessDocId && p.doctorId?.toString() !== sessDocId) return false;
          
          // STRICT FIX: Filter out any patients that were locally discharged recently to prevent ghost reappearances
          if (window.dischargedPatientsCache.has(key)) return false;
          
          return true;
        }).map((p: any) => ({
          ...p,
          id: p.id || p.patientId
        }));
        setPatients(deduped);
      } else if (msg.type === "DOCTOR_READY") {
        setDoctorReady(true);
      } else if (msg.type === "SHIFT_STARTED") {
        const msgDocId = msg.doctorId?.toString();
        const sessDocId = sessionInfo?.doctorId?.toString();
        if (msgDocId && sessDocId && msgDocId !== sessDocId) {
          console.log("Ignored SHIFT_STARTED event for another doctor:", msgDocId);
          return;
        }
        setShiftStarted(true);
        setDoctorReady(true);
        setSessionFlash("Clinical Shift Launched: Dashboard Unlocked");
        setTimeout(() => setSessionFlash(null), 4000);
      } else if (msg.type === "SET_ACTIVE") {
        setDoctorReady(false);
      } else if (msg.type === "PATIENT_DISCHARGED") {
        if (msg.patientId) window.dischargedPatientsCache?.add(String(msg.patientId));
        setPatients(prev => prev.filter(p => 
          String(p.id) !== String(msg.patientId) && 
          String(p.patientId) !== String(msg.patientId) && 
          String((p as any).appointmentId) !== String(msg.patientId)
        ));
      }
    }
  }, [lastJsonMessage, lastMessage, sessionInfo]);

  // 🛡️ ROLE GUARD: Prevent unauthorized access
  useEffect(() => {
    const raw = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = raw ? JSON.parse(raw) : null;

    if (!u) {
      navigate("/");
      return;
    }
    
    if (u.role !== APP_ROLES.MEDIATOR) {
      console.warn("[SECURITY] Unauthorized Mediator Access Attempt by:", u.role);
      const target = u.role === APP_ROLES.DOCTOR ? "/doctor" : "/patient-portal";
      navigate(target);
    }
  }, [navigate]);

  const fetchPatientsForDoctor = useCallback(async (doctorId: number | string) => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      // Synchronize with specialized StationID MS-771-NX as per security protocol
      console.log("[STATION_SYNC] Connecting to MS-771-NX Clinical Hub...");
      
      const resp = await fetch(`${API}/api/mediator/queue/${doctorId}`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const data = await resp.json();
      
      if (Array.isArray(data)) {
        // The backend endpoint /queue/{doctorId} returns deduplicated list with estimatedWaitTime
        const activeQueue = data.filter((p: any) => 
          ACTIVE_QUEUE_STATUSES.includes(p.status)
        ).map((p: any) => ({
          ...p,
          id: p.id || p.appointmentId || p.patientId
        }));
        setPatients(activeQueue);
      }
    } catch (e) {
      console.error("Mediator sync failed", e);
      setPatients([]);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  }, [navigate]);

  const handleCallPatient = useCallback((p: Patient) => {
    sendMessage(JSON.stringify({ 
      type: "CALL_PATIENT", 
      patientName: p.patientName || p.name,
      patientId: p.patientId || p.id,
      message: "URGENT: Mediator is calling you. Please report to the desk immediately."
    }));
    setSessionFlash(`Calling ${p.patientName || p.name}...`);
    setTimeout(() => setSessionFlash(null), 3000);
  }, [sendMessage]);

  const handleAdmitPatient = useCallback((p: Patient) => {
    sendMessage(JSON.stringify({ 
      type: "SET_ACTIVE", 
      patientId: p.patientId || p.id 
    }));
    setSessionFlash(`${p.patientName || p.name} admitted to session.`);
    setTimeout(() => setSessionFlash(null), 3000);
  }, [sendMessage]);

  const triggerLateArrival = useCallback((patientId: string) => {
    console.log("Triggering late arrival:", patientId);
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: APP_STATUS.LATE } : p));
    
    sendMessage(JSON.stringify({ 
      type: 'LATE_ARRIVAL', 
      patientId 
    }));
  }, [sendMessage]);

  const safePatients = useMemo(() => {
    const raw = Array.isArray(patients) ? patients : [];
    const seen = new Set<string>();
    return raw.filter(p => {
      const key = p.patientId || p.id || (p as any).appointmentId;
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(p => ({
      ...p,
      id: p.id || (p as any).appointmentId || p.patientId
    }));
  }, [patients]);
  const inSessionPatients = useMemo(() => safePatients.filter(p => p.status === APP_STATUS.IN_SESSION), [safePatients]);
  const waitingPatients = useMemo(() => safePatients.filter(p => p.status === APP_STATUS.ARRIVED || p.status === APP_STATUS.CHECKED_IN), [safePatients]);
  const latePatients = useMemo(() => safePatients.filter(p => p.status === APP_STATUS.LATE || p.status === APP_STATUS.WAITING), [safePatients]);

  // UP arrow = immediately call patient into session (no reorder bounce)
  // UP/DOWN arrows mainly for reordering
  const prioritizePatient = useCallback((target: Patient, direction: "UP" | "DOWN") => {
    const sectionList = waitingPatients.sort((a,b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
    const targetIdx = sectionList.findIndex(p => p.id === target.id);
    const inSessionActive = inSessionPatients.length > 0;

    // Special Case: Patient at the very top of waiting list AND no active session
    // Pressing UP should start the session
    if (direction === "UP" && targetIdx === 0 && !inSessionActive) {
      handleAdmitPatient(target);
      return;
    }

    // Default: Perform a server-side reorder
    sendMessage(JSON.stringify({ 
      type: 'REORDER', 
      patientId: target.patientId || target.id, 
      direction 
    }));
    
    // Quick local swap for responsiveness (isolate to same status group)
    setPatients(prev => {
      const sameStatusGroup = prev.filter(p => p.status === target.status)
          .sort((a,b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
      const groupIdx = sameStatusGroup.findIndex(p => (p.patientId || p.id) === (target.patientId || target.id));
      const move = direction === "UP" ? -1 : 1;
      const swapCandidateIdx = groupIdx + move;
      
      if (swapCandidateIdx < 0 || swapCandidateIdx >= sameStatusGroup.length) return prev;
      
      const swapTarget = sameStatusGroup[swapCandidateIdx];
      
      return prev.map(p => {
        if ((p.patientId || p.id) === (target.patientId || target.id)) {
          return { ...p, tokenNumber: swapTarget.tokenNumber };
        }
        if ((p.patientId || p.id) === (swapTarget.patientId || swapTarget.id)) {
          return { ...p, tokenNumber: target.tokenNumber };
        }
        return p;
      });
    });
  }, [waitingPatients, inSessionPatients, sendMessage, handleAdmitPatient]);

  const handlePushDown3 = useCallback((p: Patient) => {
    sendMessage(JSON.stringify({ type: "PUSH_DOWN_3", patientId: p.id }));
    console.log(`Pushing ${p.name} down 3 spots.`);
  }, [sendMessage]);
  const sendTurnSignal = useCallback((p: Patient) => {
    sendMessage(JSON.stringify({ 
      type: "SIGNAL_PATIENT", 
      patientName: p.patientName || p.name,
      patientId: p.patientId || p.id,
      message: "You are NEXT: Please proceed to the waiting area near the doctor's cabin."
    }));
    setSessionFlash(`Signal sent to ${p.patientName || p.name}`);
    setTimeout(() => setSessionFlash(null), 3000);
  }, [sendMessage]);

  const triggerEmergency = useCallback((p: Patient) => {
    sendMessage(JSON.stringify({
      type: "EMERGENCY_ALERT",
      patientId: p.id,
      patientName: p.patientName || p.name,
      message: `EMERGENCY: Patient ${p.patientName || p.name} requires immediate attention!`,
    }));
  }, [sendMessage]);



  const darkBg = "bg-slate-900";
  const cardBg = darkMode ? "bg-white/[0.03]" : "bg-white";
  const glassBg = darkMode ? "bg-white/[0.03]" : "bg-slate-50/80";
  const borderCol = darkMode ? "border-white/[0.06]" : "border-slate-200/80";
  const textColor = darkMode ? "text-white" : "text-[#1a1a2e]";
  const subTextColor = darkMode ? "text-slate-500" : "text-slate-500";

  useEffect(() => {
    const timer = setInterval(() => {
        if (!sessionInfo) return;
        
        // If no start time is configured, allow immediate session launch
        if (!sessionInfo.startTime || typeof sessionInfo.startTime !== 'string') {
            setTimeToShift("READY");
            return;
        }
        
        const now = new Date();
        const [h, m, s] = sessionInfo.startTime.split(":").map(Number);
        
        let shiftTime = new Date(now);
        if (sessionInfo.date) {
            const [y, mon, d] = sessionInfo.date.split("-").map(Number);
            shiftTime = new Date(y, mon - 1, d);
        }
        shiftTime.setHours(h || 0, m || 0, s || 0, 0);

        if (now.getTime() >= shiftTime.getTime()) {
            setTimeToShift("READY");
            // If the backend says the doctor has already manually started, skip the overlay
            if (sessionInfo.doctorShiftStarted) setShiftStarted(true);
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
        if (sessionInfo.endTime) {
            let endTime = new Date(now);
            if (sessionInfo.date) {
                const [y, mon, d] = sessionInfo.date.split("-").map(Number);
                endTime = new Date(y, mon - 1, d);
            }
            const [eh, em, es] = sessionInfo.endTime.split(":").map(Number);
            endTime.setHours(eh, em || 0, es || 0, 0);

            // Compute length safely within effect, bypassing closures if needed but safePatients is updated by React.
            // Wait, since safePatients is not in dependency array, we should rely on patients state.
            // Actually, we'll check it during render and only trigger chime via effect if isOvertime changes.
            // To avoid closure issues, we can just use set state functional update or check during render.
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionInfo]);

  // Overtime computation during render to ensure fresh patients state
  useEffect(() => {
    if (sessionInfo?.endTime) {
        let endTime = new Date(currentTime);
        if (sessionInfo.date) {
            const [y, mon, d] = sessionInfo.date.split("-").map(Number);
            endTime = new Date(y, mon - 1, d);
        }
        const [eh, em, es] = sessionInfo.endTime.split(":").map(Number);
        endTime.setHours(eh, em || 0, es || 0, 0);

        if (currentTime.getTime() > endTime.getTime() && safePatients.length > 0) {
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
  }, [currentTime, safePatients.length, sessionInfo, isOvertime, hasPlayedOvertimeChime]);

  if (!sessionInfo || !doctorName) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs uppercase tracking-widest animate-pulse">
        Initializing Terminal Context...
      </div>
    );
  }

  // 🛡️ SHIFT GUARD LOGIC 🛡️
  const getAbsoluteTimeMs = (timeStr: string | undefined) => {
    if (!timeStr) return -1;
    let d = new Date();
    const cleanStr = timeStr.trim();
    let [h, m] = cleanStr.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      d.setHours(h, m, 0, 0);
    }
    return d.getTime();
  };

  const startTimeMs = sessionInfo?.startTime ? getAbsoluteTimeMs(sessionInfo.startTime) : -1;
  const isBeforeShift = startTimeMs !== -1 && currentTime.getTime() < startTimeMs;
  const isShiftConcluded = startTimeMs !== -1 && currentTime.getTime() >= startTimeMs && patients.length === 0;

  if (isBeforeShift) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 font-sans ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800"}`}>
        <AlertCircle size={64} className="text-amber-500 mb-6" />
        <h2 className="text-3xl font-black tracking-tight mb-2">Shift Has Not Started</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-8">Clinic Opens at {sessionInfo?.startTime}</p>
        <button onClick={handleLogout} className="px-8 py-4 bg-slate-800 rounded-full font-bold shadow-lg hover:scale-105 transition-all text-white">Return to Login</button>
      </div>
    );
  }

  if (isShiftConcluded) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center transition-colors duration-500 font-sans ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800"}`}>
        <LogOut size={64} className="text-emerald-500 mb-6" />
        <h2 className="text-3xl font-black tracking-tight mb-2">Shift Concluded</h2>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-8">All patients discharged. No active queues.</p>
        <button onClick={handleLogout} className="px-8 py-4 bg-emerald-600 rounded-full font-bold shadow-lg hover:scale-105 transition-all text-white">End Session</button>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen ${darkMode ? darkBg : 'bg-slate-50'} transition-colors duration-500 overflow-x-hidden`}>
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[160px]" />
      </div>

      {/* Session Flash Toast */}
      <AnimatePresence>
        {sessionFlash && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto sm:bottom-auto sm:top-6 sm:right-6 sm:left-auto sm:translate-x-0 z-[100] px-8 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-emerald-500/30 flex items-center gap-3"
          >
            <Zap size={18} className="fill-current animate-pulse" />
            <span>{sessionFlash} → IN SESSION</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!shiftStarted && sessionInfo && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 text-center overflow-hidden"
            >
                {/* Background blur */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/5 rounded-full blur-[150px]" />
                </div>

                {/* Main content — capped height so it never pushes logout off-screen */}
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative z-10 space-y-8 w-[95%] sm:max-w-lg mx-auto max-h-[calc(100vh-120px)] overflow-y-auto pb-4">
                    <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl">
                        <Clock size={48} className="text-blue-500 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Shift Readiness Protocol</p>
                        {timeToShift === "READY" ? (
                          <>
                            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter italic text-white leading-none">
                              ACCESS RESTRICTED<br/>
                              <span className="text-blue-500">DOCTOR HASN'T STARTED SHIFT</span>
                            </h1>
                            {/* Countdown since scheduled time — shows how long overdue */}
                            {sessionInfo?.startTime && (
                              <div className="mt-6 space-y-4">
                                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                                  <Clock size={16} className="text-amber-400" />
                                  <span className="text-sm font-black uppercase tracking-widest text-amber-400">
                                    Scheduled Start: {sessionInfo.startTime}
                                  </span>
                                </div>
                                <OverdueCounter startTime={sessionInfo.startTime} date={sessionInfo.date} />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-4">
                            <h1 className="text-2xl sm:text-5xl font-black tracking-tighter italic text-white leading-none">
                              CONSULTATIONS START IN
                            </h1>
                            <div className="relative flex items-center justify-center mt-4">
                              {/* Pulsing Animated Countdown Ring */}
                              <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping" style={{ margin: "-12px" }} />
                              <div className="px-6 py-4 sm:px-10 sm:py-5 rounded-3xl bg-slate-950 border border-blue-500/30 text-center font-mono text-3xl sm:text-4xl font-black tracking-widest text-blue-500 shadow-sm shadow-blue-500/10">
                                {timeToShift}
                              </div>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="p-6 rounded-[40px] bg-white/5 border border-white/5 max-w-sm mx-auto flex items-center gap-6">
                        <div className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/30 bg-slate-800">
                            <img src="/doctor-avatar.png" alt="Doctor" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <Stethoscope size={12} className="text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Clinical Lead</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-lg font-bold">{doctorName}</p>
                                {doctorReady && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-[8px] font-black text-white animate-pulse uppercase tracking-widest">
                                        Doctor Ready
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">{clinicName}</p>
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 animate-pulse">
                        {sessionInfo?.startTime ? `Scheduled for ${sessionInfo.startTime}` : "Waiting for Doctor to initiate clinical launch"}
                    </p>
                    {timeToShift === "READY" && (
                      <div className="mt-4 px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest text-center animate-pulse">
                        ⚠️ Queue access locked until doctor launches clinical dashboard
                      </div>
                    )}
                </motion.div>

                {/* Absolutely positioned logout — always anchored to bottom, never overflows */}
                <button
                    onClick={handleLogout}
                    className="absolute bottom-6 left-0 right-0 mx-auto w-fit z-50 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-full border border-white/10"
                >
                    Terminal Logout
                </button>
            </motion.div>
        )}
      </AnimatePresence>

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

      <div className="relative max-w-3xl mx-auto px-6 py-8 space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
              <Users size={24} className="sm:w-7 sm:h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl sm:text-3xl font-black tracking-tighter uppercase italic leading-tight mb-1 sm:mb-2 ${textColor} truncate`}>Mediator Dashboard</h1>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${subTextColor} truncate`}>
                     {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Stethoscope size={10} className="text-blue-500 shrink-0" />
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-blue-400 whitespace-nowrap">Clinical Hub</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <MapPin size={10} className="text-indigo-500 shrink-0" />
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-400 whitespace-nowrap">{clinicName || 'Loading...'}</span>
                  </div>
                  {sessionInfo?.startTime && (
                    <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Clock size={10} className="text-emerald-500 shrink-0" />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">Starts {sessionInfo.startTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 sm:p-3 shrink-0 rounded-xl sm:rounded-2xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'} border hover:bg-white/10 transition-colors`}>
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-blue-600" />}
            </button>
            <button
              onClick={() => sendMessage(JSON.stringify({ type: "EMERGENCY_ALERT", patientName: "Unknown", message: "CLINIC-WIDE EMERGENCY ALERT!" }))}
              className="px-4 py-2.5 sm:px-5 sm:py-3 shrink-0 rounded-xl sm:rounded-2xl bg-rose-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20"
            >
              <AlertCircle size={14} className="shrink-0" /> <span>Alert</span>
            </button>
            <button onClick={handleLogout} className={`p-2.5 sm:p-3 shrink-0 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'} hover:bg-white/10 transition-colors`}>
              <LogOut size={18} className="shrink-0" />
            </button>
          </div>
        </header>

        <section className="space-y-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
             {[
               { label: "Active Queue", val: safePatients.length, icon: <Activity size={16} />, color: "blue" },
               { label: "Elite Entries", val: safePatients.filter(p => String(p.tier).toUpperCase() === 'PREMIUM').length, icon: <Crown size={16} />, color: "amber" },
               { label: "At Facility", val: safePatients.filter(p => p.status === APP_STATUS.ARRIVED).length, icon: <MapPin size={16} />, color: "emerald" },
               { label: "Pending", val: safePatients.filter(p => p.status === APP_STATUS.WAITING).length, icon: <Clock size={16} />, color: "slate" }
             ].map((stat, i) => (
               <div key={i} className={`p-4 sm:p-5 border transition-colors rounded-[24px] sm:rounded-3xl ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                 <div className={`text-${stat.color}-500 mb-2`}>{stat.icon}</div>
                 <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 truncate">{stat.label}</p>
                 <p className={`text-xl sm:text-3xl font-black tracking-tighter leading-none ${textColor}`}>{stat.val}</p>
               </div>
             ))}
          </div>

          {/* Categorized Sections */}
          <div className="space-y-16">
            {[
              { title: "In Session", list: inSessionPatients, accent: "rose" },
              { title: "Arrived / Waiting", list: waitingPatients, accent: "emerald" },
              { title: "Late / Delayed", list: latePatients, accent: "amber" }
            ].map((section, sIdx) => (
              <div key={sIdx} className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <div className={`w-2 h-2 rounded-full bg-${section.accent}-500 shadow-[0_0_10px_rgba(255,255,255,0.3)]`} />
                    {section.title}
                  </h3>
                  <span className={`text-[10px] font-black ${subTextColor} uppercase tracking-[0.1em]`}>{section.list.length} Records</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence mode="popLayout">
                    {section.list.map((p) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-6 border group hover:scale-[1.005] transition-all duration-300 rounded-[32px] ${
                          p.status === APP_STATUS.IN_SESSION ? 'border-rose-500 ring-4 ring-rose-500/20 bg-rose-500/5 shadow-2xl shadow-rose-500/10' : 
                          p.tier === 'PREMIUM' ? 'border-amber-500/30 bg-amber-500/5' : `${borderCol} ${glassBg}`
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                          <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
                            <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-inner ${
                              p.status === APP_STATUS.IN_SESSION ? 'bg-rose-500 text-white shadow-rose-500/40' :
                              p.tier === 'PREMIUM' ? 'bg-amber-500/20 text-amber-600' : 'bg-blue-500/20 text-blue-600'
                            }`}>
                              <span className="flex flex-col items-center justify-center text-center leading-tight">
                                {p.tier === 'PREMIUM' ? (
                                  <>
                                    <Clock size={14} className="mb-0.5 sm:w-4 sm:h-4" />
                                    <span className="text-[8px] sm:text-[10px] font-black">{p.appointmentTime || 'ELITE'}</span>
                                  </>
                                ) : (
                                  <span className="text-lg sm:text-xl font-black italic">#{p.tokenNumber}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                 {section.title === "Arrived / Waiting" && section.list.indexOf(p) === 0 && (
                                   <div className="mb-1 sm:mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md sm:rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                     <Zap size={10} className="text-emerald-500 fill-current shrink-0" />
                                     <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">Next Priority</span>
                                   </div>
                                 )}
                                 <h4 className={`text-base sm:text-lg font-black tracking-tight leading-none ${textColor} truncate`}>{p.patientName || p.name}</h4>
                                 {String(p.tier).toUpperCase() === 'PREMIUM' && (
                                    <div className={`px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-[7px] sm:text-[8px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1.5 shadow-sm mt-1 w-fit`}>
                                     <Crown size={8} className="shrink-0" /> <span className="whitespace-nowrap">SLOT: {p.appointmentTime || 'ELITE'}</span>
                                    </div>
                                 )}
                                 <div className="flex items-center gap-2 sm:gap-3 mt-1.5">
                                  <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                                    p.status === APP_STATUS.ARRIVED || p.status === APP_STATUS.CHECKED_IN ? 'text-emerald-500' :
                                    p.status === APP_STATUS.WAITING ? 'text-blue-500' :
                                    p.status === APP_STATUS.IN_SESSION ? 'text-rose-400' : 'text-amber-500'
                                  }`}>{p.status === APP_STATUS.CHECKED_IN ? 'CHECKED IN ✓' : p.status}</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                                  <div className="flex items-center gap-1 min-w-0">
                                    {String(p.tier).toUpperCase() === 'PREMIUM' ? <Crown size={10} className="text-amber-500 shrink-0" /> : <Ticket size={10} className="text-blue-500 shrink-0" />}
                                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${subTextColor} truncate`}>
                                      {p.tier} <span className="hidden sm:inline">TIER</span> {String(p.tier).toUpperCase() === 'PREMIUM' && p.appointmentTime ? `• ${p.appointmentTime}` : ''}
                                    </span>
                                  </div>
                                </div>
                               </div>
                            </div>
                           <div className="flex flex-wrap items-center gap-2">
                              {p.status !== APP_STATUS.IN_SESSION ? (
                                <>
                                  <button 
                                    onClick={() => sendTurnSignal(p)} 
                                    className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all shadow-lg" 
                                    title="SIGNAL PATIENT"
                                  >
                                    <BellRing size={14} className="sm:w-4 sm:h-4" />
                                  </button>
                                  {section.title !== "Late / Delayed" && (
                                    <>
                                      <button
                                        onClick={() => prioritizePatient(p, "UP")}
                                        className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-lg sm:rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg"
                                        title="Admit to Session Now"
                                      >
                                        <ArrowUp size={14} className="sm:w-4 sm:h-4" />
                                      </button>
                                      <button onClick={() => prioritizePatient(p, "DOWN")} className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-lg sm:rounded-xl border ${darkMode ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'} transition-all`} title="Move Down"><ArrowDown size={14} className="sm:w-4 sm:h-4" /></button>
                                    </>
                                  )}
                                  <button onClick={() => handleCallPatient(p)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-9 sm:h-10 px-4 sm:px-5 rounded-lg sm:rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 shrink-0 min-w-[80px]"><Phone size={12} className="shrink-0" /> Call</button>
                                </>
                              ) : (
                                <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                                  <Zap size={12} className="animate-pulse" />
                                  Active Session
                                </div>
                              )}
                           </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            {safePatients.length === 0 && (
              <div className={`py-24 text-center rounded-[40px] border-2 border-dashed ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <Users size={48} className="mx-auto text-slate-400 mb-6 opacity-30" />
                <p className={`text-sm font-black uppercase tracking-[0.3em] ${subTextColor}`}>Live Pipeline Empty</p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className={`py-4 border-t ${darkMode ? 'border-white/5' : 'border-slate-200'} flex justify-between items-center`}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              DB-Sync: Nominal
            </span>
            <span className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              WS-Stream: Active
            </span>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${subTextColor}`}>
            Station ID: MS-771-NX • Session: {currentTime.toLocaleTimeString()}
          </span>
        </footer>
      </div>
    </div>
  );
}
