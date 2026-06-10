import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_shell_review_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_shell_boundary';

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
  'sourceBackedProductionValueRowBody',
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

const carriedRowShellReviewBoundaryKeys = [
  'sourceBackedProductionValueRowShellReviewBoundaryId',
  'sourceBackedProductionValueRowDraftBoundaryId',
  'sourceBackedProductionValueCreationGateId',
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
  'sourceBackedProductionValueRowCreationEligibility',
  'sourceBackedProductionValueCreationGateStatus',
  'sourceBackedProductionValueRowDraftEligibility',
  'sourceBackedProductionValueRowDraftBoundaryStatus',
  'sourceBackedProductionValueRowShellReviewEligibility',
  'sourceBackedProductionValueRowShellReviewBoundaryStatus',
  'sourceBackedProductionValueRowBodyCreationEligibility',
  'executionEligibility'
] as const;

const rowShellBoundaryKeys = [
  ...carriedRowShellReviewBoundaryKeys,
  'sourceBackedProductionValueRowShellBoundaryId',
  'sourceBackedProductionValueRowShellEligibility',
  'sourceBackedProductionValueRowShellBoundaryStatus'
] as const;

const rewardRowShellBoundaryKeys = [...rowShellBoundaryKeys, 'accountingConsistencyStatus'] as const;

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
    'sourceBackedProductionValueCreationGateStatus',
    'sourceBackedProductionValueRowDraftBoundaryId',
    'sourceBackedProductionValueRowDraftBoundaryStatus',
    'sourceBackedProductionValueRowShellReviewBoundaryId',
    'sourceBackedProductionValueRowShellReviewBoundaryStatus',
    'sourceBackedProductionValueRowShellBoundaryId',
    'sourceBackedProductionValueRowShellBoundaryStatus'
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
    expect(value).not.toBe('drafted');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value row shell boundary inventory', () => {
  test('preserves one row shell boundary row per row shell review boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellReviewBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellReviewBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowShellBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellReviewBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellReviewBoundaryId)
        .sort()
    );
  });

  test('keeps row shell boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowShellBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowCreationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueCreationGateStatus).toBe('creation_blocked');
      expect(row.sourceBackedProductionValueRowDraftEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowDraftBoundaryStatus).toBe('draft_boundary_blocked');
      expect(row.sourceBackedProductionValueRowShellReviewEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryStatus).toBe('row_shell_review_blocked');
      expect(row.sourceBackedProductionValueRowShellEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowShellBoundaryStatus).toBe('row_shell_boundary_blocked');
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps row shell boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowShellBoundaryInventory
    ]) {
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBody');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
    }
  });

  test('keeps row shell boundary row key sets closed', () => {
    for (const row of juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rowShellBoundaryKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowShellBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardRowShellBoundaryKeys].sort());
    }
  });

  test('keeps row shell boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowShellBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowShellBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowShellBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_shell_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_shell_boundary')).toBe(true);
    }
  });

  test('carries row shell review boundary metadata without creating production values', () => {
    const probabilityReviewRows = new Map(
      juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowShellReviewBoundaryId,
        row
      ])
    );
    const rewardReviewRows = new Map(
      juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowShellReviewBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory) {
      const review = probabilityReviewRows.get(row.sourceBackedProductionValueRowShellReviewBoundaryId);
      expect(review).toBeDefined();

      for (const key of carriedRowShellReviewBoundaryKeys) {
        expect(row[key]).toBe(review?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueRowShellBoundaryInventory) {
      const review = rewardReviewRows.get(row.sourceBackedProductionValueRowShellReviewBoundaryId);
      expect(review).toBeDefined();

      for (const key of carriedRowShellReviewBoundaryKeys) {
        expect(row[key]).toBe(review?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(review?.accountingConsistencyStatus);
    }
  });
});
