"use client";

import { fetchWithAuth } from "@/lib/auth-fetch";
import CommandCenterDriverContactSection from "./sections/CommandCenterDriverContactSection";
import CommandCenterRouteSafetySection from "./sections/CommandCenterRouteSafetySection";
import CommandCenterPriorityQueueSection from "./sections/CommandCenterPriorityQueueSection";
import CommandCenterVehicleCard from "./sections/CommandCenterVehicleCard";
import CommandCenterActiveOperationsSection from "./sections/CommandCenterActiveOperationsSection";
import CommandCenterFleetOperationsSnapshot from "./sections/CommandCenterFleetOperationsSnapshot";
import CommandCenterLiveOperationsTimeline from "./sections/CommandCenterLiveOperationsTimeline";
import CommandCenterIntelligenceModulesSection from "./sections/CommandCenterIntelligenceModulesSection";
import CommandCenterRouteThreatFeedSection from "./sections/CommandCenterRouteThreatFeedSection";
import CommandCenterThreatIntelligenceSection from "./sections/CommandCenterThreatIntelligenceSection";
import CommandCenterLiveFleetMapSection from "./sections/CommandCenterLiveFleetMapSection";
import CommandCenterOperationsPanelSection from "./sections/CommandCenterOperationsPanelSection";
import CommandCenterDashboardColumnSection from "./sections/CommandCenterDashboardColumnSection";
import CommandCenterHeaderSection from "./sections/CommandCenterHeaderSection";
import CommandCenterVehicleTimelineSection from "./sections/CommandCenterVehicleTimelineSection";
import NotificationCenter from "@/components/command-center/NotificationCenter";
import FleetHealthDashboard from "@/components/command-center/FleetHealthDashboard";
import DispatcherRecommendations from "@/components/command-center/DispatcherRecommendations";
import ExecutiveOperationsDashboard from "@/components/command-center/ExecutiveOperationsDashboard";
import AIShiftSummary from "@/components/command-center/AIShiftSummary";
import PredictiveETADashboard from "@/components/command-center/PredictiveETADashboard";
import VehicleIntelligencePanel from "@/components/command-center/VehicleIntelligencePanel";
import FleetDigitalTwinDashboard from "@/components/command-center/FleetDigitalTwinDashboard";
import IncidentCommandDashboard from "@/components/command-center/IncidentCommandDashboard";
import IncidentInvestigationTimeline from "@/components/command-center/IncidentInvestigationTimeline";
const HERETrafficOverlay = dynamic(
  () => import("@/components/command-center/HERETrafficOverlay"),
  { ssr: false }
);
import TrafficFlowDashboard from "@/components/command-center/TrafficFlowDashboard";
import FleetOptimizationDashboard from "@/components/command-center/FleetOptimizationDashboard";
import MissionBoard from "@/components/command-center/MissionBoard";
import LiveMissionTrackingDashboard from "@/components/command-center/LiveMissionTrackingDashboard";
import LiveFleetOperationsMap from "@/components/command-center/LiveFleetOperationsMap";
import FleetRiskHeatMap from "@/components/command-center/FleetRiskHeatMap";
import MissionReplayTimeline from "@/components/command-center/MissionReplayTimeline";
import AICommandAssistant from "@/components/command-center/AICommandAssistant";
import FleetMissionQueue from "@/components/command-center/FleetMissionQueue";
import MissionAutomationRules from "@/components/command-center/MissionAutomationRules";
import CommandWall from "@/components/command-center/CommandWall";
import AuditPlayback from "@/components/command-center/AuditPlayback";
import DispatcherCollaboration from "@/components/command-center/DispatcherCollaboration";
import CommandCenterVoiceSection from "./sections/CommandCenterVoiceSection";
import CommandCenterStatusSection from "./sections/CommandCenterStatusSection";
import CommandCenterSummaryCards from "./sections/CommandCenterSummaryCards";
import CommandCenterToolbarSection from "./sections/CommandCenterToolbarSection";
import CommandCenterThemeSwitcher from "@/components/command-center/CommandCenterThemeSwitcher";
import IncidentAssignmentBoard from "@/components/command-center/IncidentAssignmentBoard";
import AIAccidentDetection from "@/components/command-center/AIAccidentDetection";
import DashcamMonitoring from "@/components/command-center/DashcamMonitoring";
import ComputerVisionAnalytics from "@/components/command-center/ComputerVisionAnalytics";
import ANPRDashboard from "@/components/command-center/ANPRDashboard";
import CCTVMonitoring from "@/components/command-center/CCTVMonitoring";
import InsuranceResponseCenter from "@/components/command-center/InsuranceResponseCenter";
import SupervisorEscalationCenter from "@/components/command-center/SupervisorEscalationCenter";
import AIIncidentCorrelationDashboard from "@/components/command-center/AIIncidentCorrelationDashboard";
import PredictiveIncidentIntelligence from "@/components/command-center/PredictiveIncidentIntelligence";
import PrescriptiveResponseIntelligence from "@/components/command-center/PrescriptiveResponseIntelligence";

