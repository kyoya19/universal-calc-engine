export type FiniteRobustDecisionCandidate = {
  candidateId: string;
};

export type FiniteRobustDecisionAction = {
  actionId: string;
};

export type FiniteRobustDecisionValue = {
  candidateId: string;
  actionId: string;
  expectedReward: number;
};

export type FiniteAmbiguityPreservingRobustDecisionRequest = {
  candidates: FiniteRobustDecisionCandidate[];
  actions: FiniteRobustDecisionAction[];
  values: FiniteRobustDecisionValue[];
};

export type FiniteAmbiguityPreservingRobustDecisionOptions = {
  actionValueTolerance?: number;
  maxCandidates?: number;
  maxActions?: number;
  maxMatrixEntries?: number;
};

export type FiniteAmbiguityPreservingRobustDecisionFailureCode =
  | 'invalid_options'
  | 'invalid_candidate_set'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_action_set'
  | 'duplicate_action_id'
  | 'action_count_exceeds_limit'
  | 'invalid_value_matrix'
  | 'unknown_candidate_id'
  | 'unknown_action_id'
  | 'duplicate_matrix_entry'
  | 'missing_matrix_entry'
  | 'matrix_entry_count_exceeds_limit'
  | 'non_finite_expected_reward'
  | 'non_finite_analytical_result';

export type FiniteAmbiguityPreservingRobustDecisionFailure = {
  code: FiniteAmbiguityPreservingRobustDecisionFailureCode;
  message: string;
  path?: string;
  candidateId?: string;
  actionId?: string;
};

export type FiniteRobustDecisionCandidateValue = {
  candidateId: string;
  expectedReward: number;
};

export type FiniteRobustDecisionActionEvaluation = {
  actionId: string;
  candidateValues: FiniteRobustDecisionCandidateValue[];
  robustExpectedReward: number;
  worstCaseCandidateIds: string[];
  scoreDeltaFromBest: number;
  maximinOptimal: boolean;
};

export type FiniteAmbiguityPreservingRobustDecisionClassification =
  | 'unique_maximin_action'
  | 'tied_maximin_action';

export type FiniteAmbiguityPreservingRobustDecisionDiagnostics = {
  method: 'finite_candidate_ambiguity_maximin_expected_reward';
  objective: 'maximum_worst_case_expected_reward';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  candidatePriorUsed: false;
  candidatePosteriorUsed: false;
  candidateLikelihoodWeightingUsed: false;
  equalCandidateProbabilityAssumed: false;
  minimaxRegretUsed: false;
  cvarUsed: false;
  mixedActionUsed: false;
  stateTransitionOptimizationUsed: false;
  learningWhileActingUsed: false;
  candidateOrderAffectsSelection: false;
  actionOrderAffectsSelection: false;
  ambiguityPreserved: true;
  actionValueTolerance: number;
  maxCandidates: number;
  maxActions: number;
  maxMatrixEntries: number;
  candidateCount: number;
  actionCount: number;
  matrixEntryCount: number;
};

export type FiniteAmbiguityPreservingRobustDecisionSuccess = {
  ok: true;
  classification: FiniteAmbiguityPreservingRobustDecisionClassification;
  evaluations: FiniteRobustDecisionActionEvaluation[];
  bestRobustExpectedReward: number;
  selectedActionIds: string[];
  diagnostics: FiniteAmbiguityPreservingRobustDecisionDiagnostics;
};

export type FiniteAmbiguityPreservingRobustDecisionFailureResult = {
  ok: false;
  failure: FiniteAmbiguityPreservingRobustDecisionFailure;
};

export type FiniteAmbiguityPreservingRobustDecisionResult =
  | FiniteAmbiguityPreservingRobustDecisionSuccess
  | FiniteAmbiguityPreservingRobustDecisionFailureResult;

const DEFAULT_ACTION_VALUE_TOLERANCE = 1e-12;
const DEFAULT_MAX_CANDIDATES = 10_000;
const DEFAULT_MAX_ACTIONS = 10_000;
const DEFAULT_MAX_MATRIX_ENTRIES = 1_000_000;

