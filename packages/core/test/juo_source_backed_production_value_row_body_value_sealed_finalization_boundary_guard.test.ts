import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_finalization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_implementation';

const sealedFinalizationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility'
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

type SealedFinalizationBoundaryGuardRow = Record<string, unknown>;

function allSealedFinalizationBoundaryRows(): readonly SealedFinalizationBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo source-backed production value row body value sealed finalization boundary guards', () => {
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

  test('keeps sealed finalization boundary ids separate from sealed implementation, sealed boundary, finalization, and prior ids', () => {
    for (const row of allSealedFinalizationBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_sealed_finalization_boundary');
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

  test('keeps sealed finalized values, sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedFinalizationBoundaryRows()) {
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

  test('keeps all sealed finalization boundary fields on the blocked path', () => {
    for (const row of allSealedFinalizationBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueSealedImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedImplementationStatus']).toBe(
        'row_body_value_sealed_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus']).toBe(
        'row_body_value_sealed_finalization_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
