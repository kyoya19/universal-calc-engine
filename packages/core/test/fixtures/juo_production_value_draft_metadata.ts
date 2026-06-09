import {
  juoProbabilityProductionValuePromotionGateInventory,
  juoRewardProductionValuePromotionGateInventory,
  type JuoProbabilityProductionValuePromotionGateRow,
  type JuoRewardProductionValuePromotionGateRow
} from './juo_production_value_promotion_gate';

export type JuoProductionValueDraftShapeStatus = 'not_started' | 'not_applicable' | 'excluded';

export interface JuoProbabilityProductionValueDraftMetadataRow {
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'probability';
  readonly valueShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly fractionShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly decimalShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly normalizationShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly promotionEligibility: 'no';
  readonly executionEligibility: 'no';
}

export interface JuoRewardProductionValueDraftMetadataRow {
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'reward';
  readonly valueShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly amountShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly rewardUnitShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly accountingShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly normalizationShapeStatus: JuoProductionValueDraftShapeStatus;
  readonly promotionEligibility: 'no';
  readonly executionEligibility: 'no';
}

function shapeStatusFromPromotionGate(gate: { readonly promotionEligibility: 'no' }): JuoProductionValueDraftShapeStatus {
  return gate.promotionEligibility === 'no' ? 'not_started' : 'not_started';
}

function probabilityRowFor(
  gate: JuoProbabilityProductionValuePromotionGateRow
): JuoProbabilityProductionValueDraftMetadataRow {
  const shapeStatus = shapeStatusFromPromotionGate(gate);

  return {
    draftMetadataId: `${gate.sourceId}_probability_production_value_draft_metadata`,
    promotionGateId: gate.promotionGateId,
    extractedValueMetadataId: gate.extractedValueMetadataId,
    unitMetadataId: gate.unitMetadataId,
    citationId: gate.citationId,
    sourceId: gate.sourceId,
    sourceType: gate.sourceType,
    valueDomain: 'probability',
    valueShapeStatus: shapeStatus,
    fractionShapeStatus: shapeStatus,
    decimalShapeStatus: shapeStatus,
    normalizationShapeStatus: shapeStatus,
    promotionEligibility: gate.promotionEligibility,
    executionEligibility: 'no'
  };
}

function rewardRowFor(gate: JuoRewardProductionValuePromotionGateRow): JuoRewardProductionValueDraftMetadataRow {
  const shapeStatus = shapeStatusFromPromotionGate(gate);

  return {
    draftMetadataId: `${gate.sourceId}_reward_production_value_draft_metadata`,
    promotionGateId: gate.promotionGateId,
    extractedValueMetadataId: gate.extractedValueMetadataId,
    unitMetadataId: gate.unitMetadataId,
    citationId: gate.citationId,
    sourceId: gate.sourceId,
    sourceType: gate.sourceType,
    valueDomain: 'reward',
    valueShapeStatus: shapeStatus,
    amountShapeStatus: shapeStatus,
    rewardUnitShapeStatus: shapeStatus,
    accountingShapeStatus: shapeStatus,
    normalizationShapeStatus: shapeStatus,
    promotionEligibility: gate.promotionEligibility,
    executionEligibility: 'no'
  };
}

export const juoProbabilityProductionValueDraftMetadataInventory: readonly JuoProbabilityProductionValueDraftMetadataRow[] =
  juoProbabilityProductionValuePromotionGateInventory.map(probabilityRowFor);

export const juoRewardProductionValueDraftMetadataInventory: readonly JuoRewardProductionValueDraftMetadataRow[] =
  juoRewardProductionValuePromotionGateInventory.map(rewardRowFor);
