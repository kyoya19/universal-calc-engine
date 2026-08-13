import { DefinitionModel, StateId } from './model';
import { HiddenObservationKernelEntry } from './hidden_state_observation';
import {
  FiniteHiddenObservationCandidate,
  HiddenObservationCandidateInferenceFailure,
  inferFiniteHiddenObservationCandidates
} from './hidden_observation_candidate_inference';
import {
  FiniteFirstPassageCandidate,
  FirstPassageCandidateInferenceFailure,
  inferFiniteFirstPassageCandidates
} from './first_passage_candidate_inference';

export type EvidenceBundleCandidateValue = string | number | boolean | null;

export type FiniteEvidenceBundleCandidate = {
  candidateId: string;
  value?: EvidenceBundleCandidateValue;
};

export type HiddenObservationEvidenceCandidateBinding = {
  candidateId: string;
  model: DefinitionModel;
  initialDistribution: Array<{ stateId: StateId; probability: number }>;
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
};

export type FirstPassageEvidenceCandidateBinding = {
  candidateId: string;
  model: DefinitionModel;
  initialDistribution: Array<{ stateId: StateId; probability: number }>;
  targetStates: StateId[];
};

export type HiddenObservationEvidenceBlock = {
  blockId: string;
  kind: 'hidden_observation_sequence';
  observations: string[];
  candidates: HiddenObservationEvidenceCandidateBinding[];
};

export type FirstPassageExactHitEvidenceBlock = {
  blockId: string;
  kind: 'first_passage_exact_hit';
  step: number;
  candidates: FirstPassageEvidenceCandidateBinding[];
};

export type FirstPassageNotHitEvidenceBlock = {
  blockId: string;
  kind: 'first_passage_not_hit_by_horizon';
  horizon: number;
  candidates: FirstPassageEvidenceCandidateBinding[];
};

export type FiniteIndependentEvidenceBlock =
  | HiddenObservationEvidenceBlock
  | FirstPassageExactHitEvidenceBlock
  | FirstPassageNotHitEvidenceBlock;

export type EvidenceBundleIndependenceAssumption =
  'evidence_blocks_conditionally_independent_given_candidate';

export type FiniteIndependentEvidenceBundleInferenceRequest = {
  candidates: FiniteEvidenceBundleCandidate[];
  evidenceBlocks: FiniteIndependentEvidenceBlock[];
  independenceAssumption: EvidenceBundleIndependenceAssumption;
};

export type FiniteIndependentEvidenceBundleInferenceOptions = {
  probabilityTolerance?: number;
  comparisonTolerance?: number;
  maxCandidates?: number;
  maxEvidenceBlocks?: number;
  maxObservationsPerBlock?: number;
  maxHorizon?: number;
};

export type EvidenceBundleInferenceFailureCode =
  | 'invalid_options'
  | 'invalid_independence_assumption'
  | 'invalid_candidate_family'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_candidate_value'
  | 'invalid_evidence_bundle'
  | 'duplicate_block_id'
  | 'evidence_block_count_exceeds_limit'
  | 'invalid_block_candidate_bindings'
  | 'block_evaluation_failed'
  | 'non_finite_analytical_result';

export type EvidenceBundleInferenceFailure = {
  code: EvidenceBundleInferenceFailureCode;
  message: string;
  path?: string;
  blockId?: string;
  candidateId?: string;
  hiddenObservationFailure?: HiddenObservationCandidateInferenceFailure;
  firstPassageFailure?: FirstPassageCandidateInferenceFailure;
};

export type EvidenceBundleBlockKind = FiniteIndependentEvidenceBlock['kind'];

export type EvidenceBundleBlockLikelihood = {
  blockId: string;
  kind: EvidenceBundleBlockKind;
  possible: boolean;
  logLikelihood: number | null;
  directProbability: number | null;
  directProbabilityUnderflowed: boolean;
};

