import {
  CompositeEvidenceIndependenceAssumption,
  CompositeLikelihoodEstimationFailure,
  CompositeLikelihoodEstimationRequest,
  CompositeLikelihoodEstimationSuccess,
  estimateCompositeParameterCandidates
} from './composite_likelihood_estimation';
import {
  DiscreteParameterEstimationFailure,
  DiscreteParameterEstimationSuccess,
  EstimationConstraint,
  estimateDiscreteParameterCandidates
} from './discrete_estimation';
import {
  ExternalModelDocument,
  ExternalModelParseResult,
  parseExternalModelDocument
} from './external_input';
import {
  MultiParameterGridEstimationFailure,
  MultiParameterGridEstimationRequest,
  MultiParameterGridEstimationSuccess,
  ParameterCandidateDimension,
  estimateMultiParameterGrid
} from './multi_parameter_grid_estimation';
import {
  ObservationDataset,
  ObservationParseResult,
  parseObservationDataset
} from './observations';
import {
  ExternalDiscreteEstimationDocument,
  ReverseExternalInputIssue,
  parseExternalDiscreteEstimationDocument
} from './reverse_external_input';
import {
  GaussianScalarErrorModel,
  ScalarGaussianLikelihoodBinding,
  ScalarGaussianParameterEstimationFailure,
  ScalarGaussianParameterEstimationRequest,
  ScalarGaussianParameterEstimationSuccess,
  ScalarPredictionSpec,
  estimateScalarGaussianParameterCandidates
} from './scalar_gaussian_estimation';
import { SolverDiagnosticsOptions } from './solver_diagnostics';

export type CheckedReverseEstimationKind =
  | 'discrete_parameter_candidates'
  | 'scalar_gaussian_parameter_candidates'
  | 'composite_parameter_candidates'
  | 'multi_parameter_transition_grid';

export type ExternalScalarGaussianEstimationDocument = {
  schemaVersion: 1;
  estimationKind: 'scalar_gaussian_parameter_candidates';
  modelDocument: ExternalModelDocument;
  observationDataset: ObservationDataset;
  request: ScalarGaussianParameterEstimationRequest;
};

export type ExternalCompositeEstimationDocument = {
  schemaVersion: 1;
  estimationKind: 'composite_parameter_candidates';
  modelDocument: ExternalModelDocument;
  observationDataset: ObservationDataset;
  request: CompositeLikelihoodEstimationRequest;
};

export type ExternalMultiParameterGridEstimationDocument = {
  schemaVersion: 1;
  estimationKind: 'multi_parameter_transition_grid';
  modelDocument: ExternalModelDocument;
  observationDataset: ObservationDataset;
  request: MultiParameterGridEstimationRequest;
};

export type ExternalReverseMethodDocument =
  | ExternalDiscreteEstimationDocument
  | ExternalScalarGaussianEstimationDocument
  | ExternalCompositeEstimationDocument
  | ExternalMultiParameterGridEstimationDocument;

export type ExternalReverseMethodParseResult =
  | { ok: true; document: ExternalReverseMethodDocument }
  | {
      ok: false;
      stage: 'json_syntax' | 'shape';
      issues: ReverseExternalInputIssue[];
    };

export type ExternalReverseMethodSuccess =
  | {
      ok: true;
      estimationKind: 'discrete_parameter_candidates';
      document: ExternalDiscreteEstimationDocument;
      estimation: DiscreteParameterEstimationSuccess;
    }
  | {
      ok: true;
      estimationKind: 'scalar_gaussian_parameter_candidates';
      document: ExternalScalarGaussianEstimationDocument;
      estimation: ScalarGaussianParameterEstimationSuccess;
    }
  | {
      ok: true;
      estimationKind: 'composite_parameter_candidates';
      document: ExternalCompositeEstimationDocument;
      estimation: CompositeLikelihoodEstimationSuccess;
    }
  | {
      ok: true;
      estimationKind: 'multi_parameter_transition_grid';
      document: ExternalMultiParameterGridEstimationDocument;
      estimation: MultiParameterGridEstimationSuccess;
    };

export type ExternalReverseEstimatorFailure =
  | DiscreteParameterEstimationFailure
  | ScalarGaussianParameterEstimationFailure
  | CompositeLikelihoodEstimationFailure
  | MultiParameterGridEstimationFailure;

