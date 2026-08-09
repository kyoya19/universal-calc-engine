import {
  ExternalModelDocument,
  ExternalModelParseResult,
  parseExternalModelDocument
} from './external_input';
import {
  ForwardBaseEvaluationSuccess,
  ForwardEvaluationFailure,
  ForwardEvaluationOptions,
  ForwardEvaluationStage,
  ForwardRewardAxesEvaluationSuccess,
  evaluateExternalModelInput
} from './forward_evaluation';
import { StateId } from './model';
import {
  ParameterValues,
  resolveParameterValues
} from './parameterized_scalars';

export type ScenarioComparisonParameterSets = {
  baseline: ParameterValues;
  candidate: ParameterValues;
};

export type ScenarioParameterDelta = {
  baseline: number;
  candidate: number;
  delta: number;
  changed: boolean;
};

export type ScenarioParameterComparison = {
  valuesByParameter: Record<string, ScenarioParameterDelta>;
  changedParameterIds: string[];
};

export type ScenarioForwardDelta = {
  expectedReward: number;
  expectedElapsedTimeSeconds: number;
  rewardPerSecond: number | null;
  rewardPerHour: number | null;
  reachabilityProbabilityFromStart?: number;
};

export type ScenarioContributionDeltaRow = {
  to: StateId;
  baselineContribution: number;
  candidateContribution: number;
  delta: number;
};

export type ScenarioContributionDelta = {
  transitionContributionsByState: Record<StateId, ScenarioContributionDeltaRow[]>;
};

export type ScenarioRewardAxesDelta = {
  expectedRewardByAxis: Record<string, number>;
};

export type ScenarioRewardAxesContributionDelta = {
  transitionContributionsByAxisByState: Record<
    string,
    Record<StateId, ScenarioContributionDeltaRow[]>
  >;
};

export type ScenarioComparisonKind = 'paired_scenario_difference';
export type ScenarioContributionDeltaKind = 'difference_of_existing_contributions';

export type BaseScenarioComparisonSuccess = {
  ok: true;
  modelKind: 'base';
  comparisonKind: ScenarioComparisonKind;
  contributionDeltaKind: ScenarioContributionDeltaKind;
  converged: boolean;
  parameters: ScenarioParameterComparison;
  baseline: ForwardBaseEvaluationSuccess;
  candidate: ForwardBaseEvaluationSuccess;
  delta: ScenarioForwardDelta;
  contributionDelta: ScenarioContributionDelta;
};

export type RewardAxesScenarioComparisonSuccess = {
  ok: true;
  modelKind: 'reward_axes';
  comparisonKind: ScenarioComparisonKind;
  contributionDeltaKind: ScenarioContributionDeltaKind;
  converged: boolean;
  parameters: ScenarioParameterComparison;
  baseline: ForwardRewardAxesEvaluationSuccess;
  candidate: ForwardRewardAxesEvaluationSuccess;
  delta: ScenarioForwardDelta;
  contributionDelta: ScenarioContributionDelta;
  rewardAxesDelta: ScenarioRewardAxesDelta;
  rewardAxesContributionDelta: ScenarioRewardAxesContributionDelta;
};

export type ScenarioComparisonFailureStage =
  | 'shared_input'
  | 'baseline'
  | 'candidate'
  | 'comparison';

export type ScenarioComparisonIssue = {
  code: string;
  path: string;
  message: string;
  sourceStage?: ForwardEvaluationStage;
};

export type ScenarioComparisonFailure = {
  ok: false;
  stage: ScenarioComparisonFailureStage;
  issues: ScenarioComparisonIssue[];
};

export type ScenarioComparisonResult =
  | BaseScenarioComparisonSuccess
  | RewardAxesScenarioComparisonSuccess
  | ScenarioComparisonFailure;

function parseFailure(
  result: Extract<ExternalModelParseResult, { ok: false }>
): ScenarioComparisonFailure {
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

function evaluationFailure(
  stage: 'baseline' | 'candidate',
  result: ForwardEvaluationFailure
): ScenarioComparisonFailure {
  return {
    ok: false,
    stage,
    issues: result.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      message: issue.message,
      sourceStage: issue.stage
    }))
  };
}

function comparisonFailure(error: unknown): ScenarioComparisonFailure {
  return {
    ok: false,
    stage: 'comparison',
    issues: [
      {
        code: 'scenario_comparison_failed',
        path: '$',
        message: error instanceof Error ? error.message : 'Scenario comparison failed'
      }
    ]
  };
}

