import {
  juoProbabilitySourceBackedProductionValueDraftInventory,
  juoRewardSourceBackedProductionValueDraftInventory,
  type JuoProbabilitySourceBackedProductionValueDraftRow,
  type JuoRewardSourceBackedProductionValueDraftRow
} from './juo_source_backed_production_value_draft';

export type JuoSourceBackedProductionValuePromotionStatus = 'promotion_blocked';

export interface JuoProbabilitySourceBackedProductionValuePromotionRow {
  readonly sourceBackedProductionValuePromotionId: string;
  readonly sourceBackedProductionValueDraftId: string;
  readonly preflightId: string;
  readonly readinessReviewId: string;
  readonly productionValuePlaceholderId: string;
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'probability';
  readonly placeholderStatus: 'placeholder';
  readonly preflightStatus: 'blocked';
  readonly sourceBackedValueReadinessStatus: 'not_ready' | 'not_applicable' | 'excluded';
  readonly citationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly unitConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly normalizationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly conflictReviewStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly promotionDecisionStatus: 'not_promoted';
  readonly sourceBackedValueCreationEligibility: 'no';
  readonly draftStatus: 'draft_blocked';
  readonly sourceBackedProductionValuePromotionStatus: JuoSourceBackedProductionValuePromotionStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValuePromotionRow {
  readonly sourceBackedProductionValuePromotionId: string;
  readonly sourceBackedProductionValueDraftId: string;
  readonly preflightId: string;
  readonly readinessReviewId: string;
  readonly productionValuePlaceholderId: string;
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'reward';
  readonly placeholderStatus: 'placeholder';
  readonly preflightStatus: 'blocked';
  readonly sourceBackedValueReadinessStatus: 'not_ready' | 'not_applicable' | 'excluded';
  readonly citationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly unitConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly accountingConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly normalizationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly conflictReviewStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly promotionDecisionStatus: 'not_promoted';
  readonly sourceBackedValueCreationEligibility: 'no';
  readonly draftStatus: 'draft_blocked';
  readonly sourceBackedProductionValuePromotionStatus: JuoSourceBackedProductionValuePromotionStatus;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  draft: JuoProbabilitySourceBackedProductionValueDraftRow
): JuoProbabilitySourceBackedProductionValuePromotionRow {
  return {
    sourceBackedProductionValuePromotionId: `${draft.sourceId}_probability_source_backed_production_value_promotion`,
    sourceBackedProductionValueDraftId: draft.sourceBackedProductionValueDraftId,
    preflightId: draft.preflightId,
    readinessReviewId: draft.readinessReviewId,
    productionValuePlaceholderId: draft.productionValuePlaceholderId,
    draftMetadataId: draft.draftMetadataId,
    promotionGateId: draft.promotionGateId,
    extractedValueMetadataId: draft.extractedValueMetadataId,
    unitMetadataId: draft.unitMetadataId,
    citationId: draft.citationId,
    sourceId: draft.sourceId,
    sourceType: draft.sourceType,
    valueDomain: 'probability',
    placeholderStatus: draft.placeholderStatus,
    preflightStatus: draft.preflightStatus,
    sourceBackedValueReadinessStatus: draft.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: draft.citationConsistencyStatus,
    unitConsistencyStatus: draft.unitConsistencyStatus,
    normalizationConsistencyStatus: draft.normalizationConsistencyStatus,
    conflictReviewStatus: draft.conflictReviewStatus,
    promotionDecisionStatus: draft.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: draft.sourceBackedValueCreationEligibility,
    draftStatus: draft.draftStatus,
    sourceBackedProductionValuePromotionStatus: 'promotion_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  draft: JuoRewardSourceBackedProductionValueDraftRow
): JuoRewardSourceBackedProductionValuePromotionRow {
  return {
    sourceBackedProductionValuePromotionId: `${draft.sourceId}_reward_source_backed_production_value_promotion`,
    sourceBackedProductionValueDraftId: draft.sourceBackedProductionValueDraftId,
    preflightId: draft.preflightId,
    readinessReviewId: draft.readinessReviewId,
    productionValuePlaceholderId: draft.productionValuePlaceholderId,
    draftMetadataId: draft.draftMetadataId,
    promotionGateId: draft.promotionGateId,
    extractedValueMetadataId: draft.extractedValueMetadataId,
    unitMetadataId: draft.unitMetadataId,
    citationId: draft.citationId,
    sourceId: draft.sourceId,
    sourceType: draft.sourceType,
    valueDomain: 'reward',
    placeholderStatus: draft.placeholderStatus,
    preflightStatus: draft.preflightStatus,
    sourceBackedValueReadinessStatus: draft.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: draft.citationConsistencyStatus,
    unitConsistencyStatus: draft.unitConsistencyStatus,
    accountingConsistencyStatus: draft.accountingConsistencyStatus,
    normalizationConsistencyStatus: draft.normalizationConsistencyStatus,
    conflictReviewStatus: draft.conflictReviewStatus,
    promotionDecisionStatus: draft.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: draft.sourceBackedValueCreationEligibility,
    draftStatus: draft.draftStatus,
    sourceBackedProductionValuePromotionStatus: 'promotion_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValuePromotionInventory: readonly JuoProbabilitySourceBackedProductionValuePromotionRow[] =
  juoProbabilitySourceBackedProductionValueDraftInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValuePromotionInventory: readonly JuoRewardSourceBackedProductionValuePromotionRow[] =
  juoRewardSourceBackedProductionValueDraftInventory.map(rewardRowFor);
