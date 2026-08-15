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

export type FiniteRankedKBestHiddenTrajectoryDecodingRequest =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest & {
    rankDepth: number;
    kBestScoreTolerance: number;
    maxReturnedKBestTrajectories: number;
  };

export type FiniteRankedKBestHiddenTrajectoryConditionedDecodingRequest =
  FiniteRankedKBestHiddenTrajectoryDecodingRequest & {
    targetMonitorStates: string[];
  };

export type FiniteRankedKBestHiddenTrajectoryDecodingOptions =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions & {
    maxRankedPredecessors?: number;
  };

export type RankedKBestHiddenTrajectoryAtom = {
  hiddenStateIds: StateId[];
  monitorStateIds: string[];
  jointProbability: number | null;
  logJointProbability: number;
  jointProbabilityUnderflowed: boolean;
  posteriorProbability: number | null;
  logPosteriorProbability: number;
  posteriorProbabilityUnderflowed: boolean;
};

export type RankedKBestHiddenTrajectoryStratum = {
  rank: number;
  anchorJointProbability: number | null;
  anchorLogJointProbability: number;
  anchorJointProbabilityUnderflowed: boolean;
  trajectoryCount: number;
  trajectories: RankedKBestHiddenTrajectoryAtom[];
};

export type FiniteRankedKBestHiddenTrajectoryDecodingDiagnostics = {
  method: 'sparse_log_domain_ranked_hidden_monitor_dp_with_complete_retained_provenance';
  numericRepresentation: 'javascript_number_float64_with_log_score';
  monitorDeterministic: true;
  candidateAEValidationReused: true;
  candidateAESumProductDenominatorReused: true;
  hiddenTrajectoryRanked: true;
  parallelTransitionIdentityUsed: false;
  inputNormalizationApplied: false;
  approximationUsed: false;
  beamSearchUsed: false;
  trajectoryCountTopKUsed: false;
  randomTieBreakingUsed: false;
  posteriorSamplingUsed: false;
  parameterLearningUsed: false;
  rankDepthReduced: false;
  tieStratumTruncated: false;
  requestedRankDepth: number;
  kBestScoreTolerance: number;
  maxReturnedKBestTrajectories: number;
  maxRankedPredecessors: number;
  rankedPredecessorsUsed: number;
  allRankedTrajectoriesExhausted: boolean;
  existingQualifiedRequestTypesModified: false;
};

export type FiniteRankedKBestHiddenTrajectoryConditionedDecodingDiagnostics =
  FiniteRankedKBestHiddenTrajectoryDecodingDiagnostics & {
    conditioningMethod: 'terminal_monitor_set_restricted_ranked_log_dp';
  };

export type FiniteRankedKBestHiddenTrajectoryDecodingFailureCode =
  | 'invalid_candidate_ag_request'
  | 'invalid_k_best_rank_depth'
  | 'invalid_k_best_score_tolerance'
  | 'invalid_k_best_trajectory_limit'
  | 'invalid_ranked_predecessor_limit'
  | 'k_best_tie_stratum_limit_exceeded'
  | 'k_best_ranked_predecessor_limit_exceeded'
  | 'k_best_rank_order_inconsistency'
  | 'k_best_duplicate_trajectory_inconsistency'
  | 'k_best_score_non_finite'
  | 'k_best_posterior_mass_violation'
  | 'k_best_internal_inconsistency'
  | 'non_finite_k_best_decoding_result';

export type FiniteRankedKBestHiddenTrajectoryDecodingFailure = {
  ok: false;
  failure: {
    code: FiniteRankedKBestHiddenTrajectoryDecodingFailureCode;
    message: string;
    path?: string | undefined;
    step?: number | undefined;
    actual?: number | undefined;
    expected?: number | undefined;
    tolerance?: number | undefined;
    sourceFailureCode?: string | undefined;
  };
};

export type FiniteRankedKBestHiddenTrajectoryDecodingSuccess = {
  ok: true;
  possible: boolean;
  impossibility: 'evidence' | null;
  horizon: number;
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  requestedRankDepth: number;
  returnedRankStrataCount: number;
  allRankedTrajectoriesExhausted: boolean;
  returnedTrajectoryCount: number;
  rankStrata: RankedKBestHiddenTrajectoryStratum[] | null;
  diagnostics: FiniteRankedKBestHiddenTrajectoryDecodingDiagnostics;
};

