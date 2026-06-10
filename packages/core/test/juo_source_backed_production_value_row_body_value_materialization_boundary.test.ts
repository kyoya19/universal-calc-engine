import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_boundary';

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

const valueMaterializationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryId',
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueMaterializationEligibility'
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

describe('Juo source-backed production value row body value materialization boundary inventory', () => {
  test('preserves one value materialization boundary row per value implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueImplementationId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueImplementationId)
        .sort()
    );
  });

  test('keeps value materialization boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueImplementationStatus).toBe(
        'row_body_value_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus).toBe(
        'row_body_value_materialization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value materialization boundary metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
    ]) {
      for (const key of valueMaterializationBoundaryMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value materialization boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_materialization_boundary')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_materialization_boundary')).toBe(true);
    }
  });

  test('carries value implementation metadata without creating row body values', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyValueImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationBoundaryMetadataKeys].sort());
    }
  });
});