type ResolvedOptions = {
  actionValueTolerance: number;
  maxCandidates: number;
  maxActions: number;
  maxMatrixEntries: number;
};

type CanonicalMatrixEntry = {
  candidateId: string;
  actionId: string;
  expectedReward: number;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: FiniteAmbiguityPreservingRobustDecisionFailureCode,
  message: string,
  details: Omit<FiniteAmbiguityPreservingRobustDecisionFailure, 'code' | 'message'> = {}
): FiniteAmbiguityPreservingRobustDecisionFailureResult {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveInteger(
  value: number | undefined,
  fallback: number,
  path: string
): number | FiniteAmbiguityPreservingRobustDecisionFailureResult {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) {
    return failure('invalid_options', `${path} must be a positive integer`, { path });
  }
  return resolved;
}

function resolveOptions(
  options: FiniteAmbiguityPreservingRobustDecisionOptions
): ResolvedOptions | FiniteAmbiguityPreservingRobustDecisionFailureResult {
  const actionValueTolerance = options.actionValueTolerance ?? DEFAULT_ACTION_VALUE_TOLERANCE;
  if (!Number.isFinite(actionValueTolerance) || actionValueTolerance <= 0) {
    return failure('invalid_options', 'actionValueTolerance must be a finite positive number', {
      path: 'options.actionValueTolerance'
    });
  }
  const maxCandidates = resolvePositiveInteger(
    options.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
    'options.maxCandidates'
  );
  if (typeof maxCandidates !== 'number') return maxCandidates;
  const maxActions = resolvePositiveInteger(options.maxActions, DEFAULT_MAX_ACTIONS, 'options.maxActions');
  if (typeof maxActions !== 'number') return maxActions;
  const maxMatrixEntries = resolvePositiveInteger(
    options.maxMatrixEntries,
    DEFAULT_MAX_MATRIX_ENTRIES,
    'options.maxMatrixEntries'
  );
  if (typeof maxMatrixEntries !== 'number') return maxMatrixEntries;
  return { actionValueTolerance, maxCandidates, maxActions, maxMatrixEntries };
}

function isFailureResult(
  value: unknown
): value is FiniteAmbiguityPreservingRobustDecisionFailureResult {
  return typeof value === 'object' && value !== null && 'ok' in value && value.ok === false;
}

function canonicalIds(
  entries: Array<{ candidateId: string }> | Array<{ actionId: string }>,
  kind: 'candidate' | 'action',
  limit: number
): string[] | FiniteAmbiguityPreservingRobustDecisionFailureResult {
  if (!Array.isArray(entries) || entries.length === 0) {
    return failure(kind === 'candidate' ? 'invalid_candidate_set' : 'invalid_action_set',
      `At least one ${kind} is required`, { path: `request.${kind}s` });
  }
  if (entries.length > limit) {
    return failure(
      kind === 'candidate' ? 'candidate_count_exceeds_limit' : 'action_count_exceeds_limit',
      `${kind} count exceeds configured limit=${limit}`,
      { path: `request.${kind}s` }
    );
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as { candidateId?: string; actionId?: string } | undefined;
    const raw = kind === 'candidate' ? entry?.candidateId : entry?.actionId;
    const path = `request.${kind}s[${index}].${kind}Id`;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return failure(kind === 'candidate' ? 'invalid_candidate_set' : 'invalid_action_set',
        `${kind}Id must be a non-empty string`, { path });
    }
    const id = raw.trim();
    if (seen.has(id)) {
      return failure(kind === 'candidate' ? 'duplicate_candidate_id' : 'duplicate_action_id',
        `Duplicate ${kind}Id: ${id}`, {
          path,
          ...(kind === 'candidate' ? { candidateId: id } : { actionId: id })
        });
    }
    seen.add(id);
    ids.push(id);
  }
  return ids.sort(compareStrings);
}

