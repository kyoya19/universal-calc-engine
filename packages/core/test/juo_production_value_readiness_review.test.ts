import { describe, expect, test } from 'vitest';
import {
  juoProbabilityProductionValuePlaceholderInventory,
  juoRewardProductionValuePlaceholderInventory
} from './fixtures/juo_production_value_placeholder';
import {
  juoProbabilityProductionValueReadinessReviewInventory,
  juoRewardProductionValueReadinessReviewInventory
} from './fixtures/juo_production_value_readiness_review';

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
  'productionGraphBinding',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

function expectNoExecutableValueKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenExecutableKeys.has(key)).toBe(false);
  }
}

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectReviewStatus(status: string): void {
  expect(['pending_review', 'not_applicable', 'excluded']).toContain(status);
}

function expectSourceBackedReadinessStatus(status: string): void {
  expect(['not_ready', 'not_applicable', 'excluded']).toContain(status);
}

function expectNoReadyOrPromotingStatuses(row: Record<string, unknown>): void {
  for (const value of Object.values(row)) {
    expect(value).not.toBe('ready');
    expect(value).not.toBe('approved');
    expect(value).not.toBe('promoted');
    expect(value).not.toBe('eligible');
    expect(value).not.toBe('executable');
    expect(value).not.toBe('yes');
  }
}

