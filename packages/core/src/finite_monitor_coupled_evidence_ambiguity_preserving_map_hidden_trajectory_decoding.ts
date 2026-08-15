import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest,
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions,
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from './finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

export type FiniteMapHiddenTrajectoryDecodingRequest =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest & {
    mapScoreTolerance: number;
    maxReturnedMapTrajectories: number;
  };

export type FiniteMapHiddenTrajectoryConditionedDecodingRequest =
  FiniteMapHiddenTrajectoryDecodingRequest & {
    targetMonitorStates: string[];
  };

export type FiniteMapHiddenTrajectoryDecodingOptions =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions & {
    maxDecodingBackpointers?: number;
  };

export type MapHiddenTrajectoryAtom = {
  hiddenStateIds: StateId[];
  monitorStateIds: string[];
  jointProbability: number | null;
  logJointProbability: number;
  jointProbabilityUnderflowed: boolean;
  posteriorProbability: number | null;
  logPosteriorProbability: number;
  posteriorProbabilityUnderflowed: boolean;
};

export type FiniteMapHiddenTrajectoryDecodingDiagnostics = {
  method: 'log_max_product_augmented_hidden_monitor_with_ambiguity_preserving_backpointers';
  numericRepresentation: 'javascript_number_float64_with_log_score';
  monitorDeterministic: true;
  candidateAEValidationReused: true;
  candidateAESumProductDenominatorReused: true;
  hiddenTrajectoryDecoded: true;
  parallelTransitionIdentityUsed: false;
  inputNormalizationApplied: false;
  approximationUsed: false;
  beamSearchUsed: false;
  topKNonMapDecodingUsed: false;
  randomTieBreakingUsed: false;
  parameterLearningUsed: false;
  mapScoreTolerance: number;
  maxReturnedMapTrajectories: number;
  maxDecodingBackpointers: number;
  decodingBackpointersUsed: number;
  tieSetTruncated: false;
  maximumJointProbabilityUnderflowed: boolean;
  maximumPosteriorProbabilityUnderflowed: boolean;
  existingQualifiedRequestTypesModified: false;
};

export type FiniteMapHiddenTrajectoryConditionedDecodingDiagnostics =
  FiniteMapHiddenTrajectoryDecodingDiagnostics & {
    conditioningMethod: 'terminal_monitor_set_restricted_log_max_product';
  };

export type FiniteMapHiddenTrajectoryDecodingFailureCode =
  | 'invalid_candidate_af_request'
  | 'invalid_map_score_tolerance'
  | 'invalid_map_trajectory_limit'
  | 'invalid_map_backpointer_limit'
  | 'map_tie_set_limit_exceeded'
  | 'max_product_internal_inconsistency'
  | 'map_score_non_finite'
  | 'map_posterior_mass_violation'
  | 'map_backpointer_inconsistency'
  | 'non_finite_map_decoding_result';

export type FiniteMapHiddenTrajectoryDecodingFailure = {
  ok: false;
  failure: {
    code: FiniteMapHiddenTrajectoryDecodingFailureCode;
    message: string;
    path?: string | undefined;
    step?: number | undefined;
    actual?: number | undefined;
    expected?: number | undefined;
    tolerance?: number | undefined;
    sourceFailureCode?: string | undefined;
  };
};

export type FiniteMapHiddenTrajectoryDecodingSuccess = {
  ok: true;
  possible: boolean;
  impossibility: 'evidence' | null;
  horizon: number;
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  maximumJointPathProbability: number | null;
  maximumLogJointPathProbability: number | null;
  maximumPosteriorPathProbability: number | null;
  maximumLogPosteriorPathProbability: number | null;
  mapUnique: boolean | null;
  returnedMapTrajectoryCount: number;
  mapTrajectories: MapHiddenTrajectoryAtom[] | null;
  diagnostics: FiniteMapHiddenTrajectoryDecodingDiagnostics;
};

