import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_boundary';

const sealedBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedBoundaryId',
  'sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueSealedBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueSealedEligibility'
]);

const forbiddenValueKeys = new Set([
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
  'sourceBackedProductionValueRowBodyRuntimeValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

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
  'sealed',
  'executable'
]);

function allSealedBoundaryRows(): readonly Record<string, unknown>[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => ({ ...row }))
  ];
}

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

describe('Juo source-backed production value row body value sealed boundary inventory', () => {
  test('preserves one sealed boundary row per finalized row body value row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueFinalizationId)
        .sort()
    );
  });

  test('adds only sealed boundary metadata beyond finalized rows', () => {
    const probabilityFinalizationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationId,
        row
      ])
    );
    const rewardFinalizationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      const finalization = probabilityFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      const finalization = rewardFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedBoundaryMetadataKeys].sort());
    }
  });

  test('keeps sealed boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationStatus).toBe('row_body_value_finalization_blocked');
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryStatus).toBe('row_body_value_sealed_boundary_blocked');
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps sealed boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });

  test('keeps values, runtime fields, graph bindings, and ready markers absent', () => {
    for (const row of allSealedBoundaryRows()) {
      for (const key of Object.keys(row)) {
        expect(forbiddenValueKeys.has(key)).toBe(false);
      }

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
