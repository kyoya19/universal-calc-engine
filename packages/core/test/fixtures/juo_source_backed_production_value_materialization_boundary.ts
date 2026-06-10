import {
  juoProbabilitySourceBackedProductionValuePromotionInventory,
  juoRewardSourceBackedProductionValuePromotionInventory,
  type JuoProbabilitySourceBackedProductionValuePromotionRow,
  type JuoRewardSourceBackedProductionValuePromotionRow
} from './juo_source_backed_production_value_promotion';

export type JuoSourceBackedProductionValueMaterializationBoundaryStatus = 'materialization_blocked';

export interface JuoProbabilitySourceBackedProductionValueMaterializationBoundaryRow {
  readonly sourceBackedProductionValueMaterializationBoundaryId: string;
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
  readonly sourceBackedProductionValuePromotionStatus: 'promotion_blocked';
  readonly materializationEligibility: 'no';
  readonly sourceBackedProductionValueMaterializationBoundaryStatus: JuoSourceBackedProductionValueMaterializationBoundaryStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueMaterializationBoundaryRow {
  readonly sourceBackedProductionValueMaterializationBoundaryId: string;
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
  readonly sourceBackedProductionValuePromotionStatus: 'promotion_blocked';
  readonly materializationEligibility: 'no';
  readonly sourceBackedProductionValueMaterializationBoundaryStatus: JuoSourceBackedProductionValueMaterializationBoundaryStatus;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  promotion: JuoProbabilitySourceBackedProductionValuePromotionRow
): JuoProbabilitySourceBackedProductionValueMaterializationBoundaryRow {
  return {
    sourceBackedProductionValueMaterializationBoundaryId: `${promotion.sourceId}_probability_source_backed_production_value_materialization_boundary`,
    sourceBackedProductionValuePromotionId: promotion.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: promotion.sourceBackedProductionValueDraftId,
    preflightId: promotion.preflightId,
    readinessReviewId: promotion.readinessReviewId,
    productionValuePlaceholderId: promotion.productionValuePlaceholderId,
    draftMetadataId: promotion.draftMetadataId,
    promotionGateId: promotion.promotionGateId,
    extractedValueMetadataId: promotion.extractedValueMetadataId,
    unitMetadataId: promotion.unitMetadataId,
    citationId: promotion.citationId,
    sourceId: promotion.sourceId,
    sourceType: promotion.sourceType,
    valueDomain: 'probability',
    placeholderStatus: promotion.placeholderStatus,
    preflightStatus: promotion.preflightStatus,
    sourceBackedValueReadinessStatus: promotion.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: promotion.citationConsistencyStatus,
    unitConsistencyStatus: promotion.unitConsistencyStatus,
    normalizationConsistencyStatus: promotion.normalizationConsistencyStatus,
    conflictReviewStatus: promotion.conflictReviewStatus,
    promotionDecisionStatus: promotion.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: promotion.sourceBackedValueCreationEligibility,
    draftStatus: promotion.draftStatus,
    sourceBackedProductionValuePromotionStatus: promotion.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: 'no',
    sourceBackedProductionValueMaterializationBoundaryStatus: 'materialization_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  promotion: JuoRewardSourceBackedProductionValuePromotionRow
): JuoRewardSourceBackedProductionValueMaterializationBoundaryRow {
  return {
    sourceBackedProductionValueMaterializationBoundaryId: `${promotion.sourceId}_reward_source_backed_production_value_materialization_boundary`,
    sourceBackedProductionValuePromotionId: promotion.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: promotion.sourceBackedProductionValueDraftId,
    preflightId: promotion.preflightId,
    readinessReviewId: promotion.readinessReviewId,
    productionValuePlaceholderId: promotion.productionValuePlaceholderId,
    draftMetadataId: promotion.draftMetadataId,
    promotionGateId: promotion.promotionGateId,
    extractedValueMetadataId: promotion.extractedValueMetadataId,
    unitMetadataId: promotion.unitMetadataId,
    citationId: promotion.citationId,
    sourceId: promotion.sourceId,
    sourceType: promotion.sourceType,
    valueDomain: 'reward',
    placeholderStatus: promotion.placeholderStatus,
    preflightStatus: promotion.preflightStatus,
    sourceBackedValueReadinessStatus: promotion.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: promotion.citationConsistencyStatus,
    unitConsistencyStatus: promotion.unitConsistencyStatus,
    accountingConsistencyStatus: promotion.accountingConsistencyStatus,
    normalizationConsistencyStatus: promotion.normalizationConsistencyStatus,
    conflictReviewStatus: promotion.conflictReviewStatus,
    promotionDecisionStatus: promotion.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: promotion.sourceBackedValueCreationEligibility,
    draftStatus: promotion.draftStatus,
    sourceBackedProductionValuePromotionStatus: promotion.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: 'no',
    sourceBackedProductionValueMaterializationBoundaryStatus: 'materialization_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory: readonly JuoProbabilitySourceBackedProductionValueMaterializationBoundaryRow[] =
  juoProbabilitySourceBackedProductionValuePromotionInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueMaterializationBoundaryInventory: readonly JuoRewardSourceBackedProductionValueMaterializationBoundaryRow[] =
  juoRewardSourceBackedProductionValuePromotionInventory.map(rewardRowFor);
