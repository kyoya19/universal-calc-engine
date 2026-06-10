import {
  juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory,
  juoRewardSourceBackedProductionValueRowShellBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow,
  type JuoRewardSourceBackedProductionValueRowShellBoundaryRow
} from './juo_source_backed_production_value_row_shell_boundary';

export type JuoSourceBackedProductionValueRowBodyReadinessBoundaryStatus =
  'row_body_readiness_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow {
  readonly sourceBackedProductionValueRowBodyReadinessBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyReadinessEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyReadinessBoundaryStatus: JuoSourceBackedProductionValueRowBodyReadinessBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyPlaceholderEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueRowBodyReadinessBoundaryRow
  extends JuoRewardSourceBackedProductionValueRowShellBoundaryRow {
  readonly sourceBackedProductionValueRowBodyReadinessBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyReadinessEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyReadinessBoundaryStatus: JuoSourceBackedProductionValueRowBodyReadinessBoundaryStatus;
  readonly sourceBackedProductionValueRowBodyPlaceholderEligibility: 'no';
}

function probabilityRowFor(
  shell: JuoProbabilitySourceBackedProductionValueRowShellBoundaryRow
): JuoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryRow {
  return {
    ...shell,
    sourceBackedProductionValueRowBodyReadinessBoundaryId: `${shell.sourceId}_probability_source_backed_production_value_row_body_readiness_boundary`,
    sourceBackedProductionValueRowBodyReadinessEligibility: 'no',
    sourceBackedProductionValueRowBodyReadinessBoundaryStatus: 'row_body_readiness_blocked',
    sourceBackedProductionValueRowBodyPlaceholderEligibility: 'no',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  shell: JuoRewardSourceBackedProductionValueRowShellBoundaryRow
): JuoRewardSourceBackedProductionValueRowBodyReadinessBoundaryRow {
  return {
    ...shell,
    sourceBackedProductionValueRowBodyReadinessBoundaryId: `${shell.sourceId}_reward_source_backed_production_value_row_body_readiness_boundary`,
    sourceBackedProductionValueRowBodyReadinessEligibility: 'no',
    sourceBackedProductionValueRowBodyReadinessBoundaryStatus: 'row_body_readiness_blocked',
    sourceBackedProductionValueRowBodyPlaceholderEligibility: 'no',
    sourceBackedProductionValueRowBodyCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyReadinessBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueRowShellBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowBodyReadinessBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowBodyReadinessBoundaryRow[] =
  juoRewardSourceBackedProductionValueRowShellBoundaryInventory.map(rewardRowFor);
