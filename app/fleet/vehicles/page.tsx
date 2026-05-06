"use client";

import { CSSProperties, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Vehicle = {
  id: string;
  registration_number: string;
  nickname: string | null;
  make: string | null;
  model: string | null;
  driver_id: string | null;
  is_active: boolean;
  created_at: string;
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

  useEffect(() => {
    async function loadVehicles() {
      try {
        const response = await fetch("/fleet/vehicles");
        const result = await response.json();

        setVehicles(result.vehicles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadVehicles();
  }, []);

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>
          Vehicles
        </h1>

        <p style={{ color: "#64748b" }}>
          Registered fleet vehicles and tracking status.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading vehicles...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              style={{
                ...cardStyle,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {vehicle.nickname || vehicle.registration_number}
                  </div>

                  <div style={{ color: "#64748b" }}>
                    {vehicle.registration_number}
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: vehicle.is_active
                      ? "#dcfce7"
                      : "#fee2e2",
                    color: vehicle.is_active
                      ? "#166534"
                      : "#991b1b",
                    fontWeight: 700,
                  }}
                >
                  {vehicle.is_active ? "Active" : "Inactive"}
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
                Added: {new Date(vehicle.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}