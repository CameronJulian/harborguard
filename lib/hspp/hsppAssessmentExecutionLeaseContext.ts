/**
 * Recovery-only infrastructure authorization context for one HSPP
 * assembly-assessment execution owner.
 *
 * This context carries ownership identity only. It does not carry
 * assessment state, trust state, eligibility state or completion state.
 */
export type HsppAssessmentExecutionLeaseContext = {
  assemblyId: string;
  leaseToken: string;
};
