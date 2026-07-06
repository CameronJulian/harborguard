export type ANPRStatus = "verified" | "review" | "watchlist_review";

export type ANPRDetection = {
  id: string;
  vehicleId: string;
  plateNumber: string;
  vehicleName: string;
  nickname?: string | null;
  cameraName: string;
  source: string;
  confidence: number;
  status: ANPRStatus;
  watchlistMatch: boolean;
  detectedAt: string;
  location: string;
  recommendedAction: string;
};

export type ANPRProviderResult = {
  provider: string;
  detections: ANPRDetection[];
  generatedAt: string;
};
