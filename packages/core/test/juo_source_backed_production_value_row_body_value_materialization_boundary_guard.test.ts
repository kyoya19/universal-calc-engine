import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_materialization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_implementation';

const valueMaterializationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryId',
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus',
  'sourceBackedProductionValueRowBodyValueMaterializationEligibility'
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

type ValueMaterializationBoundaryGuardRow = Record<string, unknown>;

function allValueMaterializationBoundaryRows(): readonly ValueMaterializationBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value materialization boundary guards', () => {
  test('adds only value materialization boundary metadata beyond value implementation rows', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyValueImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyValueImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueMaterializationBoundaryMetadataKeys].sort());
    }
  });

  test('keeps combined value materialization boundary rows detached from fixture rows', () => {
    const fixtureRows = [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueMaterializationBoundaryInventory
    ];
    const rows = allValueMaterializationBoundaryRows();

    expect(rows).toHaveLength(fixtureRows.length);
    rows.forEach((row, index) => {
      expect(row).toEqual(fixtureRows[index]);
      expect(row).not.toBe(fixtureRows[index]);
    });
  });

  test('keeps value materialization boundary ids separate from implementation and value ids', () => {
    for (const row of allValueMaterializationBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_materialization_boundary');
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueMaterializationBoundaryRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value materialization boundary fields on the blocked path', () => {
    for (const row of allValueMaterializationBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueImplementationStatus']).toBe(
        'row_body_value_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryStatus']).toBe(
        'row_body_value_materialization_boundary_blocked'
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