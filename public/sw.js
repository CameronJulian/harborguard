self.addEventListener("install", () => {
  console.log("HarborGuard service worker installed");
});

self.addEventListener("activate", () => {
  console.log("HarborGuard service worker activated");
});

self.addEventListener("push", (event) => {
  let data = {
    title: "HarborGuard Alert",
    body: "New operational alert received.",
    url: "/command-center",
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.png",
      data: {
        url: data.url || "/command-center",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/command-center")
  );
});
