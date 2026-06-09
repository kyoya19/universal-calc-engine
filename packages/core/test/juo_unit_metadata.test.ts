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
});
