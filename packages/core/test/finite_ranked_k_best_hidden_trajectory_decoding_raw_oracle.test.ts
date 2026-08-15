import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import { oneMonitorRequest } from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

type RawPath = { hidden: StateId[]; mass: number };

function rawEnumerate(
  model: DefinitionModel,
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest
): RawPath[] {
  const initial = new Map(
    request.initialDistribution.map((entry) => [entry.stateId, entry.probability])
  );
  const initialEvidence = new Map(
    request.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood])
  );
  const transition = new Map<string, number>();
  for (const edge of model.transitions) {
    const key = `${edge.from}\u0000${edge.to}`;
    transition.set(key, (transition.get(key) ?? 0) + Number(edge.probability));
  }
  const paths: RawPath[] = [];
  const walk = (step: number, state: StateId, hidden: StateId[], mass: number) => {
    if (step === request.horizon) {
      paths.push({ hidden, mass });
      return;
    }
    for (const next of model.states.map((entry) => entry.id)) {
      const p = transition.get(`${state}\u0000${next}`) ?? 0;
      if (p <= 0) continue;
      walk(step + 1, next, [...hidden, next], mass * p);
    }
  };
  for (const state of model.states) {
    const mass = (initial.get(state.id) ?? 0) * (initialEvidence.get(state.id) ?? 0);
    if (mass > 0) walk(0, state.id, [state.id], mass);
  }
  return paths.sort(
    (a, b) =>
      b.mass - a.mass || a.hidden.join('\u0000').localeCompare(b.hidden.join('\u0000'))
  );
}

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 },
    { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.25 },
    { from: 'b', to: 'b', probability: 0.75 }
  ]
};

describe('Candidate AG independent raw-probability hidden-trajectory oracle', () => {
  it('matches direct raw path ranking without calling production recurrence', () => {
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.55 },
        { stateId: 'b', probability: 0.45 }
      ],
      2,
      8
    );
    const oracle = rawEnumerate(model, request);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('raw oracle fixture must be possible');
    const actual = result.rankStrata!.flatMap((stratum) => stratum.trajectories);
    expect(actual.map((entry) => entry.hiddenStateIds)).toEqual(
      oracle.map((entry) => entry.hidden)
    );
    for (let i = 0; i < actual.length; i += 1) {
      expect(actual[i]!.jointProbability).toBeCloseTo(oracle[i]!.mass, 14);
    }
  });

  it('matches raw posterior probabilities using an independently summed denominator', () => {
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.55 },
        { stateId: 'b', probability: 0.45 }
      ],
      2,
      8
    );
    request.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.5 }
    ];
    const oracle = rawEnumerate(model, request);
    const denominator = oracle.reduce((sum, entry) => sum + entry.mass, 0);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('raw posterior fixture must be possible');
    const actual = result.rankStrata!.flatMap((stratum) => stratum.trajectories);
    for (let i = 0; i < actual.length; i += 1) {
      expect(actual[i]!.posteriorProbability).toBeCloseTo(
        oracle[i]!.mass / denominator,
        14
      );
    }
  });
});
