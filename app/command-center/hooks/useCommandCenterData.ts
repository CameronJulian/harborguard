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
  };
}
