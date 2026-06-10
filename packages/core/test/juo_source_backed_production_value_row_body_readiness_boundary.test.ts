import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_shell_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_readiness_boundary';

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
  'sourceBackedProductionValueRowBodyPlaceholder',
  'sourceBackedProductionValueRowShellValue',
  'sourceBackedProductionValueRowShellNumericValue',
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

const carriedRowShellBoundaryKeys = [
  'sourceBackedProductionValueRowShellBoundaryId',
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
  'sourceBackedProductionValueRowShellEligibility',
  'sourceBackedProductionValueRowShellBoundaryStatus',
  'sourceBackedProductionValueRowBodyCreationEligibility',
  'executionEligibility'
] as const;

const rowBodyReadinessBoundaryKeys = [
  ...carriedRowShellBoundaryKeys,
  'sourceBackedProductionValueRowBodyReadinessBoundaryId',
  'sourceBackedProductionValueRowBodyReadinessEligibility',
  'sourceBackedProductionValueRowBodyReadinessBoundaryStatus',
  'sourceBackedProductionValueRowBodyPlaceholderEligibility'
] as const;

const rewardRowBodyReadinessBoundaryKeys = [
  ...rowBodyReadinessBoundaryKeys,
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
    'sourceBackedProductionValueRowShellBoundaryStatus',
    'sourceBackedProductionValueRowBodyReadinessBoundaryId',
    'sourceBackedProductionValueRowBodyReadinessBoundaryStatus'
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
    expect(value).not.toBe('placeholder_created');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value row body readiness boundary inventory', () => {
  test('preserves one row body readiness boundary row per row shell boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowShellBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowShellBoundaryId)
        .sort()
    );
  });

  test('keeps row body readiness boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowCreationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueCreationGateStatus).toBe('creation_blocked');
      expect(row.sourceBackedProductionValueRowDraftEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowDraftBoundaryStatus).toBe('draft_boundary_blocked');
      expect(row.sourceBackedProductionValueRowShellReviewEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryStatus).toBe('row_shell_review_blocked');
      expect(row.sourceBackedProductionValueRowShellEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowShellBoundaryStatus).toBe('row_shell_boundary_blocked');
      expect(row.sourceBackedProductionValueRowBodyReadinessEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyReadinessBoundaryStatus).toBe(
        'row_body_readiness_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyPlaceholderEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps row body readiness boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
    ]) {
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBody');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyPlaceholder');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
    }
  });

  test('keeps row body readiness boundary row key sets closed', () => {
    for (const row of juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rowBodyReadinessBoundaryKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardRowBodyReadinessBoundaryKeys].sort());
    }
  });

  test('keeps row body readiness boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_readiness_boundary')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_readiness_boundary')).toBe(
        true
      );
    }
  });

  test('carries row shell boundary metadata without creating production values', () => {
    const probabilityShellRows = new Map(
      juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowShellBoundaryId,
        row
      ])
    );
    const rewardShellRows = new Map(
      juoRewardSourceBackedProductionValueRowShellBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowShellBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory) {
      const shell = probabilityShellRows.get(row.sourceBackedProductionValueRowShellBoundaryId);
      expect(shell).toBeDefined();

      for (const key of carriedRowShellBoundaryKeys) {
        expect(row[key]).toBe(shell?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory) {
      const shell = rewardShellRows.get(row.sourceBackedProductionValueRowShellBoundaryId);
      expect(shell).toBeDefined();

      for (const key of carriedRowShellBoundaryKeys) {
        expect(row[key]).toBe(shell?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(shell?.accountingConsistencyStatus);
    }
  });
});
