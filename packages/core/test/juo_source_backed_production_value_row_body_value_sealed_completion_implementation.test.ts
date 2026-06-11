import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion_implementation';

const sealedCompletionImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId',
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationStatus'
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

describe('Juo source-backed production value row body value sealed completion implementation inventory', () => {
  test('preserves one sealed completion implementation row per sealed completion boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId)
        .sort()
    );

    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId)
        .sort()
    );
  });

  test('adds only sealed completion implementation metadata beyond sealed completion boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedCompletionImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedCompletionImplementationMetadataKeys].sort());
    }
  });

  test('keeps sealed completion implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryStatus).toBe(
        'row_body_value_sealed_completion_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationStatus).toBe(
        'row_body_value_sealed_completion_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueSealedEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('keeps sealed completion implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory) {
      expect(rewardIds).not.toContain(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId.endsWith('_probability_source_backed_production_value_row_body_value_sealed_completion_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory) {
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).toContain(row.sourceId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId.endsWith('_reward_source_backed_production_value_row_body_value_sealed_completion_implementation')).toBe(true);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedImplementationId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueSealedBoundaryId);
      expect(row.sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId).not.toBe(row.sourceBackedProductionValueRowBodyValueFinalizationId);
    }
  });
});
