import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_implementation';

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

const valueMaterializationImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationId',
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus'
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

describe('Juo source-backed production value row body value materialization implementation inventory', () => {
  test('preserves one value materialization implementation row per value materialization boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId)
        .sort()
    );
  });

  test('keeps value materialization implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus).toBe(
        'row_body_value_materialization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus).toBe(
        'row_body_value_materialization_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value materialization implementation metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
    ]) {
      for (const key of valueMaterializationImplementationMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value materialization implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_materialization_implementation')).toBe(
        true
      );
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_materialization_implementation')).toBe(
        true
      );
    }
  });

  test('carries value materialization boundary metadata without creating row body values', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationImplementationMetadataKeys].sort());
    }
  });
});
