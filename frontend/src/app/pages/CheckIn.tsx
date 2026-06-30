import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, Clock, AlertCircle, Crown, Zap } from "lucide-react";
import LateFeeNotification from "../components/LateFeeNotification";

export default function CheckIn() {
  const navigate = useNavigate();
  const [bookingInfo, setBookingInfo] = useState<any>(null);
  const [checkInStatus, setCheckInStatus] = useState<"pending" | "grace" | "late" | "success">("pending");
  const [graceTimeRemaining, setGraceTimeRemaining] = useState(300); // 5 minutes in seconds
  const [showLateFee, setShowLateFee] = useState(false);
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    // Load booking info
    const info = localStorage.getItem("bookingInfo");
    if (info) {
      const parsed = JSON.parse(info);
      setBookingInfo(parsed);
      
      // Check if patient is late based on scheduled time (for premium users)
      if (parsed.tier === "premium" && parsed.time !== "Current Queue") {
        const now = new Date();
        const scheduledTime = parseScheduledTime(parsed.time);
        
        if (scheduledTime && now > scheduledTime) {
          setIsLate(true);
        }
      }
    }

    // Check if mediator called the patient
    const checkMediatorCall = setInterval(() => {
      const calledStatus = localStorage.getItem("patientCalledStatus");
      if (calledStatus === "success") {
        setCheckInStatus("success");
        localStorage.removeItem("patientCalledStatus");
        clearInterval(checkMediatorCall);
      }
    }, 500);

    return () => {
      clearInterval(checkMediatorCall);
    };
  }, []);

  useEffect(() => {
    if (checkInStatus === "grace" && graceTimeRemaining > 0) {
      const interval = setInterval(() => {
        setGraceTimeRemaining((prev) => {
          if (prev <= 1) {
            setCheckInStatus("late");
            setShowLateFee(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [checkInStatus, graceTimeRemaining]);

  const parseScheduledTime = (timeStr: string): Date | null => {
    if (!timeStr || timeStr === "Current Queue") return null;
    
    const now = new Date();
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 = hours + 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour24, minutes || 0, 0, 0);
    
    return scheduledTime;
  };

  const handleCheckIn = () => {
    if (isLate && bookingInfo?.tier === "premium") {
      // Premium user is late, start grace period
      setCheckInStatus("grace");
    } else {
      // User is on time or free tier
      setCheckInStatus("success");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleGraceCheckIn = () => {
    setCheckInStatus("success");
  };

  const getTierBadge = () => {
    if (!bookingInfo) return null;
    
    if (bookingInfo.tier === "premium") {
      return (
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-full">
          <Crown className="w-5 h-5" />
          <span>Premium</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full">
        <Zap className="w-5 h-5" />
        <span>Free Queue</span>
      </div>
    );
  };

  if (!bookingInfo) return null;

  if (checkInStatus === "success") {
    const bgGradient = bookingInfo.tier === "premium" 
      ? "from-yellow-50 to-amber-50" 
      : "from-blue-50 to-blue-100";

    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4 flex items-center justify-center`}>
        <div className="max-w-md mx-auto text-center">
          {getTierBadge()}
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-6 bg-green-100 mt-6">
            <CheckCircle className="w-20 h-20 text-green-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl mb-4 text-green-600">
            Check-In Successful!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Token #{bookingInfo.tokenNumber}
          </p>
          <p className="text-lg text-gray-600 mb-8">
            Please proceed to the waiting area. You'll be called shortly.
          </p>
          <button
            onClick={() => navigate("/tracker")}
            className="px-8 py-4 rounded-2xl bg-white text-gray-700 text-lg hover:shadow-md transition-all"
          >
            Back to Tracker
          </button>
        </div>
      </div>
    );
  }

  if (checkInStatus === "grace") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="max-w-md mx-auto pt-12">
          {/* Grace Period Header */}
          <div className="text-center mb-8">
            {getTierBadge()}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-orange-100 animate-pulse mt-4">
              <Clock className="w-14 h-14 text-orange-600" />
            </div>
            <h1 className="text-3xl mb-2 text-orange-600">
              Grace Period Active
            </h1>
            <p className="text-lg text-gray-600">
              Your scheduled time was {bookingInfo.time}
            </p>
            <p className="text-gray-600">
              Please check in within:
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="bg-white rounded-3xl p-12 mb-6 shadow-2xl border-4 border-orange-400">
            <div className="text-center">
              <div className="text-8xl text-orange-600 mb-4">
                {formatTime(graceTimeRemaining)}
              </div>
              <p className="text-xl text-gray-600">minutes remaining</p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-orange-100 rounded-2xl p-6 mb-6 border-2 border-orange-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-lg text-gray-800 mb-2">
                  Premium Grace Period
                </p>
                <p className="text-gray-600 mb-2">
                  Your 5-minute grace period started at {bookingInfo.time}.
                </p>
                <p className="text-gray-600">
                  A late fee of $25 will be applied if you don't check in within this window.
                </p>
              </div>
            </div>
          </div>

          {/* Check In Button */}
          <button
            onClick={handleGraceCheckIn}
            className="w-full p-6 rounded-2xl text-white text-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 bg-orange-600"
          >
            I AM HERE - Check In Now
          </button>
        </div>
      </div>
    );
  }

  const bgGradient = bookingInfo.tier === "premium" 
    ? "from-yellow-50 to-amber-50" 
    : "from-blue-50 to-blue-100";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4`}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-6">
          <h1 className="text-2xl" style={{ color: 'var(--medical-teal)' }}>
            Arrival Check-In
          </h1>
          <button
            onClick={() => navigate("/tracker")}
            className="px-4 py-2 rounded-xl bg-white text-gray-700 hover:shadow-md transition-all"
          >
            Back
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-lg">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ backgroundColor: 'var(--medical-teal)' }}
            >
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl mb-4" style={{ color: 'var(--comforting-purple)' }}>
              Welcome to the Clinic
            </h2>
            <div className="mb-4">
              {getTierBadge()}
            </div>
            <p className="text-lg text-gray-600">
              Please confirm your arrival by tapping the button below.
            </p>
          </div>

          {/* Status Info */}
          <div 
            className={`rounded-2xl p-6 border-2 ${
              bookingInfo.tier === "premium" 
                ? "bg-yellow-50 border-yellow-300" 
                : "bg-blue-50 border-blue-300"
            }`}
          >
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-gray-600 mb-1">Your Token</p>
                <p 
                  className={`text-3xl ${
                    bookingInfo.tier === "premium" ? "text-yellow-600" : "text-blue-600"
                  }`}
                >
                  #{bookingInfo.tokenNumber}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">
                  {bookingInfo.tier === "premium" ? "Scheduled" : "Queue"}
                </p>
                <p className="text-xl text-gray-800">{bookingInfo.time}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Late Warning (if applicable for Premium) */}
        {isLate && bookingInfo.tier === "premium" && (
          <div className="bg-yellow-50 rounded-2xl p-6 mb-6 border-2 border-yellow-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-lg text-gray-800 mb-1">
                  You're past your scheduled time
                </p>
                <p className="text-gray-600">
                  A 5-minute grace period will begin when you check in. Grace period starts from {bookingInfo.time}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* On Time Notice (for Premium) */}
        {!isLate && bookingInfo.tier === "premium" && (
          <div className="bg-green-50 rounded-2xl p-6 mb-6 border-2 border-green-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="text-lg text-gray-800 mb-1">
                  You're on time!
                </p>
                <p className="text-gray-600">
                  Check in now to confirm your arrival. No late fees will apply.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* I AM HERE Button */}
        <button
          onClick={handleCheckIn}
          className={`w-full p-6 sm:p-8 rounded-3xl text-white shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105 ${
            bookingInfo.tier === "premium"
              ? "bg-gradient-to-r from-yellow-400 to-amber-500"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          }`}
        >
          <div className="text-center">
            <div className="text-3xl sm:text-4xl mb-2">✓</div>
            <div className="text-2xl sm:text-3xl">I AM HERE</div>
          </div>
        </button>

        {/* Info Text */}
        <p className="text-center text-gray-500 mt-6 text-lg">
          Tap the button when you arrive at the clinic
        </p>
      </div>

      {/* Late Fee Notification */}
      <LateFeeNotification
        isOpen={showLateFee}
        onClose={() => {
          setShowLateFee(false);
          navigate("/tracker");
        }}
      />
    </div>
  );
}
