import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion_boundary';

const sealedCompletionBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId',
  'sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueSealedCompletionEligibility'
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
  'sourceBackedProductionValueRowBodyValueSealedCompletedValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedRuntimeValue',
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
  'completed',
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

describe('Juo source-backed production value row body value sealed completion boundary inventory', () => {
  test('preserves one sealed completion boundary row per sealed finalization row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedFinalizationId)
        .sort()
    );
  });

  test('adds only sealed completion boundary metadata beyond sealed finalization rows', () => {
    const probabilityFinalizationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationId,
        row
      ])
    );
    const rewardFinalizationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedFinalizationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory) {
      const finalization = probabilityFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedCompletionBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory) {
      const finalization = rewardFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedCompletionBoundaryMetadataKeys].sort());
    }
  });

  test('keeps sealed completion boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedFinalizationStatus).toBe(
        'row_body_value_sealed_finalization_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryStatus).toBe(
        'row_body_value_sealed_completion_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed completion boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_completion_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_completion_boundary')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
