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
});
