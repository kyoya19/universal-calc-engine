import {
  juoProbabilityMaterializationDecisionBoundaryInventory,
  juoRewardMaterializationDecisionBoundaryInventory,
  type JuoProbabilityMaterializationDecisionBoundaryRow,
  type JuoRewardMaterializationDecisionBoundaryRow
} from './juo_materialization_decision_boundary';

export type JuoSourceBackedProductionValueCreationGateStatus = 'creation_blocked';

export interface JuoProbabilitySourceBackedProductionValueCreationGateRow
  extends JuoProbabilityMaterializationDecisionBoundaryRow {
  readonly sourceBackedProductionValueCreationGateId: string;
  readonly sourceBackedProductionValueRowCreationEligibility: 'no';
  readonly sourceBackedProductionValueCreationGateStatus: JuoSourceBackedProductionValueCreationGateStatus;
}

export interface JuoRewardSourceBackedProductionValueCreationGateRow
  extends JuoRewardMaterializationDecisionBoundaryRow {
  readonly sourceBackedProductionValueCreationGateId: string;
  readonly sourceBackedProductionValueRowCreationEligibility: 'no';
  readonly sourceBackedProductionValueCreationGateStatus: JuoSourceBackedProductionValueCreationGateStatus;
}

function probabilityRowFor(
  decision: JuoProbabilityMaterializationDecisionBoundaryRow
): JuoProbabilitySourceBackedProductionValueCreationGateRow {
  return {
    ...decision,
    sourceBackedProductionValueCreationGateId: `${decision.sourceId}_probability_source_backed_production_value_creation_gate`,
    sourceBackedProductionValueRowCreationEligibility: 'no',
    sourceBackedProductionValueCreationGateStatus: 'creation_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  decision: JuoRewardMaterializationDecisionBoundaryRow
): JuoRewardSourceBackedProductionValueCreationGateRow {
  return {
    ...decision,
    sourceBackedProductionValueCreationGateId: `${decision.sourceId}_reward_source_backed_production_value_creation_gate`,
    sourceBackedProductionValueRowCreationEligibility: 'no',
    sourceBackedProductionValueCreationGateStatus: 'creation_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueCreationGateInventory: readonly JuoProbabilitySourceBackedProductionValueCreationGateRow[] =
  juoProbabilityMaterializationDecisionBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueCreationGateInventory: readonly JuoRewardSourceBackedProductionValueCreationGateRow[] =
  juoRewardMaterializationDecisionBoundaryInventory.map(rewardRowFor);
