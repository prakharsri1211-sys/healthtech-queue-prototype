import React, { useState, useEffect } from "react";
import { Calendar as LucideCalendar } from "lucide-react";
import { useNavigate } from "react-router";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";

interface Availability {
  date: string; // YYYY-MM-DD
  isOpen: boolean;
}

export default function DoctorScheduleView() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const colors = {
    bg: "#F0FDFA", // Light teal background
    cardBg: "#FFFFFF",
    text: "#1E293B",
    textMuted: "#64748B",
    textBright: "#0D9488", // Bright teal for accents
    accent: "#0D9488",
    danger: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    border: "rgba(13,148,136,0.1)",
  };

  useEffect(() => {
    document.body.style.background = colors.bg;
    return () => {
      document.body.style.background = "";
    };
  }, [colors.bg]);

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const storedAvailability = localStorage.getItem("doctorAvailability");
      if (storedAvailability) {
        setAvailability(JSON.parse(storedAvailability));
      } else {
        setMessage("Doctor availability not set yet. Please check back later.");
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      setMessage("Failed to load doctor's schedule.");
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDayAvailability = (date: Date): boolean => {
    const dateString = format(date, "yyyy-MM-dd");
    return availability.find((entry) => entry.date === dateString)?.isOpen ?? false;
  };

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        minHeight: "100vh",
        color: colors.text,
        padding: "20px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: colors.cardBg,
          backdropFilter: "blur(10px)",
          padding: "15px 20px",
          borderBottom: `1px solid ${colors.border}`,
          zIndex: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => navigate("/patient-selector")}
          style={{
            background: "none",
            border: "none",
            color: colors.textBright,
            fontSize: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LucideCalendar size={20} />
          <span style={{ fontWeight: 600 }}>Doctor's Schedule</span>
        </button>
      </div>

      <div style={{ maxWidth: "800px", margin: "20px auto", paddingBottom: "100px" }}>
        {message && (
          <div style={{ backgroundColor: colors.accent, color: "white", padding: "10px", borderRadius: "8px", marginBottom: "20px", textAlign: "center" }}>
            {message}
          </div>
        )}

        {/* Calendar Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            padding: "10px 0",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <button onClick={handlePreviousMonth} style={{ background: "none", border: "none", color: colors.textBright, cursor: "pointer", fontSize: "24px" }}>
            &lt;
          </button>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: colors.textBright }}>
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button onClick={handleNextMonth} style={{ background: "none", border: "none", color: colors.textBright, cursor: "pointer", fontSize: "24px" }}>
            &gt;
          </button>
        </div>

        {/* Weekday Headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px", marginBottom: "10px", textAlign: "center", fontWeight: 600, color: colors.textMuted }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px" }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px 0", color: colors.textMuted }}>Loading schedule...</div>
          ) : (
            daysInMonth.map((day, index) => {
              const dayString = format(day, "d");
              const isDayOpen = getDayAvailability(day);
              const isDayToday = isToday(day);

              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: isDayOpen ? colors.success : colors.cardBg,
                    color: isDayOpen ? "white" : colors.text,
                    borderRadius: "8px",
                    padding: "15px 0",
                    aspectRatio: "1 / 1",
                    border: `1px solid ${isDayToday ? colors.accent : colors.border}`,
                    cursor: "default",
                    fontSize: "16px",
                    fontWeight: 700,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s, border-color 0.2s",
                    opacity: isDayOpen ? 1 : 0.6,
                  }}
                >
                  {dayString}
                  <span style={{ fontSize: "10px", fontWeight: 500, marginTop: "5px" }}>
                    {isDayOpen ? "Open" : "Closed"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
