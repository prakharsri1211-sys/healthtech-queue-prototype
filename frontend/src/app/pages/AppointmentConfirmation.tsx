import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Clock, MapPin, Stethoscope, Pill, ChevronDown, User } from "lucide-react";

interface ClinicDetails {
  doctorName: string;
  speciality: string;
  clinicAddress: string;
  pharmacy: string;
  wheelchairAccess: boolean;
  startTime: string;
  endTime: string;
}

interface Patient {
  id: number;
  name: string;
  age: number;
  aadharOrAbhaId: string;
}

export default function AppointmentConfirmation() {
  const navigate = useNavigate();
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicDetails, setClinicDetails] = useState<ClinicDetails | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const info = localStorage.getItem("bookingInfo");
    const selectedPatient = sessionStorage.getItem("selectedPatient");
    
    if (!info) {
      navigate("/booking");
      return;
    }

    const parsed = JSON.parse(info);
    setBookingInfo(parsed);
    
    if (selectedPatient) {
      setPatient(JSON.parse(selectedPatient));
    }

    // Fetch clinic details
    const api = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
    const userStr = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = userStr ? JSON.parse(userStr) : null;
    const token = u?.token;

    if (parsed.doctorId) {
      fetch(`${api}/api/doctor/${parsed.doctorId}/clinic-details`, {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      })
        .then((r) => r.json())
        .then(setClinicDetails)
        .catch(() => {
          setClinicDetails({
            doctorName: "Dr. Rajesh Kumar",
            speciality: "General Medicine",
            clinicAddress: "123 Medical Plaza, City Center, New Delhi",
            pharmacy: "Yes",
            wheelchairAccess: true,
            startTime: "",
            endTime: "",
          });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (!bookingInfo) return;
    const eta = bookingInfo.eta_minutes || bookingInfo.etaMinutes || 30;
    setCountdown(eta * 60); // in seconds

    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [bookingInfo]);

  if (loading || !bookingInfo) return <div className="text-center py-10">Loading...</div>;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F2F5" }}>
      {/* Header */}
      <div
        className="px-6 py-6 sticky top-0 z-10"
        style={{ backgroundColor: "#1E293B" }}
      >
        <div className="max-w-md mx-auto">
          <h1 className="text-xl text-white mb-1">Appointment Confirmed</h1>
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            Your booking is confirmed
          </p>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Countdown Timer */}
          {/* Time to Arrive — centered green box, max-width 500px */}
          <div
            className="rounded-2xl p-6 text-center mx-auto"
            style={{
              backgroundColor: "#009432",
              border: "2px solid #009432",
              maxWidth: "500px",
              width: "100%",
            }}
          >
            <p className="text-sm text-white mb-2">Time to Arrive</p>
            <div className="text-5xl font-bold text-white mb-2">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>
            <p className="text-xs text-white opacity-90">Minutes until your scheduled time</p>
          </div>

          {/* Appointment Details */}
          {/* Glassmorphism detail container */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid #DFE6E9",
              boxShadow: "0 8px 32px rgba(31, 38, 135, 0.07)",
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: "#2D3436" }}>
              Appointment Details
            </h3>
            <div className="space-y-3">
              {patient && (
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 mt-0.5" style={{ color: "#1E293B" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#2D3436" }}>
                      Patient Name
                    </p>
                    <p className="font-medium" style={{ color: "#2D3436" }}>
                      {patient.name} (Age: {patient.age})
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 mt-0.5" style={{ color: "#1E293B" }} />
                <div>
                  <p className="text-xs" style={{ color: "#2D3436" }}>
                    Date & Time
                  </p>
                  <p className="font-medium text-slate-800">
                    {bookingInfo.date} at {bookingInfo.time || "10:00"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Stethoscope className="w-5 h-5 mt-0.5" style={{ color: "#B8860B" }} />
                <div>
                  <p className="text-xs" style={{ color: "#2D3436" }}>
                    Doctor / Speciality
                  </p>
                  <p className="font-medium" style={{ color: "#2D3436" }}>
                    {clinicDetails?.doctorName || "Loading..."} ({clinicDetails?.speciality})
                  </p>
                </div>
              </div>

              {bookingInfo.tokenNumber && (
                <div className="flex items-start gap-3">
                  <span className="text-xl font-bold" style={{ color: "#1E293B" }}>
                    #
                  </span>
                  <div>
                    <p className="text-xs" style={{ color: "#2D3436" }}>
                      Token Number
                    </p>
                    <p className="font-medium" style={{ color: "#2D3436" }}>
                      {bookingInfo.tokenNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clinic Details — Glassmorphism clinic detail container */}
          {clinicDetails && (
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255, 255, 255, 0.8)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid #DFE6E9",
                boxShadow: "0 8px 32px rgba(31, 38, 135, 0.07)",
              }}
            >
              <h3 className="font-semibold mb-4" style={{ color: "#2D3436" }}>
                Clinic Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5" style={{ color: "#1E293B" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#2D3436" }}>
                      Address
                    </p>
                    <p className="font-medium" style={{ color: "#2D3436" }}>
                      {clinicDetails.clinicAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Pill className="w-5 h-5 mt-0.5" style={{ color: "#009432" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#2D3436" }}>
                      On-site Pharmacy
                    </p>
                    <p className="font-medium" style={{ color: "#2D3436" }}>
                      {clinicDetails.pharmacy}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5" style={{ color: "#1E293B", fontSize: 18 }}>
                    ♿
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "#2D3436" }}>
                      Wheelchair Accessibility
                    </p>
                    <p className="font-medium" style={{ color: "#2D3436" }}>
                      {clinicDetails.wheelchairAccess ? "✓ Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={() => navigate("/tracker")}
            className="w-full py-3 rounded-lg text-white font-medium"
            style={{ backgroundColor: "#1E293B" }}
          >
            Track Appointment
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: "#FFFFFF",
              color: "#636E72",
              border: "1px solid #DFE6E9",
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
