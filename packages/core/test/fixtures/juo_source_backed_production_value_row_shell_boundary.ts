import {
  juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow,
  type JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow
} from './juo_source_backed_production_value_row_shell_review_boundary';

export type JuoSourceBackedProductionValueRowShellBoundaryStatus = 'row_shell_boundary_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow {
  readonly sourceBackedProductionValueRowShellBoundaryId: string;
  readonly sourceBackedProductionValueRowShellEligibility: 'no';
  readonly sourceBackedProductionValueRowShellBoundaryStatus: JuoSourceBackedProductionValueRowShellBoundaryStatus;
}

export interface JuoRewardSourceBackedProductionValueRowShellBoundaryRow
  extends JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow {
  readonly sourceBackedProductionValueRowShellBoundaryId: string;
  readonly sourceBackedProductionValueRowShellEligibility: 'no';
  readonly sourceBackedProductionValueRowShellBoundaryStatus: JuoSourceBackedProductionValueRowShellBoundaryStatus;
}

function probabilityRowFor(
  review: JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow
): JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow {
  return {
    ...review,
    sourceBackedProductionValueRowShellBoundaryId: `${review.sourceId}_probability_source_backed_production_value_row_shell_boundary`,
    sourceBackedProductionValueRowShellEligibility: 'no',
    sourceBackedProductionValueRowShellBoundaryStatus: 'row_shell_boundary_blocked',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  review: JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow
): JuoRewardSourceBackedProductionValueRowShellBoundaryRow {
  return {
    ...review,
    sourceBackedProductionValueRowShellBoundaryId: `${review.sourceId}_reward_source_backed_production_value_row_shell_boundary`,
    sourceBackedProductionValueRowShellEligibility: 'no',
    sourceBackedProductionValueRowShellBoundaryStatus: 'row_shell_boundary_blocked',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowShellBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowShellBoundaryRow[] =
  juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory.map(rewardRowFor);
