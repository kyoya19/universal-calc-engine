import { DefinitionModel, PropertyValue, StateDefinition, TerminalCondition, TimeUnit, TransitionEffect } from './model';
import {
  ParameterDefinition,
  ParameterValues,
  ParameterizedDefinitionModel,
  ParameterizedRewardAxesDefinitionModel,
  ParameterizedRewardAxesTransitionDefinition,
  ParameterizedScalarSpec,
  ParameterizedTimeSpec,
  ParameterizedTransitionDefinition,
  resolveParameterizedDefinitionModel,
  resolveParameterizedRewardAxesDefinitionModel
} from './parameterized_scalars';
import { RewardAxesDefinitionModel, RewardAxisDefinition, RewardAxisKind } from './reward_axes';
import {
  ModelValidationResult,
  validateDefinitionModel,
  validateRewardAxesDefinitionModel
} from './validation';

export type ExternalModelKind = 'base' | 'reward_axes';
export type ExternalInputStage =
  | 'json_syntax'
  | 'shape'
  | 'parameter_resolution'
  | 'model_validation';

export type ExternalInputIssue = {
  stage: ExternalInputStage;
  code: string;
  path: string;
  message: string;
};

export type ExternalBaseModelDocument = {
  schemaVersion: 1;
  modelKind: 'base';
  model: ParameterizedDefinitionModel;
  parameterValues?: ParameterValues;
};

export type ExternalRewardAxesModelDocument = {
  schemaVersion: 1;
  modelKind: 'reward_axes';
  model: ParameterizedRewardAxesDefinitionModel;
  parameterValues?: ParameterValues;
};

export type ExternalModelDocument = ExternalBaseModelDocument | ExternalRewardAxesModelDocument;

export type ExternalModelParseResult =
  | { ok: true; document: ExternalModelDocument }
  | {
      ok: false;
      stage: 'json_syntax' | 'shape';
      issues: ExternalInputIssue[];
    };

export type PreparedExternalBaseModel = {
  ok: true;
  modelKind: 'base';
  document: ExternalBaseModelDocument;
  resolvedModel: DefinitionModel;
  validation: ModelValidationResult;
};

export type PreparedExternalRewardAxesModel = {
  ok: true;
  modelKind: 'reward_axes';
  document: ExternalRewardAxesModelDocument;
  resolvedModel: RewardAxesDefinitionModel;
  validation: ModelValidationResult;
};

export type PreparedExternalModel = PreparedExternalBaseModel | PreparedExternalRewardAxesModel;

export type ExternalModelPreparationResult =
  | PreparedExternalModel
  | {
      ok: false;
      stage: ExternalInputStage;
      issues: ExternalInputIssue[];
      validation?: ModelValidationResult;
    };

type ShapeIssueSink = ExternalInputIssue[];

type UnknownRecord = Record<string, unknown>;

const TIME_UNITS = new Set<TimeUnit>(['milliseconds', 'seconds', 'minutes', 'hours']);
const REWARD_AXIS_KINDS = new Set<RewardAxisKind>(['benefit', 'cost', 'neutral']);
const FORMULA_OPERATORS = new Set(['add', 'subtract', 'multiply', 'divide']);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addShapeIssue(
  issues: ShapeIssueSink,
  code: string,
  path: string,
  message: string
): void {
  issues.push({ stage: 'shape', code, path, message });
}

function readString(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): string | undefined {
  if (typeof value !== 'string') {
    addShapeIssue(issues, 'expected_string', path, 'Expected a string');
    return undefined;
  }
  return value;
}

function readOptionalString(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readString(value, path, issues);
}

function readFiniteNumber(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addShapeIssue(issues, 'expected_finite_number', path, 'Expected a finite number');
    return undefined;
  }
  return value;
}

function readPropertyValue(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): PropertyValue | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  addShapeIssue(
    issues,
    'expected_property_value',
    path,
    'Expected a finite number, string, or boolean'
  );
  return undefined;
}