describe('Juo production value readiness review inventory', () => {
  test('preserves one probability readiness review row per probability placeholder row', () => {
    const placeholderIds = juoProbabilityProductionValuePlaceholderInventory
      .map((row) => row.productionValuePlaceholderId)
      .sort();
    const reviewPlaceholderIds = juoProbabilityProductionValueReadinessReviewInventory
      .map((row) => row.productionValuePlaceholderId)
      .sort();

    expect(reviewPlaceholderIds).toEqual(placeholderIds);
  });

  test('preserves one reward readiness review row per reward placeholder row', () => {
    const placeholderIds = juoRewardProductionValuePlaceholderInventory
      .map((row) => row.productionValuePlaceholderId)
      .sort();
    const reviewPlaceholderIds = juoRewardProductionValueReadinessReviewInventory
      .map((row) => row.productionValuePlaceholderId)
      .sort();

    expect(reviewPlaceholderIds).toEqual(placeholderIds);
  });

  test('keeps readiness review rows attached to matching placeholder rows', () => {
    const probabilityPlaceholderById = new Map(
      juoProbabilityProductionValuePlaceholderInventory.map((row) => [row.productionValuePlaceholderId, row])
    );
    const rewardPlaceholderById = new Map(
      juoRewardProductionValuePlaceholderInventory.map((row) => [row.productionValuePlaceholderId, row])
    );

    for (const row of juoProbabilityProductionValueReadinessReviewInventory) {
      const placeholder = probabilityPlaceholderById.get(row.productionValuePlaceholderId);

      expect(placeholder).toBeDefined();
      expect(row.draftMetadataId).toBe(placeholder?.draftMetadataId);
      expect(row.promotionGateId).toBe(placeholder?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(placeholder?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(placeholder?.unitMetadataId);
      expect(row.citationId).toBe(placeholder?.citationId);
      expect(row.sourceId).toBe(placeholder?.sourceId);
      expect(row.sourceType).toBe(placeholder?.sourceType);
      expect(row.valueDomain).toBe(placeholder?.valueDomain);
      expect(row.placeholderStatus).toBe(placeholder?.placeholderStatus);
    }

    for (const row of juoRewardProductionValueReadinessReviewInventory) {
      const placeholder = rewardPlaceholderById.get(row.productionValuePlaceholderId);

      expect(placeholder).toBeDefined();
      expect(row.draftMetadataId).toBe(placeholder?.draftMetadataId);
      expect(row.promotionGateId).toBe(placeholder?.promotionGateId);
      expect(row.extractedValueMetadataId).toBe(placeholder?.extractedValueMetadataId);
      expect(row.unitMetadataId).toBe(placeholder?.unitMetadataId);
      expect(row.citationId).toBe(placeholder?.citationId);
      expect(row.sourceId).toBe(placeholder?.sourceId);
      expect(row.sourceType).toBe(placeholder?.sourceType);
      expect(row.valueDomain).toBe(placeholder?.valueDomain);
      expect(row.placeholderStatus).toBe(placeholder?.placeholderStatus);
    }
  });

  test('keeps readiness review ids unique and domain-separated', () => {
    const probabilityReviewIds = juoProbabilityProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId);
    const rewardReviewIds = juoRewardProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId);

    expectUniqueIds(probabilityReviewIds);
    expectUniqueIds(rewardReviewIds);

    for (const id of probabilityReviewIds) {
      expect(rewardReviewIds).not.toContain(id);
      expect(id.endsWith('_probability_production_value_readiness_review')).toBe(true);
    }

    for (const id of rewardReviewIds) {
      expect(id.endsWith('_reward_production_value_readiness_review')).toBe(true);
    }
  });

  test('keeps probability readiness reviews non-executable and non-promoting', () => {
    for (const row of juoProbabilityProductionValueReadinessReviewInventory) {
      expect(row.readinessReviewId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.placeholderStatus).toBe('placeholder');
      expectSourceBackedReadinessStatus(row.sourceBackedValueReadinessStatus);
      expectReviewStatus(row.citationConsistencyStatus);
      expectReviewStatus(row.unitConsistencyStatus);
      expectReviewStatus(row.normalizationConsistencyStatus);
      expectReviewStatus(row.conflictReviewStatus);
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.citationConsistencyStatus).toBe('pending_review');
      expect(row.unitConsistencyStatus).toBe(row.citationConsistencyStatus);
      expect(row.normalizationConsistencyStatus).toBe(row.citationConsistencyStatus);
      expect(row.conflictReviewStatus).toBe(row.citationConsistencyStatus);
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward readiness reviews non-executable and non-promoting', () => {
    for (const row of juoRewardProductionValueReadinessReviewInventory) {
      expect(row.readinessReviewId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.placeholderStatus).toBe('placeholder');
      expectSourceBackedReadinessStatus(row.sourceBackedValueReadinessStatus);
      expectReviewStatus(row.citationConsistencyStatus);
      expectReviewStatus(row.unitConsistencyStatus);
      expectReviewStatus(row.accountingConsistencyStatus);
      expectReviewStatus(row.normalizationConsistencyStatus);
      expectReviewStatus(row.conflictReviewStatus);
      expect(row.sourceBackedValueReadinessStatus).toBe('not_ready');
      expect(row.citationConsistencyStatus).toBe('pending_review');
      expect(row.unitConsistencyStatus).toBe(row.citationConsistencyStatus);
      expect(row.accountingConsistencyStatus).toBe(row.citationConsistencyStatus);
      expect(row.normalizationConsistencyStatus).toBe(row.citationConsistencyStatus);
      expect(row.conflictReviewStatus).toBe(row.citationConsistencyStatus);
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps readiness review naming distinct from source-backed production values and executable values', () => {
    for (const row of [
      ...juoProbabilityProductionValueReadinessReviewInventory,
      ...juoRewardProductionValueReadinessReviewInventory
    ]) {
      expect(row.readinessReviewId.endsWith('_production_value_readiness_review')).toBe(true);
      expect(row.readinessReviewId.endsWith('_production_value')).toBe(false);
      expect(row.readinessReviewId.endsWith('_executable_value')).toBe(false);
      expect(row.readinessReviewId.endsWith('_expected_value')).toBe(false);
    }
  });

  test('keeps readiness review rows free of source-backed numeric and execution binding fields', () => {
    for (const row of [
      ...juoProbabilityProductionValueReadinessReviewInventory,
      ...juoRewardProductionValueReadinessReviewInventory
    ]) {
      expectNoExecutableValueKeys({ ...row });
      expect(Object.keys(row)).not.toContain('productionGraphBinding');
      expect(Object.keys(row)).not.toContain('runtimeTargetSubstitution');
      expect(Object.keys(row)).not.toContain('expectedValueAssertion');
      expect(Object.keys(row)).not.toContain('expectedRewardAssertion');
      expect(Object.keys(row)).not.toContain('sourceBackedNumericValue');
      expect(Object.keys(row)).not.toContain('sourceBackedDecimalValue');
    }
  });

  test('keeps readiness review statuses bounded to pre-production states', () => {
    for (const row of [
      ...juoProbabilityProductionValueReadinessReviewInventory,
      ...juoRewardProductionValueReadinessReviewInventory
    ]) {
      expectSourceBackedReadinessStatus(row.sourceBackedValueReadinessStatus);
      expectReviewStatus(row.citationConsistencyStatus);
      expectReviewStatus(row.unitConsistencyStatus);
      expectReviewStatus(row.normalizationConsistencyStatus);
      expectReviewStatus(row.conflictReviewStatus);
      expect(row.promotionDecisionStatus).toBe('not_promoted');
      expect(row.executionEligibility).toBe('no');
      expectNoReadyOrPromotingStatuses({ ...row });
    }
  });

  test('keeps probability and reward review inventories domain-separated', () => {
    const probabilityReviewIds = juoProbabilityProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId);
    const rewardReviewIds = juoRewardProductionValueReadinessReviewInventory.map((row) => row.readinessReviewId);
    const probabilityPlaceholderIds = juoProbabilityProductionValueReadinessReviewInventory.map(
      (row) => row.productionValuePlaceholderId
    );
    const rewardPlaceholderIds = juoRewardProductionValueReadinessReviewInventory.map((row) => row.productionValuePlaceholderId);

    for (const row of juoProbabilityProductionValueReadinessReviewInventory) {
      expect(row.valueDomain).toBe('probability');
      expect(row.readinessReviewId).toContain('_probability_');
      expect(row.productionValuePlaceholderId).toContain('_probability_');
      expect(rewardReviewIds).not.toContain(row.readinessReviewId);
      expect(rewardPlaceholderIds).not.toContain(row.productionValuePlaceholderId);
    }

    for (const row of juoRewardProductionValueReadinessReviewInventory) {
      expect(row.valueDomain).toBe('reward');
      expect(row.readinessReviewId).toContain('_reward_');
      expect(row.productionValuePlaceholderId).toContain('_reward_');
      expect(probabilityReviewIds).not.toContain(row.readinessReviewId);
      expect(probabilityPlaceholderIds).not.toContain(row.productionValuePlaceholderId);
    }
  });
});
