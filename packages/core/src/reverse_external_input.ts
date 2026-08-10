import {
  DiscreteParameterEstimationFailure,
  DiscreteParameterEstimationRequest,
  DiscreteParameterEstimationSuccess,
  EstimationConstraint,
  EstimationFailureStage,
  estimateDiscreteParameterCandidates
} from './discrete_estimation';
import {
  ExternalModelDocument,
  ExternalModelParseResult,
  parseExternalModelDocument
} from './external_input';
import {
  ObservationDataset,
  ObservationParseResult,
  parseObservationDataset
} from './observations';

export type ExternalReverseEstimationKind = 'discrete_parameter_candidates';
export type ReverseExternalInputStage = 'json_syntax' | 'shape' | 'estimation';

export type ReverseExternalInputIssue = {
  stage: ReverseExternalInputStage;
  code: string;
  path: string;
  message: string;
};

export type ExternalDiscreteEstimationDocument = {
  schemaVersion: 1;
  estimationKind: 'discrete_parameter_candidates';
  modelDocument: ExternalModelDocument;
  observationDataset: ObservationDataset;
  request: DiscreteParameterEstimationRequest;
};

export type ExternalDiscreteEstimationParseResult =
  | {
      ok: true;
      document: ExternalDiscreteEstimationDocument;
    }
  | {
      ok: false;
      stage: 'json_syntax' | 'shape';
      issues: ReverseExternalInputIssue[];
    };

export type ExternalDiscreteEstimationResult =
  | {
      ok: true;
      document: ExternalDiscreteEstimationDocument;
      estimation: DiscreteParameterEstimationSuccess;
    }
  | {
      ok: false;
      stage: 'json_syntax' | 'shape';
      issues: ReverseExternalInputIssue[];
    }
  | {
      ok: false;
      stage: 'estimation';
      estimationStage: EstimationFailureStage;
      issues: ReverseExternalInputIssue[];
      estimation: DiscreteParameterEstimationFailure;
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shapeIssue(
  code: string,
  path: string,
  message: string
): ReverseExternalInputIssue {
  return { stage: 'shape', code, path, message };
}

function prefixNestedPath(prefix: string, path: string): string {
  if (path === '$') {
    return prefix;
  }
  if (path.startsWith('$.')) {
    return `${prefix}${path.slice(1)}`;
  }
  return `${prefix}.${path}`;
}

function mapModelParseIssues(
  result: Extract<ExternalModelParseResult, { ok: false }>
): ReverseExternalInputIssue[] {
  return result.issues.map((issue) => ({
    stage: 'shape',
    code: issue.code,
    path: prefixNestedPath('$.modelDocument', issue.path),
    message: issue.message
  }));
}

function mapObservationParseIssues(
  result: Extract<ObservationParseResult, { ok: false }>
): ReverseExternalInputIssue[] {
  return result.issues.map((issue) => ({
    stage: 'shape',
    code: issue.code,
    path: prefixNestedPath('$.observationDataset', issue.path),
    message: issue.message
  }));
}

function parseConstraint(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): EstimationConstraint | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected a constraint object'));
    return undefined;
  }

  const type = input.type;
  if (type !== 'minimum' && type !== 'maximum') {
    issues.push(
      shapeIssue(
        'invalid_constraint_type',
        `${path}.type`,
        'Constraint type must be minimum or maximum'
      )
    );
    return undefined;
  }

  if (typeof input.value !== 'number' || !Number.isFinite(input.value)) {
    issues.push(
      shapeIssue(
        'expected_finite_number',
        `${path}.value`,
        'Constraint value must be a finite number'
      )
    );
    return undefined;
  }

  if (input.inclusive !== undefined && typeof input.inclusive !== 'boolean') {
    issues.push(
      shapeIssue(
        'expected_boolean',
        `${path}.inclusive`,
        'Constraint inclusive must be a boolean when provided'
      )
    );
    return undefined;
  }

  return {
    type,
    value: input.value,
    ...(input.inclusive !== undefined ? { inclusive: input.inclusive } : {})
  };
}