function parseScalar(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedScalarSpec | undefined {
  if (typeof value === 'number') {
    return readFiniteNumber(value, path, issues);
  }

  if (!isRecord(value)) {
    addShapeIssue(
      issues,
      'expected_scalar',
      path,
      'Expected a number or scalar object'
    );
    return undefined;
  }

  const type = readString(value.type, `${path}.type`, issues);
  if (type === undefined) {
    return undefined;
  }

  if (type === 'constant') {
    const constantValue = readFiniteNumber(value.value, `${path}.value`, issues);
    return constantValue === undefined ? undefined : { type: 'constant', value: constantValue };
  }

  if (type === 'parameter_ref') {
    const parameter = readString(value.parameter, `${path}.parameter`, issues);
    return parameter === undefined ? undefined : { type: 'parameter_ref', parameter };
  }

  if (type === 'formula') {
    const operator = readString(value.operator, `${path}.operator`, issues);
    if (operator === undefined || !FORMULA_OPERATORS.has(operator)) {
      if (operator !== undefined) {
        addShapeIssue(
          issues,
          'invalid_formula_operator',
          `${path}.operator`,
          `Unsupported formula operator: ${operator}`
        );
      }
      return undefined;
    }
    const left = parseScalar(value.left, `${path}.left`, issues);
    const right = parseScalar(value.right, `${path}.right`, issues);
    if (left === undefined || right === undefined) {
      return undefined;
    }
    return {
      type: 'formula',
      operator: operator as 'add' | 'subtract' | 'multiply' | 'divide',
      left,
      right
    };
  }

  addShapeIssue(issues, 'invalid_scalar_type', `${path}.type`, `Unsupported scalar type: ${type}`);
  return undefined;
}

function parseTerminalCondition(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): TerminalCondition | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a terminal-condition object');
    return undefined;
  }
  const type = readString(value.type, `${path}.type`, issues);
  if (type === 'explicit') {
    if (typeof value.value !== 'boolean') {
      addShapeIssue(issues, 'expected_boolean', `${path}.value`, 'Expected a boolean');
      return undefined;
    }
    return { type: 'explicit', value: value.value };
  }
  if (type === 'property_equals') {
    const property = readString(value.property, `${path}.property`, issues);
    const propertyValue = readPropertyValue(value.value, `${path}.value`, issues);
    if (property === undefined || propertyValue === undefined) {
      return undefined;
    }
    return { type: 'property_equals', property, value: propertyValue };
  }
  if (type !== undefined) {
    addShapeIssue(
      issues,
      'invalid_terminal_condition_type',
      `${path}.type`,
      `Unsupported terminal condition type: ${type}`
    );
  }
  return undefined;
}

function parseState(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): StateDefinition | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a state object');
    return undefined;
  }

  const id = readString(value.id, `${path}.id`, issues);
  if (id === undefined) {
    return undefined;
  }

  const state: StateDefinition = { id };
  if (value.terminal !== undefined) {
    if (typeof value.terminal !== 'boolean') {
      addShapeIssue(issues, 'expected_boolean', `${path}.terminal`, 'Expected a boolean');
    } else {
      state.terminal = value.terminal;
    }
  }

  if (value.terminalCondition !== undefined) {
    const terminalCondition = parseTerminalCondition(
      value.terminalCondition,
      `${path}.terminalCondition`,
      issues
    );
    if (terminalCondition !== undefined) {
      state.terminalCondition = terminalCondition;
    }
  }

  if (value.properties !== undefined) {
    if (!isRecord(value.properties)) {
      addShapeIssue(issues, 'expected_object', `${path}.properties`, 'Expected an object');
    } else {
      const properties: Record<string, PropertyValue> = {};
      for (const [key, propertyValue] of Object.entries(value.properties)) {
        const parsed = readPropertyValue(propertyValue, `${path}.properties.${key}`, issues);
        if (parsed !== undefined) {
          properties[key] = parsed;
        }
      }
      state.properties = properties;
    }
  }

  return state;
}

function parseEffect(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): TransitionEffect | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a transition-effect object');
    return undefined;
  }
  const type = readString(value.type, `${path}.type`, issues);
  if (type !== 'set_property') {
    if (type !== undefined) {
      addShapeIssue(
        issues,
        'invalid_transition_effect_type',
        `${path}.type`,
        `Unsupported transition effect type: ${type}`
      );
    }
    return undefined;
  }
  const property = readString(value.property, `${path}.property`, issues);
  const propertyValue = readPropertyValue(value.value, `${path}.value`, issues);
  if (property === undefined || propertyValue === undefined) {
    return undefined;
  }
  return { type: 'set_property', property, value: propertyValue };
}

