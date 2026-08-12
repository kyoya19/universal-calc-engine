import {
  ExternalInputIssue,
  ExternalModelDocument,
  prepareExternalModelDocument
} from './external_input';
import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHorizonStateDistributionOptions,
  FiniteHorizonStateDistributionRequest,
  StateDistributionFailure,
  propagateFiniteHorizonStateDistribution
} from './state_distribution';

export type FiniteModelFamilyCandidate = {
  candidateId: string;
  document: ExternalModelDocument;
};

export type TransitionProbabilityObservationProbe = {
  probeId: string;
  type: 'transition_probability';
  from: StateId;
  to: StateId;
};

export type StateProbabilityObservationProbe = {
  probeId: string;
  type: 'state_probability';
  initialDistribution: FiniteHorizonStateDistributionRequest['initialDistribution'];
  horizon: number;
  stateId: StateId;
};

export type ModelFamilyObservationProbe =
  | TransitionProbabilityObservationProbe
  | StateProbabilityObservationProbe;

export type FiniteModelFamilyIdentifiabilityRequest = {
  candidates: FiniteModelFamilyCandidate[];
  probes: ModelFamilyObservationProbe[];
  comparisonTolerance?: number;
  stateDistributionOptions?: FiniteHorizonStateDistributionOptions;
};

export type ModelFamilyIdentifiabilityFailureCode =
  | 'invalid_request'
  | 'invalid_candidate'
  | 'candidate_preparation_failed'
  | 'invalid_probe'
  | 'probe_evaluation_failed'
  | 'non_finite_observable_result';

export type ModelFamilyIdentifiabilityFailureStage =
  | 'request'
  | 'candidate_preparation'
  | 'probe_evaluation';

export type ModelFamilyIdentifiabilityFailure = {
  ok: false;
  stage: ModelFamilyIdentifiabilityFailureStage;
  failure: {
    code: ModelFamilyIdentifiabilityFailureCode;
    message: string;
    path?: string;
    candidateId?: string;
    probeId?: string;
    preparationStage?: string;
    preparationIssues?: ExternalInputIssue[];
    stateDistributionFailure?: StateDistributionFailure;
  };
};

export type ObservableSignatureCoordinate = {
  probeId: string;
  value: number;
};

export type CandidateObservableSignature = {
  candidateId: string;
  coordinates: ObservableSignatureCoordinate[];
};

export type PairwiseModelDistinguishability = {
  leftCandidateId: string;
  rightCandidateId: string;
  distinguished: boolean;
  maxAbsoluteDifference: number;
  witnessProbeIds: string[];
};

export type CandidateIdentifiabilityClassification = {
  candidateId: string;
  classification:
    | 'uniquely_distinguishable_within_family'
    | 'ambiguous_under_observation_design';
  unresolvedPeerCandidateIds: string[];
};

export type ModelFamilyIdentifiabilityClassification =
  | 'fully_distinguishable'
  | 'partially_distinguishable'
  | 'fully_unresolved_within_tolerance';

export type FiniteModelFamilyIdentifiabilityDiagnostics = {
  method: 'finite_observable_signature_pairwise_comparison';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  comparisonTolerance: number;
  candidateCount: number;
  probeCount: number;
  classificationScope: 'finite_family_finite_observation_design';
  globalStructuralIdentifiabilityClaimed: false;
  approximateEqualityTransitivityAssumed: false;
  terminalSemantics: 'implicit_self_retention_for_transition_and_state_probability_probes';
};

export type FiniteModelFamilyIdentifiabilitySuccess = {
  ok: true;
  signatures: CandidateObservableSignature[];
  pairwise: PairwiseModelDistinguishability[];
  candidates: CandidateIdentifiabilityClassification[];
  familyClassification: ModelFamilyIdentifiabilityClassification;
  diagnostics: FiniteModelFamilyIdentifiabilityDiagnostics;
};

export type FiniteModelFamilyIdentifiabilityResult =
  | FiniteModelFamilyIdentifiabilitySuccess
  | ModelFamilyIdentifiabilityFailure;

type PreparedCandidate = {
  candidateId: string;
  model: DefinitionModel;
};

const DEFAULT_COMPARISON_TOLERANCE = 1e-9;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  stage: ModelFamilyIdentifiabilityFailureStage,
  code: ModelFamilyIdentifiabilityFailureCode,
  message: string,
  details: Omit<ModelFamilyIdentifiabilityFailure['failure'], 'code' | 'message'> = {}
): ModelFamilyIdentifiabilityFailure {
  return {
    ok: false,
    stage,
    failure: { code, message, ...details }
  };
}

