import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion_implementation';

const addedKeys = [
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId',
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueSealedCompletionImplementationStatus'
];

const absentKeys = [
  'sourceBackedProductionValueRowBodyValueSealedCompletedValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedValue',
  'sourceBackedProductionValueRowBodyValueSealedValue',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyRuntimeValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion'
];

const readyValues = new Set([
  'yes',
  'ready',
  'eligible',
  'approved',
  'promoted',
  'materialized',
  'decided',
  'created',
  'implemented',
  'finalized',
  'sealed',
  'completed',
  'executable'
]);

function allRows(): readonly Record<string, unknown>[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo sealed completion implementation guards', () => {
  test('adds only sealed completion implementation metadata', () => {
    const boundaryRows = new Map(
      [
        ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory,
        ...juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory
      ].map((row) => [row.sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId, row])
    );

    for (const row of allRows()) {
      const boundary = boundaryRows.get(String(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId']));
      expect(boundary).toBeDefined();
      const newKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(newKeys.sort()).toEqual([...addedKeys].sort());
    }
  });

  test('keeps ids separate and blocked', () => {
    for (const row of allRows()) {
      const id = String(row['sourceBackedProductionValueRowBodyValueSealedCompletionImplementationId']);
      expect(id).toContain(String(row['sourceId']));
      expect(id).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId']);
      expect(id).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationId']);
      expect(id).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedImplementationId']);
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionImplementationStatus']).toBe(
        'row_body_value_sealed_completion_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');
      for (const key of absentKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
      for (const value of Object.values(row)) {
        expect(readyValues.has(String(value))).toBe(false);
      }
    }
  });
});
