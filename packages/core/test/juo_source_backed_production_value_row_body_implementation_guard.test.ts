import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_creation_boundary';

const rowBodyImplementationMetadataKeys = new Set([
  'sourceBackedProductionValueRowBodyImplementationId',
  'sourceBackedProductionValueRowBodyImplementationEligibility',
  'sourceBackedProductionValueRowBodyImplementationStatus',
  'sourceBackedProductionValueRowBodyValueCreationEligibility'
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

type RowBodyImplementationGuardRow = Record<string, unknown>;

function allImplementationRows(): readonly RowBodyImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyImplementationInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo source-backed production value row body implementation guards', () => {
  test('adds only implementation metadata beyond row body creation boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyCreationBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyCreationBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...rowBodyImplementationMetadataKeys].sort());
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([...rowBodyImplementationMetadataKeys].sort());
    }
  });

  test('keeps implementation ids separate from creation boundary and placeholder ids', () => {
    for (const row of allImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(implementationId).toContain('_source_backed_production_value_row_body_implementation');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_value');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allImplementationRows()) {
      for (const key of [...forbiddenRowBodyValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps all implementation guard values on the blocked path', () => {
    for (const row of allImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyCreationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyCreationBoundaryStatus']).toBe(
        'row_body_creation_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyImplementationStatus']).toBe(
        'row_body_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