function parseTimeSpec(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedTimeSpec | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected an elapsed-time object');
    return undefined;
  }
  const scalar = parseScalar(value.value, `${path}.value`, issues);
  const unit = readString(value.unit, `${path}.unit`, issues);
  if (unit !== undefined && !TIME_UNITS.has(unit as TimeUnit)) {
    addShapeIssue(issues, 'invalid_time_unit', `${path}.unit`, `Unsupported time unit: ${unit}`);
    return undefined;
  }
  if (scalar === undefined || unit === undefined) {
    return undefined;
  }
  return { value: scalar, unit: unit as TimeUnit };
}

function parseTransition(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedTransitionDefinition | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a transition object');
    return undefined;
  }

  const from = readString(value.from, `${path}.from`, issues);
  const to = readString(value.to, `${path}.to`, issues);
  const probability = parseScalar(value.probability, `${path}.probability`, issues);
  if (from === undefined || to === undefined || probability === undefined) {
    return undefined;
  }

  const transition: ParameterizedTransitionDefinition = { from, to, probability };

  if (value.reward !== undefined) {
    const reward = parseScalar(value.reward, `${path}.reward`, issues);
    if (reward !== undefined) {
      transition.reward = reward;
    }
  }

  if (value.elapsedTime !== undefined) {
    const elapsedTime = parseTimeSpec(value.elapsedTime, `${path}.elapsedTime`, issues);
    if (elapsedTime !== undefined) {
      transition.elapsedTime = elapsedTime;
    }
  }

  if (value.effects !== undefined) {
    if (!Array.isArray(value.effects)) {
      addShapeIssue(issues, 'expected_array', `${path}.effects`, 'Expected an array');
    } else {
      const effects: TransitionEffect[] = [];
      value.effects.forEach((effectValue, index) => {
        const effect = parseEffect(effectValue, `${path}.effects[${index}]`, issues);
        if (effect !== undefined) {
          effects.push(effect);
        }
      });
      transition.effects = effects;
    }
  }

  return transition;
}

function parseParameterDefinition(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterDefinition | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a parameter-definition object');
    return undefined;
  }
  const id = readString(value.id, `${path}.id`, issues);
  if (id === undefined) {
    return undefined;
  }
  const parameter: ParameterDefinition = { id };
  const label = readOptionalString(value.label, `${path}.label`, issues);
  const unit = readOptionalString(value.unit, `${path}.unit`, issues);
  if (label !== undefined) {
    parameter.label = label;
  }
  if (unit !== undefined) {
    parameter.unit = unit;
  }
  if (value.defaultValue !== undefined) {
    const defaultValue = parseScalar(value.defaultValue, `${path}.defaultValue`, issues);
    if (defaultValue !== undefined) {
      parameter.defaultValue = defaultValue;
    }
  }
  return parameter;
}

function parseCommonModelFields(
  value: UnknownRecord,
  path: string,
  issues: ShapeIssueSink
): {
  startState?: string;
  states?: StateDefinition[];
  parameters?: ParameterDefinition[];
} {
  const startState = readString(value.startState, `${path}.startState`, issues);

  let states: StateDefinition[] | undefined;
  if (!Array.isArray(value.states)) {
    addShapeIssue(issues, 'expected_array', `${path}.states`, 'Expected an array');
  } else {
    states = [];
    value.states.forEach((stateValue, index) => {
      const state = parseState(stateValue, `${path}.states[${index}]`, issues);
      if (state !== undefined) {
        states?.push(state);
      }
    });
  }

  let parameters: ParameterDefinition[] | undefined;
  if (!Array.isArray(value.parameters)) {
    addShapeIssue(issues, 'expected_array', `${path}.parameters`, 'Expected an array');
  } else {
    parameters = [];
    value.parameters.forEach((parameterValue, index) => {
      const parameter = parseParameterDefinition(
        parameterValue,
        `${path}.parameters[${index}]`,
        issues
      );
      if (parameter !== undefined) {
        parameters?.push(parameter);
      }
    });
  }

  return { startState, states, parameters };
}

function parseBaseModel(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedDefinitionModel | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a model object');
    return undefined;
  }
  const common = parseCommonModelFields(value, path, issues);

  let transitions: ParameterizedTransitionDefinition[] | undefined;
  if (!Array.isArray(value.transitions)) {
    addShapeIssue(issues, 'expected_array', `${path}.transitions`, 'Expected an array');
  } else {
    transitions = [];
    value.transitions.forEach((transitionValue, index) => {
      const transition = parseTransition(
        transitionValue,
        `${path}.transitions[${index}]`,
        issues
      );
      if (transition !== undefined) {
        transitions?.push(transition);
      }
    });
  }

  if (
    common.startState === undefined ||
    common.states === undefined ||
    common.parameters === undefined ||
    transitions === undefined
  ) {
    return undefined;
  }

  return {
    startState: common.startState,
    states: common.states,
    parameters: common.parameters,
    transitions
  };
}

