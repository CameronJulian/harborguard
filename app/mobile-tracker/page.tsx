"use client";

import {
  getDistanceMeters,
} from "@/lib/geo/getDistanceMeters";

import { useEffect, useRef, useState } from "react";

export default function MobileTrackerPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState("Ready.");
  const [lastLocation, setLastLocation] = useState<any>(null);
  const [reportType, setReportType] = useState("roadblock");
  const [reportSeverity, setReportSeverity] = useState("medium");
  const [reportDescription, setReportDescription] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<any>(null);

  // ===== CONFIG (tune this later if needed)
  const MIN_DISTANCE_METERS = 10;   // ignore tiny jitter
  const MAX_ACCURACY_METERS = 50;   // ignore bad GPS
  const MAX_SPEED_KMH = 180;        // ignore teleport spikes

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
          const distance = getDistanceMeters(
            {
              latitude: lastSentRef.current.lat,
              longitude: lastSentRef.current.lng,
            },
            {
              latitude: current.lat,
              longitude: current.lng,
            }
          );

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

  async function submitCrowdReport() {
    if (!lastLocation) {
      setReportMessage(
        "Start tracking and wait for a valid GPS location before submitting a report."
      );
      return;
    }

    const reportTitles: Record<string, string> = {
      roadblock: "Roadblock reported",
      accident: "Road accident reported",
      crime: "Crime activity reported",
      suspicious_activity: "Suspicious activity reported",
      flooding: "Flooding reported",
      traffic_light_outage: "Traffic light outage reported",
      protest: "Protest or public disruption reported",
      vehicle_breakdown: "Vehicle breakdown reported",
      other: "Road safety hazard reported",
    };

    try {
      setReportSubmitting(true);
      setReportMessage("Submitting safety report...");

      const response = await fetch("/api/route-safety/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: reportType,
          title:
            reportTitles[reportType] ||
            "Road safety hazard reported",
          description: reportDescription.trim() || null,
          severity: reportSeverity,
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          radius_meters: 500,
          expires_hours: 6,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setReportMessage(
          result.error || "The safety report could not be submitted."
        );
        return;
      }

      setReportDescription("");
      setReportMessage(
        "Safety report submitted successfully using your current GPS location."
      );
    } catch (error: any) {
      setReportMessage(
        error.message ||
          "Network error while submitting the safety report."
      );
    } finally {
      setReportSubmitting(false);
    }
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

        <section
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid #334155",
          }}
        >
          <h2 style={{ marginBottom: 6 }}>Crowd Intelligence</h2>

          <p
            style={{
              marginTop: 0,
              color: "#94a3b8",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Report a road-safety hazard at your latest verified GPS
            location.
          </p>

          <label
            htmlFor="crowd-report-type"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Report type
          </label>

          <select
            id="crowd-report-type"
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
            disabled={reportSubmitting}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 14,
              borderRadius: 8,
            }}
          >
            <option value="roadblock">Roadblock</option>
            <option value="accident">Accident</option>
            <option value="crime">Crime activity</option>
            <option value="suspicious_activity">
              Suspicious activity
            </option>
            <option value="flooding">Flooding</option>
            <option value="traffic_light_outage">
              Traffic light outage
            </option>
            <option value="protest">
              Protest or public disruption
            </option>
            <option value="vehicle_breakdown">
              Vehicle breakdown
            </option>
            <option value="other">Other hazard</option>
          </select>

          <label
            htmlFor="crowd-report-severity"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Severity
          </label>

          <select
            id="crowd-report-severity"
            value={reportSeverity}
            onChange={(event) => setReportSeverity(event.target.value)}
            disabled={reportSubmitting}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 14,
              borderRadius: 8,
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <label
            htmlFor="crowd-report-description"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 700,
            }}
          >
            Description
          </label>

          <textarea
            id="crowd-report-description"
            value={reportDescription}
            onChange={(event) =>
              setReportDescription(event.target.value)
            }
            placeholder="Describe what you observed..."
            disabled={reportSubmitting}
            rows={4}
            maxLength={500}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 14,
              borderRadius: 8,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            onClick={submitCrowdReport}
            disabled={reportSubmitting || !lastLocation}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "none",
              cursor:
                reportSubmitting || !lastLocation
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
              opacity:
                reportSubmitting || !lastLocation ? 0.6 : 1,
            }}
          >
            {reportSubmitting
              ? "Submitting report..."
              : "Submit safety report"}
          </button>

          {!lastLocation && (
            <p
              style={{
                color: "#fbbf24",
                fontSize: 13,
                marginBottom: 0,
              }}
            >
              Start tracking and wait for a valid GPS location to
              enable reporting.
            </p>
          )}

          {reportMessage && (
            <p
              style={{
                color: "#cbd5e1",
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 0,
              }}
            >
              {reportMessage}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
