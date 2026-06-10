import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_boundary';

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

const valueFinalizationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryId',
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueFinalizationEligibility'
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
  'finalized',
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

describe('Juo source-backed production value row body value finalization boundary inventory', () => {
  test('preserves one value finalization boundary row per value materialization implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId)
        .sort()
    );
  });

  test('keeps value finalization boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus).toBe(
        'row_body_value_materialization_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus).toBe(
        'row_body_value_finalization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value finalization boundary metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
    ]) {
      for (const key of valueFinalizationBoundaryMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value finalization boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_finalization_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_finalization_boundary')).toBe(true);
    }
  });

  test('carries value materialization implementation metadata without creating row body values', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationBoundaryMetadataKeys].sort());
    }
  });
});
