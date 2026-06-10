import {
  juoProbabilityMaterializationApprovalBoundaryInventory,
  juoRewardMaterializationApprovalBoundaryInventory,
  type JuoProbabilityMaterializationApprovalBoundaryRow,
  type JuoRewardMaterializationApprovalBoundaryRow
} from './juo_materialization_approval_boundary';

export type JuoMaterializationDecisionBoundaryStatus = 'decision_blocked';

export interface JuoProbabilityMaterializationDecisionBoundaryRow
  extends JuoProbabilityMaterializationApprovalBoundaryRow {
  readonly materializationDecisionBoundaryId: string;
  readonly materializationDecisionEligibility: 'no';
  readonly materializationDecisionBoundaryStatus: JuoMaterializationDecisionBoundaryStatus;
}

export interface JuoRewardMaterializationDecisionBoundaryRow extends JuoRewardMaterializationApprovalBoundaryRow {
  readonly materializationDecisionBoundaryId: string;
  readonly materializationDecisionEligibility: 'no';
  readonly materializationDecisionBoundaryStatus: JuoMaterializationDecisionBoundaryStatus;
}

function probabilityRowFor(
  approval: JuoProbabilityMaterializationApprovalBoundaryRow
): JuoProbabilityMaterializationDecisionBoundaryRow {
  return {
    ...approval,
    materializationDecisionBoundaryId: `${approval.sourceId}_probability_materialization_decision_boundary`,
    materializationDecisionEligibility: 'no',
    materializationDecisionBoundaryStatus: 'decision_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(approval: JuoRewardMaterializationApprovalBoundaryRow): JuoRewardMaterializationDecisionBoundaryRow {
  return {
    ...approval,
    materializationDecisionBoundaryId: `${approval.sourceId}_reward_materialization_decision_boundary`,
    materializationDecisionEligibility: 'no',
    materializationDecisionBoundaryStatus: 'decision_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilityMaterializationDecisionBoundaryInventory: readonly JuoProbabilityMaterializationDecisionBoundaryRow[] =
  juoProbabilityMaterializationApprovalBoundaryInventory.map(probabilityRowFor);

export const juoRewardMaterializationDecisionBoundaryInventory: readonly JuoRewardMaterializationDecisionBoundaryRow[] =
  juoRewardMaterializationApprovalBoundaryInventory.map(rewardRowFor);
