import {
  ExternalInputStage,
  ExternalModelPreparationResult,
  PreparedExternalModel,
  prepareExternalModelInput,
  prepareExternalModelJson
} from './external_input';
import {
  ContributionResult,
  DefinitionModel,
  EvaluatedModel,
  OutputResult,
  StateId,
  evaluateModel,
  expandModel,
  toContributionResult,
  toOutputResult
} from './model';
import {
  RewardAxesContributionResult,
  RewardAxesDefinitionModel,
  RewardAxesEvaluatedModel,
  RewardAxesOutputResult,
  evaluateRewardAxesModel,
  expandRewardAxesModel,
  toRewardAxesContributionResult,
  toRewardAxesOutputResult
} from './reward_axes';
import { RewardRateResult, toRewardRateResult } from './reward_rate';
import {
  SolverConvergenceDiagnostics,
  SolverDiagnosticsOptions,
  solveExpectedElapsedTimeWithDiagnostics,
  solveExpectedRewardAxesWithDiagnostics,
  solveExpectedRewardWithDiagnostics,
  solveReachabilityProbabilityWithDiagnostics
} from './solver_diagnostics';
import {
  toForwardElapsedTimeOutput,
  toForwardReachabilityOutput
} from './forward_output_conversion';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type ForwardEvaluationStage = ExternalInputStage | 'evaluation_options' | 'evaluation';

export type ForwardEvaluationIssue = {
  stage: ForwardEvaluationStage;
  code: string;
  path: string;
  message: string;
};

export type ForwardEvaluationOptions = {
  reachabilityTargets?: StateId[];
  solver?: SolverDiagnosticsOptions;
};

export type ForwardElapsedTimeOutput = {
  startState: StateId;
  expectedElapsedTimeSeconds: number;
  expectedElapsedTimeSecondsByState: Record<StateId, number>;
};

export type ForwardReachabilityOutput = {
  targetStates: StateId[];
  probabilityFromStart: number;
  probabilityByState: Record<StateId, number>;
};

export type ForwardEvaluationDiagnostics = {
  expectedReward: SolverConvergenceDiagnostics;
  expectedElapsedTime: SolverConvergenceDiagnostics;
  reachability?: SolverConvergenceDiagnostics;
  rewardAxes?: Record<string, SolverConvergenceDiagnostics>;
};

export type ForwardBaseEvaluationSuccess = {
  ok: true;
  modelKind: 'base';
  converged: boolean;
  validation: ModelValidationResult;
  expectedReward: OutputResult;
  expectedElapsedTime: ForwardElapsedTimeOutput;
  rewardRate: RewardRateResult;
  contribution: ContributionResult;
  diagnostics: ForwardEvaluationDiagnostics;
  reachability?: ForwardReachabilityOutput;
};

export type ForwardRewardAxesEvaluationSuccess = {
  ok: true;
  modelKind: 'reward_axes';
  converged: boolean;
  validation: ModelValidationResult;
  expectedReward: OutputResult;
  expectedElapsedTime: ForwardElapsedTimeOutput;
  rewardRate: RewardRateResult;
  contribution: ContributionResult;
  rewardAxes: RewardAxesOutputResult;
  rewardAxesContribution: RewardAxesContributionResult;
  diagnostics: ForwardEvaluationDiagnostics;
  reachability?: ForwardReachabilityOutput;
};

export type ForwardEvaluationFailure = {
  ok: false;
  stage: ForwardEvaluationStage;
  issues: ForwardEvaluationIssue[];
  validation?: ModelValidationResult;
};

export type ForwardEvaluationResult =
  | ForwardBaseEvaluationSuccess
  | ForwardRewardAxesEvaluationSuccess
  | ForwardEvaluationFailure;

type CommonForwardEvaluation = {
  converged: boolean;
  validation: ModelValidationResult;
  expectedReward: OutputResult;
  expectedElapsedTime: ForwardElapsedTimeOutput;
  rewardRate: RewardRateResult;
  contribution: ContributionResult;
  diagnostics: ForwardEvaluationDiagnostics;
  reachability?: ForwardReachabilityOutput;
};

