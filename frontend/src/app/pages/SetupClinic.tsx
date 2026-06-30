import React from "react";
import { useNavigate } from "react-router";
import { Settings, Stethoscope, Users, Wallet, Home, ChevronRight } from "lucide-react";

export default function SetupClinic() {
  const navigate = useNavigate();

  const setupSteps = [
    {
      icon: Stethoscope,
      title: "Doctor Setup",
      description: "Register doctor profile & clinic details",
      action: "/doctor-profile",
    },
    {
      icon: Users,
      title: "Mediator Access",
      description: "Login to queue management system",
      action: "/mediator/login",
    },
    {
      icon: Wallet,
      title: "Financial Settings",
      description: "Configure fees & payment schedules",
      action: "/doctor-balance",
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--off-white)" }}>
      {/* Header */}
      <div
        className="px-6 py-6 sticky top-0 z-10"
        style={{ backgroundColor: "var(--navy-blue)" }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <div>
              <h1 className="text-xl text-white mb-1">Clinic Setup</h1>
              <p className="text-sm" style={{ color: "var(--slate-lighter)" }}>
                Configure your health-tech system
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-md mx-auto">
          {/* Introduction */}
          <div
            className="bg-white rounded-2xl p-6 mb-6"
            style={{ border: "1px solid var(--border-color)" }}
          >
            <h2 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Welcome to Health-Tech Prototype
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Follow the steps below to set up your clinic and get started with the queue management system.
            </p>
          </div>

          {/* Setup Steps */}
          <div className="space-y-3 mb-6">
            {setupSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-4 flex items-start justify-between cursor-pointer hover:shadow-md transition"
                  style={{ border: "1px solid var(--border-color)" }}
                  onClick={() => navigate(step.action)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "var(--navy-blue)" }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {step.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: "var(--slate-gray)" }} />
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-2xl text-white font-medium shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: "var(--navy-blue)" }}
          >
            Start Patient Access
          </button>

          <button
            onClick={() => navigate("/mediator")}
            className="w-full mt-2 py-2 rounded-2xl text-sm font-medium transition-all"
            style={{
              backgroundColor: "var(--clean-white)",
              color: "var(--navy-blue)",
              border: "1px solid var(--navy-blue)",
            }}
          >
            Skip to Mediator Queue
          </button>
        </div>
      </div>
    </div>
  );
}
