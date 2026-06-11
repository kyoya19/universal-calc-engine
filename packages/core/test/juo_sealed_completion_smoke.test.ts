import { describe, expect, test } from 'vitest';
import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionInventory
} from './fixtures/juo_source_backed_production_value_row_body_value_sealed_completion';

describe('sealed completion smoke', () => {
  test('loads blocked completion rows', () => {
    expect(juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionInventory.length).toBeGreaterThan(0);
    expect(juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionInventory.length).toBeGreaterThan(0);
    expect(
      juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionInventory.every(
        (row) => row.executionEligibility === 'no'
      )
    ).toBe(true);
    expect(
      juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionInventory.every(
        (row) => row.executionEligibility === 'no'
      )
    ).toBe(true);
  });
});
