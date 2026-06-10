import {
  juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory,
  juoRewardSourceBackedProductionValueMaterializationBoundaryInventory,
  type JuoProbabilitySourceBackedProductionValueMaterializationBoundaryRow,
  type JuoRewardSourceBackedProductionValueMaterializationBoundaryRow
} from './juo_source_backed_production_value_materialization_boundary';

export type JuoGuardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus = 'candidate_blocked';

export interface JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow {
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: string;
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
  readonly sourceBackedProductionValueMaterializationBoundaryStatus: 'materialization_blocked';
  readonly materializationCandidateEligibility: 'no';
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: JuoGuardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow {
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: string;
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
  readonly sourceBackedProductionValueMaterializationBoundaryStatus: 'materialization_blocked';
  readonly materializationCandidateEligibility: 'no';
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: JuoGuardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  boundary: JuoProbabilitySourceBackedProductionValueMaterializationBoundaryRow
): JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow {
  return {
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: `${boundary.sourceId}_probability_guarded_source_backed_production_value_materialization_candidate_boundary`,
    sourceBackedProductionValueMaterializationBoundaryId: boundary.sourceBackedProductionValueMaterializationBoundaryId,
    sourceBackedProductionValuePromotionId: boundary.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: boundary.sourceBackedProductionValueDraftId,
    preflightId: boundary.preflightId,
    readinessReviewId: boundary.readinessReviewId,
    productionValuePlaceholderId: boundary.productionValuePlaceholderId,
    draftMetadataId: boundary.draftMetadataId,
    promotionGateId: boundary.promotionGateId,
    extractedValueMetadataId: boundary.extractedValueMetadataId,
    unitMetadataId: boundary.unitMetadataId,
    citationId: boundary.citationId,
    sourceId: boundary.sourceId,
    sourceType: boundary.sourceType,
    valueDomain: 'probability',
    placeholderStatus: boundary.placeholderStatus,
    preflightStatus: boundary.preflightStatus,
    sourceBackedValueReadinessStatus: boundary.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: boundary.citationConsistencyStatus,
    unitConsistencyStatus: boundary.unitConsistencyStatus,
    normalizationConsistencyStatus: boundary.normalizationConsistencyStatus,
    conflictReviewStatus: boundary.conflictReviewStatus,
    promotionDecisionStatus: boundary.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: boundary.sourceBackedValueCreationEligibility,
    draftStatus: boundary.draftStatus,
    sourceBackedProductionValuePromotionStatus: boundary.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: boundary.materializationEligibility,
    sourceBackedProductionValueMaterializationBoundaryStatus: boundary.sourceBackedProductionValueMaterializationBoundaryStatus,
    materializationCandidateEligibility: 'no',
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: 'candidate_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  boundary: JuoRewardSourceBackedProductionValueMaterializationBoundaryRow
): JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow {
  return {
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: `${boundary.sourceId}_reward_guarded_source_backed_production_value_materialization_candidate_boundary`,
    sourceBackedProductionValueMaterializationBoundaryId: boundary.sourceBackedProductionValueMaterializationBoundaryId,
    sourceBackedProductionValuePromotionId: boundary.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: boundary.sourceBackedProductionValueDraftId,
    preflightId: boundary.preflightId,
    readinessReviewId: boundary.readinessReviewId,
    productionValuePlaceholderId: boundary.productionValuePlaceholderId,
    draftMetadataId: boundary.draftMetadataId,
    promotionGateId: boundary.promotionGateId,
    extractedValueMetadataId: boundary.extractedValueMetadataId,
    unitMetadataId: boundary.unitMetadataId,
    citationId: boundary.citationId,
    sourceId: boundary.sourceId,
    sourceType: boundary.sourceType,
    valueDomain: 'reward',
    placeholderStatus: boundary.placeholderStatus,
    preflightStatus: boundary.preflightStatus,
    sourceBackedValueReadinessStatus: boundary.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: boundary.citationConsistencyStatus,
    unitConsistencyStatus: boundary.unitConsistencyStatus,
    accountingConsistencyStatus: boundary.accountingConsistencyStatus,
    normalizationConsistencyStatus: boundary.normalizationConsistencyStatus,
    conflictReviewStatus: boundary.conflictReviewStatus,
    promotionDecisionStatus: boundary.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: boundary.sourceBackedValueCreationEligibility,
    draftStatus: boundary.draftStatus,
    sourceBackedProductionValuePromotionStatus: boundary.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: boundary.materializationEligibility,
    sourceBackedProductionValueMaterializationBoundaryStatus: boundary.sourceBackedProductionValueMaterializationBoundaryStatus,
    materializationCandidateEligibility: 'no',
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: 'candidate_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory: readonly JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow[] =
  juoProbabilitySourceBackedProductionValueMaterializationBoundaryInventory.map(probabilityRowFor);

export const juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory: readonly JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow[] =
  juoRewardSourceBackedProductionValueMaterializationBoundaryInventory.map(rewardRowFor);