export type EvidenceBundleCandidateLikelihood = {
  candidateId: string;
  value?: EvidenceBundleCandidateValue;
  possible: boolean;
  totalLogLikelihood: number | null;
  jointProbability: number | null;
  jointProbabilityUnderflowed: boolean;
  impossibleBlockIds: string[];
  blockLikelihoods: EvidenceBundleBlockLikelihood[];
  logLikelihoodDeltaFromBest: number | null;
  maximumLikelihood: boolean;
};

export type EvidenceBundleCandidateSelection = {
  candidateId: string;
  value?: EvidenceBundleCandidateValue;
};

export type EvidenceBundleInferenceClassification =
  | 'unique_maximum_likelihood'
  | 'tied_maximum_likelihood'
  | 'all_candidates_impossible';

export type FiniteIndependentEvidenceBundleInferenceDiagnostics = {
  method: 'finite_independent_evidence_bundle_log_likelihood_comparison';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  rankingBasis: 'sum_of_finite_log_likelihoods';
  independenceAssumption: EvidenceBundleIndependenceAssumption;
  independenceEmpiricallyVerified: false;
  arbitraryEvidenceWeightsApplied: false;
  posteriorNormalizationApplied: false;
  candidatePriorUsed: false;
  candidatePosteriorComputed: false;
  globalModelIdentificationClaimed: false;
  sameTrajectoryJointLikelihoodClaimed: false;
  candidateOrderAffectsSelection: false;
  evidenceBlockOrderAffectsSelection: false;
  probabilityTolerance: number;
  comparisonTolerance: number;
  maxCandidates: number;
  maxEvidenceBlocks: number;
  maxObservationsPerBlock: number;
  maxHorizon: number;
  candidateCount: number;
  evidenceBlockCount: number;
  hiddenObservationBlockCount: number;
  firstPassageBlockCount: number;
  possibleCandidateCount: number;
  impossibleCandidateCount: number;
};

export type FiniteIndependentEvidenceBundleInferenceSuccess = {
  ok: true;
  independenceAssumption: EvidenceBundleIndependenceAssumption;
  evidenceBlockIds: string[];
  classification: EvidenceBundleInferenceClassification;
  evaluations: EvidenceBundleCandidateLikelihood[];
  bestLogLikelihood: number | null;
  selectedCandidateIds: string[];
  selectedCandidates: EvidenceBundleCandidateSelection[];
  diagnostics: FiniteIndependentEvidenceBundleInferenceDiagnostics;
};

export type FiniteIndependentEvidenceBundleInferenceFailure = {
  ok: false;
  failure: EvidenceBundleInferenceFailure;
};

export type FiniteIndependentEvidenceBundleInferenceResult =
  | FiniteIndependentEvidenceBundleInferenceSuccess
  | FiniteIndependentEvidenceBundleInferenceFailure;

const INDEPENDENCE_ASSUMPTION: EvidenceBundleIndependenceAssumption =
  'evidence_blocks_conditionally_independent_given_candidate';
const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_COMPARISON_TOLERANCE = 1e-12;
const DEFAULT_MAX_CANDIDATES = 1_000;
const DEFAULT_MAX_EVIDENCE_BLOCKS = 1_000;
const DEFAULT_MAX_OBSERVATIONS_PER_BLOCK = 10_000;
const DEFAULT_MAX_HORIZON = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  comparisonTolerance: number;
  maxCandidates: number;
  maxEvidenceBlocks: number;
  maxObservationsPerBlock: number;
  maxHorizon: number;
};

type PreliminaryCandidateEvaluation = Omit<
  EvidenceBundleCandidateLikelihood,
  'logLikelihoodDeltaFromBest' | 'maximumLikelihood'
