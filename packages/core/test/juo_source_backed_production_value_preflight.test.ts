import { describe, expect, test } from 'vitest';
import {
  juoProbabilityProductionValueReadinessReviewInventory,
  juoRewardProductionValueReadinessReviewInventory
} from './fixtures/juo_production_value_readiness_review';
import {
  juoProbabilitySourceBackedProductionValuePreflightInventory,
  juoRewardSourceBackedProductionValuePreflightInventory
} from './fixtures/juo_source_backed_production_value_preflight';

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

function expectNoReadyOrPromotingStatuses(row: Record<string, unknown>): void {
  for (const value of Object.values(row)) {
    expect(value).not.toBe('ready');
    expect(value).not.toBe('approved');
    expect(value).not.toBe('promoted');
    expect(value).not.toBe('eligible');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('created');
    expect(value).not.toBe('yes');
  }
}

describe('Juo source-backed production value preflight inventory', () => {
  test('preserves one probability preflight row per probability readiness review row', () => {
    const reviewIds = juoProbabilityProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId).sort();
    const preflightReviewIds = juoProbabilitySourceBackedProductionValuePreflightInventory
      .map((row) => row.readinessReviewId)
      .sort();

    expect(preflightReviewIds).toEqual(reviewIds);
  });

  test('preserves one reward preflight row per reward readiness review row', () => {
    const reviewIds = juoRewardProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId).sort();
    const preflightReviewIds = juoRewardSourceBackedProductionValuePreflightInventory
      .map((row) => row.readinessReviewId)
      .sort();

    expect(preflightReviewIds).toEqual(reviewIds);
  });

  test('keeps preflight rows attached to matching readiness review rows', () => {
    const probabilityReviewById = new Map(
      juoProbabilityProductionValueReadinessReviewInventory.map((row) => [row.readinessReviewId, row])
    );
    const rewardReviewById = new Map(
      juoRewardProductionValueReadinessReviewInventory.map((row) => [row.readinessReviewId, row])
    );

    for (const row of juoProbabilitySourceBackedProductionValuePreflightInventory) {
      const review = probabilityReviewById.get(row.readinessReviewId);

      expect(review).toBeDefined();
      expect(row.productionValuePlaceholderId).toBe(review?.productionValuePlaceholderId);
      expect(row.draftMetadataId).toBe(review?.draftMetadataId);
      expect(row.promotionGateId).toBe(review?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(review?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(review?.unitMetadataId);
      expect(row.citationId).toBe(review?.citationId);
      expect(row.sourceId).toBe(review?.sourceId);
      expect(row.sourceType).toBe(review?.sourceType);
      expect(row.valueDomain).toBe(review?.valueDomain);
      expect(row.placeholderStatus).toBe(review?.placeholderStatus);
    }

    for (const row of juoRewardSourceBackedProductionValuePreflightInventory) {
      const review = rewardReviewById.get(row.readinessReviewId);

      expect(review).toBeDefined();
      expect(row.productionValuePlaceholderId).toBe(review?.productionValuePlaceholderId);
      expect(row.draftMetadataId).toBe(review?.draftMetadataId);
      expect(row.promotionGateId).toBe(review?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(review?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(review?.unitMetadataId);
      expect(row.citationId).toBe(review?.citationId);
      expect(row.sourceId).toBe(review?.sourceId);
      expect(row.sourceType).toBe(review?.sourceType);
      expect(row.valueDomain).toBe(review?.valueDomain);
      expect(row.placeholderStatus).toBe(review?.placeholderStatus);
    }
  });

  test('keeps preflight ids unique and domain-separated', () => {
    const probabilityPreflightIds = juoProbabilitySourceBackedProductionValuePreflightInventory.map(
      (row) => row.preflightId
    );
    const rewardPreflightIds = juoRewardSourceBackedProductionValuePreflightInventory.map((row) => row.preflightId);

    expectUniqueIds(probabilityPreflightIds);
    expectUniqueIds(rewardPreflightIds);

    for (const id of probabilityPreflightIds) {
      expect(rewardPreflightIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_preflight')).toBe(true);
    }

    for (const id of rewardPreflightIds) {
      expect(id.endsWith('_reward_source_backed_production_value_preflight')).toBe(true);
    }
  });

  test('keeps probability preflight rows non-executable and blocked', () => {
    for (const row of juoProbabilitySourceBackedProductionValuePreflightInventory) {
      expect(row.preflightId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward preflight rows non-executable and blocked', () => {
    for (const row of juoRewardSourceBackedProductionValuePreflightInventory) {
      expect(row.preflightId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.placeholderStatus).toBe('placeholder');
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps preflight rows distinct from source-backed production values and executable values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValuePreflightInventory,
      ...juoRewardSourceBackedProductionValuePreflightInventory
    ]) {
      expect(row.preflightId.endsWith('_source_backed_production_value_preflight')).toBe(true);
      expect(row.preflightId.endsWith('_source_backed_production_value')).toBe(false);
      expect(row.preflightId.endsWith('_production_value')).toBe(false);
      expect(row.preflightId.endsWith('_executable_value')).toBe(false);
      expect(row.preflightId.endsWith('_expected_value')).toBe(false);
    }
  });

  test('keeps preflight rows free of source-backed production value and execution binding fields', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValuePreflightInventory,
      ...juoRewardSourceBackedProductionValuePreflightInventory
    ]) {
      expectNoExecutableValueKeys({ ...row });
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValue');
      expect(Object.keys(row)).not.toContain('sourceBackedNumericValue');
      expect(Object.keys(row)).not.toContain('sourceBackedDecimalValue');
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
    }
  });

  test('keeps preflight statuses bounded to blocked pre-production states', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValuePreflightInventory,
      ...juoRewardSourceBackedProductionValuePreflightInventory
    ]) {
      expect(row.preflightStatus).toBe('blocked');
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.sourceBackedValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoReadyOrPromotingStatuses({ ...row });
    }
  });

  test('keeps probability and reward preflight inventories domain-separated', () => {
    const probabilityPreflightIds = juoProbabilitySourceBackedProductionValuePreflightInventory.map(
      (row) => row.preflightId
    );
    const rewardPreflightIds = juoRewardSourceBackedProductionValuePreflightInventory.map((row) => row.preflightId);
    const probabilityPlaceholderIds = juoProbabilitySourceBackedProductionValuePreflightInventory.map(
      (row) => row.productionValuePlaceholderId
    );
    const rewardPlaceholderIds = juoRewardSourceBackedProductionValuePreflightInventory.map(
      (row) => row.productionValuePlaceholderId
    );

    for (const row of juoProbabilitySourceBackedProductionValuePreflightInventory) {
      expect(row.valueDomain).toBe('probability');
      expect(row.preflightId).toContain('_probability_');
      expect(row.productionValuePlaceholderId).toContain('_probability_');
      expect(rewardPreflightIds).not.toContain(row.preflightId);
      expect(rewardPlaceholderIds).not.toContain(row.productionValuePlaceholderId);
    }

    for (const row of juoRewardSourceBackedProductionValuePreflightInventory) {
      expect(row.valueDomain).toBe('reward');
      expect(row.preflightId).toContain('_reward_');
      expect(row.productionValuePlaceholderId).toContain('_reward_');
      expect(probabilityPreflightIds).not.toContain(row.preflightId);
      expect(probabilityPlaceholderIds).not.toContain(row.productionValuePlaceholderId);
    }
  });
});