function resolveComparisonTolerance(
  request: FiniteModelFamilyIdentifiabilityRequest
): number | ModelFamilyIdentifiabilityFailure {
  const tolerance = request.comparisonTolerance ?? DEFAULT_COMPARISON_TOLERANCE;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    return failure(
      'request',
      'invalid_request',
      'comparisonTolerance must be a finite non-negative number',
      { path: 'request.comparisonTolerance' }
    );
  }
  return tolerance;
}

function validateStateDistributionOptions(
  options: FiniteHorizonStateDistributionOptions | undefined
): ModelFamilyIdentifiabilityFailure | undefined {
  if (options === undefined) return undefined;

  if (
    options.probabilityTolerance !== undefined &&
    (!Number.isFinite(options.probabilityTolerance) || options.probabilityTolerance <= 0)
  ) {
    return failure(
      'request',
      'invalid_request',
      'stateDistributionOptions.probabilityTolerance must be a finite positive number',
      { path: 'request.stateDistributionOptions.probabilityTolerance' }
    );
  }

  if (
    options.maxHorizon !== undefined &&
    (!Number.isInteger(options.maxHorizon) || options.maxHorizon < 0)
  ) {
    return failure(
      'request',
      'invalid_request',
      'stateDistributionOptions.maxHorizon must be a non-negative integer',
      { path: 'request.stateDistributionOptions.maxHorizon' }
    );
  }

  return undefined;
}

function prepareCandidates(
  candidates: FiniteModelFamilyCandidate[]
): PreparedCandidate[] | ModelFamilyIdentifiabilityFailure {
  if (!Array.isArray(candidates) || candidates.length < 2) {
    return failure(
      'request',
      'invalid_request',
      'At least two candidate models are required',
      { path: 'request.candidates' }
    );
  }

  const seen = new Set<string>();
  const prepared: PreparedCandidate[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate === undefined || typeof candidate.candidateId !== 'string') {
      return failure(
        'request',
        'invalid_candidate',
        'Every candidate requires a string candidateId',
        { path: `request.candidates[${index}].candidateId` }
      );
    }

    const candidateId = candidate.candidateId.trim();
    if (candidateId.length === 0) {
      return failure(
        'request',
        'invalid_candidate',
        'candidateId must not be empty',
        { path: `request.candidates[${index}].candidateId` }
      );
    }
    if (seen.has(candidateId)) {
      return failure(
        'request',
        'invalid_candidate',
        `Duplicate candidateId: ${candidateId}`,
        { path: `request.candidates[${index}].candidateId`, candidateId }
      );
    }
    seen.add(candidateId);

    const result = prepareExternalModelDocument(candidate.document);
    if (!result.ok) {
      return failure(
        'candidate_preparation',
        'candidate_preparation_failed',
        `Candidate ${candidateId} failed model preparation`,
        {
          path: `request.candidates[${index}].document`,
          candidateId,
          preparationStage: result.stage,
          preparationIssues: result.issues
        }
      );
    }

    prepared.push({
      candidateId,
      model: result.resolvedModel as DefinitionModel
    });
  }

  return prepared.sort((left, right) => compareStrings(left.candidateId, right.candidateId));
}

function prepareProbes(
  probes: ModelFamilyObservationProbe[]
): ModelFamilyObservationProbe[] | ModelFamilyIdentifiabilityFailure {
  if (!Array.isArray(probes) || probes.length === 0) {
    return failure(
      'request',
      'invalid_request',
      'At least one observation probe is required',
      { path: 'request.probes' }
    );
  }

  const seen = new Set<string>();
  const copied: ModelFamilyObservationProbe[] = [];
  for (let index = 0; index < probes.length; index += 1) {
    const probe = probes[index];
    if (probe === undefined || typeof probe.probeId !== 'string') {
      return failure(
        'request',
        'invalid_probe',
        'Every probe requires a string probeId',
        { path: `request.probes[${index}].probeId` }
      );
    }
    const probeId = probe.probeId.trim();
    if (probeId.length === 0) {
      return failure(
        'request',
        'invalid_probe',
        'probeId must not be empty',
        { path: `request.probes[${index}].probeId` }
      );
    }
    if (seen.has(probeId)) {
      return failure(
        'request',
        'invalid_probe',
        `Duplicate probeId: ${probeId}`,
        { path: `request.probes[${index}].probeId`, probeId }
      );
    }
    seen.add(probeId);
    copied.push({ ...probe, probeId });
  }

  return copied.sort((left, right) => compareStrings(left.probeId, right.probeId));
}

