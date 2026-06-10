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

type SealedFinalizationImplementationGuardRow = Record<string, unknown>;

function allSealedFinalizationImplementationRows(): readonly SealedFinalizationImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedFinalizationImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value sealed finalization implementation guards', () => {
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

  test('keeps sealed finalization implementation ids separate from boundary, sealed, finalization, and prior ids', () => {
    for (const row of allSealedFinalizationImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).toContain('_source_backed_production_value_row_body_value_sealed_finalization_implementation');
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueSealedBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps sealed finalized values, sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedFinalizationImplementationRows()) {
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

  test('keeps all sealed finalization implementation fields on the blocked path', () => {
    for (const row of allSealedFinalizationImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationBoundaryStatus']).toBe(
        'row_body_value_sealed_finalization_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedFinalizationImplementationStatus']).toBe(
        'row_body_value_sealed_finalization_implementation_blocked'
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
