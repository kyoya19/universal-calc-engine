import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValuePreflightInventory,
  juoRewardSourceBackedProductionValuePreflightInventory
} from './fixtures/juo_source_backed_production_value_preflight';
import {
  juoProbabilitySourceBackedProductionValueDraftInventory,
  juoRewardSourceBackedProductionValueDraftInventory
} from './fixtures/juo_source_backed_production_value_draft';

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
  'productionValue',
  'productionProbability',
  'productionReward',
  'expectedValue',
  'graphBinding',
  'runtimeTarget',
  'sourceBackedValue',
  'sourceBackedProbability',
  'sourceBackedReward',
  'sourceBackedProductionValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion',
  'sourceBackedNumericValue',
  'sourceBackedDecimalValue'
]);

function expectNoExecutableValueKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenExecutableKeys.has(key)).toBe(false);
  }
}

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value draft inventory', () => {
  test('preserves one probability draft row per probability preflight row', () => {
    const preflightIds = juoProbabilitySourceBackedProductionValuePreflightInventory
      .map((row) => row.preflightId)
      .sort();
    const draftPreflightIds = juoProbabilitySourceBackedProductionValueDraftInventory
      .map((row) => row.preflightId)
      .sort();

    expect(draftPreflightIds).toEqual(preflightIds);
  });

  test('preserves one reward draft row per reward preflight row', () => {
    const preflightIds = juoRewardSourceBackedProductionValuePreflightInventory.map((row) => row.preflightId).sort();
    const draftPreflightIds = juoRewardSourceBackedProductionValueDraftInventory.map((row) => row.preflightId).sort();

    expect(draftPreflightIds).toEqual(preflightIds);
  });

  test('keeps draft rows attached to matching preflight rows', () => {
    const probabilityPreflightById = new Map(
      juoProbabilitySourceBackedProductionValuePreflightInventory.map((row) => [row.preflightId, row])
    );
    const rewardPreflightById = new Map(
      juoRewardSourceBackedProductionValuePreflightInventory.map((row) => [row.preflightId, row])
    );

    for (const row of juoProbabilitySourceBackedProductionValueDraftInventory) {
      const preflight = probabilityPreflightById.get(row.preflightId);

      expect(preflight).toBeDefined();
      expect(row.readinessReviewId).toBe(preflight?.readinessReviewId);
      expect(row.productionValuePlaceholderId).toBe(preflight?.productionValuePlaceholderId);
      expect(row.draftMetadataId).toBe(preflight?.draftMetadataId);
      expect(row.promotionGateId).toBe(preflight?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(preflight?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(preflight?.unitMetadataId);
      expect(row.citationId).toBe(preflight?.citationId);
      expect(row.sourceId).toBe(preflight?.sourceId);
      expect(row.sourceType).toBe(preflight?.sourceType);
      expect(row.valueDomain).toBe(preflight?.valueDomain);
      expect(row.placeholderStatus).toBe(preflight?.placeholderStatus);
      expect(row.preflightStatus).toBe(preflight?.preflightStatus);
    }

    for (const row of juoRewardSourceBackedProductionValueDraftInventory) {
      const preflight = rewardPreflightById.get(row.preflightId);

      expect(preflight).toBeDefined();
      expect(row.readinessReviewId).toBe(preflight?.readinessReviewId);
      expect(row.productionValuePlaceholderId).toBe(preflight?.productionValuePlaceholderId);
      expect(row.draftMetadataId).toBe(preflight?.draftMetadataId);
      expect(row.promotionGateId).toBe(preflight?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(preflight?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(preflight?.unitMetadataId);
      expect(row.citationId).toBe(preflight?.citationId);
      expect(row.sourceId).toBe(preflight?.sourceId);
      expect(row.sourceType).toBe(preflight?.sourceType);
      expect(row.valueDomain).toBe(preflight?.valueDomain);
      expect(row.placeholderStatus).toBe(preflight?.placeholderStatus);
      expect(row.preflightStatus).toBe(preflight?.preflightStatus);
    }
  });

  test('keeps draft ids unique and domain-separated', () => {
    const probabilityDraftIds = juoProbabilitySourceBackedProductionValueDraftInventory.map(
      (row) => row.sourceBackedProductionValueDraftId
    );
    const rewardDraftIds = juoRewardSourceBackedProductionValueDraftInventory.map(
      (row) => row.sourceBackedProductionValueDraftId
    );

    expectUniqueIds(probabilityDraftIds);
    expectUniqueIds(rewardDraftIds);

    for (const id of probabilityDraftIds) {
      expect(rewardDraftIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_draft')).toBe(true);
    }

    for (const id of rewardDraftIds) {
      expect(id.endsWith('_reward_source_backed_production_value_draft')).toBe(true);
    }
  });

  test('keeps probability draft rows non-executable and blocked', () => {
    for (const row of juoProbabilitySourceBackedProductionValueDraftInventory) {
      expect(row.sourceBackedProductionValueDraftId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.draftStatus).toBe('draft_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward draft rows non-executable and blocked', () => {
    for (const row of juoRewardSourceBackedProductionValueDraftInventory) {
      expect(row.sourceBackedProductionValueDraftId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.draftStatus).toBe('draft_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps draft rows distinct from source-backed production values and executable values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueDraftInventory,
      ...juoRewardSourceBackedProductionValueDraftInventory
    ]) {
      expect(row.sourceBackedProductionValueDraftId.endsWith('_source_backed_production_value_draft')).toBe(true);
      expect(row.sourceBackedProductionValueDraftId.endsWith('_source_backed_production_value')).toBe(false);
      expect(row.sourceBackedProductionValueDraftId.endsWith('_production_value')).toBe(false);
      expect(row.sourceBackedProductionValueDraftId.endsWith('_executable_value')).toBe(false);
      expect(row.sourceBackedProductionValueDraftId.endsWith('_expected_value')).toBe(false);
    }
  });
});