function hasState(model: DefinitionModel, stateId: StateId): boolean {
  return model.states.some((state) => state.id === stateId);
}

function transitionProbability(
  model: DefinitionModel,
  from: StateId,
  to: StateId
): number {
  const source = model.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) {
    return from === to ? 1 : 0;
  }

  let probability = 0;
  for (const transition of model.transitions) {
    if (transition.from === from && transition.to === to) {
      probability += evaluateProbabilitySpec(transition.probability);
    }
  }
  return probability;
}

function evaluateProbe(
  candidate: PreparedCandidate,
  probe: ModelFamilyObservationProbe,
  options: FiniteHorizonStateDistributionOptions | undefined
): number | ModelFamilyIdentifiabilityFailure {
  if (probe.type === 'transition_probability') {
    if (!hasState(candidate.model, probe.from)) {
      return failure(
        'probe_evaluation',
        'invalid_probe',
        `Probe ${probe.probeId} references unknown source state ${probe.from} for candidate ${candidate.candidateId}`,
        { candidateId: candidate.candidateId, probeId: probe.probeId }
      );
    }
    if (!hasState(candidate.model, probe.to)) {
      return failure(
        'probe_evaluation',
        'invalid_probe',
        `Probe ${probe.probeId} references unknown destination state ${probe.to} for candidate ${candidate.candidateId}`,
        { candidateId: candidate.candidateId, probeId: probe.probeId }
      );
    }
    const value = transitionProbability(candidate.model, probe.from, probe.to);
    if (!Number.isFinite(value)) {
      return failure(
        'probe_evaluation',
        'non_finite_observable_result',
        `Probe ${probe.probeId} produced a non-finite transition probability for candidate ${candidate.candidateId}`,
        { candidateId: candidate.candidateId, probeId: probe.probeId }
      );
    }
    return value;
  }

  if (!hasState(candidate.model, probe.stateId)) {
    return failure(
      'probe_evaluation',
      'invalid_probe',
      `Probe ${probe.probeId} references unknown observed state ${probe.stateId} for candidate ${candidate.candidateId}`,
      { candidateId: candidate.candidateId, probeId: probe.probeId }
    );
  }

  const distribution = propagateFiniteHorizonStateDistribution(
    candidate.model,
    {
      initialDistribution: probe.initialDistribution,
      horizon: probe.horizon
    },
    options
  );
  if (!distribution.ok) {
    return failure(
      'probe_evaluation',
      'probe_evaluation_failed',
      `Probe ${probe.probeId} failed Candidate A state-distribution propagation for candidate ${candidate.candidateId}`,
      {
        candidateId: candidate.candidateId,
        probeId: probe.probeId,
        stateDistributionFailure: distribution.failure
      }
    );
  }

  const coordinate = distribution.finalDistribution.find(
    (entry) => entry.stateId === probe.stateId
  );
  const value = coordinate?.probability;
  if (value === undefined || !Number.isFinite(value)) {
    return failure(
      'probe_evaluation',
      'non_finite_observable_result',
      `Probe ${probe.probeId} did not produce a finite state probability for candidate ${candidate.candidateId}`,
      { candidateId: candidate.candidateId, probeId: probe.probeId }
    );
  }
  return value;
}

function buildSignatures(
  candidates: PreparedCandidate[],
  probes: ModelFamilyObservationProbe[],
  options: FiniteHorizonStateDistributionOptions | undefined
): CandidateObservableSignature[] | ModelFamilyIdentifiabilityFailure {
  const signatures: CandidateObservableSignature[] = [];
  for (const candidate of candidates) {
    const coordinates: ObservableSignatureCoordinate[] = [];
    for (const probe of probes) {
      const value = evaluateProbe(candidate, probe, options);
      if (typeof value !== 'number') return value;
      coordinates.push({ probeId: probe.probeId, value });
    }
    signatures.push({ candidateId: candidate.candidateId, coordinates });
  }
  return signatures;
}

