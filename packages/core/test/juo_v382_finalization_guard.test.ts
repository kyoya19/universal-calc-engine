import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization';

const finalizationKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationId',
  'sourceBackedProductionValueRowBodyValueFinalizationStatus'
]);

const forbiddenValueKeys = [
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

type GuardRow = Record<string, unknown>;

function allRows(): readonly GuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => ({ ...row })),
    ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory.map((row) => ({ ...row }))
  ];
}

describe('Juo v38.2 finalization guards', () => {
  test('adds only finalization metadata beyond finalization implementation rows', () => {
    const probabilityRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId,
        row
      ])
    );
    const rewardRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory) {
      const implementation = probabilityRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId);
      expect(implementation).toBeDefined();
      expect(Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key)).sort()).toEqual(
        [...finalizationKeys].sort()
      );
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory) {
      const implementation = rewardRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId);
      expect(implementation).toBeDefined();
      expect(Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key)).sort()).toEqual(
        [...finalizationKeys].sort()
      );
    }
  });

  test('keeps finalization ids separate from implementation and boundary ids', () => {
    for (const row of allRows()) {
      const finalizationId = String(row['sourceBackedProductionValueRowBodyValueFinalizationId']);

      expect(finalizationId).toContain(String(row['sourceId']));
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueFinalizationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueMaterializationBoundaryId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueImplementationId']);
      expect(finalizationId).not.toBe(row['sourceBackedProductionValueRowBodyValueCreationBoundaryId']);
      expect(finalizationId).toContain('_source_backed_production_value_row_body_value_finalization');
      expect(finalizationId).not.toContain('_source_backed_production_value_row_body_value_id');
    }
  });

  test('keeps value, numeric, runtime, graph, and assertion fields absent', () => {
    for (const row of allRows()) {
      for (const key of [...forbiddenValueKeys, ...forbiddenRuntimeKeys]) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps finalization fields on the blocked path', () => {
    for (const row of allRows()) {
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueFinalizationStatus']).toBe('row_body_value_finalization_blocked');
      expect(row['sourceBackedProductionValueRowBodyValueMaterializationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyValueCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
