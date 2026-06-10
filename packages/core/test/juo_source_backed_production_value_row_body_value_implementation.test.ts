import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_creation_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_implementation';

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
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

const valueImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueImplementationId',
  'sourceBackedProductionValueRowBodyValueImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueImplementationStatus'
]);

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion',
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
  'row_body_created',
  'row_body_value_created',
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

describe('Juo source-backed production value row body value implementation inventory', () => {
  test('preserves one value implementation row per value creation boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId)
        .sort()
    );
  });

  test('keeps value implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationBoundaryStatus).toBe(
        'row_body_value_creation_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueImplementationStatus).toBe(
        'row_body_value_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value implementation metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
    ]) {
      for (const key of valueImplementationMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_implementation')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_implementation')).toBe(true);
    }
  });

  test('carries value creation boundary metadata without creating row body values', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueCreationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueCreationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueImplementationMetadataKeys].sort());
    }
  });
});
