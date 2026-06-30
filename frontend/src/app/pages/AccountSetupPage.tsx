import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Landmark, CreditCard, User, Mail, Phone, Activity, Sparkles, CheckCircle, Save, ShieldCheck, MapPin } from "lucide-react";
import { motion } from "motion/react";

export default function AccountSetupPage(): React.JSX.Element {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        bankAccountName: "",
        bankAccountNumber: "",
        ifscCode: "",
        clinicAddress: "",
        pincode: "",
        emergencyContact: "",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call for financial vault storage
        await new Promise(r => setTimeout(r, 1500));
        setIsSaving(false);
        setIsSaved(true);
        setTimeout(() => navigate("/doctor-onboarding"), 2000);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 relative overflow-hidden flex flex-col items-center">
            {/* Background Aesthetic */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[140px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl relative z-10"
            >
                <button
                    onClick={() => navigate("/doctor-onboarding")}
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group mb-8 w-fit"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Hub</span>
                </button>

                <div className="glass-card-dark p-8 md:p-12 rounded-[40px] border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                    
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-white/5 border border-emerald-500/30 text-emerald-400 mb-6 shadow-2xl shadow-emerald-500/10">
                            <Landmark size={32} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter mb-2 italic">Professional Payout Vault</h1>
                        <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                            Secure Financial Verification <span className="text-white/20 mx-1 sm:mx-2">|</span> Mandatory Phase
                        </p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Section: Bank Details */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <CreditCard size={18} className="text-emerald-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Revenue Channel</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Account Holder Name</label>
                                    <input
                                        type="text"
                                        name="bankAccountName"
                                        required
                                        placeholder="Full Legal Name"
                                        value={formData.bankAccountName}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        name="ifscCode"
                                        required
                                        placeholder="SBIN000XXXX"
                                        value={formData.ifscCode}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-emerald-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Account Number</label>
                                <input
                                    type="password"
                                    name="bankAccountNumber"
                                    required
                                    placeholder="Enter account number"
                                    value={formData.bankAccountNumber}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-emerald-500/50 outline-none transition-all font-mono"
                                />
                            </div>
                        </div>

                        {/* Section: Clinical Identity */}
                        <div className="space-y-6 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <MapPin size={18} className="text-blue-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">Clinical Hub Profile</h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Practice Unit Address</label>
                                <input
                                    type="text"
                                    name="clinicAddress"
                                    required
                                    placeholder="Full Clinical Address"
                                    value={formData.clinicAddress}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-blue-500/50 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Pincode</label>
                                    <input
                                        type="text"
                                        name="pincode"
                                        required
                                        placeholder="000 000"
                                        value={formData.pincode}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-blue-500/50 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Emergency Service Phone</label>
                                    <input
                                        type="tel"
                                        name="emergencyContact"
                                        required
                                        placeholder="+91 Emergency Line"
                                        value={formData.emergencyContact}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm font-medium placeholder-slate-700 focus:border-blue-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSaving || isSaved}
                                className={`w-full h-16 rounded-2xl relative overflow-hidden group transition-all transform active:scale-95 ${isSaved ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/20'}`}
                            >
                                <div className="relative z-10 flex items-center justify-center gap-3">
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span className="font-black text-xs uppercase tracking-widest">Encrypting Private Record...</span>
                                        </>
                                    ) : isSaved ? (
                                        <>
                                            <CheckCircle size={20} />
                                            <span className="font-black text-xs uppercase tracking-widest">Profile Optimized</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            <span className="font-black text-xs uppercase tracking-widest text-white">Save Profile</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                             <ShieldCheck size={14} className="text-emerald-500" />
                             <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest">Government Compliance v4.1 Active</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
