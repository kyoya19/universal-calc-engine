import {
  buildGeneratedTargetComparisonReport,
  generatedTargetComparisonReportToReportModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult
} from '../../src';
import { positionStateId, representativeSugorokuModel } from './sugoroku';

export function buildGeneratedTargetComparisonReportModelFixture() {
  const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
  const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
  const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);

  return {
    comparisonReport,
    reportModel
  };
}

export function buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture() {
  const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
  const summary = summarizeGeneratedTargetSolverGateResult(result);
  const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

  return {
    result,
    summary,
    reportModel
  };
}

export function buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture() {
  const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
  const result = solveExpectedRewardWithGeneratedTargetGate({
    ...representativeSugorokuModel,
    transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
  });
  const summary = summarizeGeneratedTargetSolverGateResult(result);
  const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

  return {
    result,
    summary,
    reportModel
  };
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
  const comparisonReport = buildGeneratedTargetComparisonReport(result.graph);
  const reportModel = generatedTargetComparisonReportToReportModel(comparisonReport);

  return {
    result,
    comparisonReport,
    reportModel
  };
}

export function buildExplicitGeneratedMismatchSolverGateSummaryReportModelFixture() {
  const result = buildExplicitGeneratedMismatchSolverGateResultFixture();
  const summary = summarizeGeneratedTargetSolverGateResult(result);
  const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);

  return {
    result,
    summary,
    reportModel
  };
}

export const explicitGeneratedMismatchFixture = {
  from: positionStateId(0),
  explicitTo: positionStateId(1),
  generatedTo: positionStateId(2)
} as const;
