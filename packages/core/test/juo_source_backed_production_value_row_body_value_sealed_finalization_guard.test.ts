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
  'executable'
]);

type SealedFinalizationGuardRow = Record<string, unknown>;

function allSealedFinalizationRows(): readonly SealedFinalizationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo source-backed production value row body value sealed finalization guards', () => {
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

  test('keeps sealed finalization ids separate from implementation, boundary, sealed, finalization, and prior ids', () => {
    for (const row of allSealedFinalizationRows()) {
      const finalizationId = String(row['sourceBackedProductionValueRowBodyValueSealedFinalizationId']);

      expect(finalizationId).toContain(String(row['sourceId']));
      expect(finalizationId).toContain('_source_backed_production_value_row_body_value_sealed_finalization');
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(finalizationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps sealed finalized values, sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedFinalizationRows()) {
      for (const key of [
        ...forbiddenSealedFinalizedValueKeys,
        ...forbiddenSealedValueKeys,
        ...forbiddenRowBodyValueKeys,
        ...forbiddenRuntimeKeys
      ]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all sealed finalization fields on the blocked path', () => {
    for (const row of allSealedFinalizationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationStatus']).toBe(
        'row_body_value_sealed_finalization_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationStatus']).toBe(
        'row_body_value_sealed_finalization_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
