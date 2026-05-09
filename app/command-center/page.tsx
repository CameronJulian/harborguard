"use client";

import "leaflet/dist/leaflet.css";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CSSProperties,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMap } from "react-leaflet";
import AppShell from "@/components/AppShell";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const HeatmapLayer = dynamic<any>(
  () => import("react-leaflet-heatmap-layer-v3"),
  { ssr: false }
);

type FleetAlert = {
  id?: string;
  alert_type?: string | null;
  severity?: string | null;
  message?: string | null;
  created_at?: string | null;
};

type FleetStop = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
};

type RoadIncident = {
  id: string;
  type: string;
  title: string;
  latitude: number;
  longitude: number;
  severity: string;
  radius_meters: number;
};

type FleetVehicle = {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  driverName?: string | null;
  isOffline?: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
  speedKmh?: number | null;
  heading?: number | null;
  lastSeen?: string | null;
  openAlerts?: FleetAlert[];
  route?: any[];
  stops?: FleetStop[];
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const buttonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function cleanRoute(route?: any[]) {
  return (route || [])
    .map((p) => {
      const lat = Array.isArray(p) ? toNumber(p[0]) : toNumber(p?.latitude);
      const lng = Array.isArray(p) ? toNumber(p[1]) : toNumber(p?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      if (lat === 0 && lng === 0) return null;

      return [lat, lng] as [number, number];
    })
    .filter((p): p is [number, number] => p !== null);
}

function cleanLatLng(latitude: unknown, longitude: unknown): [number, number] | null {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;

  return [lat, lng];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePosition(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  return [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371e3;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;

  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function secondsSince(value?: string | null) {
  if (!value) return 9999;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 9999;

  return Math.max(0, Math.floor((Date.now() - time) / 1000));
}

function alertLabel(value?: string | null) {
  return (value || "unknown_alert").replace(/_/g, " ").toUpperCase();
}

function vehicleRisk(vehicle: FleetVehicle) {
  const alerts = vehicle.openAlerts || [];
  if (alerts.some((a) => a.severity === "critical")) return "critical";
  if (alerts.some((a) => a.severity === "high")) return "high";
  if (alerts.length > 0) return "alert";
  if (vehicle.isOffline) return "offline";
  return "normal";
}

function riskText(risk: string) {
  if (risk === "critical") return "Critical";
  if (risk === "high") return "High Risk";
  if (risk === "alert") return "Alert";
  if (risk === "offline") return "Offline";
  return "Normal";
}

function riskColor(risk: string) {
  if (risk === "critical") return "#dc2626";
  if (risk === "high") return "#ea580c";
  if (risk === "alert") return "#d97706";
  if (risk === "offline") return "#64748b";
  return "#16a34a";
}

function movementStatus(vehicle: FleetVehicle) {
  if (vehicle.isOffline) return "Offline";

  const age = secondsSince(vehicle.lastSeen);
  if (age > 90) return "Stale";

  const speed = Number(vehicle.speedKmh || 0);

  if (speed <= 2) return "Stopped";
  if (speed <= 10) return "Slow";
  return "Moving";
}

function movementColor(status: string) {
  if (status === "Moving") return "#16a34a";
  if (status === "Slow") return "#d97706";
  if (status === "Stopped") return "#7c3aed";
  if (status === "Stale") return "#ea580c";
  return "#64748b";
}

function replayHref(vehicle: FleetVehicle) {
  const replayDate = vehicle.lastSeen ? new Date(vehicle.lastSeen) : new Date();

  const startDate = new Date(replayDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(replayDate);
  endDate.setHours(23, 59, 59, 999);

  const start = encodeURIComponent(startDate.toISOString());
  const end = encodeURIComponent(endDate.toISOString());

  return `/route-replay?vehicleId=${vehicle.id}&start=${start}&end=${end}&autoplay=1`;
}

function MapFollower({
  position,
  enabled,
}: {
  position: [number, number] | null;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position) return;

    map.flyTo(position, Math.max(map.getZoom(), 13), {
      duration: 1.2,
    });
  }, [enabled, position, map]);

  return null;
}

async function createVehicleIcon(
  risk: string,
  selected: boolean,
  heading = 0,
  status = "Stopped"
) {
  const L = (await import("leaflet")).default;
  const color = riskColor(risk);
  const size = selected ? 36 : 28;
  const coreSize = selected ? 30 : 22;
  const isLive = risk !== "offline" && status !== "Stale";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
      ">
        ${
          isLive
            ? `<div class="hg-live-pulse" style="
                position:absolute;
                left:50%;
                top:50%;
                width:${coreSize}px;
                height:${coreSize}px;
                margin-left:-${coreSize / 2}px;
                margin-top:-${coreSize / 2}px;
                border-radius:9999px;
                background:${color};
                opacity:0.28;
              "></div>`
            : ""
        }

        <div style="
          position:absolute;
          left:50%;
          top:50%;
          width:${coreSize}px;
          height:${coreSize}px;
          margin-left:-${coreSize / 2}px;
          margin-top:-${coreSize / 2}px;
          border-radius:9999px;
          background:${color};
          border:4px solid white;
          box-shadow:0 0 0 ${selected ? "7px" : "4px"} rgba(37,99,235,0.18),0 12px 28px rgba(15,23,42,0.3);
        ">
          <div style="
            position:absolute;
            left:50%;
            top:-8px;
            width:0;
            height:0;
            margin-left:-5px;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-bottom:10px solid ${color};
            transform-origin:50% ${coreSize / 2 + 8}px;
            transform:rotate(${Number.isFinite(heading) ? heading : 0}deg);
            filter:drop-shadow(0 1px 1px rgba(15,23,42,0.25));
          "></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -16],
  });
}

export default function CommandCenterPage() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [threatFeed, setThreatFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [animatedPositions, setAnimatedPositions] = useState<
    Record<string, [number, number]>
  >({});
  const [icons, setIcons] = useState<Record<string, any>>({});
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [followSelected, setFollowSelected] = useState(true);
  const [search, setSearch] = useState("");

  async function loadFleet() {
    try {
      const response = await fetch("/api/fleet/live", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load command center.");
        return;
      }

      setFleet(result.fleet || []);
      setMessage("");
    } catch (err: any) {
      setMessage(err.message || "Failed to load command center.");
    } finally {
      setLoading(false);
    }
  }
  
  async function loadIncidents() {
  try {
    const response = await fetch("/api/road-incidents", { cache: "no-store" });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Failed to load road incidents.");
      return;
    }

    setIncidents(result.incidents || []);
  } catch (err: any) {
    setMessage(err.message || "Failed to load road incidents.");
  }
}
async function loadThreatFeed() {
  try {
    const response = await fetch("/api/fleet/predict-threats", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) return;

    const sorted = (result.predictions || []).sort(
      (a: any, b: any) => b.probability - a.probability
    );

    setThreatFeed(sorted);
  } catch {
    // silent fail
  }
}

  async function runRiskDetection() {
    setMessage("Running risk detection...");

    try {
      const response = await fetch("/api/fleet/detect-risks", {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Risk detection failed.");
        return;
      }

      setMessage(`Risk detection complete. New alerts: ${result.createdCount || 0}`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Risk detection failed.");
    }
  }

  async function triggerPanic(vehicle: FleetVehicle) {
    setMessage(`Triggering panic escalation for ${vehicle.registrationNumber}...`);

    try {
      const response = await fetch("/api/fleet/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          message: `PANIC triggered from Command Center for ${vehicle.registrationNumber}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Panic escalation failed.");
        return;
      }

      setMessage(`Panic escalation triggered for ${vehicle.registrationNumber}.`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Panic escalation failed.");
    }
  }

  async function resolveFirstAlert(vehicle: FleetVehicle) {
    const alert = vehicle.openAlerts?.[0];

    if (!alert?.id) {
      setMessage("No alert available to resolve.");
      return;
    }

    setMessage(`Resolving first alert for ${vehicle.registrationNumber}...`);

    try {
      const response = await fetch("/api/fleet/resolve-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          resolutionNotes: "Resolved from Command Center.",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Alert resolve failed.");
        return;
      }

      setMessage(`Alert resolved for ${vehicle.registrationNumber}.`);
      await loadFleet();
    } catch (err: any) {
      setMessage(err.message || "Alert resolve failed.");
    }
  }

 useEffect(() => {
  loadFleet();
  loadIncidents();
  loadThreatFeed();

  const interval = setInterval(() => {
    loadFleet();
    loadIncidents();
    loadThreatFeed();
  }, 5000);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    let cancelled = false;

    async function buildIcons() {
      const next: Record<string, any> = {};

      for (const vehicle of fleet) {
        next[vehicle.id] = await createVehicleIcon(
          vehicleRisk(vehicle),
          selectedVehicleId === vehicle.id,
          Number(vehicle.heading || 0),
          movementStatus(vehicle)
        );
      }

      if (!cancelled) setIcons(next);
    }

    buildIcons();

    return () => {
      cancelled = true;
    };
  }, [fleet, selectedVehicleId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedPositions((prev) => {
        const next: Record<string, [number, number]> = {};

        fleet.forEach((vehicle) => {
          const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);
          if (!coords) return;

          const previous = prev[vehicle.id];

          if (!previous) {
            next[vehicle.id] = coords;
          } else {
            next[vehicle.id] = interpolatePosition(previous, coords, 0.18);
          }
        });

        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [fleet]);

  const vehiclesWithLocation = useMemo(
    () => fleet.filter((v) => cleanLatLng(v.latitude, v.longitude)),
    [fleet]
  );

  const selectedVehicle = useMemo(
    () => fleet.find((v) => v.id === selectedVehicleId) || null,
    [fleet, selectedVehicleId]
  );

  const selectedPosition = useMemo(() => {
    if (!selectedVehicle) return null;

    return (
      animatedPositions[selectedVehicle.id] ||
      cleanLatLng(selectedVehicle.latitude, selectedVehicle.longitude)
    );
  }, [selectedVehicle, animatedPositions]);

  const filteredFleet = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return fleet;

    return fleet.filter((vehicle) => {
      return [
        vehicle.registrationNumber,
        vehicle.nickname,
        vehicle.driverName,
        movementStatus(vehicle),
        riskText(vehicleRisk(vehicle)),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [fleet, search]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedPosition) return selectedPosition;

    const first = vehiclesWithLocation[0];
    const firstCoords = first
      ? cleanLatLng(first.latitude, first.longitude)
      : null;

    return firstCoords || [-33.9249, 18.4241];
  }, [vehiclesWithLocation, selectedPosition]);

  const summary = useMemo(() => {
    return {
      total: fleet.length,
      mapped: vehiclesWithLocation.length,
      moving: fleet.filter((v) => movementStatus(v) === "Moving").length,
      stopped: fleet.filter((v) => movementStatus(v) === "Stopped").length,
      critical: fleet.filter((v) => vehicleRisk(v) === "critical").length,
      offline: fleet.filter((v) => vehicleRisk(v) === "offline").length,
      alerts: fleet.filter((v) => (v.openAlerts || []).length > 0).length,
      stops: fleet.reduce((total, v) => total + (v.stops?.length || 0), 0),
    };
  }, [fleet, vehiclesWithLocation]);
  
  const globalThreatScore = useMemo(() => {
  if (threatFeed.length === 0) return 0;

  const total = threatFeed.reduce(
    (sum, threat) =>
      sum + Number(threat.probability || 0),
    0
  );

  return Math.round(total / threatFeed.length);
}, [threatFeed]);

const topThreatVehicles = useMemo(() => {
  return [...threatFeed]
    .sort(
      (a, b) =>
        b.probability - a.probability
    )
    .slice(0, 5);
}, [threatFeed]);

const operationalStatus =
  globalThreatScore >= 80
    ? "CRITICAL"
    : globalThreatScore >= 60
    ? "HIGH ALERT"
    : globalThreatScore >= 40
    ? "ELEVATED"
    : "STABLE";

const operationalColor =
  globalThreatScore >= 80
    ? "#dc2626"
    : globalThreatScore >= 60
    ? "#ea580c"
    : globalThreatScore >= 40
    ? "#d97706"
    : "#16a34a";

  return (
    <AppShell>
      <style>{`
        @keyframes hgLivePulse {
          0% { transform: scale(1); opacity: 0.28; }
          70% { transform: scale(2.15); opacity: 0; }
          100% { transform: scale(2.15); opacity: 0; }
        }

        .hg-live-pulse {
          animation: hgLivePulse 2s infinite;
        }
      `}</style>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>
          Command Center
        </h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Live GPS command map with route trails, stop detection, risk alerts, replay, and emergency escalation.
        </p>
      </div>
	  <div
  style={{
    ...cardStyle,
    padding: 24,
    marginBottom: 24,
    background:
      globalThreatScore >= 80
        ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
        : globalThreatScore >= 60
        ? "linear-gradient(135deg,#9a3412,#c2410c)"
        : "linear-gradient(135deg,#0f172a,#1e293b)",
    color: "#fff",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 24,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          opacity: 0.85,
          marginBottom: 8,
        }}
      >
        AI OPERATIONAL STATUS
      </div>

      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {operationalStatus}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 16,
          opacity: 0.92,
        }}
      >
        Fleet-wide autonomous threat intelligence.
      </div>
    </div>

    <div
      style={{
        textAlign: "right",
      }}
    >
      <div
        style={{
          fontSize: 14,
          opacity: 0.85,
          marginBottom: 8,
        }}
      >
        GLOBAL THREAT SCORE
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1,
        }}
      >
        {globalThreatScore}
      </div>

      <div
        style={{
          fontSize: 15,
          opacity: 0.85,
        }}
      >
        /100 Risk Index
      </div>
    </div>
  </div>

  <div
    style={{
      marginTop: 24,
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit,minmax(220px,1fr))",
      gap: 14,
    }}
  >
    {topThreatVehicles.map((threat, index) => (
      <div
        key={index}
        style={{
          background: "rgba(255,255,255,0.08)",
          border:
            "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          {threat.registrationNumber}
        </div>

        <div
          style={{
            opacity: 0.82,
            marginTop: 4,
            fontSize: 14,
          }}
        >
          {threat.nickname || "Fleet Vehicle"}
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 36,
            fontWeight: 900,
          }}
        >
          {threat.probability}%
        </div>

        <div
          style={{
            marginTop: 4,
            color:
              threat.level === "Critical"
                ? "#fecaca"
                : threat.level === "High"
                ? "#fdba74"
                : "#fde68a",
            fontWeight: 800,
          }}
        >
          {threat.level}
        </div>
      </div>
    ))}
  </div>
</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total", value: summary.total, color: "#0f172a" },
          { label: "Mapped", value: summary.mapped, color: "#2563eb" },
          { label: "Moving", value: summary.moving, color: "#16a34a" },
          { label: "Stopped", value: summary.stopped, color: "#7c3aed" },
          { label: "Stops", value: summary.stops, color: "#7c3aed" },
          { label: "Alerts", value: summary.alerts, color: "#d97706" },
          { label: "Critical", value: summary.critical, color: "#dc2626" },
          { label: "Offline", value: summary.offline, color: "#64748b" },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 18 }}>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={loadFleet} style={buttonStyle}>
            Refresh
          </button>

          <button
            onClick={runRiskDetection}
            style={{
              ...buttonStyle,
              border: "none",
              background: "#2563eb",
              color: "#fff",
            }}
          >
            Run Risk Detection
          </button>

          <button
            onClick={() => setShowRoutes((v) => !v)}
            style={{
              ...buttonStyle,
              background: showRoutes ? "#eff6ff" : "#fff",
              color: "#1d4ed8",
            }}
          >
            {showRoutes ? "Hide Routes" : "Show Routes"}
          </button>

          <button
            onClick={() => setShowStops((v) => !v)}
            style={{
              ...buttonStyle,
              background: showStops ? "#faf5ff" : "#fff",
              color: "#7c3aed",
            }}
          >
		  
		  <button
  onClick={() => setShowHeatmap((v) => !v)}
  style={{
    ...buttonStyle,
    background: showHeatmap ? "#fef3c7" : "#fff",
    color: "#d97706",
  }}
