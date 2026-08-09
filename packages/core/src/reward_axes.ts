import {
  DefinitionModel,
  EvaluatedModel,
  EvaluatedTransition,
  ExpandedModel,
  RewardSpec,
  StateId,
  TransitionDefinition,
  evaluateModel,
  evaluateRewardSpec,
  expandModel,
  isTerminalState
} from './model';

export type RewardAxisId = string;
export type RewardAxisKind = 'benefit' | 'cost' | 'neutral';

export type RewardAxisDefinition = {
  id: RewardAxisId;
  unit: string;
  kind: RewardAxisKind;
  label?: string;
};

export type RewardAxisValues = Record<RewardAxisId, RewardSpec>;
export type EvaluatedRewardAxisValues = Record<RewardAxisId, number>;

export type RewardAxesTransitionDefinition = TransitionDefinition & {
  rewardsByAxis?: RewardAxisValues;
};

export type RewardAxesDefinitionModel = Omit<DefinitionModel, 'transitions'> & {
  rewardAxes: RewardAxisDefinition[];
  transitions: RewardAxesTransitionDefinition[];
};

export type RewardAxesExpandedModel = Omit<
  ExpandedModel,
  'transitions' | 'transitionsByState'
> & {
  rewardAxes: RewardAxisDefinition[];
  rewardAxisById: Map<RewardAxisId, RewardAxisDefinition>;
  transitions: RewardAxesTransitionDefinition[];
  transitionsByState: Map<StateId, RewardAxesTransitionDefinition[]>;
};

export type RewardAxesEvaluatedTransition = EvaluatedTransition & {
  rewardsByAxis?: EvaluatedRewardAxisValues;
};

export type RewardAxesEvaluatedModel = Omit<
  EvaluatedModel,
  'transitions' | 'transitionsByState'
> & {
  rewardAxes: RewardAxisDefinition[];
  rewardAxisById: Map<RewardAxisId, RewardAxisDefinition>;
  transitions: RewardAxesEvaluatedTransition[];
  transitionsByState: Map<StateId, RewardAxesEvaluatedTransition[]>;
};

export type RewardAxesSolvedModel = {
  expectedRewardByAxisByState: Map<RewardAxisId, Map<StateId, number>>;
};

export type RewardAxesOutputResult = {
  startState: StateId;
  rewardAxes: RewardAxisDefinition[];
  expectedRewardByAxis: Record<RewardAxisId, number>;
  expectedRewardByAxisByState: Record<RewardAxisId, Record<StateId, number>>;
};

export type RewardAxisContributionRow = {
  to: StateId;
  probability: number;
  reward: number;
  downstreamExpectedReward: number;
  contribution: number;
};

export type RewardAxesContributionResult = {
  rewardAxes: RewardAxisDefinition[];
  transitionContributionsByAxisByState: Record<
    RewardAxisId,
    Record<StateId, RewardAxisContributionRow[]>
  >;
};

function copyRewardAxes(rewardAxes: RewardAxisDefinition[]): RewardAxisDefinition[] {
  return rewardAxes.map((axis) => ({ ...axis }));
}

function evaluateRewardAxisValues(values: RewardAxisValues): EvaluatedRewardAxisValues {
  const evaluated: EvaluatedRewardAxisValues = {};

  for (const [axisId, spec] of Object.entries(values)) {
    evaluated[axisId] = evaluateRewardSpec(spec);
  }

  return evaluated;
}

export function expandRewardAxesModel(model: RewardAxesDefinitionModel): RewardAxesExpandedModel {
  const base = expandModel(model);
  const rewardAxisById = new Map<RewardAxisId, RewardAxisDefinition>();

  for (const axis of model.rewardAxes) {
    if (rewardAxisById.has(axis.id)) {
      throw new Error(`Duplicate reward axis id: ${axis.id}`);
    }
    rewardAxisById.set(axis.id, axis);
  }

  for (const transition of model.transitions) {
    for (const axisId of Object.keys(transition.rewardsByAxis ?? {})) {
      if (!rewardAxisById.has(axisId)) {
        throw new Error(
          `Unknown reward axis on transition ${transition.from} -> ${transition.to}: ${axisId}`
        );
      }
    }
  }

  const transitionsByState = new Map<StateId, RewardAxesTransitionDefinition[]>();
  for (const state of model.states) {
    transitionsByState.set(state.id, []);
  }
  for (const transition of model.transitions) {
    transitionsByState.get(transition.from)?.push(transition);
  }

  return {
    ...base,
    rewardAxes: copyRewardAxes(model.rewardAxes),
    rewardAxisById,
    transitions: model.transitions,
    transitionsByState
  };
}

