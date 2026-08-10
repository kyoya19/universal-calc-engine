import {
  DefinitionModel,
  EvaluatedModel,
  ExpectedElapsedTimeResult,
  ReachabilityResult,
  SolvedModel,
  StateId,
  evaluateModel,
  expandModel,
  isTerminalState
} from './model';
import { stableSum } from './stable_sum';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type AcyclicDirectSolverMethod = 'topological_reverse_dynamic_programming';

export type AcyclicDirectDiagnostics = {
  solverMethod: AcyclicDirectSolverMethod;
  simulationUsed: false;
  numericRepresentation: 'javascript_number_float64';
  stateCount: number;
  effectiveTransitionCount: number;
  topologicalStateCount: number;
  dynamicProgrammingPasses: 1;
};

export type AcyclicDirectFailureCode =
  | 'model_validation_failed'
  | 'cycle_detected'
  | 'unknown_reachability_target'
  | 'evaluation_failed';

export type AcyclicDirectFailure = {
  code: AcyclicDirectFailureCode;
  message: string;
  stateIds?: StateId[];
  targetStateId?: StateId;
};

export type AcyclicDirectOptions = {
  reachabilityTargets?: Iterable<StateId>;
};

export type AcyclicDirectSuccess = {
  ok: true;
  expectedReward: SolvedModel;
  expectedElapsedTime: ExpectedElapsedTimeResult;
  validation: ModelValidationResult;
  diagnostics: AcyclicDirectDiagnostics;
  reachability?: ReachabilityResult;
};

export type AcyclicDirectEvaluationFailure = {
  ok: false;
  failure: AcyclicDirectFailure;
  validation: ModelValidationResult;
  diagnostics: AcyclicDirectDiagnostics;
};

export type AcyclicDirectEvaluationResult =
  | AcyclicDirectSuccess
  | AcyclicDirectEvaluationFailure;

type AcyclicAnalysisSuccess = {
  ok: true;
  topologicalStateIds: StateId[];
  diagnostics: AcyclicDirectDiagnostics;
};

type AcyclicAnalysisFailure = {
  ok: false;
  failure: AcyclicDirectFailure;
  diagnostics: AcyclicDirectDiagnostics;
};

type AcyclicAnalysisResult = AcyclicAnalysisSuccess | AcyclicAnalysisFailure;

function createDiagnostics(
  stateCount: number,
  effectiveTransitionCount = 0,
  topologicalStateCount = 0
): AcyclicDirectDiagnostics {
  return {
    solverMethod: 'topological_reverse_dynamic_programming',
    simulationUsed: false,
    numericRepresentation: 'javascript_number_float64',
    stateCount,
    effectiveTransitionCount,
    topologicalStateCount,
    dynamicProgrammingPasses: 1
  };
}

function isEffectiveDependency(probability: number): boolean {
  return probability !== 0;
}

function analyzeAcyclicEvaluatedModel(model: EvaluatedModel): AcyclicAnalysisResult {
  const indegreeByState = new Map<StateId, number>();
  for (const state of model.states) {
    indegreeByState.set(state.id, 0);
  }

  let effectiveTransitionCount = 0;
  for (const state of model.states) {
    if (isTerminalState(state)) {
      continue;
    }
    const transitions = model.transitionsByState.get(state.id) ?? [];
    for (const transition of transitions) {
      if (!isEffectiveDependency(transition.probability)) {
        continue;
      }
      effectiveTransitionCount += 1;
      indegreeByState.set(
        transition.to,
        (indegreeByState.get(transition.to) ?? 0) + 1
      );
    }
  }

  const queue: StateId[] = [];
  for (const state of model.states) {
    if ((indegreeByState.get(state.id) ?? 0) === 0) {
      queue.push(state.id);
    }
  }

  const topologicalStateIds: StateId[] = [];
  let queueIndex = 0;
  while (queueIndex < queue.length) {
    const stateId = queue[queueIndex]!;
    queueIndex += 1;
    topologicalStateIds.push(stateId);

    const state = model.stateById.get(stateId);
    if (state === undefined || isTerminalState(state)) {
      continue;
    }

    const transitions = model.transitionsByState.get(stateId) ?? [];
    for (const transition of transitions) {
      if (!isEffectiveDependency(transition.probability)) {
        continue;
      }
      const nextIndegree = (indegreeByState.get(transition.to) ?? 0) - 1;
      indegreeByState.set(transition.to, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(transition.to);
      }
    }
  }

  const diagnostics = createDiagnostics(
    model.states.length,
    effectiveTransitionCount,
    topologicalStateIds.length
  );

  if (topologicalStateIds.length !== model.states.length) {
    const unresolvedStateIds = model.states
      .filter((state) => (indegreeByState.get(state.id) ?? 0) > 0)
      .map((state) => state.id);
    return {
      ok: false,
      failure: {
        code: 'cycle_detected',
        message: `Acyclic direct solver detected a cycle in the effective nonterminal dependency graph: ${unresolvedStateIds.join(', ')}`,
        stateIds: unresolvedStateIds
      },
      diagnostics
    };
  }

  return { ok: true, topologicalStateIds, diagnostics };
}

