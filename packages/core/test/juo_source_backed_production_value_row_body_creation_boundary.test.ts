import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_implementation';
import {
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_creation_boundary';

const forbiddenKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount',
  'productionValue',
  'expectedValue',
  'graphBinding',
  'runtimeTarget',
  'sourceBackedValue',
  'sourceBackedProductionValue',
  'sourceBackedNumericValue',
  'sourceBackedDecimalValue',
  'sourceBackedNumerator',
  'sourceBackedDenominator',
  'sourceBackedPayout',
  'sourceBackedProductionValueRowBody',
  'sourceBackedProductionValueRowBodyId',
  'sourceBackedProductionValueRowBodyStatus',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

const allowedRowBodyCreationKeys = new Set([
  'sourceBackedProductionValueRowBodyCreationEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryId',
  'sourceBackedProductionValueRowBodyCreationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryStatus'
]);

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion',
  'sourceBackedProductionValueRowBody',
  'sourceBackedProductionValueRowBodyId',
  'sourceBackedProductionValueRowBodyStatus',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'sourceBackedProductionValueRowBodyRuntimeValue'
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
  'executable'
]);

function expectUnique(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectNoForbiddenKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenKeys.has(key)).toBe(false);
  }
}

function expectNoReadyValues(row: Record<string, unknown>): void {
  for (const value of Object.values(row)) {
    expect(forbiddenReadyValues.has(String(value))).toBe(false);
  }
}

describe('Juo source-backed production value row body creation boundary inventory', () => {
  test('preserves one row body creation boundary row per placeholder implementation row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyPlaceholderImplementationId)
        .sort()
    );
  });

  test('keeps row body creation boundary rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyCreationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyCreationBoundaryStatus).toBe(
        'row_body_creation_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('allows only row body creation boundary metadata, not row body implementation fields', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
      ...juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
    ]) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBodyCreation')) {
          expect(allowedRowBodyCreationKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps row body creation boundary ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_creation_boundary')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_creation_boundary')).toBe(true);
    }
  });

  test('carries placeholder implementation metadata without creating row bodies', () => {
    const probabilityImplementationRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderImplementationId,
        row
      ])
    );
    const rewardImplementationRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderImplementationId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory) {
      const implementation = probabilityImplementationRows.get(
        row.sourceBackedProductionValueRowBodyPlaceholderImplementationId
      );
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyCreationBoundaryEligibility',
        'sourceBackedProductionValueRowBodyCreationBoundaryId',
        'sourceBackedProductionValueRowBodyCreationBoundaryStatus'
      ]);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory) {
      const implementation = rewardImplementationRows.get(row.sourceBackedProductionValueRowBodyPlaceholderImplementationId);
      expect(implementation).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(implementation ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyCreationBoundaryEligibility',
        'sourceBackedProductionValueRowBodyCreationBoundaryId',
        'sourceBackedProductionValueRowBodyCreationBoundaryStatus'
      ]);
    }
  });
});
