"use client";

import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Vehicle = {
  id: string;
  registration_number?: string | null;
  registrationNumber?: string | null;
  nickname?: string | null;
  name?: string | null;
  make?: string | null;
  model?: string | null;
  driver_id?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  created_at?: string | null;
};

type VehiclesResponse = {
  success?: boolean;
  vehicles?: Vehicle[];
  error?: string;
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/fleet/vehicles", {
          cache: "no-store",
        });

        const result: VehiclesResponse = await response.json();

        console.log("VEHICLES RESPONSE:", result);

        if (!response.ok) {
          throw new Error(result.error || "Failed to load vehicles");
        }

        setVehicles(Array.isArray(result.vehicles) ? result.vehicles : []);
      } catch (err) {
        console.error("VEHICLES LOAD ERROR:", err);

        setError(
          err instanceof Error ? err.message : "Failed to load vehicles"
        );
      } finally {
        setLoading(false);
      }
    }

    loadVehicles();
  }, []);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Vehicles</h1>

        <p style={{ color: "#64748b" }}>
          Registered fleet vehicles and tracking status.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading vehicles...</div>
      ) : error ? (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#fee2e2",
            color: "#991b1b",
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ color: "#64748b" }}>No vehicles found.</div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {vehicles.map((vehicle) => {
            const registration =
              vehicle.registration_number ||
              vehicle.registrationNumber ||
              "-";

            const displayName = vehicle.nickname || vehicle.name || registration;

            const isActive =
              vehicle.is_active === true ||
              vehicle.status === "active" ||
              vehicle.status === "online";

            return (
              <div key={vehicle.id} style={{ ...cardStyle, padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>
                      {displayName}
                    </div>

                    <div style={{ color: "#64748b" }}>{registration}</div>
                  </div>

                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: isActive ? "#dcfce7" : "#fee2e2",
                      color: isActive ? "#166534" : "#991b1b",
                      fontWeight: 700,
                    }}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <div style={{ color: "#334155", marginBottom: 6 }}>
                  <strong>Make:</strong> {vehicle.make || "-"}
                </div>

                <div style={{ color: "#334155", marginBottom: 6 }}>
                  <strong>Model:</strong> {vehicle.model || "-"}
                </div>

                <div style={{ color: "#334155", marginBottom: 6 }}>
                  <strong>Driver ID:</strong> {vehicle.driver_id || "-"}
                </div>

                <div style={{ color: "#64748b", fontSize: 14 }}>
                  Added:{" "}
                  {vehicle.created_at
                    ? new Date(vehicle.created_at).toLocaleString()
                    : "-"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}