export type FiniteMapHiddenTrajectoryConditionedDecodingSuccess = {
  ok: true;
  possible: boolean;
  evidencePossible: boolean;
  monitorEventPossible: boolean;
  jointPossible: boolean;
  impossibility: 'evidence' | 'monitor_event' | 'joint' | null;
  horizon: number;
  targetMonitorStates: string[];
  jointEventProbability: number | null;
  logJointEventProbability: number | null;
  maximumJointPathProbability: number | null;
  maximumLogJointPathProbability: number | null;
  maximumPosteriorPathProbability: number | null;
  maximumLogPosteriorPathProbability: number | null;
  mapUnique: boolean | null;
  returnedMapTrajectoryCount: number;
  mapTrajectories: MapHiddenTrajectoryAtom[] | null;
  diagnostics: FiniteMapHiddenTrajectoryConditionedDecodingDiagnostics;
};

export type FiniteMapHiddenTrajectoryDecodingResult =
  | FiniteMapHiddenTrajectoryDecodingSuccess
  | FiniteMapHiddenTrajectoryDecodingFailure;

export type FiniteMapHiddenTrajectoryConditionedDecodingResult =
  | FiniteMapHiddenTrajectoryConditionedDecodingSuccess
  | FiniteMapHiddenTrajectoryDecodingFailure;

type EffectiveEdge = { from: StateId; to: StateId; probability: number };
type Predecessor = { stateId: StateId; monitorStateId: string; score: number };
type MaxCell = { score: number; predecessors: Predecessor[] };
type MaxLayer = Map<StateId, Map<string, MaxCell>>;

type CanonicalPrepared = {
  stateIds: StateId[];
  monitorStates: string[];
  effectiveEdgesByState: Map<StateId, EffectiveEdge[]>;
  initialDistribution: Map<StateId, number>;
  initialMonitorMap: Map<StateId, string>;
  monitorTransitionMaps: Array<Map<string, string>>;
  initialEvidenceMap: Map<StateId, number>;
  coupledEvidenceMaps: Array<Map<string, number>>;
};

type ResolvedMapOptions = {
  mapScoreTolerance: number;
  maxReturnedMapTrajectories: number;
  maxDecodingBackpointers: number;
};

type DecodedInternal = {
  bestScore: number;
  paths: Array<{ hiddenStateIds: StateId[]; monitorStateIds: string[]; score: number }>;
  backpointersUsed: number;
};

const DEFAULT_MAX_DECODING_BACKPOINTERS = 2_000_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function transitionKey(
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  return `${monitorStateId}\u0000${fromStateId}\u0000${toStateId}`;
}

function fail(
  code: FiniteMapHiddenTrajectoryDecodingFailureCode,
  message: string,
  details: Omit<FiniteMapHiddenTrajectoryDecodingFailure['failure'], 'code' | 'message'> = {}
): FiniteMapHiddenTrajectoryDecodingFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function directProbability(logProbability: number): number | null {
  const direct = Math.exp(logProbability);
  return direct === 0 ? null : direct;
}

function resolveMapOptions(
  request: FiniteMapHiddenTrajectoryDecodingRequest,
  options: FiniteMapHiddenTrajectoryDecodingOptions
): { ok: true; resolved: ResolvedMapOptions } | FiniteMapHiddenTrajectoryDecodingFailure {
  if (!Number.isFinite(request.mapScoreTolerance) || request.mapScoreTolerance < 0) {
    return fail(
      'invalid_map_score_tolerance',
      'mapScoreTolerance must be a finite non-negative number',
      { path: 'request.mapScoreTolerance', actual: request.mapScoreTolerance }
    );
  }
  if (
    !Number.isSafeInteger(request.maxReturnedMapTrajectories) ||
    request.maxReturnedMapTrajectories <= 0
  ) {
    return fail(
      'invalid_map_trajectory_limit',
      'maxReturnedMapTrajectories must be a positive safe integer',
      {
        path: 'request.maxReturnedMapTrajectories',
        actual: request.maxReturnedMapTrajectories
      }
    );
  }
  const maxDecodingBackpointers =
    options.maxDecodingBackpointers ?? DEFAULT_MAX_DECODING_BACKPOINTERS;
  if (!Number.isSafeInteger(maxDecodingBackpointers) || maxDecodingBackpointers <= 0) {
    return fail(
      'invalid_map_backpointer_limit',
      'maxDecodingBackpointers must be a positive safe integer',
      { actual: maxDecodingBackpointers }
    );
  }
  return {
    ok: true,
    resolved: {
      mapScoreTolerance: request.mapScoreTolerance,
      maxReturnedMapTrajectories: request.maxReturnedMapTrajectories,
      maxDecodingBackpointers
    }
  };
}