function parseEstimationRequest(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): DiscreteParameterEstimationRequest | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected an estimation request object'));
    return undefined;
  }

  const parameterId = input.parameterId;
  if (typeof parameterId !== 'string') {
    issues.push(
      shapeIssue('expected_string', `${path}.parameterId`, 'parameterId must be a string')
    );
  }

  const candidates: number[] = [];
  if (!Array.isArray(input.candidates)) {
    issues.push(
      shapeIssue('expected_array', `${path}.candidates`, 'candidates must be an array')
    );
  } else {
    input.candidates.forEach((candidate, index) => {
      if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
        issues.push(
          shapeIssue(
            'expected_finite_number',
            `${path}.candidates[${index}]`,
            'Candidate values must be finite numbers'
          )
        );
      } else {
        candidates.push(candidate);
      }
    });
  }

  let constraints: EstimationConstraint[] | undefined;
  if (input.constraints !== undefined) {
    if (!Array.isArray(input.constraints)) {
      issues.push(
        shapeIssue('expected_array', `${path}.constraints`, 'constraints must be an array')
      );
    } else {
      constraints = [];
      input.constraints.forEach((constraint, index) => {
        const parsed = parseConstraint(
          constraint,
          `${path}.constraints[${index}]`,
          issues
        );
        if (parsed !== undefined) {
          constraints?.push(parsed);
        }
      });
    }
  }

  if (
    typeof parameterId !== 'string' ||
    !Array.isArray(input.candidates)
  ) {
    return undefined;
  }

  return {
    parameterId,
    candidates,
    ...(constraints !== undefined ? { constraints } : {})
  };
}

export function parseExternalDiscreteEstimationDocument(
  input: unknown
): ExternalDiscreteEstimationParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      stage: 'shape',
      issues: [shapeIssue('expected_object', '$', 'Expected a reverse estimation document object')]
    };
  }

  const issues: ReverseExternalInputIssue[] = [];
  if (input.schemaVersion !== 1) {
    issues.push(
      shapeIssue(
        'unsupported_schema_version',
        '$.schemaVersion',
        'schemaVersion must be 1'
      )
    );
  }
  if (input.estimationKind !== 'discrete_parameter_candidates') {
    issues.push(
      shapeIssue(
        'unsupported_estimation_kind',
        '$.estimationKind',
        'estimationKind must be discrete_parameter_candidates'
      )
    );
  }

  const modelResult = parseExternalModelDocument(input.modelDocument);
  if (!modelResult.ok) {
    issues.push(...mapModelParseIssues(modelResult));
  }

  const observationResult = parseObservationDataset(input.observationDataset);
  if (!observationResult.ok) {
    issues.push(...mapObservationParseIssues(observationResult));
  }

  const request = parseEstimationRequest(input.request, '$.request', issues);

  if (
    issues.length > 0 ||
    !modelResult.ok ||
    !observationResult.ok ||
    request === undefined ||
    input.schemaVersion !== 1 ||
    input.estimationKind !== 'discrete_parameter_candidates'
  ) {
    return { ok: false, stage: 'shape', issues };
  }

  return {
    ok: true,
    document: {
      schemaVersion: 1,
      estimationKind: 'discrete_parameter_candidates',
      modelDocument: modelResult.document,
      observationDataset: observationResult.dataset,
      request
    }
  };
}

export function parseExternalDiscreteEstimationJson(
  json: string
): ExternalDiscreteEstimationParseResult {
  let input: unknown;
  try {
    input = JSON.parse(json) as unknown;
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
  return parseExternalDiscreteEstimationDocument(input);
}

function mapEstimationIssuePath(path: string): string {
  if (path.startsWith('request.')) {
    return `$.${path}`;
  }
  if (path === 'observations') {
    return '$.observationDataset.observations';
  }
  if (path.startsWith('observations[')) {
    return `$.observationDataset.${path}`;
  }
  if (path === '$') {
    return '$';
  }
  if (path.startsWith('$.')) {
    return `$.modelDocument${path.slice(1)}`;
  }
  return path;
}

function runParsedExternalEstimation(
  document: ExternalDiscreteEstimationDocument
): ExternalDiscreteEstimationResult {
  const estimation = estimateDiscreteParameterCandidates(
    document.modelDocument,
    document.observationDataset,
    document.request
  );

  if (estimation.ok) {
    return {
      ok: true,
      document,
      estimation
    };
  }

  return {
    ok: false,
    stage: 'estimation',
    estimationStage: estimation.stage,
    estimation,
    issues: estimation.issues.map((issue) => ({
      stage: 'estimation',
      code: issue.code,
      path: mapEstimationIssuePath(issue.path),
      message: issue.message
    }))
  };
}

export function estimateExternalDiscreteParameterInput(
  input: unknown
): ExternalDiscreteEstimationResult {
  const parsed = parseExternalDiscreteEstimationDocument(input);
  return parsed.ok ? runParsedExternalEstimation(parsed.document) : parsed;
}

export function estimateExternalDiscreteParameterJson(
  json: string
): ExternalDiscreteEstimationResult {
  const parsed = parseExternalDiscreteEstimationJson(json);
  return parsed.ok ? runParsedExternalEstimation(parsed.document) : parsed;
}

export function externalDiscreteEstimationResultToJson(
  result: ExternalDiscreteEstimationResult
): string {
  return JSON.stringify(result);
}
