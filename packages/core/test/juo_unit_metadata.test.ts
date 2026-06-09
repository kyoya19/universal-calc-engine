import { describe, expect, test } from 'vitest';
import { juoCitationMetadataInventory } from './fixtures/juo_citation_metadata';
import {
  juoProbabilityUnitMetadataInventory,
  juoRewardUnitMetadataInventory
} from './fixtures/juo_unit_metadata';

const forbiddenExecutableKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'formula',
  'payout',
  'reward',
  'probability',
  'amount'
]);

function expectNoExecutableValueKeys(row: Record<string, unknown>): void {
  for (const key of Object.keys(row)) {
    expect(forbiddenExecutableKeys.has(key)).toBe(false);
  }
}

function expectUniqueIds(ids: readonly string[]): void {
  expect(new Set(ids).size).toBe(ids.length);
}

function expectMappingStatusesForApplicability(row: {
  readonly unitApplicability: string;
  readonly normalizationStatus: string;
}): void {
  if (row.unitApplicability === 'applicable') {
    expect(row.normalizationStatus).toBe('not_started');
    return;
  }

  expect(row.normalizationStatus).toBe(row.unitApplicability);
}

describe('Juo unit metadata inventory', () => {
  test('preserves one probability unit metadata row per citation row', () => {
    const citationIds = juoCitationMetadataInventory.map((row) => row.citationId).sort();
    const unitCitationIds = juoProbabilityUnitMetadataInventory.map((row) => row.citationId).sort();

    expect(unitCitationIds).toEqual(citationIds);
  });

  test('preserves one reward unit metadata row per citation row', () => {
    const citationIds = juoCitationMetadataInventory.map((row) => row.citationId).sort();
    const unitCitationIds = juoRewardUnitMetadataInventory.map((row) => row.citationId).sort();

    expect(unitCitationIds).toEqual(citationIds);
  });

  test('keeps probability unit metadata non-executable', () => {
    for (const row of juoProbabilityUnitMetadataInventory) {
      expect(row.unitMetadataId.trim()).not.toBe('');
      expect(row.citationId.trim()).not.toBe('');
      expect(row.sourceId.trim()).not.toBe('');
      expect(row.sourceType.trim()).not.toBe('');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps reward unit metadata non-executable', () => {
    for (const row of juoRewardUnitMetadataInventory) {
      expect(row.unitMetadataId.trim()).not.toBe('');
      expect(row.citationId.trim()).not.toBe('');
      expect(row.sourceId.trim()).not.toBe('');
      expect(row.sourceType.trim()).not.toBe('');
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('does not promote applicable unit metadata to executable value rows', () => {
    const applicableProbabilityRows = juoProbabilityUnitMetadataInventory.filter(
      (row) => row.unitApplicability === 'applicable'
    );
    const applicableRewardRows = juoRewardUnitMetadataInventory.filter((row) => row.unitApplicability === 'applicable');

    expect(applicableProbabilityRows.length).toBeGreaterThan(0);
    expect(applicableRewardRows.length).toBeGreaterThan(0);

    for (const row of [...applicableProbabilityRows, ...applicableRewardRows]) {
      expect(row.executionEligibility).toBe('no');
      expectNoExecutableValueKeys({ ...row });
    }
  });

  test('keeps probability and reward unit metadata ids unique and disjoint', () => {
    const probabilityIds = juoProbabilityUnitMetadataInventory.map((row) => row.unitMetadataId);
    const rewardIds = juoRewardUnitMetadataInventory.map((row) => row.unitMetadataId);

    expectUniqueIds(probabilityIds);
    expectUniqueIds(rewardIds);

    for (const id of probabilityIds) {
      expect(rewardIds).not.toContain(id);
    }
  });

  test('keeps unit metadata attached to existing citation metadata rows only', () => {
    const citationById = new Map(juoCitationMetadataInventory.map((row) => [row.citationId, row]));

    for (const row of [...juoProbabilityUnitMetadataInventory, ...juoRewardUnitMetadataInventory]) {
      const citation = citationById.get(row.citationId);

      expect(citation).toBeDefined();
      expect(row.sourceId).toBe(citation?.sourceId);
      expect(row.sourceType).toBe(citation?.sourceType);
      expect(row.reviewStatus).toBe(citation?.reviewStatus);
    }
  });

  test('keeps unit applicability separate from executable value status', () => {
    for (const row of juoProbabilityUnitMetadataInventory) {
      expectMappingStatusesForApplicability(row);
      expect(row.probabilityExpressionStatus).toBe(row.normalizationStatus);
      expect(row.denominatorStatus).toBe(row.normalizationStatus);
      expect(row.observationBasisStatus).toBe(row.normalizationStatus);
      expect(row.executionEligibility).toBe('no');
    }

    for (const row of juoRewardUnitMetadataInventory) {
      expectMappingStatusesForApplicability(row);
      expect(row.rewardExpressionStatus).toBe(row.normalizationStatus);
      expect(row.payoutBasisStatus).toBe(row.normalizationStatus);
      expect(row.tokenBasisStatus).toBe(row.normalizationStatus);
      expect(row.executionEligibility).toBe('no');
    }
  });
});
