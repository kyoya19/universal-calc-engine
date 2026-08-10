import {
  DecisionActionId,
  DecisionOutcome,
  DeterministicDecisionPolicy,
  FiniteDecisionProcess,
  FiniteDecisionProcessOptions,
  FixedPolicyEvaluationResult,
  evaluateFiniteDecisionPolicy
} from './finite_decision_process';

export type ValidatedFiniteDecisionPolicySnapshot<State> = {
  startStateKey: string;
  stateKeyByState: Map<State, string>;
  terminalByStateKey: Map<string, boolean>;
  outcomesByStateAction: Map<
    string,
    Map<DecisionActionId, readonly DecisionOutcome<State>[]>
  >;
};

export type FiniteDecisionPolicySnapshotEvaluation<State> = {
  result: FixedPolicyEvaluationResult;
  snapshot?: ValidatedFiniteDecisionPolicySnapshot<State>;
};

function copyOutcome<State>(outcome: DecisionOutcome<State>): DecisionOutcome<State> {
  const copy: DecisionOutcome<State> = {
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

export function evaluateFiniteDecisionPolicyWithSnapshot<State>(
  process: FiniteDecisionProcess<State>,
  policy: DeterministicDecisionPolicy<State>,
  options: FiniteDecisionProcessOptions = {}
): FiniteDecisionPolicySnapshotEvaluation<State> {
  const stateKeyByState = new Map<State, string>();
  const terminalByStateKey = new Map<string, boolean>();
  const actionsByStateKey = new Map<string, readonly DecisionActionId[]>();
  const outcomesByStateAction = new Map<
    string,
    Map<DecisionActionId, readonly DecisionOutcome<State>[]>
  >();

  const recordedProcess: FiniteDecisionProcess<State> = {
    startState: process.startState,
    stateKey(state) {
      if (stateKeyByState.has(state)) {
        return stateKeyByState.get(state)!;
      }
      const stateKey = process.stateKey(state);
      stateKeyByState.set(state, stateKey);
      return stateKey;
    },
    isTerminal(state) {
      const stateKey = stateKeyByState.get(state);
      if (stateKey !== undefined && terminalByStateKey.has(stateKey)) {
        return terminalByStateKey.get(stateKey)!;
      }
      const terminal = process.isTerminal(state);
      if (stateKey !== undefined) {
        terminalByStateKey.set(stateKey, terminal);
      }
      return terminal;
    },
    actions(state) {
      const stateKey = stateKeyByState.get(state);
      if (stateKey !== undefined) {
        const cached = actionsByStateKey.get(stateKey);
        if (cached !== undefined) {
          return cached;
        }
      }
      const actions = [...process.actions(state)];
      if (stateKey !== undefined) {
        actionsByStateKey.set(stateKey, actions);
      }
      return actions;
    },
    outcomes(state, actionId) {
      const stateKey = stateKeyByState.get(state);
      if (stateKey !== undefined) {
        const byAction = outcomesByStateAction.get(stateKey);
        const cached = byAction?.get(actionId);
        if (cached !== undefined) {
          return cached;
        }
      }

      const outcomes = process.outcomes(state, actionId).map(copyOutcome);
      if (stateKey !== undefined) {
        let byAction = outcomesByStateAction.get(stateKey);
        if (byAction === undefined) {
          byAction = new Map<DecisionActionId, readonly DecisionOutcome<State>[]>();
          outcomesByStateAction.set(stateKey, byAction);
        }
        byAction.set(actionId, outcomes);
      }
      return outcomes;
    }
  };

  const result = evaluateFiniteDecisionPolicy(recordedProcess, policy, options);
  if (!result.ok) {
    return { result };
  }

  const startStateKey = stateKeyByState.get(process.startState);
  if (startStateKey === undefined) {
    return {
      result: {
        ok: false,
        objective: 'expected_total_reward',
        failure: {
          code: 'process_callback_failed',
          message: 'Internal fixed-policy snapshot did not record the start-state key'
        },
        diagnostics: { ...result.diagnostics }
      }
    };
  }

  return {
    result,
    snapshot: {
      startStateKey,
      stateKeyByState,
      terminalByStateKey,
      outcomesByStateAction
    }
  };
}