function withParameterValues(
  document: ExternalModelDocument,
  parameterValues: ParameterValues
): ExternalModelDocument {
  if (document.modelKind === 'base') {
    return {
      schemaVersion: document.schemaVersion,
      modelKind: 'base',
      model: document.model,
      parameterValues: { ...parameterValues }
    };
  }

  return {
    schemaVersion: document.schemaVersion,
    modelKind: 'reward_axes',
    model: document.model,
    parameterValues: { ...parameterValues }
  };
}

function compareParameterValues(
  document: ExternalModelDocument,
  scenarios: ScenarioComparisonParameterSets
): ScenarioParameterComparison {
  const baseline = resolveParameterValues(
    document.model.parameters,
    scenarios.baseline
  );
  const candidate = resolveParameterValues(
    document.model.parameters,
    scenarios.candidate
  );

  const valuesByParameter: Record<string, ScenarioParameterDelta> = {};
  const changedParameterIds: string[] = [];

  for (const parameter of document.model.parameters) {
    const baselineValue = baseline[parameter.id] as number;
    const candidateValue = candidate[parameter.id] as number;
    const changed = !Object.is(baselineValue, candidateValue);
    valuesByParameter[parameter.id] = {
      baseline: baselineValue,
      candidate: candidateValue,
      delta: candidateValue - baselineValue,
      changed
    };
    if (changed) {
      changedParameterIds.push(parameter.id);
    }
  }

  return { valuesByParameter, changedParameterIds };
}

function subtractNullable(
  baseline: number | null,
  candidate: number | null
): number | null {
  return baseline === null || candidate === null
    ? null
    : candidate - baseline;
}

function compareForwardDelta(
  baseline: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess,
  candidate: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess
): ScenarioForwardDelta {
  const delta: ScenarioForwardDelta = {
    expectedReward:
      candidate.expectedReward.expectedReward - baseline.expectedReward.expectedReward,
    expectedElapsedTimeSeconds:
      candidate.expectedElapsedTime.expectedElapsedTimeSeconds -
      baseline.expectedElapsedTime.expectedElapsedTimeSeconds,
    rewardPerSecond: subtractNullable(
      baseline.rewardRate.rewardPerSecond,
      candidate.rewardRate.rewardPerSecond
    ),
    rewardPerHour: subtractNullable(
      baseline.rewardRate.rewardPerHour,
      candidate.rewardRate.rewardPerHour
    )
  };

  if (baseline.reachability !== undefined || candidate.reachability !== undefined) {
    if (baseline.reachability === undefined || candidate.reachability === undefined) {
      throw new Error('Scenario reachability structures do not match');
    }
    if (
      JSON.stringify(baseline.reachability.targetStates) !==
      JSON.stringify(candidate.reachability.targetStates)
    ) {
      throw new Error('Scenario reachability targets do not match');
    }
    delta.reachabilityProbabilityFromStart =
      candidate.reachability.probabilityFromStart -
      baseline.reachability.probabilityFromStart;
  }

  return delta;
}

function compareContributionRows(
  baseline: Array<{ to: StateId; contribution: number }>,
  candidate: Array<{ to: StateId; contribution: number }>,
  path: string
): ScenarioContributionDeltaRow[] {
  if (baseline.length !== candidate.length) {
    throw new Error(`Scenario contribution row count mismatch at ${path}`);
  }

  return baseline.map((baselineRow, index) => {
    const candidateRow = candidate[index];
    if (candidateRow === undefined || candidateRow.to !== baselineRow.to) {
      throw new Error(`Scenario contribution structure mismatch at ${path}[${index}]`);
    }
    return {
      to: baselineRow.to,
      baselineContribution: baselineRow.contribution,
      candidateContribution: candidateRow.contribution,
      delta: candidateRow.contribution - baselineRow.contribution
    };
  });
}

function compareLegacyContributions(
  baseline: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess,
  candidate: ForwardBaseEvaluationSuccess | ForwardRewardAxesEvaluationSuccess
): ScenarioContributionDelta {
  const transitionContributionsByState: Record<
    StateId,
    ScenarioContributionDeltaRow[]
  > = {};

  const stateIds = new Set([
    ...Object.keys(baseline.contribution.transitionContributionsByState),
    ...Object.keys(candidate.contribution.transitionContributionsByState)
  ]);

  for (const stateId of stateIds) {
    const baselineRows =
      baseline.contribution.transitionContributionsByState[stateId] ?? [];
    const candidateRows =
      candidate.contribution.transitionContributionsByState[stateId] ?? [];
    transitionContributionsByState[stateId] = compareContributionRows(
      baselineRows,
      candidateRows,
      `contribution.${stateId}`
    );
  }

  return { transitionContributionsByState };
}

