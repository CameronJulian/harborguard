"use client";

import { useEffect, useRef, useState } from "react";

export default function MobileTrackerPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("Ready.");
  const [lastLocation, setLastLocation] = useState<any>(null);
  const watchIdRef = useRef<number | null>(null);

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
      setMessage("GPS is not supported on this device.");
      return;
    }

    setTracking(true);
    setMessage("Starting GPS tracking...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const speedKmh = position.coords.speed
          ? position.coords.speed * 3.6
          : 0;

        const payload = {
          vehicleId: vehicleId.trim(),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKmh,
          heading: position.coords.heading || 0,
          source: "mobile",
        };

        setLastLocation(payload);

        try {
          const response = await fetch("/api/fleet/update-location", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();

          if (!response.ok) {
            setMessage(result.error || "Failed to send location.");
            return;
          }

          setMessage(
            `Live tracking active. Last update: ${new Date().toLocaleTimeString()}`
          );
        } catch (err: any) {
          setMessage(err.message || "Failed to send location.");
        }
      },
      (error) => {
        setMessage(error.message || "GPS error.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
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
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 24,
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 28, marginTop: 0 }}>HarborGuard Tracker</h1>

        <p style={{ color: "#94a3b8" }}>
          Keep this page open on the driver phone while the bakkie is moving.
        </p>

        <label style={{ display: "block", marginBottom: 8, fontWeight: 800 }}>
          Vehicle ID
        </label>

        <input
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          placeholder="Paste vehicle UUID here"
          disabled={tracking}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            borderRadius: 12,
            border: "1px solid #334155",
            background: "#020617",
            color: "#fff",
            marginBottom: 16,
          }}
        />

        {!tracking ? (
          <button
            onClick={startTracking}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 14,
              padding: 16,
              background: "#16a34a",
              color: "#fff",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Start Live Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            style={{
              width: "100%",
              border: "none",
              borderRadius: 14,
              padding: 16,
              background: "#dc2626",
              color: "#fff",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            Stop Tracking
          </button>
        )}

        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 14,
            background: tracking ? "#052e16" : "#1e293b",
            border: tracking ? "1px solid #16a34a" : "1px solid #334155",
          }}
        >
          <strong>Status:</strong> {tracking ? "Tracking active" : "Not tracking"}
          <br />
          {message}
        </div>

        {lastLocation ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              background: "#020617",
              border: "1px solid #334155",
              fontSize: 14,
            }}
          >
            <strong>Last GPS:</strong>
            <br />
            Lat: {lastLocation.latitude}
            <br />
            Lng: {lastLocation.longitude}
            <br />
            Speed: {Math.round(lastLocation.speedKmh)} km/h
            <br />
            Heading: {Math.round(lastLocation.heading || 0)}°
          </div>
        ) : null}

        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 18 }}>
          Note: browser tracking works while the page is open. True 24/7 background
          tracking needs a mobile app or GPS hardware device.
        </p>
      </div>
    </main>
  );
}