export type FiniteRankedKBestHiddenTrajectoryConditionedDecodingSuccess = {
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
  requestedRankDepth: number;
  returnedRankStrataCount: number;
  allRankedTrajectoriesExhausted: boolean;
  returnedTrajectoryCount: number;
  rankStrata: RankedKBestHiddenTrajectoryStratum[] | null;
  diagnostics: FiniteRankedKBestHiddenTrajectoryConditionedDecodingDiagnostics;
};

export type FiniteRankedKBestHiddenTrajectoryDecodingResult =
  | FiniteRankedKBestHiddenTrajectoryDecodingSuccess
  | FiniteRankedKBestHiddenTrajectoryDecodingFailure;

export type FiniteRankedKBestHiddenTrajectoryConditionedDecodingResult =
  | FiniteRankedKBestHiddenTrajectoryConditionedDecodingSuccess
  | FiniteRankedKBestHiddenTrajectoryDecodingFailure;

type EffectiveEdge = { from: StateId; to: StateId; probability: number };
type PathRecord = {
  hiddenStateIds: StateId[];
  monitorStateIds: string[];
  score: number;
};
type InternalStratum = { anchorScore: number; paths: PathRecord[] };
type RankedCell = { strata: InternalStratum[]; hasUnretainedCandidates: boolean };
type RankedLayer = Map<StateId, Map<string, RankedCell>>;

type CanonicalPrepared = {
  stateIds: StateId[];
  effectiveEdgesByState: Map<StateId, EffectiveEdge[]>;
  initialDistribution: Map<StateId, number>;
  initialMonitorMap: Map<StateId, string>;
  monitorTransitionMaps: Array<Map<string, string>>;
  initialEvidenceMap: Map<StateId, number>;
  coupledEvidenceMaps: Array<Map<string, number>>;
};

type ResolvedOptions = {
  rankDepth: number;
  kBestScoreTolerance: number;
  maxReturnedKBestTrajectories: number;
  maxRankedPredecessors: number;
};

type RankedInternal = {
  strata: InternalStratum[];
  allRankedTrajectoriesExhausted: boolean;
  rankedPredecessorsUsed: number;
};

const DEFAULT_MAX_RANKED_PREDECESSORS = 2_000_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePaths(left: PathRecord, right: PathRecord): number {
  for (let index = 0; index < left.hiddenStateIds.length; index += 1) {
    const order = compareStrings(left.hiddenStateIds[index]!, right.hiddenStateIds[index]!);
    if (order !== 0) return order;
  }
  return 0;
}

function pathKey(path: PathRecord): string {
  return path.hiddenStateIds.join('\u0000');
}

function transitionKey(
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  return `${monitorStateId}\u0000${fromStateId}\u0000${toStateId}`;
}

function fail(
  code: FiniteRankedKBestHiddenTrajectoryDecodingFailureCode,
  message: string,
  details: Omit<FiniteRankedKBestHiddenTrajectoryDecodingFailure['failure'], 'code' | 'message'> = {}
): FiniteRankedKBestHiddenTrajectoryDecodingFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function directProbability(logProbability: number): number | null {
  const direct = Math.exp(logProbability);
  return direct === 0 ? null : direct;
}

