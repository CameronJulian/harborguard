import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { fetchWithAuth } from "@/lib/auth-fetch";
import type { FleetVehicle } from "../types";
import { cleanLatLng, cleanRoute } from "../utils";

type UseCommandCenterRouteSafetyOptions = {
  setMessage: Dispatch<SetStateAction<string>>;
  loadFleet: () => Promise<void>;
  loadThreatFeed: () => Promise<void>;
  decodePolyline: (encoded: string) => [number, number][];
};

export function useCommandCenterRouteSafety({
  setMessage,
  loadFleet,
  loadThreatFeed,
  decodePolyline,
}: UseCommandCenterRouteSafetyOptions) {
  const [routePrediction, setRoutePrediction] = useState<any | null>(null);
  const [routePredictionLoading, setRoutePredictionLoading] = useState(false);
  const [routeRerouteLoading, setRouteRerouteLoading] = useState(false);
  const [routeAssignLoading, setRouteAssignLoading] = useState(false);

  async function loadRouteSafetyPrediction(vehicle: FleetVehicle) {
    const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);

    if (!coords) {
      setMessage(
        "Vehicle has no valid location for route safety prediction."
      );
      return;
    }

    const routePoints = cleanRoute(vehicle.route);
    const activeTripPoints =
      vehicle.activeTrip?.expectedRoute?.points || [];

    const activeTripDestination =
      activeTripPoints.length > 0
        ? activeTripPoints[activeTripPoints.length - 1]
        : null;

    const destination: [number, number] = activeTripDestination
      ? [
          Number(activeTripDestination.latitude),
          Number(activeTripDestination.longitude),
        ]
      : routePoints.length > 0
        ? routePoints[routePoints.length - 1]
        : coords;

    setRoutePredictionLoading(true);

    try {
      const response = await fetchWithAuth(
        "/api/route-safety/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            vehicleId: vehicle.id,
            tripId: vehicle.activeTrip?.id ?? null,
            origin: {
              lat: coords[0],
              lng: coords[1],
            },
            destination: {
              lat: destination[0],
              lng: destination[1],
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Failed to predict route safety."
        );
        return;
      }

      setRoutePrediction({
        vehicle,
        ...result,
      });
    } catch (error: any) {
      setMessage(
        error.message || "Failed to predict route safety."
      );
    } finally {
      setRoutePredictionLoading(false);
    }
  }

  async function loadSaferRouteOptions() {
    if (!routePrediction?.vehicle) {
      setMessage("Run route safety prediction first.");
      return;
    }

    const vehicle = routePrediction.vehicle as FleetVehicle;
    const coords = cleanLatLng(
      vehicle.latitude,
      vehicle.longitude
    );

    if (!coords) {
      setMessage(
        "Vehicle has no valid location for rerouting."
      );
      return;
    }

    const routePoints = cleanRoute(vehicle.route);
    const activeTripPoints =
      vehicle.activeTrip?.expectedRoute?.points || [];

    const activeTripDestination =
      activeTripPoints.length > 0
        ? activeTripPoints[activeTripPoints.length - 1]
        : null;

    const destination: [number, number] = activeTripDestination
      ? [
          Number(activeTripDestination.latitude),
          Number(activeTripDestination.longitude),
        ]
      : routePoints.length > 0
        ? routePoints[routePoints.length - 1]
        : coords;

    setRouteRerouteLoading(true);

    try {
      const response = await fetchWithAuth(
        "/api/route-safety/reroute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            origin: {
              lat: coords[0],
              lng: coords[1],
            },
            destination: {
              lat: destination[0],
              lng: destination[1],
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Failed to calculate safer routes."
        );
        return;
      }

      setRoutePrediction((current: any) =>
        current
          ? {
              ...current,
              saferRoutes: result.routes || [],
              rerouteRecommendation: result.recommendation,
            }
          : current
      );

      setMessage("Safer route options loaded.");
    } catch (error: any) {
      setMessage(
        error.message || "Failed to calculate safer routes."
      );
    } finally {
      setRouteRerouteLoading(false);
    }
  }

  async function assignSaferRouteToDriver(route: any) {
    if (!routePrediction?.vehicle?.id) {
      setMessage("Run route safety prediction first.");
      return;
    }

    if (!route) {
      setMessage("No safer route selected.");
      return;
    }

    setRouteAssignLoading(true);

    try {
      const response = await fetchWithAuth(
        "/api/fleet/assign-route",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            vehicleId: routePrediction.vehicle.id,
            route,
            reason:
              `Safer route assigned due to ` +
              `${routePrediction.riskLevel} route risk ` +
              `(${routePrediction.riskScore}/100).`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Failed to send route to driver."
        );
        return;
      }

      setMessage("Safer route sent to driver.");
    } catch (error: any) {
      setMessage(
        error.message || "Failed to send route to driver."
      );
    } finally {
      setRouteAssignLoading(false);
    }
  }

  async function escalateRouteThreat(threat: any) {
    if (!routePrediction?.vehicle?.id) {
      setMessage(
        "Select a vehicle and run route prediction first."
      );
      return;
    }

    try {
      setMessage("Escalating route safety threat...");

      const registration =
        routePrediction.vehicle.registrationNumber ||
        routePrediction.vehicle.registration_number ||
        "selected vehicle";

      const response = await fetchWithAuth(
        "/api/route-safety/escalate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            vehicleId: routePrediction.vehicle.id,
            tripId:
              routePrediction.vehicle.activeTrip?.id || null,
            alertId: threat.id,
            riskScore: routePrediction.riskScore,
            riskLevel: routePrediction.riskLevel,
            message:
              `Route safety escalation: ` +
              `${threat.title || "Threat ahead"} for ` +
              `${registration}. ` +
              `${routePrediction.driverWarning || ""}`,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error || "Route safety escalation failed."
        );
        return;
      }

      if (result.skipped === "duplicate_open_alert") {
        setMessage(
          "This route safety threat already has an open fleet alert."
        );
        return;
      }

      setMessage(
        `Route safety escalation created: ${
          result.incidentCode || "incident opened"
        }.`
      );

      await loadFleet();
      await loadThreatFeed();
    } catch (error: any) {
      setMessage(
        error.message || "Route safety escalation failed."
      );
    }
  }

  const saferRoutePolylines = useMemo(() => {
    return (
      routePrediction?.saferRoutes
        ?.filter((route: any) => route.encodedPolyline)
        .map((route: any) =>
          decodePolyline(route.encodedPolyline)
        ) || []
    );
  }, [routePrediction, decodePolyline]);

  return {
    routePrediction,
    routePredictionLoading,
    routeRerouteLoading,
    routeAssignLoading,
    saferRoutePolylines,
    loadRouteSafetyPrediction,
    loadSaferRouteOptions,
    assignSaferRouteToDriver,
    escalateRouteThreat,
  };
}
