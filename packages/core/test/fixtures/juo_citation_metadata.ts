import { juoSourceCandidateReviewGateInventory } from './juo_review_gate';

export interface JuoCitationMetadataRow {
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly sourceTitleStatus: 'unknown';
  readonly sourceLocationStatus: 'unknown';
  readonly retrievalStatus: 'not_started';
  readonly observedAtStatus: 'not_applicable';
  readonly transcriptionStatus: 'not_started';
  readonly confidenceStatus: 'unverified' | 'excluded';
  readonly conflictStatus: 'unknown' | 'not_applicable';
  readonly reviewStatus: string;
  readonly executionEligibility: 'no';
}

export const juoCitationMetadataInventory: readonly JuoCitationMetadataRow[] =
  juoSourceCandidateReviewGateInventory.map((row) => ({
    citationId: `${row.candidate.sourceId}_citation`,
    sourceId: row.candidate.sourceId,
    sourceType: row.candidate.sourceType,
    sourceTitleStatus: 'unknown',
    sourceLocationStatus: 'unknown',
    retrievalStatus: 'not_started',
    observedAtStatus: 'not_applicable',
    transcriptionStatus: 'not_started',
    confidenceStatus: row.candidate.confidenceStatus,
    conflictStatus: row.candidate.conflictStatus,
    reviewStatus: row.reviewStatus,
    executionEligibility: 'no'
  }));
