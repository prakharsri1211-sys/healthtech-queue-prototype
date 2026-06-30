import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, Plus, Users, ShieldAlert, Activity, ChevronRight, UserPlus, Sparkles, Fingerprint, Sun, Moon, LogOut, CreditCard, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { APP_STATUS, APP_ROLES } from "../utils/constants";

interface PatientForm {
  name: string;
  age: string;
  gender: string;
  aadharId: string;
  abhaId: string;
  udidCardNumber: string;
}

interface Patient {
  id: number | string;
  name: string;
  age: number;
  gender?: string;
  aadharId?: string;
  abhaId?: string;
  udidCardNumber?: string;
  aadharOrAbhaId?: string;
  patientId?: string;
}

interface Account {
  id: number | string;
  phoneNumber?: string;
  username?: string;
  patients: Patient[];
}

export default function PatientSelector() {
  const api = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | string>("");
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState<PatientForm>({
    name: "",
    age: "",
    gender: "",
    aadharId: "",
    abhaId: "",
    udidCardNumber: "",
  });
  const [editingPatientId, setEditingPatientId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingGatekeeper, setCheckingGatekeeper] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    
    if (!u) {
      navigate("/");
      return;
    }

    // Purge any local storage fallback that contains mock data like abc123
    const localKey = `patients_${u.id}`;
    const localPatients = localStorage.getItem(localKey);
    if (localPatients) {
      try {
        const parsed = JSON.parse(localPatients);
        if (Array.isArray(parsed) && parsed.some((p: any) => p.name === 'abc123' || p.name === 'def123' || p.name === 'ghi123')) {
          console.log("[Clinical Clean] Purging mock local storage profiles");
          localStorage.removeItem(localKey);
        }
      } catch (e) {}
    }

    // ROLE GUARD: Prevent non-patients from accessing this portal
    if (u.role !== APP_ROLES.PATIENT) {
      console.warn("[SECURITY] Unauthorized Patient Portal Access Attempt by:", u.role);
      const target = u.role === APP_ROLES.DOCTOR ? "/doctor" : "/mediator";
      navigate(target);
      return;
    }

    const token = u.token;
    const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    
    // Always try to fetch from backend for fresh data
    if (u.id) {
      fetch(`${apiBase}/api/patient/account/${u.id}`, { headers })
        .then(async r => {
          if (r.ok) {
            const data = await r.json();
            if (Array.isArray(data)) {
              const mappedPatients = data.map((p: any) => ({
                ...p,
                aadharId: p.identityType === 'AADHAR' ? p.aadharOrAbhaId : undefined,
                abhaId: p.identityType === 'ABHA' ? p.aadharOrAbhaId : undefined
              }));
              const refreshedAccount: Account = { id: u.id, username: u.username, patients: mappedPatients };
              setAccount(refreshedAccount);
              if (data.length > 0 && !selectedPatientId) {
                 setSelectedPatientId(data[0].id || data[0].patientId || "");
              }
            }
          }
        })
        .catch(() => {
          // FALLBACK: Local Storage
          const mockAccount: Account = { id: u.id || "local", username: u.username, patients: [] };
          const localPatients = localStorage.getItem(`patients_${mockAccount.id}`);
          if (localPatients) mockAccount.patients = JSON.parse(localPatients);
          setAccount(mockAccount);
          if (mockAccount.patients.length > 0) setSelectedPatientId(mockAccount.patients[0].id);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // 2. STALE SESSION HARDENING: Clear booking info if it belongs to a past date or is marked completed
    const bookingStr = localStorage.getItem("bookingInfo");
    if (bookingStr) {
      try {
        const booking = JSON.parse(bookingStr);
        const todayStr = new Date().toISOString().split("T")[0];
        if (booking.date < todayStr || booking.status === APP_STATUS.COMPLETED || booking.status === APP_STATUS.CANCELLED || booking.status === APP_STATUS.NO_SHOW) {
          console.log("[Clinical Guard] Purging stale booking session:", booking.id);
          localStorage.removeItem("bookingInfo");
        }
      } catch (e) {
        localStorage.removeItem("bookingInfo");
      }
    }
  }, [navigate, loaded, api]);

  const handleAddPatient = async () => {
    setError("");
    if (!newPatientForm.name.trim() || !newPatientForm.age || !newPatientForm.gender) {
      setError("Name, Age, and Gender are required.");
      return;
    }
    if (!newPatientForm.aadharId && !newPatientForm.abhaId && !newPatientForm.udidCardNumber) {
      setError("At least one ID (Aadhar, ABHA, or UDID) is required.");
      return;
    }
    if (newPatientForm.aadharId && !/^\d{12}$/.test(newPatientForm.aadharId.replace(/\s/g, ""))) {
      setError("Aadhar must be exactly 12 digits.");
      return;
    }
    if (newPatientForm.abhaId && newPatientForm.abhaId.trim().length !== 14) {
      setError("ABHA Card number must be exactly 14 characters/digits.");
      return;
    }
    if (newPatientForm.udidCardNumber && newPatientForm.udidCardNumber.trim().length !== 18) {
      setError("UDID Card number must be exactly 18 characters/digits.");
      return;
    }
    if (!account) return;
    if (account.patients && account.patients.length >= 5) {
      setError("Account limit reached: maximum 5 family members allowed.");
      return;
    }

    setSaving(true);

    const newPatient: Patient = {
      id: `local_${Date.now()}`,
      name: newPatientForm.name,
      age: parseInt(newPatientForm.age),
      gender: newPatientForm.gender,
      aadharId: newPatientForm.aadharId,
      abhaId: newPatientForm.abhaId,
      udidCardNumber: newPatientForm.udidCardNumber,
      aadharOrAbhaId: newPatientForm.aadharId || newPatientForm.abhaId || newPatientForm.udidCardNumber,
    };

    // Try backend first
    try {
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = userStr ? JSON.parse(userStr) : null;
      const token = u?.token;

      const response = await fetch(`${api}/api/patient`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          accountId: account.id,
          name: newPatientForm.name,
          age: parseInt(newPatientForm.age),
          gender: newPatientForm.gender,
          aadharOrAbhaId: newPatientForm.aadharId || newPatientForm.abhaId || newPatientForm.udidCardNumber,
          identityType: newPatientForm.aadharId ? "AADHAR" : newPatientForm.abhaId ? "ABHA" : "HANDICAPPED",
          udidCardNumber: newPatientForm.udidCardNumber,
        }),
      });
      if (response.ok) {
        const addedPatient = await response.json();
        newPatient.id = addedPatient.id || newPatient.id;
      } else {
        setError(`Failed to save profile on backend (Error ${response.status})`);
        setSaving(false);
        return;
      }
    } catch (_) {
      setError("Network error while trying to reach server.");
      setSaving(false);
      return;
    }

    const updatedPatients = [...(account.patients || []), newPatient];
    const updatedAccount = { ...account, patients: updatedPatients };
    setAccount(updatedAccount);
    sessionStorage.setItem("accountData", JSON.stringify(updatedAccount));
    localStorage.setItem(`patients_${account.id}`, JSON.stringify(updatedPatients));

    setSelectedPatientId(newPatient.id);
    sessionStorage.setItem("selectedPatient", JSON.stringify(newPatient));
    setShowNewPatientForm(false);
    setNewPatientForm({ name: "", age: "", gender: "", aadharId: "", abhaId: "", udidCardNumber: "" });
    setSuccessMsg(`${newPatient.name} added successfully!`);
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
  };

  const handleUpdatePatient = async () => {
    if (!editingPatientId || !account) return;
    setError("");
    if (!newPatientForm.name || !newPatientForm.age || !newPatientForm.gender) {
      setError("Name, Age, and Gender are required.");
      return;
    }
    if (!newPatientForm.aadharId && !newPatientForm.abhaId && !newPatientForm.udidCardNumber) {
      setError("At least one ID (Aadhar, ABHA, or UDID) is required.");
      return;
    }
    if (newPatientForm.aadharId && !/^\d{12}$/.test(newPatientForm.aadharId.replace(/\s/g, ""))) {
      setError("Aadhar must be exactly 12 digits.");
      return;
    }
    if (newPatientForm.abhaId && newPatientForm.abhaId.trim().length !== 14) {
      setError("ABHA Card number must be exactly 14 characters/digits.");
      return;
    }
    if (newPatientForm.udidCardNumber && newPatientForm.udidCardNumber.trim().length !== 18) {
      setError("UDID Card number must be exactly 18 characters/digits.");
      return;
    }
    setSaving(true);
    
    const updatedPatient: Patient = {
      id: editingPatientId,
      name: newPatientForm.name,
      age: parseInt(newPatientForm.age),
      gender: newPatientForm.gender,
      aadharId: newPatientForm.aadharId,
      abhaId: newPatientForm.abhaId,
      udidCardNumber: newPatientForm.udidCardNumber,
      aadharOrAbhaId: newPatientForm.aadharId || newPatientForm.abhaId || newPatientForm.udidCardNumber,
    };

    try {
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = userStr ? JSON.parse(userStr) : null;
      const token = u?.token;

      if (!editingPatientId.toString().startsWith("local_")) {
        await fetch(`${api}/api/patient/${editingPatientId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            name: newPatientForm.name,
            age: parseInt(newPatientForm.age),
            gender: newPatientForm.gender,
            aadharOrAbhaId: updatedPatient.aadharOrAbhaId,
            identityType: newPatientForm.aadharId ? "AADHAR" : newPatientForm.abhaId ? "ABHA" : "HANDICAPPED",
            udidCardNumber: newPatientForm.udidCardNumber,
          }),
        });
      }
    } catch (_) {}

    const updatedPatients = account.patients.map(p => p.id === editingPatientId ? updatedPatient : p);
    const updatedAccount = { ...account, patients: updatedPatients };
    setAccount(updatedAccount);
    sessionStorage.setItem("accountData", JSON.stringify(updatedAccount));
    localStorage.setItem(`patients_${account.id}`, JSON.stringify(updatedPatients));

    setEditingPatientId(null);
    setShowNewPatientForm(false);
    setNewPatientForm({ name: "", age: "", gender: "", aadharId: "", abhaId: "", udidCardNumber: "" });
    setSuccessMsg(`Patient updated successfully!`);
    setTimeout(() => setSuccessMsg(""), 3000);
    setSaving(false);
  };

  const handleDeletePatient = async (patientId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account) return;
    if (!window.confirm("Are you sure you want to delete this profile?")) return;

    try {
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = userStr ? JSON.parse(userStr) : null;
      const token = u?.token;

      if (!patientId.toString().startsWith("local_")) {
        await fetch(`${api}/api/patient/${patientId}`, {
          method: "DELETE",
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
      }
    } catch (_) {}

    const updatedPatients = account.patients.filter(p => p.id !== patientId);
    const updatedAccount = { ...account, patients: updatedPatients };
    setAccount(updatedAccount);
    sessionStorage.setItem("accountData", JSON.stringify(updatedAccount));
    localStorage.setItem(`patients_${account.id}`, JSON.stringify(updatedPatients));
    
    if (selectedPatientId === patientId) {
       setSelectedPatientId(updatedPatients.length > 0 ? updatedPatients[0].id : "");
    }
  };

  const openEditForm = (p: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    
    let aadharData = p.aadharId || "";
    if (!aadharData && u?.primaryAadharNumber && (p.name.toLowerCase() === u.fullName?.toLowerCase() || p.name.toLowerCase() === u.username?.toLowerCase())) {
       aadharData = u.primaryAadharNumber;
    }

    setNewPatientForm({
      name: p.name,
      age: p.age.toString(),
      gender: p.gender || "",
      aadharId: p.aadharId || (p.aadharOrAbhaId && p.aadharOrAbhaId.length === 12 ? p.aadharOrAbhaId : "") || aadharData,
      abhaId: p.abhaId || (p.aadharOrAbhaId && p.aadharOrAbhaId.length === 14 ? p.aadharOrAbhaId : ""),
      udidCardNumber: p.udidCardNumber || ""
    });
    setEditingPatientId(p.id);
    setShowNewPatientForm(true);
  };

  const handlePatientContinue = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!selectedPatientId) {
      setError("Please select a patient.");
      return;
    }

    setCheckingGatekeeper(true);
    try {
      let selectedPatient = account?.patients.find(
        p => p.id.toString() === selectedPatientId.toString()
      );
      if (!selectedPatient && account?.patients) {
        selectedPatient = account.patients.find(
          p => String(p.id) === String(selectedPatientId) || String(p.patientId) === String(selectedPatientId)
        );
      }
      if (selectedPatient) {
        sessionStorage.setItem("selectedPatient", JSON.stringify(selectedPatient));
      }
      
      const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const u = userStr ? JSON.parse(userStr) : null;
      const token = u?.token;
      
      const res = await fetch(`${api}/api/appointments/patient/${selectedPatientId}/check-active?_t=${Date.now()}`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "", "Content-Type": "application/json" },
        cache: "no-store"
      });
      
      if (!res.ok) throw new Error('Gatekeeper check failed');
      
      const data = await res.json();
      localStorage.setItem('currentPatientId', String(selectedPatientId));
      
      if (data && (data.hasActiveAppointment === true || data.todayAppointment || (data.activeAppointments && data.activeAppointments.length > 0) || data.nextActiveAppointment)) {
          const activeAppt = data.todayAppointment || (data.activeAppointments && data.activeAppointments[0]) || data.nextActiveAppointment;
          if (activeAppt) {
            localStorage.setItem('bookingInfo', JSON.stringify(activeAppt));
          }
          navigate('/tracker', { replace: true });
          return;
      }
      
      navigate('/specialty-selection', { replace: true });
      return;
      
    } catch (err: any) {
      const existing = localStorage.getItem('bookingInfo');
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          const isSelectedPatient = String(parsed.patientId) === String(selectedPatientId);
          if (isSelectedPatient && parsed.status !== APP_STATUS.COMPLETED && parsed.status !== APP_STATUS.CANCELLED && parsed.status !== APP_STATUS.NO_SHOW) {
            navigate('/tracker', { replace: true });
            return;
          }
        } catch (e) {}
      }
      setError("Could not verify appointment status. Please check your connection.");
    } finally {
      setCheckingGatekeeper(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900" />;
  if (!account) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Account missing</div>;

  const textColor = darkMode ? "text-white" : "text-[#2D3436]";
  const subTextColor = darkMode ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} selection:bg-emerald-500/30 overflow-x-hidden`}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-6 py-10 pb-40">
        <header className="mb-10 animate-in fade-in slide-in-from-top duration-700">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <Users size={28} className="text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <button onClick={() => navigate("/mediator-info")} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group shrink-0">
                <ShieldAlert size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Help</span>
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-blue-600" />}
              </button>
              <button onClick={handleLogout} className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          <h1 className={`text-4xl font-black tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60`}>
            Patient Portal
          </h1>
          <p className={subTextColor}>Select a profile to book an appointment.</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((account.patients.length / 5) * 100, 100)}%` }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{account.patients.length}/5 Profiles</span>
          </div>
        </header>

        <section className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700 delay-100">
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium flex gap-3 items-center">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError("")} className="ml-auto text-rose-400 hover:text-rose-300"><X size={16} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex gap-3 items-center">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {account.patients.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saved Profiles</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{account.patients.length} Active</span>
              </div>
              <div className="space-y-3">
                {account.patients.map((p) => (
                  <motion.div
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full flex items-center gap-4 p-5 rounded-[24px] border transition-all text-left cursor-pointer ${
                      selectedPatientId.toString() === p.id.toString()
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      selectedPatientId.toString() === p.id.toString() ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      <Fingerprint size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-lg leading-none mb-1 ${textColor}`}>{p.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tighter flex-wrap">
                        <span>Age {p.age}</span>
                        {p.gender && <><span className="opacity-30">•</span><span>{p.gender}</span></>}
                        {p.aadharId && <><span className="opacity-30">•</span><span>Aadhar: ****{p.aadharId?.slice(-4)}</span></>}
                        {p.abhaId && <><span className="opacity-30">•</span><span>ABHA</span></>}
                        {p.udidCardNumber && <><span className="opacity-30">•</span><span>UDID</span></>}
                      </div>
                    </div>
                    <AnimatePresence>
                      {selectedPatientId.toString() === p.id.toString() && (
                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                          <Sparkles size={18} className="text-emerald-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex flex-col gap-2 ml-1 sm:ml-2 shrink-0">
                      <button onClick={(e) => openEditForm(p, e)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">EDIT</span>
                      </button>
                      <button onClick={(e) => handleDeletePatient(p.id, e)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">DEL</span>
                      </button>
                     </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            {!showNewPatientForm ? (
              account.patients.length < 5 ? (
                <button
                  onClick={() => { 
                    setEditingPatientId(null); 
                    
                    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
                    const u = userStr ? JSON.parse(userStr) : null;
                    
                    let prefillName = "";
                    let prefillAge = "";
                    let prefillAadhar = "";
                    
                    if (u) {
                        const patients = account?.patients || [];
                        const isPrimaryAdded = patients.some(p => p.name.toLowerCase() === (u.fullName || u.username || "").toLowerCase());

                        if (!isPrimaryAdded) {
                            prefillName = u.fullName || u.username || "";
                            prefillAadhar = u.primaryAadharNumber || "";
                            if (u.age) {
                                prefillAge = u.age.toString();
                            } else if (u.dateOfBirth) {
                                try {
                                    const dob = new Date(u.dateOfBirth);
                                    const ageDifMs = Date.now() - dob.getTime();
                                    const ageDate = new Date(ageDifMs);
                                    prefillAge = Math.abs(ageDate.getUTCFullYear() - 1970).toString();
                                } catch (e) {
                                    prefillAge = "";
                                }
                            }
                        }
                    }

                    setNewPatientForm({ name: prefillName, age: prefillAge, gender: "", aadharId: prefillAadhar, abhaId: "", udidCardNumber: "" }); 
                    setShowNewPatientForm(true); 
                  }}
                  className="w-full h-16 rounded-[24px] border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-3 text-slate-400 hover:text-emerald-400 font-bold"
                >
                  <UserPlus size={20} />
                  <span>Add Patient</span>
                </button>
              ) : (
                <div className="w-full h-14 rounded-[24px] border border-white/5 bg-white/2 flex items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Max 5 Profiles Reached</span>
                </div>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[28px] border border-white/10 bg-slate-900/80 backdrop-blur-xl overflow-hidden"
              >
                <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Plus size={16} className="text-emerald-400" />
                    </div>
                    <h3 className="font-black text-emerald-400 uppercase tracking-widest text-sm">{editingPatientId ? "Edit Patient" : "Add Patient"}</h3>
                  </div>
                  <button
                    onClick={() => { setShowNewPatientForm(false); setEditingPatientId(null); setError(""); }}
                    className="flex items-center gap-2 px-3 py-1 bg-emerald-500 rounded-xl text-white hover:bg-emerald-400 transition-all text-[11px] font-black tracking-widest leading-none outline-none"
                  >
                    CANCEL
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Full Name *</label>
                    <input
                      placeholder="Patient's full name"
                      className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 text-white"
                      value={newPatientForm.name}
                      onChange={e => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                    />
                  </div>

                  {/* Age and Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Age *</label>
                      <input
                        type="number"
                        placeholder="Age in years"
                        className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-600 text-white"
                        value={newPatientForm.age}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "" || parseInt(val) >= 0) {
                            setNewPatientForm({ ...newPatientForm, age: val });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Sex *</label>
                      <select
                        value={newPatientForm.gender}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-emerald-500/50 outline-none transition-all text-white [&>option]:bg-slate-900"
                      >
                        <option value="" disabled className="text-slate-500">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* ID Section Header */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={14} className="text-slate-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identity Documents (Fill at least one)</span>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden divide-y divide-white/5">
                      {/* Aadhar */}
                      <div className="px-4 py-3">
                        <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block mb-1.5">Aadhar Card</label>
                        <input
                          placeholder="12-digit Aadhar number"
                          maxLength={12}
                          readOnly={!!(editingPatientId && account?.patients.find(p => p.id === editingPatientId)?.aadharId)}
                          className={`w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 text-white text-sm tracking-widest ${
                            (editingPatientId && account?.patients.find(p => p.id === editingPatientId)?.aadharId) ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          value={newPatientForm.aadharId}
                          onChange={e => setNewPatientForm({ ...newPatientForm, aadharId: e.target.value.replace(/\D/g, "") })}
                        />
                      </div>

                      {/* ABHA */}
                      <div className="px-4 py-3">
                        <label className="text-[9px] font-black uppercase tracking-widest text-sky-600 block mb-1.5">ABHA Card (Ayushman Bharat)</label>
                        <input
                          placeholder="ABHA health ID number"
                          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-sky-500/50 outline-none transition-all placeholder:text-slate-700 text-white text-sm"
                          value={newPatientForm.abhaId}
                          onChange={e => setNewPatientForm({ ...newPatientForm, abhaId: e.target.value })}
                        />
                      </div>

                      {/* UDID Handicapped Card */}
                      <div className="px-4 py-3">
                        <label className="text-[9px] font-black uppercase tracking-widest text-amber-600 block mb-1.5">UDID Card (Disability / Handicapped)</label>
                        <input
                          placeholder="Unique Disability ID number"
                          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none transition-all placeholder:text-slate-700 text-white text-sm"
                          value={newPatientForm.udidCardNumber}
                          onChange={e => setNewPatientForm({ ...newPatientForm, udidCardNumber: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={editingPatientId ? handleUpdatePatient : handleAddPatient}
                    disabled={saving}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#020617] font-black rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#020617]/30 border-t-[#020617] rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>{editingPatientId ? "Update Profile" : "Save Profile"}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Floating Continue Button */}
        <div className={`fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t ${darkMode ? 'from-slate-900 via-slate-900/90' : 'from-slate-50 via-slate-50/90'} to-transparent pt-20 pointer-events-none z-[100]`}>
          <div className="max-w-md mx-auto space-y-3 pointer-events-auto">
            <button
              onClick={handlePatientContinue}
              disabled={!selectedPatientId || checkingGatekeeper}
              className="group w-full h-16 rounded-[40px] bg-white text-[#020617] font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none transition-all"
            >
              {checkingGatekeeper ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#020617]/30 border-t-[#020617] rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
