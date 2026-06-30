import { DollarSign, AlertCircle } from "lucide-react";

interface LateFeeNotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LateFeeNotification({
  isOpen,
  onClose,
}: LateFeeNotificationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
            <DollarSign className="w-16 h-16 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl text-center mb-4 text-red-600">
          Late Fee Applied
        </h2>

        {/* Message */}
        <div className="bg-red-50 rounded-2xl p-6 mb-6 border-2 border-red-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-lg text-gray-800 mb-2">
                Grace period has expired
              </p>
              <p className="text-gray-600">
                You did not check in within the 5-minute grace period.
              </p>
            </div>
          </div>

          {/* Fee Amount */}
          <div className="bg-white rounded-xl p-4 border-2 border-red-300">
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-700">Late Fee:</span>
              <span className="text-3xl text-red-600">$25</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-600 text-center">
            This fee will be added to your appointment charges. Please proceed to the reception desk.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full p-5 rounded-2xl bg-gray-800 text-white text-xl shadow-lg hover:bg-gray-900 transition-all duration-200 hover:scale-105"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
