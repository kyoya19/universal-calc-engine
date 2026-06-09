import {
  juoProbabilityProductionValueDraftMetadataInventory,
  juoRewardProductionValueDraftMetadataInventory,
  type JuoProbabilityProductionValueDraftMetadataRow,
  type JuoRewardProductionValueDraftMetadataRow
} from './juo_production_value_draft_metadata';

export type JuoProductionValuePlaceholderStatus = 'placeholder';
export type JuoProductionValuePlaceholderReadinessStatus = 'not_started' | 'not_applicable' | 'excluded';

export interface JuoProbabilityProductionValuePlaceholderRow {
  readonly productionValuePlaceholderId: string;
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'probability';
  readonly placeholderStatus: JuoProductionValuePlaceholderStatus;
  readonly valueReadinessStatus: JuoProductionValuePlaceholderReadinessStatus;
  readonly normalizationReadinessStatus: JuoProductionValuePlaceholderReadinessStatus;
  readonly promotionEligibility: 'no';
  readonly executionEligibility: 'no';
}

export interface JuoRewardProductionValuePlaceholderRow {
  readonly productionValuePlaceholderId: string;
  readonly draftMetadataId: string;
  readonly promotionGateId: string;
  readonly extractedValueMetadataId: string;
  readonly unitMetadataId: string;
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly valueDomain: 'reward';
  readonly placeholderStatus: JuoProductionValuePlaceholderStatus;
  readonly valueReadinessStatus: JuoProductionValuePlaceholderReadinessStatus;
  readonly accountingReadinessStatus: JuoProductionValuePlaceholderReadinessStatus;
  readonly normalizationReadinessStatus: JuoProductionValuePlaceholderReadinessStatus;
  readonly promotionEligibility: 'no';
  readonly executionEligibility: 'no';
}

function readinessFromDraft(draft: { readonly valueShapeStatus: string }): JuoProductionValuePlaceholderReadinessStatus {
  if (draft.valueShapeStatus === 'excluded') return 'excluded';
  if (draft.valueShapeStatus === 'not_applicable') return 'not_applicable';
  return 'not_started';
}

function probabilityRowFor(
  draft: JuoProbabilityProductionValueDraftMetadataRow
): JuoProbabilityProductionValuePlaceholderRow {
  const readiness = readinessFromDraft(draft);

  return {
    productionValuePlaceholderId: `${draft.sourceId}_probability_production_value_placeholder`,
    draftMetadataId: draft.draftMetadataId,
    promotionGateId: draft.promotionGateId,
    extractedValueMetadataId: draft.extractedValueMetadataId,
    unitMetadataId: draft.unitMetadataId,
    citationId: draft.citationId,
    sourceId: draft.sourceId,
    sourceType: draft.sourceType,
    valueDomain: 'probability',
    placeholderStatus: 'placeholder',
    valueReadinessStatus: readiness,
    normalizationReadinessStatus: readiness,
    promotionEligibility: draft.promotionEligibility,
    executionEligibility: 'no'
  };
}

function rewardRowFor(draft: JuoRewardProductionValueDraftMetadataRow): JuoRewardProductionValuePlaceholderRow {
  const readiness = readinessFromDraft(draft);

  return {
    productionValuePlaceholderId: `${draft.sourceId}_reward_production_value_placeholder`,
    draftMetadataId: draft.draftMetadataId,
    promotionGateId: draft.promotionGateId,
    extractedValueMetadataId: draft.extractedValueMetadataId,
    unitMetadataId: draft.unitMetadataId,
    citationId: draft.citationId,
    sourceId: draft.sourceId,
    sourceType: draft.sourceType,
    valueDomain: 'reward',
    placeholderStatus: 'placeholder',
    valueReadinessStatus: readiness,
    accountingReadinessStatus: readiness,
    normalizationReadinessStatus: readiness,
    promotionEligibility: draft.promotionEligibility,
    executionEligibility: 'no'
  };
}

export const juoProbabilityProductionValuePlaceholderInventory: readonly JuoProbabilityProductionValuePlaceholderRow[] =
  juoProbabilityProductionValueDraftMetadataInventory.map(probabilityRowFor);

export const juoRewardProductionValuePlaceholderInventory: readonly JuoRewardProductionValuePlaceholderRow[] =
  juoRewardProductionValueDraftMetadataInventory.map(rewardRowFor);
