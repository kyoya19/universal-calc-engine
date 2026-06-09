import {
  juoProbabilityProductionValuePlaceholderInventory,
  juoRewardProductionValuePlaceholderInventory,
  type JuoProbabilityProductionValuePlaceholderRow,
  type JuoRewardProductionValuePlaceholderRow
} from './juo_production_value_placeholder';

export type JuoProductionValueReadinessReviewStatus = 'pending_review' | 'not_applicable' | 'excluded';
export type JuoProductionValueSourceBackedReadinessStatus = 'not_ready' | 'not_applicable' | 'excluded';
export type JuoProductionValueReadinessPromotionDecisionStatus = 'not_promoted';

export interface JuoProbabilityProductionValueReadinessReviewRow {
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
  readonly sourceBackedValueReadinessStatus: JuoProductionValueSourceBackedReadinessStatus;
  readonly citationConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly unitConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly normalizationConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly conflictReviewStatus: JuoProductionValueReadinessReviewStatus;
  readonly promotionDecisionStatus: JuoProductionValueReadinessPromotionDecisionStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardProductionValueReadinessReviewRow {
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
  readonly sourceBackedValueReadinessStatus: JuoProductionValueSourceBackedReadinessStatus;
  readonly citationConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly unitConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly accountingConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly normalizationConsistencyStatus: JuoProductionValueReadinessReviewStatus;
  readonly conflictReviewStatus: JuoProductionValueReadinessReviewStatus;
  readonly promotionDecisionStatus: JuoProductionValueReadinessPromotionDecisionStatus;
  readonly executionEligibility: 'no';
}

function reviewStatusFromPlaceholder(placeholder: {
  readonly valueReadinessStatus: string;
}): JuoProductionValueReadinessReviewStatus {
  if (placeholder.valueReadinessStatus === 'excluded') return 'excluded';
  if (placeholder.valueReadinessStatus === 'not_applicable') return 'not_applicable';
  return 'pending_review';
}

function sourceBackedReadinessFromPlaceholder(placeholder: {
  readonly valueReadinessStatus: string;
}): JuoProductionValueSourceBackedReadinessStatus {
  if (placeholder.valueReadinessStatus === 'excluded') return 'excluded';
  if (placeholder.valueReadinessStatus === 'not_applicable') return 'not_applicable';
  return 'not_ready';
}

function probabilityRowFor(
  placeholder: JuoProbabilityProductionValuePlaceholderRow
): JuoProbabilityProductionValueReadinessReviewRow {
  const reviewStatus = reviewStatusFromPlaceholder(placeholder);

  return {
    readinessReviewId: `${placeholder.sourceId}_probability_production_value_readiness_review`,
    productionValuePlaceholderId: placeholder.productionValuePlaceholderId,
    draftMetadataId: placeholder.draftMetadataId,
    promotionGateId: placeholder.promotionGateId,
    extractedValueMetadataId: placeholder.extractedValueMetadataId,
    unitMetadataId: placeholder.unitMetadataId,
    citationId: placeholder.citationId,
    sourceId: placeholder.sourceId,
    sourceType: placeholder.sourceType,
    valueDomain: 'probability',
    placeholderStatus: placeholder.placeholderStatus,
    sourceBackedValueReadinessStatus: sourceBackedReadinessFromPlaceholder(placeholder),
    citationConsistencyStatus: reviewStatus,
    unitConsistencyStatus: reviewStatus,
    normalizationConsistencyStatus: reviewStatus,
    conflictReviewStatus: reviewStatus,
    promotionDecisionStatus: 'not_promoted',
    executionEligibility: 'no'
  };
}

function rewardRowFor(placeholder: JuoRewardProductionValuePlaceholderRow): JuoRewardProductionValueReadinessReviewRow {
  const reviewStatus = reviewStatusFromPlaceholder(placeholder);

  return {
    readinessReviewId: `${placeholder.sourceId}_reward_production_value_readiness_review`,
    productionValuePlaceholderId: placeholder.productionValuePlaceholderId,
    draftMetadataId: placeholder.draftMetadataId,
    promotionGateId: placeholder.promotionGateId,
    extractedValueMetadataId: placeholder.extractedValueMetadataId,
    unitMetadataId: placeholder.unitMetadataId,
    citationId: placeholder.citationId,
    sourceId: placeholder.sourceId,
    sourceType: placeholder.sourceType,
    valueDomain: 'reward',
    placeholderStatus: placeholder.placeholderStatus,
    sourceBackedValueReadinessStatus: sourceBackedReadinessFromPlaceholder(placeholder),
    citationConsistencyStatus: reviewStatus,
    unitConsistencyStatus: reviewStatus,
    accountingConsistencyStatus: reviewStatus,
    normalizationConsistencyStatus: reviewStatus,
    conflictReviewStatus: reviewStatus,
    promotionDecisionStatus: 'not_promoted',
    executionEligibility: 'no'
  };
}

export const juoProbabilityProductionValueReadinessReviewInventory: readonly JuoProbabilityProductionValueReadinessReviewRow[] =
  juoProbabilityProductionValuePlaceholderInventory.map(probabilityRowFor);

export const juoRewardProductionValueReadinessReviewInventory: readonly JuoRewardProductionValueReadinessReviewRow[] =
  juoRewardProductionValuePlaceholderInventory.map(rewardRowFor);
