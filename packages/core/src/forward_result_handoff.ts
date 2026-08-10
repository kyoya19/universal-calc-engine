import type {
  ForwardBaseEvaluationSuccess,
  ForwardEvaluationDiagnostics,
  ForwardEvaluationFailure,
  ForwardEvaluationResult,
  ForwardRewardAxesEvaluationSuccess
} from './forward_evaluation';
import type { SolverConvergenceDiagnostics } from './solver_diagnostics';

export type ForwardResultWarningCode =
  | 'one_or_more_solvers_did_not_converge'
  | 'reward_rate_unavailable_zero_expected_time'
  | 'model_validation_warnings_present';

export type ForwardResultLimitationCode =
  | 'reward_rate_is_ratio_of_expectations'
  | 'legacy_reward_has_no_explicit_unit_metadata'
  | 'contribution_is_descriptive_not_causal_attribution'
  | 'non_convergence_keeps_last_approximation'
  | 'named_reward_axes_not_implicitly_netted_or_converted'
  | 'reachability_is_generic_not_domain_win_probability';

export type ForwardResultWarning = {
  code: ForwardResultWarningCode;
  message: string;
};

export type ForwardResultLimitation = {
  code: ForwardResultLimitationCode;
  message: string;
};

type ForwardResultHandoffCommonSuccess = {
  schemaVersion: 1;
  kind: 'forward_evaluation_handoff';
  status: 'success';
  converged: boolean;
  validation: ForwardBaseEvaluationSuccess['validation'];
  expectedReward: ForwardBaseEvaluationSuccess['expectedReward'];
  expectedElapsedTime: ForwardBaseEvaluationSuccess['expectedElapsedTime'];
  rewardRate: ForwardBaseEvaluationSuccess['rewardRate'];
  contribution: ForwardBaseEvaluationSuccess['contribution'];
  diagnostics: ForwardEvaluationDiagnostics;
  reachability?: ForwardBaseEvaluationSuccess['reachability'];
  warnings: ForwardResultWarning[];
  limitations: ForwardResultLimitation[];
};

export type ForwardBaseResultHandoffSuccess = ForwardResultHandoffCommonSuccess & {
  modelKind: 'base';
};

export type ForwardRewardAxesResultHandoffSuccess = ForwardResultHandoffCommonSuccess & {
  modelKind: 'reward_axes';
  rewardAxes: ForwardRewardAxesEvaluationSuccess['rewardAxes'];
  rewardAxesContribution: ForwardRewardAxesEvaluationSuccess['rewardAxesContribution'];
};

export type ForwardResultHandoffSuccess =
  | ForwardBaseResultHandoffSuccess
  | ForwardRewardAxesResultHandoffSuccess;

export type ForwardResultHandoffFailure = {
  schemaVersion: 1;
  kind: 'forward_evaluation_handoff';
  status: 'failure';
  stage: ForwardEvaluationFailure['stage'];
  issues: ForwardEvaluationFailure['issues'];
  validation?: ForwardEvaluationFailure['validation'];
};

export type ForwardResultHandoff = ForwardResultHandoffSuccess | ForwardResultHandoffFailure;

function copySolverDiagnostics(
  diagnostics: SolverConvergenceDiagnostics
): SolverConvergenceDiagnostics {
  return {
    ...diagnostics,
    ...(diagnostics.context !== undefined
      ? {
          context: {
            ...diagnostics.context,
            ...(diagnostics.context.targetStates !== undefined
              ? { targetStates: [...diagnostics.context.targetStates] }
              : {})
          }
        }
      : {})
  };
}

function copyDiagnostics(diagnostics: ForwardEvaluationDiagnostics): ForwardEvaluationDiagnostics {
  return {
    expectedReward: copySolverDiagnostics(diagnostics.expectedReward),
    expectedElapsedTime: copySolverDiagnostics(diagnostics.expectedElapsedTime),
    ...(diagnostics.reachability !== undefined
      ? { reachability: copySolverDiagnostics(diagnostics.reachability) }
      : {}),
    ...(diagnostics.rewardAxes !== undefined
      ? {
          rewardAxes: Object.fromEntries(
            Object.entries(diagnostics.rewardAxes).map(([axisId, value]) => [
              axisId,
              copySolverDiagnostics(value)
            ])
          )
        }
      : {})
  };
}

