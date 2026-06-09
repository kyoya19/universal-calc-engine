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

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectShapeStatus(status: string): void {
  expect(['not_started', 'not_applicable', 'excluded']).toContain(status);
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

  test('keeps draft metadata ids unique and domain-separated', () => {
    const probabilityDraftIds = juoProbabilityProductionValueDraftMetadataInventory.map((row) => row.draftMetadataId);
    const rewardDraftIds = juoRewardProductionValueDraftMetadataInventory.map((row) => row.draftMetadataId);

    expectUniqueIds(probabilityDraftIds);
    expectUniqueIds(rewardDraftIds);

    for (const id of probabilityDraftIds) {
      expect(rewardDraftIds).not.toContain(id);
      expect(id.endsWith('_probability_production_value_draft_metadata')).toBe(true);
    }

    for (const id of rewardDraftIds) {
      expect(id.endsWith('_reward_production_value_draft_metadata')).toBe(true);
    }
  });

  test('keeps probability draft shape statuses bounded and non-executable', () => {
    for (const row of juoProbabilityProductionValueDraftMetadataInventory) {
      expectShapeStatus(row.valueShapeStatus);
      expectShapeStatus(row.fractionShapeStatus);
      expectShapeStatus(row.decimalShapeStatus);
      expectShapeStatus(row.normalizationShapeStatus);
      expect(row.valueShapeStatus).toBe('not_started');
      expect(row.fractionShapeStatus).toBe(row.valueShapeStatus);
      expect(row.decimalShapeStatus).toBe(row.valueShapeStatus);
      expect(row.normalizationShapeStatus).toBe(row.valueShapeStatus);
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps reward draft shape statuses bounded and non-executable', () => {
    for (const row of juoRewardProductionValueDraftMetadataInventory) {
      expectShapeStatus(row.valueShapeStatus);
      expectShapeStatus(row.amountShapeStatus);
      expectShapeStatus(row.rewardUnitShapeStatus);
      expectShapeStatus(row.accountingShapeStatus);
      expectShapeStatus(row.normalizationShapeStatus);
      expect(row.valueShapeStatus).toBe('not_started');
      expect(row.amountShapeStatus).toBe(row.valueShapeStatus);
      expect(row.rewardUnitShapeStatus).toBe(row.valueShapeStatus);
      expect(row.accountingShapeStatus).toBe(row.valueShapeStatus);
      expect(row.normalizationShapeStatus).toBe(row.valueShapeStatus);
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps draft metadata naming distinct from production values and executable values', () => {
    for (const row of [
      ...juoProbabilityProductionValueDraftMetadataInventory,
      ...juoRewardProductionValueDraftMetadataInventory
    ]) {
      expect(row.draftMetadataId.endsWith('_production_value_draft_metadata')).toBe(true);
      expect(row.draftMetadataId.endsWith('_production_value')).toBe(false);
      expect(row.draftMetadataId.endsWith('_executable_value')).toBe(false);
    }
  });
});
