"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { fetchWithAuth } from "@/lib/auth-fetch";

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function oneHourAgoLocalInput() {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
}

function interpolatePoint(points: any[], progress: number) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];

  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const exactIndex = safeProgress * (points.length - 1);
  const lowerIndex = Math.floor(exactIndex);
  const upperIndex = Math.min(lowerIndex + 1, points.length - 1);
  const ratio = exactIndex - lowerIndex;

  const lower = points[lowerIndex];
  const upper = points[upperIndex];

  return {
    ...upper,
    latitude: lower.latitude + (upper.latitude - lower.latitude) * ratio,
    longitude: lower.longitude + (upper.longitude - lower.longitude) * ratio,
    recordedAt: upper.recordedAt,
  };
}

export default function FleetTimeMachinePage() {
  const [start, setStart] = useState(oneHourAgoLocalInput());
  const [end, setEnd] = useState(nowLocalInput());
  const [data, setData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(900);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTimeMachine(autoPlay = false) {
    setLoading(true);
    setMessage("");
    setIsPlaying(false);
    setProgress(0);

    try {
      const params = new URLSearchParams();
      params.set("start", new Date(start).toISOString());
      params.set("end", new Date(end).toISOString());

      const response = await fetchWithAuth(`/api/fleet/time-machine?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load Fleet Time Machine.");
        return;
      }

      setData(result.timeMachine);

      if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load Fleet Time Machine.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setProgress((current) => {
        const next = current + 0.005 * (1400 / speedMs);

        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }

        return next;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isPlaying, speedMs]);

  const currentVehicles = useMemo(() => {
    const tracks = data?.tracks || [];

    return tracks
      .map((track: any) => ({
        ...track,
        currentPoint: interpolatePoint(track.points || [], progress),
      }))
      .filter((track: any) => track.currentPoint);
  }, [data, progress]);

  const visibleEvents = useMemo(() => {
    if (!data?.events?.length) return [];

    const startMs = new Date(data.window.start).getTime();
    const endMs = new Date(data.window.end).getTime();
    const currentMs = startMs + (endMs - startMs) * progress;

    return data.events
      .filter((event: any) => new Date(event.createdAt).getTime() <= currentMs)
      .slice(-12)
      .reverse();
  }, [data, progress]);

  return (
    <AppShell>
      <div style={{ padding: 24 }}>
        <div style={{ padding: 24, borderRadius: 20, background: "#0f172a", color: "#fff", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.8 }}>
            FLEET-WIDE HISTORICAL PLAYBACK
          </div>
          <h1 style={{ fontSize: 42, margin: "8px 0" }}>Fleet Time Machine</h1>
          <p style={{ margin: 0, opacity: 0.85 }}>
            Replay every vehicle and operational event across the fleet for a selected time window.
          </p>
        </div>

        <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 160px", gap: 12 }}>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }} />
            <select value={speedMs} onChange={(e) => setSpeedMs(Number(e.target.value))} style={{ padding: 12, borderRadius: 12, border: "1px solid #cbd5e1" }}>
              <option value="1400">1x</option>
              <option value="900">2x</option>
              <option value="450">5x</option>
              <option value="220">10x</option>
            </select>
            <button onClick={() => loadTimeMachine(true)} disabled={loading} style={{ padding: 12, borderRadius: 12, border: "none", background: "#2563eb", color: "#fff", fontWeight: 900 }}>
              {loading ? "Loading..." : "Load + Play"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => setIsPlaying(true)} style={{ padding: "9px 12px", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontWeight: 800 }}>
              Play
            </button>
            <button onClick={() => setIsPlaying(false)} style={{ padding: "9px 12px", borderRadius: 10, border: "none", background: "#f59e0b", color: "#fff", fontWeight: 800 }}>
              Pause
            </button>
            <button onClick={() => { setIsPlaying(false); setProgress(0); }} style={{ padding: "9px 12px", borderRadius: 10, border: "none", background: "#64748b", color: "#fff", fontWeight: 800 }}>
              Reset
            </button>
          </div>

          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(e) => setProgress(Number(e.target.value) / 1000)}
            style={{ width: "100%", marginTop: 16 }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 13 }}>
            <span>Progress: {Math.round(progress * 100)}%</span>
            <span>{data ? `${formatTime(data.window.start)} - ${formatTime(data.window.end)}` : "No playback loaded"}</span>
          </div>

          {message ? <div style={{ marginTop: 12, color: "#dc2626" }}>{message}</div> : null}
        </div>

        {data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
              {[
                ["Vehicles", data.vehicleCount],
                ["GPS Points", data.pointCount],
                ["Events", data.eventCount],
                ["High Risk", data.highRiskEventCount],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 16, borderRadius: 16, border: "1px solid #e5e7eb", background: "#fff" }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
              <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", minHeight: 420 }}>
                <h2 style={{ marginTop: 0 }}>Fleet Playback Positions</h2>
                <p style={{ color: "#64748b" }}>{data.summary}</p>

                <div style={{ display: "grid", gap: 10, maxHeight: 320, overflowY: "auto" }}>
                  {currentVehicles.length === 0 ? (
                    <div style={{ color: "#64748b" }}>No vehicle positions available at this playback point.</div>
                  ) : (
                    currentVehicles.map((track: any) => (
                      <div key={track.vehicleId} style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <strong>{track.registrationNumber}</strong>
                        <div style={{ color: "#475569", fontSize: 13 }}>
                          Lat {track.currentPoint.latitude.toFixed(5)}, Lng {track.currentPoint.longitude.toFixed(5)}
                        </div>
                        <div style={{ color: "#475569", fontSize: 13 }}>
                          Speed {track.currentPoint.speedKmh} km/h · {formatTime(track.currentPoint.recordedAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff", minHeight: 420 }}>
                <h2 style={{ marginTop: 0 }}>Synchronized Events</h2>

                <div style={{ display: "grid", gap: 10, maxHeight: 360, overflowY: "auto" }}>
                  {visibleEvents.length === 0 ? (
                    <div style={{ color: "#64748b" }}>No events reached yet.</div>
                  ) : (
                    visibleEvents.map((event: any) => (
                      <div key={event.id} style={{ padding: 12, borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <strong>{event.title}</strong>
                        <div style={{ color: "#475569", fontSize: 13 }}>{event.detail}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {event.type} · {event.severity} · {formatTime(event.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 20, borderRadius: 18, border: "1px solid #e5e7eb", background: "#fff" }}>
            Load a time window to start fleet playback.
          </div>
        )}
      </div>
    </AppShell>
  );
}
