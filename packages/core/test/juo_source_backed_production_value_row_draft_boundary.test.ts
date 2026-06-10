import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueCreationGateInventory,
  juoRewardSourceBackedProductionValueCreationGateInventory
} from './fixtures/juo_source_backed_production_value_creation_gate';
import {
  juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory,
  juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_draft_boundary';

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

const carriedCreationGateKeys = [
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
    'sourceBackedProductionValueCreationGateStatus',
    'sourceBackedProductionValueRowDraftBoundaryId',
    'sourceBackedProductionValueRowDraftBoundaryStatus'
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

describe('Juo source-backed production value row draft boundary inventory', () => {
  test('preserves one row draft boundary row per creation gate row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory
        .map((row) => row.sourceBackedProductionValueCreationGateId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueCreationGateInventory
        .map((row) => row.sourceBackedProductionValueCreationGateId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
        .map((row) => row.sourceBackedProductionValueCreationGateId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueCreationGateInventory
        .map((row) => row.sourceBackedProductionValueCreationGateId)
        .sort()
    );
  });

  test('keeps row draft boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowCreationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueCreationGateStatus).toBe('creation_blocked');
      expect(row.sourceBackedProductionValueRowDraftEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowDraftBoundaryStatus).toBe('draft_boundary_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps row draft boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
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

  test('keeps row draft boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowDraftBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowDraftBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowDraftBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_draft_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_draft_boundary')).toBe(true);
    }
  });

  test('carries creation gate metadata without creating production values', () => {
    const probabilityCreationGates = new Map(
      juoProbabilitySourceBackedProductionValueCreationGateInventory.map((row) => [
        row.sourceBackedProductionValueCreationGateId,
        row
      ])
    );
    const rewardCreationGates = new Map(
      juoRewardSourceBackedProductionValueCreationGateInventory.map((row) => [
        row.sourceBackedProductionValueCreationGateId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory) {
      const gate = probabilityCreationGates.get(row.sourceBackedProductionValueCreationGateId);
      expect(gate).toBeDefined();

      for (const key of carriedCreationGateKeys) {
        expect(row[key]).toBe(gate?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueRowDraftBoundaryInventory) {
      const gate = rewardCreationGates.get(row.sourceBackedProductionValueCreationGateId);
      expect(gate).toBeDefined();

      for (const key of carriedCreationGateKeys) {
        expect(row[key]).toBe(gate?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(gate?.accountingConsistencyStatus);
    }
  });
});
