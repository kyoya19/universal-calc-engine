import {
  EvaluatedModel,
  ExpectedElapsedTimeResult,
  ReachabilityResult,
  SolvedModel,
  StateId,
  isTerminalState
} from './model';
import {
  RewardAxesEvaluatedModel,
  RewardAxesSolvedModel,
  RewardAxisId
} from './reward_axes';

export type SolverKind =
  | 'expected_reward'
  | 'reachability_probability'
  | 'expected_elapsed_time'
  | 'expected_reward_axis';

export type SolverDiagnosticsOptions = {
  maxIterations?: number;
  tolerance?: number;
};

export type SolverDiagnosticContext = {
  targetStates?: StateId[];
  rewardAxisId?: RewardAxisId;
};

export type SolverConvergenceDiagnostics = {
  solverKind: SolverKind;
  converged: boolean;
  iterations: number;
  maxIterations: number;
  tolerance: number;
  lastMaxDelta: number;
  context?: SolverDiagnosticContext;
};

export type SolverDetailedResult<T> = {
  result: T;
  diagnostics: SolverConvergenceDiagnostics;
};

export type RewardAxesSolverDetailedResult = {
  result: RewardAxesSolvedModel;
  converged: boolean;
  diagnosticsByAxis: Record<RewardAxisId, SolverConvergenceDiagnostics>;
};

type ResolvedSolverOptions = {
  maxIterations: number;
  tolerance: number;
};

type IterationRunResult = {
  converged: boolean;
  iterations: number;
  lastMaxDelta: number;
};

const DEFAULT_MAX_ITERATIONS = 10_000;
const DEFAULT_TOLERANCE = 1e-12;

function resolveOptions(options: SolverDiagnosticsOptions): ResolvedSolverOptions {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

  if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
    throw new Error('Solver maxIterations must be a positive integer');
  }
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error('Solver tolerance must be a finite positive number');
  }

  return { maxIterations, tolerance };
}

function runIterations(
  options: ResolvedSolverOptions,
  iterate: () => number
): IterationRunResult {
  let lastMaxDelta = Number.POSITIVE_INFINITY;

  for (let iteration = 0; iteration < options.maxIterations; iteration += 1) {
    lastMaxDelta = iterate();
    if (lastMaxDelta < options.tolerance) {
      return {
        converged: true,
        iterations: iteration + 1,
        lastMaxDelta
      };
    }
  }

  return {
    converged: false,
    iterations: options.maxIterations,
    lastMaxDelta
  };
}

function toDiagnostics(
  solverKind: SolverKind,
  options: ResolvedSolverOptions,
  run: IterationRunResult,
  context?: SolverDiagnosticContext
): SolverConvergenceDiagnostics {
  const diagnostics: SolverConvergenceDiagnostics = {
    solverKind,
    converged: run.converged,
    iterations: run.iterations,
    maxIterations: options.maxIterations,
    tolerance: options.tolerance,
    lastMaxDelta: run.lastMaxDelta
  };

  if (context !== undefined) {
    diagnostics.context = context;
  }

  return diagnostics;
}

export function solveExpectedRewardWithDiagnostics(
  model: EvaluatedModel,
  options: SolverDiagnosticsOptions = {}
): SolverDetailedResult<SolvedModel> {
  const resolved = resolveOptions(options);
  const expectedRewardByState = new Map<StateId, number>();

  for (const state of model.states) {
    expectedRewardByState.set(state.id, 0);
  }

  const run = runIterations(resolved, () => {
    let maxDelta = 0;

    for (const state of model.states) {
      if (isTerminalState(state)) {
        expectedRewardByState.set(state.id, 0);
        continue;
      }

      const transitions = model.transitionsByState.get(state.id) ?? [];
      const nextValue = transitions.reduce((sum, transition) => {
        const reward = transition.reward ?? 0;
        const downstream = expectedRewardByState.get(transition.to) ?? 0;
        return sum + transition.probability * (reward + downstream);
      }, 0);

      const previous = expectedRewardByState.get(state.id) ?? 0;
      maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
      expectedRewardByState.set(state.id, nextValue);
    }

    return maxDelta;
  });

  return {
    result: { expectedRewardByState },
    diagnostics: toDiagnostics('expected_reward', resolved, run)
  };
}

