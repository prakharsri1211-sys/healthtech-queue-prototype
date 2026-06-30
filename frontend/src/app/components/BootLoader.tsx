import React, { useState, useEffect } from 'react';

const loadingPhases = [
  "Establishing secure clinical connection...",
  "Waking up health-tech servers...",
  "Initializing clinical database...",
  "Syncing real-time queue metrics...",
  "Preparing your medical dashboard..."
];

export const BootLoader = ({ onReady }: { onReady: () => void }) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // 1. Cycle through the text phases
  useEffect(() => {
    const textInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev < loadingPhases.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(textInterval);
  }, []);

  // 2. Fake progress bar
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 95 ? prev + Math.floor(Math.random() * 5) + 1 : prev));
    }, 800);
    return () => clearInterval(progressInterval);
  }, []);

  // 3. The actual Server Ping using the public endpoint!
  useEffect(() => {
    let isServerAwake = false;

    const pingServer = async () => {
      try {
        const apiBase = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";
        // CRITICAL FIX: /actuator/health is blocked by Spring Security from external IPs!
        // We use the public /api/status endpoint instead to successfully ping the server.
        const healthUrl = `${apiBase}/api/status`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(healthUrl, { 
            signal: controller.signal,
            headers: { "Accept": "application/json" }
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          isServerAwake = true;
          setProgress(100);
          setTimeout(() => {
            onReady();
          }, 800); 
        }
      } catch (error) {
        console.log("Server is still waking up...");
      }
    };

    pingServer();
    const pingInterval = setInterval(() => {
      if (!isServerAwake) pingServer();
    }, 5000);

    return () => clearInterval(pingInterval);
  }, [onReady]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-6 sm:p-8 overflow-x-hidden relative">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[100px] rounded-full mix-blend-multiply animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 blur-[100px] rounded-full mix-blend-multiply animate-blob animation-delay-2000" />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-2xl p-6 sm:p-10 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 relative z-10">
        
        {/* Heartbeat/EKG Icon Animation */}
        <div className="relative mb-8 flex justify-center mt-2">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <div className="h-24 w-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/40 flex items-center justify-center transform hover:scale-105 transition-transform duration-500 ring-4 ring-white/80">
            <svg className="w-12 h-12 text-white animate-[pulse_1.5s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-800 text-center mb-4">
          System Boot Sequence
        </h2>
        
        <div className="h-8 flex items-center justify-center">
          <p className="text-xs sm:text-sm font-semibold text-blue-600/80 animate-pulse text-center">
            {loadingPhases[phaseIndex]}
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="mt-8 relative">
          <div className="w-full bg-gray-200/50 rounded-full h-4 overflow-hidden backdrop-blur-sm p-0.5 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 h-full rounded-full transition-all duration-700 ease-out relative bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]" 
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_1s_linear_infinite]" />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 px-1">
            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Status: Waking Server</span>
            <span className="text-xs font-black text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-lg border border-indigo-200/50">{progress}%</span>
          </div>
        </div>
        
        {/* Fake Terminal Logs */}
        <div className="mt-10 p-4 bg-[#0a0f1c] rounded-xl shadow-inner overflow-hidden h-24 text-left relative border border-gray-800">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-[#0a0f1c] z-10 pointer-events-none"/>
            <div className="flex flex-col justify-end h-full font-mono text-[11px] text-emerald-400 opacity-90 pb-2">
                <p className="text-gray-500">&gt; SYSTEM ENGINES: OK</p>
                <p className="text-gray-500">&gt; NODE_ENV: production</p>
                <p>&gt; pinging remote cluster...</p>
                <p>&gt; {loadingPhases[phaseIndex].toLowerCase()}</p>
                <p className="animate-pulse">&gt; _</p>
            </div>
        </div>

      </div>
      
      {/* Required Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: 20px 0; }
          100% { background-position: 0 0; }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}} />
    </div>
  );
};
