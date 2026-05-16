"use client";

import { useEffect } from "react";

export default function PushNotificationManager() {
  useEffect(() => {
    async function setupPush() {
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

        if (permission !== "granted") {
          console.log(
            "Notification permission denied."
          );
          return;
        }

        console.log(
          "Push notifications enabled."
        );

        setTimeout(async () => {
          try {
            const response = await fetch(
              "/api/push/test",
              {
                method: "POST",
              }
            );

            const data =
              await response.json();

            registration.showNotification(
              data.notification.title,
              {
                body: data.notification.body,
                icon: "/icon.png",
              }
            );
          } catch (err) {
            console.error(
              "Test notification failed:",
              err
            );
          }
        }, 4000);
      } catch (err) {
        console.error(
          "Push setup failed:",
          err
        );
      }
    }

    setupPush();
  }, []);

  return null;
}