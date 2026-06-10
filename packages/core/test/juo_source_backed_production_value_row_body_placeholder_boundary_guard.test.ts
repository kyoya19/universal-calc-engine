import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_readiness_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_boundary';

const allowedPlaceholderBoundaryKeys = new Set([
  'sourceBackedProductionValueRowBodyPlaceholderEligibility',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
]);

const forbiddenImplementationKeys = [
  'sourceBackedProductionValueRowBodyPlaceholderId',
  'sourceBackedProductionValueRowBodyPlaceholderStatus',
  'sourceBackedProductionValueRowBodyPlaceholderKind',
  'sourceBackedProductionValueRowBodyPlaceholderValue',
  'sourceBackedProductionValueRowBodyPlaceholderNumericValue',
  'sourceBackedProductionValueRowBodyPlaceholderSourceValue',
  'sourceBackedProductionValueRowBodyPlaceholderUnitValue',
  'sourceBackedProductionValueRowBodyPlaceholderRuntimeValue',
  'sourceBackedProductionValueRowBodyPlaceholderExpectedValue',
  'sourceBackedProductionValueRowBodyPlaceholderExpectedReward',
  'sourceBackedProductionValueRowBodyPlaceholderGraphBinding'
];

const forbiddenRuntimeKeys = [
  'productionGraphBinding',
  'runtimeTargetSubstitution',
  'targetSubstitution',
  'expectedValueAssertion',
  'expectedRewardAssertion',
  'sourceBackedProductionValueRowBody',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'sourceBackedProductionValueRowBodyRuntimeValue'
];

const forbiddenNumericFragments = [
  'NumericValue',
  'DecimalValue',
  'Numerator',
  'Denominator',
  'Payout',
  'Amount'
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
  'executable'
]);

function allPlaceholderRows(): readonly Record<string, unknown>[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
    ...juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
  ];
}

describe('Juo source-backed production value row body placeholder boundary guards', () => {
  test('allows only placeholder boundary metadata, not row body placeholder implementation fields', () => {
    for (const row of allPlaceholderRows()) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBodyPlaceholder')) {
          expect(allowedPlaceholderBoundaryKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenImplementationKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('adds only placeholder boundary id and status beyond row body readiness rows', () => {
    const probabilityReadinessRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId,
        row
      ])
    );
    const rewardReadinessRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyReadinessBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      const readiness = probabilityReadinessRows.get(row.sourceBackedProductionValueRowBodyReadinessBoundaryId);
      expect(readiness).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(readiness ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
        'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
      ]);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory) {
      const readiness = rewardReadinessRows.get(row.sourceBackedProductionValueRowBodyReadinessBoundaryId);
      expect(readiness).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(readiness ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
        'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus'
      ]);
    }
  });

  test('keeps placeholder boundary ids separate from readiness, shell, and executable row body ids', () => {
    for (const row of allPlaceholderRows()) {
      const boundaryId = String(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId);

      expect(boundaryId).toContain(String(row.sourceId));
      expect(boundaryId).not.toBe(row.sourceBackedProductionValueRowBodyReadinessBoundaryId);
      expect(boundaryId).not.toBe(row.sourceBackedProductionValueRowShellBoundaryId);
      expect(boundaryId).not.toContain(String(row.sourceBackedProductionValueRowBodyReadinessBoundaryId));
      expect(boundaryId).not.toContain(String(row.sourceBackedProductionValueRowShellBoundaryId));
      expect(boundaryId).toContain('_source_backed_production_value_row_body_placeholder_boundary');
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_placeholder_id');
    }
  });

  test('keeps runtime, assertion, and numeric row-body fields absent', () => {
    for (const row of allPlaceholderRows()) {
      for (const key of forbiddenRuntimeKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }

      for (const key of Object.keys(row)) {
        for (const fragment of forbiddenNumericFragments) {
          expect(key).not.toContain(fragment);
        }
      }
    }
  });

  test('keeps all placeholder boundary guard values on the blocked path', () => {
    for (const row of allPlaceholderRows()) {
      expect(row.sourceBackedProductionValueRowBodyPlaceholderEligibility).toBe('no');
      expect(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus).toBe(
        'row_body_placeholder_boundary_blocked'
      );
      expect(row.sourceBackedProductionValueRowBodyCreationEligibility).toBe('no');
      expect(row.executionEligibility).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
