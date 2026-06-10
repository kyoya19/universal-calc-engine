import {
  juoProbabilitySourceBackedProductionValueCreationGateInventory,
  juoRewardSourceBackedProductionValueCreationGateInventory,
  type JuoProbabilitySourceBackedProductionValueCreationGateRow,
  type JuoRewardSourceBackedProductionValueCreationGateRow
} from './juo_source_backed_production_value_creation_gate';

export type JuoSourceBackedProductionValueRowDraftBoundaryStatus = 'draft_boundary_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueCreationGateRow {
  readonly sourceBackedProductionValueRowDraftBoundaryId: string;
  readonly sourceBackedProductionValueRowDraftEligibility: 'no';
  readonly sourceBackedProductionValueRowDraftBoundaryStatus: JuoSourceBackedProductionValueRowDraftBoundaryStatus;
}

export interface JuoRewardSourceBackedProductionValueRowDraftBoundaryRow
  extends JuoRewardSourceBackedProductionValueCreationGateRow {
  readonly sourceBackedProductionValueRowDraftBoundaryId: string;
  readonly sourceBackedProductionValueRowDraftEligibility: 'no';
  readonly sourceBackedProductionValueRowDraftBoundaryStatus: JuoSourceBackedProductionValueRowDraftBoundaryStatus;
}

function probabilityRowFor(
  gate: JuoProbabilitySourceBackedProductionValueCreationGateRow
): JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow {
  return {
    ...gate,
    sourceBackedProductionValueRowDraftBoundaryId: `${gate.sourceId}_probability_source_backed_production_value_row_draft_boundary`,
    sourceBackedProductionValueRowDraftEligibility: 'no',
    sourceBackedProductionValueRowDraftBoundaryStatus: 'draft_boundary_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  gate: JuoRewardSourceBackedProductionValueCreationGateRow
): JuoRewardSourceBackedProductionValueRowDraftBoundaryRow {
  return {
    ...gate,
    sourceBackedProductionValueRowDraftBoundaryId: `${gate.sourceId}_reward_source_backed_production_value_row_draft_boundary`,
    sourceBackedProductionValueRowDraftEligibility: 'no',
    sourceBackedProductionValueRowDraftBoundaryStatus: 'draft_boundary_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueCreationGateInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowDraftBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowDraftBoundaryRow[] =
  juoRewardSourceBackedProductionValueCreationGateInventory.map(rewardRowFor);
