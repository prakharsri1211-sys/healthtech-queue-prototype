import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Settings, ChevronRight, XCircle } from "lucide-react";

export default function DeveloperMenu() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isDev = import.meta.env.DEV;

  if (!isDev) return null;

  const devRoutes = [
    { label: "Home", path: "/" },
    { label: "Medical Profile", path: "/medical-profile" },
    { label: "Booking", path: "/booking" },
    { label: "Tracker", path: "/tracker" },
    { label: "Check-In", path: "/check-in" },
    { label: "Mediator", path: "/mediator" },
    { label: "Mediator Login", path: "/mediator/login" },
    { label: "Doctor", path: "/doctor" },
    { label: "Doctor Dashboard", path: "/doctor/dashboard" },
    { label: "Doctor Balance", path: "/doctor-balance" },
    { label: "Doctor Profile", path: "/doctor-profile" },
    { label: "Setup Clinic", path: "/setup-clinic" },
    { label: "Tracker", path: "/tracker" },
  ];

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50" style={{ width: isOpen ? "280px" : "0", transition: "width 0.3s" }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-0 top-4 -translate-x-full w-12 h-12 rounded-l-lg flex items-center justify-center"
        style={{ backgroundColor: "var(--navy-blue)" }}
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div
          className="h-full flex flex-col overflow-hidden shadow-lg"
          style={{ backgroundColor: "var(--navy-blue)" }}
        >
          {/* Header */}
          <div className="px-4 py-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
            <h2 className="text-sm font-bold text-white">Dev Menu</h2>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded p-1">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Routes List */}
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
            {devRoutes.map((route, idx) => (
              <button
                key={idx}
                onClick={() => {
                  navigate(route.path);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 flex items-center justify-between transition"
              >
                {route.label}
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t text-xs text-white/70" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
            Development Mode
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/30 -z-10"
          onClick={() => setIsOpen(false)}
          style={{ left: "-100vw" }}
        ></div>
      )}
    </div>
  );
}
