import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_readiness_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_boundary';

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
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
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

const carriedRowBodyReadinessBoundaryKeys = [
  'sourceBackedProductionValueRowBodyReadinessBoundaryId',
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
  'executionEligibility',
  'sourceBackedProductionValueRowBodyReadinessEligibility',
  'sourceBackedProductionValueRowBodyReadinessBoundaryStatus',
  'sourceBackedProductionValueRowBodyPlaceholderEligibility'
] as const;

const rowBodyPlaceholderBoundaryKeys = [
  ...carriedRowBodyReadinessBoundaryKeys,
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
] as const;

const rewardRowBodyPlaceholderBoundaryKeys = [
  ...rowBodyPlaceholderBoundaryKeys,
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
    'sourceBackedProductionValueRowBodyReadinessBoundaryStatus',
    'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
    'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
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

describe('Juo source-backed production value row body placeholder boundary inventory', () => {
  test('preserves one row body placeholder boundary row per row body readiness boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId)
        .sort()
    );
  });

  test('keeps row body placeholder boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyReadinessEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyReadinessBoundaryStatus).toBe(
        'row_body_readiness_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyPlaceholderEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus).toBe(
        'row_body_placeholder_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps row body placeholder boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
    ]) {
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBody');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyPlaceholder');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyNumericValue');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
    }
  });

  test('keeps row body placeholder boundary row key sets closed', () => {
    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rowBodyPlaceholderBoundaryKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardRowBodyPlaceholderBoundaryKeys].sort());
    }
  });

  test('keeps row body placeholder boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_placeholder_boundary')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_placeholder_boundary')).toBe(true);
    }
  });

  test('carries row body readiness boundary metadata without creating row body placeholders', () => {
    const probabilityReadinessRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId,
        row
      ])
    );
    const rewardReadinessRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      const readiness = probabilityReadinessRows.get(
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId
      );
      expect(readiness).toBeDefined();

      for (const key of carriedRowBodyReadinessBoundaryKeys) {
        expect(row[key]).toBe(readiness?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      const readiness = rewardReadinessRows.get(row.sourceBackedProductionValueRowBodyReadinessBoundaryId);
      expect(readiness).toBeDefined();

      for (const key of carriedRowBodyReadinessBoundaryKeys) {
        expect(row[key]).toBe(readiness?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(readiness?.accountingConsistencyStatus);
    }
  });

  test('keeps body placeholder rows linked only to existing row body readiness boundary ids', () => {
    const probabilityReadinessIds = new Set(
      juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId
      )
    );
    const rewardReadinessIds = new Set(
      juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyReadinessBoundaryId
      )
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      expect(probabilityReadinessIds.has(row.sourceBackedProductionValueRowBodyReadinessBoundaryId)).toBe(
        true
      );
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId).not.toContain(
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId
      );
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      expect(rewardReadinessIds.has(row.sourceBackedProductionValueRowBodyReadinessBoundaryId)).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId).not.toContain(
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId
      );
    }
  });

  test('keeps every body placeholder guard field on the blocked path', () => {
    const guardFields = [
      'sourceBackedProductionValueRowCreationEligibility',
      'sourceBackedProductionValueRowDraftEligibility',
      'sourceBackedProductionValueRowShellReviewEligibility',
      'sourceBackedProductionValueRowShellEligibility',
      'sourceBackedProductionValueRowBodyReadinessEligibility',
      'sourceBackedProductionValueRowBodyPlaceholderEligibility',
      'sourceBackedProductionValueRowBodyCreationEligibility',
      'executionEligibility'
    ] as const;

    const blockedStatusFields = [
      'sourceBackedProductionValueCreationGateStatus',
      'sourceBackedProductionValueRowDraftBoundaryStatus',
      'sourceBackedProductionValueRowShellReviewBoundaryStatus',
      'sourceBackedProductionValueRowShellBoundaryStatus',
      'sourceBackedProductionValueRowBodyReadinessBoundaryStatus',
      'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
    ] as const;

    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
    ]) {
      for (const field of guardFields) {
        expect(row[field]).toBe('no');
      }

      for (const field of blockedStatusFields) {
        expect(String(row[field])).toContain('blocked');
      }
    }
  });
});
