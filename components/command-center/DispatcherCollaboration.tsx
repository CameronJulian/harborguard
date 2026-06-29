"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DispatcherPresence = {
  userId: string;
  email: string;
  status: string;
  focus: string;
  onlineAt: string;
};

const CHANNEL_NAME = "dispatcher-collaboration-presence";

const focusAreas = [
  "Monitoring Command Center",
  "Reviewing Mission Queue",
  "Handling Incident",
  "Checking Notifications",
  "Watching Fleet Map",
];

function normalizePresence(state: Record<string, any[]>): DispatcherPresence[] {
  const seen = new Map<string, DispatcherPresence>();

  Object.values(state)
    .flat()
    .forEach((entry: any) => {
      const userId = entry.userId || entry.user_id || "unknown";
      const email = entry.email || "dispatcher";
      const key = `${userId}-${email}`;

      seen.set(key, {
        userId,
        email,
        status: entry.status || "Available",
        focus: entry.focus || "Monitoring Command Center",
        onlineAt: entry.onlineAt || new Date().toISOString(),
      });
    });

  return Array.from(seen.values());
}

export default function DispatcherCollaboration() {
  const [dispatchers, setDispatchers] = useState<DispatcherPresence[]>([]);
  const [myStatus, setMyStatus] = useState("Available");
  const [myFocus, setMyFocus] = useState(focusAreas[0]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const channelRef = useRef<any>(null);
  const userRef = useRef<any>(null);

  async function trackPresence(status: string, focus: string) {
    const channel = channelRef.current;
    const user = userRef.current;

    if (!channel || !user) return;

    await channel.track({
      userId: user.id,
      email: user.email || "dispatcher",
      status,
      focus,
      onlineAt: new Date().toISOString(),
    });
  }

  useEffect(() => {
    let mounted = true;

    async function startPresence() {
      const existingChannels = supabase
        .getChannels()
        .filter((item: any) => item.topic === `realtime:${CHANNEL_NAME}`);

      existingChannels.forEach((item: any) => {
        supabase.removeChannel(item);
      });

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!mounted) return;

      if (!user) {
        setMessage("Sign in to enable dispatcher collaboration.");
        return;
      }

      userRef.current = user;

      const channel = supabase.channel(CHANNEL_NAME, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channelRef.current = channel;

      channel.on("presence", { event: "sync" }, () => {
        if (!mounted) return;

        const state = channel.presenceState();
        setDispatchers(normalizePresence(state));
      });

      channel.subscribe(async (status: string) => {
        if (!mounted) return;

        if (status === "SUBSCRIBED") {
          await trackPresence(myStatus, myFocus);
          setConnected(true);
          setMessage("");
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
        }
      });
    }

    startPresence();

    return () => {
      mounted = false;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    trackPresence(myStatus, myFocus);
  }, [myStatus, myFocus]);

  const activeCount = dispatchers.length;

  const statusSummary = useMemo(() => {
    const busy = dispatchers.filter((item) => item.status === "Busy").length;
    const available = dispatchers.filter((item) => item.status === "Available").length;
    const incident = dispatchers.filter((item) => item.focus === "Handling Incident").length;

    return { busy, available, incident };
  }, [dispatchers]);

  return (
    <section style={{ padding: 22, borderRadius: 22, background: "#ffffff", border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#0891b2", fontSize: 13, fontWeight: 900, marginBottom: 6 }}>
            LIVE DISPATCHER COLLABORATION
          </div>
          <h2 style={{ margin: 0, fontSize: 28 }}>Dispatcher Presence</h2>
          <div style={{ color: "#64748b", marginTop: 6 }}>
            See which dispatchers are online and what they are currently monitoring.
          </div>
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 12, background: connected ? "#ecfeff" : "#fef2f2", color: connected ? "#0e7490" : "#dc2626", fontWeight: 900, height: "fit-content" }}>
          {connected ? "Realtime connected" : "Offline"}
        </div>
      </div>

      {message && <div style={{ color: "#dc2626", marginBottom: 14 }}>{message}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[
          ["Online", activeCount],
          ["Available", statusSummary.available],
          ["Busy", statusSummary.busy],
          ["On Incidents", statusSummary.incident],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 6, color: "#334155", fontWeight: 800 }}>
          My status
          <select value={myStatus} onChange={(event) => setMyStatus(event.target.value)} style={{ padding: 11, borderRadius: 12, border: "1px solid #cbd5e1" }}>
            <option>Available</option>
            <option>Busy</option>
            <option>Monitoring</option>
            <option>Escalating</option>
            <option>Offline</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, color: "#334155", fontWeight: 800 }}>
          My focus
          <select value={myFocus} onChange={(event) => setMyFocus(event.target.value)} style={{ padding: 11, borderRadius: 12, border: "1px solid #cbd5e1" }}>
            {focusAreas.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {dispatchers.length === 0 ? (
          <div style={{ color: "#64748b" }}>No active dispatchers detected yet.</div>
        ) : (
          dispatchers.map((dispatcher) => (
            <div key={`${dispatcher.userId}-${dispatcher.email}`} style={{ padding: 14, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <strong>{dispatcher.email}</strong>
                <div style={{ color: "#64748b", marginTop: 4 }}>{dispatcher.focus}</div>
              </div>

              <div style={{ color: dispatcher.status === "Available" ? "#16a34a" : "#ea580c", fontWeight: 900 }}>
                {dispatcher.status}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        <Link href="/incidents" style={{ color: "#0891b2", fontWeight: 900 }}>
          Open incidents
        </Link>
        <Link href="/mobile-dispatcher" style={{ color: "#0891b2", fontWeight: 900 }}>
          Open mobile dispatcher
        </Link>
      </div>
    </section>
  );
}
