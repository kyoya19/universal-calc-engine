export type FiniteObservationDesignCandidate = {
  candidateId: string;
};

export type FiniteObservationOutcomeProbability = {
  outcomeId: string;
  probability: number;
};

export type FiniteObservationDesignCandidateDistribution = {
  candidateId: string;
  outcomes: FiniteObservationOutcomeProbability[];
};

export type FiniteObservationDesign = {
  designId: string;
  candidateDistributions: FiniteObservationDesignCandidateDistribution[];
};

export type FiniteObservationDesignRequest = {
  candidates: FiniteObservationDesignCandidate[];
  designs: FiniteObservationDesign[];
};

export type FiniteObservationDesignOptions = {
  probabilityTolerance?: number;
  selectionTolerance?: number;
  maxCandidates?: number;
  maxDesigns?: number;
  maxOutcomesPerDistribution?: number;
};

export type FiniteObservationDesignFailureCode =
  | 'invalid_options'
  | 'invalid_candidate_family'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_design_set'
  | 'duplicate_design_id'
  | 'design_count_exceeds_limit'
  | 'invalid_candidate_distribution'
  | 'duplicate_candidate_distribution'
  | 'missing_candidate_distribution'
  | 'invalid_outcome_distribution'
  | 'duplicate_outcome_id'
  | 'outcome_count_exceeds_limit'
  | 'distribution_total_invalid'
  | 'non_finite_analytical_result';

export type FiniteObservationDesignFailure = {
  code: FiniteObservationDesignFailureCode;
  message: string;
  path?: string;
  candidateId?: string;
  designId?: string;
  outcomeId?: string;
};

export type FiniteObservationDesignPairwiseSeparation = {
  leftCandidateId: string;
  rightCandidateId: string;
  totalVariationDistance: number;
};

export type FiniteObservationDesignWorstPair = {
  leftCandidateId: string;
  rightCandidateId: string;
  totalVariationDistance: number;
};

export type FiniteObservationDesignEvaluation = {
  designId: string;
  pairwiseSeparations: FiniteObservationDesignPairwiseSeparation[];
  worstCaseSeparation: number;
  worstCaseClassification: 'positive_worst_case_separation' | 'zero_worst_case_separation';
  worstCasePairs: FiniteObservationDesignWorstPair[];
  scoreDeltaFromBest: number;
  maximinOptimal: boolean;
};

export type FiniteObservationDesignSelectionClassification =
  | 'unique_maximin_design'
  | 'tied_maximin_design';

export type FiniteObservationDesignDiagnostics = {
  method: 'finite_categorical_total_variation_maximin_design_selection';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  candidatePriorUsed: false;
  candidatePosteriorComputed: false;
  mutualInformationUsed: false;
  adaptiveDesignUsed: false;
  automaticDesignGenerationUsed: false;
  observationCostOptimizationUsed: false;
  globalStructuralIdentifiabilityClaimed: false;
  guaranteedSingleObservationIdentificationClaimed: false;
  rankingBasis: 'maximum_minimum_pairwise_total_variation';
  missingSparseOutcomeMassInterpretation: 'zero_probability';
  candidateOrderAffectsSelection: false;
  designOrderAffectsSelection: false;
  outcomeOrderAffectsSelection: false;
  probabilityTolerance: number;
  selectionTolerance: number;
  maxCandidates: number;
  maxDesigns: number;
  maxOutcomesPerDistribution: number;
  candidateCount: number;
  designCount: number;
};

export type FiniteObservationDesignSuccess = {
  ok: true;
  classification: FiniteObservationDesignSelectionClassification;
  evaluations: FiniteObservationDesignEvaluation[];
  bestWorstCaseSeparation: number;
  selectedDesignIds: string[];
  diagnostics: FiniteObservationDesignDiagnostics;
};

export type FiniteObservationDesignFailureResult = {
  ok: false;
  failure: FiniteObservationDesignFailure;
};

export type FiniteObservationDesignResult =
  | FiniteObservationDesignSuccess
  | FiniteObservationDesignFailureResult;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_SELECTION_TOLERANCE = 1e-12;
const DEFAULT_MAX_CANDIDATES = 1_000;
const DEFAULT_MAX_DESIGNS = 10_000;
const DEFAULT_MAX_OUTCOMES_PER_DISTRIBUTION = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  selectionTolerance: number;
  maxCandidates: number;
  maxDesigns: number;
  maxOutcomesPerDistribution: number;
};

