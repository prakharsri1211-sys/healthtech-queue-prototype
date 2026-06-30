import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Clock, MapPin, Users, Crown, Ticket, Stethoscope, Pill, User,
  ShieldAlert, Sparkles, Navigation, Zap, Activity, Sun, Moon,
  LogOut, BellRing, ChevronDown, ChevronUp, ChevronLeft, CalendarClock, AlertTriangle, Loader2
} from "lucide-react";
import useWebSocket from "react-use-websocket";
import { motion, AnimatePresence } from "motion/react";
import { APP_STATUS } from "../utils/constants";

/* ──────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────── */
interface ClinicDetails {
  doctorName: string;
  speciality: string;
  clinicAddress: string;
  pharmacy: string;
  wheelchairAccess: boolean;
  startTime: string;
  endTime: string;
}

type Phase = "SCHEDULED" | "ACTIVE_DAY" | "LIVE" | "READY" | "CANCELED";

/* ──────────────────────────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────────────────────────── */
let sharedAudioCtx: AudioContext | null = null;
const initAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
};
if (typeof window !== "undefined") {
  window.addEventListener("click", initAudioContext, { once: true });
  window.addEventListener("touchstart", initAudioContext, { once: true });
}

const playNotificationSound = (type: "bell" | "beep" | "call") => {
  try {
    initAudioContext();
    const audioCtx = sharedAudioCtx;
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    
    // "call" simulates a classic phone ring (two notes together, repeated)
    if (type === "call" || type === "bell") { 
      // The Mediator uses "bell" parameter for CALL_PATIENT in the codebase right now. We will treat it as "call".
      const playRing = (delay: number) => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime + delay); // A4
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, audioCtx.currentTime + delay); // Dissonant tone makes the "ring"
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + delay + 0.05); // Attack
        gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime + delay + 1.2); // Hold for 1.2s
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + delay + 1.3); // Release
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.start(audioCtx.currentTime + delay);
        osc2.start(audioCtx.currentTime + delay);
        osc1.stop(audioCtx.currentTime + delay + 1.4);
        osc2.stop(audioCtx.currentTime + delay + 1.4);
      };

      // Play a standard double-ring (Ring for 1.3s, Pause 0.2s, Ring for 1.3s)
      playRing(0);
      playRing(1.5);
      
    } else {
      // "beep" / turn signal -> Elevator Ding-Dong chime
      const playChime = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + delay + 0.05); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 1.5); // Long fade out
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 1.6);
      };

      // Ding (High) -> Dong (Low)
      playChime(880, 0);   // A5
      playChime(659.25, 0.4); // E5
    }
  } catch (err) {
    console.warn("Failed to play sound synthesis", err);
  }
};