>;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: EvidenceBundleInferenceFailureCode,
  message: string,
  details: Omit<EvidenceBundleInferenceFailure, 'code' | 'message'> = {}
): FiniteIndependentEvidenceBundleInferenceFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveOptions(
  options: FiniteIndependentEvidenceBundleInferenceOptions
): ResolvedOptions | FiniteIndependentEvidenceBundleInferenceFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure('invalid_options', 'probabilityTolerance must be a finite positive number', {
      path: 'options.probabilityTolerance'
    });
  }
  const comparisonTolerance = options.comparisonTolerance ?? DEFAULT_COMPARISON_TOLERANCE;
  if (!Number.isFinite(comparisonTolerance) || comparisonTolerance < 0) {
    return failure('invalid_options', 'comparisonTolerance must be a finite non-negative number', {
      path: 'options.comparisonTolerance'
    });
  }
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) {
    return failure('invalid_options', 'maxCandidates must be a positive integer', {
      path: 'options.maxCandidates'
    });
  }
  const maxEvidenceBlocks = options.maxEvidenceBlocks ?? DEFAULT_MAX_EVIDENCE_BLOCKS;
  if (!Number.isInteger(maxEvidenceBlocks) || maxEvidenceBlocks < 1) {
    return failure('invalid_options', 'maxEvidenceBlocks must be a positive integer', {
      path: 'options.maxEvidenceBlocks'
    });
  }
  const maxObservationsPerBlock =
    options.maxObservationsPerBlock ?? DEFAULT_MAX_OBSERVATIONS_PER_BLOCK;
  if (!Number.isInteger(maxObservationsPerBlock) || maxObservationsPerBlock < 1) {
    return failure('invalid_options', 'maxObservationsPerBlock must be a positive integer', {
      path: 'options.maxObservationsPerBlock'
    });
  }
  const maxHorizon = options.maxHorizon ?? DEFAULT_MAX_HORIZON;
  if (!Number.isInteger(maxHorizon) || maxHorizon < 0) {
    return failure('invalid_options', 'maxHorizon must be a non-negative integer', {
      path: 'options.maxHorizon'
    });
  }
  return {
    probabilityTolerance,
    comparisonTolerance,
    maxCandidates,
    maxEvidenceBlocks,
    maxObservationsPerBlock,
    maxHorizon
  };
}

function isResolvedOptionsFailure(
  value: ResolvedOptions | FiniteIndependentEvidenceBundleInferenceFailure
): value is FiniteIndependentEvidenceBundleInferenceFailure {
  return 'ok' in value && value.ok === false;
}

function validateJsonScalar(
  value: unknown,
  path: string,
  candidateId: string
): FiniteIndependentEvidenceBundleInferenceFailure | undefined {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return failure('invalid_candidate_value', `Candidate value must be finite: ${String(value)}`, {
      path,
      candidateId
    });
  }
  if (
    value !== undefined &&
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return failure('invalid_candidate_value', 'Candidate value must be a JSON scalar', {
      path,
      candidateId
    });
  }
  return undefined;
}

