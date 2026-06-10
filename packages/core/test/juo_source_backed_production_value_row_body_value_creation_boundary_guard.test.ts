import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_creation_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_implementation';

const valueCreationBoundaryMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueCreationBoundaryId',
  'sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyValueCreationBoundaryStatus'
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

type ValueCreationBoundaryGuardRow = Record<string, unknown>;

function allValueCreationBoundaryRows(): readonly ValueCreationBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value creation boundary guards', () => {
  test('adds only value creation boundary metadata beyond row body implementation rows', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueCreationBoundaryMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueCreationBoundaryMetadataKeys].sort());
    }
  });

  test('keeps value creation boundary ids separate from implementation and value ids', () => {
    for (const row of allValueCreationBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(boundaryId).toContain('_source_backed_production_value_row_body_value_creation_boundary');
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueCreationBoundaryRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value creation boundary guard values on the blocked path', () => {
    for (const row of allValueCreationBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationBoundaryStatus']).toBe(
        'row_body_value_creation_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
