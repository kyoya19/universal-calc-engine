import {
  juoProbabilitySourceBackedProductionValuePreflightInventory,
  juoRewardSourceBackedProductionValuePreflightInventory,
  type JuoProbabilitySourceBackedProductionValuePreflightRow,
  type JuoRewardSourceBackedProductionValuePreflightRow
} from './juo_source_backed_production_value_preflight';

export type JuoSourceBackedProductionValueDraftStatus = 'draft_blocked';

export interface JuoProbabilitySourceBackedProductionValueDraftRow {
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
  readonly draftStatus: JuoSourceBackedProductionValueDraftStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardSourceBackedProductionValueDraftRow {
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
  readonly draftStatus: JuoSourceBackedProductionValueDraftStatus;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  preflight: JuoProbabilitySourceBackedProductionValuePreflightRow
): JuoProbabilitySourceBackedProductionValueDraftRow {
  return {
    sourceBackedProductionValueDraftId: `${preflight.sourceId}_probability_source_backed_production_value_draft`,
    preflightId: preflight.preflightId,
    readinessReviewId: preflight.readinessReviewId,
    productionValuePlaceholderId: preflight.productionValuePlaceholderId,
    draftMetadataId: preflight.draftMetadataId,
    promotionGateId: preflight.promotionGateId,
    extractedValueMetadataId: preflight.extractedValueMetadataId,
    unitMetadataId: preflight.unitMetadataId,
    citationId: preflight.citationId,
    sourceId: preflight.sourceId,
    sourceType: preflight.sourceType,
    valueDomain: 'probability',
    placeholderStatus: preflight.placeholderStatus,
    preflightStatus: preflight.preflightStatus,
    sourceBackedValueReadinessStatus: preflight.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: preflight.citationConsistencyStatus,
    unitConsistencyStatus: preflight.unitConsistencyStatus,
    normalizationConsistencyStatus: preflight.normalizationConsistencyStatus,
    conflictReviewStatus: preflight.conflictReviewStatus,
    promotionDecisionStatus: preflight.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: preflight.sourceBackedValueCreationEligibility,
    draftStatus: 'draft_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  preflight: JuoRewardSourceBackedProductionValuePreflightRow
): JuoRewardSourceBackedProductionValueDraftRow {
  return {
    sourceBackedProductionValueDraftId: `${preflight.sourceId}_reward_source_backed_production_value_draft`,
    preflightId: preflight.preflightId,
    readinessReviewId: preflight.readinessReviewId,
    productionValuePlaceholderId: preflight.productionValuePlaceholderId,
    draftMetadataId: preflight.draftMetadataId,
    promotionGateId: preflight.promotionGateId,
    extractedValueMetadataId: preflight.extractedValueMetadataId,
    unitMetadataId: preflight.unitMetadataId,
    citationId: preflight.citationId,
    sourceId: preflight.sourceId,
    sourceType: preflight.sourceType,
    valueDomain: 'reward',
    placeholderStatus: preflight.placeholderStatus,
    preflightStatus: preflight.preflightStatus,
    sourceBackedValueReadinessStatus: preflight.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: preflight.citationConsistencyStatus,
    unitConsistencyStatus: preflight.unitConsistencyStatus,
    accountingConsistencyStatus: preflight.accountingConsistencyStatus,
    normalizationConsistencyStatus: preflight.normalizationConsistencyStatus,
    conflictReviewStatus: preflight.conflictReviewStatus,
    promotionDecisionStatus: preflight.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: preflight.sourceBackedValueCreationEligibility,
    draftStatus: 'draft_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilitySourceBackedProductionValueDraftInventory: readonly JuoProbabilitySourceBackedProductionValueDraftRow[] =
  juoProbabilitySourceBackedProductionValuePreflightInventory.map(probabilityRowFor);

export const juoRewardSourceBackedProductionValueDraftInventory: readonly JuoRewardSourceBackedProductionValueDraftRow[] =
  juoRewardSourceBackedProductionValuePreflightInventory.map(rewardRowFor);