export function evaluateRewardAxesModel(
  model: RewardAxesExpandedModel
): RewardAxesEvaluatedModel {
  const base = evaluateModel(model);
  const transitions: RewardAxesEvaluatedTransition[] = base.transitions.map(
    (transition, index) => {
      const source = model.transitions[index];
      if (!source) {
        throw new Error('Reward axes transition evaluation mismatch');
      }

      const evaluated: RewardAxesEvaluatedTransition = { ...transition };
      if (source.rewardsByAxis !== undefined) {
        evaluated.rewardsByAxis = evaluateRewardAxisValues(source.rewardsByAxis);
      }
      return evaluated;
    }
  );

  const transitionsByState = new Map<StateId, RewardAxesEvaluatedTransition[]>();
  for (const state of model.states) {
    transitionsByState.set(state.id, []);
  }
  for (const transition of transitions) {
    transitionsByState.get(transition.from)?.push(transition);
  }

  return {
    ...base,
    rewardAxes: copyRewardAxes(model.rewardAxes),
    rewardAxisById: new Map(model.rewardAxisById),
    transitions,
    transitionsByState
  };
}

export function solveExpectedRewardAxes(model: RewardAxesEvaluatedModel): RewardAxesSolvedModel {
  const expectedRewardByAxisByState = new Map<RewardAxisId, Map<StateId, number>>();

  for (const axis of model.rewardAxes) {
    const expectedRewardByState = new Map<StateId, number>();
    for (const state of model.states) {
      expectedRewardByState.set(state.id, 0);
    }

    for (let iteration = 0; iteration < 10_000; iteration += 1) {
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

      if (maxDelta < 1e-12) {
        expectedRewardByAxisByState.set(axis.id, expectedRewardByState);
        break;
      }

      if (iteration === 9_999) {
        throw new Error(`Expected reward axis solver did not converge: ${axis.id}`);
      }
    }
  }

  return { expectedRewardByAxisByState };
}

export function toRewardAxesOutputResult(
  model: RewardAxesDefinitionModel,
  solved: RewardAxesSolvedModel
): RewardAxesOutputResult {
  const expectedRewardByAxis: Record<RewardAxisId, number> = {};
  const expectedRewardByAxisByState: Record<RewardAxisId, Record<StateId, number>> = {};

  for (const axis of model.rewardAxes) {
    const values = solved.expectedRewardByAxisByState.get(axis.id);
    const byState: Record<StateId, number> = {};

    for (const [stateId, value] of values ?? []) {
      byState[stateId] = value;
    }

    expectedRewardByAxis[axis.id] = values?.get(model.startState) ?? 0;
    expectedRewardByAxisByState[axis.id] = byState;
  }

  return {
    startState: model.startState,
    rewardAxes: copyRewardAxes(model.rewardAxes),
    expectedRewardByAxis,
    expectedRewardByAxisByState
  };
}

export function toRewardAxesContributionResult(
  model: RewardAxesEvaluatedModel,
  solved: RewardAxesSolvedModel
): RewardAxesContributionResult {
  const transitionContributionsByAxisByState: RewardAxesContributionResult[
    'transitionContributionsByAxisByState'
  ] = {};

  for (const axis of model.rewardAxes) {
    const expectedRewardByState = solved.expectedRewardByAxisByState.get(axis.id);
    const byState: Record<StateId, RewardAxisContributionRow[]> = {};

    for (const state of model.states) {
      const transitions = model.transitionsByState.get(state.id) ?? [];
      byState[state.id] = transitions.map((transition) => {
        const reward = transition.rewardsByAxis?.[axis.id] ?? 0;
        const downstreamExpectedReward = expectedRewardByState?.get(transition.to) ?? 0;
        return {
          to: transition.to,
          probability: transition.probability,
          reward,
          downstreamExpectedReward,
          contribution: transition.probability * (reward + downstreamExpectedReward)
        };
      });
    }

    transitionContributionsByAxisByState[axis.id] = byState;
  }

  return {
    rewardAxes: copyRewardAxes(model.rewardAxes),
    transitionContributionsByAxisByState
  };
}

export function rewardAxesOutputResultToJson(output: RewardAxesOutputResult): string {
  return JSON.stringify(output);
}

export function rewardAxesContributionResultToJson(
  contributions: RewardAxesContributionResult
): string {
  return JSON.stringify(contributions);
}
