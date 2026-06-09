import { describe, expect, test } from 'vitest';
import {
  juoProbabilityProductionValueDraftMetadataInventory,
  juoRewardProductionValueDraftMetadataInventory
} from './fixtures/juo_production_value_draft_metadata';
import {
  juoProbabilityProductionValuePlaceholderInventory,
  juoRewardProductionValuePlaceholderInventory
} from './fixtures/juo_production_value_placeholder';

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

describe('Juo production value placeholder inventory', () => {
  test('preserves one probability placeholder row per probability draft metadata row', () => {
    const draftIds = juoProbabilityProductionValueDraftMetadataInventory.map((row) => row.draftMetadataId).sort();
    const placeholderDraftIds = juoProbabilityProductionValuePlaceholderInventory
      .map((row) => row.draftMetadataId)
      .sort();

    expect(placeholderDraftIds).toEqual(draftIds);
  });

  test('preserves one reward placeholder row per reward draft metadata row', () => {
    const draftIds = juoRewardProductionValueDraftMetadataInventory.map((row) => row.draftMetadataId).sort();
    const placeholderDraftIds = juoRewardProductionValuePlaceholderInventory.map((row) => row.draftMetadataId).sort();

    expect(placeholderDraftIds).toEqual(draftIds);
  });

  test('keeps probability placeholders non-executable and non-promotable', () => {
    for (const row of juoProbabilityProductionValuePlaceholderInventory) {
      expect(row.productionValuePlaceholderId.trim()).not.toBe('');
      expect(row.draftMetadataId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward placeholders non-executable and non-promotable', () => {
    for (const row of juoRewardProductionValuePlaceholderInventory) {
      expect(row.productionValuePlaceholderId.trim()).not.toBe('');
      expect(row.draftMetadataId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps placeholders attached to matching draft metadata rows', () => {
    const probabilityDraftById = new Map(
      juoProbabilityProductionValueDraftMetadataInventory.map((row) => [row.draftMetadataId, row])
    );
    const rewardDraftById = new Map(
      juoRewardProductionValueDraftMetadataInventory.map((row) => [row.draftMetadataId, row])
    );

    for (const row of juoProbabilityProductionValuePlaceholderInventory) {
      const draft = probabilityDraftById.get(row.draftMetadataId);

      expect(draft).toBeDefined();
      expect(row.promotionGateId).toBe(draft?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(draft?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(draft?.unitMetadataId);
      expect(row.citationId).toBe(draft?.citationId);
      expect(row.sourceId).toBe(draft?.sourceId);
      expect(row.sourceType).toBe(draft?.sourceType);
      expect(row.promotionEligibility).toBe(draft?.promotionEligibility);
    }

    for (const row of juoRewardProductionValuePlaceholderInventory) {
      const draft = rewardDraftById.get(row.draftMetadataId);

      expect(draft).toBeDefined();
      expect(row.promotionGateId).toBe(draft?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(draft?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(draft?.unitMetadataId);
      expect(row.citationId).toBe(draft?.citationId);
      expect(row.sourceId).toBe(draft?.sourceId);
      expect(row.sourceType).toBe(draft?.sourceType);
      expect(row.promotionEligibility).toBe(draft?.promotionEligibility);
    }
  });
});