type CanonicalDistribution = {
  candidateId: string;
  outcomes: FiniteObservationOutcomeProbability[];
};

type CanonicalDesign = {
  designId: string;
  candidateDistributions: CanonicalDistribution[];
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: FiniteObservationDesignFailureCode,
  message: string,
  details: Omit<FiniteObservationDesignFailure, 'code' | 'message'> = {}
): FiniteObservationDesignFailureResult {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveInteger(
  value: number | undefined,
  fallback: number,
  path: string
): number | FiniteObservationDesignFailureResult {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) {
    return failure('invalid_options', `${path} must be a positive integer`, { path });
  }
  return resolved;
}

function resolveOptions(
  options: FiniteObservationDesignOptions
): ResolvedOptions | FiniteObservationDesignFailureResult {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure('invalid_options', 'probabilityTolerance must be a finite positive number', {
      path: 'options.probabilityTolerance'
    });
  }
  const selectionTolerance = options.selectionTolerance ?? DEFAULT_SELECTION_TOLERANCE;
  if (!Number.isFinite(selectionTolerance) || selectionTolerance < 0) {
    return failure('invalid_options', 'selectionTolerance must be a finite non-negative number', {
      path: 'options.selectionTolerance'
    });
  }
  const maxCandidates = resolvePositiveInteger(
    options.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
    'options.maxCandidates'
  );
  if (typeof maxCandidates !== 'number') return maxCandidates;
  const maxDesigns = resolvePositiveInteger(
    options.maxDesigns,
    DEFAULT_MAX_DESIGNS,
    'options.maxDesigns'
  );
  if (typeof maxDesigns !== 'number') return maxDesigns;
  const maxOutcomesPerDistribution = resolvePositiveInteger(
    options.maxOutcomesPerDistribution,
    DEFAULT_MAX_OUTCOMES_PER_DISTRIBUTION,
    'options.maxOutcomesPerDistribution'
  );
  if (typeof maxOutcomesPerDistribution !== 'number') return maxOutcomesPerDistribution;
  return {
    probabilityTolerance,
    selectionTolerance,
    maxCandidates,
    maxDesigns,
    maxOutcomesPerDistribution
  };
}

function isResolvedOptionsFailure(
  value: ResolvedOptions | FiniteObservationDesignFailureResult
): value is FiniteObservationDesignFailureResult {
  return 'ok' in value && value.ok === false;
}

function canonicalCandidateIds(
  candidates: FiniteObservationDesignCandidate[],
  options: ResolvedOptions
): string[] | FiniteObservationDesignFailureResult {
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return failure('invalid_candidate_family', 'At least two candidates are required', {
      path: 'request.candidates'
    });
  }
  if (candidates.length > options.maxCandidates) {
    return failure(
      'candidate_count_exceeds_limit',
      `Candidate count exceeds maxCandidates=${options.maxCandidates}`,
      { path: 'request.candidates' }
    );
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate === undefined || typeof candidate.candidateId !== 'string') {
      return failure('invalid_candidate_family', 'Every candidate requires a string candidateId', {
        path: `request.candidates[${index}].candidateId`
      });
    }
    const candidateId = candidate.candidateId.trim();
    if (candidateId.length === 0) {
      return failure('invalid_candidate_family', 'candidateId must not be empty', {
        path: `request.candidates[${index}].candidateId`
      });
    }
    if (seen.has(candidateId)) {
      return failure('duplicate_candidate_id', `Duplicate candidateId: ${candidateId}`, {
        path: `request.candidates[${index}].candidateId`,
        candidateId
      });
    }
    seen.add(candidateId);
    ids.push(candidateId);
  }
  return ids.sort(compareStrings);
}

