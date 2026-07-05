export type VisionSeverity = "low" | "medium" | "high";

export type VisionDetection = {
  label: string;
  confidence: number;
  severity: VisionSeverity;
  description: string;
  recommendedAction: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type VisionAnalysisInput = {
  vehicleId?: string;
  vehicleName?: string;
  cameraName?: string;
  imageUrl?: string;
  frameBase64?: string;
  metadata?: Record<string, any>;
};

export type VisionAnalysisResult = {
  provider: string;
  detections: VisionDetection[];
  analysedAt: string;
  rawResponse?: any;
};
