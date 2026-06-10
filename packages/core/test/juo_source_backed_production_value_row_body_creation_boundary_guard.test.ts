import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_creation_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_implementation';

const allowedRowBodyCreationKeys = new Set([
  'sourceBackedProductionValueRowBodyCreationEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryId',
  'sourceBackedProductionValueRowBodyCreationBoundaryEligibility',
  'sourceBackedProductionValueRowBodyCreationBoundaryStatus'
]);

const forbiddenRowBodyKeys = [
  'sourceBackedProductionValueRowBodyId',
  'sourceBackedProductionValueRowBodyStatus',
  'sourceBackedProductionValueRowBodyKind',
  'sourceBackedProductionValueRowBodyValue',
  'sourceBackedProductionValueRowBodyNumericValue',
  'sourceBackedProductionValueRowBodySourceValue',
  'sourceBackedProductionValueRowBodyUnitValue',
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
  'expectedRewardAssertion',
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
  'implemented',
  'row_body_created',
  'executable'
]);

type RowBodyCreationBoundaryGuardRow = Record<string, unknown>;

function allCreationBoundaryRows(): readonly RowBodyCreationBoundaryGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body creation boundary guards', () => {
  test('allows only row body creation boundary metadata fields', () => {
    for (const row of allCreationBoundaryRows()) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBodyCreation')) {
          expect(allowedRowBodyCreationKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenRowBodyKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('adds only row body creation boundary id, eligibility, and status beyond placeholder implementation rows', () => {
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
      const implementation = rewardImplementationRows.get(
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
  });

  test('keeps row body creation boundary ids separate from placeholder and executable row body ids', () => {
    for (const row of allCreationBoundaryRows()) {
      const boundaryId = String(row['sourceBackedProductionValueRowBodyCreationBoundaryId']);

      expect(boundaryId).toContain(String(row['sourceId']));
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(boundaryId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(boundaryId).toContain('_source_backed_production_value_row_body_creation_boundary');
      expect(boundaryId).not.toContain('_source_backed_production_value_row_body_id');
    }
  });

  test('keeps runtime, assertion, and numeric row-body fields absent', () => {
    for (const row of allCreationBoundaryRows()) {
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

  test('keeps all row body creation guard values on the blocked path', () => {
    for (const row of allCreationBoundaryRows()) {
      expect(row['sourceBackedProductionValueRowBodyCreationBoundaryEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyCreationBoundaryStatus']).toBe(
        'row_body_creation_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});
