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

const forbiddenSealedCompletedValueKeys = [
  'sourceBackedProductionValueRowBodyValueSealedCompletedValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedDecimalValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedNumerator',
  'sourceBackedProductionValueRowBodyValueSealedCompletedDenominator',
  'sourceBackedProductionValueRowBodyValueSealedCompletedPayout',
  'sourceBackedProductionValueRowBodyValueSealedCompletedAmount',
  'sourceBackedProductionValueRowBodyValueSealedCompletedRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedExpectedValue',
  'sourceBackedProductionValueRowBodyValueSealedCompletedExpectedReward',
  'sourceBackedProductionValueRowBodyValueSealedCompletedGraphBinding'
];

const forbiddenSealedFinalizedValueKeys = [
  'sourceBackedProductionValueRowBodyValueSealedFinalizedValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedDecimalValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedNumerator',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedDenominator',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedPayout',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedAmount',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedExpectedValue',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedExpectedReward',
  'sourceBackedProductionValueRowBodyValueSealedFinalizedGraphBinding'
];

const forbiddenSealedValueKeys = [
  'sourceBackedProductionValueRowBodyValueSealedValue',
  'sourceBackedProductionValueRowBodyValueSealedNumericValue',
  'sourceBackedProductionValueRowBodyValueSealedDecimalValue',
  'sourceBackedProductionValueRowBodyValueSealedNumerator',
  'sourceBackedProductionValueRowBodyValueSealedDenominator',
  'sourceBackedProductionValueRowBodyValueSealedPayout',
  'sourceBackedProductionValueRowBodyValueSealedAmount',
  'sourceBackedProductionValueRowBodyValueSealedRuntimeValue',
  'sourceBackedProductionValueRowBodyValueSealedExpectedValue',
  'sourceBackedProductionValueRowBodyValueSealedExpectedReward',
  'sourceBackedProductionValueRowBodyValueSealedGraphBinding'
];

const forbiddenRowBodyValueKeys = [
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'sourceBackedProductionValueRowBodyDecimalValue',
  'sourceBackedProductionValueRowBodyNumerator',
  'sourceBackedProductionValueRowBodyDenominator',
  'sourceBackedProductionValueRowBodyPayout',
  'sourceBackedProductionValueRowBodyAmount',
  'sourceBackedProductionValueRowBodyRuntimeValue',
  'sourceBackedProductionValueRowBodyExpectedValue',
  'sourceBackedProductionValueRowBodyExpectedReward',
  'sourceBackedProductionValueRowBodyGraphBinding'
];

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion'
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
  'sealed',
  'completed',
  'executable'
]);

type SealedCompletionBoundaryGuardRow = Record<string, unknown>;

function allSealedCompletionBoundaryRows(): readonly SealedCompletionBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionBoundaryInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value sealed completion boundary guards', () => {
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

  test('keeps sealed completion boundary ids separate from finalization, sealed, and prior ids', () => {
    for (const row of allSealedCompletionBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_sealed_completion_boundary');
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps sealed completed values, finalized values, sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedCompletionBoundaryRows()) {
      for (const key of [
        ...forbiddenSealedCompletedValueKeys,
        ...forbiddenSealedFinalizedValueKeys,
        ...forbiddenSealedValueKeys,
        ...forbiddenRowBodyValueKeys,
        ...forbiddenRuntimeKeys
      ]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all sealed completion boundary fields on the blocked path', () => {
    for (const row of allSealedCompletionBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationStatus']).toBe(
        'row_body_value_sealed_finalization_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionBoundaryStatus']).toBe(
        'row_body_value_sealed_completion_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedCompletionEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
