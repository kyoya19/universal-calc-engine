import {
  AcyclicDirectDiagnostics,
  AcyclicDirectEvaluationFailure,
  AcyclicDirectOptions,
  solveAcyclicDefinitionModel
} from './acyclic_direct_solver';
import type {
  ForwardElapsedTimeOutput,
  ForwardReachabilityOutput
} from './forward_evaluation';
import {
  ContributionResult,
  DefinitionModel,
  EvaluatedModel,
  OutputResult,
  evaluateModel,
  expandModel,
  toContributionResult,
  toOutputResult
} from './model';
import {
  toForwardElapsedTimeOutput,
  toForwardReachabilityOutput
} from './forward_output_conversion';
import { RewardRateResult, toRewardRateResult } from './reward_rate';
import { ModelValidationResult } from './validation';

export type AcyclicDirectForwardSuccess = {
  ok: true;
  validation: ModelValidationResult;
  expectedReward: OutputResult;
  expectedElapsedTime: ForwardElapsedTimeOutput;
  rewardRate: RewardRateResult;
  contribution: ContributionResult;
  diagnostics: AcyclicDirectDiagnostics;
  reachability?: ForwardReachabilityOutput;
};

export type AcyclicDirectForwardFailure = AcyclicDirectEvaluationFailure;

export type AcyclicDirectForwardResult =
  | AcyclicDirectForwardSuccess
  | AcyclicDirectForwardFailure;

function evaluationFailure(
  validation: ModelValidationResult,
  diagnostics: AcyclicDirectDiagnostics,
  error: unknown
): AcyclicDirectForwardFailure {
  return {
    ok: false,
    failure: {
      code: 'evaluation_failed',
      message: error instanceof Error ? error.message : String(error)
    },
    validation,
    diagnostics
  };
}

export function evaluateAcyclicDirectDefinitionModel(
  model: DefinitionModel,
  options: AcyclicDirectOptions = {}
): AcyclicDirectForwardResult {
  const direct = solveAcyclicDefinitionModel(model, options);
  if (!direct.ok) {
    return direct;
  }

  let evaluated: EvaluatedModel;
  try {
    evaluated = evaluateModel(expandModel(model));
  } catch (error) {
    return evaluationFailure(direct.validation, direct.diagnostics, error);
  }

  try {
    const success: AcyclicDirectForwardSuccess = {
      ok: true,
      validation: direct.validation,
      expectedReward: toOutputResult(model, direct.expectedReward),
      expectedElapsedTime: toForwardElapsedTimeOutput(model, direct.expectedElapsedTime),
      rewardRate: toRewardRateResult(
        model,
        direct.expectedReward,
        direct.expectedElapsedTime
      ),
      contribution: toContributionResult(evaluated, direct.expectedReward),
      diagnostics: direct.diagnostics
    };

    if (direct.reachability !== undefined) {
      success.reachability = toForwardReachabilityOutput(model, direct.reachability);
    }

    return success;
  } catch (error) {
    return evaluationFailure(direct.validation, direct.diagnostics, error);
  }
}
