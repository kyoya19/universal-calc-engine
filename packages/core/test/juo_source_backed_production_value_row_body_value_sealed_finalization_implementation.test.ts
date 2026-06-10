import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization_implementation';

const sealedFinalizationImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationStatus'
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

describe('Juo source-backed production value row body value sealed finalization implementation inventory', () => {
  test('preserves one sealed finalization implementation row per sealed finalization boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId)
        .sort()
    );
  });

  test('adds only sealed finalization implementation metadata beyond sealed finalization boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedFinalizationImplementationMetadataKeys].sort());
    }
  });

  test('keeps sealed finalization implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus).toBe(
        'row_body_value_sealed_finalization_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationStatus).toBe(
        'row_body_value_sealed_finalization_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed finalization implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_finalization_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_finalization_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
