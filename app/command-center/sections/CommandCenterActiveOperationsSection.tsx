import CommandCenterVehicleCard from "./CommandCenterVehicleCard";
import type { FleetVehicle, RoadIncident } from "../types";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  filteredFleet: FleetVehicle[];
  selectedVehicleId: string | null;
  incidents: RoadIncident[];
  setSelectedVehicleId: (id: string) => void;
  vehicleRisk: (vehicle: FleetVehicle) => string;
  movementStatus: (vehicle: FleetVehicle) => string;
  cleanRoute: (route: any[] | undefined) => any[];
  cleanLatLng: (lat: unknown, lng: unknown) => [number, number] | null;
  calculateDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
  riskColor: (risk: string) => string;
  riskText: (risk: string) => string;
  movementColor: (status: string) => string;
  secondsSince: (value: string | null | undefined) => number;
  formatDateTime: (value: string | null | undefined) => string;
  alertLabel: (type?: string | null) => string;
  replayHref: (vehicle: FleetVehicle) => string;
  triggerPanic: (vehicle: FleetVehicle) => void;
  resolveFirstAlert: (vehicle: FleetVehicle) => void;
};

export default function CommandCenterActiveOperationsSection(props: Props) {
  const {
    search,
    setSearch,
    loading,
    filteredFleet,
    selectedVehicleId,
    incidents,
    setSelectedVehicleId,
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
  } = props;

  return (
    <>
      <h2 style={{ fontSize: 28, margin: "0 0 16px 0" }}>
        Active Operations
      </h2>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search vehicle, driver, status..."
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          marginBottom: 16,
          fontSize: 14,
        }}
      />

      {loading ? (
        <div>Loading command center...</div>
      ) : filteredFleet.length === 0 ? (
        <div style={{ color: "#64748b" }}>No vehicles found.</div>
      ) : (
        <div style={{ display: "grid", gap: 14, maxHeight: 620, overflowY: "auto" }}>
          {filteredFleet.map((vehicle) => (
            <CommandCenterVehicleCard
              key={vehicle.id}
              vehicle={vehicle}
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
          ))}
        </div>
      )}
    </>
  );
}
