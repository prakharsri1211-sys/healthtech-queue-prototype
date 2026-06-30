import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { User, Plus, Trash2, ShieldCheck, ChevronLeft, CreditCard, ChevronRight } from "lucide-react";

interface Dependent {
    id: string;
    name: string;
    age: number;
    aadharId: string;
    udidCardNumber?: string;
    disabilityPercentage?: string;
    disabilityType?: string;
}

export default function AccountManagement(): React.JSX.Element {
    const navigate = useNavigate();
    const [dependents, setDependents] = useState<Dependent[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDependent, setNewDependent] = useState({
        name: "",
        age: "",
        aadharId: "",
        udidCardNumber: "",
        disabilityPercentage: "",
        disabilityType: ""
    });
    const [error, setError] = useState("");

    const colors = {
        bg: "#0B1120",
        cardBg: "#111827",
        text: "#E5E7EB",
        textMuted: "#9CA3AF",
        textBright: "#FFFFFF",
        accent: "#3B82F6",
        danger: "#EF4444",
        border: "rgba(59,130,246,0.1)",
    };

    useEffect(() => {
        // Mock loading dependents
        const saved = localStorage.getItem("dependents");
        if (saved) {
            setDependents(JSON.parse(saved));
        }
    }, []);

    const handleAddDependent = (e: React.FormEvent) => {
        e.preventDefault();
        if (dependents.length >= 5) {
            setError("Maximum 5 dependents allowed.");
            return;
        }
        if (!newDependent.name || !newDependent.age || !newDependent.aadharId) {
            setError("Please fill all fields.");
            return;
        }

        const isDuplicate = dependents.some(d => d.aadharId === newDependent.aadharId);
        if (isDuplicate) {
            setError("This Aadhar number is already added to an account.");
            return;
        }

        const dependent: Dependent = {
            id: Math.random().toString(36).substr(2, 9),
            name: newDependent.name,
            age: parseInt(newDependent.age),
            aadharId: newDependent.aadharId,
        };

        const updated = [...dependents, dependent];
        setDependents(updated);
        localStorage.setItem("dependents", JSON.stringify(updated));
        setNewDependent({
            name: "",
            age: "",
            aadharId: "",
            udidCardNumber: "",
            disabilityPercentage: "",
            disabilityType: ""
        });
        setShowAddForm(false);
        setError("");
    };

    const handleRemove = (id: string) => {
        const updated = dependents.filter(d => d.id !== id);
        setDependents(updated);
        localStorage.setItem("dependents", JSON.stringify(updated));
    };

    return (
        <div className="w-full min-h-screen overflow-x-hidden bg-[#0B1120] text-[#E5E7EB] p-4 sm:p-5 font-sans">
            <div className="max-w-[600px] mx-auto my-10">
                <button
                    onClick={() => navigate("/patient")}
                    className="bg-transparent border-none text-[#9CA3AF] flex items-center gap-1 cursor-pointer mb-8 hover:text-white transition-colors"
                >
                    <ChevronLeft size={16} /> Back to Dashboard
                </button>

                <h1 className="text-xl sm:text-3xl font-extrabold text-[#F1F5F9] mb-2">Account Management</h1>
                <p className="text-[#9CA3AF] mb-10 text-sm sm:text-base">Manage your family members and dependents</p>

                <div className="flex flex-col gap-4">
                    {dependents.map((dep) => (
                        <div
                            key={dep.id}
                            className="bg-[#111827] rounded-2xl p-4 sm:p-5 border border-[#3B82F6]/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0"
                        >
                            <div>
                                <h3 className="m-0 text-base font-bold text-white">{dep.name}</h3>
                                <p className="mt-1 mb-0 text-sm text-[#9CA3AF]">
                                    Age: {dep.age} • Aadhar: {dep.aadharId}
                                </p>
                            </div>
                            <button
                                onClick={() => handleRemove(dep.id)}
                                className="bg-transparent border-none text-red-500 cursor-pointer p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}

                    {dependents.length < 5 && !showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full p-4 sm:p-5 bg-blue-500/5 border-2 border-dashed border-[#3B82F6]/20 rounded-2xl text-blue-500 flex items-center justify-center gap-2 font-semibold cursor-pointer hover:bg-blue-500/10 transition-colors"
                        >
                            <Plus size={20} /> Add Dependent
                        </button>
                    )}

                    {showAddForm && (
                        <div className="bg-[#111827] rounded-[20px] p-6 sm:p-8 border border-blue-500/40">
                            <h2 className="text-lg font-bold text-white mb-5">New Dependent</h2>
                            <form onSubmit={handleAddDependent} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-[#9CA3AF]">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newDependent.name}
                                        onChange={(e) => setNewDependent({ ...newDependent, name: e.target.value })}
                                        className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-sm text-[#9CA3AF]">Age</label>
                                        <input
                                            type="number"
                                            required
                                            value={newDependent.age}
                                            onChange={(e) => setNewDependent({ ...newDependent, age: e.target.value })}
                                            className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="flex-[2] flex flex-col gap-2">
                                        <label className="text-sm text-[#9CA3AF]">Aadhar Number</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={12}
                                            value={newDependent.aadharId}
                                            onChange={(e) => setNewDependent({ ...newDependent, aadharId: e.target.value })}
                                            className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* UDID Section */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-[#9CA3AF]">UDID Card Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={newDependent.udidCardNumber}
                                        onChange={(e) => setNewDependent({ ...newDependent, udidCardNumber: e.target.value })}
                                        className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-sm text-[#9CA3AF]">Disability %</label>
                                        <input
                                            type="number"
                                            value={newDependent.disabilityPercentage}
                                            onChange={(e) => setNewDependent({ ...newDependent, disabilityPercentage: e.target.value })}
                                            className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="flex-[2] flex flex-col gap-2">
                                        <label className="text-sm text-[#9CA3AF]">Disability Type</label>
                                        <input
                                            type="text"
                                            value={newDependent.disabilityType}
                                            onChange={(e) => setNewDependent({ ...newDependent, disabilityType: e.target.value })}
                                            className="bg-white/5 border border-[#3B82F6]/10 rounded-xl p-3 text-white outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-red-500 text-sm m-0">{error}</p>}
                                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-xl p-3 font-bold cursor-pointer transition-colors"
                                    >
                                        Save Member
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(false)}
                                        className="flex-1 bg-transparent border border-[#3B82F6]/20 text-[#E5E7EB] hover:bg-white/5 rounded-xl p-3 font-semibold cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <button
                        onClick={() => navigate("/specialty-selection")}
                        className="w-full p-4 sm:p-5 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-2xl text-base font-extrabold cursor-pointer shadow-[0_10px_15px_-3px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-colors"
                    >
                        Proceed to Booking <ChevronRight size={20} />
                    </button>
                </div>

                <div className="mt-10 p-4 sm:p-6 bg-emerald-500/5 rounded-[20px] border border-emerald-500/10">
                    <div className="flex items-center gap-3 mb-3">
                        <ShieldCheck size={20} className="text-emerald-500" />
                        <h3 className="m-0 text-base font-bold text-white">Privacy & Security</h3>
                    </div>
                    <p className="m-0 text-sm text-[#9CA3AF] leading-relaxed">
                        All medical records for dependents are stored securely. You can manage access rights for each family member individually.
                    </p>
                </div>
            </div>
        </div>
    );
}
