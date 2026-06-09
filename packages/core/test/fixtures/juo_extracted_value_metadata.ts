import {
  juoProbabilityUnitMetadataInventory,
  juoRewardUnitMetadataInventory,
  type JuoProbabilityUnitMetadataRow,
  type JuoRewardUnitMetadataRow
} from './juo_unit_metadata';

export type JuoExtractionApplicability = 'applicable' | 'not_applicable' | 'excluded';
export type JuoExtractedValueMetadataStatus = 'not_started' | 'not_applicable' | 'excluded';

export interface JuoProbabilityExtractedValueMetadataRow {
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'probability';
  readonly extractionApplicability: JuoExtractionApplicability;
  readonly extractionStatus: JuoExtractedValueMetadataStatus;
  readonly extractedExpressionStatus: JuoExtractedValueMetadataStatus;
  readonly numeratorStatus: JuoExtractedValueMetadataStatus;
  readonly denominatorStatus: JuoExtractedValueMetadataStatus;
  readonly decimalStatus: JuoExtractedValueMetadataStatus;
  readonly normalizationStatus: JuoExtractedValueMetadataStatus;
  readonly reviewStatus: string;
  readonly executionEligibility: 'no';
}

export interface JuoRewardExtractedValueMetadataRow {
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'reward';
  readonly extractionApplicability: JuoExtractionApplicability;
  readonly extractionStatus: JuoExtractedValueMetadataStatus;
  readonly extractedExpressionStatus: JuoExtractedValueMetadataStatus;
  readonly payoutAmountStatus: JuoExtractedValueMetadataStatus;
  readonly rewardUnitStatus: JuoExtractedValueMetadataStatus;
  readonly accountingBasisStatus: JuoExtractedValueMetadataStatus;
  readonly normalizationStatus: JuoExtractedValueMetadataStatus;
  readonly reviewStatus: string;
  readonly executionEligibility: 'no';
}

function applicabilityForUnit(unitApplicability: string): JuoExtractionApplicability {
  if (unitApplicability === 'excluded') return 'excluded';
  if (unitApplicability === 'not_applicable') return 'not_applicable';
  return 'applicable';
}

function statusFor(applicability: JuoExtractionApplicability): JuoExtractedValueMetadataStatus {
  if (applicability === 'excluded') return 'excluded';
  if (applicability === 'not_applicable') return 'not_applicable';
  return 'not_started';
}

function probabilityRowFor(unitRow: JuoProbabilityUnitMetadataRow): JuoProbabilityExtractedValueMetadataRow {
  const extractionApplicability = applicabilityForUnit(unitRow.unitApplicability);
  const status = statusFor(extractionApplicability);

  return {
    extractedValueMetadataId: `${unitRow.sourceId}_probability_extracted_value_metadata`,
    unitMetadataId: unitRow.unitMetadataId,
    citationId: unitRow.citationId,
    sourceId: unitRow.sourceId,
    sourceType: unitRow.sourceType,
    valueDomain: 'probability',
    extractionApplicability,
    extractionStatus: status,
    extractedExpressionStatus: status,
    numeratorStatus: status,
    denominatorStatus: status,
    decimalStatus: status,
    normalizationStatus: status,
    reviewStatus: unitRow.reviewStatus,
    executionEligibility: 'no'
  };
}

function rewardRowFor(unitRow: JuoRewardUnitMetadataRow): JuoRewardExtractedValueMetadataRow {
  const extractionApplicability = applicabilityForUnit(unitRow.unitApplicability);
  const status = statusFor(extractionApplicability);

  return {
    extractedValueMetadataId: `${unitRow.sourceId}_reward_extracted_value_metadata`,
    unitMetadataId: unitRow.unitMetadataId,
    citationId: unitRow.citationId,
    sourceId: unitRow.sourceId,
    sourceType: unitRow.sourceType,
    valueDomain: 'reward',
    extractionApplicability,
    extractionStatus: status,
    extractedExpressionStatus: status,
    payoutAmountStatus: status,
    rewardUnitStatus: status,
    accountingBasisStatus: status,
    normalizationStatus: status,
    reviewStatus: unitRow.reviewStatus,
    executionEligibility: 'no'
  };
}

export const juoProbabilityExtractedValueMetadataInventory: readonly JuoProbabilityExtractedValueMetadataRow[] =
  juoProbabilityUnitMetadataInventory.map(probabilityRowFor);

export const juoRewardExtractedValueMetadataInventory: readonly JuoRewardExtractedValueMetadataRow[] =
  juoRewardUnitMetadataInventory.map(rewardRowFor);
