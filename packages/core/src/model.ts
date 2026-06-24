export type StateId = string;
export type PropertyValue = number | string | boolean;
export type StateProperties = Record<string, PropertyValue>;

export type ConstantScalarSpec = {
  type: 'constant';
  value: number;
};

export type ScalarSpec = number | ConstantScalarSpec;

export type ScalarSpecKind = 'number' | 'constant';

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
      value: PropertyValue;
    };

export type TerminalConditionKind = TerminalCondition['type'];

export type TransitionEffect = {
  type: 'set_property';
  property: string;
  value: PropertyValue;
};

export type TransitionEffectKind = TransitionEffect['type'];

export type StateDefinition = {
  id: StateId;
  terminal?: boolean;
  terminalCondition?: TerminalCondition;
  properties?: StateProperties;
};

export type TransitionDefinition = {
  from: StateId;
  to: StateId;
  probability: ProbabilitySpec;
  reward?: RewardSpec;
  effects?: TransitionEffect[];
};

export type EvaluatedTransition = {
  from: StateId;
  to: StateId;
  probability: number;
  reward?: number;
  effects?: TransitionEffect[];
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

export type TransitionProbabilityAuditRow = {
  stateId: StateId;
  transitionCount: number;
  probabilityTotal: number;
  deviationFromOne: number;
  terminal: boolean;
  valid: boolean;
};

export type TransitionProbabilityAuditResult = {
  rows: TransitionProbabilityAuditRow[];
  invalidRows: TransitionProbabilityAuditRow[];
  valid: boolean;
};

export function getScalarSpecKind(spec: ScalarSpec): ScalarSpecKind {
  return typeof spec === 'number' ? 'number' : spec.type;
}

export function serializeScalarSpec(spec: ScalarSpec): ScalarSpec {
  if (typeof spec === 'number') {
    return spec;
  }

  return { ...spec };
}

export function evaluateScalarSpec(spec: ScalarSpec): number {
  if (typeof spec === 'number') {
    return spec;
  }

  return spec.value;
}

export function evaluateProbabilitySpec(spec: ProbabilitySpec): number {
  return evaluateScalarSpec(spec);
}

export function serializeProbabilitySpec(spec: ProbabilitySpec): ProbabilitySpec {
  return serializeScalarSpec(spec);
}

export function evaluateRewardSpec(spec: RewardSpec): number {
  return evaluateScalarSpec(spec);
}

export function serializeRewardSpec(spec: RewardSpec): RewardSpec {
  return serializeScalarSpec(spec);
}

export function getTerminalConditionKind(condition: TerminalCondition): TerminalConditionKind {
  return condition.type;
}

export function serializeTerminalCondition(condition: TerminalCondition): TerminalCondition {
  return { ...condition };
}

export function evaluateTerminalCondition(
  condition: TerminalCondition,
  properties: StateProperties | undefined
): boolean {
  if (condition.type === 'explicit') {
    return condition.value;
  }

  return properties?.[condition.property] === condition.value;
}

export function getTransitionEffectKind(effect: TransitionEffect): TransitionEffectKind {
  return effect.type;
}

export function serializeTransitionEffect(effect: TransitionEffect): TransitionEffect {
  return { ...effect };
}

export function applyTransitionEffect(
  properties: StateProperties | undefined,
  effect: TransitionEffect
): StateProperties {
  const nextProperties: StateProperties = { ...(properties ?? {}) };
  nextProperties[effect.property] = effect.value;
  return nextProperties;
}

export function applyTransitionEffects(
  properties: StateProperties | undefined,
  effects: TransitionEffect[] | undefined
): StateProperties {
  let nextProperties: StateProperties = { ...(properties ?? {}) };

  for (const effect of effects ?? []) {
    nextProperties = applyTransitionEffect(nextProperties, effect);
  }

  return nextProperties;
}

function selectExplicitSolverTransitionTarget(transition: EvaluatedTransition): StateId {
  return transition.to;
}

export function isTerminalState(state: StateDefinition): boolean {
  if (typeof state.terminal === 'boolean') {
    return state.terminal;
  }

  const condition = state.terminalCondition;
  if (!condition) {
    return false;
  }

  return evaluateTerminalCondition(condition, state.properties);
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

function evaluateTransition(transition: TransitionDefinition): EvaluatedTransition {
  const evaluated: EvaluatedTransition = {
    from: transition.from,
    to: transition.to,
    probability: evaluateProbabilitySpec(transition.probability)
  };

  if (transition.reward !== undefined) {
    evaluated.reward = evaluateRewardSpec(transition.reward);
  }

  if (transition.effects !== undefined) {
    evaluated.effects = transition.effects;
  }

  return evaluated;
}

export function evaluateModel(model: ExpandedModel): EvaluatedModel {
  const transitions = model.transitions.map(evaluateTransition);

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

export function auditTransitionProbabilityTotals(
  model: ExpandedModel,
  tolerance = 1e-9
): TransitionProbabilityAuditResult {
  const rows = model.states.map((state): TransitionProbabilityAuditRow => {
    const transitions = model.transitionsByState.get(state.id) ?? [];
    const probabilityTotal = transitions.reduce(
      (sum, transition) => sum + evaluateProbabilitySpec(transition.probability),
      0
    );
    const terminal = isTerminalState(state);
    const deviationFromOne = probabilityTotal - 1;
    const valid = terminal || Math.abs(deviationFromOne) <= tolerance;

    return {
      stateId: state.id,
      transitionCount: transitions.length,
      probabilityTotal,
      deviationFromOne,
      terminal,
      valid
    };
  });
  const invalidRows = rows.filter((row) => !row.valid);

  return {
    rows,
    invalidRows,
    valid: invalidRows.length === 0
  };
}

export function serializeTransitionProbabilityAuditResult(
  result: TransitionProbabilityAuditResult
): TransitionProbabilityAuditResult {
  return {
    rows: result.rows.map((row) => ({ ...row })),
    invalidRows: result.invalidRows.map((row) => ({ ...row })),
    valid: result.valid
  };
}

export function transitionProbabilityAuditResultToJson(
  result: TransitionProbabilityAuditResult
): string {
  return JSON.stringify(serializeTransitionProbabilityAuditResult(result));
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
        const target = selectExplicitSolverTransitionTarget(transition);
        const downstream = expectedRewardByState.get(target) ?? 0;
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

export function serializeOutputResult(output: OutputResult): OutputResult {
  return {
    startState: output.startState,
    expectedReward: output.expectedReward,
    expectedRewardByState: { ...output.expectedRewardByState }
  };
}

export function outputResultToJson(output: OutputResult): string {
  return JSON.stringify(serializeOutputResult(output));
}

export function toContributionResult(model: EvaluatedModel, solved: SolvedModel): ContributionResult {
  const transitionContributionsByState: ContributionResult['transitionContributionsByState'] = {};

  for (const state of model.states) {
    const transitions = model.transitionsByState.get(state.id) ?? [];
    transitionContributionsByState[state.id] = transitions.map((transition) => {
      const reward = transition.reward ?? 0;
      const target = selectExplicitSolverTransitionTarget(transition);
      const downstreamExpectedReward = solved.expectedRewardByState.get(target) ?? 0;
      return {
        to: target,
        probability: transition.probability,
        reward,
        downstreamExpectedReward,
        contribution: transition.probability * (reward + downstreamExpectedReward)
      };
    });
  }

  return { transitionContributionsByState };
}

export function serializeContributionResult(contributions: ContributionResult): ContributionResult {
  const transitionContributionsByState: ContributionResult['transitionContributionsByState'] = {};

  for (const [stateId, rows] of Object.entries(contributions.transitionContributionsByState)) {
    transitionContributionsByState[stateId] = rows.map((row) => ({ ...row }));
  }

  return { transitionContributionsByState };
}

export function contributionResultToJson(contributions: ContributionResult): string {
  return JSON.stringify(serializeContributionResult(contributions));
}
