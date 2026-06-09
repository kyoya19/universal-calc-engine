import {
  buildGeneratedTargetComparisonReport,
  generatedTargetComparisonReportToReportModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult
} from '../../src';
import { representativeSugorokuModel } from './sugoroku';

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
