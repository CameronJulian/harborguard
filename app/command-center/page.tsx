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
import { supabase } from "@/lib/supabase";
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
  useState,
} from "react";
import { useMap } from "react-leaflet";
import AppShell from "@/components/AppShell";
import { useCommandCenterOperations } from "./hooks/useCommandCenterOperations";
import { useCommandCenterFleet } from "./hooks/useCommandCenterFleet";
import { useCommandCenterRouteSafety } from "./hooks/useCommandCenterRouteSafety";
import { useCommandCenterVoice } from "./hooks/useCommandCenterVoice";
import { useCommandCenterData } from "./hooks/useCommandCenterData";
import { useCommandCenterRealtime } from "./hooks/useCommandCenterRealtime";
import { useCommandCenterMap } from "./hooks/useCommandCenterMap";
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


function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolatePosition(
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] {
  return [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
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

async function createVehicleIcon(
  risk: string,
  selected: boolean,
  heading = 0,
  status = "Stopped"
) {
  const L = (await import("leaflet")).default;
  const color = riskColor(risk);
  const size = selected ? 36 : 28;
  const coreSize = selected ? 30 : 22;
  const isLive = risk !== "offline" && status !== "Stale";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
      ">
        ${
          isLive
            ? `<div class="hg-live-pulse" style="
                position:absolute;
                left:50%;
                top:50%;
                width:${coreSize}px;
                height:${coreSize}px;
                margin-left:-${coreSize / 2}px;
                margin-top:-${coreSize / 2}px;
                border-radius:9999px;
                background:${color};
                opacity:0.28;
              "></div>`
            : ""
        }

        <div style="
          position:absolute;
          left:50%;
          top:50%;
          width:${coreSize}px;
          height:${coreSize}px;
          margin-left:-${coreSize / 2}px;
          margin-top:-${coreSize / 2}px;
          border-radius:9999px;
          background:${color};
          border:4px solid white;
          box-shadow:0 0 0 ${selected ? "7px" : "4px"} rgba(37,99,235,0.18),0 12px 28px rgba(15,23,42,0.3);
        ">
          <div style="
            position:absolute;
            left:50%;
            top:-8px;
            width:0;
            height:0;
            margin-left:-5px;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-bottom:10px solid ${color};
            transform-origin:50% ${coreSize / 2 + 8}px;
            transform:rotate(${Number.isFinite(heading) ? heading : 0}deg);
            filter:drop-shadow(0 1px 1px rgba(15,23,42,0.25));
          "></div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -16],
  });
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
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const {
    animatedPositions,
    icons,
  } = useCommandCenterMap(
    fleet,
    selectedVehicleId
  );
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [followSelected, setFollowSelected] = useState(true);
  const [search, setSearch] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
const [voiceTranscript, setVoiceTranscript] = useState("");
const [copilotResponse, setCopilotResponse] = useState("");

const {
  premiumAllowed,
  subscriptionLoaded,
  subscription,
} = usePremiumAccess();

  
 



  useEffect(() => {
    loadOperationsSummary();
    loadOperationsTimeline();

    const refreshOperations = () => {
      loadOperationsSummary();
      loadOperationsTimeline();
    };

    const routeAssignmentsChannel = supabase
      .channel("command-center-route-assignments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_assignments" },
        refreshOperations
      )
      .subscribe();

    const routeEscalationsChannel = supabase
      .channel("command-center-route-escalations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_safety_escalation_logs" },
        refreshOperations
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel("command-center-notifications-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "command_center_notifications" },
        refreshOperations
      )
      .subscribe();

    return () => {
      supabase.removeChannel(routeAssignmentsChannel);
      supabase.removeChannel(routeEscalationsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, []);





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



  
  const globalThreatScore = useMemo(() => {
  if (threatFeed.length === 0) return 0;

  const total = threatFeed.reduce(
    (sum, threat) =>
      sum + Number(threat.probability || 0),
    0
  );

  return Math.round(total / threatFeed.length);
}, [threatFeed]);

const topThreatVehicles = useMemo(() => {
  return [...threatFeed]
    .sort(
      (a, b) =>
        b.probability - a.probability
    )
    .slice(0, 5);
}, [threatFeed]);

const operationalStatus =
  globalThreatScore >= 80
    ? "CRITICAL"
    : globalThreatScore >= 60
    ? "HIGH ALERT"
    : globalThreatScore >= 40
    ? "ELEVATED"
    : "STABLE";

const operationalColor =
  globalThreatScore >= 80
    ? "#dc2626"
    : globalThreatScore >= 60
    ? "#ea580c"
    : globalThreatScore >= 40
    ? "#d97706"
    : "#16a34a";
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




























































































