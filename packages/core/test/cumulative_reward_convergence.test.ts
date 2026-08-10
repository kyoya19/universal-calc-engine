import { describe, expect, it } from 'vitest';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import { DefinitionModel } from '../src/model';

describe('cyclic cumulative reward convergence guard', () => {
  it('does not report an alternating no-limit cumulative reward as converged', () => {
    const model: DefinitionModel = {
      startState: 'A',
      states: [{ id: 'A' }, { id: 'B' }],
      transitions: [
        { from: 'A', to: 'B', probability: 1, reward: 1 },
        { from: 'B', to: 'A', probability: 1, reward: -1 }
      ]
    };

    const result = evaluateDefinitionModel(model, {
      solver: { maxIterations: 20, tolerance: 1e-12 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.converged).toBe(false);
    expect(result.diagnostics.expectedReward.converged).toBe(false);
    expect(result.diagnostics.expectedReward.iterations).toBe(20);
    expect(result.diagnostics.expectedReward.lastMaxDelta).toBe(1);
  });

  it('keeps an absorbing cyclic cumulative reward converged', () => {
    const model: DefinitionModel = {
      startState: 'S',
      states: [{ id: 'S' }, { id: 'T', terminal: true }],
      transitions: [
        {
          from: 'S',
          to: 'S',
          probability: 0.4,
          reward: 1,
          elapsedTime: { value: 2, unit: 'seconds' }
        },
        {
          from: 'S',
          to: 'T',
          probability: 0.6,
          reward: 5,
          elapsedTime: { value: 3, unit: 'seconds' }
        }
      ]
    };

    const result = evaluateDefinitionModel(model, {
      reachabilityTargets: ['T']
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.converged).toBe(true);
    expect(result.diagnostics.expectedReward.converged).toBe(true);
    expect(result.expectedReward.expectedReward).toBeCloseTo(17 / 3, 12);
    expect(result.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(13 / 3, 12);
    expect(result.reachability?.probabilityFromStart).toBeCloseTo(1, 12);
  });

  it('does not add a false reward divergence to a zero-reward closed cycle', () => {
    const model: DefinitionModel = {
      startState: 'S',
      states: [{ id: 'S' }],
      transitions: [{ from: 'S', to: 'S', probability: 1, reward: 0 }]
    };

    const result = evaluateDefinitionModel(model, {
      solver: { maxIterations: 20, tolerance: 1e-12 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.diagnostics.expectedReward.converged).toBe(true);
    expect(result.expectedReward.expectedReward).toBe(0);
  });
});
