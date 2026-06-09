import {
  buildGeneratedTargetComparisonReport,
  generatedTargetComparisonReportToReportModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult,
  type GeneratedTargetComparisonReport,
  type GeneratedTargetSolverGateResult,
  type GeneratedTargetSolverGateResultSummary,
  type ReportModel
} from '../../src';
import { positionStateId, representativeSugorokuModel } from './sugoroku';

type GeneratedTargetComparisonReportModelFixture = {
  result: GeneratedTargetSolverGateResult;
  comparisonReport: GeneratedTargetComparisonReport;
  reportModel: ReportModel;
};

type GeneratedTargetSolverGateSummaryReportModelFixture = {
  result: GeneratedTargetSolverGateResult;
  summary: GeneratedTargetSolverGateResultSummary;
  reportModel: ReportModel;
};

function buildGeneratedTargetComparisonReportModelFromResult(
  result: GeneratedTargetSolverGateResult
): GeneratedTargetComparisonReportModelFixture {
  const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
  const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);

  return {
    result,
    comparisonReport,
    reportModel
  };
}

function buildGeneratedTargetSolverGateSummaryReportModelFromResult(
  result: GeneratedTargetSolverGateResult
): GeneratedTargetSolverGateSummaryReportModelFixture {
  const summary = summarizeGeneratedTargetSolverGateResult(result);
  const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

  return {
    result,
    summary,
    reportModel
  };
}

export function buildGeneratedTargetComparisonReportModelFixture() {
  const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
  return buildGeneratedTargetComparisonReportModelFromResult(result);
}

export function buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture() {
  const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
  return buildGeneratedTargetSolverGateSummaryReportModelFromResult(result);
}

export function buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture() {
  const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
  const result = solveExpectedRewardWithGeneratedTargetGate({
    ...representativeSugorokuModel,
    transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
  });

  return buildGeneratedTargetSolverGateSummaryReportModelFromResult(result);
}

export function buildExplicitGeneratedMismatchSolverGateResultFixture() {
  const explicitGeneratedMismatchTransition = {
    ...representativeSugorokuModel.transitions[0]!,
    effects: [{ type: 'set_property' as const, property: 'position', value: 2 }]
  };

  return solveExpectedRewardWithGeneratedTargetGate({
    ...representativeSugorokuModel,
    transitions: [explicitGeneratedMismatchTransition, ...representativeSugorokuModel.transitions.slice(1)]
  });
}

export function buildExplicitGeneratedMismatchComparisonReportModelFixture() {
  const result = buildExplicitGeneratedMismatchSolverGateResultFixture();
  return buildGeneratedTargetComparisonReportModelFromResult(result);
}

export function buildExplicitGeneratedMismatchSolverGateSummaryReportModelFixture() {
  const result = buildExplicitGeneratedMismatchSolverGateResultFixture();
  return buildGeneratedTargetSolverGateSummaryReportModelFromResult(result);
}

export const explicitGeneratedMismatchFixture = {
  from: positionStateId(0),
  explicitTo: positionStateId(1),
  generatedTo: positionStateId(2)
} as const;