function resolveOptions(
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  options: FiniteRankedKBestHiddenTrajectoryDecodingOptions
): { ok: true; resolved: ResolvedOptions } | FiniteRankedKBestHiddenTrajectoryDecodingFailure {
  if (!Number.isSafeInteger(request.rankDepth) || request.rankDepth <= 0) {
    return fail('invalid_k_best_rank_depth', 'rankDepth must be a positive safe integer', {
      path: 'request.rankDepth',
      actual: request.rankDepth
    });
  }
  if (!Number.isFinite(request.kBestScoreTolerance) || request.kBestScoreTolerance < 0) {
    return fail(
      'invalid_k_best_score_tolerance',
      'kBestScoreTolerance must be a finite non-negative number',
      { path: 'request.kBestScoreTolerance', actual: request.kBestScoreTolerance }
    );
  }
  if (
    !Number.isSafeInteger(request.maxReturnedKBestTrajectories) ||
    request.maxReturnedKBestTrajectories <= 0
  ) {
    return fail(
      'invalid_k_best_trajectory_limit',
      'maxReturnedKBestTrajectories must be a positive safe integer',
      {
        path: 'request.maxReturnedKBestTrajectories',
        actual: request.maxReturnedKBestTrajectories
      }
    );
  }
  const maxRankedPredecessors = options.maxRankedPredecessors ?? DEFAULT_MAX_RANKED_PREDECESSORS;
  if (!Number.isSafeInteger(maxRankedPredecessors) || maxRankedPredecessors <= 0) {
    return fail(
      'invalid_ranked_predecessor_limit',
      'maxRankedPredecessors must be a positive safe integer',
      { actual: maxRankedPredecessors }
    );
  }
  return {
    ok: true,
    resolved: {
      rankDepth: request.rankDepth,
      kBestScoreTolerance: request.kBestScoreTolerance,
      maxReturnedKBestTrajectories: request.maxReturnedKBestTrajectories,
      maxRankedPredecessors
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
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
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
    effectiveEdgesByState: buildEffectiveEdges(model),
    initialDistribution,
    initialMonitorMap,
    monitorTransitionMaps,
    initialEvidenceMap,
    coupledEvidenceMaps
  };
}

function emptyLayer(prepared: CanonicalPrepared): RankedLayer {
  return new Map(
    prepared.stateIds.map((stateId) => [stateId, new Map<string, RankedCell>()])
  );
}

function groupPaths(
  paths: PathRecord[],
  resolved: ResolvedOptions
): { strata: InternalStratum[]; discarded: boolean } {
  const ordered = [...paths].sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    return comparePaths(left, right);
  });
  const all: InternalStratum[] = [];
  for (const path of ordered) {
    const current = all[all.length - 1];
    if (
      current === undefined ||
      current.anchorScore - path.score > resolved.kBestScoreTolerance
    ) {
      all.push({ anchorScore: path.score, paths: [path] });
    } else {
      current.paths.push(path);
    }
  }
  const discarded = all.length > resolved.rankDepth;
  const strata = all.slice(0, resolved.rankDepth);
  for (const stratum of strata) stratum.paths.sort(comparePaths);
  return { strata, discarded };
}

