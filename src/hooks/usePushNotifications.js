import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// PushManager's applicationServerKey wants raw bytes, not the base64url
// string the VAPID public key comes as.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    let active = true;
    if (!supported) {
      setChecking(false);
      return () => {};
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (active) setSubscribed(Boolean(subscription));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || !user) return;
    const vapidKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"];
    if (!vapidKey) {
      toast.error("Push notifications aren't configured for this deployment yet.");
      return;
    }

    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error(
          "Notifications were blocked — enable them in your browser settings to turn this on.",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "user_id,endpoint" },
      );
      if (error) throw error;

      setSubscribed(true);
      toast.success("Push notifications turned on");
    } catch (error) {
      toast.error(error.message || "Couldn't turn on push notifications.");
    } finally {
      setPending(false);
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint);
        }
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications turned off");
    } catch (error) {
      toast.error(error.message || "Couldn't turn off push notifications.");
    } finally {
      setPending(false);
    }
  }, [supported, user]);

  return { supported, subscribed, checking, pending, enable, disable };
}
