import { describe, expect, test } from 'vitest';
import {
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
} from './fixtures/juo_guarded_source_backed_production_value_materialization_candidate_review_boundary';
import {
  juoProbabilityMaterializationApprovalBoundaryInventory,
  juoRewardMaterializationApprovalBoundaryInventory
} from './fixtures/juo_materialization_approval_boundary';

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

const carriedReviewBoundaryKeys = [
  'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId',
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
  'candidateReviewEligibility',
  'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus',
  'executionEligibility'
] as const;

const approvalBoundaryKeys = [
  ...carriedReviewBoundaryKeys,
  'materializationApprovalBoundaryId',
  'approvalEligibility',
  'materializationApprovalBoundaryStatus'
] as const;

const rewardApprovalBoundaryKeys = [
  ...approvalBoundaryKeys,
  'accountingConsistencyStatus'
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
    'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus',
    'materializationApprovalBoundaryId',
    'materializationApprovalBoundaryStatus'
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

describe('Juo materialization approval boundary inventory', () => {
  test('preserves one approval boundary row per guarded candidate review boundary row', () => {
    expect(
      juoProbabilityMaterializationApprovalBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId)
        .sort()
    );
    expect(
      juoRewardMaterializationApprovalBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId)
        .sort()
    ).toEqual(
      juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory
        .map((row) => row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId)
        .sort()
    );
  });

  test('keeps approval boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilityMaterializationApprovalBoundaryInventory,
      ...juoRewardMaterializationApprovalBoundaryInventory
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
      expect(row.approvalEligibility).toBe('no');
      expect(row.materializationApprovalBoundaryStatus).toBe('approval_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps approval boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilityMaterializationApprovalBoundaryInventory,
      ...juoRewardMaterializationApprovalBoundaryInventory
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

  test('keeps approval boundary row key sets closed', () => {
    for (const row of juoProbabilityMaterializationApprovalBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...approvalBoundaryKeys].sort());
    }

    for (const row of juoRewardMaterializationApprovalBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardApprovalBoundaryKeys].sort());
    }
  });

  test('keeps approval boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilityMaterializationApprovalBoundaryInventory.map(
      (row) => row.materializationApprovalBoundaryId
    );
    const rewardIds = juoRewardMaterializationApprovalBoundaryInventory.map((row) => row.materializationApprovalBoundaryId);

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_materialization_approval_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_materialization_approval_boundary')).toBe(true);
    }
  });

  test('carries guarded candidate review metadata without creating production values', () => {
    const probabilityReviews = new Map(
      juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map((row) => [
        row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId,
        row
      ])
    );
    const rewardReviews = new Map(
      juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map((row) => [
        row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilityMaterializationApprovalBoundaryInventory) {
      const review = probabilityReviews.get(row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId);
      expect(review).toBeDefined();

      for (const key of carriedReviewBoundaryKeys) {
        expect(row[key]).toBe(review?.[key]);
      }
    }

    for (const row of juoRewardMaterializationApprovalBoundaryInventory) {
      const review = rewardReviews.get(row.guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId);
      expect(review).toBeDefined();

      for (const key of carriedReviewBoundaryKeys) {
        expect(row[key]).toBe(review?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(review?.accountingConsistencyStatus);
    }
  });
});
