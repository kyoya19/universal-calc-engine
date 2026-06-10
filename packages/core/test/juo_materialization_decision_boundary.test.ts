import { describe, expect, test } from 'vitest';
import {
  juoProbabilityMaterializationApprovalBoundaryInventory,
  juoRewardMaterializationApprovalBoundaryInventory
} from './fixtures/juo_materialization_approval_boundary';
import {
  juoProbabilityMaterializationDecisionBoundaryInventory,
  juoRewardMaterializationDecisionBoundaryInventory
} from './fixtures/juo_materialization_decision_boundary';

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

const carriedApprovalBoundaryKeys = [
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
  'executionEligibility'
] as const;

const decisionBoundaryKeys = [
  ...carriedApprovalBoundaryKeys,
  'materializationDecisionBoundaryId',
  'materializationDecisionEligibility',
  'materializationDecisionBoundaryStatus'
] as const;

const rewardDecisionBoundaryKeys = [...decisionBoundaryKeys, 'accountingConsistencyStatus'] as const;

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
    'materializationDecisionBoundaryStatus'
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
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo materialization decision boundary inventory', () => {
  test('preserves one decision boundary row per approval boundary row', () => {
    expect(
      juoProbabilityMaterializationDecisionBoundaryInventory
        .map((row) => row.materializationApprovalBoundaryId)
        .sort()
    ).toEqual(juoProbabilityMaterializationApprovalBoundaryInventory.map((row) => row.materializationApprovalBoundaryId).sort());
    expect(juoRewardMaterializationDecisionBoundaryInventory.map((row) => row.materializationApprovalBoundaryId).sort()).toEqual(
      juoRewardMaterializationApprovalBoundaryInventory.map((row) => row.materializationApprovalBoundaryId).sort()
    );
  });

  test('keeps decision boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilityMaterializationDecisionBoundaryInventory,
      ...juoRewardMaterializationDecisionBoundaryInventory
    ]) {
      expect(row.approvalEligibility).toBe('no');
      expect(row.materializationApprovalBoundaryStatus).toBe('approval_blocked');
      expect(row.materializationDecisionEligibility).toBe('no');
      expect(row.materializationDecisionBoundaryStatus).toBe('decision_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps decision boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilityMaterializationDecisionBoundaryInventory,
      ...juoRewardMaterializationDecisionBoundaryInventory
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

  test('keeps decision boundary row key sets closed', () => {
    for (const row of juoProbabilityMaterializationDecisionBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...decisionBoundaryKeys].sort());
    }

    for (const row of juoRewardMaterializationDecisionBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardDecisionBoundaryKeys].sort());
    }
  });

  test('keeps decision boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilityMaterializationDecisionBoundaryInventory.map(
      (row) => row.materializationDecisionBoundaryId
    );
    const rewardIds = juoRewardMaterializationDecisionBoundaryInventory.map((row) => row.materializationDecisionBoundaryId);

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_materialization_decision_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_materialization_decision_boundary')).toBe(true);
    }
  });

  test('carries approval boundary metadata without creating production values', () => {
    const probabilityApprovals = new Map(
      juoProbabilityMaterializationApprovalBoundaryInventory.map((row) => [row.materializationApprovalBoundaryId, row])
    );
    const rewardApprovals = new Map(
      juoRewardMaterializationApprovalBoundaryInventory.map((row) => [row.materializationApprovalBoundaryId, row])
    );

    for (const row of juoProbabilityMaterializationDecisionBoundaryInventory) {
      const approval = probabilityApprovals.get(row.materializationApprovalBoundaryId);
      expect(approval).toBeDefined();

      for (const key of carriedApprovalBoundaryKeys) {
        expect(row[key]).toBe(approval?.[key]);
      }
    }

    for (const row of juoRewardMaterializationDecisionBoundaryInventory) {
      const approval = rewardApprovals.get(row.materializationApprovalBoundaryId);
      expect(approval).toBeDefined();

      for (const key of carriedApprovalBoundaryKeys) {
        expect(row[key]).toBe(approval?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(approval?.accountingConsistencyStatus);
    }
  });
});