function canonicalOutcomes(
  outcomes: FiniteObservationOutcomeProbability[],
  options: ResolvedOptions,
  designId: string,
  candidateId: string,
  path: string
): FiniteObservationOutcomeProbability[] | FiniteObservationDesignFailureResult {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return failure('invalid_outcome_distribution', 'Every candidate distribution requires outcomes', {
      path,
      designId,
      candidateId
    });
  }
  if (outcomes.length > options.maxOutcomesPerDistribution) {
    return failure(
      'outcome_count_exceeds_limit',
      `Outcome count exceeds maxOutcomesPerDistribution=${options.maxOutcomesPerDistribution}`,
      { path, designId, candidateId }
    );
  }
  const seen = new Set<string>();
  const canonical: FiniteObservationOutcomeProbability[] = [];
  let total = 0;
  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];
    if (outcome === undefined || typeof outcome.outcomeId !== 'string') {
      return failure('invalid_outcome_distribution', 'Every outcome requires a string outcomeId', {
        path: `${path}[${index}].outcomeId`, designId, candidateId
      });
    }
    const outcomeId = outcome.outcomeId.trim();
    if (outcomeId.length === 0) {
      return failure('invalid_outcome_distribution', 'outcomeId must not be empty', {
        path: `${path}[${index}].outcomeId`, designId, candidateId
      });
    }
    if (seen.has(outcomeId)) {
      return failure('duplicate_outcome_id', `Duplicate outcomeId ${outcomeId}`, {
        path: `${path}[${index}].outcomeId`, designId, candidateId, outcomeId
      });
    }
    if (!Number.isFinite(outcome.probability) || outcome.probability < 0) {
      return failure(
        'invalid_outcome_distribution',
        `Outcome probability must be finite and non-negative for ${outcomeId}`,
        { path: `${path}[${index}].probability`, designId, candidateId, outcomeId }
      );
    }
    seen.add(outcomeId);
    total += outcome.probability;
    canonical.push({ outcomeId, probability: outcome.probability });
  }
  if (!Number.isFinite(total)) {
    return failure('invalid_outcome_distribution', 'Outcome probability total became non-finite', {
      path, designId, candidateId
    });
  }
  if (Math.abs(total - 1) > options.probabilityTolerance) {
    return failure(
      'distribution_total_invalid',
      `Outcome probability total must equal 1 within probabilityTolerance; got ${total}`,
      { path, designId, candidateId }
    );
  }
  return canonical.sort((left, right) => compareStrings(left.outcomeId, right.outcomeId));
}

function canonicalDesigns(
  designs: FiniteObservationDesign[],
  candidateIds: string[],
  options: ResolvedOptions
): CanonicalDesign[] | FiniteObservationDesignFailureResult {
  if (!Array.isArray(designs) || designs.length === 0) {
    return failure('invalid_design_set', 'At least one observation design is required', {
      path: 'request.designs'
    });
  }
  if (designs.length > options.maxDesigns) {
    return failure(
      'design_count_exceeds_limit',
      `Design count exceeds maxDesigns=${options.maxDesigns}`,
      { path: 'request.designs' }
    );
  }
  const knownCandidates = new Set(candidateIds);
  const seenDesigns = new Set<string>();
  const canonicalDesignsResult: CanonicalDesign[] = [];

  for (let designIndex = 0; designIndex < designs.length; designIndex += 1) {
    const design = designs[designIndex];
    if (design === undefined || typeof design.designId !== 'string') {
      return failure('invalid_design_set', 'Every design requires a string designId', {
        path: `request.designs[${designIndex}].designId`
      });
    }
    const designId = design.designId.trim();
    if (designId.length === 0) {
      return failure('invalid_design_set', 'designId must not be empty', {
        path: `request.designs[${designIndex}].designId`
      });
    }
    if (seenDesigns.has(designId)) {
      return failure('duplicate_design_id', `Duplicate designId: ${designId}`, {
        path: `request.designs[${designIndex}].designId`, designId
      });
    }
    seenDesigns.add(designId);
    if (!Array.isArray(design.candidateDistributions)) {
      return failure('invalid_candidate_distribution', 'candidateDistributions must be an array', {
        path: `request.designs[${designIndex}].candidateDistributions`, designId
      });
    }

    const seenCandidates = new Set<string>();
    const distributions: CanonicalDistribution[] = [];
    for (
      let distributionIndex = 0;
      distributionIndex < design.candidateDistributions.length;
      distributionIndex += 1
    ) {
      const distribution = design.candidateDistributions[distributionIndex];
      const basePath = `request.designs[${designIndex}].candidateDistributions[${distributionIndex}]`;
      if (distribution === undefined || typeof distribution.candidateId !== 'string') {
        return failure('invalid_candidate_distribution', 'Every distribution requires candidateId', {
          path: `${basePath}.candidateId`, designId
        });
      }
      const candidateId = distribution.candidateId.trim();
      if (!knownCandidates.has(candidateId)) {
        return failure(
          'invalid_candidate_distribution',
          `Design ${designId} references unknown candidateId ${candidateId}`,
          { path: `${basePath}.candidateId`, designId, candidateId }
        );
      }
      if (seenCandidates.has(candidateId)) {
        return failure(
          'duplicate_candidate_distribution',
          `Design ${designId} contains duplicate distribution for ${candidateId}`,
          { path: `${basePath}.candidateId`, designId, candidateId }
        );
      }
      seenCandidates.add(candidateId);
      const outcomes = canonicalOutcomes(
        distribution.outcomes,
        options,
        designId,
        candidateId,
        `${basePath}.outcomes`
      );
      if (!Array.isArray(outcomes)) return outcomes;
      distributions.push({ candidateId, outcomes });
    }

    for (const candidateId of candidateIds) {
      if (!seenCandidates.has(candidateId)) {
        return failure(
          'missing_candidate_distribution',
          `Design ${designId} is missing distribution for ${candidateId}`,
          { path: `request.designs[${designIndex}].candidateDistributions`, designId, candidateId }
        );
      }
    }
    if (seenCandidates.size !== candidateIds.length) {
      return failure(
        'invalid_candidate_distribution',
        `Design ${designId} must contain exactly one distribution for every candidate`,
        { path: `request.designs[${designIndex}].candidateDistributions`, designId }
      );
    }
    canonicalDesignsResult.push({
      designId,
      candidateDistributions: distributions.sort((left, right) =>
        compareStrings(left.candidateId, right.candidateId)
      )
    });
  }

  return canonicalDesignsResult.sort((left, right) => compareStrings(left.designId, right.designId));
}

