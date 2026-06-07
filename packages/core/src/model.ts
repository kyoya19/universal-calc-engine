export type StateId = string;

export type ScalarSpec =
  | number
  | {
      type: 'constant';
      value: number;
    };

export type ProbabilitySpec = ScalarSpec;
export type RewardSpec = ScalarSpec;

export type TerminalCondition =
  | {
      type: 'explicit';
      value: boolean;
    }
  | {
      type: 'property_equals';
      property: string;
      value: number | string | boolean;
    };

export type StateDefinition = {
  id: StateId;
  terminal?: boolean;
  terminalCondition?: TerminalCondition;
  properties?: Record<string, number | string | boolean>;
};

export type TransitionDefinition = {
  from: StateId;
  to: StateId;
  probability: ProbabilitySpec;
  reward?: RewardSpec;
};

export type EvaluatedTransition = {
  from: StateId;
  to: StateId;
  probability: number;
  reward?: number;
};

export type DefinitionModel = {
  startState: StateId;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
};

export type ExpandedModel = DefinitionModel & {
  stateById: Map<StateId, StateDefinition>;
  transitionsByState: Map<StateId, TransitionDefinition[]>;
};

export type EvaluatedModel = Omit<ExpandedModel, 'transitions' | 'transitionsByState'> & {
  transitions: EvaluatedTransition[];
  transitionsByState: Map<StateId, EvaluatedTransition[]>;
};

export type SolvedModel = {
  expectedRewardByState: Map<StateId, number>;
};

export type OutputResult = {
  startState: StateId;
  expectedReward: number;
  expectedRewardByState: Record<StateId, number>;
};

export type ContributionResult = {
  transitionContributionsByState: Record<StateId, Array<{
    to: StateId;
    probability: number;
    reward: number;
    downstreamExpectedReward: number;
    contribution: number;
  }>>;
};

export function evaluateScalarSpec(spec: ScalarSpec): number {
  if (typeof spec === 'number') {
    return spec;
  }

  if (spec.type === 'constant') {
    return spec.value;
  }

  const unreachable: never = spec;
  throw new Error(`Unsupported scalar spec: ${JSON.stringify(unreachable)}`);
}

export function isTerminalState(state: StateDefinition): boolean {
  if (typeof state.terminal === 'boolean') {
    return state.terminal;
  }

  const condition = state.terminalCondition;
  if (!condition) {
    return false;
  }

  if (condition.type === 'explicit') {
    return condition.value;
  }

  if (condition.type === 'property_equals') {
    return state.properties?.[condition.property] === condition.value;
  }

  const unreachable: never = condition;
  throw new Error(`Unsupported terminal condition: ${JSON.stringify(unreachable)}`);
}

export function expandModel(model: DefinitionModel): ExpandedModel {
  const stateById = new Map<StateId, StateDefinition>();
  const transitionsByState = new Map<StateId, TransitionDefinition[]>();

  for (const state of model.states) {
    stateById.set(state.id, state);
    transitionsByState.set(state.id, []);
  }

  for (const transition of model.transitions) {
    if (!stateById.has(transition.from)) {
      throw new Error(`Unknown transition.from state: ${transition.from}`);
    }
    if (!stateById.has(transition.to)) {
      throw new Error(`Unknown transition.to state: ${transition.to}`);
    }
    transitionsByState.get(transition.from)?.push(transition);
  }

  return { ...model, stateById, transitionsByState };
}

export function evaluateModel(model: ExpandedModel): EvaluatedModel {
  const transitions = model.transitions.map((transition) => ({
    from: transition.from,
    to: transition.to,
    probability: evaluateScalarSpec(transition.probability),
    reward: transition.reward === undefined ? undefined : evaluateScalarSpec(transition.reward)
  }));

  const transitionsByState = new Map<StateId, EvaluatedTransition[]>();
  for (const state of model.states) {
    transitionsByState.set(state.id, []);
  }

  for (const transition of transitions) {
    transitionsByState.get(transition.from)?.push(transition);
  }

  const evaluated: EvaluatedModel = {
    ...model,
    transitions,
    transitionsByState
  };

  for (const [stateId, stateTransitions] of evaluated.transitionsByState) {
    const state = evaluated.stateById.get(stateId);
    if (state && isTerminalState(state)) {
      continue;
    }
    const total = stateTransitions.reduce((sum, transition) => sum + transition.probability, 0);
    if (Math.abs(total - 1) > 1e-9) {
      throw new Error(`Transition probabilities from ${stateId} sum to ${total}, not 1`);
    }
  }

  return evaluated;
}

export function solveExpectedReward(model: EvaluatedModel): SolvedModel {
  const stateIds = model.states.map((state) => state.id);
  const expectedRewardByState = new Map<StateId, number>();

  for (const stateId of stateIds) {
    expectedRewardByState.set(stateId, 0);
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
        const reward = transition.reward ?? 0;
        const downstream = expectedRewardByState.get(transition.to) ?? 0;
        return sum + transition.probability * (reward + downstream);
      }, 0);

      const previous = expectedRewardByState.get(state.id) ?? 0;
      maxDelta = Math.max(maxDelta, Math.abs(nextValue - previous));
      expectedRewardByState.set(state.id, nextValue);
    }

    if (maxDelta < 1e-12) {
      return { expectedRewardByState };
    }
  }

  throw new Error('Expected reward solver did not converge');
}

export function toOutputResult(model: DefinitionModel, solved: SolvedModel): OutputResult {
  const expectedRewardByState: Record<StateId, number> = {};

  for (const [stateId, value] of solved.expectedRewardByState) {
    expectedRewardByState[stateId] = value;
  }

  return {
    startState: model.startState,
    expectedReward: solved.expectedRewardByState.get(model.startState) ?? 0,
    expectedRewardByState
  };
}

export function toContributionResult(model: EvaluatedModel, solved: SolvedModel): ContributionResult {
  const transitionContributionsByState: ContributionResult['transitionContributionsByState'] = {};

  for (const state of model.states) {
    const transitions = model.transitionsByState.get(state.id) ?? [];
    transitionContributionsByState[state.id] = transitions.map((transition) => {
      const reward = transition.reward ?? 0;
      const downstreamExpectedReward = solved.expectedRewardByState.get(transition.to) ?? 0;
      return {
        to: transition.to,
        probability: transition.probability,
        reward,
        downstreamExpectedReward,
        contribution: transition.probability * (reward + downstreamExpectedReward)
      };
    });
  }

  return { transitionContributionsByState };
}