export type ExternalReverseMethodResult =
  | ExternalReverseMethodSuccess
  | {
      ok: false;
      stage: 'json_syntax' | 'shape';
      issues: ReverseExternalInputIssue[];
    }
  | {
      ok: false;
      stage: 'estimation';
      estimationKind: CheckedReverseEstimationKind;
      estimationStage: string;
      issues: ReverseExternalInputIssue[];
      estimation: ExternalReverseEstimatorFailure;
    };

type UnknownRecord = Record<string, unknown>;
type CommonSingleParameterRequest = {
  parameterId: string;
  candidates: number[];
  constraints?: EstimationConstraint[];
};

type ParsedEnvelopeCommon = {
  modelDocument: ExternalModelDocument | undefined;
  observationDataset: ObservationDataset | undefined;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shapeIssue(code: string, path: string, message: string): ReverseExternalInputIssue {
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
  if (input.type !== 'minimum' && input.type !== 'maximum') {
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
    type: input.type,
    value: input.value,
    ...(input.inclusive !== undefined ? { inclusive: input.inclusive } : {})
  };
}

function parseConstraints(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): EstimationConstraint[] | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!Array.isArray(input)) {
    issues.push(shapeIssue('expected_array', path, 'constraints must be an array'));
    return undefined;
  }
  const constraints: EstimationConstraint[] = [];
  input.forEach((constraint, index) => {
    const parsed = parseConstraint(constraint, `${path}[${index}]`, issues);
    if (parsed !== undefined) {
      constraints.push(parsed);
    }
  });
  return constraints;
}

function parseCandidates(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): number[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(shapeIssue('expected_array', path, 'candidates must be an array'));
    return undefined;
  }
  const candidates: number[] = [];
  input.forEach((candidate, index) => {
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
      issues.push(
        shapeIssue(
          'expected_finite_number',
          `${path}[${index}]`,
          'Candidate values must be finite numbers'
        )
      );
    } else {
      candidates.push(candidate);
    }
  });
  return candidates;
}

function parseCommonSingleParameterRequest(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): CommonSingleParameterRequest | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected an estimation request object'));
    return undefined;
  }
  const parameterId = input.parameterId;
  if (typeof parameterId !== 'string') {
    issues.push(shapeIssue('expected_string', `${path}.parameterId`, 'parameterId must be a string'));
  }
  const candidates = parseCandidates(input.candidates, `${path}.candidates`, issues);
  const constraints = parseConstraints(input.constraints, `${path}.constraints`, issues);
  if (typeof parameterId !== 'string' || candidates === undefined) {
    return undefined;
  }
  return {
    parameterId,
    candidates,
    ...(constraints !== undefined ? { constraints } : {})
  };
}

function parseSolverOptions(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): SolverDiagnosticsOptions | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'solver must be an object'));
    return undefined;
  }
  const result: SolverDiagnosticsOptions = {};
  if (input.maxIterations !== undefined) {
    if (typeof input.maxIterations !== 'number' || !Number.isFinite(input.maxIterations)) {
      issues.push(
        shapeIssue(
          'expected_finite_number',
          `${path}.maxIterations`,
          'maxIterations must be a finite number'
        )
      );
    } else {
      result.maxIterations = input.maxIterations;
    }
  }
  if (input.tolerance !== undefined) {
    if (typeof input.tolerance !== 'number' || !Number.isFinite(input.tolerance)) {
      issues.push(
        shapeIssue(
          'expected_finite_number',
          `${path}.tolerance`,
          'tolerance must be a finite number'
        )
      );
    } else {
      result.tolerance = input.tolerance;
    }
  }
  return result;
}

function parseScalarPredictor(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): ScalarPredictionSpec | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'predictor must be an object'));
    return undefined;
  }
  if (input.type === 'expected_elapsed_time_seconds') {
    return { type: 'expected_elapsed_time_seconds' };
  }
  if (input.type === 'reward_axis_expected_value') {
    if (typeof input.axisId !== 'string') {
      issues.push(shapeIssue('expected_string', `${path}.axisId`, 'axisId must be a string'));
      return undefined;
    }
    return { type: 'reward_axis_expected_value', axisId: input.axisId };
  }
  issues.push(
    shapeIssue(
      'unsupported_scalar_predictor',
      `${path}.type`,
      'Unsupported scalar predictor type'
    )
  );
  return undefined;
}

