import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type { FleetVehicle } from "../types";

type Props = {
  filteredFleet: FleetVehicle[];
  setSelectedVehicleId: Dispatch<SetStateAction<string | null>>;
  vehicleRisk: (vehicle: FleetVehicle) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  triggerPanic: (vehicle: FleetVehicle) => void;
  replayHref: (vehicle: FleetVehicle) => string;
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

export default function CommandCenterPriorityQueueSection({
  filteredFleet,
  setSelectedVehicleId,
  vehicleRisk,
  movementStatus,
  triggerPanic,
  replayHref,
}: Props) {
  return (
    <div style={{ ...cardStyle, padding: 24 }}>
      <h2 style={{ fontSize: 24, margin: "0 0 12px 0" }}>
        Priority Response Queue
      </h2>

      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {[...filteredFleet]
          .map((vehicle) => {
            const alerts = vehicle.openAlerts || [];
            const baseRisk = vehicleRisk(vehicle);
            const status = movementStatus(vehicle);

            const score = Math.min(
              100,
              alerts.length * 10 +
                alerts.filter((alert) => alert.severity === "critical").length * 20 +
                (baseRisk === "offline" ? 15 : 0) +
                (status === "Stopped" ? 5 : 0)
            );

            const level =
              score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

            return { vehicle, score, level };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((item, index) => (
            <div
              key={item.vehicle.id}
              onClick={() => setSelectedVehicleId(item.vehicle.id)}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: item.level === "LOW" ? "#f8fafc" : "#fef3c7",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                #{index + 1} {item.vehicle.registrationNumber}
              </div>

              <div style={{ fontSize: 13, color: "#475569" }}>
                Risk {item.score}/100 - {item.level}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVehicleId(item.vehicle.id);
                  }}
                >
                  Track Live
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerPanic(item.vehicle);
                  }}
                >
                  Create Case
                </button>

                <Link
                  href={replayHref(item.vehicle)}
                  onClick={(e) => e.stopPropagation()}
                >
                  Open Replay
                </Link>

                {(item.level === "HIGH" || item.level === "CRITICAL") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerPanic(item.vehicle);
                    }}
                  >
                    Escalate
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}