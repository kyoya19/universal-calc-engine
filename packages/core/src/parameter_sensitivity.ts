import {
  ExternalModelDocument,
  ExternalModelParseResult,
  parseExternalModelDocument
} from './external_input';
import { ForwardEvaluationOptions } from './forward_evaluation';
import {
  ParameterValues,
  resolveParameterValues
} from './parameterized_scalars';
import {
  BaseScenarioComparisonSuccess,
  RewardAxesScenarioComparisonSuccess,
  ScenarioComparisonFailure,
  ScenarioComparisonResult,
  compareExternalModelScenarios
} from './scenario_comparison';

export type ParameterSensitivityKind = 'one_at_a_time';

export type ParameterSensitivityRequest = {
  parameterId: string;
  candidateValues: number[];
};

export type BaseParameterSensitivityPoint = {
  candidateValue: number;
  comparison: BaseScenarioComparisonSuccess;
};

export type RewardAxesParameterSensitivityPoint = {
  candidateValue: number;
  comparison: RewardAxesScenarioComparisonSuccess;
};

export type BaseParameterSensitivitySuccess = {
  ok: true;
  modelKind: 'base';
  sensitivityKind: ParameterSensitivityKind;
  parameterId: string;
  baselineValue: number;
  converged: boolean;
  points: BaseParameterSensitivityPoint[];
};

export type RewardAxesParameterSensitivitySuccess = {
  ok: true;
  modelKind: 'reward_axes';
  sensitivityKind: ParameterSensitivityKind;
  parameterId: string;
  baselineValue: number;
  converged: boolean;
  points: RewardAxesParameterSensitivityPoint[];
};

export type ParameterSensitivityFailureStage =
  | 'shared_input'
  | 'sensitivity_options'
  | 'baseline_parameter_resolution'
  | 'candidate';

export type ParameterSensitivityIssue = {
  code: string;
  path: string;
  message: string;
  candidateIndex?: number;
  candidateValue?: number;
  sourceStage?: string;
};

export type ParameterSensitivityFailure = {
  ok: false;
  stage: ParameterSensitivityFailureStage;
  issues: ParameterSensitivityIssue[];
};

export type ParameterSensitivityResult =
  | BaseParameterSensitivitySuccess
  | RewardAxesParameterSensitivitySuccess
  | ParameterSensitivityFailure;

function parseFailure(
  result: Extract<ExternalModelParseResult, { ok: false }>
): ParameterSensitivityFailure {
  return {
    ok: false,
    stage: 'shared_input',
    issues: result.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      message: issue.message,
      sourceStage: issue.stage
    }))
  };
}

function optionFailure(
  code: string,
  path: string,
  message: string
): ParameterSensitivityFailure {
  return {
    ok: false,
    stage: 'sensitivity_options',
    issues: [{ code, path, message }]
  };
}

function baselineResolutionFailure(error: unknown): ParameterSensitivityFailure {
  return {
    ok: false,
    stage: 'baseline_parameter_resolution',
    issues: [
      {
        code: 'baseline_parameter_resolution_failed',
        path: 'baselineParameterValues',
        message:
          error instanceof Error
            ? error.message
            : 'Baseline parameter resolution failed'
      }
    ]
  };
}

function candidateFailure(
  index: number,
  value: number,
  result: ScenarioComparisonFailure
): ParameterSensitivityFailure {
  return {
    ok: false,
    stage: 'candidate',
    issues: result.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      message: issue.message,
      candidateIndex: index,
      candidateValue: value,
      ...(issue.sourceStage !== undefined
        ? { sourceStage: issue.sourceStage }
        : {})
    }))
  };
}

function validateRequest(
  document: ExternalModelDocument,
  request: ParameterSensitivityRequest
): ParameterSensitivityFailure | undefined {
  if (request.parameterId.trim().length === 0) {
    return optionFailure(
      'empty_parameter_id',
      'request.parameterId',
      'parameterId must not be empty'
    );
  }

  if (
    !document.model.parameters.some(
      (parameter) => parameter.id === request.parameterId
    )
  ) {
    return optionFailure(
      'unknown_parameter_id',
      'request.parameterId',
      `Unknown sensitivity parameter: ${request.parameterId}`
    );
  }

  if (request.candidateValues.length === 0) {
    return optionFailure(
      'empty_candidate_values',
      'request.candidateValues',
      'candidateValues must contain at least one value'
    );
  }

  for (let index = 0; index < request.candidateValues.length; index += 1) {
    const value = request.candidateValues[index];
    if (value === undefined || !Number.isFinite(value)) {
      return optionFailure(
        'invalid_candidate_value',
        `request.candidateValues[${index}]`,
        'Sensitivity candidate values must be finite numbers'
      );
    }
  }

  return undefined;
}

