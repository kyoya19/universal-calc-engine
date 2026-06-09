import { describe, expect, test } from 'vitest';
import { toContributionResult, toOutputResult } from '../src';
import {
  buildGeneratedTargetComparisonReport,
  formatGeneratedTargetComparisonReport,
  formatGeneratedTargetSolverGateResultSummary,
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult
} from '../src/generated_target_solver_adapter';
import {
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel,
  representativeSugorokuStartExpectedReward
} from './fixtures/sugoroku';

describe('generated target solver gated wrapper', () => {
  test('runs the existing explicit-target solver after generated-target validation succeeds', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const output = toOutputResult(representativeSugorokuModel, result.solvedModel);

    expect(output.expectedReward).toBe(representativeSugorokuStartExpectedReward);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(0)]);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(1)]);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(2)]);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(3)]);
  });

  test('summarizes an accepted generated-target gate result', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(summarizeGeneratedTargetSolverGateResult(result)).toEqual({
      accepted: true,
      edgeCount: result.graph.edges.length,
      generatedTargetReadyEdgeCount: result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length
    });
  });

  test('formats an accepted generated-target gate summary', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const summary = summarizeGeneratedTargetSolverGateResult(result);

    expect(formatGeneratedTargetSolverGateResultSummary(summary)).toBe(
      [
        'accepted: true',
        `edgeCount: ${result.graph.edges.length}`,
        `generatedTargetReadyEdgeCount: ${result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length}`
      ].join('\n')
    );
  });

  test('builds a matching generated-target comparison report', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(report).toEqual({
      edgeCount: result.graph.edges.length,
      matchCount: result.graph.edges.length,
      missingGeneratedTargetCount: 0,
      explicitGeneratedMismatchCount: 0,
      rows: result.graph.edges.map((edge) => ({
        from: edge.from,
        explicitTo: edge.explicitTo,
        generatedTo: edge.generatedTo,
        status: 'match'
      }))
    });
  });

  test('formats a matching generated-target comparison report', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(formatGeneratedTargetComparisonReport(report)).toContain('matchCount: 4');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('missingGeneratedTargetCount: 0');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('explicitGeneratedMismatchCount: 0');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('status: match');
  });

  test('rejects before solving when a generated target is missing', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });

    expect(result).toMatchObject({
      accepted: false,
      rejection: {
        type: 'missing_generated_target',
        edge: {
          from: positionStateId(0),
          explicitTo: positionStateId(1)
        }
      }
    });
  });

  test('summarizes a rejected generated-target gate result', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });

    expect(summarizeGeneratedTargetSolverGateResult(result)).toEqual({
      accepted: false,
      edgeCount: result.graph.edges.length,
      generatedTargetReadyEdgeCount: result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length,
      rejectionCode: 'missing_generated_target',
      rejectionType: 'missing_generated_target',
      rejectionMessage: `Generated target is missing for edge from ${positionStateId(0)} to ${positionStateId(1)}`
    });
  });

  test('formats a rejected generated-target gate summary', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const summary = summarizeGeneratedTargetSolverGateResult(result);

    expect(formatGeneratedTargetSolverGateResultSummary(summary)).toBe(
      [
        'accepted: false',
        `edgeCount: ${result.graph.edges.length}`,
        `generatedTargetReadyEdgeCount: ${result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length}`,
        'rejectionCode: missing_generated_target',
        'rejectionType: missing_generated_target',
        `rejectionMessage: Generated target is missing for edge from ${positionStateId(0)} to ${positionStateId(1)}`
      ].join('\n')
    );
  });

  test('builds a missing generated target comparison report', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(report.edgeCount).toBe(result.graph.edges.length);
    expect(report.matchCount).toBe(result.graph.edges.length - 1);
    expect(report.missingGeneratedTargetCount).toBe(1);
    expect(report.explicitGeneratedMismatchCount).toBe(0);
    expect(report.rows[0]).toEqual({
      from: positionStateId(0),
      explicitTo: positionStateId(1),
      generatedTo: undefined,
      status: 'missing_generated_target'
    });
  });

  test('formats a missing generated target comparison report', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(formatGeneratedTargetComparisonReport(report)).toContain('missingGeneratedTargetCount: 1');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('generatedTo: <missing>');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('status: missing_generated_target');
  });

  test('rejects before evaluating probabilities when a generated target is missing', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...transitionWithoutEffects, probability: 0.25 },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
      accepted: false,
      rejection: {
        type: 'missing_generated_target',
        edge: {
          from: positionStateId(0),
          explicitTo: positionStateId(1)
        }
      }
    });
  });

  test('rejects before solving when explicit/generated targets mismatch', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
      accepted: false,
      rejection: {
        type: 'explicit_generated_mismatch',
        edge: {
          from: positionStateId(0),
          explicitTo: 'legacy_pos_1',
          generatedTo: positionStateId(1)
        }
      }
    });
  });

  test('builds an explicit/generated mismatch comparison report', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(report.edgeCount).toBe(result.graph.edges.length);
    expect(report.matchCount).toBe(result.graph.edges.length - 1);
    expect(report.missingGeneratedTargetCount).toBe(0);
    expect(report.explicitGeneratedMismatchCount).toBe(1);
    expect(report.rows[0]).toEqual({
      from: positionStateId(0),
      explicitTo: 'legacy_pos_1',
      generatedTo: positionStateId(1),
      status: 'explicit_generated_mismatch'
    });
  });

  test('formats an explicit/generated mismatch comparison report', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const report = buildGeneratedTargetComparisonReport(result.graph);

    expect(formatGeneratedTargetComparisonReport(report)).toContain('explicitGeneratedMismatchCount: 1');
    expect(formatGeneratedTargetComparisonReport(report)).toContain('explicitTo: legacy_pos_1');
    expect(formatGeneratedTargetComparisonReport(report)).toContain(`generatedTo: ${positionStateId(1)}`);
    expect(formatGeneratedTargetComparisonReport(report)).toContain('status: explicit_generated_mismatch');
  });

  test('rejects before evaluating probabilities when explicit/generated targets mismatch', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1', probability: 0.25 },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
      accepted: false,
      rejection: {
        type: 'explicit_generated_mismatch',
        edge: {
          from: positionStateId(0),
          explicitTo: 'legacy_pos_1',
          generatedTo: positionStateId(1)
        }
      }
    });
  });

  test('keeps contribution output explicit-target based after the gate accepts', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const contributions = toContributionResult(result.evaluatedModel, result.solvedModel);

    expect(contributions.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: representativeSugorokuExpectedRewardByState[positionStateId(1)],
        contribution: 1.25
      },
      {
        to: positionStateId(2),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: representativeSugorokuExpectedRewardByState[positionStateId(2)],
        contribution: 1
      }
    ]);
  });
});
