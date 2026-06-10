import {
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory,
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory,
  type JuoProbabilitySourceBackedProductionValueRowBodyValueFinalizationRow,
  type JuoRewardSourceBackedProductionValueRowBodyValueFinalizationRow
} from './juo_source_backed_production_value_row_body_value_finalization';

export type JuoSourceBackedProductionValueRowBodyValueSealedBoundaryStatus =
  'row_body_value_sealed_boundary_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueRowBodyValueFinalizationRow {
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryStatus: JuoSourceBackedProductionValueRowBodyValueSealedBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyValueSealedEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryRow
  extends JuoRewardSourceBackedProductionValueRowBodyValueFinalizationRow {
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueSealedBoundaryStatus: JuoSourceBackedProductionValueRowBodyValueSealedBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyValueSealedEligibility: 'no';
}

function probabilityRowFor(
  finalization: JuoProbabilitySourceBackedProductionValueRowBodyValueFinalizationRow
): JuoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryRow {
  return {
    ...finalization,
    sourceBackedProductionValueRowBodyValueSealedBoundaryId: `${finalization.sourceId}_probability_source_backed_production_value_row_body_value_sealed_boundary`,
    sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility: 'no',
    sourceBackedProductionValueRowBodyValueSealedBoundaryStatus: 'row_body_value_sealed_boundary_blocked',
    sourceBackedProductionValueRowBodyValueSealedEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  finalization: JuoRewardSourceBackedProductionValueRowBodyValueFinalizationRow
): JuoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryRow {
  return {
    ...finalization,
    sourceBackedProductionValueRowBodyValueSealedBoundaryId: `${finalization.sourceId}_reward_source_backed_production_value_row_body_value_sealed_boundary`,
    sourceBackedProductionValueRowBodyValueSealedBoundaryEligibility: 'no',
    sourceBackedProductionValueRowBodyValueSealedBoundaryStatus: 'row_body_value_sealed_boundary_blocked',
    sourceBackedProductionValueRowBodyValueSealedEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyValueSealedBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueRowBodyValueFinalizationInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowBodyValueSealedBoundaryRow[] =
  juoRewardSourceBackedProductionValueRowBodyValueFinalizationInventory.map(rewardRowFor);
