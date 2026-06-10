import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_implementation';

const sealedImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedImplementationId',
  'sourceBackedProductionValueRowBodyValueSealedImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueSealedImplementationStatus'
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

describe('Juo source-backed production value row body value sealed implementation inventory', () => {
  test('preserves one sealed implementation row per sealed boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedBoundaryId)
        .sort()
    );
  });

  test('adds only sealed implementation metadata beyond sealed boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedImplementationMetadataKeys].sort());
    }
  });

  test('keeps sealed implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedBoundaryStatus).toBe('row_body_value_sealed_boundary_blocked');
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationStatus).toBe(
        'row_body_value_sealed_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
