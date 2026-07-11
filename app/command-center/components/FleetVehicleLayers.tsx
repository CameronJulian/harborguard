import Link from "next/link";
import { Fragment } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { FleetVehicle } from "../types";

type Props = {
  vehiclesWithLocation: FleetVehicle[];
  Marker: any;
  Popup: any;
  Polyline: any;
  CircleMarker: any;
  icons: Record<string, any>;
  animatedPositions: Record<string, [number, number]>;
  selectedVehicleId: string | null;
  setSelectedVehicleId: Dispatch<SetStateAction<string | null>>;
  showRoutes: boolean;
  showStops: boolean;
  cleanLatLng: (
    lat: unknown,
    lng: unknown
  ) => [number, number] | null;
  cleanRoute: (
    route: any[] | undefined
  ) => [number, number][];
  vehicleRisk: (vehicle: FleetVehicle) => string;
  riskColor: (risk: string) => string;
  riskText: (risk: string) => string;
  movementColor: (status: string) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  formatDateTime: (
    value: string | null | undefined
  ) => string;
  secondsSince: (
    value: string | null | undefined
  ) => number;
  replayHref: (vehicle: FleetVehicle) => string;
  triggerPanic: (vehicle: FleetVehicle) => void;
};

export default function FleetVehicleLayers({
  vehiclesWithLocation,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  icons,
  animatedPositions,
  selectedVehicleId,
  setSelectedVehicleId,
  showRoutes,
  showStops,
  cleanLatLng,
  cleanRoute,
  vehicleRisk,
  riskColor,
  riskText,
  movementColor,
  movementStatus,
  formatDateTime,
  secondsSince,
  replayHref,
  triggerPanic,
}: Props) {
  return (
    <>
      {vehiclesWithLocation.map((vehicle) => {
        const risk = vehicleRisk(vehicle);
        const icon = icons[vehicle.id];
        const coords = cleanLatLng(
          vehicle.latitude,
          vehicle.longitude
        );
        const routePoints = cleanRoute(vehicle.route);
        const selected = selectedVehicleId === vehicle.id;
        const markerPosition =
          animatedPositions[vehicle.id] || coords;

        if (!icon || !coords || !markerPosition) {
          return null;
        }

        return (
          <Fragment key={vehicle.id}>
            {showRoutes && routePoints.length > 1 ? (
              <>
                <Polyline
                  positions={routePoints}
                  pathOptions={{
                    color: "#0f172a",
                    weight: selected ? 10 : 7,
                    opacity: selected ? 0.18 : 0.12,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />

                <Polyline
                  positions={routePoints}
                  pathOptions={{
                    color: selected ? "#2563eb" : "#3b82f6",
                    weight: selected ? 5 : 3,
                    opacity: selected ? 0.98 : 0.85,
                    lineJoin: "round",
                    lineCap: "round",
                  }}
                />
              </>
            ) : null}

            {showStops &&
              (vehicle.stops || []).map((stop) => {
                const stopCoords = cleanLatLng(
                  stop.latitude,
                  stop.longitude
                );

                if (!stopCoords) {
                  return null;
                }

                return (
                  <CircleMarker
                    key={stop.id}
                    center={stopCoords}
                    radius={selected ? 8 : 6}
                    pathOptions={{
                      color: "#7c3aed",
                      fillColor: "#a855f7",
                      fillOpacity: 0.65,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <strong>Stop detected</strong>
                        <br />
                        Vehicle: {vehicle.registrationNumber}
                        <br />
                        Started: {formatDateTime(stop.started_at)}
                        <br />
                        Ended: {formatDateTime(stop.ended_at)}
                        <br />
                        Duration:{" "}
                        {Math.round(
                          (stop.duration_seconds || 0) / 60
                        )}{" "}
                        min
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            <Marker
              position={markerPosition}
              icon={icon}
              eventHandlers={{
                click: () =>
                  setSelectedVehicleId(vehicle.id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 250 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      marginBottom: 6,
                    }}
                  >
                    {vehicle.registrationNumber}
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      marginBottom: 8,
                    }}
                  >
                    Nickname: {vehicle.nickname || "-"}
                  </div>

                  <div>
                    <strong>Status:</strong>{" "}
                    <span
                      style={{
                        color: riskColor(risk),
                        fontWeight: 800,
                      }}
                    >
                      {riskText(risk)}
                    </span>
                  </div>

                  <div>
                    <strong>Movement:</strong>{" "}
                    <span
                      style={{
                        color: movementColor(
                          movementStatus(vehicle)
                        ),
                        fontWeight: 800,
                      }}
                    >
                      {movementStatus(vehicle)}
                    </span>
                  </div>

                  <div>
                    <strong>Driver:</strong>{" "}
                    {vehicle.driverName || "-"}
                  </div>

                  <div>
                    <strong>Speed:</strong>{" "}
                    {Math.round(vehicle.speedKmh || 0)} km/h
                  </div>

                  <div>
                    <strong>Heading:</strong>{" "}
                    {Math.round(vehicle.heading || 0)}
                    {"\u00B0"}
                  </div>

                  <div>
                    <strong>Last Seen:</strong>{" "}
                    {formatDateTime(vehicle.lastSeen)}
                  </div>

                  <div>
                    <strong>Updated:</strong>{" "}
                    {secondsSince(vehicle.lastSeen)}s ago
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <strong>Route Points:</strong>{" "}
                    {routePoints.length}
                    <br />
                    <strong>Stops:</strong>{" "}
                    {vehicle.stops?.length || 0}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link href={replayHref(vehicle)}>
                      Replay
                    </Link>

                    <button
                      onClick={() => triggerPanic(vehicle)}
                    >
                      Panic
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}
