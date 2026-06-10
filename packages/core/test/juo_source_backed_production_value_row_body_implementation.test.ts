import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_creation_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_implementation';

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
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedRewardAssertion',
  'expectedValueAssertion'
]);

const allowedRowBodyKeys = new Set([
  'sourceBackedProductionValueRowBodyCreationEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryId',
  'sourceBackedProductionValueRowBodyCreationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryStatus',
  'sourceBackedProductionValueRowBodyImplementationId',
  'sourceBackedProductionValueRowBodyImplementationEligibility',
  'sourceBackedProductionValueRowBodyImplementationStatus',
  'sourceBackedProductionValueRowBodyValueCreationEligibility'
]);

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion',
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
  'row_body_value_created',
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

describe('Juo source-backed production value row body implementation inventory', () => {
  test('preserves one row body implementation row per row body creation boundary row', () => {
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId)
        .sort()
    ).toEqual(
      juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId)
        .sort()
    );
    expect(
      juoRewardSourceBackedProductionValueRowBodyImplementationInventory
        .map((row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId)
        .sort()
    ).toEqual(
      juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
        .map((row) => row.sourceBackedProductionValueRowBodyCreationBoundaryId)
        .sort()
    );
  });

  test('keeps row body implementation rows blocked and non-executable', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyImplementationInventory
    ]) {
      expect(row.sourceBackedProductionValueRowBodyCreationBoundaryEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyCreationBoundaryStatus).toBe(
        'row_body_creation_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyImplementationEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyImplementationStatus).toBe(
        'row_body_implementation_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyValueCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');
      expectNoForbiddenKeys({ ...row });
      expectNoReadyValues({ ...row });
    }
  });

  test('allows only row body boundary and implementation metadata, not row body value fields', () => {
    for (const row of [
      ...juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyImplementationInventory
    ]) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBody')) {
          expect(allowedRowBodyKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps row body implementation ids unique and domain-separated', () => {
    const probabilityIds = juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyImplementationId
    );
    const rewardIds = juoRewardSourceBackedProductionValueRowBodyImplementationInventory.map(
      (row) => row.sourceBackedProductionValueRowBodyImplementationId
    );

    expectUnique(probabilityIds);
    expectUnique(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
      expect(id.endsWith('_probability_source_backed_production_value_row_body_implementation')).toBe(true);
    }

    for (const id of rewardIds) {
      expect(id.endsWith('_reward_source_backed_production_value_row_body_implementation')).toBe(true);
    }
  });

  test('carries row body creation boundary metadata without creating row body values', () => {
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
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyImplementationEligibility',
        'sourceBackedProductionValueRowBodyImplementationId',
        'sourceBackedProductionValueRowBodyImplementationStatus',
        'sourceBackedProductionValueRowBodyValueCreationEligibility'
      ]);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyCreationBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyImplementationEligibility',
        'sourceBackedProductionValueRowBodyImplementationId',
        'sourceBackedProductionValueRowBodyImplementationStatus',
        'sourceBackedProductionValueRowBodyValueCreationEligibility'
      ]);
    }
  });
});
