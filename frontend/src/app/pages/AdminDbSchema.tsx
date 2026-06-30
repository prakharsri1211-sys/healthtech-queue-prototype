import React, { useState, useEffect } from "react";
import { Database, ShieldCheck, Server, Table as TableIcon, Activity } from "lucide-react";
import { useNavigate } from "react-router";

interface SchemaData {
    status: string;
    database: string;
    sqlStatus?: string;
    sqlTables?: string[];
    sqlEngine?: string;
    sqlError?: string;
    noSqlStatus?: string;
    noSqlCollections?: string[];
    noSqlEngine?: string;
    noSqlError?: string;
    error?: string;
}

export default function AdminDbSchema(): React.JSX.Element {
    const [data, setData] = useState<SchemaData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const colors = {
        bg: "#0B1120",
        cardBg: "#111827",
        text: "#E5E7EB",
        textMuted: "#9CA3AF",
        textBright: "#FFFFFF",
        accent: "#3B82F6",
        border: "rgba(59,130,246,0.1)",
        success: "#10B981",
        error: "#EF4444"
    };

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await fetch("/actuator/health");
                if (response.ok) {
                    const json = await response.json();
                    const sqlStatus = json.components?.db?.status === "UP" ? "CONNECTED" : "OFFLINE";
                    const noSqlStatus = json.components?.mongo?.status === "UP" ? "CONNECTED" : "OFFLINE";
                    setData({
                        status: "OK",
                        database: "Hybrid",
                        sqlStatus: sqlStatus,
                        sqlTables: ["doctor", "account", "mediator", "finance_ledger"],
                        sqlEngine: "PostgreSQL",
                        noSqlStatus: noSqlStatus,
                        noSqlCollections: ["live_queues", "appointments", "vitals_logs"],
                        noSqlEngine: "MongoDB"
                    });
                } else {
                    setData({ status: "ERROR", database: "Hybrid", error: "Failed to fetch from API" });
                }
            } catch (err) {
                setData({ status: "ERROR", database: "Hybrid", error: "API Connection Failed. Is the backend running?" });
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, []);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, color: colors.text, padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ width: "50px", height: "50px", backgroundColor: "rgba(59,130,246,0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: colors.accent }}>
                            <Database size={30} style={{ margin: "auto" }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#F1F5F9", margin: 0 }}>Hybrid Infrastructure Dashboard</h1>
                            <p style={{ margin: "4px 0 0", color: colors.textMuted }}>PostgreSQL (SOR) + MongoDB (Live Queue)</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate("/admin/logs")}
                        style={{ backgroundColor: "rgba(249, 115, 22, 0.1)", color: "#FB923C", border: "1px solid rgba(249, 115, 22, 0.2)", padding: "10px 16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                    >
                        <Activity size={18} /> Telemetry Logs
                    </button>
                </div>

                {loading ? (
                    <p>Scanning infrastructure...</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                        {/* SQL Card */}
                        <div style={{ backgroundColor: colors.cardBg, borderRadius: "20px", padding: "24px", border: `1px solid ${colors.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Server size={18} style={{ color: colors.accent }} />
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.textBright }}>System of Record</h3>
                                </div>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", backgroundColor: "rgba(16, 185, 129, 0.1)", color: colors.success }}>{data?.sqlEngine}</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: colors.textMuted }}>Status:</span>
                                    <span style={{ fontWeight: 700, color: data?.sqlStatus === "CONNECTED" ? colors.success : colors.error }}>
                                        {data?.sqlStatus || "OFFLINE"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {data?.sqlTables?.map(table => (
                                    <div key={table} style={{ padding: "4px 10px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "6px", fontSize: "11px", color: colors.textMuted, border: "1px solid rgba(255,255,255,0.05)" }}>
                                        {table}
                                    </div>
                                ))}
                                {(!data?.sqlTables || data.sqlTables.length === 0) && <p style={{ fontSize: "12px", opacity: 0.5 }}>No SQL tables detected.</p>}
                            </div>
                        </div>

                        {/* NoSQL Card */}
                        <div style={{ backgroundColor: colors.cardBg, borderRadius: "20px", padding: "24px", border: `1px solid ${colors.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <TableIcon size={18} style={{ color: colors.accent }} />
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.textBright }}>Live Appointment Hub</h3>
                                </div>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", backgroundColor: "rgba(59, 130, 246, 0.1)", color: colors.accent }}>{data?.noSqlEngine}</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: colors.textMuted }}>Status:</span>
                                    <span style={{ fontWeight: 700, color: data?.noSqlStatus === "CONNECTED" ? colors.success : colors.error }}>
                                        {data?.noSqlStatus || "OFFLINE"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {data?.noSqlCollections?.map(coll => (
                                    <div key={coll} style={{ padding: "4px 10px", backgroundColor: "rgba(59, 130, 246, 0.05)", borderRadius: "6px", fontSize: "11px", color: colors.accent, border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                                        {coll}
                                    </div>
                                ))}
                                {(!data?.noSqlCollections || data.noSqlCollections.length === 0) && <p style={{ fontSize: "12px", opacity: 0.5 }}>No NoSQL collections detected.</p>}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: "40px", padding: "24px", backgroundColor: "rgba(59,130,246,0.05)", borderRadius: "20px", border: `1px solid ${colors.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <ShieldCheck size={18} style={{ color: colors.accent }} />
                        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: colors.textBright }}>Secure Access</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted, lineHeight: "1.6" }}>
                        This is a restricted view for higher-level system monitoring. All database queries are logged for auditing purposes.
                    </p>
                </div>
            </div>
        </div>
    );
}