function validateRequest(
  request: FiniteIndependentEvidenceBundleInferenceRequest,
  options: ResolvedOptions
): FiniteIndependentEvidenceBundleInferenceFailure | undefined {
  if (request.independenceAssumption !== INDEPENDENCE_ASSUMPTION) {
    return failure(
      'invalid_independence_assumption',
      `independenceAssumption must be ${INDEPENDENCE_ASSUMPTION}`,
      { path: 'request.independenceAssumption' }
    );
  }
  if (!Array.isArray(request.candidates) || request.candidates.length === 0) {
    return failure('invalid_candidate_family', 'candidates must be a non-empty array', {
      path: 'request.candidates'
    });
  }
  if (request.candidates.length > options.maxCandidates) {
    return failure(
      'candidate_count_exceeds_limit',
      `Candidate count ${request.candidates.length} exceeds maxCandidates ${options.maxCandidates}`,
      { path: 'request.candidates' }
    );
  }

  const candidateIds = new Set<string>();
  for (let index = 0; index < request.candidates.length; index += 1) {
    const candidate = request.candidates[index];
    if (
      candidate === undefined ||
      typeof candidate.candidateId !== 'string' ||
      candidate.candidateId.trim().length === 0
    ) {
      return failure(
        'invalid_candidate_family',
        `candidates[${index}].candidateId must be a non-empty string`,
        { path: `request.candidates[${index}].candidateId` }
      );
    }
    if (candidateIds.has(candidate.candidateId)) {
      return failure('duplicate_candidate_id', `Duplicate candidateId: ${candidate.candidateId}`, {
        path: `request.candidates[${index}].candidateId`,
        candidateId: candidate.candidateId
      });
    }
    candidateIds.add(candidate.candidateId);
    const invalidValue = validateJsonScalar(
      candidate.value,
      `request.candidates[${index}].value`,
      candidate.candidateId
    );
    if (invalidValue !== undefined) return invalidValue;
  }

  if (!Array.isArray(request.evidenceBlocks) || request.evidenceBlocks.length === 0) {
    return failure('invalid_evidence_bundle', 'evidenceBlocks must be a non-empty array', {
      path: 'request.evidenceBlocks'
    });
  }
  if (request.evidenceBlocks.length > options.maxEvidenceBlocks) {
    return failure(
      'evidence_block_count_exceeds_limit',
      `Evidence block count ${request.evidenceBlocks.length} exceeds maxEvidenceBlocks ${options.maxEvidenceBlocks}`,
      { path: 'request.evidenceBlocks' }
    );
  }

  const blockIds = new Set<string>();
  for (let blockIndex = 0; blockIndex < request.evidenceBlocks.length; blockIndex += 1) {
    const block = request.evidenceBlocks[blockIndex];
    if (
      block === undefined ||
      typeof block.blockId !== 'string' ||
      block.blockId.trim().length === 0
    ) {
      return failure(
        'invalid_evidence_bundle',
        `evidenceBlocks[${blockIndex}].blockId must be a non-empty string`,
        { path: `request.evidenceBlocks[${blockIndex}].blockId` }
      );
    }
    if (blockIds.has(block.blockId)) {
      return failure('duplicate_block_id', `Duplicate blockId: ${block.blockId}`, {
        path: `request.evidenceBlocks[${blockIndex}].blockId`,
        blockId: block.blockId
      });
    }
    blockIds.add(block.blockId);

    if (
      block.kind !== 'hidden_observation_sequence' &&
      block.kind !== 'first_passage_exact_hit' &&
      block.kind !== 'first_passage_not_hit_by_horizon'
    ) {
      return failure(
        'invalid_evidence_bundle',
        `Unsupported evidence block kind: ${String((block as { kind?: unknown }).kind)}`,
        {
          path: `request.evidenceBlocks[${blockIndex}].kind`,
          blockId: (block as unknown as { blockId: string }).blockId
        }
      );
    }
    if (!Array.isArray(block.candidates)) {
      return failure('invalid_block_candidate_bindings', 'Block candidates must be an array', {
        path: `request.evidenceBlocks[${blockIndex}].candidates`,
        blockId: block.blockId
      });
    }

    const bindingIds = new Set<string>();
    for (let bindingIndex = 0; bindingIndex < block.candidates.length; bindingIndex += 1) {
      const binding = block.candidates[bindingIndex];
      const candidateId = binding?.candidateId;
      if (typeof candidateId !== 'string' || candidateId.trim().length === 0) {
        return failure('invalid_block_candidate_bindings', 'Block candidateId must be a non-empty string', {
          path: `request.evidenceBlocks[${blockIndex}].candidates[${bindingIndex}].candidateId`,
          blockId: block.blockId
        });
      }
      if (!candidateIds.has(candidateId)) {
        return failure(
          'invalid_block_candidate_bindings',
          `Unknown candidateId in block ${block.blockId}: ${candidateId}`,
          {
            path: `request.evidenceBlocks[${blockIndex}].candidates[${bindingIndex}].candidateId`,
            blockId: block.blockId,
            candidateId
          }
        );
      }
      if (bindingIds.has(candidateId)) {
        return failure(
          'invalid_block_candidate_bindings',
          `Duplicate candidateId in block ${block.blockId}: ${candidateId}`,
          {
            path: `request.evidenceBlocks[${blockIndex}].candidates[${bindingIndex}].candidateId`,
            blockId: block.blockId,
            candidateId
          }
        );
      }
      bindingIds.add(candidateId);
    }

    if (bindingIds.size !== candidateIds.size) {
      const missing = [...candidateIds]
        .filter((candidateId) => !bindingIds.has(candidateId))
        .sort(compareStrings);
      return failure(
        'invalid_block_candidate_bindings',
        `Block ${block.blockId} must bind every candidate exactly once; missing: ${missing.join(', ')}`,
        { path: `request.evidenceBlocks[${blockIndex}].candidates`, blockId: block.blockId }
      );
    }
  }
  return undefined;
}