function candidateParameterValues(
  baselineParameterValues: ParameterValues,
  parameterId: string,
  candidateValue: number
): ParameterValues {
  return {
    ...baselineParameterValues,
    [parameterId]: candidateValue
  };
}

function compareCandidate(
  document: ExternalModelDocument,
  baselineParameterValues: ParameterValues,
  request: ParameterSensitivityRequest,
  candidateValue: number,
  options: ForwardEvaluationOptions
): ScenarioComparisonResult {
  return compareExternalModelScenarios(
    document,
    {
      baseline: baselineParameterValues,
      candidate: candidateParameterValues(
        baselineParameterValues,
        request.parameterId,
        candidateValue
      )
    },
    options
  );
}

export function analyzeParameterSensitivity(
  input: unknown,
  baselineParameterValues: ParameterValues,
  request: ParameterSensitivityRequest,
  options: ForwardEvaluationOptions = {}
): ParameterSensitivityResult {
  const parsed = parseExternalModelDocument(input);
  if (!parsed.ok) {
    return parseFailure(parsed);
  }

  const invalidRequest = validateRequest(parsed.document, request);
  if (invalidRequest !== undefined) {
    return invalidRequest;
  }

  let resolvedBaseline: ParameterValues;
  try {
    resolvedBaseline = resolveParameterValues(
      parsed.document.model.parameters,
      baselineParameterValues
    );
  } catch (error) {
    return baselineResolutionFailure(error);
  }

  const baselineValue = resolvedBaseline[request.parameterId];
  if (baselineValue === undefined) {
    return baselineResolutionFailure(
      new Error(`Missing resolved baseline parameter: ${request.parameterId}`)
    );
  }

  if (parsed.document.modelKind === 'base') {
    const points: BaseParameterSensitivityPoint[] = [];

    for (let index = 0; index < request.candidateValues.length; index += 1) {
      const candidateValue = request.candidateValues[index] as number;
      const comparison = compareCandidate(
        parsed.document,
        baselineParameterValues,
        request,
        candidateValue,
        options
      );
      if (!comparison.ok) {
        return candidateFailure(index, candidateValue, comparison);
      }
      if (comparison.modelKind !== 'base') {
        return candidateFailure(index, candidateValue, {
          ok: false,
          stage: 'comparison',
          issues: [
            {
              code: 'sensitivity_model_kind_mismatch',
              path: '$',
              message: 'Expected a base scenario comparison'
            }
          ]
        });
      }
      points.push({ candidateValue, comparison });
    }

    return {
      ok: true,
      modelKind: 'base',
      sensitivityKind: 'one_at_a_time',
      parameterId: request.parameterId,
      baselineValue,
      converged: points.every((point) => point.comparison.converged),
      points
    };
  }

  const points: RewardAxesParameterSensitivityPoint[] = [];

  for (let index = 0; index < request.candidateValues.length; index += 1) {
    const candidateValue = request.candidateValues[index] as number;
    const comparison = compareCandidate(
      parsed.document,
      baselineParameterValues,
      request,
      candidateValue,
      options
    );
    if (!comparison.ok) {
      return candidateFailure(index, candidateValue, comparison);
    }
    if (comparison.modelKind !== 'reward_axes') {
      return candidateFailure(index, candidateValue, {
        ok: false,
        stage: 'comparison',
        issues: [
          {
            code: 'sensitivity_model_kind_mismatch',
            path: '$',
            message: 'Expected a reward-axes scenario comparison'
          }
        ]
      });
    }
    points.push({ candidateValue, comparison });
  }

  return {
    ok: true,
    modelKind: 'reward_axes',
    sensitivityKind: 'one_at_a_time',
    parameterId: request.parameterId,
    baselineValue,
    converged: points.every((point) => point.comparison.converged),
    points
  };
}

export function parameterSensitivityResultToJson(
  result: ParameterSensitivityResult
): string {
  return JSON.stringify(result);
}
