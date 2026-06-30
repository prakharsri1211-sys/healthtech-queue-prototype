import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Info, Activity, Truck, Home, ShoppingBag, LogOut } from "lucide-react";

export default function DoctorSetupPage(): React.JSX.Element {
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState({
        wheelchair: false,
        stretcher: false,
        admit: false,
        pharmacy: false,
    });

    const colors = {
        bg: "#0B1120", // Midnight Navy
        cardBg: "#111827",
        accent: "#3B82F6",
        textBright: "#FFFFFF",
        textMuted: "#9CA3AF",
        border: "rgba(59,130,246,0.1)",
    };

    const handleToggle = (key: keyof typeof facilities) => {
        setFacilities(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        console.log("Saving facilities:", facilities);
        navigate("/doctor");
    };

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, color: colors.textBright, padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: "500px", margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: "none", border: "none", color: colors.textMuted, display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            navigate("/");
                        }}
                        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#EF4444", display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </div>

                <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>Clinic Setup</h1>
                <p style={{ color: colors.textMuted, marginBottom: "40px" }}>Configure your clinic's available facilities and services.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[
                        { key: "wheelchair", label: "Wheelchair Accessibility", icon: <Activity size={20} /> },
                        { key: "stretcher", label: "Stretcher Availability", icon: <Truck size={20} /> },
                        { key: "admit", label: "Admit Department", icon: <Home size={20} /> },
                        { key: "pharmacy", label: "Pharmacy Unit", icon: <ShoppingBag size={20} /> },
                    ].map((item) => (
                        <div
                            key={item.key}
                            onClick={() => handleToggle(item.key as any)}
                            style={{
                                backgroundColor: colors.cardBg,
                                borderRadius: "20px",
                                padding: "20px",
                                border: `1px solid ${facilities[item.key as keyof typeof facilities] ? colors.accent : colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                <div style={{ color: facilities[item.key as keyof typeof facilities] ? colors.accent : colors.textMuted }}>
                                    {item.icon}
                                </div>
                                <span style={{ fontWeight: 600 }}>{item.label}</span>
                            </div>
                            <div style={{
                                width: "48px",
                                height: "24px",
                                backgroundColor: facilities[item.key as keyof typeof facilities] ? colors.accent : "#1F2937",
                                borderRadius: "20px",
                                position: "relative",
                                transition: "background-color 0.2s"
                            }}>
                                <div style={{
                                    width: "18px",
                                    height: "18px",
                                    backgroundColor: "white",
                                    borderRadius: "50%",
                                    position: "absolute",
                                    top: "3px",
                                    left: facilities[item.key as keyof typeof facilities] ? "27px" : "3px",
                                    transition: "left 0.2s"
                                }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "rgba(59, 130, 246, 0.05)", borderRadius: "16px", display: "flex", gap: "12px" }}>
                    <Info size={20} style={{ color: colors.accent, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted, lineHeight: "1.5" }}>
                        These details will be displayed to patients on your clinic profile to help them make informed booking decisions.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    style={{
                        width: "100%",
                        backgroundColor: colors.accent,
                        color: "white",
                        border: "none",
                        borderRadius: "16px",
                        padding: "18px",
                        fontSize: "16px",
                        fontWeight: 700,
                        marginTop: "40px",
                        cursor: "pointer",
                        boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)"
                    }}
                >
                    Complete Setup
                </button>
            </div>
        </div>
    );
}
