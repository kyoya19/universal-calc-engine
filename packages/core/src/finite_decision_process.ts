export type DecisionActionId = string;

export type DecisionOutcome<State> = {
  probability: number;
  nextState: State;
  reward?: number;
  elapsedTimeSeconds?: number;
};

export type FiniteDecisionProcess<State> = {
  startState: State;
  stateKey(state: State): string;
  isTerminal(state: State): boolean;
  actions(state: State): readonly DecisionActionId[];
  outcomes(state: State, actionId: DecisionActionId): readonly DecisionOutcome<State>[];
};

export type DeterministicDecisionPolicy<State> = {
  selectAction(state: State): DecisionActionId;
};

export type FiniteDecisionProcessOptions = {
  probabilityTolerance?: number;
  actionValueTolerance?: number;
  maxStates?: number;
  maxStateActionPairs?: number;
  maxDepth?: number;
};

export type FiniteDecisionSolverMethod =
  | 'memoized_acyclic_policy_evaluation'
  | 'memoized_acyclic_bellman_optimality';

export type FiniteDecisionDiagnostics = {
  solverMethod: FiniteDecisionSolverMethod;
  objective: 'expected_total_reward';
  simulationUsed: false;
  numericRepresentation: 'javascript_number_float64';
  visitedStateCount: number;
  evaluatedStateActionPairCount: number;
  memoHitCount: number;
  maxDepthObserved: number;
  probabilityTolerance: number;
  actionValueTolerance: number;
  maxStates: number;
  maxStateActionPairs: number;
  maxDepth: number;
};

export type FiniteDecisionFailureCode =
  | 'invalid_options'
  | 'invalid_state_key'
  | 'process_callback_failed'
  | 'nonterminal_state_has_no_actions'
  | 'duplicate_action_id'
  | 'policy_selected_unknown_action'
  | 'action_has_no_outcomes'
  | 'invalid_outcome_probability'
  | 'outcome_probability_total'
  | 'invalid_outcome_reward'
  | 'invalid_outcome_elapsed_time'
  | 'cycle_detected'
  | 'max_states_exceeded'
  | 'max_state_action_pairs_exceeded'
  | 'max_depth_exceeded';

export type FiniteDecisionFailure = {
  code: FiniteDecisionFailureCode;
  message: string;
  stateKey?: string;
  actionId?: DecisionActionId;
  depth?: number;
};

export type FixedPolicyEvaluationSuccess = {
  ok: true;
  objective: 'expected_total_reward';
  expectedReward: number;
  expectedElapsedTimeSeconds: number;
  expectedRewardByState: Record<string, number>;
  expectedElapsedTimeSecondsByState: Record<string, number>;
  policyActionByState: Record<string, DecisionActionId>;
  diagnostics: FiniteDecisionDiagnostics;
};

export type FixedPolicyEvaluationFailure = {
  ok: false;
  objective: 'expected_total_reward';
  failure: FiniteDecisionFailure;
  diagnostics: FiniteDecisionDiagnostics;
};

export type FixedPolicyEvaluationResult =
  | FixedPolicyEvaluationSuccess
  | FixedPolicyEvaluationFailure;

export type OptimalDecisionEvaluationSuccess = {
  ok: true;
  objective: 'expected_total_reward';
  optimalExpectedReward: number;
  expectedRewardByState: Record<string, number>;
  actionValuesByState: Record<string, Record<DecisionActionId, number>>;
  bestActionIdsByState: Record<string, DecisionActionId[]>;
  diagnostics: FiniteDecisionDiagnostics;
};

export type OptimalDecisionEvaluationFailure = {
  ok: false;
  objective: 'expected_total_reward';
  failure: FiniteDecisionFailure;
  diagnostics: FiniteDecisionDiagnostics;
};

export type OptimalDecisionEvaluationResult =
  | OptimalDecisionEvaluationSuccess
  | OptimalDecisionEvaluationFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_ACTION_VALUE_TOLERANCE = 1e-12;
const DEFAULT_MAX_STATES = 100_000;
const DEFAULT_MAX_STATE_ACTION_PAIRS = 500_000;
const DEFAULT_MAX_DEPTH = 10_000;

