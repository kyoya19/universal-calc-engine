import {
  DecisionActionId,
  DeterministicDecisionPolicy,
  FiniteDecisionDiagnostics,
  FiniteDecisionFailure,
  FiniteDecisionProcess,
  FiniteDecisionProcessOptions,
  evaluateFiniteDecisionPolicy
} from './finite_decision_process';
import { DefinitionModel, StateDefinition, TransitionDefinition } from './model';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type FiniteDecisionMaterializationFailureCode =
  | 'process_callback_failed'
  | 'process_changed_during_materialization'
  | 'materialized_model_invalid';

export type FiniteDecisionMaterializationFailure = {
  code: FiniteDecisionMaterializationFailureCode;
  message: string;
  stateKey?: string;
  actionId?: DecisionActionId;
};

export type FiniteDecisionMaterializationSuccess = {
  ok: true;
  model: DefinitionModel;
  policyActionByState: Record<string, DecisionActionId>;
  diagnostics: FiniteDecisionDiagnostics;
  validation: ModelValidationResult;
};

export type FiniteDecisionMaterializationPreflightFailure = {
  ok: false;
  stage: 'decision_process_preflight';
  failure: FiniteDecisionFailure;
  diagnostics: FiniteDecisionDiagnostics;
};

export type FiniteDecisionMaterializationCaptureFailure = {
  ok: false;
  stage: 'materialization';
  failure: FiniteDecisionMaterializationFailure;
  diagnostics: FiniteDecisionDiagnostics;
};

export type FiniteDecisionMaterializationValidationFailure = {
  ok: false;
  stage: 'definition_model_validation';
  failure: FiniteDecisionMaterializationFailure;
  diagnostics: FiniteDecisionDiagnostics;
  validation: ModelValidationResult;
};

export type FiniteDecisionMaterializationResult =
  | FiniteDecisionMaterializationSuccess
  | FiniteDecisionMaterializationPreflightFailure
  | FiniteDecisionMaterializationCaptureFailure
  | FiniteDecisionMaterializationValidationFailure;

type MaterializationFrame<State> =
  | {
      phase: 'enter';
      state: State;
      stateKey: string;
    }
  | {
      phase: 'exit';
      stateKey: string;
    };

class FiniteDecisionMaterializationError extends Error {
  constructor(readonly failure: FiniteDecisionMaterializationFailure) {
    super(failure.message);
  }
}

function materializationFail(
  code: FiniteDecisionMaterializationFailureCode,
  message: string,
  stateKey?: string,
  actionId?: DecisionActionId
): never {
  const failure: FiniteDecisionMaterializationFailure = { code, message };
  if (stateKey !== undefined) {
    failure.stateKey = stateKey;
  }
  if (actionId !== undefined) {
    failure.actionId = actionId;
  }
  throw new FiniteDecisionMaterializationError(failure);
}

function captureStateKey<State>(process: FiniteDecisionProcess<State>, state: State): string {
  let stateKey: string;
  try {
    stateKey = process.stateKey(state);
  } catch (error) {
    materializationFail(
      'process_callback_failed',
      `stateKey(state) failed during materialization: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (typeof stateKey !== 'string' || stateKey.length === 0) {
    materializationFail(
      'process_changed_during_materialization',
      'stateKey(state) returned an invalid key after the decision-process preflight succeeded'
    );
  }
  return stateKey;
}

function captureOutcomes<State>(
  process: FiniteDecisionProcess<State>,
  state: State,
  stateKey: string,
  actionId: DecisionActionId
) {
  try {
    return process.outcomes(state, actionId);
  } catch (error) {
    materializationFail(
      'process_callback_failed',
      `outcomes(state, actionId) failed during materialization for ${stateKey}/${actionId}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      stateKey,
      actionId
    );
  }
}

function makeTransition<State>(
  from: string,
  to: string,
  outcome: ReturnType<FiniteDecisionProcess<State>['outcomes']>[number]
): TransitionDefinition {
  const transition: TransitionDefinition = {
    from,
    to,
    probability: outcome.probability
  };

  if (outcome.reward !== undefined) {
    transition.reward = outcome.reward;
  }
  if (outcome.elapsedTimeSeconds !== undefined) {
    transition.elapsedTime = {
      value: outcome.elapsedTimeSeconds,
      unit: 'seconds'
    };
  }

  return transition;
}

function firstValidationErrorMessage(validation: ModelValidationResult): string {
  const first = validation.errors[0];
  if (first === undefined) {
    return 'Materialized DefinitionModel failed validation';
  }
  return `Materialized DefinitionModel failed validation: ${first.code} at ${first.path}: ${first.message}`;
}

