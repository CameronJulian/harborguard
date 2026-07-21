import type React from "react";

import NotificationCenter from "@/components/command-center/NotificationCenter";
import CommandCenterFleetOperationsSnapshot from "./CommandCenterFleetOperationsSnapshot";
import CommandCenterLiveOperationsTimeline from "./CommandCenterLiveOperationsTimeline";
import CommandCenterIntelligenceModulesSection from "./CommandCenterIntelligenceModulesSection";
import CommandCenterLiveFleetMapSection from "./CommandCenterLiveFleetMapSection";

type Props = {
  operationsSummary: any;
  operationsTimeline: any[];
  filteredFleet: any[];
  incidents: any[];


  mapCenter: any;
  selectedPosition: any;
  followSelected: boolean;
  showHeatmap: boolean;
  showTrafficOverlay: boolean;
  vehiclesWithLocation: any[];
  icons: any;
  animatedPositions: any;
  selectedVehicleId: string | null;
  setSelectedVehicleId: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  showRoutes: boolean;
  showStops: boolean;
  saferRoutePolylines: any[];

  cleanLatLng: (...args: any[]) => any;
  cleanRoute: (...args: any[]) => any;
  vehicleRisk: (...args: any[]) => any;
  riskColor: (...args: any[]) => any;
  riskText: (...args: any[]) => any;
  movementColor: (...args: any[]) => any;
  movementStatus: (...args: any[]) => any;
  formatDateTime: (...args: any[]) => any;
  secondsSince: (...args: any[]) => any;
  replayHref: (...args: any[]) => any;
  triggerPanic: (...args: any[]) => any;
};

export default function CommandCenterDashboardColumnSection({
  operationsSummary,
  operationsTimeline,
  filteredFleet,
  incidents,
  mapCenter,
  selectedPosition,
  followSelected,
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
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <CommandCenterFleetOperationsSnapshot
        operationsSummary={operationsSummary}
      />

      <CommandCenterLiveOperationsTimeline
        operationsTimeline={operationsTimeline}
      />

      <CommandCenterIntelligenceModulesSection
        operationsTimeline={operationsTimeline}
        filteredFleet={filteredFleet}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
      />

      <NotificationCenter />

      <CommandCenterLiveFleetMapSection
        mapCenter={mapCenter}
        selectedPosition={selectedPosition}
        followSelected={followSelected}
        incidents={incidents}
        showHeatmap={showHeatmap}
        showTrafficOverlay={showTrafficOverlay}
        vehiclesWithLocation={vehiclesWithLocation}
        icons={icons}
        animatedPositions={animatedPositions}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        showRoutes={showRoutes}
        showStops={showStops}
        saferRoutePolylines={saferRoutePolylines}
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
    </div>
  );
}

