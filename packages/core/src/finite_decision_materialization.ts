import {
  DecisionActionId,
  DecisionOutcome,
  DeterministicDecisionPolicy,
  FiniteDecisionDiagnostics,
  FiniteDecisionFailure,
  FiniteDecisionProcess,
  FiniteDecisionProcessOptions
} from './finite_decision_process';
import { evaluateFiniteDecisionPolicyWithSnapshot } from './finite_decision_policy_snapshot';
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

function makeTransition<State>(
  from: string,
  to: string,
  outcome: DecisionOutcome<State>
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

function materializationFailure(
  diagnostics: FiniteDecisionDiagnostics,
  message: string,
  stateKey?: string,
  actionId?: DecisionActionId
): FiniteDecisionMaterializationCaptureFailure {
  const failure: FiniteDecisionMaterializationFailure = {
    code: 'process_changed_during_materialization',
    message
  };
  if (stateKey !== undefined) {
    failure.stateKey = stateKey;
  }
  if (actionId !== undefined) {
    failure.actionId = actionId;
  }
  return {
    ok: false,
    stage: 'materialization',
    failure,
    diagnostics
  };
}

export function materializeFiniteDecisionPolicy<State>(
  process: FiniteDecisionProcess<State>,
  policy: DeterministicDecisionPolicy<State>,
  options: FiniteDecisionProcessOptions = {}
): FiniteDecisionMaterializationResult {
  const evaluated = evaluateFiniteDecisionPolicyWithSnapshot(process, policy, options);
  const preflight = evaluated.result;
  if (!preflight.ok) {
    return {
      ok: false,
      stage: 'decision_process_preflight',
      failure: preflight.failure,
      diagnostics: { ...preflight.diagnostics }
    };
  }

  const diagnostics = { ...preflight.diagnostics };
  const snapshot = evaluated.snapshot;
  if (snapshot === undefined) {
    return materializationFailure(
      diagnostics,
      'Successful fixed-policy evaluation did not provide its validated callback snapshot'
    );
  }

  const policyActionByState = { ...preflight.policyActionByState };
  const reachableStateKeys = new Set(Object.keys(preflight.expectedRewardByState));
  if (!reachableStateKeys.has(snapshot.startStateKey)) {
    return materializationFailure(
      diagnostics,
      `Validated snapshot start state ${snapshot.startStateKey} is absent from the fixed-policy result`,
      snapshot.startStateKey
    );
  }

  const recordedStateKeys = new Set(snapshot.stateKeyByState.values());
  const states: StateDefinition[] = [];
  for (const stateKey of reachableStateKeys) {
    if (!recordedStateKeys.has(stateKey)) {
      return materializationFailure(
        diagnostics,
        `Reachable state ${stateKey} is absent from the validated callback snapshot`,
        stateKey
      );
    }

    const terminal = snapshot.terminalByStateKey.get(stateKey);
    if (terminal === undefined) {
      return materializationFailure(
        diagnostics,
        `Reachable state ${stateKey} has no terminal-status record in the validated callback snapshot`,
        stateKey
      );
    }

    const hasPolicyAction = Object.prototype.hasOwnProperty.call(policyActionByState, stateKey);
    if (terminal === hasPolicyAction) {
      return materializationFailure(
        diagnostics,
        `Validated snapshot terminal/policy status is inconsistent at ${stateKey}`,
        stateKey
      );
    }

    states.push(terminal ? { id: stateKey, terminal: true } : { id: stateKey });
  }

  const transitions: TransitionDefinition[] = [];
  for (const [stateKey, actionId] of Object.entries(policyActionByState)) {
    const outcomes = snapshot.outcomesByStateAction.get(stateKey)?.get(actionId);
    if (outcomes === undefined) {
      return materializationFailure(
        diagnostics,
        `Selected action ${actionId} at ${stateKey} has no validated outcome snapshot`,
        stateKey,
        actionId
      );
    }

    for (const outcome of outcomes) {
      if (outcome.probability === 0) {
        continue;
      }

      const nextStateKey = snapshot.stateKeyByState.get(outcome.nextState);
      if (nextStateKey === undefined || !reachableStateKeys.has(nextStateKey)) {
        return materializationFailure(
          diagnostics,
          `Positive-probability outcome from ${stateKey}/${actionId} has no reachable target in the validated snapshot`,
          stateKey,
          actionId
        );
      }

      transitions.push(makeTransition(stateKey, nextStateKey, outcome));
    }
  }

  const model: DefinitionModel = {
    startState: snapshot.startStateKey,
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
}
