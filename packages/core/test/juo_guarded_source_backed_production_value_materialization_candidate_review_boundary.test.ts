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

const forbiddenKeyFragments = [
  'numeric',
  'decimal',
  'numerator',
  'denominator',
  'payout',
  'graphBinding',
  'runtimeTarget',
  'targetSubstitution',
  'expectedValue',
  'expectedReward',
  'Assertion'
];

const carriedCandidateBoundaryKeys = [
  'guardedSourceBackedProductionValueMaterializationCandidateBoundaryId',
  'sourceBackedProductionValueMaterializationBoundaryId',
  'sourceBackedProductionValuePromotionId',
  'sourceBackedProductionValueDraftId',
  'preflightId',
  'readinessReviewId',
  'productionValuePlaceholderId',
  'draftMetadataId',
  'promotionGateId',
  'extractedValueMetadataId',
  'unitMetadataId',
  'citationId',
  'sourceId',
  'sourceType',
  'valueDomain',
  'placeholderStatus',
  'preflightStatus',
  'sourceBackedValueReadinessStatus',
  'citationConsistencyStatus',
  'unitConsistencyStatus',
  'normalizationConsistencyStatus',
  'conflictReviewStatus',
  'promotionDecisionStatus',
  'sourceBackedValueCreationEligibility',
  'draftStatus',
  'sourceBackedProductionValuePromotionStatus',
  'materializationEligibility',
  'sourceBackedProductionValueMaterializationBoundaryStatus',
  'materializationCandidateEligibility',
  'guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus',
  'executionEligibility'
] as const;

function expectNoForbiddenKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenKeys.has(key)).toBe(false);
  }
}

function expectNoForbiddenKeyFragments(row: Record<string, unknown>): void {
  const exemptKeys = new Set([
    'productionValuePlaceholderId',
    'sourceBackedProductionValuePromotionId',
    'sourceBackedProductionValueDraftId',
    'sourceBackedProductionValueMaterializationBoundaryId',
    'sourceBackedProductionValuePromotionStatus',
    'sourceBackedProductionValueMaterializationBoundaryStatus',
    'guardedSourceBackedProductionValueMaterializationCandidateBoundaryId',
    'guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus',
    'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId',
    'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus'
  ]);

  for (const key of Object.keys(row)) {
    if (exemptKeys.has(key)) {
      continue;
    }

    for (const fragment of forbiddenKeyFragments) {
      expect(key).not.toContain(fragment);
    }
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

type CandidateReviewBoundaryGuardRow = Record<string, unknown>;

function allGuardedCandidateReviewBoundaryRows(): readonly CandidateReviewBoundaryGuardRow[] {
  return [
    ...juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map((row) => ({ ...row }))
  ];
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

  test('keeps guarded candidate review boundary rows copied after JSON serialization', () => {
    const rows = allGuardedCandidateReviewBoundaryRows();
    const serializedRows = JSON.parse(JSON.stringify(rows)) as typeof rows;

    expect(serializedRows).toEqual(rows);
    expect(serializedRows).not.toBe(rows);
    serializedRows.forEach((row, index) => {
      expect(row).not.toBe(rows[index]);
      expectNoForbiddenKeys(row);
      expectNoForbiddenKeyFragments(row);
      expectNoReadyStates(row);
    });
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
      expectNoForbiddenKeyFragments({ ...row });
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
      expectNoForbiddenKeyFragments({ ...row });
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

  test('carries guarded candidate boundary metadata without creating production values', () => {
    const probabilityCandidates = new Map(
      juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory.map((row) => [
        row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId,
        row
      ])
    );
    const rewardCandidates = new Map(
      juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory.map((row) => [
        row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory) {
      const candidate = probabilityCandidates.get(row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId);
      expect(candidate).toBeDefined();

      for (const key of carriedCandidateBoundaryKeys) {
        expect(row[key]).toBe(candidate?.[key]);
      }
    }

    for (const row of juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory) {
      const candidate = rewardCandidates.get(row.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId);
      expect(candidate).toBeDefined();

      for (const key of carriedCandidateBoundaryKeys) {
        expect(row[key]).toBe(candidate?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(candidate?.accountingConsistencyStatus);
    }
  });
});
