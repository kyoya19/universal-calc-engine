import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import {
  coupledRows,
  hiddenRanks,
  monitorRows
} from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

type Enumerated = { hidden: StateId[]; monitor: string[]; mass: number };

function key(q: string, from: StateId, to: StateId) {
  return `${q}\u0000${from}\u0000${to}`;
}

function requestFor(model: DefinitionModel): FiniteRankedKBestHiddenTrajectoryDecodingRequest {
  const states = model.states.map((state) => state.id);
  const qs = ['clean', 'seen_b'];
  const horizon = 2;
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.7 },
      { stateId: 'b', probability: 0.3 }
    ],
    horizon,
    monitorStates: qs,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'clean' },
      { stateId: 'b', monitorStateId: 'seen_b' }
    ],
    monitorTransitionByStep: monitorRows(
      model,
      horizon,
      qs,
      (q, _from, to) => (q === 'seen_b' || to === 'b' ? 'seen_b' : 'clean')
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.6 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
      { length: horizon },
      (_, step) =>
        coupledRows(states, qs, (q, from, to) =>
          step === 0
            ? from === 'a' && to === 'a'
              ? 0.9
              : from === 'a' && to === 'b'
                ? 0.45
                : from === 'b' && to === 'a'
                  ? 0.7
                  : 0.55
            : q === 'seen_b'
              ? 0.8
              : to === 'a'
                ? 0.65
                : 0.35
        )
    ),
    rankDepth: 8,
    kBestScoreTolerance: 1e-12,
    maxReturnedKBestTrajectories: 1000
  };
}

function enumerateConcrete(
  model: DefinitionModel,
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  target?: Set<string>
) {
  const init = new Map(
    request.initialDistribution.map((entry) => [entry.stateId, entry.probability])
  );
  const initQ = new Map(
    request.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId])
  );
  const initEvidence = new Map(
    request.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood])
  );
  const monitorMaps = request.monitorTransitionByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          key(entry.monitorStateId, entry.fromStateId, entry.toStateId),
          entry.nextMonitorStateId
        ])
      )
  );
  const evidenceMaps = request.monitorCoupledTransitionEvidenceLikelihoodsByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          key(entry.monitorStateId, entry.fromStateId, entry.toStateId),
          entry.likelihood
        ])
      )
  );
  const terminal = new Set(
    model.states.filter((state) => state.terminal === true).map((state) => state.id)
  );
  const concrete: Enumerated[] = [];
  const walk = (
    step: number,
    stateId: StateId,
    q: string,
    hidden: StateId[],
    monitor: string[],
    mass: number
  ) => {
    if (step === request.horizon) {
      if (target === undefined || target.has(q)) concrete.push({ hidden, monitor, mass });
      return;
    }
    const edges = terminal.has(stateId)
      ? [{ from: stateId, to: stateId, probability: 1 }]
      : model.transitions
          .filter((edge) => edge.from === stateId && Number(edge.probability) > 0)
          .map((edge) => ({ ...edge, probability: Number(edge.probability) }));
    for (const edge of edges) {
      const likelihood = evidenceMaps[step]!.get(key(q, edge.from, edge.to)) ?? 0;
      const nextQ = monitorMaps[step]!.get(key(q, edge.from, edge.to));
      if (likelihood <= 0 || nextQ === undefined) continue;
      walk(
        step + 1,
        edge.to,
        nextQ,
        [...hidden, edge.to],
        [...monitor, nextQ],
        mass * edge.probability * likelihood
      );
    }
  };
  for (const state of model.states) {
    const p = init.get(state.id) ?? 0;
    const l = initEvidence.get(state.id) ?? 0;
    const q = initQ.get(state.id);
    if (p > 0 && l > 0 && q !== undefined) {
      walk(0, state.id, q, [state.id], [q], p * l);
    }
  }
  const aggregated = new Map<string, Enumerated>();
  for (const entry of concrete) {
    const id = entry.hidden.join('\u0000');
    const current = aggregated.get(id);
    if (current === undefined) aggregated.set(id, { ...entry });
    else current.mass += entry.mass;
  }
  const ordered = [...aggregated.values()].sort(
    (a, b) =>
      b.mass - a.mass || a.hidden.join('\u0000').localeCompare(b.hidden.join('\u0000'))
  );
  const denominator = ordered.reduce((sum, entry) => sum + entry.mass, 0);
  return { ordered, denominator };
}

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.2 },
    { from: 'a', to: 'a', probability: 0.3 },
    { from: 'a', to: 'b', probability: 0.5 },
    { from: 'b', to: 'a', probability: 0.4 },
    { from: 'b', to: 'b', probability: 0.6 }
  ]
};

describe('Candidate AG independent complete concrete-transition path oracle', () => {
  it('matches complete concrete enumeration after hidden-trajectory aggregation', () => {
    const request = requestFor(model);
    const oracle = enumerateConcrete(model, request);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('AG path-oracle fixture must be possible');
    const actual = result.rankStrata!.flatMap((stratum) =>
      stratum.trajectories.map((entry) => ({
        hidden: entry.hiddenStateIds,
        mass: entry.jointProbability
      }))
    );
    expect(actual.map((entry) => entry.hidden)).toEqual(
      oracle.ordered.map((entry) => entry.hidden)
    );
    for (let i = 0; i < actual.length; i += 1) {
      expect(actual[i]!.mass).toBeCloseTo(oracle.ordered[i]!.mass, 14);
    }
  });

  it('matches complete enumeration after terminal-monitor target restriction', () => {
    const request = requestFor(model);
    const oracle = enumerateConcrete(model, request, new Set(['seen_b']));
    const result =
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...request, targetMonitorStates: ['seen_b'] }
      );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) {
      throw new Error('conditioned AG path-oracle fixture must be possible');
    }
    const actual = result.rankStrata!.flatMap((stratum) =>
      stratum.trajectories.map((entry) => entry.hiddenStateIds)
    );
    expect(actual).toEqual(oracle.ordered.map((entry) => entry.hidden));
  });

  it('keeps concrete parallel-edge identity outside ranked output', () => {
    const request = requestFor(model);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('AG path-oracle fixture must be possible');
    expect(result.diagnostics.parallelTransitionIdentityUsed).toBe(false);
    expect(hiddenRanks(result).flat(2).length).toBeGreaterThan(0);
    for (const stratum of result.rankStrata!) {
      for (const atom of stratum.trajectories) {
        expect(Object.keys(atom).sort()).toEqual(
          [
            'hiddenStateIds',
            'monitorStateIds',
            'jointProbability',
            'logJointProbability',
            'jointProbabilityUnderflowed',
            'posteriorProbability',
            'logPosteriorProbability',
            'posteriorProbabilityUnderflowed'
          ].sort()
        );
      }
    }
  });
});
