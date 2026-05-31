"use client";

import { CSSProperties, FormEvent, useEffect, useState } from "react";
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
  vehicle?: Vehicle;
  error?: string;
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
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editName, setEditName] = useState("");
  const [editRegistrationNumber, setEditRegistrationNumber] = useState("");
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");

  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  async function loadVehicles() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/fleet/vehicles", {
        cache: "no-store",
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load vehicles");
      }

      setVehicles(Array.isArray(result.vehicles) ? result.vehicles : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  async function handleAddVehicle(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  nickname: name,
  registration_number: registrationNumber,
  make,
  model,
  status: "active",

        }),
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add vehicle");
      }

      setSuccess("Vehicle added successfully.");
      setName("");
      setRegistrationNumber("");
      setMake("");
      setModel("");

      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setEditName(vehicle.nickname || vehicle.name || "");
    setEditRegistrationNumber(vehicle.registration_number || vehicle.registrationNumber || "");
    setEditMake(vehicle.make || "");
    setEditModel(vehicle.model || "");
  }

  async function handleUpdateVehicle(event: FormEvent) {
    event.preventDefault();
    if (!editingVehicle) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/fleet/vehicles/${editingVehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editName,
          registration_number: editRegistrationNumber,
          make: editMake,
          model: editModel,
        }),
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update vehicle");
      }

      setSuccess("Vehicle updated successfully.");
      setEditingVehicle(null);
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm("Deactivate this vehicle? It will remain in HarborGuard but can no longer be used.");
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/fleet/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete vehicle");
      }

      setSuccess("Vehicle deactivated successfully.");
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24 }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Vehicles</h1>
        <p style={{ color: "#64748b" }}>
          Registered fleet vehicles and tracking status.
        </p>
      </div>

      <form
        onSubmit={handleAddVehicle}
        style={{ ...cardStyle, padding: 24, marginBottom: 24 }}
      >
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Add Vehicle</h2>

        <div style={{ display: "grid", gap: 14 }}>
          <input
            style={inputStyle}
            placeholder="Vehicle name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <input
            style={inputStyle}
            placeholder="Registration number"
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value)}
            required
          />

          <input
            style={inputStyle}
            placeholder="Make"
            value={make}
            onChange={(event) => setMake(event.target.value)}
          />

          <input
            style={inputStyle}
            placeholder="Model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              border: "none",
              background: saving ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Adding..." : "Add Vehicle"}
          </button>
        </div>
      </form>

      {editingVehicle && (
        <form
          onSubmit={handleUpdateVehicle}
          style={{ ...cardStyle, padding: 24, marginBottom: 24 }}
        >
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>Edit Vehicle</h2>

          <div style={{ display: "grid", gap: 14 }}>
            <input
              style={inputStyle}
              placeholder="Vehicle name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              required
            />

            <input
              style={inputStyle}
              placeholder="Registration number"
              value={editRegistrationNumber}
              onChange={(event) => setEditRegistrationNumber(event.target.value)}
              required
            />

            <input
              style={inputStyle}
              placeholder="Make"
              value={editMake}
              onChange={(event) => setEditMake(event.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Model"
              value={editModel}
              onChange={(event) => setEditModel(event.target.value)}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: saving ? "#94a3b8" : "#2563eb",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                style={{
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {error && (
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
      )}

      {success && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "#dcfce7",
            color: "#166534",
            marginBottom: 24,
          }}
        >
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#64748b" }}>Loading vehicles...</div>
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

            function startEditing(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setEditName(vehicle.nickname || vehicle.name || "");
    setEditRegistrationNumber(vehicle.registration_number || vehicle.registrationNumber || "");
    setEditMake(vehicle.make || "");
    setEditModel(vehicle.model || "");
  }

  async function handleUpdateVehicle(event: FormEvent) {
    event.preventDefault();
    if (!editingVehicle) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/fleet/vehicles/${editingVehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editName,
          registration_number: editRegistrationNumber,
          make: editMake,
          model: editModel,
        }),
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update vehicle");
      }

      setSuccess("Vehicle updated successfully.");
      setEditingVehicle(null);
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vehicle");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm("Deactivate this vehicle? It will remain in HarborGuard but can no longer be used.");
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/fleet/vehicles/${vehicle.id}`, {
        method: "DELETE",
      });

      const result: VehiclesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete vehicle");
      }

      setSuccess("Vehicle deactivated successfully.");
      await loadVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vehicle");
    } finally {
      setSaving(false);
    }
  }

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

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => startEditing(vehicle)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeactivateVehicle(vehicle)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: "#dc2626",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}





