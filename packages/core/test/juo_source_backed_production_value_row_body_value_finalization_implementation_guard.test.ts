import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_implementation';

const valueFinalizationImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationId',
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueFinalizationImplementationStatus'
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

type ValueFinalizationImplementationGuardRow = Record<string, unknown>;

function allValueFinalizationImplementationRows(): readonly ValueFinalizationImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value finalization implementation guards', () => {
  test('adds only value finalization implementation metadata beyond value finalization boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueFinalizationImplementationMetadataKeys].sort());
    }
  });

  test('keeps combined value finalization implementation rows detached from fixture rows', () => {
    const fixtureRows = [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
    ];
    const rows = allValueFinalizationImplementationRows();

    expect(rows).toHaveLength(fixtureRows.length);
    rows.forEach((row, index) => {
      expect(row).toEqual(fixtureRows[index]);
      expect(row).not.toBe(fixtureRows[index]);
    });
  });

  test('keeps value finalization implementation ids separate from boundary and value ids', () => {
    for (const row of allValueFinalizationImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
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
      expect(implementationId).toContain('_source_backed_production_value_row_body_value_finalization_implementation');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueFinalizationImplementationRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value finalization implementation fields on the blocked path', () => {
    for (const row of allValueFinalizationImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryStatus']).toBe(
        'row_body_value_finalization_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationStatus']).toBe(
        'row_body_value_finalization_implementation_blocked'
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