import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_boundary';

const valueMaterializationImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationId',
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus'
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
  'executable'
]);

type ValueMaterializationImplementationGuardRow = Record<string, unknown>;

function allValueMaterializationImplementationRows(): readonly ValueMaterializationImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value materialization implementation guards', () => {
  test('adds only value materialization implementation metadata beyond value materialization boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueMaterializationImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueMaterializationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationImplementationMetadataKeys].sort());
    }
  });

  test('keeps value materialization implementation ids separate from boundary and value ids', () => {
    for (const row of allValueMaterializationImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(implementationId).toContain('_source_backed_production_value_row_body_value_materialization_implementation');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueMaterializationImplementationRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value materialization implementation fields on the blocked path', () => {
    for (const row of allValueMaterializationImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus']).toBe(
        'row_body_value_materialization_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationStatus']).toBe(
        'row_body_value_materialization_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