export function materializeFiniteDecisionPolicy<State>(
  process: FiniteDecisionProcess<State>,
  policy: DeterministicDecisionPolicy<State>,
  options: FiniteDecisionProcessOptions = {}
): FiniteDecisionMaterializationResult {
  const preflight = evaluateFiniteDecisionPolicy(process, policy, options);
  if (!preflight.ok) {
    return {
      ok: false,
      stage: 'decision_process_preflight',
      failure: preflight.failure,
      diagnostics: { ...preflight.diagnostics }
    };
  }

  const diagnostics = { ...preflight.diagnostics };
  const policyActionByState = { ...preflight.policyActionByState };
  const reachableStateKeys = new Set(Object.keys(preflight.expectedRewardByState));

  try {
    const startStateKey = captureStateKey(process, process.startState);
    if (!reachableStateKeys.has(startStateKey)) {
      materializationFail(
        'process_changed_during_materialization',
        `Start state ${startStateKey} was not present in the successful preflight snapshot`,
        startStateKey
      );
    }

    const stateDefinitionByKey = new Map<string, StateDefinition>();
    const postorderStateKeys: string[] = [];
    const transitions: TransitionDefinition[] = [];
    const visitedStateKeys = new Set<string>();
    const activeStateKeys = new Set<string>();
    const stack: MaterializationFrame<State>[] = [
      { phase: 'enter', state: process.startState, stateKey: startStateKey }
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;

      if (frame.phase === 'exit') {
        activeStateKeys.delete(frame.stateKey);
        postorderStateKeys.push(frame.stateKey);
        continue;
      }

      if (activeStateKeys.has(frame.stateKey)) {
        materializationFail(
          'process_changed_during_materialization',
          `Cycle appeared during materialization after the acyclic preflight succeeded at ${frame.stateKey}`,
          frame.stateKey
        );
      }
      if (visitedStateKeys.has(frame.stateKey)) {
        continue;
      }
      if (!reachableStateKeys.has(frame.stateKey)) {
        materializationFail(
          'process_changed_during_materialization',
          `State ${frame.stateKey} appeared during materialization but was absent from the successful preflight snapshot`,
          frame.stateKey
        );
      }

      visitedStateKeys.add(frame.stateKey);
      activeStateKeys.add(frame.stateKey);

      const hasPolicyAction = Object.prototype.hasOwnProperty.call(
        policyActionByState,
        frame.stateKey
      );
      if (!hasPolicyAction) {
        stateDefinitionByKey.set(frame.stateKey, {
          id: frame.stateKey,
          terminal: true
        });
        activeStateKeys.delete(frame.stateKey);
        postorderStateKeys.push(frame.stateKey);
        continue;
      }

      const actionId = policyActionByState[frame.stateKey]!;
      stateDefinitionByKey.set(frame.stateKey, { id: frame.stateKey });
      const outcomes = captureOutcomes(process, frame.state, frame.stateKey, actionId);
      const childFrames: Array<{ state: State; stateKey: string }> = [];

      for (const outcome of outcomes) {
        if (outcome.probability === 0) {
          continue;
        }

        const nextStateKey = captureStateKey(process, outcome.nextState);
        if (!reachableStateKeys.has(nextStateKey)) {
          materializationFail(
            'process_changed_during_materialization',
            `Outcome target ${nextStateKey} from ${frame.stateKey}/${actionId} was absent from the successful preflight snapshot`,
            frame.stateKey,
            actionId
          );
        }

        transitions.push(makeTransition(frame.stateKey, nextStateKey, outcome));
        childFrames.push({ state: outcome.nextState, stateKey: nextStateKey });
      }

      stack.push({ phase: 'exit', stateKey: frame.stateKey });
      for (let index = childFrames.length - 1; index >= 0; index -= 1) {
        const child = childFrames[index]!;
        stack.push({ phase: 'enter', state: child.state, stateKey: child.stateKey });
      }
    }

    if (visitedStateKeys.size !== reachableStateKeys.size) {
      materializationFail(
        'process_changed_during_materialization',
        `Materialization reached ${visitedStateKeys.size} states but the successful preflight reached ${reachableStateKeys.size}`
      );
    }
    for (const stateKey of reachableStateKeys) {
      if (!visitedStateKeys.has(stateKey)) {
        materializationFail(
          'process_changed_during_materialization',
          `Preflight state ${stateKey} was no longer reachable during materialization`,
          stateKey
        );
      }
    }

    const states = postorderStateKeys.map((stateKey) => {
      const state = stateDefinitionByKey.get(stateKey);
      if (state === undefined) {
        throw new Error(`Internal materialization state definition missing for ${stateKey}`);
      }
      return state;
    });

    const model: DefinitionModel = {
      startState: startStateKey,
      states,
      transitions
    };
    const validation = validateDefinitionModel(model, options.probabilityTolerance ?? 1e-9);

    if (!validation.valid) {
      return {
        ok: false,
        stage: 'definition_model_validation',
        failure: {
          code: 'materialized_model_invalid',
          message: firstValidationErrorMessage(validation)
        },
        diagnostics,
        validation
      };
    }

    return {
      ok: true,
      model,
      policyActionByState,
      diagnostics,
      validation
    };
  } catch (error) {
    if (error instanceof FiniteDecisionMaterializationError) {
      return {
        ok: false,
        stage: 'materialization',
        failure: error.failure,
        diagnostics
      };
    }

    return {
      ok: false,
      stage: 'materialization',
      failure: {
        code: 'process_callback_failed',
        message: error instanceof Error ? error.message : String(error)
      },
      diagnostics
    };
  }
}
