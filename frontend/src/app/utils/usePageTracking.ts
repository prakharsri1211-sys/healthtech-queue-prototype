import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export function usePageTracking() {
    const location = useLocation();
    const lastTrackedUrl = useRef<string | null>(null);

    useEffect(() => {
        const currentUrl = window.location.href;
        
        // Prevent duplicate tracking if URL hasn't actually changed
        if (lastTrackedUrl.current === currentUrl) return;
        lastTrackedUrl.current = currentUrl;

        try {
            const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
            const userId = userStr ? (JSON.parse(userStr)?.user?.id || JSON.parse(userStr)?.id) : null;
            
            fetch(`${API_URL}/api/telemetry/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: currentUrl,
                    userAgent: navigator.userAgent,
                    userId: userId
                })
            }).catch(e => console.error("Telemetry access tracking failed", e));
        } catch (e) {
            // ignore JSON parse errors
        }
    }, [location]);
}
