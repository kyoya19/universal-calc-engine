import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_boundary';
import {
  juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
} from './fixtures/juo_source_backed_production_value_row_body_placeholder_implementation';

const allowedPlaceholderImplementationKeys = new Set([
  'sourceBackedProductionValueRowBodyPlaceholderEligibility',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryId',
  'sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
  'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
]);

const forbiddenRealPlaceholderKeys = [
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
  'implemented',
  'executable'
]);

type PlaceholderImplementationGuardRow = Record<string, unknown>;

function allImplementationRows(): readonly PlaceholderImplementationGuardRow[] {
  return [
    ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map((row) => ({
      ...row
    })),
    ...juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory.map((row) => ({
      ...row
    }))
  ];
}

describe('Juo source-backed production value row body placeholder implementation guards', () => {
  test('allows only placeholder boundary and implementation metadata fields', () => {
    for (const row of allImplementationRows()) {
      for (const key of Object.keys(row)) {
        if (key.includes('RowBodyPlaceholder')) {
          expect(allowedPlaceholderImplementationKeys.has(key)).toBe(true);
        }
      }

      for (const key of forbiddenRealPlaceholderKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    }
  });

  test('keeps combined placeholder implementation rows detached from fixture rows', () => {
    const fixtureRows = [
      ...juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory,
      ...juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory
    ];
    const rows = allImplementationRows();

    expect(rows).toHaveLength(fixtureRows.length);
    rows.forEach((row, index) => {
      expect(row).toEqual(fixtureRows[index]);
      expect(row).not.toBe(fixtureRows[index]);
    });
  });

  test('adds only placeholder implementation id, eligibility, and status beyond boundary rows', () => {
    const probabilityBoundaryRows = new Map(
      juoProbabilitySourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId,
        row
      ])
    );
    const rewardBoundaryRows = new Map(
      juoRewardSourceBackedProductionValueRowBodyPlaceholderBoundaryInventory.map((row) => [
        row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId,
        row
      ])
    );

    for (const row of juoProbabilitySourceBackedProductionValueRowBodyPlaceholderImplementationInventory) {
      const boundary = probabilityBoundaryRows.get(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
      ]);
    }

    for (const row of juoRewardSourceBackedProductionValueRowBodyPlaceholderImplementationInventory) {
      const boundary = rewardBoundaryRows.get(row.sourceBackedProductionValueRowBodyPlaceholderBoundaryId);
      expect(boundary).toBeDefined();
      const addedKeys = Object.keys(row).filter((key) => !Object.keys(boundary ?? {}).includes(key));
      expect(addedKeys.sort()).toEqual([
        'sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationId',
        'sourceBackedProductionValueRowBodyPlaceholderImplementationStatus'
      ]);
    }
  });

  test('keeps placeholder implementation ids separate from boundary and executable row body ids', () => {
    for (const row of allImplementationRows()) {
      const implementationId = String(row['sourceBackedProductionValueRowBodyPlaceholderImplementationId']);

      expect(implementationId).toContain(String(row['sourceId']));
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowBodyReadinessBoundaryId']);
      expect(implementationId).not.toBe(row['sourceBackedProductionValueRowShellBoundaryId']);
      expect(implementationId).toContain('_source_backed_production_value_row_body_placeholder_implementation');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_placeholder_id');
      expect(implementationId).not.toContain('_source_backed_production_value_row_body_id');
    }
  });

  test('keeps runtime, assertion, and numeric row-body fields absent', () => {
    for (const row of allImplementationRows()) {
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

  test('keeps all placeholder implementation guard values on the blocked path', () => {
    for (const row of allImplementationRows()) {
      expect(row['sourceBackedProductionValueRowBodyPlaceholderEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyPlaceholderBoundaryStatus']).toBe(
        'row_body_placeholder_boundary_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyPlaceholderImplementationEligibility']).toBe('no');
      expect(row['sourceBackedProductionValueRowBodyPlaceholderImplementationStatus']).toBe(
        'row_body_placeholder_implementation_blocked'
      );
      expect(row['sourceBackedProductionValueRowBodyCreationEligibility']).toBe('no');
      expect(row['executionEligibility']).toBe('no');

      for (const value of Object.values(row)) {
        expect(forbiddenReadyValues.has(String(value))).toBe(false);
      }
    }
  });
});