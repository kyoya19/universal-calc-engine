import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization';

const sealedFinalizationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedFinalizationId',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationStatus'
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

describe('Juo source-backed production value row body value sealed finalization inventory', () => {
  test('preserves one sealed finalization row per sealed finalization implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId)
        .sort()
    );
  });

  test('adds only sealed finalization metadata beyond sealed finalization implementation rows', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory) {
      const implementation = rewardImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationMetadataKeys].sort());
    }
  });

  test('keeps sealed finalization rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationStatus).toBe(
        'row_body_value_sealed_finalization_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationStatus).toBe(
        'row_body_value_sealed_finalization_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed finalization ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_finalization')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_finalization')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
