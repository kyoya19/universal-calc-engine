import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_implementation';

const valueFinalizationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryId',
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueFinalizationEligibility'
]);

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
  'executable'
]);

type ValueFinalizationBoundaryGuardRow = Record<string, unknown>;

function allValueFinalizationBoundaryRows(): readonly ValueFinalizationBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value finalization boundary guards', () => {
  test('adds only value finalization boundary metadata beyond value materialization implementation rows', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationBoundaryMetadataKeys].sort());
    }
  });

  test('keeps value finalization boundary ids separate from implementation and value ids', () => {
    for (const row of allValueFinalizationBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
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
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_finalization_boundary');
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueFinalizationBoundaryRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value finalization boundary fields on the blocked path', () => {
    for (const row of allValueFinalizationBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus']).toBe(
        'row_body_value_materialization_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus']).toBe(
        'row_body_value_finalization_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
