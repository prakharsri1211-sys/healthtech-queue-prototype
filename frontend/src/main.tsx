  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  const originalFetch = window.fetch;

  // Extracted to keep the fetch interceptor CC ≤ 15
  const injectAuthToken = (input: RequestInfo | URL, init?: RequestInit): { input: RequestInfo | URL; init: RequestInit } | null => {
      let url: RequestInfo | URL = input;
      if (input instanceof Request) url = input.url;

      const urlStr = typeof url === 'string' ? url : url.toString();
      const isApiRequest = urlStr.includes('/api/') || urlStr.startsWith('/api/');
      const isAuthRequest = urlStr.includes('/api/auth/');
      if (!isApiRequest || isAuthRequest) return null;

      const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (!userStr) return null;

      try {
          const user = JSON.parse(userStr);
          if (!user.token) return null;
          const newInit = { ...(init || {}), headers: { ...(init?.headers || {}), 'Authorization': `Bearer ${user.token}` } };
          return { input, init: newInit };
      } catch (e) {
          console.error('Error parsing user token', e);
          return null;
      }
  };

  window.fetch = async (input, init) => {
      const injected = injectAuthToken(input, init);
      if (injected) {
          if (input instanceof Request) return originalFetch(new Request(input, injected.init));
          return originalFetch(injected.input, injected.init);
      }
      return originalFetch(input, init);
  };

  // Prevent mouse wheel from changing input values (e.g. number fields)
  document.addEventListener("wheel", function (event) {
      if (document.activeElement && document.activeElement.tagName === "INPUT") {
          const activeInput = document.activeElement as HTMLInputElement;
          if (activeInput.type === "number") {
              activeInput.blur();
          }
      }
  }, { passive: true });

  // Explicitly register the Service Worker for PWABuilder detection
  if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
              .then(registration => {
                  console.log('SW registered: ', registration);
              }).catch(registrationError => {
                  console.log('SW registration failed: ', registrationError);
              });
      });
  }

  // Global Telemetry Error Handlers
  const API_URL = import.meta.env.VITE_API_URL || "https://online-queue-project.onrender.com";

  window.onerror = function (message, source, lineno, colno, error) {
      try {
          const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
          const userId = userStr ? JSON.parse(userStr)?.user?.id || JSON.parse(userStr)?.id : null;
          
          fetch(`${API_URL}/api/telemetry/error`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  message: typeof message === 'string' ? message : JSON.stringify(message),
                  stackTrace: error?.stack || `${source}:${lineno}:${colno}`,
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  userId: userId
              })
          }).catch(e => console.error("Telemetry failed", e));
      } catch(e) { /* ignore */ }
  };

  window.addEventListener("unhandledrejection", (event) => {
      try {
          const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
          const userId = userStr ? JSON.parse(userStr)?.user?.id || JSON.parse(userStr)?.id : null;
          
          fetch(`${API_URL}/api/telemetry/error`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  message: event.reason?.message || "Unhandled Promise Rejection",
                  stackTrace: event.reason?.stack || String(event.reason),
                  url: window.location.href,
                  userAgent: navigator.userAgent,
                  userId: userId
              })
          }).catch(e => console.error("Telemetry failed", e));
      } catch(e) { /* ignore */ }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  