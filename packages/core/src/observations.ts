import { DefinitionModel, StateId } from './model';

export type ObservationId = string;

export type StateCountObservation = {
  id: ObservationId;
  type: 'state_count';
  state: StateId;
  count: number;
};

export type TransitionCountObservation = {
  id: ObservationId;
  type: 'transition_count';
  from: StateId;
  to: StateId;
  count: number;
};

export type ScalarMetricObservation = {
  id: ObservationId;
  type: 'scalar';
  metric: string;
  value: number;
  unit?: string;
};

export type ObservationRecord =
  | StateCountObservation
  | TransitionCountObservation
  | ScalarMetricObservation;

export type ObservationDataset = {
  schemaVersion: 1;
  observations: ObservationRecord[];
};

export type ObservationInputStage = 'json_syntax' | 'shape';

export type ObservationInputIssue = {
  stage: ObservationInputStage;
  code: string;
  path: string;
  message: string;
};

export type ObservationParseResult =
  | { ok: true; dataset: ObservationDataset }
  | {
      ok: false;
      stage: ObservationInputStage;
      issues: ObservationInputIssue[];
    };

export type ObservationValidationIssueCode =
  | 'empty_observation_id'
  | 'duplicate_observation_id'
  | 'unknown_observation_state'
  | 'unknown_observation_transition'
  | 'invalid_observation_count'
  | 'empty_scalar_metric'
  | 'invalid_scalar_value'
  | 'empty_scalar_unit';

export type ObservationValidationIssue = {
  code: ObservationValidationIssueCode;
  path: string;
  message: string;
};

export type ObservationValidationResult = {
  valid: boolean;
  issues: ObservationValidationIssue[];
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addShapeIssue(
  issues: ObservationInputIssue[],
  code: string,
  path: string,
  message: string
): void {
  issues.push({ stage: 'shape', code, path, message });
}

function readString(
  value: unknown,
  path: string,
  issues: ObservationInputIssue[]
): string | undefined {
  if (typeof value !== 'string') {
    addShapeIssue(issues, 'expected_string', path, 'Expected a string');
    return undefined;
  }
  return value;
}

function readFiniteNumber(
  value: unknown,
  path: string,
  issues: ObservationInputIssue[]
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addShapeIssue(issues, 'expected_finite_number', path, 'Expected a finite number');
    return undefined;
  }
  return value;
}

function parseObservationRecord(
  value: unknown,
  path: string,
  issues: ObservationInputIssue[]
): ObservationRecord | undefined {
  if (!isRecord(value)) {
    addShapeIssue(issues, 'expected_object', path, 'Expected an observation object');
    return undefined;
  }

  const id = readString(value.id, `${path}.id`, issues);
  const type = readString(value.type, `${path}.type`, issues);
  if (id === undefined || type === undefined) {
    return undefined;
  }

  if (type === 'state_count') {
    const state = readString(value.state, `${path}.state`, issues);
    const count = readFiniteNumber(value.count, `${path}.count`, issues);
    if (state === undefined || count === undefined) {
      return undefined;
    }
    return { id, type, state, count };
  }

  if (type === 'transition_count') {
    const from = readString(value.from, `${path}.from`, issues);
    const to = readString(value.to, `${path}.to`, issues);
    const count = readFiniteNumber(value.count, `${path}.count`, issues);
    if (from === undefined || to === undefined || count === undefined) {
      return undefined;
    }
    return { id, type, from, to, count };
  }

  if (type === 'scalar') {
    const metric = readString(value.metric, `${path}.metric`, issues);
    const scalarValue = readFiniteNumber(value.value, `${path}.value`, issues);
    if (metric === undefined || scalarValue === undefined) {
      return undefined;
    }
    const observation: ScalarMetricObservation = {
      id,
      type,
      metric,
      value: scalarValue
    };
    if (value.unit !== undefined) {
      const unit = readString(value.unit, `${path}.unit`, issues);
      if (unit !== undefined) {
        observation.unit = unit;
      }
    }
    return observation;
  }

  addShapeIssue(
    issues,
    'invalid_observation_type',
    `${path}.type`,
    `Unsupported observation type: ${type}`
  );
  return undefined;
}

