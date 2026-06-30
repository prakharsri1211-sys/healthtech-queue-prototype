import { AlertTriangle, Navigation } from "lucide-react";

interface EmergencyAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export default function EmergencyAlert({
  isOpen,
  onClose,
  onNavigate,
}: EmergencyAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
        {/* Alert Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-16 h-16 text-red-600" />
          </div>
        </div>

        {/* Alert Title */}
        <h2 className="text-3xl text-center mb-4 text-red-600">
          🚨 Emergency Priority Bump!
        </h2>

        {/* Alert Message */}
        <div className="bg-red-50 rounded-2xl p-6 mb-6 border-2 border-red-200">
          <p className="text-xl text-center text-gray-800 mb-2">
            Your turn is next!
          </p>
          <p className="text-lg text-center text-gray-600">
            Please head to the clinic immediately for check-in.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNavigate}
            className="w-full p-5 rounded-2xl bg-red-600 text-white text-xl shadow-lg hover:bg-red-700 transition-all duration-200 hover:scale-105 flex items-center justify-center gap-3"
          >
            <Navigation className="w-6 h-6" />
            Tap to Navigate
          </button>
          <button
            onClick={onClose}
            className="w-full p-4 rounded-2xl bg-gray-100 text-gray-700 text-lg hover:bg-gray-200 transition-all duration-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
