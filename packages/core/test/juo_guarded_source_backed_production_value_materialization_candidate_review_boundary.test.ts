import { describe, expect, test } from 'vitest';
import {
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory,
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory
} from './fixtures/juo_guarded_source_backed_production_value_materialization_candidate_boundary';
import {
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
} from './fixtures/juo_guarded_source_backed_production_value_materialization_candidate_review_boundary';

const forbiddenKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount',
  'productionValue',
  'expectedValue',
  'graphBinding',
  'runtimeTarget',
  'sourceBackedValue',
  'sourceBackedProductionValue',
  'sourceBackedNumericValue',
  'sourceBackedDecimalValue',
  'sourceBackedNumerator',
  'sourceBackedDenominator',
  'sourceBackedPayout',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

function expectNoForbiddenKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenKeys.has(key)).toBe(false);
  }
}

function expectNoReadyStates(row: Record<string, unknown>): void {
  for (const value of Object.values(row)) {
    expect(value).not.toBe('ready');
    expect(value).not.toBe('approved');
    expect(value).not.toBe('promoted');
    expect(value).not.toBe('eligible');
    expect(value).not.toBe('candidate');
    expect(value).not.toBe('reviewed');
    expect(value).not.toBe('materialized');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo guarded source-backed production value materialization candidate review boundary inventory', () => {
  test('preserves one guarded candidate review boundary row per guarded candidate boundary row', () => {
    expect(
      juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId)
        .sort()
    );
    expect(
      juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId)
        .sort()
    ).toEqual(
      juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId)
        .sort()
    );
  });

  test('keeps guarded candidate review boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
      ...juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
    ]) {
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.draftStatus).toBe('draft_blocked');
      expect(row.sourceBackedProductionValuePromotionStatus).toBe('promotion_blocked');
      expect(row.materializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueMaterializationBoundaryStatus).toBe('materialization_blocked');
      expect(row.materializationCandidateEligibility).toBe('no');
      expect(row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus).toBe('candidate_blocked');
      expect(row.candidateReviewEligibility).toBe('no');
      expect(row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus).toBe('review_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps guarded candidate review boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
      ...juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
    ]) {
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expectNoForbiddenKeys({ ...row });
    }
  });

  test('keeps guarded candidate review boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map(
      (row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId
    );
    const rewardIds = juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map(
      (row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_guarded_source_backed_production_value_materialization_candidate_review_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_guarded_source_backed_production_value_materialization_candidate_review_boundary')).toBe(true);
    }
  });
});
