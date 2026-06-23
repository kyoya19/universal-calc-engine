import { describe, expect, test } from 'vitest';
import {
  definitionModelToBoundaryReportDigest,
  evaluateModel,
  expandModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  outputResultToJson,
  solveExpectedReward,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult,
  toContributionResult,
  toOutputResult
} from '../src';
import type { DefinitionModel } from '../src';
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

  test('keeps fixed digipachi cash and held ball EV stable after JSON serialization', () => {
    const cashSpin = 'state:{lane=cash,outcome=spin}';
    const heldBallSpin = 'state:{lane=held_ball,outcome=spin}';
    const cashHit = 'state:{lane=cash,outcome=hit}';
    const cashMiss = 'state:{lane=cash,outcome=miss}';
    const heldBallHit = 'state:{lane=held_ball,outcome=hit}';
    const heldBallMiss = 'state:{lane=held_ball,outcome=miss}';
    const jackpotProbability = 1 / 200;
    const cashSpinCostYen = 250;
    const heldBallSpinCostYen = 200;
    const averagePayoutYen = 35000;
    const digipachiFixedEvModel: DefinitionModel = {
      startState: cashSpin,
      states: [
        { id: cashSpin, properties: { lane: 'cash', outcome: 'spin' } },
        { id: heldBallSpin, properties: { lane: 'held_ball', outcome: 'spin' } },
        { id: cashHit, terminal: true, properties: { lane: 'cash', outcome: 'hit' } },
        { id: cashMiss, terminal: true, properties: { lane: 'cash', outcome: 'miss' } },
        { id: heldBallHit, terminal: true, properties: { lane: 'held_ball', outcome: 'hit' } },
        { id: heldBallMiss, terminal: true, properties: { lane: 'held_ball', outcome: 'miss' } }
      ],
      transitions: [
        {
          from: cashSpin,
          to: cashHit,
          probability: jackpotProbability,
          reward: averagePayoutYen - cashSpinCostYen,
          effects: [{ type: 'set_property', property: 'outcome', value: 'hit' }]
        },
        {
          from: cashSpin,
          to: cashMiss,
          probability: 1 - jackpotProbability,
          reward: -cashSpinCostYen,
          effects: [{ type: 'set_property', property: 'outcome', value: 'miss' }]
        },
        {
          from: heldBallSpin,
          to: heldBallHit,
          probability: jackpotProbability,
          reward: averagePayoutYen - heldBallSpinCostYen,
          effects: [{ type: 'set_property', property: 'outcome', value: 'hit' }]
        },
        {
          from: heldBallSpin,
          to: heldBallMiss,
          probability: 1 - jackpotProbability,
          reward: -heldBallSpinCostYen,
          effects: [{ type: 'set_property', property: 'outcome', value: 'miss' }]
        }
      ]
    };

    const expanded = expandModel(digipachiFixedEvModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(digipachiFixedEvModel, solved);
    const contributions = toContributionResult(evaluated, solved);
    const digest = definitionModelToBoundaryReportDigest(digipachiFixedEvModel);
    const serializedOutput = JSON.parse(outputResultToJson(output));

    expect(output.expectedRewardByState[cashSpin]).toBeCloseTo(-75);
    expect(output.expectedRewardByState[heldBallSpin]).toBeCloseTo(-25);
    expect(contributions.transitionContributionsByState[cashSpin]![0]!.contribution).toBeCloseTo(173.75);
    expect(contributions.transitionContributionsByState[cashSpin]![1]!.contribution).toBeCloseTo(-248.75);
    expect(serializedOutput.expectedRewardByState[cashSpin]).toBeCloseTo(-75);
    expect(serializedOutput.expectedRewardByState[heldBallSpin]).toBeCloseTo(-25);
    expect(digest.statusOverview.level).toBe('ok');
    expect(digest.reportText).toContain('Transition Probability Audit');
  });
});