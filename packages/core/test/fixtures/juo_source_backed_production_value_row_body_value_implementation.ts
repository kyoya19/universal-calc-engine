import {
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow,
  type JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow
} from './juo_source_backed_production_value_row_body_value_creation_boundary';

export type JuoSourceBackedProductionValueRowBodyValueImplementationStatus =
  'row_body_value_implementation_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowBodyValueImplementationRow
  extends JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow {
  readonly sourceBackedProductionValueRowBodyValueImplementationId: string;
  readonly sourceBackedProductionValueRowBodyValueImplementationEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueImplementationStatus: JuoSourceBackedProductionValueRowBodyValueImplementationStatus;
}

export interface JuoRewardSourceBackedProductionValueRowBodyValueImplementationRow
  extends JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow {
  readonly sourceBackedProductionValueRowBodyValueImplementationId: string;
  readonly sourceBackedProductionValueRowBodyValueImplementationEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyValueImplementationStatus: JuoSourceBackedProductionValueRowBodyValueImplementationStatus;
}

function probabilityRowFor(
  boundary: JuoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryRow
): JuoProbabilitySourceBackedProductionValueRowBodyValueImplementationRow {
  return {
    ...boundary,
    sourceBackedProductionValueRowBodyValueImplementationId: `${boundary.sourceId}_probability_source_backed_production_value_row_body_value_implementation`,
    sourceBackedProductionValueRowBodyValueImplementationEligibility: 'no',
    sourceBackedProductionValueRowBodyValueImplementationStatus:
      'row_body_value_implementation_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  boundary: JuoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryRow
): JuoRewardSourceBackedProductionValueRowBodyValueImplementationRow {
  return {
    ...boundary,
    sourceBackedProductionValueRowBodyValueImplementationId: `${boundary.sourceId}_reward_source_backed_production_value_row_body_value_implementation`,
    sourceBackedProductionValueRowBodyValueImplementationEligibility: 'no',
    sourceBackedProductionValueRowBodyValueImplementationStatus:
      'row_body_value_implementation_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowBodyValueImplementationInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyValueImplementationRow[] =
  juoProbabilitySourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowBodyValueImplementationInventory: readonly JuoRewardSourceBackedProductionValueRowBodyValueImplementationRow[] =
  juoRewardSourceBackedProductionValueRowBodyValueCreationBoundaryInventory.map(rewardRowFor);
