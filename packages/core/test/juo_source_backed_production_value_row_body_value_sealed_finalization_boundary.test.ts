import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization_boundary';

const sealedFinalizationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility'
]);

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
  'sourceBackedProductionValueRowBodyRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedValue',
  'sourceBackedProductionValueRowBodyValueSealedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedRuntimeValue',
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

describe('Juo source-backed production value row body value sealed finalization boundary inventory', () => {
  test('preserves one sealed finalization boundary row per sealed implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId)
        .sort()
    );
  });

  test('adds only sealed finalization boundary metadata beyond sealed implementation rows', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueSealedImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationBoundaryMetadataKeys].sort());
    }
  });

  test('keeps sealed finalization boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationStatus).toBe(
        'row_body_value_sealed_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus).toBe(
        'row_body_value_sealed_finalization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed finalization boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_finalization_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_finalization_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
