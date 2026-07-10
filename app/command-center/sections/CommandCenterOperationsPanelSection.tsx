import type React from "react";
import CommandCenterPriorityQueueSection from "./CommandCenterPriorityQueueSection";
import CommandCenterVehicleTimelineSection from "./CommandCenterVehicleTimelineSection";
import CommandCenterDriverContactSection from "./CommandCenterDriverContactSection";
import CommandCenterRouteSafetySection from "./CommandCenterRouteSafetySection";
import CommandCenterActiveOperationsSection from "./CommandCenterActiveOperationsSection";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  filteredFleet: any[];
  selectedVehicleId: string | null;
  incidents: any[];
  setSelectedVehicleId: React.Dispatch<React.SetStateAction<string | null>>;
  setMessage: React.Dispatch<React.SetStateAction<string>>;

  vehicleRisk: (...args: any[]) => any;
  movementStatus: (...args: any[]) => any;
  cleanRoute: (...args: any[]) => any;
  cleanLatLng: (...args: any[]) => any;
  calculateDistanceMeters: (...args: any[]) => any;
  riskColor: (...args: any[]) => any;
  riskText: (...args: any[]) => any;
  movementColor: (...args: any[]) => any;
  secondsSince: (...args: any[]) => any;
  formatDateTime: (...args: any[]) => any;
  alertLabel: (...args: any[]) => any;
  replayHref: (...args: any[]) => any;
  triggerPanic: (...args: any[]) => any;
  resolveFirstAlert: (...args: any[]) => any;

  routePrediction: any;
  routePredictionLoading: boolean;
  routeAssignLoading: boolean;
  routeRerouteLoading: boolean;
  loadRouteSafetyPrediction: (...args: any[]) => any;
  assignSaferRouteToDriver: (...args: any[]) => any;
  escalateRouteThreat: (...args: any[]) => any;
  loadSaferRouteOptions: (...args: any[]) => any;
};

export default function CommandCenterOperationsPanelSection(props: Props) {
  const {
    search,
    setSearch,
    loading,
    filteredFleet,
    selectedVehicleId,
    incidents,
    setSelectedVehicleId,
    setMessage,
    vehicleRisk,
    movementStatus,
    cleanRoute,
    cleanLatLng,
    calculateDistanceMeters,
    riskColor,
    riskText,
    movementColor,
    secondsSince,
    formatDateTime,
    alertLabel,
    replayHref,
    triggerPanic,
    resolveFirstAlert,
    routePrediction,
    routePredictionLoading,
    routeAssignLoading,
    routeRerouteLoading,
    loadRouteSafetyPrediction,
    assignSaferRouteToDriver,
    escalateRouteThreat,
    loadSaferRouteOptions,
  } = props;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 24,
      }}
    >
      <CommandCenterPriorityQueueSection
        filteredFleet={filteredFleet}
        setSelectedVehicleId={setSelectedVehicleId}
        vehicleRisk={vehicleRisk}
        movementStatus={movementStatus}
        triggerPanic={triggerPanic}
        replayHref={replayHref}
      />

      <CommandCenterVehicleTimelineSection
        filteredFleet={filteredFleet}
        selectedVehicleId={selectedVehicleId}
        incidents={incidents}
        cleanLatLng={cleanLatLng}
        calculateDistanceMeters={calculateDistanceMeters}
        alertLabel={alertLabel}
        movementStatus={movementStatus}
        formatDateTime={formatDateTime}
      />

      <CommandCenterDriverContactSection
        filteredFleet={filteredFleet}
        selectedVehicleId={selectedVehicleId}
        setMessage={setMessage}
      />

      <CommandCenterRouteSafetySection
        filteredFleet={filteredFleet}
        selectedVehicleId={selectedVehicleId}
        routePrediction={routePrediction}
        routePredictionLoading={routePredictionLoading}
        routeAssignLoading={routeAssignLoading}
        routeRerouteLoading={routeRerouteLoading}
        loadRouteSafetyPrediction={loadRouteSafetyPrediction}
        assignSaferRouteToDriver={assignSaferRouteToDriver}
        escalateRouteThreat={escalateRouteThreat}
        loadSaferRouteOptions={loadSaferRouteOptions}
      />

      <CommandCenterActiveOperationsSection
        search={search}
        setSearch={setSearch}
        loading={loading}
        filteredFleet={filteredFleet}
        selectedVehicleId={selectedVehicleId}
        incidents={incidents}
        setSelectedVehicleId={setSelectedVehicleId}
        vehicleRisk={vehicleRisk}
        movementStatus={movementStatus}
        cleanRoute={cleanRoute}
        cleanLatLng={cleanLatLng}
        calculateDistanceMeters={calculateDistanceMeters}
        riskColor={riskColor}
        riskText={riskText}
        movementColor={movementColor}
        secondsSince={secondsSince}
        formatDateTime={formatDateTime}
        alertLabel={alertLabel}
        replayHref={replayHref}
        triggerPanic={triggerPanic}
        resolveFirstAlert={resolveFirstAlert}
      />
    </div>
  );
}