function parseGaussianErrorModel(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): GaussianScalarErrorModel | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'errorModel must be an object'));
    return undefined;
  }
  if (input.type !== 'gaussian') {
    issues.push(
      shapeIssue('unsupported_error_model', `${path}.type`, 'errorModel type must be gaussian')
    );
  }
  if (
    typeof input.standardDeviation !== 'number' ||
    !Number.isFinite(input.standardDeviation)
  ) {
    issues.push(
      shapeIssue(
        'expected_finite_number',
        `${path}.standardDeviation`,
        'standardDeviation must be a finite number'
      )
    );
  }
  if (typeof input.unit !== 'string') {
    issues.push(shapeIssue('expected_string', `${path}.unit`, 'errorModel unit must be a string'));
  }
  if (
    input.type !== 'gaussian' ||
    typeof input.standardDeviation !== 'number' ||
    !Number.isFinite(input.standardDeviation) ||
    typeof input.unit !== 'string'
  ) {
    return undefined;
  }
  return {
    type: 'gaussian',
    standardDeviation: input.standardDeviation,
    unit: input.unit
  };
}

function parseScalarLikelihoodBinding(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): ScalarGaussianLikelihoodBinding | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected a scalar likelihood binding object'));
    return undefined;
  }
  const observationId = input.observationId;
  if (typeof observationId !== 'string') {
    issues.push(
      shapeIssue('expected_string', `${path}.observationId`, 'observationId must be a string')
    );
  }
  const predictor = parseScalarPredictor(input.predictor, `${path}.predictor`, issues);
  const errorModel = parseGaussianErrorModel(input.errorModel, `${path}.errorModel`, issues);
  if (typeof observationId !== 'string' || predictor === undefined || errorModel === undefined) {
    return undefined;
  }
  return { observationId, predictor, errorModel };
}

function parseScalarLikelihoods(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): ScalarGaussianLikelihoodBinding[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(shapeIssue('expected_array', path, 'scalarLikelihoods must be an array'));
    return undefined;
  }
  const bindings: ScalarGaussianLikelihoodBinding[] = [];
  input.forEach((binding, index) => {
    const parsed = parseScalarLikelihoodBinding(binding, `${path}[${index}]`, issues);
    if (parsed !== undefined) {
      bindings.push(parsed);
    }
  });
  return bindings;
}

function parseScalarRequest(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): ScalarGaussianParameterEstimationRequest | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected an estimation request object'));
    return undefined;
  }
  const common = parseCommonSingleParameterRequest(input, path, issues);
  const scalarLikelihoods = parseScalarLikelihoods(
    input.scalarLikelihoods,
    `${path}.scalarLikelihoods`,
    issues
  );
  const solver = parseSolverOptions(input.solver, `${path}.solver`, issues);
  if (common === undefined || scalarLikelihoods === undefined) {
    return undefined;
  }
  return {
    ...common,
    scalarLikelihoods,
    ...(solver !== undefined ? { solver } : {})
  };
}

function parseStringArray(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): string[] | undefined {
  if (!Array.isArray(input)) {
    issues.push(shapeIssue('expected_array', path, 'Expected an array'));
    return undefined;
  }
  const values: string[] = [];
  input.forEach((value, index) => {
    if (typeof value !== 'string') {
      issues.push(shapeIssue('expected_string', `${path}[${index}]`, 'Expected a string'));
    } else {
      values.push(value);
    }
  });
  return values;
}

function parseCompositeRequest(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): CompositeLikelihoodEstimationRequest | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected an estimation request object'));
    return undefined;
  }
  const common = parseCommonSingleParameterRequest(input, path, issues);
  const transitionObservationIds = parseStringArray(
    input.transitionObservationIds,
    `${path}.transitionObservationIds`,
    issues
  );
  const scalarLikelihoods = parseScalarLikelihoods(
    input.scalarLikelihoods,
    `${path}.scalarLikelihoods`,
    issues
  );
  const solver = parseSolverOptions(input.solver, `${path}.solver`, issues);
  const expectedAssumption: CompositeEvidenceIndependenceAssumption =
    'transition_and_scalar_evidence_conditionally_independent_given_candidate';
  if (input.independenceAssumption !== expectedAssumption) {
    issues.push(
      shapeIssue(
        'unsupported_independence_assumption',
        `${path}.independenceAssumption`,
        `independenceAssumption must be ${expectedAssumption}`
      )
    );
  }
  if (
    common === undefined ||
    transitionObservationIds === undefined ||
    scalarLikelihoods === undefined ||
    input.independenceAssumption !== expectedAssumption
  ) {
    return undefined;
  }
  return {
    ...common,
    transitionObservationIds,
    scalarLikelihoods,
    independenceAssumption: expectedAssumption,
    ...(solver !== undefined ? { solver } : {})
  };
}

