import {
  DefinitionModel,
  StateDefinition,
  StateId,
  evaluateProbabilitySpec,
  evaluateRewardSpec,
  evaluateTimeSpecSeconds,
  formatTransitionProbabilityTotalError,
  isTerminalState,
  isTransitionProbabilityTotalValid
} from './model';
import { RewardAxesDefinitionModel } from './reward_axes';

export type ModelValidationSeverity = 'error' | 'warning';

export type ModelValidationIssueCode =
  | 'duplicate_state_id'
  | 'unknown_start_state'
  | 'unknown_transition_from'
  | 'unknown_transition_to'
  | 'invalid_probability'
  | 'invalid_reward'
  | 'invalid_elapsed_time'
  | 'transition_probability_total'
  | 'terminal_state_has_transitions'
  | 'duplicate_reward_axis_id'
  | 'empty_reward_axis_unit'
  | 'unknown_reward_axis'
  | 'invalid_reward_axis_value';

export type ModelValidationIssue = {
  code: ModelValidationIssueCode;
  severity: ModelValidationSeverity;
  path: string;
  message: string;
};

export type ModelValidationResult = {
  valid: boolean;
  issues: ModelValidationIssue[];
  errors: ModelValidationIssue[];
  warnings: ModelValidationIssue[];
};

function toValidationResult(issues: ModelValidationIssue[]): ModelValidationResult {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings
  };
}

function firstStateById(states: StateDefinition[]): Map<StateId, StateDefinition> {
  const stateById = new Map<StateId, StateDefinition>();
  for (const state of states) {
    if (!stateById.has(state.id)) {
      stateById.set(state.id, state);
    }
  }
  return stateById;
}

export function validateDefinitionModel(
  model: DefinitionModel,
  probabilityTolerance = 1e-9
): ModelValidationResult {
  const issues: ModelValidationIssue[] = [];
  const stateById = firstStateById(model.states);
  const seenStateIds = new Set<StateId>();

  model.states.forEach((state, index) => {
    if (seenStateIds.has(state.id)) {
      issues.push({
        code: 'duplicate_state_id',
        severity: 'error',
        path: `states[${index}].id`,
        message: `Duplicate state id: ${state.id}`
      });
    } else {
      seenStateIds.add(state.id);
    }
  });

  if (!stateById.has(model.startState)) {
    issues.push({
      code: 'unknown_start_state',
      severity: 'error',
      path: 'startState',
      message: `Unknown start state: ${model.startState}`
    });
  }

  const probabilityTotalByState = new Map<StateId, number>();
  const transitionCountByState = new Map<StateId, number>();
  const invalidProbabilityStateIds = new Set<StateId>();

  for (const stateId of stateById.keys()) {
    probabilityTotalByState.set(stateId, 0);
    transitionCountByState.set(stateId, 0);
  }

  model.transitions.forEach((transition, index) => {
    const transitionPath = `transitions[${index}]`;
    const knownFrom = stateById.has(transition.from);

    if (!knownFrom) {
      issues.push({
        code: 'unknown_transition_from',
        severity: 'error',
        path: `${transitionPath}.from`,
        message: `Unknown transition.from state: ${transition.from}`
      });
    }

    if (!stateById.has(transition.to)) {
      issues.push({
        code: 'unknown_transition_to',
        severity: 'error',
        path: `${transitionPath}.to`,
        message: `Unknown transition.to state: ${transition.to}`
      });
    }

    const probability = evaluateProbabilitySpec(transition.probability);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      issues.push({
        code: 'invalid_probability',
        severity: 'error',
        path: `${transitionPath}.probability`,
        message: `Transition probability must be a finite number from 0 to 1: ${probability}`
      });
      if (knownFrom) {
        invalidProbabilityStateIds.add(transition.from);
      }
    } else if (knownFrom) {
      probabilityTotalByState.set(
        transition.from,
        (probabilityTotalByState.get(transition.from) ?? 0) + probability
      );
    }

    if (knownFrom) {
      transitionCountByState.set(
        transition.from,
        (transitionCountByState.get(transition.from) ?? 0) + 1
      );
    }

    if (transition.reward !== undefined) {
      const reward = evaluateRewardSpec(transition.reward);
      if (!Number.isFinite(reward)) {
        issues.push({
          code: 'invalid_reward',
          severity: 'error',
          path: `${transitionPath}.reward`,
          message: `Transition reward must be finite: ${reward}`
        });
      }
    }

    if (transition.elapsedTime !== undefined) {
      const elapsedTimeSeconds = evaluateTimeSpecSeconds(transition.elapsedTime);
      if (!Number.isFinite(elapsedTimeSeconds) || elapsedTimeSeconds < 0) {
        issues.push({
          code: 'invalid_elapsed_time',
          severity: 'error',
          path: `${transitionPath}.elapsedTime`,
          message: `Transition elapsed time must be finite and non-negative: ${elapsedTimeSeconds}`
        });
      }
    }
  });

  for (const [stateId, state] of stateById) {
    const transitionCount = transitionCountByState.get(stateId) ?? 0;

    if (isTerminalState(state)) {
      if (transitionCount > 0) {
        issues.push({
          code: 'terminal_state_has_transitions',
          severity: 'warning',
          path: `states[id=${stateId}]`,
          message: `Terminal state ${stateId} has ${transitionCount} outgoing transition(s); current solvers ignore them`
        });
      }
      continue;
    }

    if (invalidProbabilityStateIds.has(stateId)) {
      continue;
    }

    const probabilityTotal = probabilityTotalByState.get(stateId) ?? 0;
    if (!isTransitionProbabilityTotalValid(probabilityTotal, probabilityTolerance)) {
      issues.push({
        code: 'transition_probability_total',
        severity: 'error',
        path: `states[id=${stateId}].transitions`,
        message: formatTransitionProbabilityTotalError(stateId, probabilityTotal)
      });
    }
  }

  return toValidationResult(issues);
}

