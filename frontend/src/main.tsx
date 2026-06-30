  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
      let url = input;
      if (input instanceof Request) {
          url = input.url;
      }
      
      const isApiRequest = typeof url === 'string' && (url.includes('/api/') || url.startsWith('/api/'));
      const isAuthRequest = typeof url === 'string' && url.includes('/api/auth/');
      
      if (isApiRequest && !isAuthRequest) {
          const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
          if (userStr) {
              try {
                  const user = JSON.parse(userStr);
                  if (user.token) {
                      const newInit = { ...(init || {}) };
                      newInit.headers = {
                          ...(newInit.headers || {}),
                          'Authorization': `Bearer ${user.token}`
                      };
                      if (input instanceof Request) {
                          const newReq = new Request(input, newInit);
                          return originalFetch(newReq);
                      }
                      return originalFetch(input, newInit);
                  }
              } catch (e) {
                  console.error('Error parsing user token', e);
              }
          }
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
  