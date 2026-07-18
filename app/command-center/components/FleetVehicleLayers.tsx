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

function weatherRiskLabel(penalty?: number) {
  const value = penalty ?? 0;

  if (value > 45) {
    return "Extreme";
  }

  if (value > 25) {
    return "High";
  }

  if (value > 10) {
    return "Moderate";
  }

  return "Low";
}

function weatherRiskStyle(penalty?: number) {
  const value = penalty ?? 0;

  if (value > 45) {
    return {
      color: "#991b1b",
      backgroundColor: "#fee2e2",
      borderColor: "#fecaca",
    };
  }

  if (value > 25) {
    return {
      color: "#9a3412",
      backgroundColor: "#ffedd5",
      borderColor: "#fed7aa",
    };
  }

  if (value > 10) {
    return {
      color: "#854d0e",
      backgroundColor: "#fef9c3",
      borderColor: "#fde68a",
    };
  }

  return {
    color: "#166534",
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  };
}

function weatherStatusLabel(status?: string | null) {
  switch (status) {
    case "available":
      return "Live";

    case "skipped_offline":
      return "Offline";

    case "unavailable":
      return "Unavailable";

    default:
      return "Unknown";
  }
}

function weatherStatusStyle(status?: string | null) {
  switch (status) {
    case "available":
      return {
        color: "#166534",
        backgroundColor: "#dcfce7",
        borderColor: "#bbf7d0",
      };

    case "skipped_offline":
      return {
        color: "#9a3412",
        backgroundColor: "#ffedd5",
        borderColor: "#fed7aa",
      };

    case "unavailable":
      return {
        color: "#991b1b",
        backgroundColor: "#fee2e2",
        borderColor: "#fecaca",
      };

    default:
      return {
        color: "#374151",
        backgroundColor: "#f3f4f6",
        borderColor: "#d1d5db",
      };
  }
}

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

                  <div style={{ marginTop: 12 }}>
                    <strong>Weather</strong>

                    <div>
                      <strong>Condition:</strong>{" "}
                      {vehicle.weather?.condition ?? "Unavailable"}
                    </div>

                    <div>
                      <strong>Temperature:</strong>{" "}
                      {vehicle.weather?.temperatureC != null
                        ? `${Math.round(vehicle.weather.temperatureC)}\u00B0C`
                        : "-"}
                    </div>

                    <div>
                      <strong>Wind:</strong>{" "}
                      {vehicle.weather?.windSpeedKmh != null
                        ? `${Math.round(vehicle.weather.windSpeedKmh)} km/h`
                        : "-"}
                    </div>

                    <div>
                      <strong>Visibility:</strong>{" "}
                      {vehicle.weather?.visibilityKm != null
                        ? `${vehicle.weather.visibilityKm} km`
                        : "-"}
                    </div>

                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          ...weatherStatusStyle(
                            vehicle.weatherStatus
                          ),
                          display: "inline-block",
                          border: "1px solid",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {weatherStatusLabel(
                          vehicle.weatherStatus
                        )}
                      </span>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <strong>Weather Risk:</strong>{" "}
                      <span
                        style={{
                          ...weatherRiskStyle(
                            vehicle.weatherPenalty
                          ),
                          display: "inline-block",
                          border: "1px solid",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {weatherRiskLabel(
                          vehicle.weatherPenalty
                        )}
                        {" ("}
                        {vehicle.weatherPenalty ?? 0}
                        {")"}
                      </span>
                    </div>
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