export default function Tracker() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const bookingInfo = appointmentData;

  const [currentServing, setCurrentServing] = useState(1);
  const [liveQueue, setLiveQueue] = useState<any[]>([]);
  const [currentQueueLength, setCurrentQueueLength] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const lastProcessedMessageRef = useRef<any>(null);
  const [isArrived, setIsArrived] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clinicDetails, setClinicDetails] = useState<ClinicDetails | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [isCanceled, setIsCanceled] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  /* Issue 6: Smart ETA state */
  const [smartETA, setSmartETA] = useState<string | null>(null);
  const [clinicOpensAt, setClinicOpensAt] = useState<string | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [travelTime, setTravelTime] = useState<number>(20);
  const [safetyBuffer, setSafetyBuffer] = useState<number>(10);

  const [msUntilCheckIn, setMsUntilCheckIn] = useState(Infinity);
  const [checkInOpen, setCheckInOpen]       = useState(false);
  const [verified, setVerified]             = useState(false);
  const [checkInOpenTimeStr, setCheckInOpenTimeStr] = useState('');

  useEffect(() => {
    if (!bookingInfo?.timeSlot) return;
    const tick = () => {
      const [h, m] = bookingInfo.timeSlot.split(':').map(Number);
      const apptMs = new Date().setHours(h, m, 0, 0);
      const openMs = apptMs - 15 * 60000;
      const remaining = openMs - Date.now();
      setCheckInOpenTimeStr(new Date(openMs).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false}));
      remaining <= 0 ? setCheckInOpen(true) : (setCheckInOpen(false), setMsUntilCheckIn(remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bookingInfo?.timeSlot]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleCheckIn = async () => {
    try {
      const r = await fetch(`${API}/api/appointments/${bookingInfo.id}/check-in`, { method:'POST' });
      if (r.ok) setVerified(true); else throw new Error('Check-in failed');
    } catch (e: any) { alert(e.message); }
  };

  /* ── Theme sync ───────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* ── Live clock (1 s tick) & Overtime Logic ────────────────── */
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);

        // Check for Overtime
        if (clinicDetails?.endTime) {
            const localTodayStr = now.toLocaleDateString("en-CA");
            if (bookingInfo?.date && bookingInfo.date !== localTodayStr) {
                setIsOvertime(false);
            } else {
                let endTime = new Date(now);
                const [eh, em, es] = clinicDetails.endTime.split(":").map(Number);
                endTime.setHours(eh, em || 0, es || 0, 0);

                if (now.getTime() > endTime.getTime() && currentQueueLength > 0) {
                    setIsOvertime(true);
                } else {
                    setIsOvertime(false);
                }
            }
        }
    }, 1000);
    return () => clearInterval(timer);
  }, [clinicDetails, currentQueueLength]);

  /* ── WebSocket: queue sync + emergency alerts ─────────────── */
  const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
  const socketUrl = API.replace("http", "ws") + "/ws-queue";
  const { lastJsonMessage, sendMessage } = useWebSocket(socketUrl, {
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

  const [notification, setNotification] = useState<{
    message: string;
    urgent: boolean;
    isTurnSignal?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!lastJsonMessage) return;
    const msg = lastJsonMessage as any;
    if (!msg || !bookingInfo) return;

    const normalize = (val: any) => String(val || "").trim().toLowerCase();
    const targetPatientId = normalize(msg.patientId);
    const myPatientId = normalize(bookingInfo.patientId);
    const myApptId = normalize(bookingInfo.id);
    const targetName = normalize(msg.patientName);
    const myName = normalize(bookingInfo.patientName);

    const isMatch =
      (targetPatientId && (targetPatientId === myPatientId || targetPatientId === myApptId)) ||
      (targetName && targetName === myName);

    if (msg.type === "QUEUE_SYNC") {
      setLiveQueue(msg.patients || []);
      setCurrentQueueLength(msg.patients?.length || 0);
      const myEntry = (msg.patients || []).find(
        (p: any) =>
          normalize(p.patientId) === myPatientId ||
          (p.patientName && normalize(p.patientName) === myName)
      );
      if (myEntry) {
        setCurrentServing(msg.patients[0]?.tokenNumber || 1);
        if (myEntry.status === APP_STATUS.ARRIVED) setIsArrived(true);
      }
    } else if (msg.type === "CALL_PATIENT" && isMatch) {
      setIsRinging(true);
      const msgText = msg.message || "URGENT: Please report to the Mediator desk immediately.";
      setNotification({
        message: msgText,
        urgent: true,
      });
      
      // Native notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(reg => reg?.showNotification("Urgent Mediator Alert", { body: msgText, icon: "/favicon.ico", vibrate: [200, 100, 200] } as any));
        } else {
          try {
            new Notification("Urgent Mediator Alert", { body: msgText, icon: "/favicon.ico" });
          } catch (e) {
            console.warn("Mobile browser blocked Notification constructor", e);
          }
        }
      }

      const ringInterval = setInterval(() => {
        playNotificationSound("bell");
      }, 3000);
      (window as any)._ringInterval = ringInterval;
    } else if (msg.type === "SIGNAL_PATIENT" && isMatch) {
      const msgText = msg.message || "You are NEXT: Please prepare to enter the clinic.";
      setNotification({
        message: msgText,
        urgent: false,
        isTurnSignal: true,
      });

      // Native notification
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then(reg => reg?.showNotification("Mediator Queue Alert", { body: msgText, icon: "/favicon.ico", vibrate: [200, 100, 200] } as any));
        } else {
          try {
            new Notification("Mediator Queue Alert", { body: msgText, icon: "/favicon.ico" });
          } catch (e) {
            console.warn("Mobile browser blocked Notification constructor", e);
          }
        }
      }

      playNotificationSound("beep");
      setTimeout(() => setNotification(null), 20000);
    } else if ((msg.type === "PATIENT_DISCHARGED" || msg.type === "DISCHARGE") && isMatch) {
      console.log("[Tracker] Patient discharged event received. Redirecting to portal.");
      localStorage.removeItem("bookingInfo");
      localStorage.setItem("hadAppointmentToday", "true");
      if ((window as any)._ringInterval) {
        clearInterval((window as any)._ringInterval);
      }
      navigate("/patient-portal?completed=true", { replace: true });
    }
  }, [lastJsonMessage, bookingInfo]);

  // Request browser notification permission on mount
  // Removed because mobile Chrome blocks auto-prompting without a user gesture.
  // We now have a manual "Allow Push" button in the UI instead.
  useEffect(() => {
    // Intentionally empty
  }, []);

  /* Issue 6: Fetch Smart ETA when appointment is loaded */
  useEffect(() => {
    if (bookingInfo?.id) {
      fetch(`${API}/api/appointments/${bookingInfo.id}/eta`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 500) {
              setTelemetryError("Smart ETA telemetry offline (500). Retrying...");
            }
            throw new Error(`ETA Fetch error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setSmartETA(data.suggestedArrivalTime || null);
          setClinicOpensAt(data.clinicOpensAt || null);
          if (data.travelTime !== undefined) setTravelTime(data.travelTime);
          if (data.safetyBuffer !== undefined) setSafetyBuffer(data.safetyBuffer);
          setTelemetryError(null);
        })
        .catch((e) => {
          console.error("[Tracker] Smart ETA failed:", e);
          if (e?.message?.includes("500")) {
            setTelemetryError("Smart ETA telemetry offline (500). Retrying...");
          } else {
            setTelemetryError("Telemetry connection degraded. Retrying...");
          }
        });
    }
  }, [bookingInfo?.id, API]);

  /* ── Load booking + session validation ────────────────────── */
  useEffect(() => {
    const fetchActiveSession = async () => {
      setLoading(true);
      const info = localStorage.getItem("bookingInfo");
      try {
        const patientStr = sessionStorage.getItem("selectedPatient");
        let patientId = "";

        if (patientStr) {
          const p = JSON.parse(patientStr);
          patientId = p.id || p.patientId;
        } else if (info) {
          const parsed = JSON.parse(info);
          patientId = parsed.patientId || parsed.id;
        }

        if (!patientId) {
          console.warn("[Tracker] No patient identifier found. Redirecting to portal.");
          navigate("/patient-portal");
          return;
        }

        const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
        const u = userStr ? JSON.parse(userStr) : null;
        const token = u?.token;

        const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
        const checkActiveUrl = `${apiBase}/api/appointments/patient/${patientId}/check-active`;

        console.log(`[Tracker] Syncing Active Appointment from: ${checkActiveUrl}`);
        const resp = await fetch(checkActiveUrl, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });

        if (resp.status === 500) {
          setTelemetryError("Active session sync offline (500). Retrying...");
        }

        if (resp.ok) {
          setTelemetryError(null);
          const data = await resp.json();
          const activeAppt = data.todayAppointment || data.nextActiveAppointment;
          if (activeAppt) {
            console.log("[Tracker] Active session successfully loaded:", activeAppt);
            setAppointmentData(activeAppt);
            localStorage.setItem("bookingInfo", JSON.stringify(activeAppt));

            if (activeAppt.status === APP_STATUS.ARRIVED || activeAppt.status === APP_STATUS.CHECKED_IN) {
              setIsArrived(true);
            }
            if (activeAppt.status === "CANCELED" || activeAppt.status === "CANCELLED") {
              setIsCanceled(true);
            }

            // Sync clinic details
            if (activeAppt.doctorId) {
              const detailUrl = `${apiBase}/api/clinic-metadata/${activeAppt.doctorId}`;
              fetch(detailUrl, {
                headers: { Authorization: token ? `Bearer ${token}` : "" },
              })
                .then((r) => {
                  if (!r.ok) throw new Error("Clinic details unreachable");
                  return r.json();
                })
                .then((metadata) => {
                  setClinicDetails({
                    doctorName: activeAppt.doctorName || "Loading...",
                    speciality: activeAppt.specialty || activeAppt.speciality || "General Medicine",
                    clinicAddress: metadata?.clinicName || metadata?.clinicAddress || activeAppt.clinicAddress || "Clinic Address",
                    pharmacy: metadata?.facilities?.some((f: string) => f.toLowerCase().includes("pharmacy")) ? "Yes" : "No",
                    wheelchairAccess: !!metadata?.facilities?.some((f: string) => f.toLowerCase().includes("wheelchair")),
                    startTime: activeAppt.clinicStartTime || null,
                    endTime: activeAppt.clinicEndTime || null,
                  });
                })
                .catch(() =>
                  setClinicDetails({
                    doctorName: activeAppt.doctorName || "Loading...",
                    speciality: activeAppt.specialty || activeAppt.speciality || "General Medicine",
                    clinicAddress: activeAppt.clinicAddress || "Clinic Address",
                    pharmacy: "Yes",
                    wheelchairAccess: true,
                    startTime: activeAppt.clinicStartTime || null,
                    endTime: activeAppt.clinicEndTime || null,
                  })
                );

              fetch(`${apiBase}/api/availability/doctor/${activeAppt.doctorId}`, {
                headers: { Authorization: token ? `Bearer ${token}` : "" },
              })
                .then((r) => r.json())
                .then((availData) => {
                  if (Array.isArray(availData)) {
                    const avail = availData.find((a: any) => a.date === activeAppt.date);
                    if (avail) {
                      setClinicDetails((prev) =>
                        prev ? { 
                          ...prev, 
                          startTime: avail.startTime || null,
                          endTime: avail.endTime || null
                        } : null
                      );
                    }
                  }
                })
                .catch(console.error);
            }
          } else {
            console.warn("[Tracker] No active appointment found on backend.");
            navigate("/patient-portal");
          }
        } else {
          console.error("[Tracker] Failed to load active session:", resp.status);
          if (info) {
            const parsed = JSON.parse(info);
            setAppointmentData(parsed);
            if (parsed.status === APP_STATUS.ARRIVED) setIsArrived(true);
            if (parsed.status === "CANCELED") setIsCanceled(true);
          } else {
            navigate("/patient-portal");
          }
        }
      } catch (err) {
        console.error("[Tracker] Error resolving active session:", err);
        setTelemetryError("Active session sync offline. Retrying...");
        if (info) {
          const parsed = JSON.parse(info);
          setAppointmentData(parsed);
          if (parsed.status === APP_STATUS.ARRIVED) setIsArrived(true);
          if (parsed.status === "CANCELED") setIsCanceled(true);
        } else {
          navigate("/patient-portal");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSession();
  }, [navigate]);

  /* ── Live session validation interval ────────────────────── */
  useEffect(() => {
    if (!appointmentData) return;

    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    const validateSession = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        if (appointmentData.date !== todayStr) return;

        const pId = (appointmentData.patientId || appointmentData.id || "").toString().trim().toLowerCase();
        const pName = (appointmentData.patientName || "").toString().trim().toLowerCase();
        if (!pId && !pName) return;

        const queueResp = await fetch(`${API}/api/mediator/queue/all`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });

        if (!queueResp.ok) {
          console.error("[Tracker] Queue validation fetch failed:", queueResp.status);
          return;
        }

        const queue: any[] = await queueResp.json();
        const inQueue = queue.some((e: any) => {
          const qPid = (e.patientId || e.id || "").toString().trim().toLowerCase();
          const qName = (e.patientName || "").toString().trim().toLowerCase();
          return (pId && qPid === pId) || (pName && qName === pName);
        });

        if (!inQueue) {
          console.log("[Tracker] Patient absent from live queue — appointment complete. Redirecting.");
          localStorage.removeItem("bookingInfo");
          navigate("/patient-portal?completed=true");
        }
      } catch (e) {
        console.error("Session validation failed:", e);
      }
    };

    validateSession();
    const validationInterval = setInterval(validateSession, 8000);
    return () => clearInterval(validationInterval);
  }, [appointmentData, navigate, API]);

  /* ── Actions ──────────────────────────────────────────────── */
  const handleArrival = useCallback(async () => {
    const api = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      if (bookingInfo.id) {
        const response = await fetch(`${api}/api/appointments/${bookingInfo.id}/check-in`, {
          method: "POST",
          headers: { Authorization: token ? `Bearer ${token}` : "", "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Check-in failed");
      }

      const updated = { ...bookingInfo, status: APP_STATUS.CHECKED_IN };
      setAppointmentData(updated);
      setIsArrived(true);
      localStorage.setItem("bookingInfo", JSON.stringify(updated));

      sendMessage(
        JSON.stringify({
          type: "PATIENT_ARRIVED",
          patientId: bookingInfo.patientId,
          name: bookingInfo.patientName || "A Patient",
          tokenNumber: bookingInfo.tokenNumber,
          tier: bookingInfo.tier,
        })
      );
    } catch (error) {
      console.error("Arrival sync failed:", error);
      setIsArrived(true);
    }
  }, [bookingInfo, sendMessage]);

  const handleRebook = useCallback(() => {
    localStorage.removeItem("bookingInfo");
    sessionStorage.removeItem("selectedPatient");
    navigate("/specialty-selection");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  }, [navigate]);

  const parseTimeToMs = useCallback((t: string): number => {
    if (!t) return 11 * 60 * 60000 + 55 * 60000;
    const parts = t.trim().split(':');
    if (parts.length < 2) return 11 * 60 * 60000 + 55 * 60000;
    const [h, m] = parts.map(Number);
    if (isNaN(h) || isNaN(m)) return 11 * 60 * 60000 + 55 * 60000;
    return (h * 60 + m) * 60000;
  }, []);
  
  const formatMs = useCallback((ms: number): string => {
    if (isNaN(ms) || ms < 0) ms = 11 * 60 * 60000 + 55 * 60000;
    const totalMin = Math.floor(ms / 60000);
    let h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }, []);

  /* ── Guard ────────────────────────────────────────────────── */
  if (loading || !appointmentData) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="relative">
          <Loader2 size={48} className="text-emerald-400 animate-spin relative z-10" />
        </div>
        <p className="mt-6 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
          Synchronizing Live Clinical Session...
        </p>
      </div>
    );
  }

  /* ── Derived values ───────────────────────────────────────── */
  // Issue 6 Fix: Use ONLY isPremium boolean field — do NOT fall back to tier string
  const isPremium = bookingInfo.isPremium === true;

  const tokensAhead =
    !isPremium && bookingInfo.tokenNumber
      ? Math.max(0, bookingInfo.tokenNumber - currentServing)
      : 0;

  /* ── Appointment time calculation ─────────────────────────── */
  const formatTime24Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return "Loading...";
    const parts = timeStr.trim().split(":");
    let h = Number(parts[0]);
    let m = Number(parts[1]) || 0;
    if (isNaN(h) || isNaN(m)) return "Loading...";
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const getAppointmentDateTime = () => {
    let d = new Date();
    if (bookingInfo?.date) {
      const [year, month, day] = bookingInfo.date.split("-").map(Number);
      d = new Date(year, month - 1, day);
    }
    
    // Priority 1: Smart ETA from backend (if standard token)
    if (!isPremium && smartETA) {
      let [h, m] = smartETA.trim().split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        d.setHours(h, m, 0, 0);
        return d;
      }
    }

    const timeStr = (bookingInfo?.timeSlot || bookingInfo?.time || "").trim();

    if (timeStr && timeStr.toUpperCase() !== "DIRECT WALK-IN") {
      const parts = timeStr.split(":");
      let h = Number(parts[0]);
      let m = Number(parts[1]) || 0;
      if (!isNaN(h) && !isNaN(m)) {
        d.setHours(h, m, 0, 0);
      } else {
        d.setHours(11, 55, 0, 0);
      }
    } else {
      const startStr = clinicOpensAt || clinicDetails?.startTime || '11:55';
      let [h, m] = startStr.trim().split(":").map(Number);
      if (isNaN(h)) h = 11;
      if (isNaN(m)) m = 55;
      d.setHours(h, m, 0, 0);
      
      // Dynamic shift: If the clinic opening time has passed, the true queue base is NOW
      const now = new Date();
      if (d.getTime() < now.getTime()) {
         d = new Date(now.getTime());
      }
      
      d.setMinutes(d.getMinutes() + (tokensAhead || 0) * 15);
    }
    return d;
  };

  /* ── Phase calculation ─────────────────────────────────────── */
  const apptTime = getAppointmentDateTime().getTime();
  const diffMs = apptTime - currentTime.getTime();

  const phase: Phase = isCanceled
    ? "CANCELED"
    : diffMs <= 0
    ? "READY"
    : diffMs < 60 * 60 * 1000
    ? "LIVE"
    : diffMs < 24 * 60 * 60 * 1000
    ? "ACTIVE_DAY"
    : "SCHEDULED";

  const absDiff = Math.max(0, diffMs);
  const countDays = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const countHours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const countMinutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const countSeconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  const phaseConfig = {
    SCHEDULED: { bg: "from-sky-500/10 to-transparent", border: "border-sky-500/20", accent: "text-sky-400", label: "Scheduled", glow: "" },
    ACTIVE_DAY: { bg: "from-amber-500/10 to-transparent", border: "border-amber-500/20", accent: "text-amber-400", label: "Today", glow: "" },
    LIVE: { bg: "from-emerald-500/10 to-transparent", border: "border-emerald-500/20", accent: "text-emerald-400", label: "Live — Arriving Soon", glow: "" },
    READY: { bg: "from-emerald-500/15 to-transparent", border: "border-emerald-500/30", accent: "text-emerald-300", label: "Ready — Enter Now", glow: "" },
    CANCELED: { bg: "from-rose-500/10 to-transparent", border: "border-rose-500/30", accent: "text-red-400", label: "Canceled", glow: "" },
  };
  const pc = phaseConfig[phase];

  /* ── Travel helpers ───────────────────────────────────────── */
  const getCalculatedTime = (offsetMinus: number) => {
    const d = getAppointmentDateTime();
    d.setMinutes(d.getMinutes() - offsetMinus);
    const localTodayStr = new Date().toLocaleDateString("en-CA");
    if (bookingInfo?.date && bookingInfo.date !== localTodayStr) {
      return d.toLocaleDateString("en-US", { weekday: "short" }) + " " + d.toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  /* ── Issue 4: Check-in countdown ─────────────────────────── */
  const checkInCountdownStr = (() => {
    const checkInDiffMs = diffMs - 15 * 60 * 1000;
    if (checkInDiffMs <= 0) return null;
    const h = Math.floor(checkInDiffMs / (1000 * 60 * 60));
    const m = Math.floor((checkInDiffMs % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
    const s = Math.floor((checkInDiffMs % (1000 * 60)) / 1000).toString().padStart(2, "0");
    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  })();

  const checkInWindowOpen = diffMs <= 15 * 60 * 1000;

  const textColor = darkMode ? "text-white" : "text-[#2D3436]";
  const subTextColor = darkMode ? "text-slate-400" : "text-[#636E72]";

  const isWalkIn =
    bookingInfo?.appointmentType === 'Direct Walk-in' ||
    bookingInfo?.timeSlot === 'Direct Walk-in' ||
    !bookingInfo?.timeSlot;

  // Travel logistics: derive from APPOINTMENT time, not clinic opening (unless walk-in)
  const apptDateTime = getAppointmentDateTime();
  const apptMs = apptDateTime.getHours() * 3600000 + apptDateTime.getMinutes() * 60000;
  const clinicOpensTimeStr = clinicOpensAt || clinicDetails?.startTime || '11:55';
  const clinicOpenMs = parseTimeToMs(clinicOpensTimeStr);
  
  // Fluid Live Time Logic
  let leaveHomeDate = getAppointmentDateTime();
  leaveHomeDate.setMinutes(leaveHomeDate.getMinutes() - travelTime - safetyBuffer);
  
  let leaveHomeTimeStr = getCalculatedTime(travelTime + safetyBuffer);
  let arrivalTimeStr = getCalculatedTime(safetyBuffer);

  if (bookingInfo?.date === new Date().toLocaleDateString("en-CA") || !bookingInfo?.date) {
      if (leaveHomeDate.getTime() < currentTime.getTime() && currentTime.getTime() < getAppointmentDateTime().getTime()) {
          leaveHomeTimeStr = "NOW";
          const arriveDate = new Date(currentTime.getTime() + (travelTime * 60000) + (safetyBuffer * 60000));
          arrivalTimeStr = arriveDate.toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: false });
      }
  }

  const leaveHomeTime = leaveHomeTimeStr;
  const arrivalTime   = arrivalTimeStr;

  /* ── Opening-hours countdown for consolidated check-in button ── */
  const getAbsoluteClinicOpenTime = () => {
    let d = new Date();
    if (bookingInfo?.date) {
      const [year, month, day] = bookingInfo.date.split("-").map(Number);
      d = new Date(year, month - 1, day);
    }
    const startStr = clinicOpensAt || clinicDetails?.startTime || '11:55';
    let [h, m] = startStr.trim().split(":").map(Number);
    if (isNaN(h)) h = 11;
    if (isNaN(m)) m = 55;
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const absoluteOpenTimeMs = getAbsoluteClinicOpenTime();
  const isBeforeOpening = currentTime.getTime() < absoluteOpenTimeMs;

  const getOpeningCountdownStr = () => {
    const remainMs = Math.max(0, absoluteOpenTimeMs - currentTime.getTime());
    const d = Math.floor(remainMs / (24 * 3600000));
    const h = Math.floor((remainMs % (24 * 3600000)) / 3600000);
    const m = Math.floor((remainMs % 3600000) / 60000);
    const s = Math.floor((remainMs % 60000) / 1000);
    if (d > 0) return `${d}d ${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s` : `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div
      className={`w-full min-h-screen transition-colors duration-500 font-sans ${
        darkMode ? "bg-[#0A0F1E] text-white" : "bg-[#cbd5e1] text-slate-800"
      } selection:bg-emerald-500/30 overflow-x-hidden`}
    >
      <div className="relative max-w-lg mx-auto px-4 sm:px-8 py-4 sm:py-8 pb-32">
        {/* OVERTIME REASSURANCE BANNER */}
        <AnimatePresence>
          {isOvertime && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-[24px] p-5 shadow-lg shadow-amber-500/10 backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-xl shrink-0 mt-0.5">
                    <Clock className="text-amber-400 animate-pulse" size={24} />
                  </div>
                  <div>
                    <h3 className="text-amber-400 text-sm font-black uppercase tracking-widest mb-1">Overtime Engaged</h3>
                    <p className="text-amber-500/90 text-xs font-bold leading-relaxed">
                      Clinic hours have concluded, but the Doctor is working overtime to ensure you are seen today. Please remain seated.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ──────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6 sm:gap-0">
          <div className="flex items-center gap-6">
            <button
              onClick={() => { sessionStorage.removeItem("selectedPatient"); navigate("/patient-portal"); }}
              className="p-3 rounded-2xl bg-emerald-500 text-white shadow-sm hover:scale-105 transition-all"
              title="Back to Portal"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-3 italic ${
                darkMode ? "text-white" : "text-slate-900"
              }`}>
                Patient Tracker
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className={`font-bold uppercase text-[10px] tracking-[0.2em] mt-1 ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}>
                Physician: {clinicDetails?.doctorName || bookingInfo.doctorName || "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 rounded-2xl bg-emerald-500 text-white shadow-sm hover:scale-105 transition-all"
              title="Toggle Theme"
            >
              {darkMode ? <Sun size={20} className="text-amber-300" /> : <Moon size={20} className="text-blue-200" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-3 rounded-2xl bg-emerald-500 text-white shadow-sm hover:scale-105 transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* ── Issue 4 & 5: Access Type Badge + Check-In + Travel Times ── */}
        {/* ── Access Tier Badge ── */}
        <div className="mb-8 animate-in fade-in slide-in-from-top duration-500">
          {isPremium ? (
            <div className={`p-6 rounded-[32px] border transition-all ${
              darkMode ? "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-300" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-800"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-500/20 text-emerald-700"
                  }`}>
                    <Crown size={20} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      darkMode ? "text-emerald-400" : "text-emerald-700"
                    }`}>Premium Access</p>
                    <p className={`text-sm font-bold mt-0.5 ${
                      darkMode ? "text-slate-300" : "text-slate-800"
                    }`}>
                      Your Slot: {formatTime24Hour(bookingInfo.timeSlot || bookingInfo.time || "Scheduled")}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-4 py-2 rounded-full border ${
                  darkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-700"
                } uppercase tracking-widest`}>
                  Elite Tier
                </span>
              </div>
            </div>
          ) : (
            <div className={`p-6 rounded-[32px] border transition-all ${
              darkMode ? "bg-gradient-to-br from-slate-500/10 to-transparent border-white/5 text-slate-300" : "bg-slate-300/80 border-slate-400/40 text-slate-700"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    darkMode ? "bg-slate-500/10 text-slate-400" : "bg-slate-400/20 text-slate-600"
                  }`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      darkMode ? "text-slate-400" : "text-slate-600"
                    }`}>Standard Access</p>
                    <p className={`text-sm font-bold mt-0.5 ${
                      darkMode ? "text-white" : "text-slate-800"
                    }`}>Token #{bookingInfo.tokenNumber}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-4 py-2 rounded-full border ${
                  darkMode ? "bg-slate-500/10 border-white/5 text-slate-400" : "bg-slate-400/20 border-slate-400/30 text-slate-600"
                } uppercase tracking-widest`}>
                  General
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Patient Profile */}
        <div className={`mb-8 p-8 rounded-[32px] border transition-all shadow-sm ${
          darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5 text-white" : "bg-white/40 border border-white/50 text-slate-800"
        } animate-in fade-in slide-in-from-top duration-500 delay-100`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Patient Profile</p>
          <h2 className={`text-lg font-bold tracking-tight mt-1 ${
            darkMode ? "text-white" : "text-slate-900"
          }`}>
            {bookingInfo.patientName || "Loading..."}
          </h2>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2">
            {currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} • {currentTime.toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: false })}
          </p>
        </div>

        {/* Push Notification Promo */}
        {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
          <div className={`mb-8 p-6 rounded-[24px] border transition-all ${
            darkMode ? "border-sky-500/30 bg-sky-500/10" : "border-sky-500/40 bg-sky-50"
          } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in zoom-in duration-500 delay-300`}>
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${darkMode ? "text-sky-400" : "text-sky-700"}`}>Enable Alerts</h3>
              <p className={`text-xs mt-1 font-semibold ${darkMode ? "text-sky-300" : "text-sky-600"}`}>Get notified when the doctor calls you, even if your phone is locked.</p>
            </div>
            <button
              onClick={() => {
                import('../push').then(m => m.subscribeToPushNotifications()).then(() => window.location.reload());
              }}
              className="px-5 py-3 w-full sm:w-auto bg-sky-500 hover:bg-sky-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-95 shrink-0"
            >
              Allow Push
            </button>
          </div>
        )}

        {/* ── Notification Overlay ────────────────────────── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 p-6 rounded-3xl ${
                notification.isTurnSignal
                  ? "bg-amber-500 text-white shadow-amber-500/20 border-4 border-amber-400"
                  : "bg-rose-600 text-white shadow-rose-500/20 border-4 border-rose-500"
              } shadow-2xl relative overflow-hidden`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
                  {notification.isTurnSignal ? <BellRing size={24} /> : <ShieldAlert size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tighter uppercase mb-1 drop-shadow-md">
                    {notification.isTurnSignal ? "Clinic Alert" : "Priority Directive"}
                  </h3>
                  <p className="font-bold text-white/90 text-sm leading-tight drop-shadow-sm">{notification.message}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
          {/* ═══════════════════════════════════════════════
              HERO: Time-Aware Countdown Card
              ═══════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[48px] border transition-all p-10 shadow-sm relative overflow-hidden ${
              darkMode ? "bg-gradient-to-br " + pc.bg + " " + pc.border : "bg-slate-300/90 border border-white/35"
            }`}
          >
            {/* Phase badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] leading-none border ${
                darkMode ? "text-emerald-400 bg-white/5 border-white/10" : "text-slate-700 bg-white/40 border border-white/50"
              }`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                {pc.label}
              </div>
              <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] leading-none ${
                darkMode ? "bg-white/5 border-white/10 text-slate-500" : "bg-white/40 border border-white/50 text-slate-600"
              }`}>
                {isPremium ? "Elite" : "General"}
              </div>
            </div>

            {telemetryError && (
              <div className={`mb-6 p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-pulse ${
                darkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-rose-500/10 border-rose-500/20 text-rose-600"
              }`}>
                <AlertTriangle size={16} />
                <span>{telemetryError}</span>
              </div>
            )}

            {phase === "CANCELED" ? (
              <div className="text-center py-6">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border ${
                  darkMode ? "bg-rose-500/20 border-rose-500/30" : "bg-rose-500/20 border-rose-500/30"
                }`}>
                  <AlertTriangle size={36} className="text-rose-600" />
                </div>
                <h2 className="text-3xl font-black text-rose-700 tracking-tight mb-2">Booking Canceled</h2>
                <p className="text-sm text-slate-600 mb-6 font-semibold uppercase tracking-wider">This appointment has been canceled. You can rebook below.</p>
                <button onClick={handleRebook} className="px-8 py-4 rounded-2xl bg-rose-600 text-white font-black text-sm uppercase tracking-widest hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/20">
                  Rebook Now
                </button>
              </div>
            ) : phase === "SCHEDULED" ? (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Appointment In</p>
                <div className={`text-5xl sm:text-6xl font-black italic tracking-tighter leading-none ${
                  darkMode ? pc.accent : "text-white"
                }`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {countDays}d {countHours}h
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <CalendarClock size={14} className={darkMode ? pc.accent : "text-slate-600"} />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    {bookingInfo.date} at {bookingInfo.time || formatTime24Hour(clinicDetails?.startTime)}
                  </p>
                </div>
              </div>
            ) : phase === "ACTIVE_DAY" ? (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Prepare — Arriving In</p>
                <div className={`text-5xl sm:text-6xl font-black italic tracking-tighter leading-none ${
                  darkMode ? pc.accent : "text-white"
                }`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {countHours}h {countMinutes.toString().padStart(2, "0")}m
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Clock size={14} className={darkMode ? pc.accent : "text-slate-600"} />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    Time to depart in {Math.max(0, countHours * 60 + countMinutes - 30)} min
                  </p>
                </div>
              </div>
            ) : phase === "LIVE" ? (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Time to Arrive</p>
                <div className={`text-5xl sm:text-7xl font-black italic tracking-tighter leading-none ${
                  darkMode ? pc.accent : "text-white"
                }`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {countMinutes.toString().padStart(2, "0")}:{countSeconds.toString().padStart(2, "0")}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Activity size={14} className="text-emerald-600 animate-pulse" />
                  <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-widest">Live Countdown Active</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Status</p>
                <h2 className={`text-4xl sm:text-5xl font-black italic tracking-tighter leading-none ${
                  darkMode ? "text-emerald-400" : "text-white"
                }`}>READY</h2>
                <div className="flex items-center gap-2 mt-4">
                  <Sparkles size={14} className="text-emerald-600 animate-pulse" />
                  <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-widest">Your Session is Ready</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Mandatory Protocol notice */}
          {!isArrived && phase !== "CANCELED" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-8 rounded-[32px] border relative overflow-hidden transition-all ${
                darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
              }`}
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  darkMode ? "bg-sky-500/10 text-sky-400" : "bg-slate-400/20 text-slate-600"
                }`}>
                  <Zap size={24} className="fill-current animate-pulse text-amber-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Mandatory Protocol</h4>
                  <p className="text-xs font-bold leading-relaxed text-slate-500 uppercase tracking-wider">
                    Upon reaching the clinic facility, you MUST click the{" "}
                    <span className={`underline font-black ${darkMode ? "text-white" : "text-slate-800"}`}>"CLINIC CHECK-IN"</span> button to verify your arrival.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Travel & Logistics Protocol (Theme Consistent & Subtle Sizing) ── */}
          {phase !== "CANCELED" && (
            <div className="mt-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">
                Travel & Logistics Protocol
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clinic Opens */}
                <div className={`p-6 rounded-[32px] border transition-all ${
                  darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
                }`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Clinic Opens</p>
                  <p className={`text-2xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{clinicOpensTimeStr}</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-semibold">Doctor's hours start</p>
                </div>

                {/* Your Appointment / Est. Turn Time */}
                <div className={`p-6 rounded-[32px] border transition-all ${
                  darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
                }`}>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isPremium ? "Your Appointment" : "Est. Turn Time"}</p>
                  <p className={`text-2xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isPremium ? formatTime24Hour(bookingInfo.timeSlot || bookingInfo.time || "13:30") : getAppointmentDateTime().toLocaleTimeString('en-IN', { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-semibold">{isPremium ? "Your scheduled slot" : "Based on live queue"}</p>
                </div>

                {/* Leave Home */}
                <div className={`p-6 rounded-[32px] border transition-all flex flex-col justify-between ${
                  darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
                }`}>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Leave Home</p>
                    <p className={`text-2xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{leaveHomeTime}</p>
                  </div>
                  <div className={`border-t pt-3 mt-3 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Est. Travel</p>
                    <p className="text-sm font-black text-emerald-400">{travelTime} mins</p>
                  </div>
                </div>

                {/* Arrive At */}
                <div className={`p-6 rounded-[32px] border transition-all flex flex-col justify-between ${
                  darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
                }`}>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arrive At</p>
                    <p className={`text-2xl font-black mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{arrivalTime}</p>
                  </div>
                  <div className={`border-t pt-3 mt-3 ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Safety Buffer</p>
                    <p className="text-sm font-black text-emerald-400">{safetyBuffer} mins</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Detail Section ── */}
          {phase !== "CANCELED" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-[48px] border overflow-hidden transition-all shadow-sm ${
                darkMode ? "bg-gradient-to-br from-white/5 via-transparent to-transparent border-white/5" : "bg-white/40 border border-white/50"
              }`}
            >
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className={`w-full flex items-center justify-between p-6 transition-colors ${
                  darkMode ? "hover:bg-white/5" : "hover:bg-white/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-400/20 flex items-center justify-center text-slate-600">
                    <Stethoscope size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Appointment Details</span>
                </div>
                {detailsExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>

              <AnimatePresence>
                {detailsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-5">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Patient Name</p>
                          <p className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{bookingInfo.patientName || "Guest"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Clinical Date</p>
                          <p className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{bookingInfo.date}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Stethoscope className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Doctor / Speciality</p>
                          <p className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                            {clinicDetails?.doctorName || bookingInfo.doctorName || "Loading..."} (
                            {clinicDetails?.speciality || bookingInfo.specialty || bookingInfo.speciality || "General Medicine"})
                          </p>
                        </div>
                      </div>
                      {bookingInfo.tokenNumber && (
                        <div className="flex items-start gap-3">
                          <Ticket className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                          <div>
                            <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Token Number</p>
                            <p className={`font-black text-lg ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              #{bookingInfo.tokenNumber}
                            </p>
                          </div>
                        </div>
                      )}
                      {clinicDetails && (
                        <>
                          <div className="border-t border-slate-300/80 pt-5 space-y-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Clinic Infrastructure</span>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                              <div>
                                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Address</p>
                                <p className={`font-bold text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{clinicDetails.clinicAddress}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Pill className="w-5 h-5 mt-0.5 shrink-0 text-slate-600" />
                              <div>
                                <p className="text-xs font-black uppercase text-slate-500 tracking-wider">On-site Pharmacy</p>
                                <p className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{clinicDetails.pharmacy}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span style={{ fontSize: 18 }}>♿</span>
                              <span className={`font-bold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                Wheelchair: {clinicDetails.wheelchairAccess ? "✓ Accessible" : "Not Available"}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Real-time Queue Info (Standard) ──────────── */}
          {phase !== "CANCELED" && !isPremium && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-6 rounded-[32px] border transition-all ${
                darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-slate-300/90 border border-white/30"
              }`}>
                <div className="flex items-center gap-2 mb-3 text-slate-600">
                  <Ticket size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Queue Position</span>
                </div>
                <h4 className={`text-4xl font-black italic tracking-tighter ${darkMode ? "text-white" : "text-white"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  #{bookingInfo.tokenNumber || "1"}
                </h4>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2">Token Sequential</p>
              </div>

              <div className={`p-6 rounded-[32px] border transition-all ${
                darkMode ? "bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-800"
              }`}>
                <div className="flex items-center gap-2 mb-3 text-emerald-700">
                  <Clock size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Clinic Opens</span>
                </div>
                <h4 className={`text-3xl font-black italic tracking-tighter ${darkMode ? "text-emerald-400" : "text-white"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {clinicOpensAt || formatTime24Hour(clinicDetails?.startTime)}
                </h4>
              </div>
            </div>
          )}

          {/* Premium: time slot display */}
          {phase !== "CANCELED" && isPremium && (
            <div className={`p-10 rounded-[48px] border transition-all flex flex-col items-center justify-center text-center space-y-4 ${
              darkMode ? "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-800"
            }`}>
              <Crown size={32} className="text-emerald-700" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700 mb-2">Exclusive Priority Slot</p>
                <h4 className={`text-4xl sm:text-6xl font-black italic tracking-tighter ${darkMode ? "text-emerald-400" : "text-white"}`}>
                  {bookingInfo.timeSlot || bookingInfo.time || formatTime24Hour(clinicDetails?.startTime)}
                </h4>
              </div>
              <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">Medical entry prioritized at configured time.</p>
            </div>
          )}

          {/* Queue Progress (Standard) */}
          {!isPremium && tokensAhead > 0 && phase !== "CANCELED" && (
            <div className={`p-8 rounded-[48px] border transition-all relative overflow-hidden ${
              darkMode ? "bg-gradient-to-br from-sky-500/10 to-transparent border-sky-500/15" : "bg-slate-300/90 border border-white/30"
            }`}>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2 leading-none">Estimated Wait</h5>
                  <p className={`text-4xl font-black italic tracking-tighter ${darkMode ? "text-sky-400" : "text-white"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {tokensAhead * 15} MIN
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-400/20 text-slate-600">
                  <Navigation size={24} />
                </div>
              </div>
              <div className="space-y-4">
                <div className={`h-1.5 w-full rounded-full overflow-hidden ${
                  darkMode ? "bg-white/5" : "bg-slate-400/30"
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentServing / (bookingInfo.tokenNumber || 1)) * 100}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    {tokensAhead} units ahead in general queue
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* HIPAA Bar */}
          <div className={`p-6 rounded-[32px] border transition-all flex items-center justify-center gap-3 ${
            darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-slate-300/80 border border-white/30"
          }`}>
            <ShieldAlert size={14} className="text-slate-500" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              System-wide data encryption active • HIPAA Compliant
            </p>
          </div>

          <button
            onClick={() => navigate("/patient-portal")}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              darkMode ? "bg-white/5 hover:bg-white/10 border-white/5 text-slate-400" : "bg-white/40 hover:bg-white/60 border border-white/50 text-slate-600"
            }`}
          >
            ← Return to Patient Portal
          </button>
          {/* Spacer to prevent overlap with fixed check-in bar */}
          <div style={{ height: '140px' }} />
        </section>

        {/* ═══════════════════════════════════════════════
            FLOATING CHECK-IN CONTROL (Consolidated for all users)
            ═══════════════════════════════════════════════ */}
        {phase !== "CANCELED" && (
          <div className={`fixed bottom-0 left-0 right-0 p-6 pt-20 pointer-events-none z-40 bg-gradient-to-t ${
            darkMode ? "from-[#0A0F1E] via-[#0A0F1E]/90" : "from-[#cbd5e1] via-[#cbd5e1]/95"
          } to-transparent`}>
            <div className="max-w-md mx-auto pointer-events-auto">
              {isBeforeOpening ? (
                /* Locked — countdown to opening hours */
                <div className={`w-full h-24 rounded-[40px] border flex flex-col items-center justify-center gap-1 cursor-not-allowed shadow-sm ${
                  darkMode ? "bg-gradient-to-br from-white/5 to-transparent border-white/5" : "bg-white/40 border border-white/50"
                }`}>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-6 h-6 animate-pulse text-blue-600" />
                    <span className={`text-2xl font-black tracking-tighter uppercase italic ${darkMode ? "text-blue-400" : "text-slate-700"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                      OPENS IN {getOpeningCountdownStr()}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mt-1">
                    Clinic Opening Time: {clinicOpensTimeStr}
                  </span>
                </div>
              ) : !isArrived ? (
                /* Active check-in button */
                <button
                  onClick={handleArrival}
                  className="group relative w-full h-24 overflow-hidden rounded-[40px] bg-emerald-500 active:scale-95 transition-all duration-300 shadow-lg shadow-emerald-500/20"
                >
                  <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <div className="relative flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-3 text-white transition-colors">
                      <MapPin className="w-8 h-8 animate-bounce fill-current" />
                      <span className="text-2xl font-black tracking-tighter uppercase italic">CLINIC CHECK-IN</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100 group-hover:text-white transition-colors">
                      Tactical Deployment Phase — Open
                    </span>
                  </div>
                </button>
              ) : (
                /* Verified state */
                <div className={`w-full h-24 rounded-[40px] border flex flex-col items-center justify-center gap-1 ${
                  darkMode ? "bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-800"
                }`}>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Sparkles size={24} className="fill-current animate-pulse animate-spin" />
                    <span className="text-xl font-black uppercase tracking-tighter">Check-in Verified</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Wait for specialized directive</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ringing Overlay */}
      <AnimatePresence>
        {isRinging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-rose-600 flex flex-col items-center justify-center p-12 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center mb-12 shadow-[0_0_50px_rgba(255,255,255,0.4)]"
            >
              <BellRing size={64} className="text-white fill-current" />
            </motion.div>
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter italic mb-4">Urgent Call</h2>
            <p className="text-xl font-bold text-white/90 mb-12 uppercase tracking-[0.2em] leading-relaxed">
              Mediator is calling you to the desk.
            </p>
            <button
              onClick={() => {
                setIsRinging(false);
                setNotification(null);
                if ((window as any)._ringInterval) {
                  clearInterval((window as any)._ringInterval);
                  (window as any)._ringInterval = null;
                }
              }}
              className="px-12 py-6 rounded-[32px] bg-white text-rose-600 font-black text-lg uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              I am coming / OK
            </button>
            <div className="mt-12">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest animate-pulse">
                Persistent clinical summon active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
