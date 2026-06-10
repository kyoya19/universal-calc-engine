import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_implementation';

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

const valueFinalizationImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationId',
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationStatus'
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

describe('Juo source-backed production value row body value finalization implementation inventory', () => {
  test('preserves one value finalization implementation row per value finalization boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId)
        .sort()
    );
  });

  test('keeps value finalization implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus).toBe(
        'row_body_value_finalization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationImplementationStatus).toBe(
        'row_body_value_finalization_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('adds only value finalization implementation metadata, not row body values', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
    ]) {
      for (const key of valueFinalizationImplementationMetadataKeys) {
        expect(Object.keys(row)).toContain(key);
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps value finalization implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_value_finalization_implementation')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_value_finalization_implementation')).toBe(true);
    }
  });

  test('carries value finalization boundary metadata without creating row body values', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationImplementationMetadataKeys].sort());
    }
  });
});
