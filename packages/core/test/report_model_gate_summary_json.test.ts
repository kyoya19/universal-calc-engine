import { describe, expect, test } from 'vitest';
import {
  generatedTargetSolverGateResultSummaryToReportModel,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult
} from '../src';
import { representativeSugorokuModel } from './fixtures/sugoroku';

describe('generated target solver gate summary report JSON boundary', () => {
  test('keeps rejected gate summary report rows stable after JSON serialization', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const summary = summarizeGeneratedTargetSolverGateResult(result);
    const reportModel = generatedTargetSolverGateResultSummaryToReportModel(summary);
    const serializedReportModel = JSON.parse(JSON.stringify(reportModel));
    const rows = serializedReportModel.sections[0]!.rows as Array<{
      id: string;
      plainText: string;
      status: string;
      metadata: { value: unknown };
    }>;

    expect(serializedReportModel).toMatchObject({
      kind: 'generated_target_solver_gate_summary',
      title: 'Generated Target Solver Gate Summary'
    });
    expect(rows.map((row) => row.id)).toEqual([
      'accepted',
      'edgeCount',
      'generatedTargetReadyEdgeCount',
      'rejectionCode',
      'rejectionType',
      'rejectionMessage'
    ]);
    expect(rows.find((row) => row.id === 'accepted')).toMatchObject({
      plainText: 'accepted: false',
      status: 'rejected',
      metadata: { value: false }
    });
    expect(rows.find((row) => row.id === 'rejectionCode')).toMatchObject({
      plainText: 'rejectionCode: missing_generated_target',
      status: 'rejected',
      metadata: { value: 'missing_generated_target' }
    });
    expect(rows.find((row) => row.id === 'rejectionMessage')).toMatchObject({
      plainText: `rejectionMessage: ${summary.rejectionMessage}`,
      status: 'rejected',
      metadata: { value: summary.rejectionMessage }
    });
  });
});
