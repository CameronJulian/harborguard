export type CCTVStatus = "online" | "offline" | "warning";

export type CCTVCamera = {
  id: string;
  cameraName: string;
  vendor: string;
  location: string;
  linkedVehicleId: string;
  linkedVehicle: string;
  status: CCTVStatus;
  recording: boolean;
  motionDetected: boolean;
  aiEventCount: number;
  personCount: number;
  vehicleCount: number;
  latencyMs: number | null;
  lastFrameAt: string | null;
  lastEvent: string;
  recommendedAction: string;
};

export type CCTVProviderResult = {
  provider: string;
  cameras: CCTVCamera[];
  generatedAt: string;
};