function canonicalMatrix(
  values: FiniteRobustDecisionValue[],
  candidateIds: string[],
  actionIds: string[],
  options: ResolvedOptions
): CanonicalMatrixEntry[] | FiniteAmbiguityPreservingRobustDecisionFailureResult {
  if (!Array.isArray(values)) {
    return failure('invalid_value_matrix', 'request.values must be an array', {
      path: 'request.values'
    });
  }
  const requiredEntries = candidateIds.length * actionIds.length;
  if (!Number.isSafeInteger(requiredEntries) || requiredEntries > options.maxMatrixEntries) {
    return failure(
      'matrix_entry_count_exceeds_limit',
      `Required matrix entries exceed maxMatrixEntries=${options.maxMatrixEntries}`,
      { path: 'request.values' }
    );
  }
  if (values.length > options.maxMatrixEntries) {
    return failure(
      'matrix_entry_count_exceeds_limit',
      `Matrix entry count exceeds maxMatrixEntries=${options.maxMatrixEntries}`,
      { path: 'request.values' }
    );
  }
  const knownCandidates = new Set(candidateIds);
  const knownActions = new Set(actionIds);
  const seen = new Set<string>();
  const canonical: CanonicalMatrixEntry[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const entry = values[index];
    const basePath = `request.values[${index}]`;
    if (entry === undefined || typeof entry.candidateId !== 'string') {
      return failure('invalid_value_matrix', 'Every matrix entry requires candidateId', {
        path: `${basePath}.candidateId`
      });
    }
    if (typeof entry.actionId !== 'string') {
      return failure('invalid_value_matrix', 'Every matrix entry requires actionId', {
        path: `${basePath}.actionId`
      });
    }
    const candidateId = entry.candidateId.trim();
    const actionId = entry.actionId.trim();
    if (!knownCandidates.has(candidateId)) {
      return failure('unknown_candidate_id', `Unknown candidateId: ${candidateId}`, {
        path: `${basePath}.candidateId`, candidateId, actionId
      });
    }
    if (!knownActions.has(actionId)) {
      return failure('unknown_action_id', `Unknown actionId: ${actionId}`, {
        path: `${basePath}.actionId`, candidateId, actionId
      });
    }
    if (!Number.isFinite(entry.expectedReward)) {
      return failure('non_finite_expected_reward', 'expectedReward must be finite', {
        path: `${basePath}.expectedReward`, candidateId, actionId
      });
    }
    const key = `${candidateId}\u0000${actionId}`;
    if (seen.has(key)) {
      return failure('duplicate_matrix_entry', `Duplicate matrix entry for ${candidateId}/${actionId}`, {
        path: basePath, candidateId, actionId
      });
    }
    seen.add(key);
    canonical.push({ candidateId, actionId, expectedReward: entry.expectedReward });
  }

  for (const candidateId of candidateIds) {
    for (const actionId of actionIds) {
      const key = `${candidateId}\u0000${actionId}`;
      if (!seen.has(key)) {
        return failure('missing_matrix_entry', `Missing matrix entry for ${candidateId}/${actionId}`, {
          path: 'request.values', candidateId, actionId
        });
      }
    }
  }
  if (canonical.length !== requiredEntries) {
    return failure('invalid_value_matrix', 'Matrix must contain exactly one entry per candidate/action pair', {
      path: 'request.values'
    });
  }

  return canonical.sort((left, right) => {
    const actionOrder = compareStrings(left.actionId, right.actionId);
    return actionOrder !== 0 ? actionOrder : compareStrings(left.candidateId, right.candidateId);
  });
}

