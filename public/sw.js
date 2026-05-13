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
    })
  );
});