function runRankedDp(
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  prepared: CanonicalPrepared,
  resolved: ResolvedOptions,
  targetMonitorStates?: Set<string>
): { ok: true; ranked: RankedInternal } | FiniteRankedKBestHiddenTrajectoryDecodingFailure {
  let current = emptyLayer(prepared);
  for (const stateId of prepared.stateIds) {
    const probability = prepared.initialDistribution.get(stateId) ?? 0;
    const likelihood = prepared.initialEvidenceMap.get(stateId) ?? 0;
    if (probability <= 0 || likelihood <= 0) continue;
    const monitorStateId = prepared.initialMonitorMap.get(stateId);
    if (monitorStateId === undefined) {
      return fail(
        'k_best_internal_inconsistency',
        'Missing deterministic initial monitor state during Candidate AG decoding'
      );
    }
    const score = Math.log(probability) + Math.log(likelihood);
    if (!Number.isFinite(score)) {
      return fail('k_best_score_non_finite', 'Initial Candidate AG rank score is non-finite', {
        step: 0,
        actual: score
      });
    }
    current.get(stateId)!.set(monitorStateId, {
      strata: [
        {
          anchorScore: score,
          paths: [{ hiddenStateIds: [stateId], monitorStateIds: [monitorStateId], score }]
        }
      ],
      hasUnretainedCandidates: false
    });
  }

  let rankedPredecessorsUsed = 0;
  for (let step = 0; step < request.horizon; step += 1) {
    const candidates = new Map<StateId, Map<string, PathRecord[]>>(
      prepared.stateIds.map((stateId) => [stateId, new Map<string, PathRecord[]>()])
    );
    const inheritedHidden = new Map<StateId, Map<string, boolean>>(
      prepared.stateIds.map((stateId) => [stateId, new Map<string, boolean>()])
    );
    const monitorTransitions = prepared.monitorTransitionMaps[step]!;
    const evidence = prepared.coupledEvidenceMaps[step]!;

    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, cell] of current.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const key = transitionKey(monitorStateId, edge.from, edge.to);
          const likelihood = evidence.get(key) ?? 0;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = monitorTransitions.get(key);
          if (nextMonitorStateId === undefined) {
            return fail(
              'k_best_internal_inconsistency',
              'Missing deterministic monitor transition during Candidate AG decoding',
              { step: step + 1 }
            );
          }
          if (cell.hasUnretainedCandidates) {
            inheritedHidden.get(edge.to)!.set(nextMonitorStateId, true);
          }
          let destination = candidates.get(edge.to)!.get(nextMonitorStateId);
          if (destination === undefined) {
            destination = [];
            candidates.get(edge.to)!.set(nextMonitorStateId, destination);
          }
          const increment = Math.log(edge.probability) + Math.log(likelihood);
          for (const stratum of cell.strata) {
            for (const path of stratum.paths) {
              rankedPredecessorsUsed += 1;
              if (rankedPredecessorsUsed > resolved.maxRankedPredecessors) {
                return fail(
                  'k_best_ranked_predecessor_limit_exceeded',
                  'Candidate AG ranked predecessor resource guard exceeded; ranking was not approximated',
                  {
                    step: step + 1,
                    actual: rankedPredecessorsUsed,
                    expected: resolved.maxRankedPredecessors
                  }
                );
              }
              const score = path.score + increment;
              if (!Number.isFinite(score)) {
                return fail('k_best_score_non_finite', 'Candidate AG rank score is non-finite', {
                  step: step + 1,
                  actual: score
                });
              }
              destination.push({
                hiddenStateIds: [...path.hiddenStateIds, edge.to],
                monitorStateIds: [...path.monitorStateIds, nextMonitorStateId],
                score
              });
            }
          }
        }
      }
    }

    const next = emptyLayer(prepared);
    for (const stateId of prepared.stateIds) {
      for (const [monitorStateId, paths] of candidates.get(stateId)?.entries() ?? []) {
        const grouped = groupPaths(paths, resolved);
        next.get(stateId)!.set(monitorStateId, {
          strata: grouped.strata,
          hasUnretainedCandidates:
            grouped.discarded || inheritedHidden.get(stateId)?.get(monitorStateId) === true
        });
      }
    }
    current = next;
  }

  const finalPaths: PathRecord[] = [];
  let hiddenEligiblePathExists = false;
  const final = current;
  for (const stateId of prepared.stateIds) {
    for (const [monitorStateId, cell] of final.get(stateId)?.entries() ?? []) {
      if (targetMonitorStates !== undefined && !targetMonitorStates.has(monitorStateId)) continue;
      if (cell.hasUnretainedCandidates) hiddenEligiblePathExists = true;
      for (const stratum of cell.strata) finalPaths.push(...stratum.paths);
    }
  }
  if (finalPaths.length === 0) {
    return fail(
      'k_best_internal_inconsistency',
      'Candidate AG event was reported possible but no finite eligible ranked path exists'
    );
  }
  if (finalPaths.length > resolved.maxRankedPredecessors) {
    return fail(
      'k_best_ranked_predecessor_limit_exceeded',
      'Candidate AG final ranked path provenance exceeds maxRankedPredecessors',
      { actual: finalPaths.length, expected: resolved.maxRankedPredecessors }
    );
  }
  const grouped = groupPaths(finalPaths, resolved);
  const strata = grouped.strata;
  const seen = new Set<string>();
  let returnedTrajectoryCount = 0;
  for (let index = 0; index < strata.length; index += 1) {
    const stratum = strata[index]!;
    if (index > 0) {
      const previous = strata[index - 1]!;
      if (previous.anchorScore - stratum.anchorScore <= resolved.kBestScoreTolerance) {
        return fail(
          'k_best_rank_order_inconsistency',
          'Candidate AG returned rank anchors are not strictly separated beyond tolerance',
          { tolerance: resolved.kBestScoreTolerance }
        );
      }
    }
    for (const path of stratum.paths) {
      const key = pathKey(path);
      if (seen.has(key)) {
        return fail(
          'k_best_duplicate_trajectory_inconsistency',
          'Candidate AG ranked output contains a duplicate hidden trajectory'
        );
      }
      seen.add(key);
      returnedTrajectoryCount += 1;
      if (returnedTrajectoryCount > resolved.maxReturnedKBestTrajectories) {
        return fail(
          'k_best_tie_stratum_limit_exceeded',
          'Candidate AG selected rank strata exceed maxReturnedKBestTrajectories; no tie stratum was truncated',
          {
            actual: returnedTrajectoryCount,
            expected: resolved.maxReturnedKBestTrajectories
          }
        );
      }
    }
  }

  return {
    ok: true,
    ranked: {
      strata,
      allRankedTrajectoriesExhausted: !hiddenEligiblePathExists && !grouped.discarded,
      rankedPredecessorsUsed
    }
  };
}

