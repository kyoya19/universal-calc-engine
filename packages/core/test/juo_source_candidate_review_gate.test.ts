import { describe, expect, test } from 'vitest';
import { juoSourceCandidateInventory } from './fixtures/juo';
import { juoSourceCandidateReviewGateInventory } from './fixtures/juo_review_gate';

const reviewStatuses = new Set([
  'not_started',
  'needs_source',
  'needs_citation',
  'needs_transcription',
  'needs_unit_mapping',
  'needs_conflict_review',
  'ready_for_review',
  'rejected',
  'excluded'
]);

describe('Juo source candidate review gate', () => {
  test('keeps review eligibility separate from execution eligibility', () => {
    expect(juoSourceCandidateReviewGateInventory).toHaveLength(juoSourceCandidateInventory.length);

    for (const row of juoSourceCandidateReviewGateInventory) {
      expect(reviewStatuses.has(row.reviewStatus)).toBe(true);
      expect(row.reviewEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expect(row.candidate.executionEligibility).toBe('no');
    }
  });

  test('preserves one review gate row per source candidate', () => {
    const candidateIds = juoSourceCandidateInventory.map((candidate) => candidate.sourceId).sort();
    const reviewCandidateIds = juoSourceCandidateReviewGateInventory.map((row) => row.candidate.sourceId).sort();

    expect(reviewCandidateIds).toEqual(candidateIds);
  });

  test('keeps excluded candidates outside review promotion', () => {
    for (const row of juoSourceCandidateReviewGateInventory) {
      if (row.candidate.sourceType === 'excluded') {
        expect(row.reviewStatus).toBe('excluded');
      }
    }
  });

  test('does not treat ready-for-review as execution eligibility', () => {
    const readyForReviewRows = juoSourceCandidateReviewGateInventory.map((row) => ({
      ...row,
      reviewStatus: row.candidate.sourceType === 'excluded' ? row.reviewStatus : 'ready_for_review'
    }));

    for (const row of readyForReviewRows) {
      expect(row.executionEligibility).toBe('no');
      expect(row.candidate.executionEligibility).toBe('no');
    }
  });
});
