import {
  CandidateLikelihoodResult,
  DiscreteEstimationMethod,
  EstimationConstraint,
  EstimationIssue,
  ExcludedCandidate,
  estimateDiscreteParameterCandidates
} from './discrete_estimation';
import { ExternalModelDocument } from './external_input';
import { ObservationDataset, ObservationRecord } from './observations';
import {
  ScalarGaussianCandidateDiagnostics,
  ScalarGaussianEstimationMethod,
  ScalarGaussianLikelihoodBinding,
  ScalarGaussianObservationScore,
  ScalarGaussianRejectedCandidate,
  estimateScalarGaussianParameterCandidates
} from './scalar_gaussian_estimation';
import { SolverDiagnosticsOptions } from './solver_diagnostics';

export type CompositeEvidenceIndependenceAssumption =
  'transition_and_scalar_evidence_conditionally_independent_given_candidate';

export type CompositeLikelihoodEstimationMethod =
  'transition_plus_scalar_gaussian_composite_log_likelihood';

export type CompositeLikelihoodEstimationRequest = {
  parameterId: string;
  candidates: number[];
  constraints?: EstimationConstraint[];
  transitionObservationIds: string[];
  scalarLikelihoods: ScalarGaussianLikelihoodBinding[];
  independenceAssumption: CompositeEvidenceIndependenceAssumption;
  solver?: SolverDiagnosticsOptions;
};

export type CompositeCandidateResult = {
  value: number;
  possible: boolean;
  transitionLogLikelihoodScore: number | null;
  scalarGaussianLogLikelihoodScore: number;
  totalLogLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
  transitionStateScores: CandidateLikelihoodResult['stateScores'];
  scalarObservationScores: ScalarGaussianObservationScore[];
  scalarDiagnostics: ScalarGaussianCandidateDiagnostics;
};

export type CompositeRejectedCandidate = {
  value: number;
  components: Array<{
    component: 'transition' | 'scalar_gaussian';
    stage: string;
    issues: EstimationIssue[];
  }>;
};

export type CompositeLikelihoodFailureStage =
  | 'request'
  | 'evidence_partition'
  | 'transition_component'
  | 'scalar_component'
  | 'candidate_evaluation';

export type CompositeLikelihoodEstimationSuccess = {
  ok: true;
  method: CompositeLikelihoodEstimationMethod;
  transitionMethod: DiscreteEstimationMethod;
  scalarMethod: ScalarGaussianEstimationMethod;
  parameterId: string;
  candidates: CompositeCandidateResult[];
  excludedCandidates: ExcludedCandidate[];
  rejectedCandidates: CompositeRejectedCandidate[];
  bestCandidateValues: number[];
  estimatedValue: number | null;
  usedObservationIds: {
    transition: string[];
    scalar: string[];
    all: string[];
  };
  independenceAssumption: CompositeEvidenceIndependenceAssumption;
  transitionMultinomialConstantOmitted: true;
  scoreInterpretation:
    'sum_of_component_log_likelihood_scores_up_to_transition_candidate_independent_constant';
  priorUsed: false;
  posteriorComputed: false;
};

export type CompositeLikelihoodEstimationFailure = {
  ok: false;
  stage: CompositeLikelihoodFailureStage;
  componentStage?: string;
  issues: EstimationIssue[];
};

export type CompositeLikelihoodEstimationResult =
  | CompositeLikelihoodEstimationSuccess
  | CompositeLikelihoodEstimationFailure;

type EvidencePartition = {
  ok: true;
  transition: ObservationDataset;
  scalar: ObservationDataset;
  transitionIds: string[];
  scalarIds: string[];
};

const METHOD: CompositeLikelihoodEstimationMethod =
  'transition_plus_scalar_gaussian_composite_log_likelihood';
const INDEPENDENCE: CompositeEvidenceIndependenceAssumption =
  'transition_and_scalar_evidence_conditionally_independent_given_candidate';

function failure(
  stage: CompositeLikelihoodFailureStage,
  code: string,
  path: string,
  message: string,
  componentStage?: string
): CompositeLikelihoodEstimationFailure {
  return {
    ok: false,
    stage,
    ...(componentStage !== undefined ? { componentStage } : {}),
    issues: [{ code, path, message }]
  };
}

