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
      <AIAccidentDetection />
      <DashcamMonitoring />
      <ComputerVisionAnalytics />
      <ANPRDashboard />
      <CCTVMonitoring />
      <InsuranceResponseCenter />
      <TrafficFlowDashboard />
      <FleetOptimizationDashboard />
      <MissionBoard />
      <LiveMissionTrackingDashboard />
      <LiveFleetOperationsMap />
      <ExecutiveOperationsDashboard />
      <FleetHealthDashboard />
      <AICommandAssistant />
      <FleetMissionQueue />
      <MissionAutomationRules />
      <SupervisorEscalationCenter />
      <AIIncidentCorrelationDashboard />
      <PredictiveIncidentIntelligence />
      <PrescriptiveResponseIntelligence />
      <FleetDigitalTwinDashboard />
      <PredictiveETADashboard />

      <MissionReplayTimeline
        events={operationsTimeline}
        title="Mission Replay Timeline"
      />

      <AIShiftSummary />
      <DispatcherRecommendations />
      <IncidentCommandDashboard />
      <IncidentInvestigationTimeline />
    </>
  );
}