function parseParameterDimension(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): ParameterCandidateDimension | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected a parameter dimension object'));
    return undefined;
  }
  const parameterId = input.parameterId;
  if (typeof parameterId !== 'string') {
    issues.push(shapeIssue('expected_string', `${path}.parameterId`, 'parameterId must be a string'));
  }
  const candidates = parseCandidates(input.candidates, `${path}.candidates`, issues);
  const constraints = parseConstraints(input.constraints, `${path}.constraints`, issues);
  if (typeof parameterId !== 'string' || candidates === undefined) {
    return undefined;
  }
  return {
    parameterId,
    candidates,
    ...(constraints !== undefined ? { constraints } : {})
  };
}

function parseGridRequest(
  input: unknown,
  path: string,
  issues: ReverseExternalInputIssue[]
): MultiParameterGridEstimationRequest | undefined {
  if (!isRecord(input)) {
    issues.push(shapeIssue('expected_object', path, 'Expected an estimation request object'));
    return undefined;
  }
  const parameters: ParameterCandidateDimension[] = [];
  if (!Array.isArray(input.parameters)) {
    issues.push(shapeIssue('expected_array', `${path}.parameters`, 'parameters must be an array'));
  } else {
    input.parameters.forEach((dimension, index) => {
      const parsed = parseParameterDimension(dimension, `${path}.parameters[${index}]`, issues);
      if (parsed !== undefined) {
        parameters.push(parsed);
      }
    });
  }
  if (typeof input.maxCombinations !== 'number' || !Number.isFinite(input.maxCombinations)) {
    issues.push(
      shapeIssue(
        'expected_finite_number',
        `${path}.maxCombinations`,
        'maxCombinations must be a finite number'
      )
    );
  }
  if (
    !Array.isArray(input.parameters) ||
    typeof input.maxCombinations !== 'number' ||
    !Number.isFinite(input.maxCombinations)
  ) {
    return undefined;
  }
  return { parameters, maxCombinations: input.maxCombinations };
}

function parseCommonEnvelope(
  input: UnknownRecord,
  issues: ReverseExternalInputIssue[]
): ParsedEnvelopeCommon {
  const modelResult = parseExternalModelDocument(input.modelDocument);
  if (!modelResult.ok) {
    issues.push(...mapModelParseIssues(modelResult));
  }
  const observationResult = parseObservationDataset(input.observationDataset);
  if (!observationResult.ok) {
    issues.push(...mapObservationParseIssues(observationResult));
  }
  return {
    modelDocument: modelResult.ok ? modelResult.document : undefined,
    observationDataset: observationResult.ok ? observationResult.dataset : undefined
  };
}

export function parseExternalReverseEstimationDocument(
  input: unknown
): ExternalReverseMethodParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      stage: 'shape',
      issues: [shapeIssue('expected_object', '$', 'Expected a reverse estimation document object')]
    };
  }

  if (input.estimationKind === 'discrete_parameter_candidates') {
    return parseExternalDiscreteEstimationDocument(input);
  }

  const issues: ReverseExternalInputIssue[] = [];
  if (input.schemaVersion !== 1) {
    issues.push(shapeIssue('unsupported_schema_version', '$.schemaVersion', 'schemaVersion must be 1'));
  }

  const kind = input.estimationKind;
  const recognized =
    kind === 'scalar_gaussian_parameter_candidates' ||
    kind === 'composite_parameter_candidates' ||
    kind === 'multi_parameter_transition_grid';
  if (!recognized) {
    issues.push(
      shapeIssue(
        'unsupported_estimation_kind',
        '$.estimationKind',
        'Unsupported reverse estimationKind'
      )
    );
  }

  const common = parseCommonEnvelope(input, issues);
  let request:
    | ScalarGaussianParameterEstimationRequest
    | CompositeLikelihoodEstimationRequest
    | MultiParameterGridEstimationRequest
    | undefined;

  if (kind === 'scalar_gaussian_parameter_candidates') {
    request = parseScalarRequest(input.request, '$.request', issues);
  } else if (kind === 'composite_parameter_candidates') {
    request = parseCompositeRequest(input.request, '$.request', issues);
  } else if (kind === 'multi_parameter_transition_grid') {
    request = parseGridRequest(input.request, '$.request', issues);
  }

  if (
    issues.length > 0 ||
    input.schemaVersion !== 1 ||
    !recognized ||
    common.modelDocument === undefined ||
    common.observationDataset === undefined ||
    request === undefined
  ) {
    return { ok: false, stage: 'shape', issues };
  }

  if (kind === 'scalar_gaussian_parameter_candidates') {
    return {
      ok: true,
      document: {
        schemaVersion: 1,
        estimationKind: kind,
        modelDocument: common.modelDocument,
        observationDataset: common.observationDataset,
        request: request as ScalarGaussianParameterEstimationRequest
      }
    };
  }
  if (kind === 'composite_parameter_candidates') {
    return {
      ok: true,
      document: {
        schemaVersion: 1,
        estimationKind: kind,
        modelDocument: common.modelDocument,
        observationDataset: common.observationDataset,
        request: request as CompositeLikelihoodEstimationRequest
      }
    };
  }
  return {
    ok: true,
    document: {
      schemaVersion: 1,
      estimationKind: 'multi_parameter_transition_grid',
      modelDocument: common.modelDocument,
      observationDataset: common.observationDataset,
      request: request as MultiParameterGridEstimationRequest
    }
  };
}

