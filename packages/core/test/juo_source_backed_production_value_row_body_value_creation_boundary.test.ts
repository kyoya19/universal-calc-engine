import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_creation_boundary';

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

const valueCreationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueCreationBoundaryId',
  'sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueCreationBoundaryStatus'
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

describe('Juo source-backed production value row body value creation boundary inventory', () => {
  test('preserves one value creation boundary row per row body implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyImplementationId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyImplementationId)
        .sort()
    );
  });

  test('keeps value creation boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationBoundaryStatus).toBe(
        'row_body_value_creation_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value creation boundary metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
    ]) {
      for (const key of valueCreationBoundaryMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value creation boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueCreationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_creation_boundary')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_creation_boundary')).toBe(true);
    }
  });

  test('carries row body implementation metadata without creating row body values', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueCreationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueCreationBoundaryMetadataKeys].sort());
    }
  });
});
