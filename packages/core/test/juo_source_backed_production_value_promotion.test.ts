import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueDraftInventory,
  juoRewardSourceBackedProductionValueDraftInventory
} from './fixtures/juo_source_backed_production_value_draft';
import {
  juoProbabilitySourceBackedProductionValuePromotionInventory,
  juoRewardSourceBackedProductionValuePromotionInventory
} from './fixtures/juo_source_backed_production_value_promotion';

const forbiddenKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'productionValue',
  'expectedValue',
  'graphBinding',
  'runtimeTarget',
  'sourceBackedValue',
  'sourceBackedProductionValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

function expectNoForbiddenKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenKeys.has(key)).toBe(false);
  }
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value promotion inventory', () => {
  test('preserves one promotion row per draft row', () => {
    expect(juoProbabilitySourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValueDraftId).sort()).toEqual(
      juoProbabilitySourceBackedProductionValueDraftInventory.map((row) => row.sourceBackedProductionValueDraftId).sort()
    );
    expect(juoRewardSourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValueDraftId).sort()).toEqual(
      juoRewardSourceBackedProductionValueDraftInventory.map((row) => row.sourceBackedProductionValueDraftId).sort()
    );
  });

  test('keeps promotion rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValuePromotionInventory,
      ...juoRewardSourceBackedProductionValuePromotionInventory
    ]) {
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.draftStatus).toBe('draft_blocked');
      expect(row.sourceBackedProductionValuePromotionStatus).toBe('promotion_blocked');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
    }
  });

  test('keeps promotion ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValuePromotionId);
    const rewardIds = juoRewardSourceBackedProductionValuePromotionInventory.map((row) => row.sourceBackedProductionValuePromotionId);

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_promotion')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_promotion')).toBe(true);
    }
  });
});
