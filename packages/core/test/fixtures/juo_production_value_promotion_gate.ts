import {
  juoProbabilityExtractedValueMetadataInventory,
  juoRewardExtractedValueMetadataInventory,
  type JuoProbabilityExtractedValueMetadataRow,
  type JuoRewardExtractedValueMetadataRow
} from './juo_extracted_value_metadata';

export type JuoPromotionReadinessStatus = 'not_started' | 'not_applicable' | 'excluded';
export type JuoPromotionEligibility = 'no';

export interface JuoProbabilityProductionValuePromotionGateRow {
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'probability';
  readonly extractionStatus: JuoPromotionReadinessStatus;
  readonly unitApplicability: JuoPromotionReadinessStatus;
  readonly citationReadinessStatus: JuoPromotionReadinessStatus;
  readonly sourceConflictStatus: JuoPromotionReadinessStatus;
  readonly numericReadinessStatus: JuoPromotionReadinessStatus;
  readonly normalizationReadinessStatus: JuoPromotionReadinessStatus;
  readonly reviewReadinessStatus: JuoPromotionReadinessStatus;
  readonly promotionEligibility: JuoPromotionEligibility;
  readonly executionEligibility: 'no';
}

export interface JuoRewardProductionValuePromotionGateRow {
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'reward';
  readonly extractionStatus: JuoPromotionReadinessStatus;
  readonly unitApplicability: JuoPromotionReadinessStatus;
  readonly citationReadinessStatus: JuoPromotionReadinessStatus;
  readonly sourceConflictStatus: JuoPromotionReadinessStatus;
  readonly numericReadinessStatus: JuoPromotionReadinessStatus;
  readonly accountingReadinessStatus: JuoPromotionReadinessStatus;
  readonly normalizationReadinessStatus: JuoPromotionReadinessStatus;
  readonly reviewReadinessStatus: JuoPromotionReadinessStatus;
  readonly promotionEligibility: JuoPromotionEligibility;
  readonly executionEligibility: 'no';
}

function readinessFromApplicability(applicability: string): JuoPromotionReadinessStatus {
  if (applicability === 'excluded') return 'excluded';
  if (applicability === 'not_applicable') return 'not_applicable';
  return 'not_started';
}

function probabilityRowFor(
  row: JuoProbabilityExtractedValueMetadataRow
): JuoProbabilityProductionValuePromotionGateRow {
  const readiness = readinessFromApplicability(row.extractionApplicability);

  return {
    promotionGateId: `${row.sourceId}_probability_production_value_promotion_gate`,
    extractedValueMetadataId: row.extractedValueMetadataId,
    unitMetadataId: row.unitMetadataId,
    citationId: row.citationId,
    sourceId: row.sourceId,
    sourceType: row.sourceType,
    valueDomain: 'probability',
    extractionStatus: row.extractionStatus,
    unitApplicability: readiness,
    citationReadinessStatus: readiness,
    sourceConflictStatus: readiness,
    numericReadinessStatus: readiness,
    normalizationReadinessStatus: readiness,
    reviewReadinessStatus: readiness,
    promotionEligibility: 'no',
    executionEligibility: 'no'
  };
}

function rewardRowFor(row: JuoRewardExtractedValueMetadataRow): JuoRewardProductionValuePromotionGateRow {
  const readiness = readinessFromApplicability(row.extractionApplicability);

  return {
    promotionGateId: `${row.sourceId}_reward_production_value_promotion_gate`,
    extractedValueMetadataId: row.extractedValueMetadataId,
    unitMetadataId: row.unitMetadataId,
    citationId: row.citationId,
    sourceId: row.sourceId,
    sourceType: row.sourceType,
    valueDomain: 'reward',
    extractionStatus: row.extractionStatus,
    unitApplicability: readiness,
    citationReadinessStatus: readiness,
    sourceConflictStatus: readiness,
    numericReadinessStatus: readiness,
    accountingReadinessStatus: readiness,
    normalizationReadinessStatus: readiness,
    reviewReadinessStatus: readiness,
    promotionEligibility: 'no',
    executionEligibility: 'no'
  };
}

export const juoProbabilityProductionValuePromotionGateInventory: readonly JuoProbabilityProductionValuePromotionGateRow[] =
  juoProbabilityExtractedValueMetadataInventory.map(probabilityRowFor);

export const juoRewardProductionValuePromotionGateInventory: readonly JuoRewardProductionValuePromotionGateRow[] =
  juoRewardExtractedValueMetadataInventory.map(rewardRowFor);
