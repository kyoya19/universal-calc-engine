import { describe, expect, test } from 'vitest';
import {
  juoProbabilityProductionValuePromotionGateInventory,
  juoRewardProductionValuePromotionGateInventory
} from './fixtures/juo_production_value_promotion_gate';
import {
  juoProbabilityProductionValueDraftMetadataInventory,
  juoRewardProductionValueDraftMetadataInventory
} from './fixtures/juo_production_value_draft_metadata';

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

describe('Juo production value draft metadata inventory', () => {
  test('preserves one probability draft metadata row per probability promotion gate row', () => {
    const gateIds = juoProbabilityProductionValuePromotionGateInventory.map((row) => row.promotionGateId).sort();
    const draftGateIds = juoProbabilityProductionValueDraftMetadataInventory.map((row) => row.promotionGateId).sort();

    expect(draftGateIds).toEqual(gateIds);
  });

  test('preserves one reward draft metadata row per reward promotion gate row', () => {
    const gateIds = juoRewardProductionValuePromotionGateInventory.map((row) => row.promotionGateId).sort();
    const draftGateIds = juoRewardProductionValueDraftMetadataInventory.map((row) => row.promotionGateId).sort();

    expect(draftGateIds).toEqual(gateIds);
  });

  test('keeps probability draft metadata non-executable and non-promotable', () => {
    for (const row of juoProbabilityProductionValueDraftMetadataInventory) {
      expect(row.draftMetadataId.trim()).not.toBe('');
      expect(row.promotionGateId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward draft metadata non-executable and non-promotable', () => {
    for (const row of juoRewardProductionValueDraftMetadataInventory) {
      expect(row.draftMetadataId.trim()).not.toBe('');
      expect(row.promotionGateId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps draft metadata attached to matching promotion gate rows', () => {
    const probabilityGateById = new Map(
      juoProbabilityProductionValuePromotionGateInventory.map((row) => [row.promotionGateId, row])
    );
    const rewardGateById = new Map(
      juoRewardProductionValuePromotionGateInventory.map((row) => [row.promotionGateId, row])
    );

    for (const row of juoProbabilityProductionValueDraftMetadataInventory) {
      const gate = probabilityGateById.get(row.promotionGateId);

      expect(gate).toBeDefined();
      expect(row.extractedValueMetadataId).toBe(gate?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(gate?.unitMetadataId);
      expect(row.citationId).toBe(gate?.citationId);
      expect(row.sourceId).toBe(gate?.sourceId);
      expect(row.sourceType).toBe(gate?.sourceType);
      expect(row.promotionEligibility).toBe(gate?.promotionEligibility);
    }

    for (const row of juoRewardProductionValueDraftMetadataInventory) {
      const gate = rewardGateById.get(row.promotionGateId);

      expect(gate).toBeDefined();
      expect(row.extractedValueMetadataId).toBe(gate?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(gate?.unitMetadataId);
      expect(row.citationId).toBe(gate?.citationId);
      expect(row.sourceId).toBe(gate?.sourceId);
      expect(row.sourceType).toBe(gate?.sourceType);
      expect(row.promotionEligibility).toBe(gate?.promotionEligibility);
    }
  });
});
