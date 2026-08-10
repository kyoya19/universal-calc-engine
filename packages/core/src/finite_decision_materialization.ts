import {
  DecisionActionId,
  DecisionOutcome,
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

type SnapshotOutcome<State> = {
  probability: number;
  nextState: State;
  nextStateKey?: string;
  reward?: number;
  elapsedTimeSeconds?: number;
};

type PolicySnapshotRecorder<State> = {
  startStateKey?: string;
  latestStateKeyByState: Map<State, string>;
  pendingOutcomesByNextState: Map<State, SnapshotOutcome<State>[]>;
  outcomesByStateAction: Map<
    string,
    Map<DecisionActionId, SnapshotOutcome<State>[]>
  >;
  nonterminalStateOrder: string[];
  recordedNonterminalStateKeys: Set<string>;
};

type SnapshotOrderFrame =
  | { phase: 'enter'; stateKey: string }
  | { phase: 'exit'; stateKey: string };

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

function createSnapshotRecorder<State>(): PolicySnapshotRecorder<State> {
  return {
    latestStateKeyByState: new Map<State, string>(),
    pendingOutcomesByNextState: new Map<State, SnapshotOutcome<State>[]>(),
    outcomesByStateAction: new Map<
      string,
      Map<DecisionActionId, SnapshotOutcome<State>[]>
    >(),
    nonterminalStateOrder: [],
    recordedNonterminalStateKeys: new Set<string>()
  };
}

function copyOutcome<State>(outcome: DecisionOutcome<State>): SnapshotOutcome<State> {
  const copy: SnapshotOutcome<State> = {
    probability: outcome.probability,
    nextState: outcome.nextState
  };
  if (outcome.reward !== undefined) {
    copy.reward = outcome.reward;
  }
  if (outcome.elapsedTimeSeconds !== undefined) {
    copy.elapsedTimeSeconds = outcome.elapsedTimeSeconds;
  }
  return copy;
}

function enqueuePendingOutcome<State>(
  recorder: PolicySnapshotRecorder<State>,
  outcome: SnapshotOutcome<State>
): void {
  if (!(outcome.probability > 0)) {
    return;
  }
  const pending = recorder.pendingOutcomesByNextState.get(outcome.nextState);
  if (pending === undefined) {
    recorder.pendingOutcomesByNextState.set(outcome.nextState, [outcome]);
    return;
  }
  pending.push(outcome);
}

function recordStateKey<State>(
  recorder: PolicySnapshotRecorder<State>,
  state: State,
  stateKey: string
): void {
  if (typeof stateKey !== 'string' || stateKey.length === 0) {
    return;
  }
  if (recorder.startStateKey === undefined) {
    recorder.startStateKey = stateKey;
  }
  recorder.latestStateKeyByState.set(state, stateKey);

  const pending = recorder.pendingOutcomesByNextState.get(state);
  if (pending === undefined) {
    return;
  }
  const outcome = pending.shift();
  if (outcome !== undefined) {
    outcome.nextStateKey = stateKey;
  }
  if (pending.length === 0) {
    recorder.pendingOutcomesByNextState.delete(state);
  }
}

function recordOutcomes<State>(
  recorder: PolicySnapshotRecorder<State>,
  state: State,
  actionId: DecisionActionId,
  outcomes: readonly DecisionOutcome<State>[]
): DecisionOutcome<State>[] {
  const stateKey = recorder.latestStateKeyByState.get(state);
  if (stateKey === undefined) {
    throw new Error(
      'Internal decision snapshot recorder did not observe stateKey(state) before outcomes(state, actionId)'
    );
  }

  const copies = outcomes.map(copyOutcome);
  let byAction = recorder.outcomesByStateAction.get(stateKey);
  if (byAction === undefined) {
    byAction = new Map<DecisionActionId, SnapshotOutcome<State>[]>();
    recorder.outcomesByStateAction.set(stateKey, byAction);
  }
  byAction.set(actionId, copies);

  if (!recorder.recordedNonterminalStateKeys.has(stateKey)) {
    recorder.recordedNonterminalStateKeys.add(stateKey);
    recorder.nonterminalStateOrder.push(stateKey);
  }

  for (const outcome of copies) {
    enqueuePendingOutcome(recorder, outcome);
  }

  return copies;
}

function createSnapshottingProcess<State>(
  process: FiniteDecisionProcess<State>,
  recorder: PolicySnapshotRecorder<State>
): FiniteDecisionProcess<State> {
  return {
    startState: process.startState,
    stateKey: (state) => {
      const stateKey = process.stateKey(state);
      recordStateKey(recorder, state, stateKey);
      return stateKey;
    },
    isTerminal: (state) => process.isTerminal(state),
    actions: (state) => [...process.actions(state)],
    outcomes: (state, actionId) =>
      recordOutcomes(recorder, state, actionId, process.outcomes(state, actionId))
  };
}

function requiredSnapshotOutcomes<State>(
  recorder: PolicySnapshotRecorder<State>,
  stateKey: string,
  actionId: DecisionActionId
): SnapshotOutcome<State>[] {
  const outcomes = recorder.outcomesByStateAction.get(stateKey)?.get(actionId);
  if (outcomes === undefined) {
    materializationFail(
      'process_changed_during_materialization',
      `Validated decision snapshot is missing outcomes for ${stateKey}/${actionId}`,
      stateKey,
      actionId
    );
  }
  return outcomes;
}

function requiredSnapshotNextStateKey<State>(
  outcome: SnapshotOutcome<State>,
  stateKey: string,
  actionId: DecisionActionId
): string {
  if (outcome.nextStateKey === undefined) {
    materializationFail(
      'process_changed_during_materialization',
      `Validated decision snapshot is missing an outcome target key for ${stateKey}/${actionId}`,
      stateKey,
      actionId
    );
  }
  return outcome.nextStateKey;
}

function hasPolicyAction(
  policyActionByState: Record<string, DecisionActionId>,
  stateKey: string
): boolean {
  return Object.prototype.hasOwnProperty.call(policyActionByState, stateKey);
}

function buildPostorderStateKeys<State>(
  startStateKey: string,
  policyActionByState: Record<string, DecisionActionId>,
  recorder: PolicySnapshotRecorder<State>
): { stateKeys: string[]; visitedStateKeys: Set<string> } {
  const stateKeys: string[] = [];
  const visitedStateKeys = new Set<string>();
  const stack: SnapshotOrderFrame[] = [{ phase: 'enter', stateKey: startStateKey }];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.phase === 'exit') {
      stateKeys.push(frame.stateKey);
      continue;
    }
    if (visitedStateKeys.has(frame.stateKey)) {
      continue;
    }

    visitedStateKeys.add(frame.stateKey);
    stack.push({ phase: 'exit', stateKey: frame.stateKey });

    if (!hasPolicyAction(policyActionByState, frame.stateKey)) {
      continue;
    }
    const actionId = policyActionByState[frame.stateKey]!;
    const outcomes = requiredSnapshotOutcomes(recorder, frame.stateKey, actionId);
    for (let index = outcomes.length - 1; index >= 0; index -= 1) {
      const outcome = outcomes[index]!;
      if (outcome.probability === 0) {
        continue;
      }
      stack.push({
        phase: 'enter',
        stateKey: requiredSnapshotNextStateKey(outcome, frame.stateKey, actionId)
      });
    }
  }

  return { stateKeys, visitedStateKeys };
}

