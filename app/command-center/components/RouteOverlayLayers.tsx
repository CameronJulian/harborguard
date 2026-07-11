import type { RoadIncident } from "../types";

type Props = {
  incidents: RoadIncident[];
  showHeatmap: boolean;
  showTrafficOverlay: boolean;
  saferRoutePolylines: [number, number][][];

  CircleMarker: any;
  Popup: any;
  Polyline: any;
  FleetRiskHeatMap: any;
  HERETrafficOverlay: any;

  cleanLatLng: (
    latitude: unknown,
    longitude: unknown
  ) => [number, number] | null;
};

export default function RouteOverlayLayers({
  incidents,
  showHeatmap,
  showTrafficOverlay,
  saferRoutePolylines,
  CircleMarker,
  Popup,
  Polyline,
  FleetRiskHeatMap,
  HERETrafficOverlay,
  cleanLatLng,
}: Props) {
  return (
    <>
      <FleetRiskHeatMap
        incidents={incidents}
        visible={showHeatmap}
      />

      <HERETrafficOverlay
        incidents={incidents}
        enabled={showTrafficOverlay}
      />

      {incidents.map((incident) => {
        const coords = cleanLatLng(
          incident.latitude,
          incident.longitude
        );

        if (!coords) {
          return null;
        }

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
    </>
  );
}
