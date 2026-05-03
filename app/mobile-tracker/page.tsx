"use client";

import { useEffect, useRef, useState } from "react";

export default function MobileTrackerPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("Ready.");
  const [lastLocation, setLastLocation] = useState<any>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<any>(null);

  // ===== CONFIG (tune this later if needed)
  const MIN_DISTANCE_METERS = 10;   // ignore tiny jitter
  const MAX_ACCURACY_METERS = 50;   // ignore bad GPS
  const MAX_SPEED_KMH = 180;        // ignore teleport spikes

  function getDistanceMeters(a: any, b: any) {
    const R = 6371e3;
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;

    const x =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);
    setMessage("Tracking stopped.");
  }

  function startTracking() {
    if (!vehicleId.trim()) {
      setMessage("Enter vehicle ID first.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("GPS not supported.");
      return;
    }

    setTracking(true);
    setMessage("Starting GPS tracking...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 999;
        const speedKmh = position.coords.speed
          ? position.coords.speed * 3.6
          : 0;

        // ===== FILTER 1: Accuracy check
        if (accuracy > MAX_ACCURACY_METERS) {
          setMessage("Ignoring low-accuracy GPS...");
          return;
        }

        const current = { lat, lng };

        // ===== FILTER 2: Distance check
        if (lastSentRef.current) {
          const distance = getDistanceMeters(lastSentRef.current, current);

          if (distance < MIN_DISTANCE_METERS) {
            // ignore jitter
            return;
          }

          // ===== FILTER 3: Speed sanity (anti teleport)
          const timeDiff =
            (Date.now() - lastSentRef.current.time) / 1000;

          const calcSpeed = (distance / timeDiff) * 3.6;

          if (calcSpeed > MAX_SPEED_KMH) {
            setMessage("Ignoring GPS spike...");
            return;
          }
        }

        const payload = {
          vehicleId: vehicleId.trim(),
          latitude: lat,
          longitude: lng,
          speedKmh,
          heading: position.coords.heading || 0,
          source: "mobile",
        };

        setLastLocation(payload);

        try {
          const res = await fetch("/api/fleet/update-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const result = await res.json();

          if (!res.ok) {
            setMessage(result.error || "Failed to send location.");
            return;
          }

          // ✅ Save last good point
          lastSentRef.current = {
            lat,
            lng,
            time: Date.now(),
          };

          setMessage(
            `Tracking active. ${new Date().toLocaleTimeString()}`
          );
        } catch (err: any) {
          setMessage(err.message || "Network error.");
        }
      },
      (error) => {
        setMessage(error.message || "GPS error.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }

  useEffect(() => {
    return () => stopTracking();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#020617",
        color: "#fff",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "#0f172a",
          borderRadius: 24,
          padding: 24,
        }}
      >
        <h1>HarborGuard Tracker</h1>

        <p style={{ color: "#94a3b8" }}>
          Keep this open while driving.
        </p>

        <input
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          placeholder="Vehicle ID"
          disabled={tracking}
          style={{ width: "100%", padding: 12, marginBottom: 12 }}
        />

        {!tracking ? (
          <button onClick={startTracking}>Start</button>
        ) : (
          <button onClick={stopTracking}>Stop</button>
        )}

        <div style={{ marginTop: 12 }}>
          <strong>Status:</strong> {tracking ? "Tracking" : "Idle"}
          <br />
          {message}
        </div>

        {lastLocation && (
          <div style={{ marginTop: 12 }}>
            Lat: {lastLocation.latitude}
            <br />
            Lng: {lastLocation.longitude}
            <br />
            Speed: {Math.round(lastLocation.speedKmh)} km/h
          </div>
        )}
      </div>
    </main>
  );
}