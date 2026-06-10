import {
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory,
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory,
  type JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow,
  type JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow
} from './juo_guarded_source_backed_production_value_materialization_candidate_boundary';

export type JuoGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus = 'review_blocked';

export interface JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  readonly guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId: string;
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
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: 'candidate_blocked';
  readonly candidateReviewEligibility: 'no';
  readonly guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus: JuoGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus;
  readonly executionEligibility: 'no';
}

export interface JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  readonly guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId: string;
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
  readonly guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus: 'candidate_blocked';
  readonly candidateReviewEligibility: 'no';
  readonly guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus: JuoGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus;
  readonly executionEligibility: 'no';
}

function probabilityRowFor(
  candidate: JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow
): JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  return {
    guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId: `${candidate.sourceId}_probability_guarded_source_backed_production_value_materialization_candidate_review_boundary`,
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: candidate.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId,
    sourceBackedProductionValueMaterializationBoundaryId: candidate.sourceBackedProductionValueMaterializationBoundaryId,
    sourceBackedProductionValuePromotionId: candidate.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: candidate.sourceBackedProductionValueDraftId,
    preflightId: candidate.preflightId,
    readinessReviewId: candidate.readinessReviewId,
    productionValuePlaceholderId: candidate.productionValuePlaceholderId,
    draftMetadataId: candidate.draftMetadataId,
    promotionGateId: candidate.promotionGateId,
    extractedValueMetadataId: candidate.extractedValueMetadataId,
    unitMetadataId: candidate.unitMetadataId,
    citationId: candidate.citationId,
    sourceId: candidate.sourceId,
    sourceType: candidate.sourceType,
    valueDomain: 'probability',
    placeholderStatus: candidate.placeholderStatus,
    preflightStatus: candidate.preflightStatus,
    sourceBackedValueReadinessStatus: candidate.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: candidate.citationConsistencyStatus,
    unitConsistencyStatus: candidate.unitConsistencyStatus,
    normalizationConsistencyStatus: candidate.normalizationConsistencyStatus,
    conflictReviewStatus: candidate.conflictReviewStatus,
    promotionDecisionStatus: candidate.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: candidate.sourceBackedValueCreationEligibility,
    draftStatus: candidate.draftStatus,
    sourceBackedProductionValuePromotionStatus: candidate.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: candidate.materializationEligibility,
    sourceBackedProductionValueMaterializationBoundaryStatus: candidate.sourceBackedProductionValueMaterializationBoundaryStatus,
    materializationCandidateEligibility: candidate.materializationCandidateEligibility,
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus:
      candidate.guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus,
    candidateReviewEligibility: 'no',
    guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus: 'review_blocked',
    executionEligibility: 'no'
  };
}

function rewardRowFor(
  candidate: JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryRow
): JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow {
  return {
    guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryId: `${candidate.sourceId}_reward_guarded_source_backed_production_value_materialization_candidate_review_boundary`,
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryId: candidate.guardedSourceBackedProductionValueMaterializationCandidateBoundaryId,
    sourceBackedProductionValueMaterializationBoundaryId: candidate.sourceBackedProductionValueMaterializationBoundaryId,
    sourceBackedProductionValuePromotionId: candidate.sourceBackedProductionValuePromotionId,
    sourceBackedProductionValueDraftId: candidate.sourceBackedProductionValueDraftId,
    preflightId: candidate.preflightId,
    readinessReviewId: candidate.readinessReviewId,
    productionValuePlaceholderId: candidate.productionValuePlaceholderId,
    draftMetadataId: candidate.draftMetadataId,
    promotionGateId: candidate.promotionGateId,
    extractedValueMetadataId: candidate.extractedValueMetadataId,
    unitMetadataId: candidate.unitMetadataId,
    citationId: candidate.citationId,
    sourceId: candidate.sourceId,
    sourceType: candidate.sourceType,
    valueDomain: 'reward',
    placeholderStatus: candidate.placeholderStatus,
    preflightStatus: candidate.preflightStatus,
    sourceBackedValueReadinessStatus: candidate.sourceBackedValueReadinessStatus,
    citationConsistencyStatus: candidate.citationConsistencyStatus,
    unitConsistencyStatus: candidate.unitConsistencyStatus,
    accountingConsistencyStatus: candidate.accountingConsistencyStatus,
    normalizationConsistencyStatus: candidate.normalizationConsistencyStatus,
    conflictReviewStatus: candidate.conflictReviewStatus,
    promotionDecisionStatus: candidate.promotionDecisionStatus,
    sourceBackedValueCreationEligibility: candidate.sourceBackedValueCreationEligibility,
    draftStatus: candidate.draftStatus,
    sourceBackedProductionValuePromotionStatus: candidate.sourceBackedProductionValuePromotionStatus,
    materializationEligibility: candidate.materializationEligibility,
    sourceBackedProductionValueMaterializationBoundaryStatus: candidate.sourceBackedProductionValueMaterializationBoundaryStatus,
    materializationCandidateEligibility: candidate.materializationCandidateEligibility,
    guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus:
      candidate.guardedSourceBackedProductionValueMaterializationCandidateBoundaryStatus,
    candidateReviewEligibility: 'no',
    guardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryStatus: 'review_blocked',
    executionEligibility: 'no'
  };
}

export const juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory: readonly JuoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow[] =
  juoProbabilityGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory.map(probabilityRowFor);

export const juoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryInventory: readonly JuoRewardGuardedSourceBackedProductionValueMaterializationCandidateReviewBoundaryRow[] =
  juoRewardGuardedSourceBackedProductionValueMaterializationCandidateBoundaryInventory.map(rewardRowFor);
