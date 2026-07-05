export type DashcamStatus = "online" | "offline" | "warning";

export type DashcamCamera = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  vendor: string;
  status: DashcamStatus;
  recording: boolean;
  storageUsedPercent: number;
  lastHeartbeat: string | null;
  lastClipAt: string | null;
  latestClipLabel: string | null;
  aiEvents: string[];
};

export type DashcamProviderResult = {
  provider: string;
  cameras: DashcamCamera[];
  generatedAt: string;
};
