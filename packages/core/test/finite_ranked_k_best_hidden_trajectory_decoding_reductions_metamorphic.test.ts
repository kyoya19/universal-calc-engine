import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import {
  coupledRows,
  hiddenRanks,
  monitorRows,
  oneMonitorRequest
} from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

function requirePossible(
  result: ReturnType<typeof decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence>
) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Candidate AG metamorphic fixture must be possible');
  return result;
}

const baseModel: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.65 },
    { from: 'a', to: 'b', probability: 0.35 },
    { from: 'b', to: 'a', probability: 0.25 },
    { from: 'b', to: 'b', probability: 0.75 }
  ]
};

describe('Candidate AG qualified reductions and metamorphics', () => {
  it('reduces all-one one-state-monitor evidence to exact finite Markov path ranking', () => {
    const request = oneMonitorRequest(
      baseModel,
      [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      1,
      4
    );
    const result = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([
      [['a', 'a']],
      [['b', 'b']],
      [['a', 'b']],
      [['b', 'a']]
    ]);
  });

  it('reduces one-state monitor state-local evidence to finite HMM ranked path decoding', () => {
    const request = oneMonitorRequest(
      baseModel,
      [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      1,
      4
    );
    request.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.4 }
    ];
    request.monitorCoupledTransitionEvidenceLikelihoodsByStep = [
      coupledRows(['a', 'b'], ['q'], (_q, _from, to) => (to === 'a' ? 0.9 : 0.3))
    ];
    const result = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        request
      )
    );
    expect(result.rankStrata![0]!.trajectories[0]!.hiddenStateIds).toEqual(['a', 'a']);
    expect(result.rankStrata![0]!.anchorJointProbability).toBeCloseTo(0.234, 14);
  });

  it('preserves rank identity and posterior probabilities under common legal evidence scaling', () => {
    const request = oneMonitorRequest(
      baseModel,
      [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      1,
      4
    );
    request.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.5 }
    ];
    const base = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        request
      )
    );
    const scaledRequest = structuredClone(request);
    scaledRequest.initialEvidenceLikelihoods = scaledRequest.initialEvidenceLikelihoods.map((entry) => ({
      ...entry,
      likelihood: entry.likelihood * 0.5
    }));
    const scaled = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        scaledRequest
      )
    );
    expect(hiddenRanks(scaled)).toEqual(hiddenRanks(base));
    for (let rank = 0; rank < base.rankStrata!.length; rank += 1) {
      expect(scaled.rankStrata![rank]!.anchorJointProbability).toBeCloseTo(
        base.rankStrata![rank]!.anchorJointProbability! * 0.5,
        14
      );
      for (let index = 0; index < base.rankStrata![rank]!.trajectories.length; index += 1) {
        expect(scaled.rankStrata![rank]!.trajectories[index]!.posteriorProbability).toBeCloseTo(
          base.rankStrata![rank]!.trajectories[index]!.posteriorProbability!,
          14
        );
      }
    }
  });

  it('is invariant under hidden-state relabeling', () => {
    const request = oneMonitorRequest(
      baseModel,
      [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      2,
      8
    );
    const original = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        request
      )
    );
    const relabeledModel: DefinitionModel = {
      startState: 'x',
      states: [{ id: 'x' }, { id: 'y' }],
      transitions: [
        { from: 'x', to: 'x', probability: 0.65 },
        { from: 'x', to: 'y', probability: 0.35 },
        { from: 'y', to: 'x', probability: 0.25 },
        { from: 'y', to: 'y', probability: 0.75 }
      ]
    };
    const relabeledRequest = oneMonitorRequest(
      relabeledModel,
      [
        { stateId: 'x', probability: 0.6 },
        { stateId: 'y', probability: 0.4 }
      ],
      2,
      8
    );
    const relabeled = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        relabeledModel,
        relabeledRequest
      )
    );
    const back = (state: StateId) => (state === 'x' ? 'a' : 'b');
    expect(
      hiddenRanks(relabeled).map((stratum) =>
        stratum.map((path) => path.map(back))
      )
    ).toEqual(hiddenRanks(original));
  });

  it('is invariant under monitor relabeling and request-entry ordering', () => {
    const states: StateId[] = ['a', 'b'];
    const qs = ['clean', 'seen'];
    const horizon = 2;
    const request: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      horizon,
      monitorStates: qs,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'clean' },
        { stateId: 'b', monitorStateId: 'seen' }
      ],
      monitorTransitionByStep: monitorRows(
        baseModel,
        horizon,
        qs,
        (q, _from, to) => (q === 'seen' || to === 'b' ? 'seen' : 'clean')
      ),
      initialEvidenceLikelihoods: [
        { stateId: 'a', likelihood: 0.9 },
        { stateId: 'b', likelihood: 0.7 }
      ],
      monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
        { length: horizon },
        () => coupledRows(states, qs, (q, _from, to) => (q === 'seen' ? 0.8 : to === 'a' ? 0.7 : 0.4))
      ),
      rankDepth: 8,
      kBestScoreTolerance: 1e-12,
      maxReturnedKBestTrajectories: 100
    };
    const original = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        request
      )
    );
    const rename = (q: string) => (q === 'clean' ? 'z0' : 'z1');
    const reordered: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      monitorStates: ['z1', 'z0'],
      initialMonitorStateByHiddenState: [...request.initialMonitorStateByHiddenState]
        .reverse()
        .map((entry) => ({ ...entry, monitorStateId: rename(entry.monitorStateId) })),
      monitorTransitionByStep: request.monitorTransitionByStep.map((row) =>
        [...row]
          .reverse()
          .map((entry) => ({
            ...entry,
            monitorStateId: rename(entry.monitorStateId),
            nextMonitorStateId: rename(entry.nextMonitorStateId)
          }))
      ),
      initialEvidenceLikelihoods: [...request.initialEvidenceLikelihoods].reverse(),
      monitorCoupledTransitionEvidenceLikelihoodsByStep:
        request.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) =>
          [...row]
            .reverse()
            .map((entry) => ({ ...entry, monitorStateId: rename(entry.monitorStateId) }))
        )
    };
    const changed = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        baseModel,
        reordered
      )
    );
    expect(hiddenRanks(changed)).toEqual(hiddenRanks(original));
    expect(changed.rankStrata!.map((entry) => entry.anchorLogJointProbability)).toEqual(
      original.rankStrata!.map((entry) => entry.anchorLogJointProbability)
    );
  });

  it('is invariant under equivalent parallel-transition split and merge', () => {
    const merged: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.5 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const split: DefinitionModel = {
      ...merged,
      transitions: [
        { from: 'a', to: 'a', probability: 0.2 },
        { from: 'a', to: 'a', probability: 0.3 },
        { from: 'a', to: 'b', probability: 0.5 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const initial = [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ];
    const left = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        merged,
        oneMonitorRequest(merged, initial, 2, 8)
      )
    );
    const right = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        split,
        oneMonitorRequest(split, initial, 2, 8)
      )
    );
    expect(hiddenRanks(right)).toEqual(hiddenRanks(left));
    for (let index = 0; index < left.rankStrata!.length; index += 1) {
      expect(right.rankStrata![index]!.anchorLogJointProbability).toBeCloseTo(
        left.rankStrata![index]!.anchorLogJointProbability,
        14
      );
    }
  });

  it('retains terminal self-state while applying monitor updates and coupled evidence', () => {
    const terminalModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const states: StateId[] = ['a', 'b'];
    const qs = ['q0', 'q1'];
    const horizon = 2;
    const request: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      horizon,
      monitorStates: qs,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'q0' },
        { stateId: 'b', monitorStateId: 'q1' }
      ],
      monitorTransitionByStep: monitorRows(
        terminalModel,
        horizon,
        qs,
        (q) => (q === 'q0' ? 'q1' : 'q0')
      ),
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
        { length: horizon },
        () => coupledRows(states, qs, (q) => (q === 'q0' ? 0.5 : 0.8))
      ),
      rankDepth: 2,
      kBestScoreTolerance: 1e-12,
      maxReturnedKBestTrajectories: 10
    };
    const result = requirePossible(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        terminalModel,
        request
      )
    );
    for (const atom of result.rankStrata!.flatMap((stratum) => stratum.trajectories)) {
      expect(atom.hiddenStateIds).toEqual([
        atom.hiddenStateIds[0]!,
        atom.hiddenStateIds[0]!,
        atom.hiddenStateIds[0]!
      ]);
      expect(atom.monitorStateIds).toHaveLength(3);
      expect(atom.monitorStateIds[1]).not.toBe(atom.monitorStateIds[0]);
      expect(atom.monitorStateIds[2]).toBe(atom.monitorStateIds[0]);
    }
  });
});
