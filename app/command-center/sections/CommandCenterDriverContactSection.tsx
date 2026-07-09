import type { Dispatch, SetStateAction } from "react";
import type { FleetVehicle } from "../types";

type Props = {
  filteredFleet: FleetVehicle[];
  selectedVehicleId: string | null;
  setMessage: Dispatch<SetStateAction<string>>;
};

export default function CommandCenterDriverContactSection({
  filteredFleet,
  selectedVehicleId,
  setMessage,
}: Props) {
  const contactVehicle =
    filteredFleet.find((vehicle) => vehicle.id === selectedVehicleId) ||
    filteredFleet[0];

  if (!contactVehicle) {
    return (
      <div style={{ color: "#64748b" }}>
        Select a vehicle to contact the driver.
      </div>
    );
  }

  const dispatchMessage = `HarborGuard Dispatch: Please confirm your status for vehicle ${contactVehicle.registrationNumber}.`;

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 24, margin: "0 0 12px 0" }}>
        Live Driver Contact Center
      </h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>
            {contactVehicle.registrationNumber}
          </div>
          <div style={{ color: "#64748b" }}>
            Driver: {contactVehicle.driverName || "Unassigned"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              setMessage(
                `Prepared driver call for ${contactVehicle.registrationNumber}. Add driver phone numbers to enable click-to-call.`
              )
            }
          >
            Call Driver
          </button>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(dispatchMessage);
              setMessage("Dispatch message copied to clipboard.");
            }}
          >
            Copy Dispatch Message
          </button>

          <button
            onClick={() =>
              setMessage(
                `Driver status check queued for ${contactVehicle.registrationNumber}.`
              )
            }
          >
            Request Status Check
          </button>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            color: "#475569",
            fontSize: 14,
          }}
        >
          Suggested message: {dispatchMessage}
        </div>
      </div>
    </div>
  );
}