function copyValidation<T extends ForwardBaseEvaluationSuccess['validation']>(validation: T): T {
  return {
    ...validation,
    issues: validation.issues.map((issue) => ({ ...issue })),
    errors: validation.errors.map((issue) => ({ ...issue })),
    warnings: validation.warnings.map((issue) => ({ ...issue }))
  } as T;
}

function copyExpectedReward(
  result: ForwardBaseEvaluationSuccess['expectedReward']
): ForwardBaseEvaluationSuccess['expectedReward'] {
  return {
    ...result,
    expectedRewardByState: { ...result.expectedRewardByState }
  };
}

function copyExpectedElapsedTime(
  result: ForwardBaseEvaluationSuccess['expectedElapsedTime']
): ForwardBaseEvaluationSuccess['expectedElapsedTime'] {
  return {
    ...result,
    expectedElapsedTimeSecondsByState: { ...result.expectedElapsedTimeSecondsByState }
  };
}

function copyContribution(
  contribution: ForwardBaseEvaluationSuccess['contribution']
): ForwardBaseEvaluationSuccess['contribution'] {
  return {
    transitionContributionsByState: Object.fromEntries(
      Object.entries(contribution.transitionContributionsByState).map(([stateId, rows]) => [
        stateId,
        rows.map((row) => ({ ...row }))
      ])
    )
  };
}

function copyReachability(
  reachability: NonNullable<ForwardBaseEvaluationSuccess['reachability']>
): NonNullable<ForwardBaseEvaluationSuccess['reachability']> {
  return {
    targetStates: [...reachability.targetStates],
    probabilityFromStart: reachability.probabilityFromStart,
    probabilityByState: { ...reachability.probabilityByState }
  };
}

function copyRewardAxes(
  rewardAxes: ForwardRewardAxesEvaluationSuccess['rewardAxes']
): ForwardRewardAxesEvaluationSuccess['rewardAxes'] {
  return {
    startState: rewardAxes.startState,
    rewardAxes: rewardAxes.rewardAxes.map((axis) => ({ ...axis })),
    expectedRewardByAxis: { ...rewardAxes.expectedRewardByAxis },
    expectedRewardByAxisByState: Object.fromEntries(
      Object.entries(rewardAxes.expectedRewardByAxisByState).map(([axisId, byState]) => [
        axisId,
        { ...byState }
      ])
    )
  };
}

function copyRewardAxesContribution(
  contribution: ForwardRewardAxesEvaluationSuccess['rewardAxesContribution']
): ForwardRewardAxesEvaluationSuccess['rewardAxesContribution'] {
  return {
    rewardAxes: contribution.rewardAxes.map((axis) => ({ ...axis })),
    transitionContributionsByAxisByState: Object.fromEntries(
      Object.entries(contribution.transitionContributionsByAxisByState).map(
        ([axisId, byState]) => [
          axisId,
          Object.fromEntries(
            Object.entries(byState).map(([stateId, rows]) => [
              stateId,
              rows.map((row) => ({ ...row }))
            ])
          )
        ]
      )
    )
  };
}

function warningsForSuccess(
  result: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess
): ForwardResultWarning[] {
  const warnings: ForwardResultWarning[] = [];

  if (!result.converged) {
    warnings.push({
      code: 'one_or_more_solvers_did_not_converge',
      message:
        'At least one iterative solver did not converge; returned numerical values are the explicit last approximation described by diagnostics.'
    });
  }

  if (result.rewardRate.rewardPerSecond === null) {
    warnings.push({
      code: 'reward_rate_unavailable_zero_expected_time',
      message: 'Reward rate is unavailable because expected elapsed time is zero.'
    });
  }

  if (result.validation.warnings.length > 0) {
    warnings.push({
      code: 'model_validation_warnings_present',
      message: `${result.validation.warnings.length} model validation warning(s) are present.`
    });
  }

  return warnings;
}

