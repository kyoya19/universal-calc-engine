import { describe, expect, test } from 'vitest';
import {
  juoProbabilityUnitMetadataInventory,
  juoRewardUnitMetadataInventory
} from './fixtures/juo_unit_metadata';
import {
  juoProbabilityExtractedValueMetadataInventory,
  juoRewardExtractedValueMetadataInventory
} from './fixtures/juo_extracted_value_metadata';

const forbiddenExecutableKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount',
  'extractedValue'
]);

function expectNoExecutableValueKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenExecutableKeys.has(key)).toBe(false);
  }
}

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectStatusForApplicability(row: {
  readonly extractionApplicability: string;
  readonly extractionStatus: string;
  readonly normalizationStatus: string;
}): void {
  if (row.extractionApplicability === 'applicable') {
    expect(row.extractionStatus).toBe('not_started');
    expect(row.normalizationStatus).toBe('not_started');
    return;
  }

  expect(row.extractionStatus).toBe(row.extractionApplicability);
  expect(row.normalizationStatus).toBe(row.extractionApplicability);
}

describe('Juo extracted value metadata inventory', () => {
  test('preserves one probability extracted metadata row per probability unit metadata row', () => {
    const unitIds = juoProbabilityUnitMetadataInventory.map((row) => row.unitMetadataId).sort();
    const extractedUnitIds = juoProbabilityExtractedValueMetadataInventory.map((row) => row.unitMetadataId).sort();

    expect(extractedUnitIds).toEqual(unitIds);
  });

  test('preserves one reward extracted metadata row per reward unit metadata row', () => {
    const unitIds = juoRewardUnitMetadataInventory.map((row) => row.unitMetadataId).sort();
    const extractedUnitIds = juoRewardExtractedValueMetadataInventory.map((row) => row.unitMetadataId).sort();

    expect(extractedUnitIds).toEqual(unitIds);
  });

  test('keeps probability extracted value metadata non-executable', () => {
    for (const row of juoProbabilityExtractedValueMetadataInventory) {
      expect(row.extractedValueMetadataId.trim()).not.toBe('');
      expect(row.unitMetadataId.trim()).not.toBe('');
      expect(row.citationId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('probability');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward extracted value metadata non-executable', () => {
    for (const row of juoRewardExtractedValueMetadataInventory) {
      expect(row.extractedValueMetadataId.trim()).not.toBe('');
      expect(row.unitMetadataId.trim()).not.toBe('');
      expect(row.citationId.trim()).not.toBe('');
      expect(row.valueDomain).toBe('reward');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps extracted value metadata attached to matching unit metadata rows', () => {
    const probabilityUnitsById = new Map(juoProbabilityUnitMetadataInventory.map((row) => [row.unitMetadataId, row]));
    const rewardUnitsById = new Map(juoRewardUnitMetadataInventory.map((row) => [row.unitMetadataId, row]));

    for (const row of juoProbabilityExtractedValueMetadataInventory) {
      const unit = probabilityUnitsById.get(row.unitMetadataId);

      expect(unit).toBeDefined();
      expect(row.citationId).toBe(unit?.citationId);
      expect(row.sourceId).toBe(unit?.sourceId);
      expect(row.sourceType).toBe(unit?.sourceType);
      expect(row.reviewStatus).toBe(unit?.reviewStatus);
      expect(row.extractionApplicability).toBe(unit?.unitApplicability);
    }

    for (const row of juoRewardExtractedValueMetadataInventory) {
      const unit = rewardUnitsById.get(row.unitMetadataId);

      expect(unit).toBeDefined();
      expect(row.citationId).toBe(unit?.citationId);
      expect(row.sourceId).toBe(unit?.sourceId);
      expect(row.sourceType).toBe(unit?.sourceType);
      expect(row.reviewStatus).toBe(unit?.reviewStatus);
      expect(row.extractionApplicability).toBe(unit?.unitApplicability);
    }
  });

  test('does not promote applicable extracted value metadata to executable values', () => {
    const applicableRows = [
      ...juoProbabilityExtractedValueMetadataInventory,
      ...juoRewardExtractedValueMetadataInventory
    ].filter((row) => row.extractionApplicability === 'applicable');

    expect(applicableRows.length).toBeGreaterThan(0);

    for (const row of applicableRows) {
      expect(row.executionEligibility).toBe('no');
      expectStatusForApplicability(row);
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps probability and reward extracted metadata ids unique and disjoint', () => {
    const probabilityIds = juoProbabilityExtractedValueMetadataInventory.map((row) => row.extractedValueMetadataId);
    const rewardIds = juoRewardExtractedValueMetadataInventory.map((row) => row.extractedValueMetadataId);

    expectUniqueIds(probabilityIds);
    expectUniqueIds(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
    }
  });

  test('keeps probability extraction statuses internally aligned', () => {
    for (const row of juoProbabilityExtractedValueMetadataInventory) {
      expectStatusForApplicability(row);
      expect(row.extractedExpressionStatus).toBe(row.extractionStatus);
      expect(row.numeratorStatus).toBe(row.extractionStatus);
      expect(row.denominatorStatus).toBe(row.extractionStatus);
      expect(row.decimalStatus).toBe(row.extractionStatus);
      expect(row.normalizationStatus).toBe(row.extractionStatus);
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps reward extraction statuses internally aligned', () => {
    for (const row of juoRewardExtractedValueMetadataInventory) {
      expectStatusForApplicability(row);
      expect(row.extractedExpressionStatus).toBe(row.extractionStatus);
      expect(row.payoutAmountStatus).toBe(row.extractionStatus);
      expect(row.rewardUnitStatus).toBe(row.extractionStatus);
      expect(row.accountingBasisStatus).toBe(row.extractionStatus);
      expect(row.normalizationStatus).toBe(row.extractionStatus);
      expect(row.executionEligibility).toBe('no');
    }
  });

  test('keeps extraction metadata out of production value naming', () => {
    for (const row of [...juoProbabilityExtractedValueMetadataInventory, ...juoRewardExtractedValueMetadataInventory]) {
      expect(row.extractedValueMetadataId.endsWith('_extracted_value_metadata')).toBe(true);
      expect(row.extractedValueMetadataId.endsWith('_production_value')).toBe(false);
      expect(row.extractedValueMetadataId.endsWith('_executable_value')).toBe(false);
    }
  });
});