function makeTransition<State>(
  from: string,
  to: string,
  outcome: SnapshotOutcome<State>
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
  const recorder = createSnapshotRecorder<State>();
  const preflight = evaluateFiniteDecisionPolicy(
    createSnapshottingProcess(process, recorder),
    policy,
    options
  );
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
    const startStateKey = recorder.startStateKey;
    if (startStateKey === undefined || !reachableStateKeys.has(startStateKey)) {
      materializationFail(
        'process_changed_during_materialization',
        'Validated decision snapshot is missing the successful preflight start state'
      );
    }

    const postorder = buildPostorderStateKeys(
      startStateKey,
      policyActionByState,
      recorder
    );
    if (postorder.visitedStateKeys.size !== reachableStateKeys.size) {
      materializationFail(
        'process_changed_during_materialization',
        `Validated decision snapshot contains ${postorder.visitedStateKeys.size} reachable states but the successful preflight contains ${reachableStateKeys.size}`
      );
    }
    for (const stateKey of reachableStateKeys) {
      if (!postorder.visitedStateKeys.has(stateKey)) {
        materializationFail(
          'process_changed_during_materialization',
          `Successful preflight state ${stateKey} is missing from the validated decision snapshot`,
          stateKey
        );
      }
    }

    const states: StateDefinition[] = postorder.stateKeys.map((stateKey) =>
      hasPolicyAction(policyActionByState, stateKey)
        ? { id: stateKey }
        : { id: stateKey, terminal: true }
    );
    const transitions: TransitionDefinition[] = [];

    for (const stateKey of recorder.nonterminalStateOrder) {
      if (!hasPolicyAction(policyActionByState, stateKey)) {
        continue;
      }
      const actionId = policyActionByState[stateKey]!;
      const outcomes = requiredSnapshotOutcomes(recorder, stateKey, actionId);
      for (const outcome of outcomes) {
        if (outcome.probability === 0) {
          continue;
        }
        transitions.push(
          makeTransition(
            stateKey,
            requiredSnapshotNextStateKey(outcome, stateKey, actionId),
            outcome
          )
        );
      }
    }

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
