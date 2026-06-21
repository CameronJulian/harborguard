"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushNotificationManager() {
  useEffect(() => {
    async function setupPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
        console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log("Push setup skipped: user is not signed in.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          console.log("Notification permission denied.");
          return;
        }

        const subscription =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(subscription),
        });

        const data = await response.json();

        if (!response.ok) {
          console.log("Push subscription save skipped:", data);
          return;
        }

        console.log("Push subscription saved:", data);
      } catch (err) {
        console.log("Push setup skipped:", err);
      }
    }

    setupPush();
  }, []);

  return null;
}