export function parseObservationDataset(input: unknown): ObservationParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      stage: 'shape',
      issues: [
        {
          stage: 'shape',
          code: 'expected_object',
          path: '$',
          message: 'Expected an observation dataset object'
        }
      ]
    };
  }

  const issues: ObservationInputIssue[] = [];
  if (input.schemaVersion !== 1) {
    addShapeIssue(
      issues,
      'unsupported_schema_version',
      '$.schemaVersion',
      'schemaVersion must be 1'
    );
  }

  const observations: ObservationRecord[] = [];
  if (!Array.isArray(input.observations)) {
    addShapeIssue(issues, 'expected_array', '$.observations', 'Expected an array');
  } else {
    input.observations.forEach((value, index) => {
      const observation = parseObservationRecord(
        value,
        `$.observations[${index}]`,
        issues
      );
      if (observation !== undefined) {
        observations.push(observation);
      }
    });
  }

  if (issues.length > 0 || !Array.isArray(input.observations)) {
    return { ok: false, stage: 'shape', issues };
  }
  return { ok: true, dataset: { schemaVersion: 1, observations } };
}

export function parseObservationDatasetJson(json: string): ObservationParseResult {
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
  return parseObservationDataset(value);
}

function transitionKey(from: StateId, to: StateId): string {
  return JSON.stringify([from, to]);
}

export function validateObservationDataset(
  dataset: ObservationDataset,
  model: DefinitionModel
): ObservationValidationResult {
  const issues: ObservationValidationIssue[] = [];
  const stateIds = new Set(model.states.map((state) => state.id));
  const transitionKeys = new Set(
    model.transitions.map((transition) => transitionKey(transition.from, transition.to))
  );
  const observationIds = new Set<ObservationId>();

  dataset.observations.forEach((observation, index) => {
    const path = `observations[${index}]`;

    if (observation.id.trim().length === 0) {
      issues.push({
        code: 'empty_observation_id',
        path: `${path}.id`,
        message: 'Observation id must not be empty'
      });
    }
    if (observationIds.has(observation.id)) {
      issues.push({
        code: 'duplicate_observation_id',
        path: `${path}.id`,
        message: `Duplicate observation id: ${observation.id}`
      });
    } else {
      observationIds.add(observation.id);
    }

    if (observation.type === 'state_count') {
      if (!stateIds.has(observation.state)) {
        issues.push({
          code: 'unknown_observation_state',
          path: `${path}.state`,
          message: `Unknown observed state: ${observation.state}`
        });
      }
      if (
        !Number.isFinite(observation.count) ||
        !Number.isInteger(observation.count) ||
        observation.count < 0
      ) {
        issues.push({
          code: 'invalid_observation_count',
          path: `${path}.count`,
          message: `Observation count must be a non-negative integer: ${observation.count}`
        });
      }
      return;
    }

    if (observation.type === 'transition_count') {
      if (!transitionKeys.has(transitionKey(observation.from, observation.to))) {
        issues.push({
          code: 'unknown_observation_transition',
          path,
          message: `Unknown observed transition: ${observation.from} -> ${observation.to}`
        });
      }
      if (
        !Number.isFinite(observation.count) ||
        !Number.isInteger(observation.count) ||
        observation.count < 0
      ) {
        issues.push({
          code: 'invalid_observation_count',
          path: `${path}.count`,
          message: `Observation count must be a non-negative integer: ${observation.count}`
        });
      }
      return;
    }

    if (observation.metric.trim().length === 0) {
      issues.push({
        code: 'empty_scalar_metric',
        path: `${path}.metric`,
        message: 'Scalar observation metric must not be empty'
      });
    }
    if (!Number.isFinite(observation.value)) {
      issues.push({
        code: 'invalid_scalar_value',
        path: `${path}.value`,
        message: `Scalar observation value must be finite: ${observation.value}`
      });
    }
    if (observation.unit !== undefined && observation.unit.trim().length === 0) {
      issues.push({
        code: 'empty_scalar_unit',
        path: `${path}.unit`,
        message: 'Scalar observation unit must not be empty when provided'
      });
    }
  });

  return { valid: issues.length === 0, issues };
}

export function serializeObservationDataset(dataset: ObservationDataset): ObservationDataset {
  return {
    schemaVersion: 1,
    observations: dataset.observations.map((observation) => ({ ...observation }))
  };
}

export function observationDatasetToJson(dataset: ObservationDataset): string {
  return JSON.stringify(serializeObservationDataset(dataset));
}
