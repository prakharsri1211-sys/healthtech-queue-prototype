import { useState } from "react";
import { useNavigate } from "react-router";
import { User, Phone, CreditCard, Activity, ChevronRight } from "lucide-react";

export default function MedicalProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Mandatory
    name: "",
    age: "",
    gender: "",
    phone: "",
    adhar: "",
    
    // Optional
    symptoms: "",
    medications: "",
    abhaNumber: "",
    ayushmanCard: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("patientProfile", JSON.stringify(formData));
    navigate("/booking");
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden" style={{ backgroundColor: "var(--off-white)" }}>
      {/* Header */}
      <div 
        className="px-6 py-6 sticky top-0 z-10"
        style={{ backgroundColor: "var(--navy-blue)" }}
      >
        <div className="max-w-md mx-auto">
          <h1 className="text-xl text-white mb-1">Patient Profile</h1>
          <p className="text-sm" style={{ color: "var(--slate-lighter)" }}>
            Complete your registration
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Mandatory Section */}
          <div 
            className="bg-white rounded-2xl p-4 sm:p-6"
            style={{ border: "1px solid var(--border-color)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" style={{ color: "var(--navy-blue)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Basic Information
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1"
                  style={{ borderColor: "var(--border-color)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Age *
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleChange("age", e.target.value)}
                    placeholder="Age"
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1"
                    style={{ borderColor: "var(--border-color)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 bg-transparent"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--slate-gray)" }} />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-secondary)" }}>+91</span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      required
                      className="w-full pl-20 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1"
                      style={{ borderColor: "var(--border-color)" }}
                    />
                  </div>
                  <button type="button" className="px-4 py-2 rounded-lg text-white text-xs font-medium whitespace-nowrap transition-colors hover:opacity-90" style={{ backgroundColor: "var(--navy-blue)" }}>
                    Verify
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Adhar Number *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--slate-gray)" }} />
                    <input
                      type="text"
                      value={formData.adhar}
                      onChange={(e) => handleChange("adhar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="xxxx xxxx xxxx"
                      required
                      className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1"
                      style={{ borderColor: "var(--border-color)" }}
                    />
                  </div>
                  <button type="button" className="px-4 py-2 rounded-lg text-white text-xs font-medium whitespace-nowrap transition-colors hover:opacity-90" style={{ backgroundColor: "var(--navy-blue)" }}>
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Section */}
          <div 
            className="bg-white rounded-2xl p-4 sm:p-6"
            style={{ border: "1px solid var(--border-color)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5" style={{ color: "var(--slate-gray)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Medical Details <span className="text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>(Optional)</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Current Symptoms
                </label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => handleChange("symptoms", e.target.value)}
                  placeholder="Describe your symptoms..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 resize-none"
                  style={{ borderColor: "var(--border-color)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Current Medications
                </label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => handleChange("medications", e.target.value)}
                  placeholder="List medications..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 resize-none"
                  style={{ borderColor: "var(--border-color)" }}
                />
              </div>

              <div className="divider my-4"></div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  ABHA Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.abhaNumber}
                    onChange={(e) => handleChange("abhaNumber", e.target.value)}
                    placeholder="14-digit ABHA number"
                    maxLength={14}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 flex-1"
                    style={{ borderColor: "var(--border-color)" }}
                  />
                  <button type="button" className="px-4 py-2 rounded-lg text-white text-xs font-medium whitespace-nowrap transition-colors hover:opacity-90" style={{ backgroundColor: "var(--navy-blue)" }}>
                    Verify
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Ayushman Card Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.ayushmanCard}
                    onChange={(e) => handleChange("ayushmanCard", e.target.value)}
                    placeholder="Card number"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 flex-1"
                    style={{ borderColor: "var(--border-color)" }}
                  />
                  <button type="button" className="px-4 py-2 rounded-lg text-white text-xs font-medium whitespace-nowrap transition-colors hover:opacity-90" style={{ backgroundColor: "var(--navy-blue)" }}>
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--navy-blue)" }}
          >
            Continue to Booking
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
