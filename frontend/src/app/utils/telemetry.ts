export const reportTelemetryError = async (message: string, stackTrace?: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";
      const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr)?.user?.id || JSON.parse(userStr)?.id : null;
      
      await fetch(`${API_URL}/api/telemetry/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              message,
              stackTrace: stackTrace || new Error().stack || "No stack trace",
              url: window.location.href,
              userAgent: navigator.userAgent,
              userId: userId || "UNAUTHENTICATED"
          })
      });
    } catch(e) { 
        console.error("Failed to push telemetry log", e);
    }
};