function buildEffectiveEdges(model: DefinitionModel): Map<StateId, EffectiveEdge[]> {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminal = new Set(
    model.states.filter((state) => isTerminalState(state)).map((state) => state.id)
  );
  const result = new Map<StateId, EffectiveEdge[]>();
  for (const stateId of stateIds) {
    if (terminal.has(stateId)) {
      result.set(stateId, [{ from: stateId, to: stateId, probability: 1 }]);
      continue;
    }
    const aggregate = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      if (probability <= 0) continue;
      aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
    }
    result.set(
      stateId,
      [...aggregate.entries()]
        .map(([to, probability]) => ({ from: stateId, to, probability }))
        .sort((left, right) => compareStrings(left.to, right.to))
    );
  }
  return result;
}

function prepareFromAe(
  model: DefinitionModel,
  request: FiniteMapHiddenTrajectoryDecodingRequest,
  ae: Extract<
    ReturnType<typeof analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence>,
    { ok: true }
  >
): CanonicalPrepared {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const initialDistribution = new Map<StateId, number>(
    stateIds.map((stateId) => [stateId, 0])
  );
  for (const entry of request.initialDistribution) {
    initialDistribution.set(entry.stateId, entry.probability);
  }
  const initialMonitorMap = new Map<StateId, string>(
    ae.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId])
  );
  const monitorTransitionMaps = ae.monitorTransitionByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          transitionKey(entry.monitorStateId, entry.fromStateId, entry.toStateId),
          entry.nextMonitorStateId
        ])
      )
  );
  const initialEvidenceMap = new Map<StateId, number>(
    ae.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood])
  );
  const coupledEvidenceMaps = ae.monitorCoupledTransitionEvidenceLikelihoodsByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          transitionKey(entry.monitorStateId, entry.fromStateId, entry.toStateId),
          entry.likelihood
        ])
      )
  );
  return {
    stateIds,
    monitorStates: ae.monitorStates,
    effectiveEdgesByState: buildEffectiveEdges(model),
    initialDistribution,
    initialMonitorMap,
    monitorTransitionMaps,
    initialEvidenceMap,
    coupledEvidenceMaps
  };
}

function emptyLayer(prepared: CanonicalPrepared): MaxLayer {
  return new Map(
    prepared.stateIds.map((stateId) => [stateId, new Map<string, MaxCell>()])
  );
}

function samePredecessor(left: Predecessor, right: Predecessor): boolean {
  return left.stateId === right.stateId && left.monitorStateId === right.monitorStateId;
}

