"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth-fetch";

export default function PushTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function sendTestPush() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetchWithAuth("/api/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "HarborGuard Push Test",
          body: "Production push notification test successful.",
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message || "Push test failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Push Notification Test</h1>

      <p>
        Use this page to confirm HarborGuard push notifications are working
        without triggering Panic or Route Safety alerts.
      </p>

      <button
        onClick={sendTestPush}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "14px 22px",
          borderRadius: 10,
          border: "none",
          background: "#2563eb",
          color: "white",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Sending..." : "Send Test Push"}
      </button>

      {result && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            background: "#f3f4f6",
            borderRadius: 10,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