function buildResultStrata(
  ranked: RankedInternal,
  denominatorLog: number,
  resolved: ResolvedOptions
):
  | { ok: true; strata: RankedKBestHiddenTrajectoryStratum[]; trajectoryCount: number }
  | FiniteRankedKBestHiddenTrajectoryDecodingFailure {
  const output: RankedKBestHiddenTrajectoryStratum[] = [];
  let trajectoryCount = 0;
  for (let index = 0; index < ranked.strata.length; index += 1) {
    const stratum = ranked.strata[index]!;
    const atoms: RankedKBestHiddenTrajectoryAtom[] = [];
    for (const path of stratum.paths) {
      let logPosteriorProbability = path.score - denominatorLog;
      if (logPosteriorProbability > resolved.kBestScoreTolerance) {
        return fail(
          'k_best_posterior_mass_violation',
          'Candidate AG posterior path log probability exceeds zero beyond tolerance',
          {
            actual: logPosteriorProbability,
            expected: 0,
            tolerance: resolved.kBestScoreTolerance
          }
        );
      }
      if (logPosteriorProbability > 0) logPosteriorProbability = 0;
      const jointProbability = directProbability(path.score);
      const posteriorProbability = directProbability(logPosteriorProbability);
      atoms.push({
        hiddenStateIds: path.hiddenStateIds,
        monitorStateIds: path.monitorStateIds,
        jointProbability,
        logJointProbability: path.score,
        jointProbabilityUnderflowed: jointProbability === null,
        posteriorProbability,
        logPosteriorProbability,
        posteriorProbabilityUnderflowed: posteriorProbability === null
      });
      trajectoryCount += 1;
    }
    const anchorJointProbability = directProbability(stratum.anchorScore);
    output.push({
      rank: index + 1,
      anchorJointProbability,
      anchorLogJointProbability: stratum.anchorScore,
      anchorJointProbabilityUnderflowed: anchorJointProbability === null,
      trajectoryCount: atoms.length,
      trajectories: atoms
    });
  }
  return { ok: true, strata: output, trajectoryCount };
}

function diagnostics(
  resolved: ResolvedOptions,
  rankedPredecessorsUsed: number,
  allRankedTrajectoriesExhausted: boolean
): FiniteRankedKBestHiddenTrajectoryDecodingDiagnostics {
  return {
    method: 'sparse_log_domain_ranked_hidden_monitor_dp_with_complete_retained_provenance',
    numericRepresentation: 'javascript_number_float64_with_log_score',
    monitorDeterministic: true,
    candidateAEValidationReused: true,
    candidateAESumProductDenominatorReused: true,
    hiddenTrajectoryRanked: true,
    parallelTransitionIdentityUsed: false,
    inputNormalizationApplied: false,
    approximationUsed: false,
    beamSearchUsed: false,
    trajectoryCountTopKUsed: false,
    randomTieBreakingUsed: false,
    posteriorSamplingUsed: false,
    parameterLearningUsed: false,
    rankDepthReduced: false,
    tieStratumTruncated: false,
    requestedRankDepth: resolved.rankDepth,
    kBestScoreTolerance: resolved.kBestScoreTolerance,
    maxReturnedKBestTrajectories: resolved.maxReturnedKBestTrajectories,
    maxRankedPredecessors: resolved.maxRankedPredecessors,
    rankedPredecessorsUsed,
    allRankedTrajectoriesExhausted,
    existingQualifiedRequestTypesModified: false
  };
}

function impossibleDiagnostics(
  resolved: ResolvedOptions
): FiniteRankedKBestHiddenTrajectoryDecodingDiagnostics {
  return diagnostics(resolved, 0, true);
}

