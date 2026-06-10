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

type SealedImplementationGuardRow = Record<string, unknown>;

function allSealedImplementationRows(): readonly SealedImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedImplementationInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedImplementationInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo source-backed production value row body value sealed implementation guards', () => {
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

  test('keeps sealed implementation ids separate from sealed boundary, finalization, and prior ids', () => {
    for (const row of allSealedImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyValueSealedImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).toContain('_source_backed_production_value_row_body_value_sealed_implementation');
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

  test('keeps sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedImplementationRows()) {
      for (const key of [...forbiddenSealedValueKeys, ...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all sealed implementation fields on the blocked path', () => {
    for (const row of allSealedImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedBoundaryStatus']).toBe(
        'row_body_value_sealed_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueSealedImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedImplementationStatus']).toBe(
        'row_body_value_sealed_implementation_blocked'
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
