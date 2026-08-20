import type {
  HsppTrustState,
} from "@/lib/hspp/buildHsppEvidence";

export type HsppAssessmentDecision = {
  trustState: HsppTrustState;

  operationalEligible: boolean;
  crowdEligible: boolean;
  trainingEligible: boolean;
  validationEligible: boolean;

  policyVersion: string;
  reason: string;
};
