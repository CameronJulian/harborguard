"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(standalone);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  if (isInstalled || !installEvent) return null;

  async function installApp() {
    if (!installEvent) return;

    await installEvent.prompt();

    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }

    setInstallEvent(null);
  }

  return (
    <div
      style={{
        
        
       
        position: "fixed",
right: 24,
bottom: 24,
zIndex: 9999,
maxWidth: 420,
background: "#0f172a",
color: "#fff",
borderRadius: 18,
padding: 16,
boxShadow: "0 20px 40px rgba(15,23,42,0.35)",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
gap: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 16 }}>
          Install HarborGuard
        </div>

        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Add HarborGuard to your home screen for faster mobile access.
        </div>
      </div>

      <button
        onClick={installApp}
        style={{
          border: "none",
          borderRadius: 12,
          background: "#2563eb",
          color: "#fff",
          padding: "10px 14px",
          fontWeight: 800,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Install
      </button>
    </div>
  );
}