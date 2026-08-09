import { describe, expect, it } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime,
  solveExpectedReward,
  solveReachabilityProbability
} from '../src/model';
import {
  RewardAxesDefinitionModel,
  evaluateRewardAxesModel,
  expandRewardAxesModel,
  solveExpectedRewardAxes
} from '../src/reward_axes';
import {
  solveExpectedElapsedTimeWithDiagnostics,
  solveExpectedRewardAxesWithDiagnostics,
  solveExpectedRewardWithDiagnostics,
  solveReachabilityProbabilityWithDiagnostics,
  solverConvergenceDiagnosticsToJson
} from '../src/solver_diagnostics';

function evaluated(model: DefinitionModel) {
  return evaluateModel(expandModel(model));
}

describe('solver convergence diagnostics', () => {
  it('preserves expected reward results while reporting convergence metadata', () => {
    const model = evaluated({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 1, reward: 25 }]
    });

    const legacy = solveExpectedReward(model);
    const detailed = solveExpectedRewardWithDiagnostics(model);

    expect(detailed.result.expectedRewardByState.get('start')).toBe(
      legacy.expectedRewardByState.get('start')
    );
    expect(detailed.diagnostics.solverKind).toBe('expected_reward');
    expect(detailed.diagnostics.converged).toBe(true);
    expect(detailed.diagnostics.iterations).toBeGreaterThan(0);
    expect(detailed.diagnostics.maxIterations).toBe(10_000);
    expect(detailed.diagnostics.tolerance).toBe(1e-12);
    expect(detailed.diagnostics.lastMaxDelta).toBeLessThan(1e-12);
  });

  it('returns a non-converged approximate result instead of throwing in the diagnostic API', () => {
    const model = evaluated({
      startState: 'loop',
      states: [{ id: 'loop' }],
      transitions: [{ from: 'loop', to: 'loop', probability: 1, reward: 1 }]
    });

    const detailed = solveExpectedRewardWithDiagnostics(model, {
      maxIterations: 3,
      tolerance: 1e-12
    });

    expect(detailed.diagnostics.converged).toBe(false);
    expect(detailed.diagnostics.iterations).toBe(3);
    expect(detailed.diagnostics.lastMaxDelta).toBe(1);
    expect(detailed.result.expectedRewardByState.get('loop')).toBe(3);
  });

  it('reports reachability target context and preserves the legacy result', () => {
    const model = evaluated({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.6 }
      ]
    });

    const legacy = solveReachabilityProbability(model, ['win']);
    const detailed = solveReachabilityProbabilityWithDiagnostics(model, ['win']);

    expect(detailed.result.reachabilityProbabilityByState.get('start')).toBe(
      legacy.reachabilityProbabilityByState.get('start')
    );
    expect(detailed.diagnostics.context?.targetStates).toEqual(['win']);
    expect(detailed.diagnostics.solverKind).toBe('reachability_probability');
    expect(detailed.diagnostics.converged).toBe(true);
  });

  it('preserves expected elapsed time results with explicit diagnostics', () => {
    const model = evaluated({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          elapsedTime: { value: 2, unit: 'minutes' }
        }
      ]
    });

    const legacy = solveExpectedElapsedTime(model);
    const detailed = solveExpectedElapsedTimeWithDiagnostics(model);

    expect(detailed.result.expectedElapsedTimeSecondsByState.get('start')).toBe(
      legacy.expectedElapsedTimeSecondsByState.get('start')
    );
    expect(detailed.diagnostics.solverKind).toBe('expected_elapsed_time');
    expect(detailed.diagnostics.converged).toBe(true);
  });

  it('reports independent convergence diagnostics for every named reward axis', () => {
    const definition: RewardAxesDefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      rewardAxes: [
        { id: 'revenue', unit: 'JPY', kind: 'benefit' },
        { id: 'cost', unit: 'JPY', kind: 'cost' }
      ],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          rewardsByAxis: { revenue: 1000, cost: 250 }
        }
      ]
    };
    const model = evaluateRewardAxesModel(expandRewardAxesModel(definition));

    const legacy = solveExpectedRewardAxes(model);
    const detailed = solveExpectedRewardAxesWithDiagnostics(model);

    expect(detailed.result.expectedRewardByAxisByState.get('revenue')?.get('start')).toBe(
      legacy.expectedRewardByAxisByState.get('revenue')?.get('start')
    );
    expect(detailed.result.expectedRewardByAxisByState.get('cost')?.get('start')).toBe(
      legacy.expectedRewardByAxisByState.get('cost')?.get('start')
    );
    expect(detailed.converged).toBe(true);
    expect(detailed.diagnosticsByAxis.revenue?.context?.rewardAxisId).toBe('revenue');
    expect(detailed.diagnosticsByAxis.cost?.context?.rewardAxisId).toBe('cost');
    expect(detailed.diagnosticsByAxis.revenue?.solverKind).toBe('expected_reward_axis');
  });

  it('serializes machine-readable diagnostics', () => {
    const model = evaluated({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 1 }]
    });
    const diagnostics = solveExpectedRewardWithDiagnostics(model).diagnostics;

    const parsed = JSON.parse(solverConvergenceDiagnosticsToJson(diagnostics)) as {
      solverKind: string;
      converged: boolean;
      iterations: number;
    };

    expect(parsed.solverKind).toBe('expected_reward');
    expect(parsed.converged).toBe(true);
    expect(parsed.iterations).toBeGreaterThan(0);
  });
});
