import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Lock, User, Activity, Phone, ShieldCheck, ChevronLeft, MapPin, Sparkles, CheckCircle, AlertCircle, Fingerprint, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ClinicLocationSetup } from "../components/doctor/ClinicLocationSetup";
import { LocationSelectorMap } from "../components/patient/LocationSelectorMap";

export default function SignUpPage(): React.JSX.Element {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const role = searchParams.get("role") || "patient";

    const [formData, setFormData] = useState({
        username: "",
        password: "",
        email: "",
        phone: "",
        fullName: "",
        confirmPassword: "",
        clinicName: "",
        speciality: "",
        age: "",
        aadharId: "",
        identityToken: "",
        latitude: "",
        longitude: "",
        gender: "",
        clinicAddress: "",
    });
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (error) setError("");
    };

    const handlePasteCoordinates = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");
        const parts = pastedText.split(/[\s,]+/);
        if (parts.length >= 2) {
            const lat = parts[0].trim();
            const lng = parts[1].trim();
            if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
                e.preventDefault();
                setFormData((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng
                }));
            }
        }
    };


    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        
        const cleanPhone = formData.phone.replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            setError("Contact Protocol (Phone) must be exactly 10 digits");
            setIsLoading(false);
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        if (role === "patient" && (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) <= 0)) {
            setError("Please enter a valid age");
            setIsLoading(false);
            return;
        }

        if (formData.aadharId && !/^\d{12}$/.test(formData.aadharId.replace(/\s/g, ""))) {
            setError("Aadhar must be exactly 12 digits");
            setIsLoading(false);
            return;
        }

        if (!isVerified && (role === "doctor" || role === "mediator")) {
            setError("Identity verification required");
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters long");
            setIsLoading(false);
            return;
        }

        const apiRole = role === "doctor" ? "ROLE_DOCTOR" : role === "mediator" ? "ROLE_MEDIATOR" : "ROLE_PATIENT";

        const signupData: Record<string, string | boolean> = {
            username: formData.username,
            password: formData.password,
            fullName: formData.fullName,
            phoneNumber: formData.phone,
            role: apiRole,
            primaryAadharNumber: formData.aadharId,
            age: formData.age,
            identityToken: formData.identityToken,
            gender: formData.gender || ""
        };

        if (role === "doctor") {
            if (formData.speciality.trim()) signupData.speciality = formData.speciality.trim();
            if (formData.clinicName.trim()) signupData.clinicName = formData.clinicName.trim();
            if (formData.clinicAddress.trim()) signupData.clinicAddress = formData.clinicAddress.trim();
            if (formData.latitude) signupData.latitude = formData.latitude;
            if (formData.longitude) signupData.longitude = formData.longitude;
        }

        try {
            // Priority: use relative path to allow Nginx/Vite proxy to handle routing correctly in Docker/Local
            const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
            const signupUrl = `${apiBase}/api/auth/signup`;
            
            console.log(`[Clinical Node] Initiating registration at: ${signupUrl}`);
            
            const response = await fetch(signupUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupData)
            });

            if (response.ok) {
                const loginRes = await fetch(`${apiBase}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: formData.username, password: formData.password })
                });

                let userToSave: any = {
                    username: signupData.username,
                    role: apiRole,
                    fullName: signupData.fullName,
                    primaryAadharNumber: signupData.primaryAadharNumber,
                    age: signupData.age
                };

                if (loginRes.ok) {
                     const userData = await loginRes.json();
                     userToSave = { 
                        ...userData, 
                        name: userData.fullName || userData.username,
                        primaryAadharNumber: userData.primaryAadharNumber || signupData.primaryAadharNumber,
                        age: userData.age || signupData.age
                     };
                }

                if (role === "patient") {
                    sessionStorage.setItem("accountData", JSON.stringify({
                        id: userToSave.id || userToSave.username, 
                        username: userToSave.username,
                        patients: []
                    }));
                }
                
                localStorage.setItem("user", JSON.stringify(userToSave));
                localStorage.setItem("currentUser", JSON.stringify(userToSave));
                sessionStorage.setItem("currentUser", JSON.stringify(userToSave));

                const target = role === "doctor" ? "/doctor-onboarding" : role === "mediator" ? "/clinic-confirmation" : "/patient-portal";
                navigate(target);
            } else {
                const data = await response.json();
                setError(data.error || "Signup failed. Please try again.");
            }
        } catch (err) {
            console.error("Signup error:", err);
            setError("Cannot connect to server. Ensure backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleConfig = () => {
        switch (role) {
            case "doctor":
                return {
                    icon: <Activity size={32} />,
                    color: "blue",
                    title: "Medical Specialist",
                };
            case "mediator":
                return {
                    icon: <ShieldCheck size={32} />,
                    color: "emerald",
                    title: "Health Mediator",
                };
            default:
                return {
                    icon: <User size={32} />,
                    color: "sky",
                    title: "Patient",
                };
        }
    };

    const config = getRoleConfig();

    return (
        <div className="w-full min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-${config.color}-200/50 rounded-full blur-[120px]`} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl relative z-10"
            >
                <button
                    onClick={() => navigate("/role-selection")}
                    className="flex flex-col sm:flex-row items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-black text-[10px] uppercase tracking-widest mb-8 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                    <ChevronLeft size={16} />
                    <span>Back to Portal Access</span>
                </button>

                <div className="bg-white p-6 sm:p-12 rounded-[40px] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-${config.color}-500`} />
                    
                    <div className="text-center mb-10">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${config.color}-50 flex items-center justify-center text-${config.color}-600 mb-6 border border-${config.color}-100`}>
                            {config.icon}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] mb-2">Clinical Registration</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                            Nodal Point: <span className={`text-${config.color}-600 font-black`}>{config.title}</span>
                        </p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-6" autoComplete="off">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Legal Name</label>
                                <div className="relative group">
                                    <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        placeholder="Full Name"
                                        required
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] placeholder-slate-400 focus:border-slate-400 outline-none transition-all"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Username (Login ID)</label>
                                <div className="relative group">
                                    <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="Choose a username"
                                        required
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] placeholder-slate-300 focus:border-slate-400 outline-none transition-all"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Token (Private Key)</label>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const base = formData.fullName.split(' ')[0].toLowerCase() || "user";
                                        const rand = Math.floor(100 + Math.random() * 899);
                                        const ageStr = formData.age ? `_${formData.age}` : "";
                                        setFormData(prev => ({ ...prev, identityToken: `${base}${ageStr}_${rand}` }));
                                    }}
                                    className={`text-[9px] font-black uppercase tracking-widest text-${config.color}-600 hover:underline`}
                                >
                                    Suggest One
                                </button>
                            </div>
                            <div className="relative group">
                                <Fingerprint size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                <input
                                    type="text"
                                    name="identityToken"
                                    placeholder="e.g. @your_name_123"
                                    required
                                    value={formData.identityToken}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] placeholder-slate-300 focus:border-slate-400 outline-none transition-all"
                                    autoComplete="off"
                                />
                            </div>
                            <p className="text-[9px] font-bold text-rose-500/70 uppercase tracking-widest ml-2">
                                "identity token is important so remember it"
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Protocol</label>
                                <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden focus-within:border-slate-400 transition-all">
                                    <div className="flex items-center px-3 bg-slate-100 border-r border-slate-200">
                                        <select className="bg-transparent text-slate-600 text-sm font-bold outline-none cursor-pointer pr-1 appearance-none">
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                        </select>
                                    </div>
                                    <div className="relative flex-1 group">
                                        <Phone size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            placeholder="Mobile Number"
                                            maxLength={10}
                                            required
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                handleInputChange({ target: { name: 'phone', value: val } } as any);
                                            }}
                                            className="w-full bg-transparent py-4 pl-10 pr-4 text-sm font-bold text-[#0F172A] placeholder-slate-400 outline-none"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Credential</label>
                                <div className="relative group">
                                    <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="••••••••"
                                        required
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-[#0F172A] placeholder-slate-400 focus:border-slate-400 outline-none transition-all"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verify Credential</label>
                            <div className="relative group">
                                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] placeholder-slate-400 focus:border-slate-400 outline-none transition-all"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        {/* Condition-based Extra Fields */}
                        {(role === "doctor") && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Practice Unit</label>
                                    <div className="relative group">
                                        <MapPin size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                        <input
                                            type="text"
                                            name="clinicName"
                                            placeholder="Clinic / Hospital Name"
                                            required
                                            value={formData.clinicName}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] focus:border-slate-400 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <MapPin size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 text-${config.color}-500`} />
                                        <input
                                            type="text"
                                            name="clinicAddress"
                                            placeholder="Clinic Full Address"
                                            required
                                            value={formData.clinicAddress}
                                            onChange={handleInputChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-[#0F172A] focus:border-slate-400 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Medical Specialty</label>
                                    <input
                                        list="specialties"
                                        name="speciality"
                                        placeholder="Type or select a specialty..."
                                        required
                                        value={formData.speciality}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-[#0F172A] focus:border-slate-400 outline-none transition-all"
                                    />
                                    <datalist id="specialties">
                                        <option value="General Medicine" />
                                        <option value="Cardiology" />
                                        <option value="Cardiologist" />
                                        <option value="Heart Specialist" />
                                        <option value="Neurology" />
                                        <option value="Ayurveda" />
                                        <option value="Homeopathy" />
                                        <option value="Orthopedics" />
                                        <option value="Pediatrics" />
                                        <option value="Dermatology" />
                                        <option value="Psychiatry" />
                                        <option value="Oncology" />
                                        <option value="Gastroenterology" />
                                        <option value="Endocrinology" />
                                        <option value="Rheumatology" />
                                        <option value="Urology" />
                                        <option value="Nephrology" />
                                        <option value="Pulmonology" />
                                        <option value="Ophthalmology" />
                                        <option value="ENT" />
                                        <option value="Gynecology" />
                                        <option value="Obstetrics" />
                                        <option value="Anesthesiology" />
                                        <option value="Pathology" />
                                        <option value="Radiology" />
                                        <option value="Surgery" />
                                        <option value="Emergency Medicine" />
                                        <option value="Dentistry" />
                                    </datalist>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic Coordinates</label>
                                    </div>
                                    <LocationSelectorMap 
                                        theme="light"
                                        onLocationSelected={(coords) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                latitude: coords.lat.toString(),
                                                longitude: coords.lng.toString()
                                            }))
                                        }}
                                    />
                                    {formData.latitude && formData.longitude && (
                                        <p className="text-xs font-bold text-slate-500 mt-2 px-1">Selected: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {role === "patient" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] ml-1">Patient Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        placeholder="Years"
                                        required
                                        value={formData.age}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-[#0F172A] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] ml-1">Sex</label>
                                    <select
                                        name="gender"
                                        required
                                        value={formData.gender}
                                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-[#0F172A] outline-none transition-all"
                                    >
                                        <option value="" disabled>Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Government ID Section */}
                        <div className="p-1 rounded-3xl bg-slate-50 border border-slate-200">
                             <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#0F172A]">Aadhar Identity</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">12-Digit Verification</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-2 py-2">
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="aadharId"
                                        maxLength={12}
                                        placeholder="•••• •••• ••••"
                                        value={formData.aadharId}
                                        onChange={handleInputChange}
                                        className={`w-full bg-white border ${isVerified ? 'border-emerald-500/50' : 'border-slate-100'} rounded-2xl py-4 px-6 text-sm font-black tracking-[0.4em] text-[#0F172A] outline-none transition-all`}
                                    />
                                    <AnimatePresence>
                                        {formData.aadharId.length === 12 && !isVerified && !isVerifying && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                type="button"
                                                onClick={async () => {
                                                    setIsVerifying(true);
                                                    await new Promise(r => setTimeout(r, 2000));
                                                    setIsVerifying(false);
                                                    setIsVerified(true);
                                                }}
                                                className={`absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-${config.color}-600 text-white font-black text-[10px] uppercase tracking-widest shadow-md`}
                                            >
                                                Verify
                                            </motion.button>
                                        )}
                                        {isVerified && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-600">
                                                <CheckCircle size={18} />
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                            >
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Removed duplicate ClinicLocationSetup */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all enabled:hover:scale-[1.01] enabled:active:scale-[0.98] shadow-xl ${
                                isLoading 
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                                    : `bg-${config.color}-600 text-white shadow-${config.color}-500/20`
                            }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin`} />
                                    <span className="font-black text-sm uppercase tracking-[0.2em]">Processing...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="font-black text-sm uppercase tracking-[0.2em]">Register Account</span>
                                    <Sparkles size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                            Authorized Medical Node <span className="mx-2 text-slate-200">|</span> HIPAA Secure Connection
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