class FiniteDecisionEvaluationError extends Error {
  constructor(readonly failure: FiniteDecisionFailure) {
    super(failure.message);
  }
}

type ResolvedOptions = {
  probabilityTolerance: number;
  actionValueTolerance: number;
  maxStates: number;
  maxStateActionPairs: number;
  maxDepth: number;
};

type MutableDiagnostics = FiniteDecisionDiagnostics;

type CommonContext<State> = {
  process: FiniteDecisionProcess<State>;
  options: ResolvedOptions;
  diagnostics: MutableDiagnostics;
  visitedStateKeys: Set<string>;
  visitingStateKeys: Set<string>;
};

function fail(failure: FiniteDecisionFailure): never {
  throw new FiniteDecisionEvaluationError(failure);
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: string,
  integer: boolean
): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0 || (integer && !Number.isInteger(resolved))) {
    fail({
      code: 'invalid_options',
      message: `${name} must be a finite positive${integer ? ' integer' : ' number'}`
    });
  }
  return resolved;
}

function resolveOptions(options: FiniteDecisionProcessOptions): ResolvedOptions {
  return {
    probabilityTolerance: resolvePositiveFinite(
      options.probabilityTolerance,
      DEFAULT_PROBABILITY_TOLERANCE,
      'probabilityTolerance',
      false
    ),
    actionValueTolerance: resolvePositiveFinite(
      options.actionValueTolerance,
      DEFAULT_ACTION_VALUE_TOLERANCE,
      'actionValueTolerance',
      false
    ),
    maxStates: resolvePositiveFinite(options.maxStates, DEFAULT_MAX_STATES, 'maxStates', true),
    maxStateActionPairs: resolvePositiveFinite(
      options.maxStateActionPairs,
      DEFAULT_MAX_STATE_ACTION_PAIRS,
      'maxStateActionPairs',
      true
    ),
    maxDepth: resolvePositiveFinite(options.maxDepth, DEFAULT_MAX_DEPTH, 'maxDepth', true)
  };
}

function createDiagnostics(
  solverMethod: FiniteDecisionSolverMethod,
  options: ResolvedOptions
): MutableDiagnostics {
  return {
    solverMethod,
    objective: 'expected_total_reward',
    simulationUsed: false,
    numericRepresentation: 'javascript_number_float64',
    visitedStateCount: 0,
    evaluatedStateActionPairCount: 0,
    memoHitCount: 0,
    maxDepthObserved: 0,
    ...options
  };
}

