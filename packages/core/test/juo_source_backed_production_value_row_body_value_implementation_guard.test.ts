import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_creation_boundary';

const valueImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyValueImplementationId',
  'sourceBackedProductionValueRowBodyValueImplementationEligibility',
  'sourceBackedProductionValueRowBodyValueImplementationStatus'
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

type ValueImplementationGuardRow = Record<string, unknown>;

function allValueImplementationRows(): readonly ValueImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body value implementation guards', () => {
  test('adds only value implementation metadata beyond value creation boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueCreationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueCreationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyValueCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...valueImplementationMetadataKeys].sort());
    }
  });

  test('keeps value implementation ids separate from boundary and value ids', () => {
    for (const row of allValueImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyValueImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(implementationId).toContain('_source_backed_production_value_row_body_value_implementation');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allValueImplementationRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all value implementation fields on the blocked path', () => {
    for (const row of allValueImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationBoundaryStatus']).toBe(
        'row_body_value_creation_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueImplementationStatus']).toBe(
        'row_body_value_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