function totalVariationDistance(
  left: CanonicalDistribution,
  right: CanonicalDistribution,
  options: ResolvedOptions,
  designId: string
): number | FiniteObservationDesignFailureResult {
  const leftMap = new Map(left.outcomes.map((entry) => [entry.outcomeId, entry.probability] as const));
  const rightMap = new Map(right.outcomes.map((entry) => [entry.outcomeId, entry.probability] as const));
  const support = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort(compareStrings);
  let l1 = 0;
  for (const outcomeId of support) {
    l1 += Math.abs((leftMap.get(outcomeId) ?? 0) - (rightMap.get(outcomeId) ?? 0));
  }
  const raw = 0.5 * l1;
  if (!Number.isFinite(raw) || raw < 0 || raw > 1 + options.probabilityTolerance) {
    return failure(
      'non_finite_analytical_result',
      `Pairwise total-variation distance is outside the finite probability boundary: ${raw}`,
      { designId }
    );
  }
  return raw > 1 ? 1 : raw;
}

function evaluateDesign(
  design: CanonicalDesign,
  options: ResolvedOptions
): Omit<FiniteObservationDesignEvaluation, 'scoreDeltaFromBest' | 'maximinOptimal'> |
  FiniteObservationDesignFailureResult {
  const pairwiseSeparations: FiniteObservationDesignPairwiseSeparation[] = [];
  for (let leftIndex = 0; leftIndex < design.candidateDistributions.length; leftIndex += 1) {
    const left = design.candidateDistributions[leftIndex];
    if (left === undefined) continue;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < design.candidateDistributions.length;
      rightIndex += 1
    ) {
      const right = design.candidateDistributions[rightIndex];
      if (right === undefined) continue;
      const distance = totalVariationDistance(left, right, options, design.designId);
      if (typeof distance !== 'number') return distance;
      pairwiseSeparations.push({
        leftCandidateId: left.candidateId,
        rightCandidateId: right.candidateId,
        totalVariationDistance: distance
      });
    }
  }
  const worstCaseSeparation = Math.min(
    ...pairwiseSeparations.map((entry) => entry.totalVariationDistance)
  );
  if (!Number.isFinite(worstCaseSeparation)) {
    return failure(
      'non_finite_analytical_result',
      `Worst-case separation became non-finite for design ${design.designId}`,
      { designId: design.designId }
    );
  }
  const worstCasePairs = pairwiseSeparations
    .filter(
      (entry) =>
        Math.abs(entry.totalVariationDistance - worstCaseSeparation) <= options.selectionTolerance
    )
    .map((entry) => ({ ...entry }));
  return {
    designId: design.designId,
    pairwiseSeparations,
    worstCaseSeparation,
    worstCaseClassification:
      worstCaseSeparation === 0
        ? 'zero_worst_case_separation'
        : 'positive_worst_case_separation',
    worstCasePairs
  };
}

