import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import {
  coupledRows,
  monitorRows
} from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

type Entry = { mass: number; hidden: StateId[]; monitors: string[] };

function key(q: string, from: StateId, to: StateId) {
  return `${q}\u0000${from}\u0000${to}`;
}

function groupTop(entries: Entry[], k: number, tolerance: number) {
  const ordered = [...entries].sort(
    (a, b) =>
      b.mass - a.mass || a.hidden.join('\u0000').localeCompare(b.hidden.join('\u0000'))
  );
  const strata: Entry[][] = [];
  let anchor = -1;
  for (const entry of ordered) {
    if (
      strata.length === 0 ||
      Math.log(anchor) - Math.log(entry.mass) > tolerance
    ) {
      if (strata.length === k) break;
      strata.push([entry]);
      anchor = entry.mass;
    } else {
      strata[strata.length - 1]!.push(entry);
    }
  }
  return strata;
}

function denseOracle(
  model: DefinitionModel,
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  target?: Set<string>
) {
  const states = model.states.map((entry) => entry.id).sort();
  const qs = [...request.monitorStates].sort();
  const stateIndex = new Map(states.map((state, index) => [state, index]));
  const qIndex = new Map(qs.map((q, index) => [q, index]));
  const init = new Map(
    request.initialDistribution.map((entry) => [entry.stateId, entry.probability])
  );
  const initQ = new Map(
    request.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId])
  );
  const initL = new Map(
    request.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood])
  );
  const transitions = new Map<string, number>();
  for (const edge of model.transitions) {
    const edgeKey = `${edge.from}\u0000${edge.to}`;
    transitions.set(edgeKey, (transitions.get(edgeKey) ?? 0) + Number(edge.probability));
  }
  let layer: Entry[][][] = states.map(() => qs.map(() => []));
  for (const state of states) {
    const q = initQ.get(state)!;
    const mass = (init.get(state) ?? 0) * (initL.get(state) ?? 0);
    if (mass > 0) {
      layer[stateIndex.get(state)!]![qIndex.get(q)!]!.push({
        mass,
        hidden: [state],
        monitors: [q]
      });
    }
  }
  for (let step = 0; step < request.horizon; step += 1) {
    const next: Entry[][][] = states.map(() => qs.map(() => []));
    const monitor = new Map(
      request.monitorTransitionByStep[step]!.map((entry) => [
        key(entry.monitorStateId, entry.fromStateId, entry.toStateId),
        entry.nextMonitorStateId
      ])
    );
    const evidence = new Map(
      request.monitorCoupledTransitionEvidenceLikelihoodsByStep[step]!.map((entry) => [
        key(entry.monitorStateId, entry.fromStateId, entry.toStateId),
        entry.likelihood
      ])
    );
    for (const from of states) {
      for (const q of qs) {
        for (const entry of layer[stateIndex.get(from)!]![qIndex.get(q)!]!) {
          for (const to of states) {
            const p = transitions.get(`${from}\u0000${to}`) ?? 0;
            const l = evidence.get(key(q, from, to)) ?? 0;
            const nq = monitor.get(key(q, from, to));
            if (p <= 0 || l <= 0 || nq === undefined) continue;
            next[stateIndex.get(to)!]![qIndex.get(nq)!]!.push({
              mass: entry.mass * p * l,
              hidden: [...entry.hidden, to],
              monitors: [...entry.monitors, nq]
            });
          }
        }
      }
    }
    layer = states.map((_, statePosition) =>
      qs.map((__, monitorPosition) =>
        groupTop(
          next[statePosition]![monitorPosition]!,
          request.rankDepth,
          request.kBestScoreTolerance
        ).flat()
      )
    );
  }
  const finals: Entry[] = [];
  for (const state of states) {
    for (const q of qs) {
      if (target !== undefined && !target.has(q)) continue;
      finals.push(...layer[stateIndex.get(state)!]![qIndex.get(q)!]!);
    }
  }
  return groupTop(finals, request.rankDepth, request.kBestScoreTolerance);
}

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.55 },
    { from: 'a', to: 'b', probability: 0.45 },
    { from: 'b', to: 'a', probability: 0.35 },
    { from: 'b', to: 'b', probability: 0.65 }
  ]
};

function requestFor(): FiniteRankedKBestHiddenTrajectoryDecodingRequest {
  const states: StateId[] = ['a', 'b'];
  const qs = ['q0', 'q1'];
  const horizon = 2;
  return {
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
      model,
      horizon,
      qs,
      (q, _from, to) => (q === 'q1' || to === 'b' ? 'q1' : 'q0')
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.9 },
      { stateId: 'b', likelihood: 0.7 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
      { length: horizon },
      (_, step) =>
        coupledRows(
          states,
          qs,
          (q, from, to) =>
            0.3 + 0.1 * step + (q === 'q1' ? 0.2 : 0) + (from === to ? 0.1 : 0)
        )
    ),
    rankDepth: 5,
    kBestScoreTolerance: 1e-12,
    maxReturnedKBestTrajectories: 100
  };
}

describe('Candidate AG independent dense X-by-Q ranked DP oracle', () => {
  it('matches dense raw-probability ranked dynamic programming', () => {
    const request = requestFor();
    const oracle = denseOracle(model, request);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('dense fixture must be possible');
    expect(
      result.rankStrata!.map((stratum) =>
        stratum.trajectories.map((path) => path.hiddenStateIds)
      )
    ).toEqual(oracle.map((stratum) => stratum.map((path) => path.hidden)));
  });

  it('matches dense DP after terminal-monitor restriction', () => {
    const request = requestFor();
    const oracle = denseOracle(model, request, new Set(['q1']));
    const result =
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...request, targetMonitorStates: ['q1'] }
      );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) {
      throw new Error('dense conditioned fixture must be possible');
    }
    expect(
      result.rankStrata!.map((stratum) =>
        stratum.trajectories.map((path) => path.hiddenStateIds)
      )
    ).toEqual(oracle.map((stratum) => stratum.map((path) => path.hidden)));
  });
});
