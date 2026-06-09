import { describe, expect, test } from 'vitest';
import {
  juoProbabilityExtractedValueMetadataInventory,
  juoRewardExtractedValueMetadataInventory
} from './fixtures/juo_extracted_value_metadata';
import {
  juoProbabilityProductionValuePromotionGateInventory,
  juoRewardProductionValuePromotionGateInventory
} from './fixtures/juo_production_value_promotion_gate';

const forbiddenExecutableKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount',
  'extractedValue',
  'productionValue'
]);

function expectNoExecutableValueKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenExecutableKeys.has(key)).toBe(false);
  }
}

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectReadinessStatus(status: string): void {
  expect(['not_started', 'not_applicable', 'excluded']).toContain(status);
}

describe('Juo production value promotion gate inventory', () => {
  test('preserves one probability promotion gate row per probability extracted metadata row', () => {
    const extractedIds = juoProbabilityExtractedValueMetadataInventory
      .map((row) => row.extractedValueMetadataId)
      .sort();
    const gateExtractedIds = juoProbabilityProductionValuePromotionGateInventory
      .map((row) => row.extractedValueMetadataId)
      .sort();

    expect(gateExtractedIds).toEqual(extractedIds);
  });

  test('preserves one reward promotion gate row per reward extracted metadata row', () => {
    const extractedIds = juoRewardExtractedValueMetadataInventory.map((row) => row.extractedValueMetadataId).sort();
    const gateExtractedIds = juoRewardProductionValuePromotionGateInventory
      .map((row) => row.extractedValueMetadataId)
      .sort();

    expect(gateExtractedIds).toEqual(extractedIds);
  });

  test('keeps probability promotion gate rows non-executable and non-promotable', () => {
    for (const row of juoProbabilityProductionValuePromotionGateInventory) {
      expect(row.promotionGateId.trim()).not.toBe('');
      expect(row.extractedValueMetadataId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward promotion gate rows non-executable and non-promotable', () => {
    for (const row of juoRewardProductionValuePromotionGateInventory) {
      expect(row.promotionGateId.trim()).not.toBe('');
      expect(row.extractedValueMetadataId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps promotion gate rows attached to matching extracted value metadata rows', () => {
    const probabilityExtractedById = new Map(
      juoProbabilityExtractedValueMetadataInventory.map((row) => [row.extractedValueMetadataId, row])
    );
    const rewardExtractedById = new Map(
      juoRewardExtractedValueMetadataInventory.map((row) => [row.extractedValueMetadataId, row])
    );

    for (const row of juoProbabilityProductionValuePromotionGateInventory) {
      const extracted = probabilityExtractedById.get(row.extractedValueMetadataId);

      expect(extracted).toBeDefined();
      expect(row.unitMetadataId).toBe(extracted?.unitMetadataId);
      expect(row.citationId).toBe(extracted?.citationId);
      expect(row.sourceId).toBe(extracted?.sourceId);
      expect(row.sourceType).toBe(extracted?.sourceType);
      expect(row.extractionStatus).toBe(extracted?.extractionStatus);
    }

    for (const row of juoRewardProductionValuePromotionGateInventory) {
      const extracted = rewardExtractedById.get(row.extractedValueMetadataId);

      expect(extracted).toBeDefined();
      expect(row.unitMetadataId).toBe(extracted?.unitMetadataId);
      expect(row.citationId).toBe(extracted?.citationId);
      expect(row.sourceId).toBe(extracted?.sourceId);
      expect(row.sourceType).toBe(extracted?.sourceType);
      expect(row.extractionStatus).toBe(extracted?.extractionStatus);
    }
  });

  test('keeps promotion gate ids unique and domain-separated', () => {
    const probabilityGateIds = juoProbabilityProductionValuePromotionGateInventory.map((row) => row.promotionGateId);
    const rewardGateIds = juoRewardProductionValuePromotionGateInventory.map((row) => row.promotionGateId);

    expectUniqueIds(probabilityGateIds);
    expectUniqueIds(rewardGateIds);

    for (const id of probabilityGateIds) {
      expect(rewardGateIds).not.toContain(id);
      expect(id.endsWith('_probability_production_value_promotion_gate')).toBe(true);
    }

    for (const id of rewardGateIds) {
      expect(id.endsWith('_reward_production_value_promotion_gate')).toBe(true);
    }
  });

  test('keeps promotion readiness statuses bounded and non-promoting', () => {
    for (const row of juoProbabilityProductionValuePromotionGateInventory) {
      expectReadinessStatus(row.extractionStatus);
      expectReadinessStatus(row.unitApplicability);
      expectReadinessStatus(row.citationReadinessStatus);
      expectReadinessStatus(row.sourceConflictStatus);
      expectReadinessStatus(row.numericReadinessStatus);
      expectReadinessStatus(row.normalizationReadinessStatus);
      expectReadinessStatus(row.reviewReadinessStatus);
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
    }

    for (const row of juoRewardProductionValuePromotionGateInventory) {
      expectReadinessStatus(row.extractionStatus);
      expectReadinessStatus(row.unitApplicability);
      expectReadinessStatus(row.citationReadinessStatus);
      expectReadinessStatus(row.sourceConflictStatus);
      expectReadinessStatus(row.numericReadinessStatus);
      expectReadinessStatus(row.accountingReadinessStatus);
      expectReadinessStatus(row.normalizationReadinessStatus);
      expectReadinessStatus(row.reviewReadinessStatus);
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps promotion gate naming distinct from production values and executable values', () => {
    for (const row of [
      ...juoProbabilityProductionValuePromotionGateInventory,
      ...juoRewardProductionValuePromotionGateInventory
    ]) {
      expect(row.promotionGateId.endsWith('_production_value_promotion_gate')).toBe(true);
      expect(row.promotionGateId.endsWith('_production_value')).toBe(false);
      expect(row.promotionGateId.endsWith('_executable_value')).toBe(false);
    }
  });
});