function parseRewardAxis(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): RewardAxisDefinition | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a reward-axis object');
    return undefined;
  }
  const id = readString(value.id, `${path}.id`, issues);
  const unit = readString(value.unit, `${path}.unit`, issues);
  const kind = readString(value.kind, `${path}.kind`, issues);
  if (kind !== undefined && !REWARD_AXIS_KINDS.has(kind as RewardAxisKind)) {
    addShapeIssue(issues, 'invalid_reward_axis_kind', `${path}.kind`, `Unsupported kind: ${kind}`);
    return undefined;
  }
  if (id === undefined || unit === undefined || kind === undefined) {
    return undefined;
  }
  const axis: RewardAxisDefinition = { id, unit, kind: kind as RewardAxisKind };
  const label = readOptionalString(value.label, `${path}.label`, issues);
  if (label !== undefined) {
    axis.label = label;
  }
  return axis;
}

function parseRewardAxesTransition(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedRewardAxesTransitionDefinition | undefined {
  const base = parseTransition(value, path, issues);
  if (base === undefined || !isRecord(value)) {
    return undefined;
  }

  const transition: ParameterizedRewardAxesTransitionDefinition = { ...base };
  if (value.rewardsByAxis !== undefined) {
    if (!isRecord(value.rewardsByAxis)) {
      addShapeIssue(
        issues,
        'expected_object',
        `${path}.rewardsByAxis`,
        'Expected an object of scalar values'
      );
    } else {
      const rewardsByAxis: Record<string, ParameterizedScalarSpec> = {};
      for (const [axisId, scalarValue] of Object.entries(value.rewardsByAxis)) {
        const scalar = parseScalar(scalarValue, `${path}.rewardsByAxis.${axisId}`, issues);
        if (scalar !== undefined) {
          rewardsByAxis[axisId] = scalar;
        }
      }
      transition.rewardsByAxis = rewardsByAxis;
    }
  }
  return transition;
}

function parseRewardAxesModel(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterizedRewardAxesDefinitionModel | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected a model object');
    return undefined;
  }
  const common = parseCommonModelFields(value, path, issues);

  let rewardAxes: RewardAxisDefinition[] | undefined;
  if (!Array.isArray(value.rewardAxes)) {
    addShapeIssue(issues, 'expected_array', `${path}.rewardAxes`, 'Expected an array');
  } else {
    rewardAxes = [];
    value.rewardAxes.forEach((axisValue, index) => {
      const axis = parseRewardAxis(axisValue, `${path}.rewardAxes[${index}]`, issues);
      if (axis !== undefined) {
        rewardAxes?.push(axis);
      }
    });
  }

  let transitions: ParameterizedRewardAxesTransitionDefinition[] | undefined;
  if (!Array.isArray(value.transitions)) {
    addShapeIssue(issues, 'expected_array', `${path}.transitions`, 'Expected an array');
  } else {
    transitions = [];
    value.transitions.forEach((transitionValue, index) => {
      const transition = parseRewardAxesTransition(
        transitionValue,
        `${path}.transitions[${index}]`,
        issues
      );
      if (transition !== undefined) {
        transitions?.push(transition);
      }
    });
  }

  if (
    common.startState === undefined ||
    common.states === undefined ||
    common.parameters === undefined ||
    rewardAxes === undefined ||
    transitions === undefined
  ) {
    return undefined;
  }

  return {
    startState: common.startState,
    states: common.states,
    parameters: common.parameters,
    rewardAxes,
    transitions
  };
}

function parseParameterValues(
  value: unknown,
  path: string,
  issues: ShapeIssueSink
): ParameterValues | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected an object of finite numbers');
    return undefined;
  }
  const values: ParameterValues = {};
  for (const [parameterId, parameterValue] of Object.entries(value)) {
    const parsed = readFiniteNumber(parameterValue, `${path}.${parameterId}`, issues);
    if (parsed !== undefined) {
      values[parameterId] = parsed;
    }
  }
  return values;
}

