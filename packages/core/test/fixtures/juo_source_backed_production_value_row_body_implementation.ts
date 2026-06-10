import {
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory,
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryRow,
  type JuoRewardSourceBackedProductionValueRowBodyCreationBoundaryRow
} from './juo_source_backed_production_value_row_body_creation_boundary';

export type JuoSourceBackedProductionValueRowBodyImplementationStatus =
  'row_body_implementation_blocked';

export interface JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow
  extends JuoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryRow {
  readonly sourceBackedProductionValueRowBodyImplementationId: string;
  readonly sourceBackedProductionValueRowBodyImplementationEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyImplementationStatus: JuoSourceBackedProductionValueRowBodyImplementationStatus;
  readonly sourceBackedProductionValueRowBodyValueCreationEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueRowBodyImplementationRow
  extends JuoRewardSourceBackedProductionValueRowBodyCreationBoundaryRow {
  readonly sourceBackedProductionValueRowBodyImplementationId: string;
  readonly sourceBackedProductionValueRowBodyImplementationEligibility: 'no';
  readonly sourceBackedProductionValueRowBodyImplementationStatus: JuoSourceBackedProductionValueRowBodyImplementationStatus;
  readonly sourceBackedProductionValueRowBodyValueCreationEligibility: 'no';
}

function probabilityRowFor(
  creationBoundary: JuoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryRow
): JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow {
  return {
    ...creationBoundary,
    sourceBackedProductionValueRowBodyImplementationId: `${creationBoundary.sourceId}_probability_source_backed_production_value_row_body_implementation`,
    sourceBackedProductionValueRowBodyImplementationEligibility: 'no',
    sourceBackedProductionValueRowBodyImplementationStatus: 'row_body_implementation_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  creationBoundary: JuoRewardSourceBackedProductionValueRowBodyCreationBoundaryRow
): JuoRewardSourceBackedProductionValueRowBodyImplementationRow {
  return {
    ...creationBoundary,
    sourceBackedProductionValueRowBodyImplementationId: `${creationBoundary.sourceId}_reward_source_backed_production_value_row_body_implementation`,
    sourceBackedProductionValueRowBodyImplementationEligibility: 'no',
    sourceBackedProductionValueRowBodyImplementationStatus: 'row_body_implementation_blocked',
    sourceBackedProductionValueRowBodyValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueRowBodyImplementationInventory: readonly JuoProbabilitySourceBackedProductionValueRowBodyImplementationRow[] =
  juoProbabilitySourceBackedProductionValueRowBodyCreationBoundaryInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueRowBodyImplementationInventory: readonly JuoRewardSourceBackedProductionValueRowBodyImplementationRow[] =
  juoRewardSourceBackedProductionValueRowBodyCreationBoundaryInventory.map(rewardRowFor);
