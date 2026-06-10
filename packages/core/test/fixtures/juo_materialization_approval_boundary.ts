import {
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory,
  type JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow,
  type JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow
} from './juo_guarded_source_backed_production_value_materialization_candidate_review_boundary';

export type JuoMaterializationApprovalBoundaryStatus = 'approval_blocked';

export interface JuoProbabilityMaterializationApprovalBoundaryRow
  extends JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  readonly materializationApprovalBoundaryId: string;
  readonly approvalEligibility: 'no';
  readonly materializationApprovalBoundaryStatus: JuoMaterializationApprovalBoundaryStatus;
}

export interface JuoRewardMaterializationApprovalBoundaryRow
  extends JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  readonly materializationApprovalBoundaryId: string;
  readonly approvalEligibility: 'no';
  readonly materializationApprovalBoundaryStatus: JuoMaterializationApprovalBoundaryStatus;
}

function probabilityRowFor(
  review: JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow
): JuoProbabilityMaterializationApprovalBoundaryRow {
  return {
    ...review,
    materializationApprovalBoundaryId: `${review.sourceId}_probability_materialization_approval_boundary`,
    approvalEligibility: 'no',
    materializationApprovalBoundaryStatus: 'approval_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  review: JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow
): JuoRewardMaterializationApprovalBoundaryRow {
  return {
    ...review,
    materializationApprovalBoundaryId: `${review.sourceId}_reward_materialization_approval_boundary`,
    approvalEligibility: 'no',
    materializationApprovalBoundaryStatus: 'approval_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilityMaterializationApprovalBoundaryInventory: readonly JuoProbabilityMaterializationApprovalBoundaryRow[] =
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map(probabilityRowFor);

export const juoRewardMaterializationApprovalBoundaryInventory: readonly JuoRewardMaterializationApprovalBoundaryRow[] =
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory.map(rewardRowFor);