function isEvaluationFailure(
  value:
    | Omit<FiniteObservationDesignEvaluation, 'scoreDeltaFromBest' | 'maximinOptimal'>
    | FiniteObservationDesignFailureResult
): value is FiniteObservationDesignFailureResult {
  return 'ok' in value && value.ok === false;
}

export function selectFiniteObservationDesigns(
  request: FiniteObservationDesignRequest,
  options: FiniteObservationDesignOptions = {}
): FiniteObservationDesignResult {
  const resolved = resolveOptions(options);
  if (isResolvedOptionsFailure(resolved)) return resolved;
  const candidateIds = canonicalCandidateIds(request.candidates, resolved);
  if (!Array.isArray(candidateIds)) return candidateIds;
  const designs = canonicalDesigns(request.designs, candidateIds, resolved);
  if (!Array.isArray(designs)) return designs;

  const preliminary: Array<
    Omit<FiniteObservationDesignEvaluation, 'scoreDeltaFromBest' | 'maximinOptimal'>
  > = [];
  for (const design of designs) {
    const evaluated = evaluateDesign(design, resolved);
    if (isEvaluationFailure(evaluated)) return evaluated;
    preliminary.push(evaluated);
  }
  const bestWorstCaseSeparation = Math.max(
    ...preliminary.map((entry) => entry.worstCaseSeparation)
  );
  if (!Number.isFinite(bestWorstCaseSeparation)) {
    return failure('non_finite_analytical_result', 'Best design score became non-finite');
  }

  const evaluations: FiniteObservationDesignEvaluation[] = preliminary.map((entry) => {
    const delta = entry.worstCaseSeparation - bestWorstCaseSeparation;
    if (!Number.isFinite(delta)) {
      throw new Error(`Candidate I internal non-finite design delta for ${entry.designId}`);
    }
    return {
      ...entry,
      scoreDeltaFromBest: delta,
      maximinOptimal: Math.abs(delta) <= resolved.selectionTolerance
    };
  });
  const selectedDesignIds = evaluations
    .filter((entry) => entry.maximinOptimal)
    .map((entry) => entry.designId);
  const classification: FiniteObservationDesignSelectionClassification =
    selectedDesignIds.length === 1 ? 'unique_maximin_design' : 'tied_maximin_design';

  return {
    ok: true,
    classification,
    evaluations,
    bestWorstCaseSeparation,
    selectedDesignIds,
    diagnostics: {
      method: 'finite_categorical_total_variation_maximin_design_selection',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      inputNormalizationApplied: false,
      candidatePriorUsed: false,
      candidatePosteriorComputed: false,
      mutualInformationUsed: false,
      adaptiveDesignUsed: false,
      automaticDesignGenerationUsed: false,
      observationCostOptimizationUsed: false,
      globalStructuralIdentifiabilityClaimed: false,
      guaranteedSingleObservationIdentificationClaimed: false,
      rankingBasis: 'maximum_minimum_pairwise_total_variation',
      missingSparseOutcomeMassInterpretation: 'zero_probability',
      candidateOrderAffectsSelection: false,
      designOrderAffectsSelection: false,
      outcomeOrderAffectsSelection: false,
      probabilityTolerance: resolved.probabilityTolerance,
      selectionTolerance: resolved.selectionTolerance,
      maxCandidates: resolved.maxCandidates,
      maxDesigns: resolved.maxDesigns,
      maxOutcomesPerDistribution: resolved.maxOutcomesPerDistribution,
      candidateCount: candidateIds.length,
      designCount: designs.length
    }
  };
}

type NonFiniteNumberLocation = { path: string; value: number };

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? undefined : { path, value };
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findNonFiniteNumber(value[index], `${path}[${index}]`);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const found = findNonFiniteNumber(nested, `${path}.${key}`);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function finiteObservationDesignResultToJson(result: FiniteObservationDesignResult): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite observation design result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
