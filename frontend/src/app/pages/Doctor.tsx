import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Stethoscope, Phone, DollarSign, User, Bell, ChevronRight, PlayCircle, StopCircle } from "lucide-react";

interface Patient {
  tokenNumber: number;
  name: string;
  age: number;
  gender: string;
  symptoms?: string;
  appointmentTime: string;
  tier: "premium" | "free";
  status: "ready" | "in-session" | "completed";
}

export default function Doctor() {
  const navigate = useNavigate();
  const [currentPatient, setCurrentPatient] = useState<Patient>({
    tokenNumber: 38,
    name: "Ramesh Gupta",
    age: 72,
    gender: "Male",
    symptoms: "Chest pain, shortness of breath",
    appointmentTime: "10:00 AM",
    tier: "premium",
    status: "ready",
  });

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [emergencyAlert, setEmergencyAlert] = useState<any>(null);

  const [waitingPatients] = useState([
    { tokenNumber: 12, name: "Priya Sharma", appointmentTime: "10:30 AM" },
    { tokenNumber: 15, name: "Sunita Devi", appointmentTime: "11:00 AM" },
    { tokenNumber: 42, name: "Amit Patel", appointmentTime: "Token Queue" },
  ]);

  useEffect(() => {
    const checkEmergency = setInterval(() => {
      const alert = localStorage.getItem("emergencyAlert");
      if (alert) {
        setEmergencyAlert(JSON.parse(alert));
        localStorage.removeItem("emergencyAlert");
        setTimeout(() => setEmergencyAlert(null), 5000);
      }
    }, 500);

    return () => clearInterval(checkEmergency);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  const handleCallNext = () => {
    if (waitingPatients.length > 0) {
      const nextPatient = waitingPatients[0];
      setCurrentPatient({
        tokenNumber: nextPatient.tokenNumber,
        name: nextPatient.name,
        age: 45,
        gender: "Female",
        symptoms: "Fever, body ache",
        appointmentTime: nextPatient.appointmentTime,
        tier: "premium",
        status: "ready",
      });
      setSessionDuration(0);
    }
  };

  const handleStartSession = () => {
    setSessionActive(true);
    setCurrentPatient((prev) => ({ ...prev, status: "in-session" }));
  };

  const handleEndSession = () => {
    setSessionActive(false);
    setCurrentPatient((prev) => ({ ...prev, status: "completed" }));
    setTimeout(() => handleCallNext(), 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--off-white)" }}>
      {/* Header */}
      <div 
        className="px-6 py-6 sticky top-0 z-10"
        style={{ backgroundColor: "var(--navy-blue)" }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl text-white mb-1">Consultation</h1>
              <p className="text-sm" style={{ color: "var(--slate-lighter)" }}>
                Dr. Rajesh Mehta
              </p>
            </div>
            <button
              onClick={() => navigate("/doctor-profile")}
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <User className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Revenue Balance Tab */}
          <button
            onClick={() => navigate("/doctor-balance")}
            className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--success-green)" }}
          >
            <DollarSign className="w-5 h-5" />
            Revenue Balance
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-md mx-auto">
          {/* Emergency Alert */}
          {emergencyAlert && (
            <div 
              className="rounded-xl p-4 mb-4 animate-pulse"
              style={{ backgroundColor: "var(--error-red)" }}
            >
              <div className="flex items-center gap-3 text-white">
                <Bell className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Emergency Alert!</p>
                  <p className="text-sm opacity-90">Outside Cabin - Immediate attention required</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Patient Card */}
          {currentPatient.status !== "completed" ? (
            <div 
              className="bg-white rounded-2xl p-6 mb-4"
              style={{ border: "1px solid var(--border-color)" }}
            >
              {/* PATIENT NAME AS PRIMARY HEADER */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  {currentPatient.name}
                </h2>
                <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>#{currentPatient.tokenNumber}</span>
                  <span>•</span>
                  <span>{currentPatient.age} yrs</span>
                  <span>•</span>
                  <span>{currentPatient.gender}</span>
                </div>
              </div>

              <div className="divider mb-4"></div>

              {/* Session Status */}
              {sessionActive && (
                <div 
                  className="rounded-lg p-3 mb-4 flex items-center justify-between"
                  style={{ backgroundColor: "var(--success-light)" }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: "var(--success-green)" }}
                    ></div>
                    <span className="text-sm font-medium" style={{ color: "var(--success-green)" }}>
                      Session Active
                    </span>
                  </div>
                  <span className="text-lg font-bold" style={{ color: "var(--success-green)" }}>
                    {formatDuration(sessionDuration)}
                  </span>
                </div>
              )}

              {/* Patient Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Time:</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {currentPatient.appointmentTime}
                  </span>
                </div>
                {currentPatient.symptoms && (
                  <div className="flex items-start justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>Symptoms:</span>
                    <span className="text-right max-w-[200px]" style={{ color: "var(--text-primary)" }}>
                      {currentPatient.symptoms}
                    </span>
                  </div>
                )}
              </div>

              <div className="divider mb-4"></div>

              {/* Session Controls */}
              <div className="space-y-2">
                {!sessionActive ? (
                  <button
                    onClick={handleStartSession}
                    className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: "var(--navy-blue)" }}
                  >
                    <PlayCircle className="w-5 h-5" />
                    Start Session
                  </button>
                ) : (
                  <button
                    onClick={handleEndSession}
                    className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                    style={{ backgroundColor: "var(--error-red)" }}
                  >
                    <StopCircle className="w-5 h-5" />
                    End Session
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div 
              className="bg-white rounded-2xl p-6 mb-4"
              style={{ backgroundColor: "var(--success-light)", border: "1px solid var(--success-green)" }}
            >
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: "var(--success-green)" }}
                >
                  <span className="text-3xl text-white">✓</span>
                </div>
                <h3 className="text-xl font-bold mb-1" style={{ color: "var(--success-green)" }}>
                  Session Completed
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading next patient...
                </p>
              </div>
            </div>
          )}

          {/* Ready Patients List */}
          <div 
            className="bg-white rounded-2xl p-5 mb-4"
            style={{ border: "1px solid var(--border-color)" }}
          >
            <h3 className="font-semibold mb-4 flex items-center justify-between" style={{ color: "var(--text-primary)" }}>
              <span className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Ready Patients
              </span>
              <span 
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: "var(--slate-bg)", color: "var(--text-secondary)" }}
              >
                {waitingPatients.length}
              </span>
            </h3>

            <div className="space-y-2 mb-4">
              {waitingPatients.map((patient, index) => (
                <div
                  key={patient.tokenNumber}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: index === 0 ? "var(--success-light)" : "var(--slate-bg)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: "var(--navy-blue)" }}
                    >
                      #{patient.tokenNumber}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {patient.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {patient.appointmentTime}
                      </p>
                    </div>
                  </div>
                  {index === 0 && (
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "var(--success-green)", color: "white" }}
                    >
                      Next
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* CALL NEXT Button */}
            <button
              onClick={handleCallNext}
              disabled={currentPatient.status === "in-session"}
              className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: "var(--navy-blue)" }}
            >
              <Phone className="w-5 h-5" />
              Call Next Patient
            </button>
          </div>

          {/* Navigation */}
          <div className="space-y-2">
            <div className="divider"></div>
            <button
              onClick={() => navigate("/mediator")}
              className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--navy-blue)" }}
            >
              Switch to Mediator View
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: "var(--clean-white)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
            >
              Patient View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
