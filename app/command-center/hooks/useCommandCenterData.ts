import { useCallback, useState } from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";
import type {
  CommandCenterGeofence,
  FleetVehicle,
  RoadIncident,
} from "../types";

export function useCommandCenterData() {
  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [threatFeed, setThreatFeed] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<CommandCenterGeofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadFleet = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/fleet/live", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load command center.");
        return;
      }

      setFleet(result.fleet || []);
      setMessage("");
    } catch (error: any) {
      setMessage(error.message || "Failed to load command center.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/route-safety/active", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to load road incidents.");
        return;
      }

      setIncidents(result.incidents || []);
    } catch (error: any) {
      setMessage(error.message || "Failed to load road incidents.");
    }
  }, []);

  const loadThreatFeed = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/fleet/predict-threats", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        return;
      }

      const sorted = (result.predictions || []).sort(
        (a: any, b: any) => b.probability - a.probability
      );

      setThreatFeed(sorted);
    } catch {
      // Keep the current threat feed when refresh fails.
    }
  }, []);

  const loadGeofenceOverlay = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/geofences", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.ok) {
        setGeofences(
          (result.geofences || []).filter(
            (zone: CommandCenterGeofence) => zone.is_active
          )
        );
      }
    } catch (error) {
      console.error("Failed to load geofence overlay:", error);
    }
  }, []);

  const runRiskDetection = useCallback(async () => {
    setMessage("Running risk detection...");

    try {
      const response = await fetchWithAuth("/api/fleet/detect-risks", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Risk detection failed.");
        return;
      }

      setMessage(
        `Risk detection complete. New alerts: ${result.createdCount || 0}`
      );

      await loadFleet();
    } catch (error: any) {
      setMessage(error.message || "Risk detection failed.");
    }
  }, [loadFleet]);

  const triggerPanic = useCallback(
    async (vehicle: FleetVehicle) => {
      setMessage(
        `Triggering panic escalation for ${vehicle.registrationNumber}...`
      );

      try {
        const response = await fetchWithAuth("/api/fleet/panic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicleId: vehicle.id,
            message:
              `PANIC triggered from Command Center for ` +
              `${vehicle.registrationNumber}`,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Panic escalation failed.");
          return;
        }

        setMessage(
          `Panic escalation triggered for ${vehicle.registrationNumber}.`
        );

        await loadFleet();
      } catch (error: any) {
        setMessage(error.message || "Panic escalation failed.");
      }
    },
    [loadFleet]
  );

  const resolveFirstAlert = useCallback(
    async (vehicle: FleetVehicle) => {
      const alert = vehicle.openAlerts?.[0];

      if (!alert?.id) {
        setMessage("No alert available to resolve.");
        return;
      }

      setMessage(
        `Resolving first alert for ${vehicle.registrationNumber}...`
      );

      try {
        const response = await fetchWithAuth(
          "/api/fleet/resolve-alert",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              alertId: alert.id,
              resolutionNotes: "Resolved from Command Center.",
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setMessage(result.error || "Alert resolve failed.");
          return;
        }

        setMessage(
          `Alert resolved for ${vehicle.registrationNumber}.`
        );

        await loadFleet();
      } catch (error: any) {
        setMessage(error.message || "Alert resolve failed.");
      }
    },
    [loadFleet]
  );
  return {
    fleet,
    incidents,
    threatFeed,
    geofences,
    loading,
    message,
    setMessage,
    loadFleet,
    loadIncidents,
    loadThreatFeed,
    loadGeofenceOverlay,
    runRiskDetection,
    triggerPanic,
    resolveFirstAlert,
  };
}


