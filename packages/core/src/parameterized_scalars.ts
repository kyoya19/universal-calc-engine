import {
  DefinitionModel,
  ScalarSpec,
  StateDefinition,
  TimeUnit,
  TransitionDefinition,
  TransitionEffect,
  evaluateScalarSpec
} from './model';
import {
  RewardAxesDefinitionModel,
  RewardAxesTransitionDefinition,
  RewardAxisDefinition,
  RewardAxisId
} from './reward_axes';

export type ParameterId = string;
export type ParameterValues = Record<ParameterId, number>;

export type ParameterRefScalarSpec = {
  type: 'parameter_ref';
  parameter: ParameterId;
};

export type ScalarFormulaOperator = 'add' | 'subtract' | 'multiply' | 'divide';

export type ScalarFormulaSpec = {
  type: 'formula';
  operator: ScalarFormulaOperator;
  left: ParameterizedScalarSpec;
  right: ParameterizedScalarSpec;
};

export type ParameterizedScalarSpec = ScalarSpec | ParameterRefScalarSpec | ScalarFormulaSpec;

export type ParameterDefinition = {
  id: ParameterId;
  label?: string;
  unit?: string;
  defaultValue?: ParameterizedScalarSpec;
};

export type ParameterizedTimeSpec = {
  value: ParameterizedScalarSpec;
  unit: TimeUnit;
};

export type ParameterizedTransitionDefinition = Omit<
  TransitionDefinition,
  'probability' | 'reward' | 'elapsedTime'
> & {
  probability: ParameterizedScalarSpec;
  reward?: ParameterizedScalarSpec;
  elapsedTime?: ParameterizedTimeSpec;
};

export type ParameterizedDefinitionModel = Omit<DefinitionModel, 'transitions'> & {
  parameters: ParameterDefinition[];
  transitions: ParameterizedTransitionDefinition[];
};

export type ParameterizedRewardAxisValues = Record<RewardAxisId, ParameterizedScalarSpec>;

export type ParameterizedRewardAxesTransitionDefinition = Omit<
  RewardAxesTransitionDefinition,
  'probability' | 'reward' | 'elapsedTime' | 'rewardsByAxis'
> & {
  probability: ParameterizedScalarSpec;
  reward?: ParameterizedScalarSpec;
  elapsedTime?: ParameterizedTimeSpec;
  rewardsByAxis?: ParameterizedRewardAxisValues;
};

export type ParameterizedRewardAxesDefinitionModel = Omit<
  RewardAxesDefinitionModel,
  'transitions'
> & {
  parameters: ParameterDefinition[];
  transitions: ParameterizedRewardAxesTransitionDefinition[];
};

type ParameterResolutionContext = {
  parameterById: Map<ParameterId, ParameterDefinition>;
  suppliedValues: ParameterValues;
  resolvedValues: Map<ParameterId, number>;
  resolving: Set<ParameterId>;
};