import "leaflet/dist/leaflet.css";
import TrialBanner from "@/components/billing/TrialBanner";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import PremiumGate from "@/components/PremiumGate";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CSSProperties,
  Fragment,
  useEffect,
  useMemo,
} from "react";
import { useMap } from "react-leaflet";
import AppShell from "@/components/AppShell";
import { useCommandCenterOperations } from "./hooks/useCommandCenterOperations";
import { useCommandCenterOperationsRealtime } from "./hooks/useCommandCenterOperationsRealtime";
import { useCommandCenterViewState } from "./hooks/useCommandCenterViewState";
import { useCommandCenterFleet } from "./hooks/useCommandCenterFleet";
import { useCommandCenterRouteSafety } from "./hooks/useCommandCenterRouteSafety";
import { useCommandCenterVoice } from "./hooks/useCommandCenterVoice";
import { useCommandCenterData } from "./hooks/useCommandCenterData";
import { useCommandCenterRealtime } from "./hooks/useCommandCenterRealtime";
import { useCommandCenterMap } from "./hooks/useCommandCenterMap";
import { useCommandCenterAnalytics } from "./hooks/useCommandCenterAnalytics";
import type {
  CommandCenterGeofence,
  FleetAlert,
  FleetStop,
  RoadIncident,
  FleetVehicle,
} from "./types";
import {
  cleanRoute,
  cleanLatLng,
  formatDateTime,
  calculateDistanceMeters,
  secondsSince,
  alertLabel,
  vehicleRisk,
  riskText,
  riskColor,
  movementStatus,
  movementColor,
  replayHref,
} from "./utils";
import { useCommandCenterNotifications } from "./hooks/useCommandCenterNotifications";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const HeatmapLayer = dynamic<any>(
  () => import("react-leaflet-heatmap-layer-v3").then((m: any) => m.default || m.HeatmapLayer || m),
  { ssr: false }
);

const cardStyle: CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e5e7eb",
};

const buttonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};


function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}


function decodePolyline(encoded: string) {
  const points: [number, number][] = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}



function MapFollower({
  position,
  enabled,
}: {
  position: [number, number] | null;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position) return;

    map.flyTo(position, Math.max(map.getZoom(), 13), {
      duration: 1.2,
    });
  }, [enabled, position, map]);

  return null;
}

