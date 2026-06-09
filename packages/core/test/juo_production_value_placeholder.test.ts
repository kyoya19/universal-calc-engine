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

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectReadinessStatus(status: string): void {
  expect(['not_started', 'not_applicable', 'excluded']).toContain(status);
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

  test('keeps placeholder ids unique and domain-separated', () => {
    const probabilityPlaceholderIds = juoProbabilityProductionValuePlaceholderInventory.map(
      (row) => row.productionValuePlaceholderId
    );
    const rewardPlaceholderIds = juoRewardProductionValuePlaceholderInventory.map((row) => row.productionValuePlaceholderId);

    expectUniqueIds(probabilityPlaceholderIds);
    expectUniqueIds(rewardPlaceholderIds);

    for (const id of probabilityPlaceholderIds) {
      expect(rewardPlaceholderIds).not.toContain(id);
      expect(id.endsWith('_probability_production_value_placeholder')).toBe(true);
    }

    for (const id of rewardPlaceholderIds) {
      expect(id.endsWith('_reward_production_value_placeholder')).toBe(true);
    }
  });

  test('keeps placeholder readiness statuses bounded and non-executable', () => {
    for (const row of juoProbabilityProductionValuePlaceholderInventory) {
      expectReadinessStatus(row.valueReadinessStatus);
      expectReadinessStatus(row.normalizationReadinessStatus);
      expect(row.valueReadinessStatus).toBe('not_started');
      expect(row.normalizationReadinessStatus).toBe(row.valueReadinessStatus);
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
    }

    for (const row of juoRewardProductionValuePlaceholderInventory) {
      expectReadinessStatus(row.valueReadinessStatus);
      expectReadinessStatus(row.accountingReadinessStatus);
      expectReadinessStatus(row.normalizationReadinessStatus);
      expect(row.valueReadinessStatus).toBe('not_started');
      expect(row.accountingReadinessStatus).toBe(row.valueReadinessStatus);
      expect(row.normalizationReadinessStatus).toBe(row.valueReadinessStatus);
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.promotionEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps placeholder naming distinct from source-backed production values and executable values', () => {
    for (const row of [...juoProbabilityProductionValuePlaceholderInventory, ...juoRewardProductionValuePlaceholderInventory]) {
      expect(row.productionValuePlaceholderId.endsWith('_production_value_placeholder')).toBe(true);
      expect(row.productionValuePlaceholderId.endsWith('_production_value')).toBe(false);
      expect(row.productionValuePlaceholderId.endsWith('_executable_value')).toBe(false);
    }
  });
});
