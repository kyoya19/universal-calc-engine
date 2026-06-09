import {
  juoProbabilityProductionValueReadinessReviewInventory,
  juoRewardProductionValueReadinessReviewInventory,
  type JuoProbabilityProductionValueReadinessReviewRow,
  type JuoRewardProductionValueReadinessReviewRow
} from './juo_production_value_readiness_review';

export type JuoSourceBackedProductionValuePreflightStatus = 'blocked';
export type JuoSourceBackedProductionValueCreationEligibility = 'no';

export interface JuoProbabilitySourceBackedProductionValuePreflightRow {
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
  readonly preflightStatus: JuoSourceBackedProductionValuePreflightStatus;
  readonly sourceBackedValueReadinessStatus: 'not_ready' | 'not_applicable' | 'excluded';
  readonly citationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly unitConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly normalizationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly conflictReviewStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly promotionDecisionStatus: 'not_promoted';
  readonly sourceBackedValueCreationEligibility: JuoSourceBackedProductionValueCreationEligibility;
  readonly executionEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValuePreflightRow {
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
  readonly preflightStatus: JuoSourceBackedProductionValuePreflightStatus;
  readonly sourceBackedValueReadinessStatus: 'not_ready' | 'not_applicable' | 'excluded';
  readonly citationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly unitConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly accountingConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly normalizationConsistencyStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly conflictReviewStatus: 'pending_review' | 'not_applicable' | 'excluded';
  readonly promotionDecisionStatus: 'not_promoted';
  readonly sourceBackedValueCreationEligibility: JuoSourceBackedProductionValueCreationEligibility;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  review: JuoProbabilityProductionValueReadinessReviewRow
): JuoProbabilitySourceBackedProductionValuePreflightRow {
  return {
    preflightId: `${review.sourceId}_probability_source_backed_production_value_preflight`,
    readinessReviewId: review.readinessReviewId,
    productionValuePlaceholderId: review.productionValuePlaceholderId,
    draftMetadataId: review.draftMetadataId,
    promotionGateId: review.promotionGateId,
    extractedValueMetadataId: review.extractedValueMetadataId,
    unitMetadataId: review.unitMetadataId,
    citationId: review.citationId,
    sourceId: review.sourceId,
    sourceType: review.sourceType,
    valueDomain: 'probability',
    placeholderStatus: review.placeholderStatus,
    preflightStatus: 'blocked',
    sourceBackedValueReadinessStatus: review.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: review.citationConsistencyStatus,
    unitConsistencyStatus: review.unitConsistencyStatus,
    normalizationConsistencyStatus: review.normalizationConsistencyStatus,
    conflictReviewStatus: review.conflictReviewStatus,
    promotionDecisionStatus: review.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(review: JuoRewardProductionValueReadinessReviewRow): JuoRewardSourceBackedProductionValuePreflightRow {
  return {
    preflightId: `${review.sourceId}_reward_source_backed_production_value_preflight`,
    readinessReviewId: review.readinessReviewId,
    productionValuePlaceholderId: review.productionValuePlaceholderId,
    draftMetadataId: review.draftMetadataId,
    promotionGateId: review.promotionGateId,
    extractedValueMetadataId: review.extractedValueMetadataId,
    unitMetadataId: review.unitMetadataId,
    citationId: review.citationId,
    sourceId: review.sourceId,
    sourceType: review.sourceType,
    valueDomain: 'reward',
    placeholderStatus: review.placeholderStatus,
    preflightStatus: 'blocked',
    sourceBackedValueReadinessStatus: review.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: review.citationConsistencyStatus,
    unitConsistencyStatus: review.unitConsistencyStatus,
    accountingConsistencyStatus: review.accountingConsistencyStatus,
    normalizationConsistencyStatus: review.normalizationConsistencyStatus,
    conflictReviewStatus: review.conflictReviewStatus,
    promotionDecisionStatus: review.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValuePreflightInventory: readonly JuoProbabilitySourceBackedProductionValuePreflightRow[] =
  juoProbabilityProductionValueReadinessReviewInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValuePreflightInventory: readonly JuoRewardSourceBackedProductionValuePreflightRow[] =
  juoRewardProductionValueReadinessReviewInventory.map(rewardRowFor);
