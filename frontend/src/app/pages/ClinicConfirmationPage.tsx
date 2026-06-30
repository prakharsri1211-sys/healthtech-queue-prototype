import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, MapPin, User, ChevronRight, Loader2 } from "lucide-react";
const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

export default function ClinicConfirmationPage(): React.JSX.Element {
    const navigate = useNavigate();
    const [clinicName, setClinicName] = useState("Loading...");
    const [assignedDoctor, setAssignedDoctor] = useState("Loading...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
                    setClinicName(data.clinicName || "City Wellness Center");
                    setAssignedDoctor(data.doctorName || "Assigned Doctor");
                    setLoading(false);
                } else {
                    navigate("/mediator/unassigned");
                }
            } catch (e) {
                navigate("/mediator/unassigned");
            }
        };

        fetchAssignment();
    }, [navigate]);

    const colors = {
        bg: "#0B1120",
        cardBg: "#111827",
        accent: "#3B82F6",
        textBright: "#FFFFFF",
        textMuted: "#9CA3AF",
        border: "rgba(59,130,246,0.1)",
    };

    const handleConfirm = () => {
        navigate("/mediator");
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={48} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, color: colors.textBright, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Inter', sans-serif" }}>
            <div style={{ width: "100%", maxWidth: "450px", backgroundColor: colors.cardBg, borderRadius: "32px", padding: "40px", border: `1px solid ${colors.border}`, textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                <div style={{ display: "inline-flex", padding: "20px", backgroundColor: "rgba(16, 185, 129, 0.1)", borderRadius: "24px", color: "#10B981", marginBottom: "24px" }}>
                    <ShieldCheck size={48} />
                </div>

                <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>Assignment Confirmed</h1>
                <p style={{ color: colors.textMuted, fontSize: "15px", marginBottom: "32px" }}>Your account has been successfully linked to the following medical facility.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
                    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "20px", border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ color: colors.accent }}><MapPin size={24} /></div>
                        <div style={{ textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: colors.textMuted, fontWeight: 700 }}>CLINIC</p>
                            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{clinicName}</p>
                        </div>
                    </div>

                    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "20px", border: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ color: colors.accent }}><User size={24} /></div>
                        <div style={{ textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: colors.textMuted, fontWeight: 700 }}>ASSIGNED DOCTOR</p>
                            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{assignedDoctor}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleConfirm}
                    style={{
                        width: "100%",
                        backgroundColor: colors.accent,
                        color: "white",
                        border: "none",
                        borderRadius: "16px",
                        padding: "18px",
                        fontSize: "16px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)"
                    }}
                >
                    Enter Dashboard <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
}