function hasOwn(record: ParameterValues, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function ensureFinite(value: number, description: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${description} must resolve to a finite number`);
  }
  return value;
}

function buildResolutionContext(
  parameters: ParameterDefinition[],
  suppliedValues: ParameterValues
): ParameterResolutionContext {
  const parameterById = new Map<ParameterId, ParameterDefinition>();

  for (const parameter of parameters) {
    if (parameter.id.length === 0) {
      throw new Error('Parameter id must not be empty');
    }
    if (parameterById.has(parameter.id)) {
      throw new Error(`Duplicate parameter id: ${parameter.id}`);
    }
    parameterById.set(parameter.id, parameter);
  }

  for (const parameterId of Object.keys(suppliedValues)) {
    if (!parameterById.has(parameterId)) {
      throw new Error(`Unknown supplied parameter: ${parameterId}`);
    }
    ensureFinite(suppliedValues[parameterId] as number, `Parameter ${parameterId}`);
  }

  return {
    parameterById,
    suppliedValues,
    resolvedValues: new Map<ParameterId, number>(),
    resolving: new Set<ParameterId>()
  };
}

function resolveFormula(
  spec: ScalarFormulaSpec,
  context: ParameterResolutionContext
): number {
  const left = resolveScalarInternal(spec.left, context);
  const right = resolveScalarInternal(spec.right, context);
  let result: number;

  switch (spec.operator) {
    case 'add':
      result = left + right;
      break;
    case 'subtract':
      result = left - right;
      break;
    case 'multiply':
      result = left * right;
      break;
    case 'divide':
      result = left / right;
      break;
  }

  return ensureFinite(result, `Formula ${spec.operator}`);
}

function resolveParameter(
  parameterId: ParameterId,
  context: ParameterResolutionContext
): number {
  const cached = context.resolvedValues.get(parameterId);
  if (cached !== undefined) {
    return cached;
  }

  const definition = context.parameterById.get(parameterId);
  if (!definition) {
    throw new Error(`Unknown parameter reference: ${parameterId}`);
  }

  if (context.resolving.has(parameterId)) {
    throw new Error(`Circular parameter reference: ${parameterId}`);
  }

  context.resolving.add(parameterId);
  try {
    let value: number;
    if (hasOwn(context.suppliedValues, parameterId)) {
      value = ensureFinite(
        context.suppliedValues[parameterId] as number,
        `Parameter ${parameterId}`
      );
    } else if (definition.defaultValue !== undefined) {
      value = resolveScalarInternal(definition.defaultValue, context);
    } else {
      throw new Error(`Missing parameter value: ${parameterId}`);
    }

    context.resolvedValues.set(parameterId, value);
    return value;
  } finally {
    context.resolving.delete(parameterId);
  }
}

function resolveScalarInternal(
  spec: ParameterizedScalarSpec,
  context: ParameterResolutionContext
): number {
  if (typeof spec === 'number') {
    return ensureFinite(spec, 'Scalar');
  }

  if (spec.type === 'constant') {
    return ensureFinite(evaluateScalarSpec(spec), 'Scalar constant');
  }

  if (spec.type === 'parameter_ref') {
    return resolveParameter(spec.parameter, context);
  }

  return resolveFormula(spec, context);
}

export function resolveParameterizedScalarSpec(
  spec: ParameterizedScalarSpec,
  parameters: ParameterDefinition[],
  suppliedValues: ParameterValues = {}
): number {
  const context = buildResolutionContext(parameters, suppliedValues);
  return resolveScalarInternal(spec, context);
}

export function resolveParameterValues(
  parameters: ParameterDefinition[],
  suppliedValues: ParameterValues = {}
): ParameterValues {
  const context = buildResolutionContext(parameters, suppliedValues);
  const resolved: ParameterValues = {};

  for (const parameter of parameters) {
    resolved[parameter.id] = resolveParameter(parameter.id, context);
  }

  return resolved;
}

function resolveTransition(
  transition: ParameterizedTransitionDefinition,
  context: ParameterResolutionContext
): TransitionDefinition {
  const resolved: TransitionDefinition = {
    from: transition.from,
    to: transition.to,
    probability: resolveScalarInternal(transition.probability, context)
  };

  if (transition.reward !== undefined) {
    resolved.reward = resolveScalarInternal(transition.reward, context);
  }
  if (transition.elapsedTime !== undefined) {
    resolved.elapsedTime = {
      value: resolveScalarInternal(transition.elapsedTime.value, context),
      unit: transition.elapsedTime.unit
    };
  }
  if (transition.effects !== undefined) {
    resolved.effects = transition.effects.map((effect: TransitionEffect) => ({ ...effect }));
  }

  return resolved;
}

export function resolveParameterizedDefinitionModel(
  model: ParameterizedDefinitionModel,
  suppliedValues: ParameterValues = {}
): DefinitionModel {
  const context = buildResolutionContext(model.parameters, suppliedValues);

  return {
    startState: model.startState,
    states: model.states.map((state: StateDefinition) => ({
      ...state,
      ...(state.properties !== undefined ? { properties: { ...state.properties } } : {})
    })),
    transitions: model.transitions.map((transition) => resolveTransition(transition, context))
  };
}

function resolveRewardAxesTransition(
  transition: ParameterizedRewardAxesTransitionDefinition,
  context: ParameterResolutionContext
): RewardAxesTransitionDefinition {
  const base = resolveTransition(transition, context);
  const resolved: RewardAxesTransitionDefinition = { ...base };

  if (transition.rewardsByAxis !== undefined) {
    const rewardsByAxis: Record<RewardAxisId, number> = {};
    for (const [axisId, spec] of Object.entries(transition.rewardsByAxis)) {
      rewardsByAxis[axisId] = resolveScalarInternal(spec, context);
    }
    resolved.rewardsByAxis = rewardsByAxis;
  }

  return resolved;
}

export function resolveParameterizedRewardAxesDefinitionModel(
  model: ParameterizedRewardAxesDefinitionModel,
  suppliedValues: ParameterValues = {}
): RewardAxesDefinitionModel {
  const context = buildResolutionContext(model.parameters, suppliedValues);

  return {
    startState: model.startState,
    states: model.states.map((state: StateDefinition) => ({
      ...state,
      ...(state.properties !== undefined ? { properties: { ...state.properties } } : {})
    })),
    rewardAxes: model.rewardAxes.map((axis: RewardAxisDefinition) => ({ ...axis })),
    transitions: model.transitions.map((transition) =>
      resolveRewardAxesTransition(transition, context)
    )
  };
}
