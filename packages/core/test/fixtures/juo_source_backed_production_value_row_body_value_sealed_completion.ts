import {
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory
} from './juo_source_backed_production_value_row_body_value_sealed_completion_implementation';

type CompletionStatus = 'row_body_value_sealed_completion_blocked';

export type JuoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionRow =
  (typeof juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory)[number] & {
    readonly sourceBackedProductionValueRowBodyValueSealedCompletionId: string;
    readonly sourceBackedProductionValueRowBodyValueSealedCompletionStatus: CompletionStatus;
  };

export type JuoRewardSourceBackedProductionValueRowBodyValueSealedCompletionRow =
  (typeof juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory)[number] & {
    readonly sourceBackedProductionValueRowBodyValueSealedCompletionId: string;
    readonly sourceBackedProductionValueRowBodyValueSealedCompletionStatus: CompletionStatus;
  };

export const juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionRow[] =
  juoProbabilitySourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map((row) => ({
    ...row,
    sourceBackedProductionValueRowBodyValueSealedCompletionId: `${row.sourceId}_probability_source_backed_production_value_row_body_value_sealed_completion`,
    sourceBackedProductionValueRowBodyValueSealedCompletionStatus: 'row_body_value_sealed_completion_blocked',
    sourceBackedProductionValueRowBodyValueSealedCompletionEligibility: 'no',
    sourceBackedProductionValueRowBodyValueSealedEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  }));

export const juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionInventory: readonly JuoRewardSourceBackedProductionValueRowBodyValueSealedCompletionRow[] =
  juoRewardSourceBackedProductionValueRowBodyValueSealedCompletionImplementationInventory.map((row) => ({
    ...row,
    sourceBackedProductionValueRowBodyValueSealedCompletionId: `${row.sourceId}_reward_source_backed_production_value_row_body_value_sealed_completion`,
    sourceBackedProductionValueRowBodyValueSealedCompletionStatus: 'row_body_value_sealed_completion_blocked',
    sourceBackedProductionValueRowBodyValueSealedCompletionEligibility: 'no',
    sourceBackedProductionValueRowBodyValueSealedEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  }));
