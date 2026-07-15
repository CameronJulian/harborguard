import CommandCenterThemeSwitcher from "@/components/command-center/CommandCenterThemeSwitcher";
import CommandWall from "@/components/command-center/CommandWall";
import AuditPlayback from "@/components/command-center/AuditPlayback";
import DispatcherCollaboration from "@/components/command-center/DispatcherCollaboration";
import IncidentAssignmentBoard from "@/components/command-center/IncidentAssignmentBoard";
import AIAccidentDetection from "@/components/command-center/AIAccidentDetection";
import DashcamMonitoring from "@/components/command-center/DashcamMonitoring";
import ComputerVisionAnalytics from "@/components/command-center/ComputerVisionAnalytics";
import ANPRDashboard from "@/components/command-center/ANPRDashboard";
import CCTVMonitoring from "@/components/command-center/CCTVMonitoring";
import InsuranceResponseCenter from "@/components/command-center/InsuranceResponseCenter";
import TrafficFlowDashboard from "@/components/command-center/TrafficFlowDashboard";
import WeatherIntelligenceDashboard from "@/components/command-center/WeatherIntelligenceDashboard";
import FleetOptimizationDashboard from "@/components/command-center/FleetOptimizationDashboard";
import MissionBoard from "@/components/command-center/MissionBoard";
import LiveMissionTrackingDashboard from "@/components/command-center/LiveMissionTrackingDashboard";
import LiveFleetOperationsMap from "@/components/command-center/LiveFleetOperationsMap";
import ExecutiveOperationsDashboard from "@/components/command-center/ExecutiveOperationsDashboard";
import FleetHealthDashboard from "@/components/command-center/FleetHealthDashboard";
import AICommandAssistant from "@/components/command-center/AICommandAssistant";
import FleetMissionQueue from "@/components/command-center/FleetMissionQueue";
import MissionAutomationRules from "@/components/command-center/MissionAutomationRules";
import SupervisorEscalationCenter from "@/components/command-center/SupervisorEscalationCenter";
import AIIncidentCorrelationDashboard from "@/components/command-center/AIIncidentCorrelationDashboard";
import PredictiveIncidentIntelligence from "@/components/command-center/PredictiveIncidentIntelligence";
import PrescriptiveResponseIntelligence from "@/components/command-center/PrescriptiveResponseIntelligence";
import FleetDigitalTwinDashboard from "@/components/command-center/FleetDigitalTwinDashboard";
import PredictiveETADashboard from "@/components/command-center/PredictiveETADashboard";
import MissionReplayTimeline from "@/components/command-center/MissionReplayTimeline";
import AIShiftSummary from "@/components/command-center/AIShiftSummary";
import DispatcherRecommendations from "@/components/command-center/DispatcherRecommendations";
import DeferredMount from "../components/DeferredMount";
import IncidentCommandDashboard from "@/components/command-center/IncidentCommandDashboard";
import IncidentInvestigationTimeline from "@/components/command-center/IncidentInvestigationTimeline";

type Props = {
  operationsTimeline: any[];
};

export default function CommandCenterIntelligenceModulesSection({
  operationsTimeline,
}: Props) {
  return (
    <>
      <CommandCenterThemeSwitcher />
      <CommandWall />
      <AuditPlayback />
      <DispatcherCollaboration />
      <IncidentAssignmentBoard />
      <DeferredMount delayMs={1500}>
        <AIAccidentDetection />
      </DeferredMount>
      <DeferredMount delayMs={1800}>
        <DashcamMonitoring />
      </DeferredMount>
      <DeferredMount delayMs={2000}>
        <ComputerVisionAnalytics />
      </DeferredMount>
      <DeferredMount delayMs={2200}>
        <ANPRDashboard />
      </DeferredMount>
      <DeferredMount delayMs={2400}>
        <CCTVMonitoring />
      </DeferredMount>
      <InsuranceResponseCenter />
      <TrafficFlowDashboard />
      <WeatherIntelligenceDashboard />
      <DeferredMount delayMs={2600}>
        <FleetOptimizationDashboard />
      </DeferredMount>
      <MissionBoard />
      <LiveMissionTrackingDashboard />
      <LiveFleetOperationsMap />
      <DeferredMount delayMs={3000}>
        <ExecutiveOperationsDashboard />
      </DeferredMount>
      <FleetHealthDashboard />
      <AICommandAssistant />
      <FleetMissionQueue />
      <MissionAutomationRules />
      <SupervisorEscalationCenter />
      <AIIncidentCorrelationDashboard />
      <DeferredMount delayMs={3200}>
        <PredictiveIncidentIntelligence />
      </DeferredMount>
      <DeferredMount delayMs={3400}>
        <PrescriptiveResponseIntelligence />
      </DeferredMount>
      <DeferredMount delayMs={3600}>
        <FleetDigitalTwinDashboard />
      </DeferredMount>
      <DeferredMount delayMs={3800}>
        <PredictiveETADashboard />
      </DeferredMount>

      <MissionReplayTimeline
        events={operationsTimeline}
        title="Mission Replay Timeline"
      />

      <DeferredMount delayMs={4000}>
        <AIShiftSummary />
      </DeferredMount>
      <DeferredMount delayMs={4200}>
        <DispatcherRecommendations />
      </DeferredMount>
      <IncidentCommandDashboard />
      <IncidentInvestigationTimeline />
    </>
  );
}

