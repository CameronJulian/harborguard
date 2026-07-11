import type { Dispatch, SetStateAction } from "react";
import type { LatLngExpression } from "leaflet";
import type { FleetVehicle, RoadIncident } from "../types";
import FleetVehicleLayers from "../components/FleetVehicleLayers";
import RouteOverlayLayers from "../components/RouteOverlayLayers";

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

          <RouteOverlayLayers
            incidents={incidents}
            showHeatmap={showHeatmap}
            showTrafficOverlay={showTrafficOverlay}
            saferRoutePolylines={saferRoutePolylines}
            CircleMarker={CircleMarker}
            Popup={Popup}
            Polyline={Polyline}
            FleetRiskHeatMap={FleetRiskHeatMap}
            HERETrafficOverlay={HERETrafficOverlay}
            cleanLatLng={cleanLatLng}
          />


          <FleetVehicleLayers
            vehiclesWithLocation={vehiclesWithLocation}
            Marker={Marker}
            Popup={Popup}
            Polyline={Polyline}
            CircleMarker={CircleMarker}
            icons={icons}
            animatedPositions={animatedPositions}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            showRoutes={showRoutes}
            showStops={showStops}
            cleanLatLng={cleanLatLng}
            cleanRoute={cleanRoute}
            vehicleRisk={vehicleRisk}
            riskColor={riskColor}
            riskText={riskText}
            movementColor={movementColor}
            movementStatus={movementStatus}
            formatDateTime={formatDateTime}
            secondsSince={secondsSince}
            replayHref={replayHref}
            triggerPanic={triggerPanic}
          />


        </MapContainer>
      </div>
    </>
  );
}


