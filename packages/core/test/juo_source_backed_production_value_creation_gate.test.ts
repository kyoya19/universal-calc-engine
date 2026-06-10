import { describe, expect, test } from 'vitest';
import {
  juoProbabilityMaterializationDecisionBoundaryInventory,
  juoRewardMaterializationDecisionBoundaryInventory
} from './fixtures/juo_materialization_decision_boundary';
import {
  juoProbabilitySourceBackedProductionValueCreationGateInventory,
  juoRewardSourceBackedProductionValueCreationGateInventory
} from './fixtures/juo_source_backed_production_value_creation_gate';

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

const carriedDecisionBoundaryKeys = [
  'materializationDecisionBoundaryId',
  'materializationApprovalBoundaryId',
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
  'approvalEligibility',
  'materializationApprovalBoundaryStatus',
  'materializationDecisionEligibility',
  'materializationDecisionBoundaryStatus',
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
    'guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus',
    'materializationApprovalBoundaryId',
    'materializationApprovalBoundaryStatus',
    'materializationDecisionBoundaryId',
    'materializationDecisionBoundaryStatus',
    'sourceBackedProductionValueCreationGateId',
    'sourceBackedProductionValueCreationGateStatus'
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
    expect(value).not.toBe('decided');
    expect(value).not.toBe('created');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value creation gate inventory', () => {
  test('preserves one creation gate row per materialization decision boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueCreationGateInventory
        .map((row) => row.materializationDecisionBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilityMaterializationDecisionBoundaryInventory.map((row) => row.materializationDecisionBoundaryId).sort()
    );
    expect(
      juoRewardSourceBackedProductionValueCreationGateInventory
        .map((row) => row.materializationDecisionBoundaryId)
        .sort()
    ).toEqual(juoRewardMaterializationDecisionBoundaryInventory.map((row) => row.materializationDecisionBoundaryId).sort());
  });

  test('keeps creation gate rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueCreationGateInventory,
      ...juoRewardSourceBackedProductionValueCreationGateInventory
    ]) {
      expect(row.materializationDecisionEligibility).toBe('no');
      expect(row.materializationDecisionBoundaryStatus).toBe('decision_blocked');
      expect(row.sourceBackedProductionValueRowCreationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueCreationGateStatus).toBe('creation_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps creation gate rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueCreationGateInventory,
      ...juoRewardSourceBackedProductionValueCreationGateInventory
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

  test('keeps creation gate ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueCreationGateInventory.map(
      (row) => row.sourceBackedProductionValueCreationGateId
    );
    const rewardIds = juoRewardSourceBackedProductionValueCreationGateInventory.map(
      (row) => row.sourceBackedProductionValueCreationGateId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_creation_gate')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_creation_gate')).toBe(true);
    }
  });

  test('carries decision boundary metadata without creating production values', () => {
    const probabilityDecisions = new Map(
      juoProbabilityMaterializationDecisionBoundaryInventory.map((row) => [row.materializationDecisionBoundaryId, row])
    );
    const rewardDecisions = new Map(
      juoRewardMaterializationDecisionBoundaryInventory.map((row) => [row.materializationDecisionBoundaryId, row])
    );

    for (const row of juoProbabilitySourceBackedProductionValueCreationGateInventory) {
      const decision = probabilityDecisions.get(row.materializationDecisionBoundaryId);
      expect(decision).toBeDefined();

      for (const key of carriedDecisionBoundaryKeys) {
        expect(row[key]).toBe(decision?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueCreationGateInventory) {
      const decision = rewardDecisions.get(row.materializationDecisionBoundaryId);
      expect(decision).toBeDefined();

      for (const key of carriedDecisionBoundaryKeys) {
        expect(row[key]).toBe(decision?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(decision?.accountingConsistencyStatus);
    }
  });
});
