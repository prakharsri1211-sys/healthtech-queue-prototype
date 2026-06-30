export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return;
  }

  try {
    // Ask for permission BEFORE waiting for Service Worker. 
    // If we wait for the SW first, it hangs forever on mobile if it isn't registered yet!
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied.');
      return;
    }

    // Now safely get or register the Service Worker
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('User is already subscribed.');
      await sendSubscriptionToServer(existingSubscription);
      return;
    }

    // The VAPID Public Key from the Backend
    const publicVapidKey = 'BGufGE4bLh4BNIz253nYzhHntk6K1wSTBJ14P1Iwrwky3UHomEUTzZgwLgpSiPrD8DQlQBEFP5uyS4rv_IcFDRA';
    const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('Push Subscription successful');
    await sendSubscriptionToServer(subscription);
  } catch (err) {
    console.error('Failed to subscribe to push notifications', err);
  }
}

async function sendSubscriptionToServer(subscription: PushSubscription) {
  const userStr = localStorage.getItem("currentUser") || localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const token = user?.token;

  if (!token) return;

  const API = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

  try {
    await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });
  } catch (err) {
    console.error('Failed to send push subscription to server', err);
  }
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
