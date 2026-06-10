import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValuePromotionInventory,
  juoRewardSourceBackedProductionValuePromotionInventory
} from './fixtures/juo_source_backed_production_value_promotion';
import {
  juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueMaterializationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_materialization_boundary';

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

const carriedPromotionKeys = [
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
    'sourceBackedProductionValuePromotionStatus'
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
    expect(value).not.toBe('materialized');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value materialization boundary inventory', () => {
  test('preserves one materialization boundary row per promotion row', () => {
    expect(juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory.map((row) => row.sourceBackedProductionValuePromotionId).sort()).toEqual(
      juoProbabilitySourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValuePromotionId).sort()
    );
    expect(juoRewardSourceBackedProductionValueMaterializationBoundaryInventory.map((row) => row.sourceBackedProductionValuePromotionId).sort()).toEqual(
      juoRewardSourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValuePromotionId).sort()
    );
  });

  test('keeps materialization boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueMaterializationBoundaryInventory
    ]) {
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.draftStatus).toBe('draft_blocked');
      expect(row.sourceBackedProductionValuePromotionStatus).toBe('promotion_blocked');
      expect(row.materializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueMaterializationBoundaryStatus).toBe('materialization_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoForbiddenKeyFragments({ ...row });
      expectNoReadyStates({ ...row });
    }
  });

  test('keeps materialization boundary rows free of production value bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueMaterializationBoundaryInventory
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

  test('keeps materialization boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueMaterializationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueMaterializationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueMaterializationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_materialization_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_materialization_boundary')).toBe(true);
    }
  });

  test('carries promotion metadata without creating materialized values', () => {
    const probabilityPromotions = new Map(
      juoProbabilitySourceBackedProductionValuePromotionInventory.map((row) => [row.sourceBackedProductionValuePromotionId, row])
    );
    const rewardPromotions = new Map(
      juoRewardSourceBackedProductionValuePromotionInventory.map((row) => [row.sourceBackedProductionValuePromotionId, row])
    );

    for (const row of juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory) {
      const promotion = probabilityPromotions.get(row.sourceBackedProductionValuePromotionId);
      expect(promotion).toBeDefined();

      for (const key of carriedPromotionKeys) {
        expect(row[key]).toBe(promotion?.[key]);
      }
    }

    for (const row of juoRewardSourceBackedProductionValueMaterializationBoundaryInventory) {
      const promotion = rewardPromotions.get(row.sourceBackedProductionValuePromotionId);
      expect(promotion).toBeDefined();

      for (const key of carriedPromotionKeys) {
        expect(row[key]).toBe(promotion?.[key]);
      }
      expect(row.accountingConsistencyStatus).toBe(promotion?.accountingConsistencyStatus);
    }
  });
});