export function decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
  model: DefinitionModel,
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  options: FiniteRankedKBestHiddenTrajectoryDecodingOptions = {}
): FiniteRankedKBestHiddenTrajectoryDecodingResult {
  if (request === null || typeof request !== 'object') {
    return fail('invalid_candidate_ag_request', 'request must be an object', { path: 'request' });
  }
  const resolvedResult = resolveOptions(request, options);
  if (!resolvedResult.ok) return resolvedResult;
  const resolved = resolvedResult.resolved;
  const aeOptions: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = options;
  const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
    model,
    request,
    aeOptions
  );
  if (!ae.ok) {
    return fail('invalid_candidate_ag_request', ae.failure.message, {
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
      requestedRankDepth: request.rankDepth,
      returnedRankStrataCount: 0,
      allRankedTrajectoriesExhausted: true,
      returnedTrajectoryCount: 0,
      rankStrata: null,
      diagnostics: impossibleDiagnostics(resolved)
    };
  }
  const prepared = prepareFromAe(model, request, ae);
  const rankedResult = runRankedDp(request, prepared, resolved);
  if (!rankedResult.ok) return rankedResult;
  const built = buildResultStrata(rankedResult.ranked, ae.logEvidenceProbability, resolved);
  if (!built.ok) return built;
  return {
    ok: true,
    possible: true,
    impossibility: null,
    horizon: request.horizon,
    evidenceProbability: ae.evidenceProbability,
    logEvidenceProbability: ae.logEvidenceProbability,
    requestedRankDepth: request.rankDepth,
    returnedRankStrataCount: built.strata.length,
    allRankedTrajectoriesExhausted: rankedResult.ranked.allRankedTrajectoriesExhausted,
    returnedTrajectoryCount: built.trajectoryCount,
    rankStrata: built.strata,
    diagnostics: diagnostics(
      resolved,
      rankedResult.ranked.rankedPredecessorsUsed,
      rankedResult.ranked.allRankedTrajectoriesExhausted
    )
  };
}

export function decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
  model: DefinitionModel,
  request: FiniteRankedKBestHiddenTrajectoryConditionedDecodingRequest,
  options: FiniteRankedKBestHiddenTrajectoryDecodingOptions = {}
): FiniteRankedKBestHiddenTrajectoryConditionedDecodingResult {
  if (request === null || typeof request !== 'object') {
    return fail('invalid_candidate_ag_request', 'request must be an object', { path: 'request' });
  }
  const resolvedResult = resolveOptions(request, options);
  if (!resolvedResult.ok) return resolvedResult;
  const resolved = resolvedResult.resolved;
  const aeOptions: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = options;
  const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
    model,
    request,
    aeOptions
  );
  if (!ae.ok) {
    return fail('invalid_candidate_ag_request', ae.failure.message, {
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
    return fail('invalid_candidate_ag_request', conditioned.failure.message, {
      sourceFailureCode: conditioned.failure.code
    });
  }
  const baseImpossible = impossibleDiagnostics(resolved);
  const impossibleConditionedDiagnostics: FiniteRankedKBestHiddenTrajectoryConditionedDecodingDiagnostics = {
    ...baseImpossible,
    conditioningMethod: 'terminal_monitor_set_restricted_ranked_log_dp'
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
      requestedRankDepth: request.rankDepth,
      returnedRankStrataCount: 0,
      allRankedTrajectoriesExhausted: true,
      returnedTrajectoryCount: 0,
      rankStrata: null,
      diagnostics: impossibleConditionedDiagnostics
    };
  }
  const prepared = prepareFromAe(model, request, ae);
  const target = new Set(conditioned.targetMonitorStates);
  const rankedResult = runRankedDp(request, prepared, resolved, target);
  if (!rankedResult.ok) return rankedResult;
  const built = buildResultStrata(
    rankedResult.ranked,
    conditioned.logJointEventProbability,
    resolved
  );
  if (!built.ok) return built;
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
    requestedRankDepth: request.rankDepth,
    returnedRankStrataCount: built.strata.length,
    allRankedTrajectoriesExhausted: rankedResult.ranked.allRankedTrajectoriesExhausted,
    returnedTrajectoryCount: built.trajectoryCount,
    rankStrata: built.strata,
    diagnostics: {
      ...diagnostics(
        resolved,
        rankedResult.ranked.rankedPredecessorsUsed,
        rankedResult.ranked.allRankedTrajectoriesExhausted
      ),
      conditioningMethod: 'terminal_monitor_set_restricted_ranked_log_dp'
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

export function finiteRankedKBestHiddenTrajectoryDecodingResultToJson(
  result: FiniteRankedKBestHiddenTrajectoryDecodingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AG ranked K-best decoding result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}

export function finiteRankedKBestHiddenTrajectoryConditionedDecodingResultToJson(
  result: FiniteRankedKBestHiddenTrajectoryConditionedDecodingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AG conditioned ranked K-best decoding result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