function runMaxProduct(
  request: FiniteMapHiddenTrajectoryDecodingRequest,
  prepared: CanonicalPrepared,
  resolved: ResolvedMapOptions,
  targetMonitorStates?: Set<string>
): { ok: true; decoded: DecodedInternal } | FiniteMapHiddenTrajectoryDecodingFailure {
  const layers: MaxLayer[] = [];
  let current = emptyLayer(prepared);
  for (const stateId of prepared.stateIds) {
    const probability = prepared.initialDistribution.get(stateId) ?? 0;
    const likelihood = prepared.initialEvidenceMap.get(stateId) ?? 0;
    if (probability <= 0 || likelihood <= 0) continue;
    const monitorStateId = prepared.initialMonitorMap.get(stateId);
    if (monitorStateId === undefined) {
      return fail(
        'max_product_internal_inconsistency',
        'Missing deterministic initial monitor state during Candidate AF decoding'
      );
    }
    const score = Math.log(probability) + Math.log(likelihood);
    if (!Number.isFinite(score)) {
      return fail('map_score_non_finite', 'Initial Candidate AF MAP score is non-finite', {
        step: 0,
        actual: score
      });
    }
    current.get(stateId)!.set(monitorStateId, { score, predecessors: [] });
  }
  layers.push(current);

  let backpointersUsed = 0;
  for (let step = 0; step < request.horizon; step += 1) {
    const next = emptyLayer(prepared);
    const monitorTransitions = prepared.monitorTransitionMaps[step]!;
    const evidence = prepared.coupledEvidenceMaps[step]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, cell] of current.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood =
            evidence.get(transitionKey(monitorStateId, edge.from, edge.to)) ?? 0;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = monitorTransitions.get(
            transitionKey(monitorStateId, edge.from, edge.to)
          );
          if (nextMonitorStateId === undefined) {
            return fail(
              'max_product_internal_inconsistency',
              'Missing deterministic monitor transition during Candidate AF decoding',
              { step: step + 1 }
            );
          }
          const candidateScore =
            cell.score + Math.log(edge.probability) + Math.log(likelihood);
          if (!Number.isFinite(candidateScore)) {
            return fail('map_score_non_finite', 'Candidate AF MAP score is non-finite', {
              step: step + 1,
              actual: candidateScore
            });
          }
          const destination = next.get(edge.to)!;
          const existing = destination.get(nextMonitorStateId);
          const predecessor = {
            stateId: fromStateId,
            monitorStateId,
            score: candidateScore
          };
          if (
            existing === undefined ||
            candidateScore > existing.score + resolved.mapScoreTolerance
          ) {
            if (existing !== undefined) backpointersUsed -= existing.predecessors.length;
            destination.set(nextMonitorStateId, {
              score: candidateScore,
              predecessors: [predecessor]
            });
            backpointersUsed += 1;
          } else if (
            Math.abs(candidateScore - existing.score) <= resolved.mapScoreTolerance
          ) {
            const previousCount = existing.predecessors.length;
            const newBest = Math.max(existing.score, candidateScore);
            const retained = existing.predecessors.filter(
              (entry) => newBest - entry.score <= resolved.mapScoreTolerance
            );
            if (
              newBest - candidateScore <= resolved.mapScoreTolerance &&
              !retained.some((entry) => samePredecessor(entry, predecessor))
            ) {
              retained.push(predecessor);
            }
            existing.score = newBest;
            existing.predecessors = retained;
            backpointersUsed += retained.length - previousCount;
          }
          if (backpointersUsed > resolved.maxDecodingBackpointers) {
            return fail(
              'map_tie_set_limit_exceeded',
              'Candidate AF decoding backpointer resource guard exceeded; tie set was not truncated',
              {
                actual: backpointersUsed,
                expected: resolved.maxDecodingBackpointers
              }
            );
          }
        }
      }
    }
    current = next;
    layers.push(current);
  }

  let bestScore = Number.NEGATIVE_INFINITY;
  const finalCells: Array<{ stateId: StateId; monitorStateId: string; score: number }> = [];
  const final = layers[request.horizon]!;
  for (const stateId of prepared.stateIds) {
    for (const [monitorStateId, cell] of final.get(stateId)?.entries() ?? []) {
      if (targetMonitorStates !== undefined && !targetMonitorStates.has(monitorStateId)) continue;
      if (cell.score > bestScore + resolved.mapScoreTolerance) {
        bestScore = cell.score;
        finalCells.length = 0;
        finalCells.push({ stateId, monitorStateId, score: cell.score });
      } else if (Math.abs(cell.score - bestScore) <= resolved.mapScoreTolerance) {
        if (cell.score > bestScore) {
          bestScore = cell.score;
          const retained = finalCells.filter(
            (entry) => bestScore - entry.score <= resolved.mapScoreTolerance
          );
          finalCells.length = 0;
          finalCells.push(...retained);
        }
        if (bestScore - cell.score <= resolved.mapScoreTolerance) {
          finalCells.push({ stateId, monitorStateId, score: cell.score });
        }
      }
    }
  }
  if (!Number.isFinite(bestScore) || finalCells.length === 0) {
    return fail(
      'max_product_internal_inconsistency',
      'Candidate AF event was reported possible but no finite terminal MAP score exists'
    );
  }

  const paths: DecodedInternal['paths'] = [];
  const appendPath = (
    step: number,
    stateId: StateId,
    monitorStateId: string,
    hiddenReverse: StateId[],
    monitorReverse: string[],
    pathScore: number
  ): FiniteMapHiddenTrajectoryDecodingFailure | undefined => {
    const cell = layers[step]!.get(stateId)?.get(monitorStateId);
    if (cell === undefined) {
      return fail(
        'map_backpointer_inconsistency',
        'Candidate AF backpointer refers to a missing max-product cell',
        { step }
      );
    }
    if (step === 0) {
      const hiddenStateIds = [...hiddenReverse].reverse();
      const monitorStateIds = [...monitorReverse].reverse();
      paths.push({ hiddenStateIds, monitorStateIds, score: pathScore });
      if (paths.length > resolved.maxReturnedMapTrajectories) {
        return fail(
          'map_tie_set_limit_exceeded',
          'Candidate AF co-MAP trajectory set exceeds maxReturnedMapTrajectories; no truncation was performed',
          {
            actual: paths.length,
            expected: resolved.maxReturnedMapTrajectories
          }
        );
      }
      return undefined;
    }
    if (cell.predecessors.length === 0) {
      return fail(
        'map_backpointer_inconsistency',
        'Candidate AF non-initial max-product cell has no predecessor',
        { step }
      );
    }
    for (const predecessor of cell.predecessors) {
      const problem = appendPath(
        step - 1,
        predecessor.stateId,
        predecessor.monitorStateId,
        [...hiddenReverse, predecessor.stateId],
        [...monitorReverse, predecessor.monitorStateId],
        pathScore
      );
      if (problem !== undefined) return problem;
    }
    return undefined;
  };

  for (const terminal of finalCells) {
    const problem = appendPath(
      request.horizon,
      terminal.stateId,
      terminal.monitorStateId,
      [terminal.stateId],
      [terminal.monitorStateId],
      terminal.score
    );
    if (problem !== undefined) return problem;
  }

  paths.sort((left, right) => {
    for (let index = 0; index < left.hiddenStateIds.length; index += 1) {
      const order = compareStrings(left.hiddenStateIds[index]!, right.hiddenStateIds[index]!);
      if (order !== 0) return order;
    }
    return 0;
  });
  return { ok: true, decoded: { bestScore, paths, backpointersUsed } };
}