function validateCompositeRequest(
  request: CompositeLikelihoodEstimationRequest
): CompositeLikelihoodEstimationFailure | undefined {
  if (request.independenceAssumption !== INDEPENDENCE) {
    return failure(
      'request',
      'missing_composite_independence_assumption',
      'request.independenceAssumption',
      `Composite likelihood requires the explicit assumption: ${INDEPENDENCE}`
    );
  }
  if (request.transitionObservationIds.length === 0) {
    return failure(
      'request',
      'empty_transition_evidence_block',
      'request.transitionObservationIds',
      'At least one transition evidence observation ID is required'
    );
  }

  const seenTransitionIds = new Set<string>();
  for (let index = 0; index < request.transitionObservationIds.length; index += 1) {
    const id = request.transitionObservationIds[index];
    if (id === undefined || id.trim().length === 0) {
      return failure(
        'request',
        'empty_transition_observation_id',
        `request.transitionObservationIds[${index}]`,
        'Transition evidence observation IDs must not be empty'
      );
    }
    if (seenTransitionIds.has(id)) {
      return failure(
        'request',
        'duplicate_transition_observation_id',
        `request.transitionObservationIds[${index}]`,
        `Duplicate transition evidence observation ID: ${id}`
      );
    }
    seenTransitionIds.add(id);
  }

  const seenScalarIds = new Set<string>();
  for (let index = 0; index < request.scalarLikelihoods.length; index += 1) {
    const binding = request.scalarLikelihoods[index];
    if (binding === undefined) {
      continue;
    }
    if (seenScalarIds.has(binding.observationId)) {
      return failure(
        'request',
        'duplicate_scalar_observation_binding',
        `request.scalarLikelihoods[${index}].observationId`,
        `Duplicate scalar likelihood binding: ${binding.observationId}`
      );
    }
    seenScalarIds.add(binding.observationId);
    if (seenTransitionIds.has(binding.observationId)) {
      return failure(
        'request',
        'evidence_observation_used_by_multiple_blocks',
        `request.scalarLikelihoods[${index}].observationId`,
        `Observation ${binding.observationId} is assigned to both transition and scalar evidence blocks`
      );
    }
  }

  return undefined;
}

function partitionEvidence(
  observations: ObservationDataset,
  request: CompositeLikelihoodEstimationRequest
): EvidencePartition | CompositeLikelihoodEstimationFailure {
  const transitionIds = new Set(request.transitionObservationIds);
  const scalarIds = new Set(request.scalarLikelihoods.map((binding) => binding.observationId));
  const recordsById = new Map<string, ObservationRecord>();
  const issues: EstimationIssue[] = [];

  observations.observations.forEach((observation, index) => {
    if (recordsById.has(observation.id)) {
      issues.push({
        code: 'duplicate_observation_id_for_evidence_partition',
        path: `observations[${index}].id`,
        message: `Duplicate observation ID cannot be partitioned safely: ${observation.id}`
      });
      return;
    }
    recordsById.set(observation.id, observation);
  });

  for (let index = 0; index < request.transitionObservationIds.length; index += 1) {
    const id = request.transitionObservationIds[index];
    if (id === undefined) {
      continue;
    }
    const observation = recordsById.get(id);
    if (observation === undefined) {
      issues.push({
        code: 'unknown_transition_evidence_observation',
        path: `request.transitionObservationIds[${index}]`,
        message: `Unknown transition evidence observation: ${id}`
      });
      continue;
    }
    if (observation.type === 'scalar') {
      issues.push({
        code: 'scalar_observation_in_transition_evidence_block',
        path: `request.transitionObservationIds[${index}]`,
        message: `Scalar observation cannot be used by the transition-count likelihood block: ${id}`
      });
    }
  }

  request.scalarLikelihoods.forEach((binding, index) => {
    const observation = recordsById.get(binding.observationId);
    if (observation === undefined) {
      issues.push({
        code: 'unknown_scalar_evidence_observation',
        path: `request.scalarLikelihoods[${index}].observationId`,
        message: `Unknown scalar evidence observation: ${binding.observationId}`
      });
      return;
    }
    if (observation.type !== 'scalar') {
      issues.push({
        code: 'non_scalar_observation_in_scalar_evidence_block',
        path: `request.scalarLikelihoods[${index}].observationId`,
        message: `Only scalar observations can be used by the scalar Gaussian likelihood block: ${binding.observationId}`
      });
    }
  });

  observations.observations.forEach((observation, index) => {
    if (!transitionIds.has(observation.id) && !scalarIds.has(observation.id)) {
      issues.push({
        code: 'unassigned_composite_evidence_observation',
        path: `observations[${index}]`,
        message: `Every observation must be assigned to exactly one composite evidence block: ${observation.id}`
      });
    }
  });

  if (issues.length > 0) {
    return { ok: false, stage: 'evidence_partition', issues };
  }

  const transitionRecords = observations.observations.filter((observation) =>
    transitionIds.has(observation.id)
  );
  const scalarRecords = observations.observations.filter((observation) =>
    scalarIds.has(observation.id)
  );

  return {
    ok: true,
    transition: { schemaVersion: 1, observations: transitionRecords },
    scalar: { schemaVersion: 1, observations: scalarRecords },
    transitionIds: transitionRecords.map((observation) => observation.id),
    scalarIds: scalarRecords.map((observation) => observation.id)
  };
}

