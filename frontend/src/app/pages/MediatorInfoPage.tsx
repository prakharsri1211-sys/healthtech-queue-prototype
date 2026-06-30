import React from "react";
import { ChevronLeft, User, Phone, MapPin, Clipboard } from "lucide-react";
import { useNavigate } from "react-router";

export default function MediatorInfoPage(): React.JSX.Element {
    const navigate = useNavigate();

    const colors = {
        bg: "#0B1120",
        cardBg: "#111827",
        text: "#E5E7EB",
        textMuted: "#9CA3AF",
        textBright: "#FFFFFF",
        accent: "#3B82F6",
        border: "rgba(59,130,246,0.1)",
    };

    // Static data for now, ideally fetched from backend
    const mediator = {
        name: "Mediator Alpha",
        clinic: "City Wellness Center",
        phone: "+91 98765 43210",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: colors.bg,
                color: colors.text,
                fontFamily: "'Inter', sans-serif",
                padding: "20px",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "32px",
                }}
            >
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        backgroundColor: colors.cardBg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: "12px",
                        padding: "8px",
                        color: colors.textBright,
                        cursor: "pointer",
                    }}
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>Your Mediator</h1>
            </div>

            {/* Info Card */}
            <div
                style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: "24px",
                    padding: "32px",
                    border: `1px solid ${colors.border}`,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                borderRadius: "12px",
                                padding: "12px",
                                color: colors.accent,
                            }}
                        >
                            <User size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "14px", color: colors.textMuted }}>Full Name</p>
                            <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: colors.textBright }}>
                                {mediator.name}
                            </p>
                        </div>
                    </div>

                    {/* Clinic */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "rgba(16, 185, 129, 0.1)",
                                borderRadius: "12px",
                                padding: "12px",
                                color: "#10B981",
                            }}
                        >
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "14px", color: colors.textMuted }}>Clinic Name</p>
                            <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: colors.textBright }}>
                                {mediator.clinic}
                            </p>
                        </div>
                    </div>

                    {/* Phone */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                            style={{
                                backgroundColor: "rgba(245, 158, 11, 0.1)",
                                borderRadius: "12px",
                                padding: "12px",
                                color: "#F59E0B",
                            }}
                        >
                            <Phone size={24} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: "14px", color: colors.textMuted }}>Phone Number</p>
                            <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: colors.textBright }}>
                                {mediator.phone}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = `tel:${mediator.phone}`}
                    style={{
                        width: "100%",
                        backgroundColor: colors.accent,
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: "16px",
                        padding: "16px",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer",
                        marginTop: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                    }}
                >
                    <Phone size={20} />
                    Call Mediator
                </button>
            </div>

            {/* Helpful Note */}
            <div
                style={{
                    marginTop: "32px",
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    borderRadius: "16px",
                    padding: "20px",
                    display: "flex",
                    gap: "12px",
                }}
            >
                <Clipboard size={20} style={{ color: colors.accent, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: "14px", color: colors.textMuted, lineHeight: 1.5 }}>
                    Your mediator is responsible for coordinating your care with the doctor. Feel free to reach out if you have questions about your appointment.
                </p>
            </div>
        </div>
    );
}