function buildAtoms(
  decoded: DecodedInternal,
  denominatorLog: number,
  resolved: ResolvedMapOptions
): { ok: true; atoms: MapHiddenTrajectoryAtom[] } | FiniteMapHiddenTrajectoryDecodingFailure {
  const atoms: MapHiddenTrajectoryAtom[] = [];
  for (const path of decoded.paths) {
    let posteriorLog = path.score - denominatorLog;
    if (posteriorLog > resolved.mapScoreTolerance) {
      return fail(
        'map_posterior_mass_violation',
        'Candidate AF MAP path posterior log probability exceeds zero beyond tolerance',
        {
          actual: posteriorLog,
          expected: 0,
          tolerance: resolved.mapScoreTolerance
        }
      );
    }
    if (posteriorLog > 0) posteriorLog = 0;
    const jointProbability = directProbability(path.score);
    const posteriorProbability = directProbability(posteriorLog);
    atoms.push({
      hiddenStateIds: path.hiddenStateIds,
      monitorStateIds: path.monitorStateIds,
      jointProbability,
      logJointProbability: path.score,
      jointProbabilityUnderflowed: jointProbability === null,
      posteriorProbability,
      logPosteriorProbability: posteriorLog,
      posteriorProbabilityUnderflowed: posteriorProbability === null
    });
  }
  return { ok: true, atoms };
}

function diagnostics(
  resolved: ResolvedMapOptions,
  decoded: DecodedInternal,
  maximumJointProbabilityUnderflowed: boolean,
  maximumPosteriorProbabilityUnderflowed: boolean
): FiniteMapHiddenTrajectoryDecodingDiagnostics {
  return {
    method: 'log_max_product_augmented_hidden_monitor_with_ambiguity_preserving_backpointers',
    numericRepresentation: 'javascript_number_float64_with_log_score',
    monitorDeterministic: true,
    candidateAEValidationReused: true,
    candidateAESumProductDenominatorReused: true,
    hiddenTrajectoryDecoded: true,
    parallelTransitionIdentityUsed: false,
    inputNormalizationApplied: false,
    approximationUsed: false,
    beamSearchUsed: false,
    topKNonMapDecodingUsed: false,
    randomTieBreakingUsed: false,
    parameterLearningUsed: false,
    mapScoreTolerance: resolved.mapScoreTolerance,
    maxReturnedMapTrajectories: resolved.maxReturnedMapTrajectories,
    maxDecodingBackpointers: resolved.maxDecodingBackpointers,
    decodingBackpointersUsed: decoded.backpointersUsed,
    tieSetTruncated: false,
    maximumJointProbabilityUnderflowed,
    maximumPosteriorProbabilityUnderflowed,
    existingQualifiedRequestTypesModified: false
  };
}