export function solveReachabilityProbabilityWithDiagnostics(
  model: EvaluatedModel,
  targetStates: Iterable<StateId>,
  options: SolverDiagnosticsOptions = {}
): SolverDetailedResult<ReachabilityResult> {
  const resolved = resolveOptions(options);
  const targetStateSet = new Set(targetStates);
  const targetStateIds = [...targetStateSet];
  const reachabilityProbabilityByState = new Map<StateId, number>();

  for (const targetStateId of targetStateIds) {
    if (!model.stateById.has(targetStateId)) {
      throw new Error(`Unknown reachability target state: ${targetStateId}`);
    }
  }

  for (const state of model.states) {
    reachabilityProbabilityByState.set(state.id, targetStateSet.has(state.id) ? 1 : 0);
  }

  const run = runIterations(resolved, () => {
    let maxDelta = 0;

    for (const state of model.states) {
      const previous = reachabilityProbabilityByState.get(state.id) ?? 0;
      let nextValue: number;

      if (targetStateSet.has(state.id)) {
        nextValue = 1;
      } else if (isTerminalState(state)) {
        nextValue = 0;
      } else {
        const transitions = model.transitionsByState.get(state.id) ?? [];
        nextValue = transitions.reduce((sum, transition) => {
          const downstream = reachabilityProbabilityByState.get(transition.to) ?? 0;
          return sum + transition.probability * downstream;
        }, 0);
      }

      maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
      reachabilityProbabilityByState.set(state.id, nextValue);
    }

    return maxDelta;
  });

  return {
    result: {
      targetStates: targetStateIds,
      reachabilityProbabilityByState
    },
    diagnostics: toDiagnostics('reachability_probability', resolved, run, {
      targetStates: [...targetStateIds]
    })
  };
}

export function solveExpectedElapsedTimeWithDiagnostics(
  model: EvaluatedModel,
  options: SolverDiagnosticsOptions = {}
): SolverDetailedResult<ExpectedElapsedTimeResult> {
  const resolved = resolveOptions(options);
  const expectedElapsedTimeSecondsByState = new Map<StateId, number>();

  for (const state of model.states) {
    expectedElapsedTimeSecondsByState.set(state.id, 0);
  }

  const run = runIterations(resolved, () => {
    let maxDelta = 0;

    for (const state of model.states) {
      if (isTerminalState(state)) {
        expectedElapsedTimeSecondsByState.set(state.id, 0);
        continue;
      }

      const transitions = model.transitionsByState.get(state.id) ?? [];
      const nextValue = transitions.reduce((sum, transition) => {
        const elapsedTimeSeconds = transition.elapsedTimeSeconds ?? 0;
        const downstream = expectedElapsedTimeSecondsByState.get(transition.to) ?? 0;
        return sum + transition.probability * (elapsedTimeSeconds + downstream);
      }, 0);

      const previous = expectedElapsedTimeSecondsByState.get(state.id) ?? 0;
      maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
      expectedElapsedTimeSecondsByState.set(state.id, nextValue);
    }

    return maxDelta;
  });

  return {
    result: { expectedElapsedTimeSecondsByState },
    diagnostics: toDiagnostics('expected_elapsed_time', resolved, run)
  };
}

export function solveExpectedRewardAxesWithDiagnostics(
  model: RewardAxesEvaluatedModel,
  options: SolverDiagnosticsOptions = {}
): RewardAxesSolverDetailedResult {
  const resolved = resolveOptions(options);
  const expectedRewardByAxisByState = new Map<RewardAxisId, Map<StateId, number>>();
  const diagnosticsByAxis: Record<RewardAxisId, SolverConvergenceDiagnostics> = {};

  for (const axis of model.rewardAxes) {
    const expectedRewardByState = new Map<StateId, number>();
    for (const state of model.states) {
      expectedRewardByState.set(state.id, 0);
    }

    const run = runIterations(resolved, () => {
      let maxDelta = 0;

      for (const state of model.states) {
        if (isTerminalState(state)) {
          expectedRewardByState.set(state.id, 0);
          continue;
        }

        const transitions = model.transitionsByState.get(state.id) ?? [];
        const nextValue = transitions.reduce((sum, transition) => {
          const reward = transition.rewardsByAxis?.[axis.id] ?? 0;
          const downstream = expectedRewardByState.get(transition.to) ?? 0;
          return sum + transition.probability * (reward + downstream);
        }, 0);

        const previous = expectedRewardByState.get(state.id) ?? 0;
        maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
        expectedRewardByState.set(state.id, nextValue);
      }

      return maxDelta;
    });

    expectedRewardByAxisByState.set(axis.id, expectedRewardByState);
    diagnosticsByAxis[axis.id] = toDiagnostics('expected_reward_axis', resolved, run, {
      rewardAxisId: axis.id
    });
  }

  return {
    result: { expectedRewardByAxisByState },
    converged: Object.values(diagnosticsByAxis).every((diagnostic) => diagnostic.converged),
    diagnosticsByAxis
  };
}

export function solverConvergenceDiagnosticsToJson(
  diagnostics: SolverConvergenceDiagnostics
): string {
  return JSON.stringify(diagnostics);
}
