import { useMemo } from "react";

import type {
  FleetVehicle,
  RoadIncident,
} from "../types";

import {
  cleanLatLng,
  movementStatus,
  riskText,
  vehicleRisk,
} from "../utils";

export function useCommandCenterFleet({
  fleet,
  search,
  selectedVehicleId,
  animatedPositions,
  incidents,
}: {
  fleet: FleetVehicle[];
  search: string;
  selectedVehicleId: string | null;
  animatedPositions: Record<string, [number, number]>;
  incidents: RoadIncident[];
}) {

  const vehiclesWithLocation = useMemo(
    () =>
      fleet.filter(v =>
        cleanLatLng(v.latitude, v.longitude)
      ),
    [fleet]
  );

  const selectedVehicle = useMemo(
    () =>
      fleet.find(
        v => v.id === selectedVehicleId
      ) || null,
    [fleet, selectedVehicleId]
  );

  const selectedPosition = useMemo(() => {

    if (!selectedVehicle)
      return null;

    return (
      animatedPositions[selectedVehicle.id] ||
      cleanLatLng(
        selectedVehicle.latitude,
        selectedVehicle.longitude
      )
    );

  }, [
    selectedVehicle,
    animatedPositions,
  ]);

  const filteredFleet = useMemo(() => {

    const term =
      search.trim().toLowerCase();

    if (!term)
      return fleet;

    return fleet.filter(vehicle =>
      [
        vehicle.registrationNumber,
        vehicle.nickname,
        vehicle.driverName,
        movementStatus(vehicle),
        riskText(vehicleRisk(vehicle)),
      ]
        .filter(Boolean)
        .some(v =>
          String(v)
            .toLowerCase()
            .includes(term)
        )
    );

  }, [fleet, search]);

  const mapCenter = useMemo<[number, number]>(() => {

    if (selectedPosition)
      return selectedPosition;

    const first =
      vehiclesWithLocation[0];

    const coords =
      first
        ? cleanLatLng(
            first.latitude,
            first.longitude
          )
        : null;

    return coords || [-33.9249, 18.4241];

  }, [
    vehiclesWithLocation,
    selectedPosition,
  ]);

  const summary = useMemo(() => ({

    total: fleet.length,

    mapped: vehiclesWithLocation.length,

    moving:
      fleet.filter(
        v => movementStatus(v) === "Moving"
      ).length,

    stopped:
      fleet.filter(
        v => movementStatus(v) === "Stopped"
      ).length,

    critical:
      fleet.filter(
        v => vehicleRisk(v) === "critical"
      ).length,

    offline:
      fleet.filter(
        v => vehicleRisk(v) === "offline"
      ).length,

    alerts:
      fleet.filter(
        v => (v.openAlerts || []).length > 0
      ).length,

    stops:
      fleet.reduce(
        (t, v) => t + (v.stops?.length || 0),
        0
      ),

    roadThreats:
      incidents.length,

    roadblocks:
      incidents.filter(
        i => i.type === "roadblock"
      ).length,

    smashGrab:
      incidents.filter(
        i => i.type === "smash_grab_hotspot"
      ).length,

    trafficLights:
      incidents.filter(
        i => i.type === "traffic_light_outage"
      ).length,

  }), [
    fleet,
    incidents,
    vehiclesWithLocation,
  ]);

  return {

    vehiclesWithLocation,

    selectedVehicle,

    selectedPosition,

    filteredFleet,

    mapCenter,

    summary,

  };

}
