const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PUSH_FN_URL = `${SUPABASE_URL}/functions/v1/push-notifications`;

async function fetchPushAPI(path, options = {}) {
  const res = await fetch(`${PUSH_FN_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...options.headers,
    },
  });
  return res.json();
}

export const pushManager = {
  _registration: null,
  _subscription: null,

  isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  },

  isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  },

  getPermission() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  },

  async registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      this._registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      return this._registration;
    } catch (e) {
      console.error("SW registration failed:", e);
      return null;
    }
  },

  async getVAPIDKey() {
    try {
      const data = await fetchPushAPI("/vapid-key");
      return data.publicKey;
    } catch (e) {
      console.error("Failed to get VAPID key:", e);
      return null;
    }
  },

  async requestPermission() {
    if (!("Notification" in window)) return "denied";
    const result = await Notification.requestPermission();
    return result;
  },

  async subscribe(userId) {
    if (!this.isSupported()) return null;

    const permission = await this.requestPermission();
    if (permission !== "granted") return null;

    const reg = this._registration || (await this.registerSW());
    if (!reg) return null;

    const vapidKey = await this.getVAPIDKey();
    if (!vapidKey) return null;

    const applicationServerKey = this._urlBase64ToUint8Array(vapidKey);

    try {
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      this._subscription = sub;
      const subJson = sub.toJSON();

      await fetchPushAPI("/subscribe", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          },
        }),
      });

      return sub;
    } catch (e) {
      console.error("Push subscribe failed:", e);
      return null;
    }
  },

  async unsubscribe(userId) {
    try {
      const reg = this._registration || (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetchPushAPI("/unsubscribe", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, endpoint }),
        });
      }
      this._subscription = null;
    } catch (e) {
      console.error("Push unsubscribe failed:", e);
    }
  },

  async isSubscribed() {
    try {
      const reg = this._registration || (await navigator.serviceWorker.ready);
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  },

  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
  },
};
