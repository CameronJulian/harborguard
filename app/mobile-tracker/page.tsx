"use client";

import {
  getDistanceMeters,
} from "@/lib/geo/getDistanceMeters";

import { useEffect, useRef, useState } from "react";

type VehicleOption = {
  id: string;
  nickname?: string | null;
  registration_number?: string | null;
  make?: string | null;
  model?: string | null;
  is_active?: boolean | null;
};

type VehiclesResponse = {
  success?: boolean;
  vehicles?: VehicleOption[];
  error?: string;
};

export default function MobileTrackerPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleLoadError, setVehicleLoadError] = useState("");
  const [originPort, setOriginPort] = useState("");
  const [destinationFishery, setDestinationFishery] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [journeyBusy, setJourneyBusy] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      try {
        setVehiclesLoading(true);
        setVehicleLoadError("");

        const response = await fetch("/api/fleet/vehicles", {
          cache: "no-store",
        });

        const result = (await response.json()) as VehiclesResponse;

        if (!response.ok) {
          throw new Error(result.error || "Failed to load vehicles.");
        }

        const activeVehicles = (
          Array.isArray(result.vehicles)
            ? result.vehicles
            : []
        ).filter((vehicle) => vehicle.is_active !== false);

        if (cancelled) {
          return;
        }

        setVehicles(activeVehicles);

        if (activeVehicles.length > 0) {
          setVehicleId((current) => current || activeVehicles[0].id);
        }
      } catch (error) {
        if (!cancelled) {
          setVehicles([]);
          setVehicleLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load vehicles."
          );
        }
      } finally {
        if (!cancelled) {
          setVehiclesLoading(false);
        }
      }
    }

    loadVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  function stopGpsWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);
  }

  function beginGpsTracking(activeTripId: string) {
    setTracking(true);
    setMessage("Starting GPS tracking...");

    lastSentRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 999;
        const speedKmh = position.coords.speed
          ? position.coords.speed * 3.6
          : 0;

        if (accuracy > MAX_ACCURACY_METERS) {
          setMessage("Ignoring low-accuracy GPS...");
          return;
        }

        const current = { lat, lng };

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
            return;
          }

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
          tripId: activeTripId,
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
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const result = await res.json();

          if (!res.ok) {
            setMessage(
              result.error || "Failed to send location."
            );
            return;
          }

          lastSentRef.current = {
            lat,
            lng,
            time: Date.now(),
          };

          setMessage(
            `Journey tracking active. ${new Date().toLocaleTimeString()}`
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

  async function startJourney() {
    if (!vehicleId.trim()) {
      setMessage("Select a vehicle first.");
      return;
    }

    if (!originPort.trim() || !destinationFishery.trim()) {
      setMessage("Enter an origin and destination first.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("GPS not supported.");
      return;
    }

    setJourneyBusy(true);
    setMessage("Starting journey...");

    try {
      const response = await fetch("/api/fleet/start-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: vehicleId.trim(),
          originPort: originPort.trim(),
          destinationFishery: destinationFishery.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.trip?.id) {
        setMessage(
          result.error || "Failed to start journey."
        );
        return;
      }

      const activeTripId = result.trip.id as string;

      setTripId(activeTripId);

      if (result.reusedExistingTrip) {
        setOriginPort(
          result.trip.origin_port || originPort.trim()
        );
        setDestinationFishery(
          result.trip.destination_fishery ||
            destinationFishery.trim()
        );
      }

      beginGpsTracking(activeTripId);
    } catch (error: any) {
      setMessage(error.message || "Failed to start journey.");
    } finally {
      setJourneyBusy(false);
    }
  }

  async function completeJourney() {
    if (!tripId) {
      setMessage("No active journey to complete.");
      return;
    }

    if (!lastLocation) {
      setMessage(
        "Wait for a valid GPS location before completing the journey."
      );
      return;
    }

    setJourneyBusy(true);
    setMessage("Completing journey...");

    try {
      const response = await fetch(
        "/api/fleet/update-location",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicleId: vehicleId.trim(),
            tripId,
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            speedKmh: lastLocation.speedKmh || 0,
            heading: lastLocation.heading || 0,
            source: "mobile",
            status: "delivered",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Failed to complete journey."
        );
        return;
      }

      stopGpsWatch();
      setTripId(null);
      setMessage("Journey completed successfully.");
    } catch (error: any) {
      setMessage(
        error.message || "Failed to complete journey."
      );
    } finally {
      setJourneyBusy(false);
    }
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
    return () => {
      if (
        watchIdRef.current !== null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
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

        <label
          htmlFor="mobile-tracker-vehicle"
          style={{
            display: "block",
            color: "#cbd5e1",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Vehicle
        </label>

        <select
          id="mobile-tracker-vehicle"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          disabled={tracking || journeyBusy || !!tripId || vehiclesLoading}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <option value="">
            {vehiclesLoading
              ? "Loading vehicles..."
              : vehicles.length === 0
                ? "No active vehicles available"
                : "Select vehicle"}
          </option>

          {vehicles.map((vehicle) => {
            const registration =
              vehicle.registration_number || "No registration";

            const name =
              vehicle.nickname ||
              [vehicle.make, vehicle.model]
                .filter(Boolean)
                .join(" ") ||
              registration;

            return (
              <option key={vehicle.id} value={vehicle.id}>
                {name} - {registration}
              </option>
            );
          })}
        </select>

        {vehicleLoadError && (
          <p
            style={{
              color: "#fca5a5",
              fontSize: 14,
              marginTop: 0,
              marginBottom: 12,
            }}
          >
            {vehicleLoadError}
          </p>
        )}

        <label
          htmlFor="mobile-tracker-origin"
          style={{
            display: "block",
            color: "#cbd5e1",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Origin
        </label>

        <input
          id="mobile-tracker-origin"
          value={originPort}
          onChange={(event) => setOriginPort(event.target.value)}
          placeholder="Where are you starting?"
          disabled={tracking || journeyBusy}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
            boxSizing: "border-box",
          }}
        />

        <label
          htmlFor="mobile-tracker-destination"
          style={{
            display: "block",
            color: "#cbd5e1",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Destination
        </label>

        <input
          id="mobile-tracker-destination"
          value={destinationFishery}
          onChange={(event) =>
            setDestinationFishery(event.target.value)
          }
          placeholder="Where are you going?"
          disabled={tracking || journeyBusy}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 12,
            borderRadius: 8,
            boxSizing: "border-box",
          }}
        />

        {!tripId ? (
          <button
            type="button"
            onClick={startJourney}
            disabled={
              journeyBusy ||
              vehiclesLoading ||
              !vehicleId ||
              !originPort.trim() ||
              !destinationFishery.trim()
            }
          >
            {journeyBusy ? "Starting..." : "Start Journey"}
          </button>
        ) : (
          <button
            type="button"
            onClick={completeJourney}
            disabled={journeyBusy || !lastLocation}
          >
            {journeyBusy
              ? "Completing..."
              : "Complete Journey"}
          </button>
        )}

        <div style={{ marginTop: 12 }}>
          <strong>Status:</strong>{" "}
          {tripId
            ? tracking
              ? "Journey active"
              : "Journey ready"
            : "Idle"}
          <br />
          {message}
        </div>

        {tripId && (
          <div
            style={{
              marginTop: 8,
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            Trip: {tripId}
          </div>
        )}

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