function isForwardEvaluationFailure(
  value: CommonForwardEvaluation | ForwardEvaluationFailure
): value is ForwardEvaluationFailure {
  return 'ok' in value && value.ok === false;
}

function preparationFailure(
  result: Extract<ExternalModelPreparationResult, { ok: false }>
): ForwardEvaluationFailure {
  return {
    ok: false,
    stage: result.stage,
    issues: result.issues.map((issue) => ({ ...issue })),
    ...(result.validation !== undefined ? { validation: result.validation } : {})
  };
}

function definitionModelValidationFailure(
  validation: ModelValidationResult
): ForwardEvaluationFailure {
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

function optionFailure(
  code: string,
  path: string,
  message: string
): ForwardEvaluationFailure {
  return {
    ok: false,
    stage: 'evaluation_options',
    issues: [{ stage: 'evaluation_options', code, path, message }]
  };
}

function validateOptions(
  model: DefinitionModel,
  options: ForwardEvaluationOptions
): ForwardEvaluationFailure | undefined {
  const maxIterations = options.solver?.maxIterations;
  if (
    maxIterations !== undefined &&
    (!Number.isInteger(maxIterations) || maxIterations <= 0)
  ) {
    return optionFailure(
      'invalid_max_iterations',
      'options.solver.maxIterations',
      'maxIterations must be a positive integer'
    );
  }

  const tolerance = options.solver?.tolerance;
  if (
    tolerance !== undefined &&
    (!Number.isFinite(tolerance) || tolerance <= 0)
  ) {
    return optionFailure(
      'invalid_tolerance',
      'options.solver.tolerance',
      'tolerance must be a finite positive number'
    );
  }

  if (options.reachabilityTargets !== undefined) {
    for (let index = 0; index < options.reachabilityTargets.length; index += 1) {
      const target = options.reachabilityTargets[index];
      if (target === undefined || !model.states.some((state) => state.id === target)) {
        return optionFailure(
          'unknown_reachability_target',
          `options.reachabilityTargets[${index}]`,
          `Unknown reachability target state: ${String(target)}`
        );
      }
    }
  }

  return undefined;
}

function runCommonForwardEvaluation(
  model: DefinitionModel,
  evaluated: EvaluatedModel,
  validation: ModelValidationResult,
  options: ForwardEvaluationOptions
): CommonForwardEvaluation | ForwardEvaluationFailure {
  const invalidOptions = validateOptions(model, options);
  if (invalidOptions !== undefined) {
    return invalidOptions;
  }

  const solverOptions = options.solver ?? {};
  const expectedRewardDetailed = solveExpectedRewardWithDiagnostics(
    evaluated,
    solverOptions
  );
  const elapsedTimeDetailed = solveExpectedElapsedTimeWithDiagnostics(
    evaluated,
    solverOptions
  );

  const expectedReward = toOutputResult(model, expectedRewardDetailed.result);
  const expectedElapsedTime = toForwardElapsedTimeOutput(model, elapsedTimeDetailed.result);
  const rewardRate = toRewardRateResult(
    model,
    expectedRewardDetailed.result,
    elapsedTimeDetailed.result
  );
  const contribution = toContributionResult(evaluated, expectedRewardDetailed.result);

  const diagnostics: ForwardEvaluationDiagnostics = {
    expectedReward: expectedRewardDetailed.diagnostics,
    expectedElapsedTime: elapsedTimeDetailed.diagnostics
  };

  let converged =
    expectedRewardDetailed.diagnostics.converged &&
    elapsedTimeDetailed.diagnostics.converged;

  const common: CommonForwardEvaluation = {
    converged,
    validation,
    expectedReward,
    expectedElapsedTime,
    rewardRate,
    contribution,
    diagnostics
  };

  if (options.reachabilityTargets !== undefined) {
    const reachabilityDetailed = solveReachabilityProbabilityWithDiagnostics(
      evaluated,
      options.reachabilityTargets,
      solverOptions
    );
    diagnostics.reachability = reachabilityDetailed.diagnostics;
    common.reachability = toForwardReachabilityOutput(model, reachabilityDetailed.result);
    converged = converged && reachabilityDetailed.diagnostics.converged;
    common.converged = converged;
  }

  return common;
}

function evaluationFailure(error: unknown): ForwardEvaluationFailure {
  return {
    ok: false,
    stage: 'evaluation',
    issues: [
      {
        stage: 'evaluation',
        code: 'forward_evaluation_failed',
        path: '$.model',
        message: error instanceof Error ? error.message : 'Forward evaluation failed'
      }
    ]
  };
}

function evaluateBaseDefinitionModel(
  model: DefinitionModel,
  validation: ModelValidationResult,
  options: ForwardEvaluationOptions
): ForwardEvaluationResult {
  try {
    const evaluated = evaluateModel(expandModel(model));
    const common = runCommonForwardEvaluation(model, evaluated, validation, options);
    if (isForwardEvaluationFailure(common)) {
      return common;
    }

    return {
      ok: true,
      modelKind: 'base',
      ...common
    };
  } catch (error) {
    return evaluationFailure(error);
  }
}

function evaluatePreparedBaseModel(
  prepared: Extract<PreparedExternalModel, { modelKind: 'base' }>,
  options: ForwardEvaluationOptions
): ForwardEvaluationResult {
  return evaluateBaseDefinitionModel(prepared.resolvedModel, prepared.validation, options);
}

function evaluatePreparedRewardAxesModel(
  prepared: Extract<PreparedExternalModel, { modelKind: 'reward_axes' }>,
  options: ForwardEvaluationOptions
): ForwardEvaluationResult {
  try {
    const model: RewardAxesDefinitionModel = prepared.resolvedModel;
    const evaluated: RewardAxesEvaluatedModel = evaluateRewardAxesModel(
      expandRewardAxesModel(model)
    );
    const common = runCommonForwardEvaluation(
      model,
      evaluated,
      prepared.validation,
      options
    );
    if (isForwardEvaluationFailure(common)) {
      return common;
    }

    const solverOptions = options.solver ?? {};
    const rewardAxesDetailed = solveExpectedRewardAxesWithDiagnostics(
      evaluated,
      solverOptions
    );
    const rewardAxes = toRewardAxesOutputResult(model, rewardAxesDetailed.result);
    const rewardAxesContribution = toRewardAxesContributionResult(
      evaluated,
      rewardAxesDetailed.result
    );
    common.diagnostics.rewardAxes = { ...rewardAxesDetailed.diagnosticsByAxis };
    common.converged = common.converged && rewardAxesDetailed.converged;

    return {
      ok: true,
      modelKind: 'reward_axes',
      ...common,
      rewardAxes,
      rewardAxesContribution
    };
  } catch (error) {
    return evaluationFailure(error);
  }
}

export function evaluateDefinitionModel(
  model: DefinitionModel,
  options: ForwardEvaluationOptions = {}
): ForwardEvaluationResult {
  const validation = validateDefinitionModel(model);
  return validation.valid
    ? evaluateBaseDefinitionModel(model, validation, options)
    : definitionModelValidationFailure(validation);
}

export function evaluatePreparedExternalModel(
  prepared: PreparedExternalModel,
  options: ForwardEvaluationOptions = {}
): ForwardEvaluationResult {
  return prepared.modelKind === 'base'
    ? evaluatePreparedBaseModel(prepared, options)
    : evaluatePreparedRewardAxesModel(prepared, options);
}

export function evaluateExternalModelInput(
  input: unknown,
  options: ForwardEvaluationOptions = {}
): ForwardEvaluationResult {
  const prepared = prepareExternalModelInput(input);
  return prepared.ok
    ? evaluatePreparedExternalModel(prepared, options)
    : preparationFailure(prepared);
}

export function evaluateExternalModelJson(
  json: string,
  options: ForwardEvaluationOptions = {}
): ForwardEvaluationResult {
  const prepared = prepareExternalModelJson(json);
  return prepared.ok
    ? evaluatePreparedExternalModel(prepared, options)
    : preparationFailure(prepared);
}

export function forwardEvaluationResultToJson(
  result: ForwardEvaluationResult
): string {
  return JSON.stringify(result);
}