function impossibleDiagnostics(
  resolved: ResolvedMapOptions
): FiniteMapHiddenTrajectoryDecodingDiagnostics {
  return diagnostics(
    resolved,
    { bestScore: Number.NEGATIVE_INFINITY, paths: [], backpointersUsed: 0 },
    false,
    false
  );
}

export function decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
  model: DefinitionModel,
  request: FiniteMapHiddenTrajectoryDecodingRequest,
  options: FiniteMapHiddenTrajectoryDecodingOptions = {}
): FiniteMapHiddenTrajectoryDecodingResult {
  if (request === null || typeof request !== 'object') {
    return fail('invalid_candidate_af_request', 'request must be an object', { path: 'request' });
  }
  const resolvedResult = resolveMapOptions(request, options);
  if (!resolvedResult.ok) return resolvedResult;
  const resolved = resolvedResult.resolved;
  const aeOptions: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = options;
  const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
    model,
    request,
    aeOptions
  );
  if (!ae.ok) {
    return fail('invalid_candidate_af_request', ae.failure.message, {
      sourceFailureCode: ae.failure.code
    });
  }
  if (!ae.possible || ae.logEvidenceProbability === null) {
    return {
      ok: true,
      possible: false,
      impossibility: 'evidence',
      horizon: request.horizon,
      evidenceProbability: ae.evidenceProbability,
      logEvidenceProbability: ae.logEvidenceProbability,
      maximumJointPathProbability: null,
      maximumLogJointPathProbability: null,
      maximumPosteriorPathProbability: null,
      maximumLogPosteriorPathProbability: null,
      mapUnique: null,
      returnedMapTrajectoryCount: 0,
      mapTrajectories: null,
      diagnostics: impossibleDiagnostics(resolved)
    };
  }
  const prepared = prepareFromAe(model, request, ae);
  const decodedResult = runMaxProduct(request, prepared, resolved);
  if (!decodedResult.ok) return decodedResult;
  const decoded = decodedResult.decoded;
  const atomsResult = buildAtoms(decoded, ae.logEvidenceProbability, resolved);
  if (!atomsResult.ok) return atomsResult;
  const maximumJointPathProbability = directProbability(decoded.bestScore);
  let maximumLogPosteriorPathProbability = decoded.bestScore - ae.logEvidenceProbability;
  if (maximumLogPosteriorPathProbability > resolved.mapScoreTolerance) {
    return fail(
      'map_posterior_mass_violation',
      'Candidate AF maximum posterior path log probability exceeds zero beyond tolerance',
      {
        actual: maximumLogPosteriorPathProbability,
        expected: 0,
        tolerance: resolved.mapScoreTolerance
      }
    );
  }
  if (maximumLogPosteriorPathProbability > 0) maximumLogPosteriorPathProbability = 0;
  const maximumPosteriorPathProbability = directProbability(maximumLogPosteriorPathProbability);
  return {
    ok: true,
    possible: true,
    impossibility: null,
    horizon: request.horizon,
    evidenceProbability: ae.evidenceProbability,
    logEvidenceProbability: ae.logEvidenceProbability,
    maximumJointPathProbability,
    maximumLogJointPathProbability: decoded.bestScore,
    maximumPosteriorPathProbability,
    maximumLogPosteriorPathProbability,
    mapUnique: atomsResult.atoms.length === 1,
    returnedMapTrajectoryCount: atomsResult.atoms.length,
    mapTrajectories: atomsResult.atoms,
    diagnostics: diagnostics(
      resolved,
      decoded,
      maximumJointPathProbability === null,
      maximumPosteriorPathProbability === null
    )
  };
}