>
  {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
</button>
            {showStops ? "Hide Stops" : "Show Stops"}
          </button>

          <button
            onClick={() => setFollowSelected((v) => !v)}
            style={{
              ...buttonStyle,
              background: followSelected ? "#ecfdf5" : "#fff",
              color: "#16a34a",
            }}
          >
            {followSelected ? "Following Vehicle" : "Follow Vehicle"}
          </button>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Live refresh every 5 seconds.
          </div>
        </div>

        {message ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
	  <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
      flexWrap: "wrap",
      gap: 12,
    }}
  >
    <div>
      <h2 style={{ fontSize: 30, margin: 0 }}>
        AI Threat Intelligence
      </h2>

      <div style={{ color: "#64748b", marginTop: 4 }}>
        Predictive operational threat monitoring.
      </div>
    </div>

    <div
      style={{
        padding: "10px 16px",
        borderRadius: 9999,
        background: "#fee2e2",
        color: "#b91c1c",
        fontWeight: 900,
      }}
    >
      {
        threatFeed.filter(
          (t) => t.level === "Critical"
        ).length
      }{" "}
      Critical Threats
    </div>
  </div>

  {threatFeed.length === 0 ? (
    <div style={{ color: "#64748b" }}>
      No predictive threats detected.
    </div>
  ) : (
    <div style={{ display: "grid", gap: 14 }}>
      {threatFeed.slice(0, 5).map((threat, index) => (
        <div
          key={index}
          style={{
            borderRadius: 16,
            padding: 18,
            border:
              threat.level === "Critical"
                ? "2px solid #dc2626"
                : threat.level === "High"
                ? "2px solid #ea580c"
                : "1px solid #e5e7eb",
            background:
              threat.level === "Critical"
                ? "#fff5f5"
                : threat.level === "High"
                ? "#fff7ed"
                : "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {threat.registrationNumber}
              </div>

              <div style={{ color: "#64748b" }}>
                {threat.nickname || "Fleet Vehicle"}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Threat Probability
              </div>

              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color:
                    threat.level === "Critical"
                      ? "#dc2626"
                      : threat.level === "High"
                      ? "#ea580c"
                      : threat.level === "Medium"
                      ? "#d97706"
                      : "#16a34a",
                }}
              >
                {threat.probability}%
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 6,
              color: "#475569",
              fontSize: 14,
            }}
          >
            <div>• Speed: {threat.speed} km/h</div>
            <div>• Open Alerts: {threat.openAlerts}</div>
            <div>
              • Critical Alerts: {threat.criticalAlerts}
            </div>
            <div>
              • Near Incident Zone:{" "}
              {threat.nearIncident ? "Yes" : "No"}
            </div>
            <div>
              • Offline: {threat.isOffline ? "Yes" : "No"}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 4px 0" }}>
            Live Tactical Fleet Map
          </h2>
          <div style={{ color: "#64748b", marginBottom: 12 }}>
            Pulsing markers show live vehicles. Blue trails show movement history. Purple circles show stops.
          </div>

          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              height: 620,
            }}
          >
            <MapContainer center={mapCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapFollower position={selectedPosition} enabled={followSelected} />
			  
			  {showHeatmap && incidents.length > 0 && (
  <HeatmapLayer
    points={incidents.map((incident) => ({
      lat: incident.latitude,
      lng: incident.longitude,
      intensity:
        incident.severity === "critical"
          ? 1
          : incident.severity === "high"
            ? 0.75
            : 0.45,
    }))}
    longitudeExtractor={(p: any) => p.lng}
    latitudeExtractor={(p: any) => p.lat}
    intensityExtractor={(p: any) => p.intensity}
  />
)}
			  
			  {incidents.map((incident) => {
  const coords = cleanLatLng(incident.latitude, incident.longitude);
  if (!coords) return null;

  const color =
    incident.severity === "critical"
      ? "#dc2626"
      : incident.severity === "high"
        ? "#ea580c"
        : "#d97706";

  return (
    <CircleMarker
      key={incident.id}
      center={coords}
      radius={14}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 3,
      }}
    >
      <Popup>
        <div style={{ minWidth: 220 }}>
          <strong>{incident.title}</strong>
          <br />
          Type: {incident.type}
          <br />
          Severity: {incident.severity}
          <br />
          Radius: {incident.radius_meters}m
        </div>
      </Popup>
    </CircleMarker>
  );
})}

              {vehiclesWithLocation.map((vehicle) => {
                const risk = vehicleRisk(vehicle);
                const icon = icons[vehicle.id];
                const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);
                const routePoints = cleanRoute(vehicle.route);
                const selected = selectedVehicleId === vehicle.id;
                const markerPosition = animatedPositions[vehicle.id] || coords;

                if (!icon || !coords || !markerPosition) return null;

                return (
                  <Fragment key={vehicle.id}>
                    {showRoutes && routePoints.length > 1 ? (
                      <>
                        <Polyline
                          positions={routePoints}
                          pathOptions={{
                            color: "#0f172a",
                            weight: selected ? 10 : 7,
                            opacity: selected ? 0.18 : 0.12,
                            lineJoin: "round",
                            lineCap: "round",
                          }}
                        />
                        <Polyline
                          positions={routePoints}
                          pathOptions={{
                            color: selected ? "#2563eb" : "#3b82f6",
                            weight: selected ? 5 : 3,
                            opacity: selected ? 0.98 : 0.85,
                            lineJoin: "round",
                            lineCap: "round",
                          }}
                        />
                        <Polyline
                          positions={routePoints}
                          pathOptions={{
                            color: "#bfdbfe",
                            weight: selected ? 2 : 1,
                            opacity: selected ? 0.95 : 0.75,
                            lineJoin: "round",
                            lineCap: "round",
                          }}
                        />
                      </>
                    ) : null}

                    {showStops &&
                      (vehicle.stops || []).map((stop) => {
                        const stopCoords = cleanLatLng(stop.latitude, stop.longitude);
                        if (!stopCoords) return null;

                        return (
                          <CircleMarker
                            key={stop.id}
                            center={stopCoords}
                            radius={selected ? 8 : 6}
                            pathOptions={{
                              color: "#7c3aed",
                              fillColor: "#a855f7",
                              fillOpacity: 0.65,
                              weight: 2,
                            }}
                          >
                            <Popup>
                              <div style={{ minWidth: 180 }}>
                                <strong>Stop detected</strong>
                                <br />
                                Vehicle: {vehicle.registrationNumber}
                                <br />
                                Started: {formatDateTime(stop.started_at)}
                                <br />
                                Ended: {formatDateTime(stop.ended_at)}
                                <br />
                                Duration: {Math.round((stop.duration_seconds || 0) / 60)} min
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}

                    <Marker
                      position={markerPosition}
                      icon={icon}
                      eventHandlers={{
                        click: () => setSelectedVehicleId(vehicle.id),
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 250 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
                            {vehicle.registrationNumber}
                          </div>
                          <div style={{ color: "#64748b", marginBottom: 8 }}>
                            Nickname: {vehicle.nickname || "-"}
                          </div>

                          <div>
                            <strong>Status:</strong>{" "}
                            <span style={{ color: riskColor(risk), fontWeight: 800 }}>
                              {riskText(risk)}
                            </span>
                          </div>
                          <div>
                            <strong>Movement:</strong>{" "}
                            <span style={{ color: movementColor(movementStatus(vehicle)), fontWeight: 800 }}>
                              {movementStatus(vehicle)}
                            </span>
                          </div>
                          <div>
                            <strong>Driver:</strong> {vehicle.driverName || "-"}
                          </div>
                          <div>
                            <strong>Speed:</strong> {Math.round(vehicle.speedKmh || 0)} km/h
                          </div>
                          <div>
                            <strong>Heading:</strong> {Math.round(vehicle.heading || 0)}°
                          </div>
                          <div>
                            <strong>Last Seen:</strong> {formatDateTime(vehicle.lastSeen)}
                          </div>
                          <div>
                            <strong>Updated:</strong> {secondsSince(vehicle.lastSeen)}s ago
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <strong>Route Points:</strong> {routePoints.length}
                            <br />
                            <strong>Stops:</strong> {vehicle.stops?.length || 0}
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <Link
                              href={replayHref(vehicle)}
                              style={{
                                textDecoration: "none",
                                borderRadius: 10,
                                background: "#2563eb",
                                color: "#fff",
                                padding: "8px 10px",
                                fontWeight: 800,
                              }}
                            >
                              Replay
                            </Link>

                            <button
                              onClick={() => triggerPanic(vehicle)}
                              style={{
                                borderRadius: 10,
                                background: "#dc2626",
                                color: "#fff",
                                padding: "8px 10px",
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              Panic
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 24 }}>
          <h2 style={{ fontSize: 28, margin: "0 0 16px 0" }}>
            Active Operations
          </h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle, driver, status..."
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              marginBottom: 16,
              fontSize: 14,
            }}
          />

          {loading ? (
            <div>Loading command center...</div>
          ) : filteredFleet.length === 0 ? (
            <div style={{ color: "#64748b" }}>No vehicles found.</div>
          ) : (
            <div style={{ display: "grid", gap: 14, maxHeight: 620, overflowY: "auto" }}>
              {filteredFleet.map((vehicle) => {
                const risk = vehicleRisk(vehicle);
                const alerts = vehicle.openAlerts || [];
                const selected = selectedVehicleId === vehicle.id;
                const routePoints = cleanRoute(vehicle.route);
                const status = movementStatus(vehicle);
				const nearbyIncidents = incidents.filter((incident) => {
  const coords = cleanLatLng(
    vehicle.latitude,
    vehicle.longitude
  );

  if (!coords) return false;

  const distance = calculateDistanceMeters(
    coords[0],
    coords[1],
    incident.latitude,
    incident.longitude
  );

  return distance <= incident.radius_meters;
});

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    style={{
                      border: selected
                        ? "2px solid #2563eb"
                        : `1px solid ${risk === "normal" ? "#e5e7eb" : "#fecaca"}`,
                      borderRadius: 16,
                      padding: 16,
                      background: risk === "critical" ? "#fff7f7" : selected ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>
                          {vehicle.registrationNumber}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 14 }}>
                          {vehicle.nickname || "-"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: riskColor(risk), fontWeight: 900 }}>
                          {riskText(risk)}
                        </div>
                        <div style={{ color: movementColor(status), fontWeight: 800, fontSize: 13 }}>
                          {status}
                        </div>
                      </div>
                    </div>

                    <div style={{ color: "#334155", fontSize: 14, marginTop: 10 }}>
                      Driver: {vehicle.driverName || "-"}
                    </div>
                    <div style={{ color: "#334155", fontSize: 14 }}>
                      Speed: {Math.round(vehicle.speedKmh || 0)} km/h
                    </div>
                    <div style={{ color: "#334155", fontSize: 14 }}>
                      Updated: {secondsSince(vehicle.lastSeen)}s ago
                    </div>
                    <div style={{ color: "#334155", fontSize: 14 }}>
                      Last Seen: {formatDateTime(vehicle.lastSeen)}
                    </div>
                    <div style={{ color: "#334155", fontSize: 14 }}>
                      Route Points: {routePoints.length} | Stops: {vehicle.stops?.length || 0}
                    </div>

                    {alerts.length > 0 ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                        {alerts.slice(0, 3).map((alert, index) => (
                          <div
                            key={alert.id || index}
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              fontSize: 13,
                            }}
                          >
                            <strong>{alertLabel(alert.alert_type)}</strong>
                            <br />
                            {alert.message || "No message"}
                          </div>
                        ))}
                      </div>
                    ) : null}
					
					{nearbyIncidents.length > 0 && (
  <div
    style={{
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      background: "rgba(220, 38, 38, 0.12)",
      border: "1px solid rgba(220,38,38,0.35)",
      display: "grid",
      gap: 8,
    }}
  >
    <div
      style={{
        fontWeight: 800,
        color: "#dc2626",
      }}
    >
      Threat Alerts
    </div>

    {nearbyIncidents.map((incident) => (
      <div
        key={incident.id}
        style={{
          color: "#991b1b",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        ⚠ {incident.title} ({incident.severity})
      </div>
    ))}
  </div>
)}

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <Link
                        href={replayHref(vehicle)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          textDecoration: "none",
                          borderRadius: 10,
                          background: "#2563eb",
                          color: "#fff",
                          padding: "8px 10px",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        Replay
                      </Link>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerPanic(vehicle);
                        }}
                        style={{
                          borderRadius: 10,
                          background: "#dc2626",
                          color: "#fff",
                          padding: "8px 10px",
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        Panic
                      </button>

                      {alerts.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveFirstAlert(vehicle);
                          }}
                          style={{
                            borderRadius: 10,
                            border: "1px solid #16a34a",
                            color: "#16a34a",
                            padding: "8px 10px",
                            fontWeight: 800,
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 13,
                          }}
                        >
                          Resolve
                        </button>
                      ) : null}

                      <Link
                        href="/risk-dashboard"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          textDecoration: "none",
                          borderRadius: 10,
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          padding: "8px 10px",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        Risk Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}