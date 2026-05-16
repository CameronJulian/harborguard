"use client";

import { useEffect } from "react";

export default function PushNotificationManager() {
  useEffect(() => {
    async function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.register(
            "/sw.js"
          );

        console.log(
          "Service worker registered:",
          registration
        );

        const permission =
          await Notification.requestPermission();

        console.log(
          "Notification permission:",
          permission
        );

        if (permission !== "granted") {
          console.log(
            "Notifications not granted."
          );
          return;
        }

        console.log(
          "Push notifications enabled."
        );
      } catch (err) {
        console.error(
          "Push setup failed:",
          err
        );
      }
    }

    registerServiceWorker();
  }, []);

  return null;
}