export function decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
  model: DefinitionModel,
  request: FiniteMapHiddenTrajectoryConditionedDecodingRequest,
  options: FiniteMapHiddenTrajectoryDecodingOptions = {}
): FiniteMapHiddenTrajectoryConditionedDecodingResult {
  if (request === null || typeof request !== 'object') {
    return fail('invalid_candidate_af_request', 'request must be an object', { path: 'request' });
  }
  const resolvedResult = resolveMapOptions(request, options);
  if (!resolvedResult.ok) return resolvedResult;
  const resolved = resolvedResult.resolved;
  const aeOptions: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = options;
  const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
    model,
    request,
    aeOptions
  );
  if (!ae.ok) {
    return fail('invalid_candidate_af_request', ae.failure.message, {
      sourceFailureCode: ae.failure.code
    });
  }
  const conditioned =
    conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      request as FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest,
      aeOptions
    );
  if (!conditioned.ok) {
    return fail('invalid_candidate_af_request', conditioned.failure.message, {
      sourceFailureCode: conditioned.failure.code
    });
  }
  const baseDiagnostics = impossibleDiagnostics(resolved);
  const conditionedDiagnostics: FiniteMapHiddenTrajectoryConditionedDecodingDiagnostics = {
    ...baseDiagnostics,
    conditioningMethod: 'terminal_monitor_set_restricted_log_max_product'
  };
  if (!conditioned.possible || conditioned.logJointEventProbability === null) {
    return {
      ok: true,
      possible: false,
      evidencePossible: conditioned.evidencePossible,
      monitorEventPossible: conditioned.monitorEventPossible,
      jointPossible: conditioned.jointPossible,
      impossibility: conditioned.impossibility,
      horizon: request.horizon,
      targetMonitorStates: conditioned.targetMonitorStates,
      jointEventProbability: conditioned.jointEventProbability,
      logJointEventProbability: conditioned.logJointEventProbability,
      maximumJointPathProbability: null,
      maximumLogJointPathProbability: null,
      maximumPosteriorPathProbability: null,
      maximumLogPosteriorPathProbability: null,
      mapUnique: null,
      returnedMapTrajectoryCount: 0,
      mapTrajectories: null,
      diagnostics: conditionedDiagnostics
    };
  }
  const prepared = prepareFromAe(model, request, ae);
  const target = new Set(conditioned.targetMonitorStates);
  const decodedResult = runMaxProduct(request, prepared, resolved, target);
  if (!decodedResult.ok) return decodedResult;
  const decoded = decodedResult.decoded;
  const atomsResult = buildAtoms(decoded, conditioned.logJointEventProbability, resolved);
  if (!atomsResult.ok) return atomsResult;
  const maximumJointPathProbability = directProbability(decoded.bestScore);
  let maximumLogPosteriorPathProbability =
    decoded.bestScore - conditioned.logJointEventProbability;
  if (maximumLogPosteriorPathProbability > resolved.mapScoreTolerance) {
    return fail(
      'map_posterior_mass_violation',
      'Candidate AF conditioned maximum posterior path log probability exceeds zero beyond tolerance',
      {
        actual: maximumLogPosteriorPathProbability,
        expected: 0,
        tolerance: resolved.mapScoreTolerance
      }
    );
  }
  if (maximumLogPosteriorPathProbability > 0) maximumLogPosteriorPathProbability = 0;
  const maximumPosteriorPathProbability = directProbability(maximumLogPosteriorPathProbability);
  return {
    ok: true,
    possible: true,
    evidencePossible: true,
    monitorEventPossible: true,
    jointPossible: true,
    impossibility: null,
    horizon: request.horizon,
    targetMonitorStates: conditioned.targetMonitorStates,
    jointEventProbability: conditioned.jointEventProbability,
    logJointEventProbability: conditioned.logJointEventProbability,
    maximumJointPathProbability,
    maximumLogJointPathProbability: decoded.bestScore,
    maximumPosteriorPathProbability,
    maximumLogPosteriorPathProbability,
    mapUnique: atomsResult.atoms.length === 1,
    returnedMapTrajectoryCount: atomsResult.atoms.length,
    mapTrajectories: atomsResult.atoms,
    diagnostics: {
      ...diagnostics(
        resolved,
        decoded,
        maximumJointPathProbability === null,
        maximumPosteriorPathProbability === null
      ),
      conditioningMethod: 'terminal_monitor_set_restricted_log_max_product'
    }
  };
}

type NonFiniteNumberLocation = { path: string; value: number };

function findNonFiniteNumber(
  value: unknown,
  path = '$'
): NonFiniteNumberLocation | undefined {
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

export function finiteMapHiddenTrajectoryDecodingResultToJson(
  result: FiniteMapHiddenTrajectoryDecodingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AF MAP decoding result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}

export function finiteMapHiddenTrajectoryConditionedDecodingResultToJson(
  result: FiniteMapHiddenTrajectoryConditionedDecodingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AF conditioned MAP decoding result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