function compareRewardAxes(
  baseline: ForwardRewardAxesEvaluationSuccess,
  candidate: ForwardRewardAxesEvaluationSuccess
): ScenarioRewardAxesDelta {
  const expectedRewardByAxis: Record<string, number> = {};
  const baselineAxisIds = baseline.rewardAxes.rewardAxes.map((axis) => axis.id);
  const candidateAxisIds = candidate.rewardAxes.rewardAxes.map((axis) => axis.id);

  if (JSON.stringify(baselineAxisIds) !== JSON.stringify(candidateAxisIds)) {
    throw new Error('Scenario reward-axis definitions do not match');
  }

  for (const axisId of baselineAxisIds) {
    expectedRewardByAxis[axisId] =
      (candidate.rewardAxes.expectedRewardByAxis[axisId] ?? 0) -
      (baseline.rewardAxes.expectedRewardByAxis[axisId] ?? 0);
  }

  return { expectedRewardByAxis };
}

function compareRewardAxisContributions(
  baseline: ForwardRewardAxesEvaluationSuccess,
  candidate: ForwardRewardAxesEvaluationSuccess
): ScenarioRewardAxesContributionDelta {
  const transitionContributionsByAxisByState: Record<
    string,
    Record<StateId, ScenarioContributionDeltaRow[]>
  > = {};

  const axisIds = baseline.rewardAxes.rewardAxes.map((axis) => axis.id);
  for (const axisId of axisIds) {
    const baselineByState =
      baseline.rewardAxesContribution.transitionContributionsByAxisByState[axisId] ?? {};
    const candidateByState =
      candidate.rewardAxesContribution.transitionContributionsByAxisByState[axisId] ?? {};
    const stateIds = new Set([
      ...Object.keys(baselineByState),
      ...Object.keys(candidateByState)
    ]);
    const byState: Record<StateId, ScenarioContributionDeltaRow[]> = {};

    for (const stateId of stateIds) {
      byState[stateId] = compareContributionRows(
        baselineByState[stateId] ?? [],
        candidateByState[stateId] ?? [],
        `rewardAxesContribution.${axisId}.${stateId}`
      );
    }

    transitionContributionsByAxisByState[axisId] = byState;
  }

  return { transitionContributionsByAxisByState };
}

function evaluateScenario(
  document: ExternalModelDocument,
  parameterValues: ParameterValues,
  options: ForwardEvaluationOptions
) {
  return evaluateExternalModelInput(
    withParameterValues(document, parameterValues),
    options
  );
}

export function compareExternalModelScenarios(
  input: unknown,
  scenarios: ScenarioComparisonParameterSets,
  options: ForwardEvaluationOptions = {}
): ScenarioComparisonResult {
  const parsed = parseExternalModelDocument(input);
  if (!parsed.ok) {
    return parseFailure(parsed);
  }

  const baseline = evaluateScenario(parsed.document, scenarios.baseline, options);
  if (!baseline.ok) {
    return evaluationFailure('baseline', baseline);
  }

  const candidate = evaluateScenario(parsed.document, scenarios.candidate, options);
  if (!candidate.ok) {
    return evaluationFailure('candidate', candidate);
  }

  try {
    const parameters = compareParameterValues(parsed.document, scenarios);
    const delta = compareForwardDelta(baseline, candidate);
    const contributionDelta = compareLegacyContributions(baseline, candidate);

    if (parsed.document.modelKind === 'base') {
      if (baseline.modelKind !== 'base' || candidate.modelKind !== 'base') {
        throw new Error('Scenario model kind mismatch for base model');
      }
      return {
        ok: true,
        modelKind: 'base',
        comparisonKind: 'paired_scenario_difference',
        contributionDeltaKind: 'difference_of_existing_contributions',
        converged: baseline.converged && candidate.converged,
        parameters,
        baseline,
        candidate,
        delta,
        contributionDelta
      };
    }

    if (
      baseline.modelKind !== 'reward_axes' ||
      candidate.modelKind !== 'reward_axes'
    ) {
      throw new Error('Scenario model kind mismatch for reward-axes model');
    }

    return {
      ok: true,
      modelKind: 'reward_axes',
      comparisonKind: 'paired_scenario_difference',
      contributionDeltaKind: 'difference_of_existing_contributions',
      converged: baseline.converged && candidate.converged,
      parameters,
      baseline,
      candidate,
      delta,
      contributionDelta,
      rewardAxesDelta: compareRewardAxes(baseline, candidate),
      rewardAxesContributionDelta: compareRewardAxisContributions(
        baseline,
        candidate
      )
    };
  } catch (error) {
    return comparisonFailure(error);
  }
}

export function scenarioComparisonResultToJson(
  result: ScenarioComparisonResult
): string {
  return JSON.stringify(result);
}