function toHiddenCandidates(
  block: HiddenObservationEvidenceBlock,
  valuesByCandidateId: Map<string, EvidenceBundleCandidateValue | undefined>
): FiniteHiddenObservationCandidate[] {
  return block.candidates.map((binding) => {
    const value = valuesByCandidateId.get(binding.candidateId);
    return {
      candidateId: binding.candidateId,
      model: binding.model,
      initialDistribution: binding.initialDistribution,
      alphabet: binding.alphabet,
      kernel: binding.kernel,
      ...(value !== undefined ? { value } : {})
    };
  });
}

function toFirstPassageCandidates(
  block: FirstPassageExactHitEvidenceBlock | FirstPassageNotHitEvidenceBlock,
  valuesByCandidateId: Map<string, EvidenceBundleCandidateValue | undefined>
): FiniteFirstPassageCandidate[] {
  return block.candidates.map((binding) => {
    const value = valuesByCandidateId.get(binding.candidateId);
    return {
      candidateId: binding.candidateId,
      model: binding.model,
      initialDistribution: binding.initialDistribution,
      targetStates: binding.targetStates,
      ...(value !== undefined ? { value } : {})
    };
  });
}

function evaluateBlock(
  block: FiniteIndependentEvidenceBlock,
  valuesByCandidateId: Map<string, EvidenceBundleCandidateValue | undefined>,
  options: ResolvedOptions
): Map<string, EvidenceBundleBlockLikelihood> | FiniteIndependentEvidenceBundleInferenceFailure {
  if (block.kind === 'hidden_observation_sequence') {
    const result = inferFiniteHiddenObservationCandidates(
      {
        candidates: toHiddenCandidates(block, valuesByCandidateId),
        observations: block.observations
      },
      {
        probabilityTolerance: options.probabilityTolerance,
        comparisonTolerance: options.comparisonTolerance,
        maxCandidates: options.maxCandidates,
        maxObservations: options.maxObservationsPerBlock
      }
    );
    if (!result.ok) {
      return failure(
        'block_evaluation_failed',
        `Evidence block ${block.blockId} failed hidden-observation evaluation: ${result.failure.message}`,
        {
          blockId: block.blockId,
          ...(result.failure.candidateId !== undefined
            ? { candidateId: result.failure.candidateId }
            : {}),
          hiddenObservationFailure: result.failure
        }
      );
    }
    return new Map(
      result.evaluations.map((evaluation) => [
        evaluation.candidateId,
        {
          blockId: block.blockId,
          kind: block.kind,
          possible: evaluation.possible,
          logLikelihood: evaluation.logLikelihood,
          directProbability: evaluation.sequenceProbability,
          directProbabilityUnderflowed: evaluation.sequenceProbabilityUnderflowed
        }
      ])
    );
  }

  const observation =
    block.kind === 'first_passage_exact_hit'
      ? ({ kind: 'exact_hit_at_step', step: block.step } as const)
      : ({ kind: 'not_hit_by_horizon', horizon: block.horizon } as const);
  const result = inferFiniteFirstPassageCandidates(
    {
      candidates: toFirstPassageCandidates(block, valuesByCandidateId),
      observation
    },
    {
      probabilityTolerance: options.probabilityTolerance,
      comparisonTolerance: options.comparisonTolerance,
      maxCandidates: options.maxCandidates,
      maxHorizon: options.maxHorizon
    }
  );
  if (!result.ok) {
    return failure(
      'block_evaluation_failed',
      `Evidence block ${block.blockId} failed first-passage evaluation: ${result.failure.message}`,
      {
        blockId: block.blockId,
        ...(result.failure.candidateId !== undefined
          ? { candidateId: result.failure.candidateId }
          : {}),
        firstPassageFailure: result.failure
      }
    );
  }
  return new Map(
    result.evaluations.map((evaluation) => [
      evaluation.candidateId,
      {
        blockId: block.blockId,
        kind: block.kind,
        possible: evaluation.possible,
        logLikelihood: evaluation.logLikelihood,
        directProbability: evaluation.eventProbability,
        directProbabilityUnderflowed: evaluation.eventProbabilityUnderflowed
      }
    ])
  );
}

