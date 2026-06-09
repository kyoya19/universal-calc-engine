import { describe, expect, test } from 'vitest';
import { juoSourceCandidateReviewGateInventory } from './fixtures/juo_review_gate';
import { juoCitationMetadataInventory } from './fixtures/juo_citation_metadata';

const forbiddenExecutableKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability'
]);

describe('Juo citation metadata inventory', () => {
  test('preserves one citation metadata row per review gate row', () => {
    const reviewSourceIds = juoSourceCandidateReviewGateInventory.map((row) => row.candidate.sourceId).sort();
    const citationSourceIds = juoCitationMetadataInventory.map((row) => row.sourceId).sort();

    expect(citationSourceIds).toEqual(reviewSourceIds);
  });

  test('keeps citation metadata non-executable', () => {
    for (const row of juoCitationMetadataInventory) {
      expect(row.citationId.trim()).not.toBe('');
      expect(row.sourceId.trim()).not.toBe('');
      expect(row.sourceType.trim()).not.toBe('');
      expect(row.sourceTitleStatus).toBe('unknown');
      expect(row.sourceLocationStatus).toBe('unknown');
      expect(row.retrievalStatus).toBe('not_started');
      expect(row.transcriptionStatus).toBe('not_started');
      expect(row.executionEligibility).toBe('no');

      for (const key of Object.keys(row)) {
        expect(forbiddenExecutableKeys.has(key)).toBe(false);
      }
    }
  });

  test('does not treat citation metadata as an executable value', () => {
    for (const row of juoCitationMetadataInventory) {
      const copiedRow = { ...row };
      expect(copiedRow.executionEligibility).toBe('no');

      for (const key of Object.keys(copiedRow)) {
        expect(forbiddenExecutableKeys.has(key)).toBe(false);
      }
    }
  });
});
