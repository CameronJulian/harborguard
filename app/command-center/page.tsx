"use client";

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
import CommandCenterExecutiveWarRoomSection from "./sections/CommandCenterExecutiveWarRoomSection";
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
import TrafficFlowDashboard from "@/components/command-center/TrafficFlowDashboard";
import FleetOptimizationDashboard from "@/components/command-center/FleetOptimizationDashboard";
import MissionBoard from "@/components/command-center/MissionBoard";
import LiveMissionTrackingDashboard from "@/components/command-center/LiveMissionTrackingDashboard";
import LiveFleetOperationsMap from "@/components/command-center/LiveFleetOperationsMap";
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

import {
  CSSProperties,
} from "react";
import AppShell from "@/components/AppShell";
import {
  decodePolyline,
} from "./utils/polyline";
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
      <CommandCenterExecutiveWarRoomSection />

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
          routeSafety={{
            routePrediction,
            routePredictionLoading,
            routeAssignLoading,
            routeRerouteLoading,
            loadRouteSafetyPrediction,
            assignSaferRouteToDriver,
            escalateRouteThreat,
            loadSaferRouteOptions,
          }}
        />
      </div>
    </AppShell>
  );
}







