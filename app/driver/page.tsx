"use client";

import { fetchWithAuth } from "@/lib/auth-fetch";
import DriverNavigationPanel from "@/components/driver/DriverNavigationPanel";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

type VehicleOption = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName: string | null;
};

type FleetResponse = {
  success: boolean;
  fleet: VehicleOption[];
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 16,
  outline: "none",
  background: "#fff",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginBottom: 8,
  color: "#0f172a",
};

const primaryButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 15,
};

const dangerButtonStyle: CSSProperties = {
  padding: "16px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
  width: "100%",
};

function formatCoords(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "-";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export default function DriverEmergencyPage() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [pendingRouteAssignment, setPendingRouteAssignment] = useState<any | null>(null);
  const [routeAssignmentLoading, setRouteAssignmentLoading] = useState(false);
  const [originPort, setOriginPort] = useState("");
  const [destinationFishery, setDestinationFishery] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nearbyAlerts, setNearbyAlerts] = useState<any[]>([]);
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [routeRecommendation, setRouteRecommendation] = useState<string | null>(null);
  const [selectedSaferRoute, setSelectedSaferRoute] = useState<any | null>(null);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch("/api/fleet/live", { cache: "no-store" });
        const result = (await response.json()) as FleetResponse | { error: string };

        if (!response.ok) {
          setStatusMessage("Failed to load driver vehicles.");
          return;
        }

        const fleet = (result as FleetResponse).fleet || [];
        setVehicles(fleet);

        if (fleet.length > 0 && !selectedVehicleId) {
          setSelectedVehicleId(fleet[0].id);
        }
      } catch (err: any) {
        setStatusMessage(err.message || "Failed to load driver vehicles.");
      }
    }

    loadVehicles();
  }, [selectedVehicleId]);

  useEffect(() => {
    return () => {
      if (watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  useEffect(() => {
    if (selectedVehicleId) {
      loadPendingRouteAssignment(selectedVehicleId);
    } else {
      setPendingRouteAssignment(null);
    }
  }, [selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  async function loadPendingRouteAssignment(vehicleId: string) {
    if (!vehicleId) return;

    try {
      const response = await fetchWithAuth(
        `/api/fleet/route-assignments?vehicleId=${vehicleId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to load route assignment:", result);
        return;
      }

      setPendingRouteAssignment(result.assignment || null);
    } catch (error) {
      console.error("Failed to load route assignment:", error);
    }
  }

  async function acknowledgeRouteAssignment() {
    if (!pendingRouteAssignment?.id) {
      setStatusMessage("No pending route assignment to acknowledge.");
      return;
    }

    setRouteAssignmentLoading(true);

    try {
      const response = await fetchWithAuth("/api/fleet/acknowledge-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          assignmentId: pendingRouteAssignment.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result.error || "Failed to acknowledge route.");
        return;
      }

      setPendingRouteAssignment(null);
      setStatusMessage("Route assignment acknowledged.");
    } catch (error: any) {
      setStatusMessage(error.message || "Failed to acknowledge route.");
    } finally {
      setRouteAssignmentLoading(false);
    }
  }

  async function startTrip() {
    if (!selectedVehicleId) {
      setStatusMessage("Please select a vehicle.");
      return;
    }

    if (!originPort.trim() || !destinationFishery.trim()) {
      setStatusMessage("Please enter the origin port and destination fishery.");
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/fleet/start-trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          originPort,
          destinationFishery,
          originLatitude: -33.9180,
          originLongitude: 18.4233,
          destinationLatitude: -33.7606,
          destinationLongitude: 18.9647,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result.error || "Failed to start trip.");
        return;
      }

      setTripId(result.trip?.id || null);
      setStatusMessage("Trip started successfully.");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to start trip.");
    } finally {
      setBusy(false);
    }
  }

  async function sendLocation(
  latitude: number,
  longitude: number,
  speedKmh = 0,
  heading = 0
) {
  if (!selectedVehicleId) return;

  try {
    const response = await fetch("/api/fleet/update-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicleId: selectedVehicleId,
        tripId,
        latitude,
        longitude,
        speedKmh,
        heading,
        source: "mobile",
        status: "en_route_to_port",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatusMessage(result.error || "Failed to update live location.");
      return;
    }

    setStatusMessage(
      `LIVE â€¢ ${speedKmh.toFixed(1)} km/h â€¢ ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    );
  } catch {
    setStatusMessage("Connection lost. Retrying GPS sync...");
  }
}

  async function loadRerouteOptions(latitude: number, longitude: number) {
    try {
      const response = await fetchWithAuth("/api/route-safety/reroute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          origin: {
            lat: latitude,
            lng: longitude,
          },
          destination: {
            lat: -33.7606,
            lng: 18.9647,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setRouteOptions([]);
        setRouteRecommendation(result.error || "Could not calculate safer route.");
        return;
      }

      setRouteOptions(result.routes || []);
      setRouteRecommendation(result.recommendation || null);
    } catch {
      setRouteOptions([]);
      setRouteRecommendation("Could not calculate safer route.");
    }
  }

  async function checkNearbyThreats(latitude: number, longitude: number) {
    try {
      const response = await fetch(`/api/route-safety/nearby?lat=${latitude}&lng=${longitude}`, {
        cache: "no-store",
      });

      const result = await response.json();
      const alerts = result.alerts || [];

      setNearbyAlerts(alerts);

      if (alerts.length === 0) return;

      const closest = alerts[0];
      await loadRerouteOptions(latitude, longitude);

      if (closest.id !== lastAlertId) {
        setLastAlertId(closest.id);

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(
            new SpeechSynthesisUtterance(
              `Warning. ${closest.title}. ${closest.distance_meters} meters away.`
            )
          );
        }

        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(closest.title, {
              body: `${closest.type?.replaceAll("_", " ")} - ${closest.distance_meters}m away`,
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
      }
    } catch {
      // Keep GPS sharing alive even if safety scan fails.
    }
  }

  function startSharingLocation() {
    if (!selectedVehicleId) {
      setStatusMessage("Please select a vehicle first.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatusMessage("Geolocation is not supported on this device.");
      return;
    }

    if (watchId != null) {
      setStatusMessage("Live location sharing is already active.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
const speedMs = position.coords.speed ?? 0;
const speedKmh = speedMs > 0 ? speedMs * 3.6 : 0;

const heading =
  position.coords.heading != null &&
  !Number.isNaN(position.coords.heading)
    ? position.coords.heading
    : 0;

        setCurrentLat(lat);
        setCurrentLng(lng);
        setCurrentSpeed(speedKmh);

        await sendLocation(lat, lng, speedKmh);
          await checkNearbyThreats(lat, lng);
        setStatusMessage("Live location sharing is active.");
      },
      (error) => {
        setStatusMessage(error.message || "Failed to get live location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    setWatchId(id);
    setLocationSharing(true);
  }

  function stopSharingLocation() {
    if (watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }

    setWatchId(null);
    setLocationSharing(false);
    setStatusMessage("Live location sharing stopped.");
  }

  async function sendPanic() {
    if (!selectedVehicleId) {
      setStatusMessage("Please select a vehicle first.");
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const response = await fetchWithAuth("/api/fleet/panic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: selectedVehicleId,
          tripId,
          message: "Driver pressed emergency panic button.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result.error || "Failed to send panic alert.");
        return;
      }

      setStatusMessage("Emergency alert sent successfully.");
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to send panic alert.");
    } finally {
      setBusy(false);
    }
  }

  async function stopTrip() {
    setTripId(null);
    stopSharingLocation();
    setStatusMessage("Trip stopped. You can start another trip anytime.");
  }
    function formatDuration(duration: string | null) {
      if (!duration) return "N/A";

      const seconds = Number(duration.replace("s", ""));

      if (!Number.isFinite(seconds)) {
        return duration;
      }

      return `${Math.round(seconds / 60)} min`;
    }


  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Driver Emergency Page</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Start trips, share live GPS location, and send emergency alerts instantly.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 24 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>Trip Controls</h2>

          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <label style={labelStyle}>Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.nickname || vehicle.registrationNumber} - {vehicle.registrationNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Origin Port</label>
              <input
                value={originPort}
                onChange={(e) => setOriginPort(e.target.value)}
                placeholder="e.g. Cape Town Harbour"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Destination Fishery</label>
              <input
                value={destinationFishery}
                onChange={(e) => setDestinationFishery(e.target.value)}
                placeholder="e.g. Saldanha Fishery Depot"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={startTrip}
                disabled={busy}
                style={primaryButtonStyle}
              >
                {busy ? "Please wait..." : "Start Trip"}
              </button>

              {!locationSharing ? (
                <button onClick={startSharingLocation} style={secondaryButtonStyle}>
                  Share Live Location
                </button>
              ) : (
                <button onClick={stopSharingLocation} style={secondaryButtonStyle}>
                  Stop Location Sharing
                </button>
              )}

              <button onClick={stopTrip} style={secondaryButtonStyle}>
                Stop Trip
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
            {pendingRouteAssignment ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "#ecfdf5",
                  border: "1px solid #86efac",
                  color: "#14532d",
                  marginBottom: 18,
                }}
              >
                <h3 style={{ margin: "0 0 8px 0" }}>New Safer Route Assigned</h3>
                <div style={{ fontWeight: 800 }}>
                  {pendingRouteAssignment.route_data?.label || "Safer route"}
                </div>
                <div style={{ marginTop: 6 }}>
                  Distance:{" "}
                  {Math.round((pendingRouteAssignment.route_data?.distanceMeters || 0) / 1000)} km
                </div>
                <div>ETA: {pendingRouteAssignment.route_data?.duration || "N/A"}</div>
                {pendingRouteAssignment.route_data?.description ? (
                  <div>Via: {pendingRouteAssignment.route_data.description}</div>
                ) : null}
                {pendingRouteAssignment.route_data?.reason ? (
                  <div style={{ marginTop: 8 }}>
                    Reason: {pendingRouteAssignment.route_data.reason}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={acknowledgeRouteAssignment}
                  disabled={routeAssignmentLoading}
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 900,
                    cursor: routeAssignmentLoading ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  {routeAssignmentLoading ? "Acknowledging..." : "Acknowledge Route"}
                </button>
              </div>
            ) : null}

          <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>Emergency Actions</h2>

          <div style={{ marginBottom: 18 }}>
            <button onClick={sendPanic} disabled={busy} style={dangerButtonStyle}>
              {busy ? "Sending..." : "PANIC BUTTON"}
            </button>
          </div>

          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              borderRadius: 14,
              padding: 16,
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            Use the panic button only for hijacking, assault, robbery, medical emergency,
            or immediate danger.
          </div>
        </div>
      </div>

      <div
        style={{
          ...cardStyle,
          padding: 24,
          marginTop: 24,
        }}
      >
        <h2 style={{ fontSize: 28, margin: "0 0 18px 0" }}>Live Driver Status</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18 }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Selected Vehicle</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>
              {selectedVehicle?.nickname || selectedVehicle?.registrationNumber || "-"}
            </div>
          </div>

          <div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Current Trip</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{tripId || "-"}</div>
          </div>

          <div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Speed</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{currentSpeed.toFixed(1)} km/h</div>
          </div>

          <div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>Location</div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{formatCoords(currentLat, currentLng)}</div>
          </div>
        </div>

        {nearbyAlerts.length > 0 && (
          <div
            style={{
              ...cardStyle,
              padding: 20,
              marginBottom: 24,
              background: "#fef2f2",
              border: "2px solid #dc2626",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Driver Safety Warning</h2>
            {routeOptions.length > 0 && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  marginBottom: 14,
                }}
              >
                <strong>Safer Route Options</strong>

                {routeRecommendation ? (
                  <div style={{ marginTop: 6 }}>{routeRecommendation}</div>
                ) : null}

                {routeOptions.slice(0, 3).map((route) => (
                  <div key={route.index} style={{ marginTop: 10 }}>
                    <strong>{route.label}</strong>
                    <br />
                    Distance: {Math.round((route.distanceMeters || 0) / 1000)} km
                    <br />
                    ETA: {formatDuration(route.duration)}
                    {route.index > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedSaferRoute(route);

                          if (typeof window !== "undefined" && "speechSynthesis" in window) {
                            window.speechSynthesis.cancel();
                            window.speechSynthesis.speak(
                              new SpeechSynthesisUtterance(
                                `Safer route selected. Follow ${route.description || route.label}.`
                              )
                            );
                          }
                        }}
                        style={{
                          display: "block",
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Use Safer Route
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}


            {nearbyAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "#ffffff",
                  border: "1px solid #fecaca",
                  marginTop: 12,
                }}
              >
                <strong>{alert.title}</strong>
                <div>Severity: {alert.severity?.toUpperCase()}</div>
                <div>Distance: {alert.distance_meters}m away</div>

                {alert.suggested_route ? (
                  <div>
                    <strong>Suggested Route:</strong> {alert.suggested_route}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#334155",
            fontWeight: 600,
          }}
        >
          {statusMessage || "Driver system ready."}
        </div>
      </div>
    </AppShell>
  );
}








