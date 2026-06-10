import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_finalization';

const addedKeys = new Set([
  'sourceBackedProductionValueRowBodyValueFinalizationId',
  'sourceBackedProductionValueRowBodyValueFinalizationStatus'
]);

const forbiddenKeys = [
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion'
];

describe('Juo v38.1 finalization inventory', () => {
  test('preserves one finalization row per finalization implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
      )
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
      )
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
      )
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyValueFinalizationImplementationInventory.map(
        (row) => row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId
      )
    );
  });

  test('keeps finalization rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueFinalizationStatus).toBe('row_body_value_finalization_blocked');
      expect(row.sourceBackedProductionValueRowBodyValueMaterializationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      for (const key of forbiddenKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

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
        [...addedKeys].sort()
      );
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory) {
      const implementation = rewardRows.get(row.sourceBackedProductionValueRowBodyValueFinalizationImplementationId);
      expect(implementation).toBeDefined();
      expect(Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key)).sort()).toEqual(
        [...addedKeys].sort()
      );
    }
  });
});
