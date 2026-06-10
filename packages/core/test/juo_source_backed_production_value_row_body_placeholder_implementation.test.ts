import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_implementation';

const forbiddenKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount',
  'productionValue',
  'expectedValue',
  'graphBinding',
  'runtimeTarget',
  'sourceBackedValue',
  'sourceBackedProductionValue',
  'sourceBackedNumericValue',
  'sourceBackedDecimalValue',
  'sourceBackedNumerator',
  'sourceBackedDenominator',
  'sourceBackedPayout',
  'sourceBackedProductionValueRowBody',
  'sourceBackedProductionValueRowBodyPlaceholder',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

const allowedPlaceholderImplementationKeys = new Set([
  'sourceBackedProductionValueRowBodyPlaceholderEligibility',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
]);

const forbiddenImplementationValueKeys = [
  'sourceBackedProductionValueRowBodyPlaceholderId',
  'sourceBackedProductionValueRowBodyPlaceholderStatus',
  'sourceBackedProductionValueRowBodyPlaceholderKind',
  'sourceBackedProductionValueRowBodyPlaceholderValue',
  'sourceBackedProductionValueRowBodyPlaceholderNumericValue',
  'sourceBackedProductionValueRowBodyPlaceholderSourceValue',
  'sourceBackedProductionValueRowBodyPlaceholderUnitValue',
  'sourceBackedProductionValueRowBodyPlaceholderRuntimeValue',
  'sourceBackedProductionValueRowBodyPlaceholderExpectedValue',
  'sourceBackedProductionValueRowBodyPlaceholderExpectedReward',
  'sourceBackedProductionValueRowBodyPlaceholderGraphBinding'
];

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion',
  'sourceBackedProductionValueRowBody',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'sourceBackedProductionValueRowBodyRuntimeValue'
];

const forbiddenReadyValues = new Set([
  'yes',
  'ready',
  'eligible',
  'approved',
  'promoted',
  'materialized',
  'decided',
  'created',
  'placeholder_created',
  'implemented',
  'executable'
]);

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectNoForbiddenKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenKeys.has(key)).toBe(false);
  }
}

function expectNoReadyValues(row: Record<string, unknown>): void {
  for (const value of Object.values(row)) {
    expect(forbiddenReadyValues.has(String(value))).toBe(false);
  }
}

describe('Juo source-backed production value row body placeholder implementation inventory', () => {
  test('preserves one placeholder implementation row per placeholder boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId)
        .sort()
    );
  });

  test('keeps placeholder implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyPlaceholderEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus).toBe(
        'row_body_placeholder_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyPlaceholderImplementationStatus).toBe(
        'row_body_placeholder_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('allows only placeholder boundary and implementation metadata, not real placeholder implementation values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
    ]) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBodyPlaceholder')) {
          expect(allowedPlaceholderImplementationKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenImplementationValueKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps placeholder implementation rows free of runtime and assertion bindings', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
    ]) {
      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyPlaceholderValue');
      expect(Object.keys(row)).not.toContain('sourceBackedProductionValueRowBodyPlaceholderNumericValue');
      expectNoForbiddenKeys({ ...row });
    }
  });

  test('keeps placeholder implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_placeholder_implementation')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_placeholder_implementation')).toBe(
        true
      );
    }
  });

  test('carries placeholder boundary metadata without creating real placeholders', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
      ]);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
      ]);
    }
  });
});
