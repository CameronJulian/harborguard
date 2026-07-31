import type { RoadIncident } from "../types";

type Props = {
  incidents: RoadIncident[];
  showHeatmap: boolean;
  showRoadRiskSegments: boolean;
  minimumRoadRisk: number;
  showTrafficOverlay: boolean;
  saferRoutePolylines: [number, number][][];

  CircleMarker: any;
  Popup: any;
  Polyline: any;
  FleetRiskHeatMap: any;
  HERETrafficOverlay: any;
  RoadRiskSegmentsLayer: any;

  cleanLatLng: (
    latitude: unknown,
    longitude: unknown
  ) => [number, number] | null;
};

function getProviderGeometryPositions(
  geometry: unknown
): [number, number][] {
  if (!geometry || typeof geometry !== "object") {
    return [];
  }

  const value = geometry as any;

  // TomTom GeoJSON LineString coordinates use [longitude, latitude].
  if (
    value.type === "LineString" &&
    Array.isArray(value.coordinates)
  ) {
    return value.coordinates
      .filter(
        (coordinate: unknown) =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(Number(coordinate[0])) &&
          Number.isFinite(Number(coordinate[1]))
      )
      .map(
        (coordinate: any): [number, number] => [
          Number(coordinate[1]),
          Number(coordinate[0]),
        ]
      );
  }

  // HERE geometry can be stored as { links: [...] } or { shape: { links: [...] } }.
  const hereLinks = Array.isArray(value.links)
    ? value.links
    : Array.isArray(value.shape?.links)
      ? value.shape.links
      : null;

  if (!hereLinks) {
    return [];
  }

  return hereLinks.flatMap((link: any) =>
    Array.isArray(link?.points)
      ? link.points
          .filter(
            (point: any) =>
              Number.isFinite(Number(point?.lat)) &&
              Number.isFinite(Number(point?.lng))
          )
          .map(
            (point: any): [number, number] => [
              Number(point.lat),
              Number(point.lng),
            ]
          )
      : []
  );
}

export default function RouteOverlayLayers({
  incidents,
  showHeatmap,
  showRoadRiskSegments,
  minimumRoadRisk,
  showTrafficOverlay,
  saferRoutePolylines,
  CircleMarker,
  Popup,
  Polyline,
  FleetRiskHeatMap,
  HERETrafficOverlay,
  RoadRiskSegmentsLayer,
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

      <RoadRiskSegmentsLayer
        enabled={showRoadRiskSegments}
        minimumRisk={minimumRoadRisk}
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
