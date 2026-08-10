import { describe, expect, it } from 'vitest';
import { evaluateAcyclicDirectDefinitionModel } from '../src/acyclic_direct_forward_evaluation';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import { DefinitionModel } from '../src/model';
import { stableSum } from '../src/stable_sum';

const rewardPermutationCases = [
  { rewards: [1e16, 1, -1e16, 3] },
  { rewards: [1e16, -1e16, 1, 3] },
  { rewards: [1, 3, 1e16, -1e16] },
  { rewards: [-1e16, 3, 1e16, 1] }
];

function cancellationModel(rewards: number[]): DefinitionModel {
  return {
    startState: 'start',
    states: [{ id: 'start' }, { id: 'done', terminal: true }],
    transitions: rewards.map((reward) => ({
      from: 'start',
      to: 'done',
      probability: 0.25,
      reward
    }))
  };
}

describe('forward numerical stability', () => {
  it('uses compensated Float64 summation for the canonical cancellation terms', () => {
    expect(stableSum([2.5e15, 0.25, -2.5e15, 0.75])).toBe(1);
  });

  it.each(rewardPermutationCases)(
    'keeps expected reward invariant across cancellation transition order %#',
    ({ rewards }) => {
      const model = cancellationModel(rewards);
      const iterative = evaluateDefinitionModel(model);
      const direct = evaluateAcyclicDirectDefinitionModel(model);

      expect(iterative.ok).toBe(true);
      if (iterative.ok) {
        expect(iterative.converged).toBe(true);
        expect(iterative.expectedReward.expectedReward).toBe(1);
      }

      expect(direct.ok).toBe(true);
      if (direct.ok) {
        expect(direct.expectedReward.expectedReward).toBe(1);
      }
    }
  );
});