function pairwiseComparisons(
  signatures: CandidateObservableSignature[],
  tolerance: number
): PairwiseModelDistinguishability[] {
  const comparisons: PairwiseModelDistinguishability[] = [];
  for (let leftIndex = 0; leftIndex < signatures.length; leftIndex += 1) {
    const left = signatures[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < signatures.length; rightIndex += 1) {
      const right = signatures[rightIndex];
      if (right === undefined) continue;
      const witnesses: string[] = [];
      let maxAbsoluteDifference = 0;
      for (let coordinateIndex = 0; coordinateIndex < left.coordinates.length; coordinateIndex += 1) {
        const leftCoordinate = left.coordinates[coordinateIndex];
        const rightCoordinate = right.coordinates[coordinateIndex];
        if (leftCoordinate === undefined || rightCoordinate === undefined) continue;
        const difference = Math.abs(leftCoordinate.value - rightCoordinate.value);
        maxAbsoluteDifference = Math.max(maxAbsoluteDifference, difference);
        if (difference > tolerance) witnesses.push(leftCoordinate.probeId);
      }
      comparisons.push({
        leftCandidateId: left.candidateId,
        rightCandidateId: right.candidateId,
        distinguished: witnesses.length > 0,
        maxAbsoluteDifference,
        witnessProbeIds: witnesses
      });
    }
  }
  return comparisons;
}

function candidateClassifications(
  signatures: CandidateObservableSignature[],
  pairwise: PairwiseModelDistinguishability[]
): CandidateIdentifiabilityClassification[] {
  return signatures.map((signature) => {
    const unresolvedPeerCandidateIds = pairwise
      .filter(
        (comparison) =>
          !comparison.distinguished &&
          (comparison.leftCandidateId === signature.candidateId ||
            comparison.rightCandidateId === signature.candidateId)
      )
      .map((comparison) =>
        comparison.leftCandidateId === signature.candidateId
          ? comparison.rightCandidateId
          : comparison.leftCandidateId
      )
      .sort(compareStrings);

    return {
      candidateId: signature.candidateId,
      classification:
        unresolvedPeerCandidateIds.length === 0
          ? 'uniquely_distinguishable_within_family'
          : 'ambiguous_under_observation_design',
      unresolvedPeerCandidateIds
    };
  });
}

function familyClassification(
  pairwise: PairwiseModelDistinguishability[]
): ModelFamilyIdentifiabilityClassification {
  const distinguishedCount = pairwise.filter((comparison) => comparison.distinguished).length;
  if (distinguishedCount === pairwise.length) return 'fully_distinguishable';
  if (distinguishedCount === 0) return 'fully_unresolved_within_tolerance';
  return 'partially_distinguishable';
}

export function classifyFiniteModelFamilyIdentifiability(
  request: FiniteModelFamilyIdentifiabilityRequest
): FiniteModelFamilyIdentifiabilityResult {
  const tolerance = resolveComparisonTolerance(request);
  if (typeof tolerance !== 'number') return tolerance;

  const invalidOptions = validateStateDistributionOptions(request.stateDistributionOptions);
  if (invalidOptions !== undefined) return invalidOptions;

  const candidates = prepareCandidates(request.candidates);
  if (!Array.isArray(candidates)) return candidates;

  const probes = prepareProbes(request.probes);
  if (!Array.isArray(probes)) return probes;

  const signatures = buildSignatures(candidates, probes, request.stateDistributionOptions);
  if (!Array.isArray(signatures)) return signatures;

  const pairwise = pairwiseComparisons(signatures, tolerance);
  const candidateResults = candidateClassifications(signatures, pairwise);

  return {
    ok: true,
    signatures,
    pairwise,
    candidates: candidateResults,
    familyClassification: familyClassification(pairwise),
    diagnostics: {
      method: 'finite_observable_signature_pairwise_comparison',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      comparisonTolerance: tolerance,
      candidateCount: candidates.length,
      probeCount: probes.length,
      classificationScope: 'finite_family_finite_observation_design',
      globalStructuralIdentifiabilityClaimed: false,
      approximateEqualityTransitivityAssumed: false,
      terminalSemantics: 'implicit_self_retention_for_transition_and_state_probability_probes'
    }
  };
}

type NonFiniteNumberLocation = {
  path: string;
  value: number;
};

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

export function finiteModelFamilyIdentifiabilityResultToJson(
  result: FiniteModelFamilyIdentifiabilityResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite-model-family identifiability result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
