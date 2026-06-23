import { describe, expect, test } from 'vitest';
import {
  contributionResultToJson,
  contributionResultToTex,
  definitionModelToBoundaryReportDigest,
  evaluateModel,
  expandModel,
  generatedTargetSolverGateResultSummaryToReportModel,
  outputResultToJson,
  outputResultToTex,
  outputResultToValueFunctionTex,
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

  test('keeps Beast mini JSON TeX and digest output boundaries stable', () => {
    const normal = 'state:{phase=normal}';
    const high = 'state:{phase=high}';
    const cz = 'state:{phase=cz}';
    const at = 'state:{phase=at}';
    const normalMiss = 'state:{phase=normal_miss}';
    const highMiss = 'state:{phase=high_miss}';
    const czMiss = 'state:{phase=cz_miss}';
    const atEnd = 'state:{phase=at_end}';
    const beastMiniModel: DefinitionModel = {
      startState: normal,
      states: [
        { id: normal, properties: { phase: 'normal' } },
        { id: high, properties: { phase: 'high' } },
        { id: cz, properties: { phase: 'cz' } },
        { id: at, properties: { phase: 'at' } },
        { id: normalMiss, terminal: true, properties: { phase: 'normal_miss' } },
        { id: highMiss, terminal: true, properties: { phase: 'high_miss' } },
        { id: czMiss, terminal: true, properties: { phase: 'cz_miss' } },
        { id: atEnd, terminal: true, properties: { phase: 'at_end' } }
      ],
      transitions: [
        {
          from: normal,
          to: high,
          probability: 0.2,
          effects: [{ type: 'set_property', property: 'phase', value: 'high' }]
        },
        {
          from: normal,
          to: normalMiss,
          probability: 0.8,
          effects: [{ type: 'set_property', property: 'phase', value: 'normal_miss' }]
        },
        {
          from: high,
          to: cz,
          probability: 0.5,
          effects: [{ type: 'set_property', property: 'phase', value: 'cz' }]
        },
        {
          from: high,
          to: highMiss,
          probability: 0.5,
          effects: [{ type: 'set_property', property: 'phase', value: 'high_miss' }]
        },
        {
          from: cz,
          to: at,
          probability: 0.4,
          effects: [{ type: 'set_property', property: 'phase', value: 'at' }]
        },
        {
          from: cz,
          to: czMiss,
          probability: 0.6,
          effects: [{ type: 'set_property', property: 'phase', value: 'cz_miss' }]
        },
        {
          from: at,
          to: atEnd,
          probability: 1,
          reward: 100,
          effects: [{ type: 'set_property', property: 'phase', value: 'at_end' }]
        }
      ]
    };

    const expanded = expandModel(beastMiniModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(beastMiniModel, solved);
    const contributions = toContributionResult(evaluated, solved);
    const digest = definitionModelToBoundaryReportDigest(beastMiniModel);
    const serializedOutput = JSON.parse(outputResultToJson(output));
    const serializedContributions = JSON.parse(contributionResultToJson(contributions));
    const serializedDigest = JSON.parse(JSON.stringify(digest));
    const outputTex = outputResultToTex(output);
    const valueFunctionTex = outputResultToValueFunctionTex(output);
    const contributionTex = contributionResultToTex(contributions);

    expect(serializedOutput).toMatchObject({
      startState: normal,
      expectedReward: 4,
      expectedRewardByState: {
        [normal]: 4,
        [high]: 20,
        [cz]: 40,
        [at]: 100
      }
    });
    expect(serializedContributions.transitionContributionsByState[normal][0].contribution).toBeCloseTo(4);
    expect(serializedContributions.transitionContributionsByState[normal][1].contribution).toBeCloseTo(0);
    expect(serializedDigest.reports.map((report: { kind: string }) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(serializedDigest.statusOverview.level).toBe('ok');
    expect(serializedDigest.reportText).toContain('Transition Probability Audit');
    expect(serializedDigest.reportText).toContain('Generated Target Comparison Report');
    expect(outputTex).toContain('\\begin{array}{c|r}');
    expect(valueFunctionTex).toContain('V(\\mathrm{state:\\{phase=normal\\}}) &= 4');
    expect(contributionTex).toContain('0.2 & 0 & 20 & 4');
  });
});