function componentFailure(
  stage: 'transition_component' | 'scalar_component',
  componentStage: string,
  issues: EstimationIssue[]
): CompositeLikelihoodEstimationFailure {
  return {
    ok: false,
    stage,
    componentStage,
    issues: issues.map((issue) => ({ ...issue }))
  };
}

function toRejectedComponents(
  transitionRejected: Array<{ value: number; stage: string; issues: EstimationIssue[] }>,
  scalarRejected: ScalarGaussianRejectedCandidate[]
): Map<number, CompositeRejectedCandidate> {
  const rejected = new Map<number, CompositeRejectedCandidate>();

  for (const candidate of transitionRejected) {
    rejected.set(candidate.value, {
      value: candidate.value,
      components: [
        {
          component: 'transition',
          stage: candidate.stage,
          issues: candidate.issues.map((issue) => ({ ...issue }))
        }
      ]
    });
  }

  for (const candidate of scalarRejected) {
    const entry = rejected.get(candidate.value) ?? {
      value: candidate.value,
      components: []
    };
    entry.components.push({
      component: 'scalar_gaussian',
      stage: candidate.stage,
      issues: candidate.issues.map((issue) => ({ ...issue }))
    });
    rejected.set(candidate.value, entry);
  }

  return rejected;
}

function rankCandidates(candidates: CompositeCandidateResult[]): void {
  const possible = candidates.filter(
    (candidate): candidate is CompositeCandidateResult & { totalLogLikelihoodScore: number } =>
      candidate.possible && candidate.totalLogLikelihoodScore !== null
  );
  possible.sort((left, right) => right.totalLogLikelihoodScore - left.totalLogLikelihoodScore);
  const best = possible[0]?.totalLogLikelihoodScore;
  if (best === undefined) {
    return;
  }

  possible.forEach((candidate, index) => {
    candidate.rank = index + 1;
    candidate.relativeLikelihoodToBest = Math.exp(candidate.totalLogLikelihoodScore - best);
  });
  candidates.sort((left, right) => {
    if (left.rank === null && right.rank === null) {
      return 0;
    }
    if (left.rank === null) {
      return 1;
    }
    if (right.rank === null) {
      return -1;
    }
    return left.rank - right.rank;
  });
}

function bestCandidateValues(candidates: CompositeCandidateResult[]): number[] {
  const possible = candidates.filter(
    (candidate): candidate is CompositeCandidateResult & { totalLogLikelihoodScore: number } =>
      candidate.possible && candidate.totalLogLikelihoodScore !== null
  );
  const best = possible[0]?.totalLogLikelihoodScore;
  if (best === undefined) {
    return [];
  }
  const tolerance = 1e-12;
  return possible
    .filter((candidate) => Math.abs(candidate.totalLogLikelihoodScore - best) <= tolerance)
    .map((candidate) => candidate.value);
}

