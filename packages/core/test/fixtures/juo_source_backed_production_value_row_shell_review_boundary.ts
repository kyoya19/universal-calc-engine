import {
  juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory,
  juoRewardSourceBackedProductionValueRowDraftBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow,
  type JuoRewardSourceBackedProductionValueRowDraftBoundaryRow
} from './juo_source_backed_production_value_row_draft_boundary';

export type JuoSourceBackedProductionValueRowShellReviewBoundaryStatus = 'row_shell_review_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow {
  readonly sourceBackedProductionValueRowShellReviewBoundaryId: string;
  readonly sourceBackedProductionValueRowShellReviewEligibility: 'no';
  readonly sourceBackedProductionValueRowShellReviewBoundaryStatus: JuoSourceBackedProductionValueRowShellReviewBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyCreationEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow
  extends JuoRewardSourceBackedProductionValueRowDraftBoundaryRow {
  readonly sourceBackedProductionValueRowShellReviewBoundaryId: string;
  readonly sourceBackedProductionValueRowShellReviewEligibility: 'no';
  readonly sourceBackedProductionValueRowShellReviewBoundaryStatus: JuoSourceBackedProductionValueRowShellReviewBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyCreationEligibility: 'no';
}

function probabilityRowFor(
  draft: JuoProbabilitySourceBackedProductionValueRowDraftBoundaryRow
): JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow {
  return {
    ...draft,
    sourceBackedProductionValueRowShellReviewBoundaryId: `${draft.sourceId}_probability_source_backed_production_value_row_shell_review_boundary`,
    sourceBackedProductionValueRowShellReviewEligibility: 'no',
    sourceBackedProductionValueRowShellReviewBoundaryStatus: 'row_shell_review_blocked',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  draft: JuoRewardSourceBackedProductionValueRowDraftBoundaryRow
): JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow {
  return {
    ...draft,
    sourceBackedProductionValueRowShellReviewBoundaryId: `${draft.sourceId}_reward_source_backed_production_value_row_shell_review_boundary`,
    sourceBackedProductionValueRowShellReviewEligibility: 'no',
    sourceBackedProductionValueRowShellReviewBoundaryStatus: 'row_shell_review_blocked',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowShellReviewBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowShellReviewBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueRowDraftBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowShellReviewBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowShellReviewBoundaryRow[] =
  juoRewardSourceBackedProductionValueRowDraftBoundaryInventory.map(rewardRowFor);
