import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, UserCheck, ArrowLeft, Search, CheckCircle2, AlertCircle, Stethoscope, Link2, Moon, Sun, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

export default function ManageStaff() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [mediatorUsername, setMediatorUsername] = useState("");
  const [mediatorToken, setMediatorToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [hiredMediator, setHiredMediator] = useState<{ assigned: boolean; username?: string; fullName?: string; id?: number } | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    if (!userStr) { navigate("/"); return; }
    const u = JSON.parse(userStr);
    
    // 🛡️ ROLE GUARD: Only doctors can manage staff
    if (u.role !== "ROLE_DOCTOR") {
      console.warn("[SECURITY] Unauthorized Staff Management attempt by:", u.role);
      const target = u.role === "ROLE_MEDIATOR" ? "/mediator" : "/patient-portal";
      navigate(target);
      return;
    }

    setUser(u);
    // doctorId is stored in u.doctorId or resolved via account
    const dId = u.doctorId || u.id;
    setDoctorId(dId);

    // Fetch existing hired mediator
    const token = u.token;
    fetch(`${API}/api/doctor/${dId}/hired-mediator`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    })
      .then(r => r.json())
      .then(data => setHiredMediator(data))
      .catch(() => setHiredMediator({ assigned: false }));
  }, [navigate]);

  const handleHire = async () => {
    if (!mediatorUsername.trim()) { setError("Please enter a mediator username."); return; }
    setLoading(true);
    setError("");
    setSuccess("");

    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      const resp = await fetch(`${API}/api/doctor/${doctorId}/hire-mediator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ username: mediatorUsername.trim() })
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccess(`✓ Mediator "${data.mediatorName}" assigned successfully. This is a permanent clinical association.`);
        setHiredMediator({ assigned: true, username: mediatorUsername, fullName: data.mediatorName });
        setMediatorUsername("");
      } else {
        setError(data.error || "Failed to hire mediator. Check the username.");
      }
    } catch (e) {
      setError("Connection failed. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleHireByToken = async () => {
    if (!mediatorToken.trim()) { setError("Please enter an identity token."); return; }
    setTokenLoading(true);
    setError("");
    setSuccess("");

    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    try {
      const resp = await fetch(`${API}/api/doctor/${doctorId}/hire-mediator-by-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ identityToken: mediatorToken.trim() })
      });
      const data = await resp.json();
      if (resp.ok) {
        setSuccess(`✓ Mediator "${data.mediatorName}" linked via identity token.`);
        setHiredMediator({ assigned: true, username: data.username, fullName: data.mediatorName });
        setMediatorToken("");
      } else {
        setError(data.error || "Failed to find mediator by identity token.");
      }
    } catch (e) {
      setError("Connection failed. Ensure the backend is running.");
    } finally {
      setTokenLoading(false);
    }
  };

  const textColor = darkMode ? "text-white" : "text-[#0F172A]";
  const subText = darkMode ? "text-slate-400" : "text-slate-600";
  const cardBg = darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm";

  return (
    <div className={`w-full min-h-screen transition-colors duration-500 ${darkMode ? "bg-[#020617] text-white" : "bg-slate-50 text-slate-900"} overflow-x-hidden`}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <header className="flex flex-row justify-between items-start gap-2">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("/doctor")}
              className={`p-2 sm:p-3 rounded-2xl border transition-all mt-1 ${darkMode ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500"}`}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className={`text-xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none ${textColor}`}>
                Manage Staff
              </h1>
              <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 ${subText}`}>
                Doctor-Mediator Association
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 sm:p-3 rounded-2xl border ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
              {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-blue-600" />}
            </button>
            <button onClick={() => { localStorage.clear(); navigate("/"); }} className="p-2 sm:p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Current Mediator Card */}
        <section className={`p-4 sm:p-8 rounded-[32px] border ${cardBg}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Link2 size={20} />
            </div>
            <div>
              <h2 className={`text-sm font-black uppercase tracking-widest ${textColor}`}>Current Assignment</h2>
              <p className={`text-[10px] uppercase tracking-widest ${subText}`}>Persistent DB-backed relationship</p>
            </div>
          </div>
          {hiredMediator?.assigned ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-400 font-black text-lg tracking-tight">{hiredMediator.fullName}</p>
                <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>@{hiredMediator.username} · Active Staff</p>
              </div>
              <div className="ml-auto px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                Hired
              </div>
            </div>
          ) : (
            <div className={`flex items-center justify-center h-24 rounded-2xl border-2 border-dashed ${darkMode ? "border-white/10 text-slate-600" : "border-slate-200 text-slate-400"}`}>
              <p className="text-[11px] font-black uppercase tracking-widest">No mediator assigned yet</p>
            </div>
          )}
        </section>

        {/* Hire Mediator Form */}
        <section className={`p-4 sm:p-8 rounded-[32px] border ${cardBg}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className={`text-sm font-black uppercase tracking-widest ${textColor}`}>Hire a Mediator</h2>
              <p className={`text-[10px] uppercase tracking-widest ${subText}`}>Enter mediator's registered username</p>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium flex gap-3 items-center">
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex gap-3 items-center">
                <CheckCircle2 size={16} /> {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-row gap-2 mt-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. mediator1"
                value={mediatorUsername}
                onChange={e => { setMediatorUsername(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleHire()}
                className={`w-full h-12 pl-9 pr-3 rounded-xl border outline-none font-bold tracking-wide transition-all ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-blue-500/50"
                    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                }`}
              />
            </div>
            <button
              onClick={handleHire}
              disabled={loading}
              className="h-12 px-5 sm:px-8 rounded-xl bg-blue-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-blue-500 transition-all disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-blue-500/20 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserCheck size={16} />
              )}
              <span className="hidden sm:inline">{loading ? "Verifying..." : "Hire Staff"}</span>
              <span className="sm:hidden">{loading ? "..." : "Hire"}</span>
            </button>
          </div>

          <div className={`mt-4 p-4 rounded-2xl ${darkMode ? "bg-amber-500/5 border border-amber-500/10" : "bg-amber-50 border border-amber-200"}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-amber-500/70" : "text-amber-700"}`}>
              ⚠ This is a permanent clinical relationship stored in the database. The assigned mediator will manage your patient queue on all future sessions.
            </p>
          </div>
        </section>

        {/* Hire Mediator by Identity Token */}
        <section className={`p-4 sm:p-8 rounded-[32px] border ${cardBg}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Search size={20} />
            </div>
            <div>
              <h2 className={`text-sm font-black uppercase tracking-widest ${textColor}`}>Find Mediator by Identity Token</h2>
              <p className={`text-[10px] uppercase tracking-widest ${subText}`}>Paste the mediator's unique identity token</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. MED-XXXXXXXX"
                value={mediatorToken}
                onChange={e => { setMediatorToken(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleHireByToken()}
                className={`w-full h-14 pl-10 pr-4 rounded-2xl border outline-none font-black tracking-wide transition-all ${
                  darkMode
                    ? "bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                    : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500"
                }`}
              />
            </div>
            <button
              onClick={handleHireByToken}
              disabled={tokenLoading}
              className="h-14 px-8 rounded-2xl bg-emerald-600 text-white font-black text-sm uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {tokenLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserCheck size={18} />
              )}
              {tokenLoading ? "Searching..." : "Link"}
            </button>
          </div>
        </section>

        {/* Clinical Protocol Notice */}
        <section className={`p-6 rounded-[24px] border ${darkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-100 border-slate-200"}`}>
          <div className="flex items-start gap-3">
            <Stethoscope size={16} className={`mt-0.5 shrink-0 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
            <div className="space-y-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>Clinical Protocol</p>
              <p className={`text-xs ${subText} leading-relaxed`}>
                The assigned mediator will operate the live patient queue on your behalf. They will check patients in, manage queue priority, and signal turn notifications. This association persists across all sessions until changed.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
