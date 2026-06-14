"use client";

import { fetchWithAuth } from "@/lib/auth-fetch";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

type Trip = {
  id: string;
  vehicle_id: string;
  driver_id?: string | null;
  origin_port?: string | null;
  destination_fishery?: string | null;
  planned_departure?: string | null;
  status?: string | null;
  created_at?: string | null;
  vehicle?: {
    registration_number?: string | null;
    nickname?: string | null;
  } | null;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";

  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusColor(status?: string | null) {
  const value = (status || "").toLowerCase();

  if (value === "emergency") return "#dc2626";
  if (value === "active") return "#16a34a";
  if (value === "completed") return "#64748b";
  if (value === "scheduled") return "#2563eb";
  if (value === "en_route_to_port") return "#ea580c";

  return "#475569";
}

function tripDuration(value?: string | null) {
  if (!value) return "-";

  const start = new Date(value).getTime();

  if (!Number.isFinite(start)) return "-";

  const diff = Math.max(0, Date.now() - start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

export default function TripsPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTrips() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchWithAuth("/api/fleet/trips", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load trips.");
        return;
      }

      setTrips(result.trips || []);
    } catch (err: any) {
      setMessage(err.message || "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  const summary = useMemo(() => {
    return {
      total: trips.length,
      active: trips.filter((t) => t.status === "active").length,
      scheduled: trips.filter((t) => t.status === "scheduled").length,
      emergency: trips.filter((t) => t.status === "emergency").length,
      completed: trips.filter((t) => t.status === "completed").length,
    };
  }, [trips]);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, margin: "0 0 8px 0" }}>Trips</h1>
        <p style={{ color: "#64748b", margin: 0 }}>
          Monitor scheduled, active, completed, and emergency trips.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 18,
          marginBottom: 24,
        }}
      >
        {[
          ["Total", summary.total],
          ["Scheduled", summary.scheduled],
          ["Active", summary.active],
          ["Emergency", summary.emergency],
          ["Completed", summary.completed],
        ].map(([label, value]) => (
          <div key={label} style={{ ...cardStyle, padding: 22 }}>
            <div style={{ color: "#64748b" }}>{label}</div>
            <div style={{ fontSize: 34, fontWeight: 900 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 28, margin: 0 }}>Trip Register</h2>
          <button
            onClick={loadTrips}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              fontWeight: 800,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {message && <p style={{ color: "#dc2626" }}>{message}</p>}
        {loading && <p>Loading trips...</p>}
        {!loading && trips.length === 0 && <p>No trips found.</p>}

        {!loading && trips.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {trips.map((trip) => {
              const vehicleName =
                trip.vehicle?.registration_number ||
                trip.vehicle?.nickname ||
                trip.vehicle_id;

              return (
                <div
                  key={trip.id}
                  onClick={() =>
                    router.push(`/route-replay?vehicleId=${trip.vehicle_id}`)
                  }
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 18,
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1fr 1fr 1fr 0.8fr",
                    gap: 16,
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 18 }}>{vehicleName}</strong>
                    <div style={{ color: "#64748b" }}>
                      {trip.vehicle?.nickname || "Vehicle"}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#64748b" }}>Origin</div>
                    <strong>{trip.origin_port || "-"}</strong>
                  </div>

                  <div>
                    <div style={{ color: "#64748b" }}>Destination</div>
                    <strong>{trip.destination_fishery || "-"}</strong>
                  </div>

                  <div>
                    <div style={{ color: "#64748b" }}>Departure</div>
                    <strong>{formatDate(trip.planned_departure || trip.created_at)}</strong>
                    <div style={{ color: "#64748b", marginTop: 6 }}>Duration</div>
                    <strong>{tripDuration(trip.planned_departure || trip.created_at)}</strong>
                  </div>

                  <div
                    style={{
                      color: statusColor(trip.status),
                      fontWeight: 900,
                    }}
                  >
                    {formatStatus(trip.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}