function requiredValue(map: Map<StateId, number>, stateId: StateId, label: string): number {
  const value = map.get(stateId);
  if (value === undefined) {
    throw new Error(`Internal acyclic direct ${label} dependency missing for ${stateId}`);
  }
  return value;
}

export function solveAcyclicDefinitionModel(
  model: DefinitionModel,
  options: AcyclicDirectOptions = {}
): AcyclicDirectEvaluationResult {
  const validation = validateDefinitionModel(model);
  if (!validation.valid) {
    return {
      ok: false,
      failure: {
        code: 'model_validation_failed',
        message: validation.errors[0]?.message ?? 'DefinitionModel validation failed'
      },
      validation,
      diagnostics: createDiagnostics(model.states.length)
    };
  }

  let evaluated: EvaluatedModel;
  try {
    evaluated = evaluateModel(expandModel(model));
  } catch (error) {
    return {
      ok: false,
      failure: {
        code: 'evaluation_failed',
        message: error instanceof Error ? error.message : String(error)
      },
      validation,
      diagnostics: createDiagnostics(model.states.length)
    };
  }

  const targetStateIds =
    options.reachabilityTargets === undefined
      ? undefined
      : [...new Set(options.reachabilityTargets)];

  if (targetStateIds !== undefined) {
    for (const targetStateId of targetStateIds) {
      if (!evaluated.stateById.has(targetStateId)) {
        return {
          ok: false,
          failure: {
            code: 'unknown_reachability_target',
            message: `Unknown reachability target state: ${targetStateId}`,
            targetStateId
          },
          validation,
          diagnostics: createDiagnostics(model.states.length)
        };
      }
    }
  }

  const analysis = analyzeAcyclicEvaluatedModel(evaluated);
  if (!analysis.ok) {
    return {
      ok: false,
      failure: analysis.failure,
      validation,
      diagnostics: analysis.diagnostics
    };
  }

  try {
    const expectedRewardByState = new Map<StateId, number>();
    const expectedElapsedTimeSecondsByState = new Map<StateId, number>();
    const targetStateSet =
      targetStateIds === undefined ? undefined : new Set<StateId>(targetStateIds);
    const reachabilityProbabilityByState =
      targetStateSet === undefined ? undefined : new Map<StateId, number>();

    for (let index = analysis.topologicalStateIds.length - 1; index >= 0; index -= 1) {
      const stateId = analysis.topologicalStateIds[index]!;
      const state = evaluated.stateById.get(stateId);
      if (state === undefined) {
        throw new Error(`Internal acyclic direct state missing for ${stateId}`);
      }

      if (isTerminalState(state)) {
        expectedRewardByState.set(stateId, 0);
        expectedElapsedTimeSecondsByState.set(stateId, 0);
      } else {
        const transitions = evaluated.transitionsByState.get(stateId) ?? [];
        const effectiveTransitions = transitions.filter((transition) =>
          isEffectiveDependency(transition.probability)
        );
        const expectedReward = stableSum(
          effectiveTransitions.map(
            (transition) =>
              transition.probability *
              ((transition.reward ?? 0) +
                requiredValue(expectedRewardByState, transition.to, 'reward'))
          )
        );
        const expectedElapsedTimeSeconds = stableSum(
          effectiveTransitions.map(
            (transition) =>
              transition.probability *
              ((transition.elapsedTimeSeconds ?? 0) +
                requiredValue(
                  expectedElapsedTimeSecondsByState,
                  transition.to,
                  'elapsed-time'
                ))
          )
        );

        expectedRewardByState.set(stateId, expectedReward);
        expectedElapsedTimeSecondsByState.set(stateId, expectedElapsedTimeSeconds);
      }

      if (reachabilityProbabilityByState !== undefined && targetStateSet !== undefined) {
        if (targetStateSet.has(stateId)) {
          reachabilityProbabilityByState.set(stateId, 1);
        } else if (isTerminalState(state)) {
          reachabilityProbabilityByState.set(stateId, 0);
        } else {
          const transitions = evaluated.transitionsByState.get(stateId) ?? [];
          const reachabilityProbability = stableSum(
            transitions
              .filter((transition) => isEffectiveDependency(transition.probability))
              .map(
                (transition) =>
                  transition.probability *
                  requiredValue(
                    reachabilityProbabilityByState,
                    transition.to,
                    'reachability'
                  )
              )
          );
          reachabilityProbabilityByState.set(stateId, reachabilityProbability);
        }
      }
    }

    const success: AcyclicDirectSuccess = {
      ok: true,
      expectedReward: { expectedRewardByState },
      expectedElapsedTime: { expectedElapsedTimeSecondsByState },
      validation,
      diagnostics: analysis.diagnostics
    };

    if (reachabilityProbabilityByState !== undefined && targetStateIds !== undefined) {
      success.reachability = {
        targetStates: targetStateIds,
        reachabilityProbabilityByState
      };
    }

    return success;
  } catch (error) {
    return {
      ok: false,
      failure: {
        code: 'evaluation_failed',
        message: error instanceof Error ? error.message : String(error)
      },
      validation,
      diagnostics: analysis.diagnostics
    };
  }
}