export function selectFiniteAmbiguityPreservingRobustActions(
  request: FiniteAmbiguityPreservingRobustDecisionRequest,
  options: FiniteAmbiguityPreservingRobustDecisionOptions = {}
): FiniteAmbiguityPreservingRobustDecisionResult {
  const resolved = resolveOptions(options);
  if (isFailureResult(resolved)) return resolved;
  const candidateIds = canonicalIds(request.candidates, 'candidate', resolved.maxCandidates);
  if (!Array.isArray(candidateIds)) return candidateIds;
  const actionIds = canonicalIds(request.actions, 'action', resolved.maxActions);
  if (!Array.isArray(actionIds)) return actionIds;
  const matrix = canonicalMatrix(request.values, candidateIds, actionIds, resolved);
  if (!Array.isArray(matrix)) return matrix;

  const byAction = new Map<string, FiniteRobustDecisionCandidateValue[]>();
  for (const actionId of actionIds) byAction.set(actionId, []);
  for (const entry of matrix) {
    const row = byAction.get(entry.actionId);
    if (row === undefined) {
      return failure('non_finite_analytical_result', `Internal action row missing for ${entry.actionId}`, {
        actionId: entry.actionId
      });
    }
    row.push({ candidateId: entry.candidateId, expectedReward: entry.expectedReward });
  }

  const preliminary: Array<Omit<FiniteRobustDecisionActionEvaluation, 'scoreDeltaFromBest' | 'maximinOptimal'>> = [];
  for (const actionId of actionIds) {
    const candidateValues = byAction.get(actionId);
    if (candidateValues === undefined || candidateValues.length !== candidateIds.length) {
      return failure('non_finite_analytical_result', `Internal candidate row mismatch for ${actionId}`, {
        actionId
      });
    }
    const robustExpectedReward = Math.min(...candidateValues.map((entry) => entry.expectedReward));
    if (!Number.isFinite(robustExpectedReward)) {
      return failure('non_finite_analytical_result', `Robust expected reward became non-finite for ${actionId}`, {
        actionId
      });
    }
    const worstCaseCandidateIds = candidateValues
      .filter(
        (entry) =>
          Math.abs(entry.expectedReward - robustExpectedReward) <= resolved.actionValueTolerance
      )
      .map((entry) => entry.candidateId)
      .sort(compareStrings);
    preliminary.push({
      actionId,
      candidateValues: [...candidateValues].sort((left, right) => compareStrings(left.candidateId, right.candidateId)),
      robustExpectedReward,
      worstCaseCandidateIds
    });
  }

  const bestRobustExpectedReward = Math.max(
    ...preliminary.map((entry) => entry.robustExpectedReward)
  );
  if (!Number.isFinite(bestRobustExpectedReward)) {
    return failure('non_finite_analytical_result', 'Best robust expected reward became non-finite');
  }

  const evaluations: FiniteRobustDecisionActionEvaluation[] = preliminary.map((entry) => {
    const scoreDeltaFromBest = entry.robustExpectedReward - bestRobustExpectedReward;
    if (!Number.isFinite(scoreDeltaFromBest)) {
      throw new Error(`Candidate M internal non-finite score delta for ${entry.actionId}`);
    }
    return {
      ...entry,
      scoreDeltaFromBest,
      maximinOptimal: Math.abs(scoreDeltaFromBest) <= resolved.actionValueTolerance
    };
  });
  const selectedActionIds = evaluations
    .filter((entry) => entry.maximinOptimal)
    .map((entry) => entry.actionId);
  const classification: FiniteAmbiguityPreservingRobustDecisionClassification =
    selectedActionIds.length === 1 ? 'unique_maximin_action' : 'tied_maximin_action';

  return {
    ok: true,
    classification,
    evaluations,
    bestRobustExpectedReward,
    selectedActionIds,
    diagnostics: {
      method: 'finite_candidate_ambiguity_maximin_expected_reward',
      objective: 'maximum_worst_case_expected_reward',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      candidatePriorUsed: false,
      candidatePosteriorUsed: false,
      candidateLikelihoodWeightingUsed: false,
      equalCandidateProbabilityAssumed: false,
      minimaxRegretUsed: false,
      cvarUsed: false,
      mixedActionUsed: false,
      stateTransitionOptimizationUsed: false,
      learningWhileActingUsed: false,
      candidateOrderAffectsSelection: false,
      actionOrderAffectsSelection: false,
      ambiguityPreserved: true,
      actionValueTolerance: resolved.actionValueTolerance,
      maxCandidates: resolved.maxCandidates,
      maxActions: resolved.maxActions,
      maxMatrixEntries: resolved.maxMatrixEntries,
      candidateCount: candidateIds.length,
      actionCount: actionIds.length,
      matrixEntryCount: matrix.length
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

export function finiteAmbiguityPreservingRobustDecisionResultToJson(
  result: FiniteAmbiguityPreservingRobustDecisionResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite ambiguity-preserving robust decision result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