export default function CommandCenterPage() {
	
  const {
    fleet,
    incidents,
    threatFeed,
    geofences,
    loading,
    message,
    setMessage,
    loadFleet,
    loadIncidents,
    loadThreatFeed,
    loadGeofenceOverlay,
    runRiskDetection,
    triggerPanic,
    resolveFirstAlert,

  } = useCommandCenterData();

  const {

    globalThreatScore,

    topThreatVehicles,

    operationalStatus,

    operationalColor,

  } = useCommandCenterAnalytics(
    threatFeed
  );

  const {
    routePrediction,
    routePredictionLoading,
    routeRerouteLoading,
    routeAssignLoading,
    saferRoutePolylines,
    loadRouteSafetyPrediction,
    loadSaferRouteOptions,
    assignSaferRouteToDriver,
    escalateRouteThreat,
  } = useCommandCenterRouteSafety({
    setMessage,
    loadFleet,
    loadThreatFeed,
    decodePolyline,
  });

  const {
    operationsSummary,
    operationsTimeline,
    loadOperationsSummary,
    loadOperationsTimeline,
  } = useCommandCenterOperations();
  const {
    notifications,
    notificationStats,
    loadNotifications,
    markNotificationRead,
    resolveNotification,
  } = useCommandCenterNotifications();
  const {
    showTrafficOverlay,
    setShowTrafficOverlay,
    selectedVehicleId,
    setSelectedVehicleId,
    showRoutes,
    setShowRoutes,
    showStops,
    setShowStops,
    showHeatmap,
    setShowHeatmap,
    followSelected,
    setFollowSelected,
    search,
    setSearch,
  } = useCommandCenterViewState();
  const {
    animatedPositions,
    icons,
  } = useCommandCenterMap(
    fleet,
    selectedVehicleId
  );
  const {
    voiceEnabled,
    setVoiceEnabled,
    voiceTranscript,
    copilotResponse,
  } = useCommandCenterVoice();
const {
  premiumAllowed,
  subscriptionLoaded,
  subscription,
} = usePremiumAccess();

  
 



  useCommandCenterOperationsRealtime({
    loadOperationsSummary,
    loadOperationsTimeline,
  });






  useCommandCenterRealtime({
    loadFleet,
    loadIncidents,
    loadThreatFeed,
    loadOperationsSummary,
    loadOperationsTimeline,
  });




  const {
    vehiclesWithLocation,
    selectedVehicle,
    selectedPosition,
    filteredFleet,
    mapCenter,
    summary,
  } = useCommandCenterFleet({
    fleet,
    search,
    selectedVehicleId,
    animatedPositions,
    incidents,
  });



  
if (
  subscriptionLoaded &&
  !premiumAllowed
) {
  return (
    <AppShell>
	<TrialBanner
  trialEndsAt={subscription?.trial_ends_at}
/>
      <PremiumGate
        title="Command Center"
        description="Upgrade to HarborGuard Professional to unlock live operational intelligence, AI command orchestration, replay intelligence, and advanced fleet coordination."
        currentPlan={subscription?.plan}
        trialEndsAt={
          subscription?.trial_ends_at
        }
      />
    </AppShell>
  );
}
  return (
    <AppShell>
      <style>{`
        @keyframes hgLivePulse {
          0% { transform: scale(1); opacity: 0.28; }
          70% { transform: scale(2.15); opacity: 0; }
          100% { transform: scale(2.15); opacity: 0; }
        }

        .hg-live-pulse {
          animation: hgLivePulse 2s infinite;
        }
      `}</style>
      <CommandCenterHeaderSection
        voiceEnabled={voiceEnabled}
        voiceTranscript={voiceTranscript}
        copilotResponse={copilotResponse}
        setVoiceEnabled={setVoiceEnabled}
        operationalStatus={operationalStatus}
        globalThreatScore={globalThreatScore}
        topThreatVehicles={topThreatVehicles}
        summary={summary}
        buttonStyle={buttonStyle}
        loadFleet={loadFleet}
        runRiskDetection={runRiskDetection}
        showRoutes={showRoutes}
        setShowRoutes={setShowRoutes}
        showStops={showStops}
        setShowStops={setShowStops}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        followSelected={followSelected}
        setFollowSelected={setFollowSelected}
        message={message}
      />
      <CommandCenterThreatIntelligenceSection
        threatFeed={threatFeed}
      />

        <CommandCenterRouteThreatFeedSection
          incidents={incidents}
        />
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
        <CommandCenterDashboardColumnSection
          operationsSummary={operationsSummary}
          operationsTimeline={operationsTimeline}
          incidents={incidents}
          MapContainer={MapContainer}
          TileLayer={TileLayer}
          Marker={Marker}
          Popup={Popup}
          Polyline={Polyline}
          CircleMarker={CircleMarker}
          MapFollower={MapFollower}
          FleetRiskHeatMap={FleetRiskHeatMap}
          HERETrafficOverlay={HERETrafficOverlay}
          mapCenter={mapCenter}
          selectedPosition={selectedPosition}
          followSelected={followSelected}
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

        <CommandCenterOperationsPanelSection
          search={search}
          setSearch={setSearch}
          loading={loading}
          filteredFleet={filteredFleet}
          selectedVehicleId={selectedVehicleId}
          incidents={incidents}
          setSelectedVehicleId={setSelectedVehicleId}
          setMessage={setMessage}
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
          routePrediction={routePrediction}
          routePredictionLoading={routePredictionLoading}
          routeAssignLoading={routeAssignLoading}
          routeRerouteLoading={routeRerouteLoading}
          loadRouteSafetyPrediction={loadRouteSafetyPrediction}
          assignSaferRouteToDriver={assignSaferRouteToDriver}
          escalateRouteThreat={escalateRouteThreat}
          loadSaferRouteOptions={loadSaferRouteOptions}
        />
      </div>
    </AppShell>
  );
}








































































