export function validateRewardAxesDefinitionModel(
  model: RewardAxesDefinitionModel,
  probabilityTolerance = 1e-9
): ModelValidationResult {
  const baseResult = validateDefinitionModel(model, probabilityTolerance);
  const issues = [...baseResult.issues];
  const rewardAxisIds = new Set<string>();

  model.rewardAxes.forEach((axis, index) => {
    if (rewardAxisIds.has(axis.id)) {
      issues.push({
        code: 'duplicate_reward_axis_id',
        severity: 'error',
        path: `rewardAxes[${index}].id`,
        message: `Duplicate reward axis id: ${axis.id}`
      });
    } else {
      rewardAxisIds.add(axis.id);
    }

    if (axis.unit.trim().length === 0) {
      issues.push({
        code: 'empty_reward_axis_unit',
        severity: 'error',
        path: `rewardAxes[${index}].unit`,
        message: `Reward axis ${axis.id} must declare a non-empty unit`
      });
    }
  });

  model.transitions.forEach((transition, transitionIndex) => {
    for (const [axisId, spec] of Object.entries(transition.rewardsByAxis ?? {})) {
      const path = `transitions[${transitionIndex}].rewardsByAxis.${axisId}`;

      if (!rewardAxisIds.has(axisId)) {
        issues.push({
          code: 'unknown_reward_axis',
          severity: 'error',
          path,
          message: `Unknown reward axis on transition ${transition.from} -> ${transition.to}: ${axisId}`
        });
        continue;
      }

      const value = evaluateRewardSpec(spec);
      if (!Number.isFinite(value)) {
        issues.push({
          code: 'invalid_reward_axis_value',
          severity: 'error',
          path,
          message: `Reward axis value must be finite: ${value}`
        });
      }
    }
  });

  return toValidationResult(issues);
}

export function serializeModelValidationResult(
  result: ModelValidationResult
): ModelValidationResult {
  const issues = result.issues.map((issue) => ({ ...issue }));
  return toValidationResult(issues);
}

export function modelValidationResultToJson(result: ModelValidationResult): string {
  return JSON.stringify(serializeModelValidationResult(result));
}
