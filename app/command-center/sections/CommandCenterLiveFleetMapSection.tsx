import Link from "next/link";
import { Fragment } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LatLngExpression } from "leaflet";
import type { FleetVehicle, RoadIncident } from "../types";

type Props = {
  MapContainer: any;
  TileLayer: any;
  Marker: any;
  Popup: any;
  Polyline: any;
  CircleMarker: any;
  MapFollower: any;
  FleetRiskHeatMap: any;
  HERETrafficOverlay: any;
  mapCenter: LatLngExpression;
  selectedPosition: [number, number] | null;
  followSelected: boolean;
  incidents: RoadIncident[];
  showHeatmap: boolean;
  showTrafficOverlay: boolean;
  vehiclesWithLocation: FleetVehicle[];
  icons: Record<string, any>;
  animatedPositions: Record<string, [number, number]>;
  selectedVehicleId: string | null;
  setSelectedVehicleId: Dispatch<SetStateAction<string | null>>;
  showRoutes: boolean;
  showStops: boolean;
  saferRoutePolylines: [number, number][][];
  cleanLatLng: (lat: unknown, lng: unknown) => [number, number] | null;
  cleanRoute: (route: any[] | undefined) => [number, number][];
  vehicleRisk: (vehicle: FleetVehicle) => string;
  riskColor: (risk: string) => string;
  riskText: (risk: string) => string;
  movementColor: (status: string) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  formatDateTime: (value: string | null | undefined) => string;
  secondsSince: (value: string | null | undefined) => number;
  replayHref: (vehicle: FleetVehicle) => string;
  triggerPanic: (vehicle: FleetVehicle) => void;
};

export default function CommandCenterLiveFleetMapSection({
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  MapFollower,
  FleetRiskHeatMap,
  HERETrafficOverlay,
  mapCenter,
  selectedPosition,
  followSelected,
  incidents,
  showHeatmap,
  showTrafficOverlay,
  vehiclesWithLocation,
  icons,
  animatedPositions,
  selectedVehicleId,
  setSelectedVehicleId,
  showRoutes,
  showStops,
  saferRoutePolylines,
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
      <h2 style={{ fontSize: 28, margin: "0 0 16px 0" }}>
        Live Tactical Fleet Map
      </h2>

      <div style={{ color: "#64748b", marginBottom: 12 }}>
        Pulsing markers show live vehicles. Blue trails show movement history.
        Purple circles show stops. Orange/red circles show Route Safety threats.
        Green circles show active geofences.
      </div>

      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          height: 620,
        }}
      >
        <MapContainer center={mapCenter} zoom={10} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFollower position={selectedPosition} enabled={followSelected} />

          <FleetRiskHeatMap incidents={incidents} visible={showHeatmap} />

          <HERETrafficOverlay incidents={incidents} enabled={showTrafficOverlay} />

          {incidents.map((incident) => {
            const coords = cleanLatLng(incident.latitude, incident.longitude);
            if (!coords) return null;

            const color =
              incident.severity === "critical"
                ? "#dc2626"
                : incident.severity === "high"
                ? "#ea580c"
                : "#d97706";

            return (
              <CircleMarker
                key={incident.id}
                center={coords}
                radius={14}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <strong>{incident.title}</strong>
                    <br />
                    Type: {incident.type}
                    <br />
                    Severity: {incident.severity}
                    <br />
                    Radius: {incident.radius_meters}m
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {vehiclesWithLocation.map((vehicle) => {
            const risk = vehicleRisk(vehicle);
            const icon = icons[vehicle.id];
            const coords = cleanLatLng(vehicle.latitude, vehicle.longitude);
            const routePoints = cleanRoute(vehicle.route);
            const selected = selectedVehicleId === vehicle.id;
            const markerPosition = animatedPositions[vehicle.id] || coords;

            if (!icon || !coords || !markerPosition) return null;

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
                    const stopCoords = cleanLatLng(stop.latitude, stop.longitude);
                    if (!stopCoords) return null;

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
                            Duration: {Math.round((stop.duration_seconds || 0) / 60)} min
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                <Marker
                  position={markerPosition}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedVehicleId(vehicle.id),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 250 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
                        {vehicle.registrationNumber}
                      </div>

                      <div style={{ color: "#64748b", marginBottom: 8 }}>
                        Nickname: {vehicle.nickname || "-"}
                      </div>

                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: riskColor(risk), fontWeight: 800 }}>
                          {riskText(risk)}
                        </span>
                      </div>

                      <div>
                        <strong>Movement:</strong>{" "}
                        <span
                          style={{
                            color: movementColor(movementStatus(vehicle)),
                            fontWeight: 800,
                          }}
                        >
                          {movementStatus(vehicle)}
                        </span>
                      </div>

                      <div>
                        <strong>Driver:</strong> {vehicle.driverName || "-"}
                      </div>

                      <div>
                        <strong>Speed:</strong> {Math.round(vehicle.speedKmh || 0)} km/h
                      </div>

                      <div>
                        <strong>Heading:</strong> {Math.round(vehicle.heading || 0)}°
                      </div>

                      <div>
                        <strong>Last Seen:</strong> {formatDateTime(vehicle.lastSeen)}
                      </div>

                      <div>
                        <strong>Updated:</strong> {secondsSince(vehicle.lastSeen)}s ago
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <strong>Route Points:</strong> {routePoints.length}
                        <br />
                        <strong>Stops:</strong> {vehicle.stops?.length || 0}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <Link href={replayHref(vehicle)}>Replay</Link>

                        <button onClick={() => triggerPanic(vehicle)}>
                          Panic
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            );
          })}

          {saferRoutePolylines.length > 0 ? (
            <Polyline
              key="best-safer-route"
              positions={saferRoutePolylines[0]}
              pathOptions={{
                color: "#16a34a",
                weight: 7,
                opacity: 0.9,
              }}
            />
          ) : null}
        </MapContainer>
      </div>
    </>
  );
}