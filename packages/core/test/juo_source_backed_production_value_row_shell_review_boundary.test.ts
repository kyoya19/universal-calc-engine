import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory,
  juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_draft_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_shell_review_boundary';

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
  'sourceBackedProductionValueRowShell',
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

const carriedRowDraftBoundaryKeys = [
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
  'executionEligibility'
] as const;

const rowShellReviewBoundaryKeys = [
  ...carriedRowDraftBoundaryKeys,
  'sourceBackedProductionValueRowShellReviewBoundaryId',
  'sourceBackedProductionValueRowShellReviewEligibility',
  'sourceBackedProductionValueRowShellReviewBoundaryStatus',
  'sourceBackedProductionValueRowBodyCreationEligibility'
] as const;

const rewardRowShellReviewBoundaryKeys = [
  ...rowShellReviewBoundaryKeys,
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
    'sourceBackedProductionValueRowShellReviewBoundaryStatus'
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

describe('Juo source-backed production value row shell review boundary inventory', () => {
  test('preserves one row shell review boundary row per row draft boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowDraftBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowDraftBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowDraftBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowDraftBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowDraftBoundaryId)
        .sort()
    );
  });

  test('keeps row shell review boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowCreationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueCreationGateStatus).toBe('creation_blocked');
      expect(row.sourceBackedProductionValueRowDraftEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowDraftBoundaryStatus).toBe('draft_boundary_blocked');
      expect(row.sourceBackedProductionValueRowShellReviewEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryStatus).toBe('row_shell_review_blocked');
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps row shell review boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
    ]) {
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBody');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowShell');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
    }
  });

  test('keeps row shell review boundary row key sets closed', () => {
    for (const row of juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rowShellReviewBoundaryKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory) {
      expect(Object.keys(row).sort()).toEqual([...rewardRowShellReviewBoundaryKeys].sort());
    }
  });

  test('keeps row shell review boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowShellReviewBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowShellReviewBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_shell_review_boundary')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_shell_review_boundary')).toBe(true);
    }
  });

  test('carries row draft boundary metadata without creating production values', () => {
    const probabilityDraftRows = new Map(
      juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowDraftBoundaryId,
        row
      ])
    );
    const rewardDraftRows = new Map(
      juoRewardSourceBackedProductionValueRowDraftBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowDraftBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory) {
      const draft = probabilityDraftRows.get(row.sourceBackedProductionValueRowDraftBoundaryId);
      expect(draft).toBeDefined();

      for (const key of carriedRowDraftBoundaryKeys) {
        expect(row[key]).toBe(draft?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory) {
      const draft = rewardDraftRows.get(row.sourceBackedProductionValueRowDraftBoundaryId);
      expect(draft).toBeDefined();

      for (const key of carriedRowDraftBoundaryKeys) {
        expect(row[key]).toBe(draft?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(draft?.accountingConsistencyStatus);
    }
  });

  test('keeps shell review rows linked only to existing row draft boundary ids', () => {
    const probabilityDraftIds = new Set(
      juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory.map(
        (row) => row.sourceBackedProductionValueRowDraftBoundaryId
      )
    );
    const rewardDraftIds = new Set(
      juoRewardSourceBackedProductionValueRowDraftBoundaryInventory.map(
        (row) => row.sourceBackedProductionValueRowDraftBoundaryId
      )
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory) {
      expect(probabilityDraftIds.has(row.sourceBackedProductionValueRowDraftBoundaryId)).toBe(true);
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryId).not.toContain(
        row.sourceBackedProductionValueRowDraftBoundaryId
      );
    }

    for (const row of juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory) {
      expect(rewardDraftIds.has(row.sourceBackedProductionValueRowDraftBoundaryId)).toBe(true);
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowShellReviewBoundaryId).not.toContain(
        row.sourceBackedProductionValueRowDraftBoundaryId
      );
    }
  });

  test('keeps every shell review guard field on the blocked path', () => {
    const guardFields = [
      'sourceBackedProductionValueRowCreationEligibility',
      'sourceBackedProductionValueRowDraftEligibility',
      'sourceBackedProductionValueRowShellReviewEligibility',
      'sourceBackedProductionValueRowBodyCreationEligibility',
      'executionEligibility'
    ] as const;

    const blockedStatusFields = [
      'sourceBackedProductionValueCreationGateStatus',
      'sourceBackedProductionValueRowDraftBoundaryStatus',
      'sourceBackedProductionValueRowShellReviewBoundaryStatus'
    ] as const;

    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory
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
