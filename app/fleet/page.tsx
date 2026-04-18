"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type VehicleRow = {
  id: string;
  registration_number: string;
  nickname: string | null;
  make: string | null;
  model: string | null;
  driver_id: string | null;
  is_active: boolean;
  created_at: string | null;
};

type DriverRow = {
  id: string;
  full_name: string;
};

type TripRow = {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  origin_port: string;
  destination_fishery: string;
  status: string;
  created_at: string | null;
};

type AlertRow = {
  id: string;
  vehicle_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string | null;
};

type LocationRow = {
  id: string;
  vehicle_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  recorded_at: string | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  margin: "0 0 8px 0",
};

const mutedTextStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function FleetDashboardPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFleetData() {
    setLoading(true);

    const [
      vehiclesRes,
      driversRes,
      tripsRes,
      alertsRes,
      locationsRes,
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, registration_number, nickname, make, model, driver_id, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("drivers")
        .select("id, full_name"),
      supabase
        .from("vehicle_trips")
        .select("id, vehicle_id, driver_id, origin_port, destination_fishery, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicle_alerts")
        .select("id, vehicle_id, alert_type, severity, message, is_resolved, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("vehicle_locations")
        .select("id, vehicle_id, latitude, longitude, speed_kmh, recorded_at")
        .order("recorded_at", { ascending: false }),
    ]);

    setVehicles((vehiclesRes.data as VehicleRow[]) || []);
    setDrivers((driversRes.data as DriverRow[]) || []);
    setTrips((tripsRes.data as TripRow[]) || []);
    setAlerts((alertsRes.data as AlertRow[]) || []);
    setLocations((locationsRes.data as LocationRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadFleetData();
  }, []);

  const latestLocationByVehicle = useMemo(() => {
    const map = new Map<string, LocationRow>();
    for (const location of locations) {
      if (!location.vehicle_id) continue;
      if (!map.has(location.vehicle_id)) {
        map.set(location.vehicle_id, location);
      }
    }
    return map;
  }, [locations]);

  const driverNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const driver of drivers) {
      map.set(driver.id, driver.full_name);
    }
    return map;
  }, [drivers]);

  const openAlerts = alerts.filter((a) => !a.is_resolved);
  const activeTrips = trips.filter((t) =>
    ["scheduled", "en_route_to_port", "collecting", "en_route_to_fishery", "emergency"].includes(t.status)
  );

  const offlineVehicles = vehicles.filter((vehicle) => {
    const latest = latestLocationByVehicle.get(vehicle.id);
    if (!latest?.recorded_at) return true;
    const diffMs = Date.now() - new Date(latest.recorded_at).getTime();
    return diffMs > 15 * 60 * 1000;
  });

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 26, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>Fleet Dashboard</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Monitor bakkies, trips, locations, and vehicle safety alerts.
        </p>

        <button
          onClick={loadFleetData}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Refresh Fleet Data
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Vehicles", value: vehicles.length },
          { label: "Active Trips", value: activeTrips.length },
          { label: "Open Alerts", value: openAlerts.length },
          { label: "Offline Vehicles", value: offlineVehicles.length },
          { label: "Drivers", value: drivers.length },
        ].map((item, index) => (
          <div key={index} style={{ ...cardStyle, padding: 24 }}>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 10 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Live Vehicle Status</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Latest known state for each bakkie.
          </p>

          {loading ? (
            <p style={mutedTextStyle}>Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <p style={mutedTextStyle}>No vehicles found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    {["Vehicle", "Driver", "Last Seen", "Speed", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: 14,
                          borderBottom: "1px solid #e5e7eb",
                          color: "#64748b",
                          fontSize: 13,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => {
                    const latest = latestLocationByVehicle.get(vehicle.id);
                    const isOffline = !latest?.recorded_at
                      ? true
                      : Date.now() - new Date(latest.recorded_at).getTime() > 15 * 60 * 1000;

                    return (
                      <tr key={vehicle.id}>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                          {vehicle.nickname || vehicle.registration_number}
                        </td>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                          {vehicle.driver_id ? driverNameById.get(vehicle.driver_id) || "-" : "-"}
                        </td>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                          {formatDateTime(latest?.recorded_at || null)}
                        </td>
                        <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                          {latest?.speed_kmh ?? 0} km/h
                        </td>
                        <td
                          style={{
                            padding: 14,
                            borderBottom: "1px solid #f1f5f9",
                            color: isOffline ? "#dc2626" : "#16a34a",
                            fontWeight: 800,
                          }}
                        >
                          {isOffline ? "Offline" : "Online"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: 26 }}>
          <h2 style={sectionTitleStyle}>Latest Alerts</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
            Recent vehicle safety and tracking alerts.
          </p>

          {loading ? (
            <p style={mutedTextStyle}>Loading alerts...</p>
          ) : openAlerts.length === 0 ? (
            <p style={mutedTextStyle}>No open alerts.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {openAlerts.slice(0, 8).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>
                    {alert.alert_type.replace(/_/g, " ")}
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                    Severity: {alert.severity}
                  </div>
                  <div style={{ color: "#7f1d1d", fontSize: 14, marginBottom: 4 }}>
                    {alert.message}
                  </div>
                  <div style={{ color: "#991b1b", fontSize: 12 }}>
                    {formatDateTime(alert.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 26 }}>
        <h2 style={sectionTitleStyle}>Active Trips</h2>
        <p style={{ ...mutedTextStyle, marginBottom: 18 }}>
          Current fish collection and delivery movements.
        </p>

        {loading ? (
          <p style={mutedTextStyle}>Loading trips...</p>
        ) : activeTrips.length === 0 ? (
          <p style={mutedTextStyle}>No active trips yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
              <thead>
                <tr>
                  {["Origin Port", "Destination Fishery", "Status", "Created"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderBottom: "1px solid #e5e7eb",
                        color: "#64748b",
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                      {trip.origin_port}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {trip.destination_fishery}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", textTransform: "capitalize" }}>
                      {trip.status.replace(/_/g, " ")}
                    </td>
                    <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                      {formatDateTime(trip.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}