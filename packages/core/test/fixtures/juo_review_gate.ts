import { juoSourceCandidateInventory, type JuoSourceCandidateInventoryRow } from './juo';

export type JuoSourceCandidateReviewStatus =
  | 'not_started'
  | 'needs_source'
  | 'needs_citation'
  | 'needs_transcription'
  | 'needs_unit_mapping'
  | 'needs_conflict_review'
  | 'ready_for_review'
  | 'rejected'
  | 'excluded';

export interface JuoSourceCandidateReviewGateRow {
  readonly candidate: JuoSourceCandidateInventoryRow;
  readonly reviewStatus: JuoSourceCandidateReviewStatus;
  readonly reviewEligibility: 'no';
  readonly executionEligibility: 'no';
}

export const juoSourceCandidateReviewGateInventory: readonly JuoSourceCandidateReviewGateRow[] =
  juoSourceCandidateInventory.map((candidate) => ({
    candidate,
    reviewStatus: candidate.sourceType === 'excluded' ? 'excluded' : 'not_started',
    reviewEligibility: 'no',
    executionEligibility: 'no'
  }));