export function estimateCompositeParameterCandidates(
  document: ExternalModelDocument,
  observations: ObservationDataset,
  request: CompositeLikelihoodEstimationRequest
): CompositeLikelihoodEstimationResult {
  const invalidCompositeRequest = validateCompositeRequest(request);
  if (invalidCompositeRequest !== undefined) {
    return invalidCompositeRequest;
  }

  const partition = partitionEvidence(observations, request);
  if (!partition.ok) {
    return partition;
  }

  const baseRequest = {
    parameterId: request.parameterId,
    candidates: request.candidates,
    ...(request.constraints !== undefined ? { constraints: request.constraints } : {})
  };
  const transition = estimateDiscreteParameterCandidates(
    document,
    partition.transition,
    baseRequest
  );
  if (!transition.ok) {
    return componentFailure('transition_component', transition.stage, transition.issues);
  }

  const scalar = estimateScalarGaussianParameterCandidates(
    document,
    partition.scalar,
    {
      ...baseRequest,
      scalarLikelihoods: request.scalarLikelihoods,
      ...(request.solver !== undefined ? { solver: request.solver } : {})
    }
  );
  if (!scalar.ok) {
    return componentFailure('scalar_component', scalar.stage, scalar.issues);
  }

  const transitionByValue = new Map(
    transition.candidates.map((candidate) => [candidate.value, candidate] as const)
  );
  const scalarByValue = new Map(
    scalar.candidates.map((candidate) => [candidate.value, candidate] as const)
  );
  const rejected = toRejectedComponents(transition.rejectedCandidates, scalar.rejectedCandidates);
  const excludedValues = new Set(transition.excludedCandidates.map((candidate) => candidate.value));
  const candidates: CompositeCandidateResult[] = [];

  for (const value of request.candidates) {
    if (excludedValues.has(value)) {
      continue;
    }
    const transitionCandidate = transitionByValue.get(value);
    const scalarCandidate = scalarByValue.get(value);

    if (transitionCandidate === undefined || scalarCandidate === undefined) {
      const entry = rejected.get(value) ?? { value, components: [] };
      if (
        transitionCandidate === undefined &&
        !entry.components.some((item) => item.component === 'transition')
      ) {
        entry.components.push({
          component: 'transition',
          stage: 'candidate_evaluation',
          issues: [
            {
              code: 'missing_transition_component_candidate',
              path: 'candidate',
              message: `Transition likelihood did not return candidate ${value}`
            }
          ]
        });
      }
      if (
        scalarCandidate === undefined &&
        !entry.components.some((item) => item.component === 'scalar_gaussian')
      ) {
        entry.components.push({
          component: 'scalar_gaussian',
          stage: 'candidate_evaluation',
          issues: [
            {
              code: 'missing_scalar_component_candidate',
              path: 'candidate',
              message: `Scalar Gaussian likelihood did not return candidate ${value}`
            }
          ]
        });
      }
      rejected.set(value, entry);
      continue;
    }

    const possible = transitionCandidate.possible;
    const transitionScore = transitionCandidate.logLikelihoodScore;
    const total =
      possible && transitionScore !== null
        ? transitionScore + scalarCandidate.logLikelihoodScore
        : null;

    candidates.push({
      value,
      possible,
      transitionLogLikelihoodScore: transitionScore,
      scalarGaussianLogLikelihoodScore: scalarCandidate.logLikelihoodScore,
      totalLogLikelihoodScore: total,
      relativeLikelihoodToBest: 0,
      rank: null,
      transitionStateScores: transitionCandidate.stateScores.map((score) => ({ ...score })),
      scalarObservationScores: scalarCandidate.observationScores.map((score) => ({ ...score })),
      scalarDiagnostics: {
        ...(scalarCandidate.diagnostics.expectedElapsedTime !== undefined
          ? { expectedElapsedTime: { ...scalarCandidate.diagnostics.expectedElapsedTime } }
          : {}),
        ...(scalarCandidate.diagnostics.rewardAxes !== undefined
          ? {
              rewardAxes: Object.fromEntries(
                Object.entries(scalarCandidate.diagnostics.rewardAxes).map(
                  ([axisId, diagnostics]) => [axisId, { ...diagnostics }]
                )
              )
            }
          : {})
      }
    });
  }

  if (candidates.length === 0) {
    return failure(
      'candidate_evaluation',
      'no_composite_candidates',
      'request.candidates',
      'No candidate produced both transition and scalar component results'
    );
  }

  rankCandidates(candidates);
  const bestValues = bestCandidateValues(candidates);
  const allUsed = [...partition.transitionIds, ...partition.scalarIds];

  return {
    ok: true,
    method: METHOD,
    transitionMethod: transition.method,
    scalarMethod: scalar.method,
    parameterId: request.parameterId,
    candidates,
    excludedCandidates: transition.excludedCandidates.map((candidate) => ({
      value: candidate.value,
      failedConstraints: candidate.failedConstraints.map((constraint) => ({ ...constraint }))
    })),
    rejectedCandidates: [...rejected.values()],
    bestCandidateValues: bestValues,
    estimatedValue: bestValues.length === 1 ? bestValues[0] ?? null : null,
    usedObservationIds: {
      transition: [...transition.usedObservationIds],
      scalar: [...scalar.usedObservationIds],
      all: allUsed
    },
    independenceAssumption: INDEPENDENCE,
    transitionMultinomialConstantOmitted: true,
    scoreInterpretation:
      'sum_of_component_log_likelihood_scores_up_to_transition_candidate_independent_constant',
    priorUsed: false,
    posteriorComputed: false
  };
}

export function compositeLikelihoodEstimationResultToJson(
  result: CompositeLikelihoodEstimationResult
): string {
  return JSON.stringify(result);
}