export function parseExternalModelDocument(input: unknown): ExternalModelParseResult {
  const issues: ExternalInputIssue[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      stage: 'shape',
      issues: [
        {
          stage: 'shape',
          code: 'expected_object',
          path: '$',
          message: 'Expected an external model document object'
        }
      ]
    };
  }

  if (input.schemaVersion !== 1) {
    addShapeIssue(
      issues,
      'unsupported_schema_version',
      '$.schemaVersion',
      'schemaVersion must be 1'
    );
  }

  const modelKind = readString(input.modelKind, '$.modelKind', issues);
  if (modelKind !== 'base' && modelKind !== 'reward_axes') {
    if (modelKind !== undefined) {
      addShapeIssue(
        issues,
        'invalid_model_kind',
        '$.modelKind',
        `Unsupported modelKind: ${modelKind}`
      );
    }
  }

  const parameterValues = parseParameterValues(input.parameterValues, '$.parameterValues', issues);
  let document: ExternalModelDocument | undefined;

  if (modelKind === 'base') {
    const model = parseBaseModel(input.model, '$.model', issues);
    if (model !== undefined) {
      document = {
        schemaVersion: 1,
        modelKind: 'base',
        model,
        ...(parameterValues !== undefined ? { parameterValues } : {})
      };
    }
  } else if (modelKind === 'reward_axes') {
    const model = parseRewardAxesModel(input.model, '$.model', issues);
    if (model !== undefined) {
      document = {
        schemaVersion: 1,
        modelKind: 'reward_axes',
        model,
        ...(parameterValues !== undefined ? { parameterValues } : {})
      };
    }
  }

  if (issues.length > 0 || document === undefined) {
    return { ok: false, stage: 'shape', issues };
  }
  return { ok: true, document };
}

export function parseExternalModelDocumentJson(json: string): ExternalModelParseResult {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch (error) {
    return {
      ok: false,
      stage: 'json_syntax',
      issues: [
        {
          stage: 'json_syntax',
          code: 'invalid_json',
          path: '$',
          message: error instanceof Error ? error.message : 'Invalid JSON'
        }
      ]
    };
  }
  return parseExternalModelDocument(value);
}

function resolutionFailure(error: unknown): ExternalModelPreparationResult {
  return {
    ok: false,
    stage: 'parameter_resolution',
    issues: [
      {
        stage: 'parameter_resolution',
        code: 'parameter_resolution_failed',
        path: '$.model',
        message: error instanceof Error ? error.message : 'Parameter resolution failed'
      }
    ]
  };
}

function validationFailure(validation: ModelValidationResult): ExternalModelPreparationResult {
  return {
    ok: false,
    stage: 'model_validation',
    validation,
    issues: validation.errors.map((issue) => ({
      stage: 'model_validation',
      code: issue.code,
      path: `$.model.${issue.path}`,
      message: issue.message
    }))
  };
}

export function prepareExternalModelDocument(
  document: ExternalModelDocument
): ExternalModelPreparationResult {
  if (document.modelKind === 'base') {
    let resolvedModel: DefinitionModel;
    try {
      resolvedModel = resolveParameterizedDefinitionModel(
        document.model,
        document.parameterValues ?? {}
      );
    } catch (error) {
      return resolutionFailure(error);
    }
    const validation = validateDefinitionModel(resolvedModel);
    if (!validation.valid) {
      return validationFailure(validation);
    }
    return { ok: true, modelKind: 'base', document, resolvedModel, validation };
  }

  let resolvedModel: RewardAxesDefinitionModel;
  try {
    resolvedModel = resolveParameterizedRewardAxesDefinitionModel(
      document.model,
      document.parameterValues ?? {}
    );
  } catch (error) {
    return resolutionFailure(error);
  }
  const validation = validateRewardAxesDefinitionModel(resolvedModel);
  if (!validation.valid) {
    return validationFailure(validation);
  }
  return { ok: true, modelKind: 'reward_axes', document, resolvedModel, validation };
}

export function prepareExternalModelInput(input: unknown): ExternalModelPreparationResult {
  const parsed = parseExternalModelDocument(input);
  if (!parsed.ok) {
    return parsed;
  }
  return prepareExternalModelDocument(parsed.document);
}

export function prepareExternalModelJson(json: string): ExternalModelPreparationResult {
  const parsed = parseExternalModelDocumentJson(json);
  if (!parsed.ok) {
    return parsed;
  }
  return prepareExternalModelDocument(parsed.document);
}

export function externalModelPreparationResultToJson(
  result: ExternalModelPreparationResult
): string {
  return JSON.stringify(result);
}