function safeStateKey<State>(process: FiniteDecisionProcess<State>, state: State): string {
  try {
    const key = process.stateKey(state);
    if (typeof key !== 'string' || key.length === 0) {
      fail({ code: 'invalid_state_key', message: 'stateKey(state) must return a non-empty string' });
    }
    return key;
  } catch (error) {
    if (error instanceof FiniteDecisionEvaluationError) {
      throw error;
    }
    fail({
      code: 'process_callback_failed',
      message: `stateKey(state) failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

function safeIsTerminal<State>(
  process: FiniteDecisionProcess<State>,
  state: State,
  stateKey: string
): boolean {
  try {
    return process.isTerminal(state);
  } catch (error) {
    fail({
      code: 'process_callback_failed',
      stateKey,
      message: `isTerminal(state) failed for ${stateKey}: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

function safeActions<State>(
  process: FiniteDecisionProcess<State>,
  state: State,
  stateKey: string
): readonly DecisionActionId[] {
  try {
    return process.actions(state);
  } catch (error) {
    fail({
      code: 'process_callback_failed',
      stateKey,
      message: `actions(state) failed for ${stateKey}: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

function safeOutcomes<State>(
  process: FiniteDecisionProcess<State>,
  state: State,
  stateKey: string,
  actionId: DecisionActionId
): readonly DecisionOutcome<State>[] {
  try {
    return process.outcomes(state, actionId);
  } catch (error) {
    fail({
      code: 'process_callback_failed',
      stateKey,
      actionId,
      message: `outcomes(state, actionId) failed for ${stateKey}/${actionId}: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

function validateActions(
  actions: readonly DecisionActionId[],
  stateKey: string
): readonly DecisionActionId[] {
  if (actions.length === 0) {
    fail({
      code: 'nonterminal_state_has_no_actions',
      stateKey,
      message: `Nonterminal state ${stateKey} has no actions`
    });
  }
  const seen = new Set<string>();
  for (const actionId of actions) {
    if (typeof actionId !== 'string' || actionId.length === 0 || seen.has(actionId)) {
      fail({
        code: 'duplicate_action_id',
        stateKey,
        actionId,
        message: `Action ids must be unique non-empty strings at state ${stateKey}`
      });
    }
    seen.add(actionId);
  }
  return actions;
}

function registerState<State>(context: CommonContext<State>, stateKey: string, depth: number): void {
  context.diagnostics.maxDepthObserved = Math.max(context.diagnostics.maxDepthObserved, depth);
  if (depth > context.options.maxDepth) {
    fail({
      code: 'max_depth_exceeded',
      stateKey,
      depth,
      message: `Maximum decision-process depth ${context.options.maxDepth} exceeded at ${stateKey}`
    });
  }
  if (!context.visitedStateKeys.has(stateKey)) {
    if (context.visitedStateKeys.size >= context.options.maxStates) {
      fail({
        code: 'max_states_exceeded',
        stateKey,
        depth,
        message: `Maximum reachable state count ${context.options.maxStates} exceeded before visiting ${stateKey}`
      });
    }
    context.visitedStateKeys.add(stateKey);
    context.diagnostics.visitedStateCount = context.visitedStateKeys.size;
  }
}

function registerStateActionPair<State>(
  context: CommonContext<State>,
  stateKey: string,
  actionId: DecisionActionId
): void {
  if (context.diagnostics.evaluatedStateActionPairCount >= context.options.maxStateActionPairs) {
    fail({
      code: 'max_state_action_pairs_exceeded',
      stateKey,
      actionId,
      message: `Maximum evaluated state/action pair count ${context.options.maxStateActionPairs} exceeded at ${stateKey}/${actionId}`
    });
  }
  context.diagnostics.evaluatedStateActionPairCount += 1;
}

function validateOutcomes<State>(
  outcomes: readonly DecisionOutcome<State>[],
  stateKey: string,
  actionId: DecisionActionId,
  tolerance: number
): void {
  if (outcomes.length === 0) {
    fail({
      code: 'action_has_no_outcomes',
      stateKey,
      actionId,
      message: `Action ${actionId} at state ${stateKey} has no stochastic outcomes`
    });
  }
  let total = 0;
  for (const outcome of outcomes) {
    if (!Number.isFinite(outcome.probability) || outcome.probability < 0 || outcome.probability > 1) {
      fail({
        code: 'invalid_outcome_probability',
        stateKey,
        actionId,
        message: `Outcome probability must be a finite number from 0 to 1 at ${stateKey}/${actionId}: ${outcome.probability}`
      });
    }
    if (outcome.reward !== undefined && !Number.isFinite(outcome.reward)) {
      fail({
        code: 'invalid_outcome_reward',
        stateKey,
        actionId,
        message: `Outcome reward must be finite at ${stateKey}/${actionId}: ${outcome.reward}`
      });
    }
    if (
      outcome.elapsedTimeSeconds !== undefined &&
      (!Number.isFinite(outcome.elapsedTimeSeconds) || outcome.elapsedTimeSeconds < 0)
    ) {
      fail({
        code: 'invalid_outcome_elapsed_time',
        stateKey,
        actionId,
        message: `Outcome elapsedTimeSeconds must be finite and non-negative at ${stateKey}/${actionId}: ${outcome.elapsedTimeSeconds}`
      });
    }
    total += outcome.probability;
  }
  if (Math.abs(total - 1) > tolerance) {
    fail({
      code: 'outcome_probability_total',
      stateKey,
      actionId,
      message: `Outcome probabilities for ${stateKey}/${actionId} sum to ${total}, not 1`
    });
  }
}

function publicFailure(
  solverMethod: FiniteDecisionSolverMethod,
  error: unknown,
  diagnostics?: MutableDiagnostics
): { failure: FiniteDecisionFailure; diagnostics: FiniteDecisionDiagnostics } {
  if (error instanceof FiniteDecisionEvaluationError) {
    if (diagnostics !== undefined) {
      return { failure: error.failure, diagnostics: { ...diagnostics } };
    }
    return {
      failure: error.failure,
      diagnostics: createDiagnostics(solverMethod, resolveOptions({}))
    };
  }
  return {
    failure: {
      code: 'process_callback_failed',
      message: error instanceof Error ? error.message : String(error)
    },
    diagnostics:
      diagnostics !== undefined
        ? { ...diagnostics }
        : createDiagnostics(solverMethod, resolveOptions({}))
  };
}

export function evaluateFiniteDecisionPolicy<State>(
  process: FiniteDecisionProcess<State>,
  policy: DeterministicDecisionPolicy<State>,
  options: FiniteDecisionProcessOptions = {}
): FixedPolicyEvaluationResult {
  const solverMethod: FiniteDecisionSolverMethod = 'memoized_acyclic_policy_evaluation';
  let diagnostics: MutableDiagnostics | undefined;
  try {
    const resolved = resolveOptions(options);
    diagnostics = createDiagnostics(solverMethod, resolved);
    const context: CommonContext<State> = {
      process,
      options: resolved,
      diagnostics,
      visitedStateKeys: new Set<string>(),
      visitingStateKeys: new Set<string>()
    };
    const memo = new Map<
      string,
      { expectedReward: number; expectedElapsedTimeSeconds: number }
    >();
    const policyActionByState = new Map<string, DecisionActionId>();

    const evaluateState = (
      state: State,
      depth: number
    ): { expectedReward: number; expectedElapsedTimeSeconds: number } => {
      const stateKey = safeStateKey(process, state);
      const cached = memo.get(stateKey);
      if (cached !== undefined) {
        diagnostics!.memoHitCount += 1;
        return cached;
      }
      registerState(context, stateKey, depth);
      if (context.visitingStateKeys.has(stateKey)) {
        fail({
          code: 'cycle_detected',
          stateKey,
          depth,
          message: `Cycle detected while evaluating fixed policy at state ${stateKey}`
        });
      }
      if (safeIsTerminal(process, state, stateKey)) {
        const terminal = { expectedReward: 0, expectedElapsedTimeSeconds: 0 };
        memo.set(stateKey, terminal);
        return terminal;
      }

      context.visitingStateKeys.add(stateKey);
      try {
        const actions = validateActions(safeActions(process, state, stateKey), stateKey);
        let actionId: DecisionActionId;
        try {
          actionId = policy.selectAction(state);
        } catch (error) {
          fail({
            code: 'process_callback_failed',
            stateKey,
            message: `policy.selectAction(state) failed for ${stateKey}: ${error instanceof Error ? error.message : String(error)}`
          });
        }
        if (!actions.includes(actionId)) {
          fail({
            code: 'policy_selected_unknown_action',
            stateKey,
            actionId,
            message: `Policy selected unavailable action ${actionId} at state ${stateKey}`
          });
        }
        policyActionByState.set(stateKey, actionId);
        registerStateActionPair(context, stateKey, actionId);
        const outcomes = safeOutcomes(process, state, stateKey, actionId);
        validateOutcomes(outcomes, stateKey, actionId, resolved.probabilityTolerance);

        let expectedReward = 0;
        let expectedElapsedTimeSeconds = 0;
        for (const outcome of outcomes) {
          if (outcome.probability === 0) {
            continue;
          }
          const downstream = evaluateState(outcome.nextState, depth + 1);
          expectedReward +=
            outcome.probability * ((outcome.reward ?? 0) + downstream.expectedReward);
          expectedElapsedTimeSeconds +=
            outcome.probability *
            ((outcome.elapsedTimeSeconds ?? 0) + downstream.expectedElapsedTimeSeconds);
        }
        const value = { expectedReward, expectedElapsedTimeSeconds };
        memo.set(stateKey, value);
        return value;
      } finally {
        context.visitingStateKeys.delete(stateKey);
      }
    };

    const start = evaluateState(process.startState, 0);
    return {
      ok: true,
      objective: 'expected_total_reward',
      expectedReward: start.expectedReward,
      expectedElapsedTimeSeconds: start.expectedElapsedTimeSeconds,
      expectedRewardByState: Object.fromEntries(
        Array.from(memo, ([key, value]) => [key, value.expectedReward])
      ),
      expectedElapsedTimeSecondsByState: Object.fromEntries(
        Array.from(memo, ([key, value]) => [key, value.expectedElapsedTimeSeconds])
      ),
      policyActionByState: Object.fromEntries(policyActionByState),
      diagnostics: { ...diagnostics }
    };
  } catch (error) {
    const failure = publicFailure(solverMethod, error, diagnostics);
    return { ok: false, objective: 'expected_total_reward', ...failure };
  }
}

export function optimizeFiniteDecisionExpectedReward<State>(
  process: FiniteDecisionProcess<State>,
  options: FiniteDecisionProcessOptions = {}
): OptimalDecisionEvaluationResult {
  const solverMethod: FiniteDecisionSolverMethod = 'memoized_acyclic_bellman_optimality';
  let diagnostics: MutableDiagnostics | undefined;
  try {
    const resolved = resolveOptions(options);
    diagnostics = createDiagnostics(solverMethod, resolved);
    const context: CommonContext<State> = {
      process,
      options: resolved,
      diagnostics,
      visitedStateKeys: new Set<string>(),
      visitingStateKeys: new Set<string>()
    };
    const memo = new Map<string, number>();
    const actionValuesByState = new Map<string, Map<DecisionActionId, number>>();
    const bestActionIdsByState = new Map<string, DecisionActionId[]>();

    const evaluateState = (state: State, depth: number): number => {
      const stateKey = safeStateKey(process, state);
      const cached = memo.get(stateKey);
      if (cached !== undefined) {
        diagnostics!.memoHitCount += 1;
        return cached;
      }
      registerState(context, stateKey, depth);
      if (context.visitingStateKeys.has(stateKey)) {
        fail({
          code: 'cycle_detected',
          stateKey,
          depth,
          message: `Cycle detected while optimizing expected reward at state ${stateKey}`
        });
      }
      if (safeIsTerminal(process, state, stateKey)) {
        memo.set(stateKey, 0);
        return 0;
      }

      context.visitingStateKeys.add(stateKey);
      try {
        const actions = validateActions(safeActions(process, state, stateKey), stateKey);
        const values = new Map<DecisionActionId, number>();
        let bestValue = Number.NEGATIVE_INFINITY;

        for (const actionId of actions) {
          registerStateActionPair(context, stateKey, actionId);
          const outcomes = safeOutcomes(process, state, stateKey, actionId);
          validateOutcomes(outcomes, stateKey, actionId, resolved.probabilityTolerance);
          let actionValue = 0;
          for (const outcome of outcomes) {
            if (outcome.probability === 0) {
              continue;
            }
            const downstream = evaluateState(outcome.nextState, depth + 1);
            actionValue += outcome.probability * ((outcome.reward ?? 0) + downstream);
          }
          values.set(actionId, actionValue);
          bestValue = Math.max(bestValue, actionValue);
        }

        const bestActionIds = actions.filter(
          (actionId) =>
            Math.abs(
              (values.get(actionId) ?? Number.NEGATIVE_INFINITY) - bestValue
            ) <= resolved.actionValueTolerance
        );
        actionValuesByState.set(stateKey, values);
        bestActionIdsByState.set(stateKey, [...bestActionIds]);
        memo.set(stateKey, bestValue);
        return bestValue;
      } finally {
        context.visitingStateKeys.delete(stateKey);
      }
    };

    const optimalExpectedReward = evaluateState(process.startState, 0);
    return {
      ok: true,
      objective: 'expected_total_reward',
      optimalExpectedReward,
      expectedRewardByState: Object.fromEntries(memo),
      actionValuesByState: Object.fromEntries(
        Array.from(actionValuesByState, ([stateKey, values]) => [
          stateKey,
          Object.fromEntries(values)
        ])
      ),
      bestActionIdsByState: Object.fromEntries(bestActionIdsByState),
      diagnostics: { ...diagnostics }
    };
  } catch (error) {
    const failure = publicFailure(solverMethod, error, diagnostics);
    return { ok: false, objective: 'expected_total_reward', ...failure };
  }
}
