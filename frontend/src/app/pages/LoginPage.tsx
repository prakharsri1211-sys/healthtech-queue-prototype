import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, User, Activity, Eye, EyeOff, CreditCard, KeyRound, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { reportTelemetryError } from "../utils/telemetry";

type PageMode = "login" | "forgot_aadhaar" | "forgot_otp" | "forgot_reset";

export default function LoginPage(): React.JSX.Element {
    const [mode, setMode] = useState<PageMode>("login");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    // Forgot password state
    const [aadhaarNumber, setAadhaarNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);
    const [successMsg, setSuccessMsg] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem("currentUser") || localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.role === "ROLE_DOCTOR") navigate("/doctor");
                else if (user.role === "ROLE_MEDIATOR") navigate("/mediator");
                else navigate("/patient-portal");
            } catch (e) {
                localStorage.removeItem("currentUser");
                localStorage.removeItem("user");
            }
        }
    }, [navigate]);

    // OTP countdown
    useEffect(() => {
        if (otpTimer > 0) {
            const t = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [otpTimer]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
            const loginUrl = `${apiBase}/api/auth/login`;
            
            console.log(`[Clinical Node] Attempting login at: ${loginUrl}`);

            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                const userWithUnifiedName = { ...data, name: data.fullName || data.name || data.username };
                localStorage.setItem("user", JSON.stringify(userWithUnifiedName));
                localStorage.setItem("currentUser", JSON.stringify(userWithUnifiedName));
                sessionStorage.setItem("currentUser", JSON.stringify(userWithUnifiedName));

                if (data.role === "ROLE_DOCTOR") {
                    const dId = data.doctorId || data.id;
                    navigate(`/doctor/dashboard/${dId}`);
                } else if (data.role === "ROLE_MEDIATOR") {
                    navigate(`/mediator`);
                } else {
                    navigate("/patient-portal");
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error || "Invalid credentials. Check username & password.";
                setError(errorMsg);
                reportTelemetryError(`Login Rejected: ${username}`, `API responded with non-2xx status: ${response.status}\nMessage: ${errorMsg}`);
            }
        } catch (err) {
            setError("Server unreachable. Please try again later.");
            reportTelemetryError(`Login Fatal Error: ${username}`, String(err));
        } finally {
            setIsLoading(false);
        }
    };

    const validateAadhaar = (val: string) => /^\d{12}$/.test(val.replace(/\s/g, ""));

    const handleSendOtp = () => {
        if (!validateAadhaar(aadhaarNumber)) {
            setError("Please enter a valid 12-digit Aadhaar number.");
            return;
        }
        setError("");
        // Generate demo OTP (in production, backend would send to registered mobile)
        const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(demoOtp);
        setOtpSent(true);
        setOtpTimer(60);
        setMode("forgot_otp");
        // Show OTP in console for demo purposes
        console.log("Demo OTP:", demoOtp);
        alert(`DEMO MODE: Your OTP is ${demoOtp} (In production, this is sent to your Aadhaar-linked mobile number)`);
    };

    const handleVerifyOtp = () => {
        if (otp === generatedOtp) {
            setError("");
            setMode("forgot_reset");
        } else {
            setError("Invalid OTP. Please try again.");
        }
    };

    const handleResetPassword = () => {
        if (!newPassword || newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError("");
        setSuccessMsg("Password reset successful! Redirecting to login...");
        setTimeout(() => {
            setMode("login");
            setSuccessMsg("");
            setAadhaarNumber("");
            setOtp("");
            setNewPassword("");
            setConfirmPassword("");
        }, 2500);
    };

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-all";

    const renderLogin = () => (
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="text-left">
                <label className="block text-[15px] font-semibold text-slate-400 mb-2 ml-1">
                    Username
                </label>
                <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={inputClass}
                        autoComplete="off"
                    />
                </div>
            </div>

            <div className="text-left mt-2">
                <label className="block text-[15px] font-semibold text-slate-400 mb-2 ml-1">
                    Password
                </label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-12 text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-all"
                        autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div className="text-right">
                <button
                    type="button"
                    onClick={() => { setMode("forgot_aadhaar"); setError(""); }}
                    className="text-[14px] font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-transparent border-none cursor-pointer"
                >
                    Forgot Password?
                </button>
            </div>

            {error && <p className="text-red-500 text-[15px] font-medium m-0">{error}</p>}

            <button
                type="submit"
                disabled={isLoading}
                className={`w-full h-14 rounded-2xl text-lg font-bold shadow-sm transition-all active:scale-95 ${
                    isLoading ? 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Authenticating...</span>
                    </div>
                ) : "Sign In"}
            </button>
        </form>
    );

    const renderAadhaarEntry = () => (
        <div className="flex flex-col gap-5">
            <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700">
                <ShieldCheck size={16} className="inline mr-2 text-blue-500" />
                Enter your 12-digit Aadhaar number. An OTP will be sent to your Aadhaar-linked mobile number to verify your identity.
            </div>

            <div className="text-left">
                <label className="block text-[15px] font-semibold text-slate-500 dark:text-slate-400 mb-2 ml-1">
                    Aadhaar Card Number
                </label>
                <div className="relative">
                    <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="[Aadhaar Redacted]"
                        value={aadhaarNumber}
                        onChange={(e) => {
                            // Format with spaces every 4 digits
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                            const formatted = raw.replace(/(.{4})/g, "$1 ").trim();
                            setAadhaarNumber(formatted);
                        }}
                        maxLength={14}
                        className={inputClass}
                        style={{ letterSpacing: "0.15em" }}
                    />
                </div>
            </div>

            {error && <p className="text-red-500 text-[15px] font-medium m-0">{error}</p>}

            <button
                onClick={handleSendOtp}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
                Send OTP →
            </button>

            <button type="button" onClick={() => { setMode("login"); setError(""); }} className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm font-medium transition-colors">
                <ArrowLeft size={16} /> Back to Login
            </button>
        </div>
    );

    const renderOtpVerification = () => (
        <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[15px] text-slate-600 dark:text-slate-400 text-left">
                OTP sent to your Aadhaar-linked mobile number ending in <strong className="text-emerald-600 dark:text-emerald-400">****{aadhaarNumber.replace(/\s/g, "").slice(-4)}</strong>
            </div>

            <div className="text-left">
                <label className="block text-[15px] font-semibold text-slate-500 dark:text-slate-400 mb-2 ml-1">
                    Enter 6-Digit OTP
                </label>
                <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className={inputClass}
                        style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "24px", fontWeight: 800 }}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Didn't receive OTP?"}
                </span>
                {otpTimer === 0 && (
                    <button type="button" onClick={handleSendOtp} className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-bold transition-colors">
                        <RefreshCw size={12} /> Resend OTP
                    </button>
                )}
            </div>

            {error && <p className="text-red-500 text-[15px] font-medium m-0">{error}</p>}

            <button
                onClick={handleVerifyOtp}
                disabled={otp.length !== 6}
                className={`w-full h-14 rounded-2xl text-lg font-bold shadow-md transition-all active:scale-95 ${otp.length === 6 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-400'}`}
            >
                Verify OTP
            </button>

            <button type="button" onClick={() => { setMode("forgot_aadhaar"); setError(""); }} className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm font-medium transition-colors">
                <ArrowLeft size={16} /> Change Aadhaar Number
            </button>
        </div>
    );

    const renderResetPassword = () => (
        <div className="flex flex-col gap-5">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[15px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                <ShieldCheck size={16} /> Identity Verified • Set your new password
            </div>

            <div className="text-left">
                <label className="block text-[15px] font-semibold text-slate-500 dark:text-slate-400 mb-2 ml-1">New Password</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
                </div>
            </div>

            <div className="text-left">
                <label className="block text-[15px] font-semibold text-slate-500 dark:text-slate-400 mb-2 ml-1">Confirm New Password</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                </div>
            </div>

            {error && <p className="text-red-500 text-[15px] font-medium m-0">{error}</p>}
            {successMsg && <p className="text-emerald-600 text-[15px] font-semibold m-0 text-center">{successMsg}</p>}

            <button
                onClick={handleResetPassword}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
                Reset Password
            </button>
        </div>
    );

    const modeTitle: Record<PageMode, string> = {
        login: "HealthTech Portal",
        forgot_aadhaar: "Identity Verification",
        forgot_otp: "OTP Verification",
        forgot_reset: "Reset Password"
    };

    const modeSubtitle: Record<PageMode, string> = {
        login: "Secure Access for Healthcare Professionals",
        forgot_aadhaar: "Verify your identity via Aadhaar",
        forgot_otp: "Enter the OTP sent to your mobile",
        forgot_reset: "Create your new secure password"
    };

    return (
        <div className="w-full min-h-screen bg-[#020617] flex flex-col items-center justify-center p-5 overflow-x-hidden relative transition-colors duration-300 text-slate-100">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md p-8 sm:p-10 text-center animate-in fade-in zoom-in duration-500 glass-card-dark rounded-[40px] border border-white/5 shadow-2xl relative z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-[28px] mb-8 text-blue-400 border border-blue-500/20 shadow-inner">
                    <Activity size={36} />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2 tracking-tight">
                    {modeTitle[mode]}
                </h1>
                <p className="text-slate-400 font-medium">
                    {modeSubtitle[mode]}
                </p>

                {mode === "login" && renderLogin()}
                {mode === "forgot_aadhaar" && renderAadhaarEntry()}
                {mode === "forgot_otp" && renderOtpVerification()}
                {mode === "forgot_reset" && renderResetPassword()}

                {mode === "login" && (
                    <div className="mt-8 pt-6 border-t border-white/5 text-sm text-slate-400 font-medium">
                        Don't have an account?{" "}
                        <span onClick={() => navigate("/role-selection")} className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer transition-colors">
                            Sign Up
                        </span>
                    </div>
                )}
            </div>

            <p className="mt-8 text-xs text-slate-500 font-medium z-10">
                &copy; 2026 HealthTech Systems. All rights reserved.
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-widest font-black z-10">
                Version 2.0 - Clean Edition
            </div>
        </div>
    );
}