export function parseExternalReverseEstimationJson(
  json: string
): ExternalReverseMethodParseResult {
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
  return parseExternalReverseEstimationDocument(input);
}

function mapEstimatorIssuePath(path: string): string {
  if (path === '$') {
    return '$';
  }
  if (path === 'observations') {
    return '$.observationDataset.observations';
  }
  if (path.startsWith('observations[')) {
    return `$.observationDataset.${path}`;
  }
  if (path === 'candidate' || path === 'assignment') {
    return '$.request';
  }
  if (path === 'request' || path.startsWith('request.')) {
    return `$.${path}`;
  }
  if (path.startsWith('$.')) {
    return `$.modelDocument${path.slice(1)}`;
  }
  return path;
}

function estimationFailureResult(
  estimationKind: CheckedReverseEstimationKind,
  estimation: ExternalReverseEstimatorFailure
): ExternalReverseMethodResult {
  return {
    ok: false,
    stage: 'estimation',
    estimationKind,
    estimationStage: estimation.stage,
    estimation,
    issues: estimation.issues.map((issue) => ({
      stage: 'estimation',
      code: issue.code,
      path: mapEstimatorIssuePath(issue.path),
      message: issue.message
    }))
  };
}

function runParsedExternalReverseEstimation(
  document: ExternalReverseMethodDocument
): ExternalReverseMethodResult {
  switch (document.estimationKind) {
    case 'discrete_parameter_candidates': {
      const estimation = estimateDiscreteParameterCandidates(
        document.modelDocument,
        document.observationDataset,
        document.request
      );
      return estimation.ok
        ? { ok: true, estimationKind: document.estimationKind, document, estimation }
        : estimationFailureResult(document.estimationKind, estimation);
    }
    case 'scalar_gaussian_parameter_candidates': {
      const estimation = estimateScalarGaussianParameterCandidates(
        document.modelDocument,
        document.observationDataset,
        document.request
      );
      return estimation.ok
        ? { ok: true, estimationKind: document.estimationKind, document, estimation }
        : estimationFailureResult(document.estimationKind, estimation);
    }
    case 'composite_parameter_candidates': {
      const estimation = estimateCompositeParameterCandidates(
        document.modelDocument,
        document.observationDataset,
        document.request
      );
      return estimation.ok
        ? { ok: true, estimationKind: document.estimationKind, document, estimation }
        : estimationFailureResult(document.estimationKind, estimation);
    }
    case 'multi_parameter_transition_grid': {
      const estimation = estimateMultiParameterGrid(
        document.modelDocument,
        document.observationDataset,
        document.request
      );
      return estimation.ok
        ? { ok: true, estimationKind: document.estimationKind, document, estimation }
        : estimationFailureResult(document.estimationKind, estimation);
    }
  }
}

export function estimateExternalReverseInput(input: unknown): ExternalReverseMethodResult {
  const parsed = parseExternalReverseEstimationDocument(input);
  return parsed.ok ? runParsedExternalReverseEstimation(parsed.document) : parsed;
}

export function estimateExternalReverseJson(json: string): ExternalReverseMethodResult {
  const parsed = parseExternalReverseEstimationJson(json);
  return parsed.ok ? runParsedExternalReverseEstimation(parsed.document) : parsed;
}

export function externalReverseMethodResultToJson(result: ExternalReverseMethodResult): string {
  return JSON.stringify(result);
}
