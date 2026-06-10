import {
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory,
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory,
  type JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow,
  type JuoRewardSourceBackedProductionValueRowBodyImplementationRow
} from './juo_source_backed_production_value_row_body_implementation';

export type JuoSourceBackedProductionValueRowBodyValueCreationBoundaryStatus =
  'row_body_value_creation_boundary_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow
  extends JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow {
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryStatus: JuoSourceBackedProductionValueRowBodyValueCreationBoundaryStatus;
}

export interface JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow
  extends JuoRewardSourceBackedProductionValueRowBodyImplementationRow {
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryId: string;
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueCreationBoundaryStatus: JuoSourceBackedProductionValueRowBodyValueCreationBoundaryStatus;
}

function probabilityRowFor(
  implementation: JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow
): JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow {
  return {
    ...implementation,
    sourceBackedProductionValueRowBodyValueCreationBoundaryId: `${implementation.sourceId}_probability_source_backed_production_value_row_body_value_creation_boundary`,
    sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationBoundaryStatus:
      'row_body_value_creation_boundary_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  implementation: JuoRewardSourceBackedProductionValueRowBodyImplementationRow
): JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow {
  return {
    ...implementation,
    sourceBackedProductionValueRowBodyValueCreationBoundaryId: `${implementation.sourceId}_reward_source_backed_production_value_row_body_value_creation_boundary`,
    sourceBackedProductionValueRowBodyValueCreationBoundaryEligibility: 'no',
    sourceBackedProductionValueRowBodyValueCreationBoundaryStatus:
      'row_body_value_creation_boundary_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory: readonly JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow[] =
  juoRewardSourceBackedProductionValueRowBodyImplementationInventory.map(rewardRowFor);