function limitationsForSuccess(
  result: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess
): ForwardResultLimitation[] {
  const limitations: ForwardResultLimitation[] = [
    {
      code: 'reward_rate_is_ratio_of_expectations',
      message: 'Reward rate is E[reward] / E[elapsed time], not E[reward / elapsed time].'
    },
    {
      code: 'legacy_reward_has_no_explicit_unit_metadata',
      message: 'The legacy scalar reward output does not carry explicit reward-unit metadata.'
    },
    {
      code: 'contribution_is_descriptive_not_causal_attribution',
      message: 'Contribution rows are descriptive expected-value decomposition, not causal attribution.'
    },
    {
      code: 'non_convergence_keeps_last_approximation',
      message:
        'Solver non-convergence remains explicit through converged=false and diagnostics; the handoff does not fabricate convergence or discard the last approximation.'
    }
  ];

  if (result.modelKind === 'reward_axes') {
    limitations.push({
      code: 'named_reward_axes_not_implicitly_netted_or_converted',
      message: 'Named reward axes remain independent and are not implicitly netted or unit-converted.'
    });
  }

  if (result.reachability !== undefined) {
    limitations.push({
      code: 'reachability_is_generic_not_domain_win_probability',
      message: 'Reachability is generic target-state probability, not an implicit domain-specific win probability.'
    });
  }

  return limitations;
}

function summarizeSuccess(
  result: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess
): ForwardResultHandoffSuccess {
  const common: ForwardResultHandoffCommonSuccess = {
    schemaVersion: 1,
    kind: 'forward_evaluation_handoff',
    status: 'success',
    converged: result.converged,
    validation: copyValidation(result.validation),
    expectedReward: copyExpectedReward(result.expectedReward),
    expectedElapsedTime: copyExpectedElapsedTime(result.expectedElapsedTime),
    rewardRate: { ...result.rewardRate },
    contribution: copyContribution(result.contribution),
    diagnostics: copyDiagnostics(result.diagnostics),
    ...(result.reachability !== undefined
      ? { reachability: copyReachability(result.reachability) }
      : {}),
    warnings: warningsForSuccess(result),
    limitations: limitationsForSuccess(result)
  };

  if (result.modelKind === 'base') {
    return {
      ...common,
      modelKind: 'base'
    };
  }

  return {
    ...common,
    modelKind: 'reward_axes',
    rewardAxes: copyRewardAxes(result.rewardAxes),
    rewardAxesContribution: copyRewardAxesContribution(result.rewardAxesContribution)
  };
}

function summarizeFailure(result: ForwardEvaluationFailure): ForwardResultHandoffFailure {
  return {
    schemaVersion: 1,
    kind: 'forward_evaluation_handoff',
    status: 'failure',
    stage: result.stage,
    issues: result.issues.map((issue) => ({ ...issue })),
    ...(result.validation !== undefined
      ? { validation: copyValidation(result.validation) }
      : {})
  };
}

export function toForwardResultHandoff(result: ForwardEvaluationResult): ForwardResultHandoff {
  return result.ok ? summarizeSuccess(result) : summarizeFailure(result);
}

export function forwardResultHandoffToJson(handoff: ForwardResultHandoff): string {
  return JSON.stringify(handoff);
}

export function formatForwardResultHandoffPlainText(handoff: ForwardResultHandoff): string {
  if (handoff.status === 'failure') {
    return [
      'forward evaluation: failure',
      `stage: ${handoff.stage}`,
      `issues: ${handoff.issues.map((issue) => issue.code).join(', ')}`
    ].join('\n');
  }

  const reachability =
    handoff.reachability === undefined
      ? []
      : [`reachability from start: ${handoff.reachability.probabilityFromStart}`];
  const rewardAxes =
    handoff.modelKind === 'reward_axes'
      ? [
          `reward axes: ${Object.entries(handoff.rewardAxes.expectedRewardByAxis)
            .map(([axisId, value]) => `${axisId}=${value}`)
            .join(', ')}`
        ]
      : [];

  return [
    'forward evaluation: success',
    `model kind: ${handoff.modelKind}`,
    `converged: ${handoff.converged}`,
    `expected reward: ${handoff.expectedReward.expectedReward}`,
    `expected elapsed seconds: ${handoff.expectedElapsedTime.expectedElapsedTimeSeconds}`,
    `reward per hour: ${handoff.rewardRate.rewardPerHour ?? 'null'}`,
    ...reachability,
    ...rewardAxes,
    `warnings: ${handoff.warnings.map((warning) => warning.code).join(', ') || 'none'}`,
    `limitations: ${handoff.limitations.map((limitation) => limitation.code).join(', ')}`
  ].join('\n');
}
