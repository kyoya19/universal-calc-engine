import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_boundary';

const sealedBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueSealedBoundaryId',
  'sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueSealedBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueSealedEligibility'
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

type SealedBoundaryGuardRow = Record<string, unknown>;

function allSealedBoundaryRows(): readonly SealedBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo source-backed production value row body value sealed boundary guards', () => {
  test('adds only sealed boundary metadata beyond finalization rows', () => {
    const probabilityFinalizationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationId,
        row
      ])
    );
    const rewardFinalizationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      const finalization = probabilityFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory) {
      const finalization = rewardFinalizationRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationId);
      expect(finalization).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(finalization ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...sealedBoundaryMetadataKeys].sort());
    }
  });

  test('keeps sealed boundary ids separate from finalization, implementation, boundary, and value ids', () => {
    for (const row of allSealedBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueSealedBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_sealed_boundary');
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

  test('keeps sealed values, row body values, runtime fields, graph bindings, and assertions absent', () => {
    for (const row of allSealedBoundaryRows()) {
      for (const key of [...forbiddenSealedValueKeys, ...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all sealed boundary fields on the blocked path', () => {
    for (const row of allSealedBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationStatus']).toBe('row_body_value_finalization_blocked');
      expect(row['sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueSealedBoundaryStatus']).toBe(
        'row_body_value_sealed_boundary_blocked'
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
