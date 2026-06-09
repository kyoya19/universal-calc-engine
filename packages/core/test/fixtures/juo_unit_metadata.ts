import { juoCitationMetadataInventory, type JuoCitationMetadataRow } from './juo_citation_metadata';

export type JuoUnitMetadataApplicability = 'applicable' | 'not_applicable' | 'excluded';
export type JuoUnitMappingStatus = 'not_started' | 'not_applicable' | 'excluded';

export type JuoProbabilityUnitKind =
  | 'unknown'
  | 'mixed'
  | 'count_over_denominator'
  | 'complement_derived'
  | 'formula_derived'
  | 'not_applicable'
  | 'excluded';

export type JuoRewardUnitKind =
  | 'unknown'
  | 'mixed'
  | 'formula_derived'
  | 'not_applicable'
  | 'excluded';

export interface JuoProbabilityUnitMetadataRow {
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly unitApplicability: JuoUnitMetadataApplicability;
  readonly probabilityUnitKind: JuoProbabilityUnitKind;
  readonly probabilityExpressionStatus: JuoUnitMappingStatus;
  readonly denominatorStatus: JuoUnitMappingStatus;
  readonly observationBasisStatus: JuoUnitMappingStatus;
  readonly normalizationStatus: JuoUnitMappingStatus;
  readonly reviewStatus: string;
  readonly executionEligibility: 'no';
}

export interface JuoRewardUnitMetadataRow {
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly unitApplicability: JuoUnitMetadataApplicability;
  readonly rewardUnitKind: JuoRewardUnitKind;
  readonly rewardExpressionStatus: JuoUnitMappingStatus;
  readonly payoutBasisStatus: JuoUnitMappingStatus;
  readonly tokenBasisStatus: JuoUnitMappingStatus;
  readonly normalizationStatus: JuoUnitMappingStatus;
  readonly reviewStatus: string;
  readonly executionEligibility: 'no';
}

function probabilityUnitKindFor(row: JuoCitationMetadataRow): JuoProbabilityUnitKind {
  switch (row.sourceType) {
    case 'primary':
    case 'secondary':
      return 'mixed';
    case 'observed':
      return 'count_over_denominator';
    case 'inferred':
      return 'complement_derived';
    case 'formula':
      return 'formula_derived';
    case 'excluded':
      return 'excluded';
    case 'assumption':
    case 'unknown':
    default:
      return 'not_applicable';
  }
}

function rewardUnitKindFor(row: JuoCitationMetadataRow): JuoRewardUnitKind {
  switch (row.sourceType) {
    case 'primary':
    case 'secondary':
      return 'mixed';
    case 'formula':
      return 'formula_derived';
    case 'excluded':
      return 'excluded';
    case 'observed':
    case 'inferred':
    case 'assumption':
    case 'unknown':
    default:
      return 'not_applicable';
  }
}

function applicabilityFor(kind: string): JuoUnitMetadataApplicability {
  if (kind === 'excluded') return 'excluded';
  if (kind === 'not_applicable') return 'not_applicable';
  return 'applicable';
}

function mappingStatusFor(applicability: JuoUnitMetadataApplicability): JuoUnitMappingStatus {
  if (applicability === 'excluded') return 'excluded';
  if (applicability === 'not_applicable') return 'not_applicable';
  return 'not_started';
}

export const juoProbabilityUnitMetadataInventory: readonly JuoProbabilityUnitMetadataRow[] =
  juoCitationMetadataInventory.map((row) => {
    const probabilityUnitKind = probabilityUnitKindFor(row);
    const unitApplicability = applicabilityFor(probabilityUnitKind);
    const status = mappingStatusFor(unitApplicability);

    return {
      unitMetadataId: `${row.sourceId}_probability_unit_metadata`,
      citationId: row.citationId,
      sourceId: row.sourceId,
      sourceType: row.sourceType,
      unitApplicability,
      probabilityUnitKind,
      probabilityExpressionStatus: status,
      denominatorStatus: status,
      observationBasisStatus: status,
      normalizationStatus: status,
      reviewStatus: row.reviewStatus,
      executionEligibility: 'no'
    };
  });

export const juoRewardUnitMetadataInventory: readonly JuoRewardUnitMetadataRow[] =
  juoCitationMetadataInventory.map((row) => {
    const rewardUnitKind = rewardUnitKindFor(row);
    const unitApplicability = applicabilityFor(rewardUnitKind);
    const status = mappingStatusFor(unitApplicability);

    return {
      unitMetadataId: `${row.sourceId}_reward_unit_metadata`,
      citationId: row.citationId,
      sourceId: row.sourceId,
      sourceType: row.sourceType,
      unitApplicability,
      rewardUnitKind,
      rewardExpressionStatus: status,
      payoutBasisStatus: status,
      tokenBasisStatus: status,
      normalizationStatus: status,
      reviewStatus: row.reviewStatus,
      executionEligibility: 'no'
    };
  });