function isBlockFailure(
  value: Map<string, EvidenceBundleBlockLikelihood> | FiniteIndependentEvidenceBundleInferenceFailure
): value is FiniteIndependentEvidenceBundleInferenceFailure {
  return 'ok' in value && value.ok === false;
}

export function inferFiniteIndependentEvidenceBundleCandidates(
  request: FiniteIndependentEvidenceBundleInferenceRequest,
  options: FiniteIndependentEvidenceBundleInferenceOptions = {}
): FiniteIndependentEvidenceBundleInferenceResult {
  const resolved = resolveOptions(options);
  if (isResolvedOptionsFailure(resolved)) return resolved;
  const invalidRequest = validateRequest(request, resolved);
  if (invalidRequest !== undefined) return invalidRequest;

  const candidates = [...request.candidates].sort((left, right) =>
    compareStrings(left.candidateId, right.candidateId)
  );
  const blocks = [...request.evidenceBlocks].sort((left, right) =>
    compareStrings(left.blockId, right.blockId)
  );
  const valuesByCandidateId = new Map(
    candidates.map((candidate) => [candidate.candidateId, candidate.value] as const)
  );
  const blockEvaluations = new Map<string, Map<string, EvidenceBundleBlockLikelihood>>();

  for (const block of blocks) {
    const evaluated = evaluateBlock(block, valuesByCandidateId, resolved);
    if (isBlockFailure(evaluated)) return evaluated;
    blockEvaluations.set(block.blockId, evaluated);
  }

  const preliminary: PreliminaryCandidateEvaluation[] = [];
  for (const candidate of candidates) {
    const blockLikelihoods: EvidenceBundleBlockLikelihood[] = [];
    const impossibleBlockIds: string[] = [];
    let totalLogLikelihood = 0;

    for (const block of blocks) {
      const blockResult = blockEvaluations.get(block.blockId)?.get(candidate.candidateId);
      if (blockResult === undefined) {
        return failure(
          'non_finite_analytical_result',
          `Missing block evaluation for candidate ${candidate.candidateId} in block ${block.blockId}`,
          { candidateId: candidate.candidateId, blockId: block.blockId }
        );
      }
      blockLikelihoods.push(blockResult);
      if (!blockResult.possible) {
        impossibleBlockIds.push(block.blockId);
        continue;
      }
      if (blockResult.logLikelihood === null || !Number.isFinite(blockResult.logLikelihood)) {
        return failure(
          'non_finite_analytical_result',
          `Possible block ${block.blockId} produced invalid log likelihood for candidate ${candidate.candidateId}`,
          { candidateId: candidate.candidateId, blockId: block.blockId }
        );
      }
      totalLogLikelihood += blockResult.logLikelihood;
      if (!Number.isFinite(totalLogLikelihood)) {
        return failure(
          'non_finite_analytical_result',
          `Total log likelihood became non-finite for candidate ${candidate.candidateId}`,
          { candidateId: candidate.candidateId, blockId: block.blockId }
        );
      }
    }

    const possible = impossibleBlockIds.length === 0;
    const finalLogLikelihood = possible ? totalLogLikelihood : null;
    const jointProbability = possible ? Math.exp(totalLogLikelihood) : null;
    if (jointProbability !== null && (!Number.isFinite(jointProbability) || jointProbability < 0)) {
      return failure(
        'non_finite_analytical_result',
        `Joint probability became invalid for candidate ${candidate.candidateId}`,
        { candidateId: candidate.candidateId }
      );
    }

    preliminary.push({
      candidateId: candidate.candidateId,
      ...(candidate.value !== undefined ? { value: candidate.value } : {}),
      possible,
      totalLogLikelihood: finalLogLikelihood,
      jointProbability,
      jointProbabilityUnderflowed: possible && jointProbability === 0,
      impossibleBlockIds,
      blockLikelihoods
    });
  }

  const possible = preliminary.filter(
    (entry): entry is PreliminaryCandidateEvaluation & { totalLogLikelihood: number } =>
      entry.possible && entry.totalLogLikelihood !== null
  );
  let bestLogLikelihood: number | null = null;
  if (possible.length > 0) {
    bestLogLikelihood = Math.max(...possible.map((entry) => entry.totalLogLikelihood));
    if (!Number.isFinite(bestLogLikelihood)) {
      return failure('non_finite_analytical_result', 'Best total log likelihood became non-finite');
    }
  }

  const evaluations: EvidenceBundleCandidateLikelihood[] = [];
  for (const entry of preliminary) {
    if (!entry.possible || entry.totalLogLikelihood === null || bestLogLikelihood === null) {
      evaluations.push({ ...entry, logLikelihoodDeltaFromBest: null, maximumLikelihood: false });
      continue;
    }
    const delta = entry.totalLogLikelihood - bestLogLikelihood;
    if (!Number.isFinite(delta)) {
      return failure(
        'non_finite_analytical_result',
        `Candidate log-likelihood delta became non-finite for ${entry.candidateId}`,
        { candidateId: entry.candidateId }
      );
    }
    evaluations.push({
      ...entry,
      logLikelihoodDeltaFromBest: delta,
      maximumLikelihood: Math.abs(delta) <= resolved.comparisonTolerance
    });
  }

  const selected = evaluations.filter((entry) => entry.maximumLikelihood);
  const classification: EvidenceBundleInferenceClassification =
    possible.length === 0
      ? 'all_candidates_impossible'
      : selected.length === 1
        ? 'unique_maximum_likelihood'
        : 'tied_maximum_likelihood';
  const hiddenObservationBlockCount = blocks.filter(
    (block) => block.kind === 'hidden_observation_sequence'
  ).length;

  return {
    ok: true,
    independenceAssumption: INDEPENDENCE_ASSUMPTION,
    evidenceBlockIds: blocks.map((block) => block.blockId),
    classification,
    evaluations,
    bestLogLikelihood,
    selectedCandidateIds: selected.map((entry) => entry.candidateId),
    selectedCandidates: selected.map((entry) => ({
      candidateId: entry.candidateId,
      ...(entry.value !== undefined ? { value: entry.value } : {})
    })),
    diagnostics: {
      method: 'finite_independent_evidence_bundle_log_likelihood_comparison',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      rankingBasis: 'sum_of_finite_log_likelihoods',
      independenceAssumption: INDEPENDENCE_ASSUMPTION,
      independenceEmpiricallyVerified: false,
      arbitraryEvidenceWeightsApplied: false,
      posteriorNormalizationApplied: false,
      candidatePriorUsed: false,
      candidatePosteriorComputed: false,
      globalModelIdentificationClaimed: false,
      sameTrajectoryJointLikelihoodClaimed: false,
      candidateOrderAffectsSelection: false,
      evidenceBlockOrderAffectsSelection: false,
      probabilityTolerance: resolved.probabilityTolerance,
      comparisonTolerance: resolved.comparisonTolerance,
      maxCandidates: resolved.maxCandidates,
      maxEvidenceBlocks: resolved.maxEvidenceBlocks,
      maxObservationsPerBlock: resolved.maxObservationsPerBlock,
      maxHorizon: resolved.maxHorizon,
      candidateCount: candidates.length,
      evidenceBlockCount: blocks.length,
      hiddenObservationBlockCount,
      firstPassageBlockCount: blocks.length - hiddenObservationBlockCount,
      possibleCandidateCount: possible.length,
      impossibleCandidateCount: candidates.length - possible.length
    }
  };
}

type NonFiniteNumberLocation = { path: string; value: number };

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : { path, value };
  }
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

export function finiteIndependentEvidenceBundleInferenceResultToJson(
  result: FiniteIndependentEvidenceBundleInferenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite independent evidence-bundle inference result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}