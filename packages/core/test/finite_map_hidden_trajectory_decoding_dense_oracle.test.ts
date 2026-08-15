import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteMapHiddenTrajectoryDecodingRequest,
  decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_map_hidden_trajectory_decoding';

function tkey(q: string, from: StateId, to: StateId) { return `${q}\u0000${from}\u0000${to}`; }

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

function request(): FiniteMapHiddenTrajectoryDecodingRequest {
  const stateIds = ['a', 'b'];
  const qs = ['q0', 'q1'];
  const pairs: Array<[StateId, StateId]> = [['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.55 }, { stateId: 'b', probability: 0.45 }],
    horizon: 3,
    monitorStates: qs,
    initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 'b', monitorStateId: 'q1' }],
    monitorTransitionByStep: Array.from({ length: 3 }, () => qs.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId: q,
      fromStateId,
      toStateId,
      nextMonitorStateId: q === 'q1' || toStateId === 'b' ? 'q1' : 'q0'
    })))),
    initialEvidenceLikelihoods: [{ stateId: 'a', likelihood: 0.9 }, { stateId: 'b', likelihood: 0.7 }],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: 3 }, (_, step) => qs.flatMap((q) => stateIds.flatMap((fromStateId) => stateIds.map((toStateId) => ({
      monitorStateId: q,
      fromStateId,
      toStateId,
      likelihood: step === 0 ? (toStateId === 'a' ? 0.8 : 0.55) : q === 'q1' ? 0.85 : fromStateId === toStateId ? 0.65 : 0.4
    }))))),
    mapScoreTolerance: 1e-12,
    maxReturnedMapTrajectories: 100
  };
}

type Cell = { mass: number; paths: StateId[][] };

function denseOracle(req: FiniteMapHiddenTrajectoryDecodingRequest, target?: Set<string>) {
  const states = ['a', 'b'];
  const qs = ['q0', 'q1'];
  const si = new Map(states.map((x, i) => [x, i]));
  const qi = new Map(qs.map((x, i) => [x, i]));
  const transition = new Map<string, number>();
  for (const edge of model.transitions) transition.set(`${edge.from}\u0000${edge.to}`, Number(edge.probability));
  const init = new Map(req.initialDistribution.map((x) => [x.stateId, x.probability]));
  const initQ = new Map(req.initialMonitorStateByHiddenState.map((x) => [x.stateId, x.monitorStateId]));
  const initE = new Map(req.initialEvidenceLikelihoods.map((x) => [x.stateId, x.likelihood]));
  const monitor = req.monitorTransitionByStep.map((row) => new Map(row.map((x) => [tkey(x.monitorStateId, x.fromStateId, x.toStateId), x.nextMonitorStateId])));
  const evidence = req.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => new Map(row.map((x) => [tkey(x.monitorStateId, x.fromStateId, x.toStateId), x.likelihood])));
  let layer: Cell[][] = states.map(() => qs.map(() => ({ mass: 0, paths: [] })));
  for (const s of states) {
    const q = initQ.get(s)!;
    const mass = (init.get(s) ?? 0) * (initE.get(s) ?? 0);
    if (mass > 0) layer[si.get(s)!]![qi.get(q)!] = { mass, paths: [[s]] };
  }
  for (let step = 0; step < req.horizon; step += 1) {
    const next: Cell[][] = states.map(() => qs.map(() => ({ mass: 0, paths: [] })));
    for (const from of states) for (const q of qs) {
      const cell = layer[si.get(from)!]![qi.get(q)!]!;
      if (cell.mass <= 0) continue;
      for (const to of states) {
        const p = transition.get(`${from}\u0000${to}`) ?? 0;
        const l = evidence[step]!.get(tkey(q, from, to)) ?? 0;
        const nq = monitor[step]!.get(tkey(q, from, to));
        if (p <= 0 || l <= 0 || nq === undefined) continue;
        const mass = cell.mass * p * l;
        const dest = next[si.get(to)!]![qi.get(nq)!]!;
        const candidates = cell.paths.map((path) => [...path, to]);
        if (mass > dest.mass + 1e-15) {
          dest.mass = mass;
          dest.paths = candidates;
        } else if (Math.abs(mass - dest.mass) <= 1e-15) {
          dest.paths.push(...candidates);
        }
      }
    }
    layer = next;
  }
  let best = 0;
  let paths: StateId[][] = [];
  for (const s of states) for (const q of qs) {
    if (target !== undefined && !target.has(q)) continue;
    const cell = layer[si.get(s)!]![qi.get(q)!]!;
    if (cell.mass > best + 1e-15) { best = cell.mass; paths = [...cell.paths]; }
    else if (Math.abs(cell.mass - best) <= 1e-15 && cell.mass > 0) paths.push(...cell.paths);
  }
  paths.sort((a, b) => a.join('\u0000').localeCompare(b.join('\u0000')));
  return { best, paths };
}

describe('Candidate AF independent dense X-by-Q max-product oracle', () => {
  it('matches dense raw-probability max-product MAP', () => {
    const req = request();
    const oracle = denseOracle(req);
    const result = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, req);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('possible expected');
    expect(result.maximumJointPathProbability).toBeCloseTo(oracle.best, 14);
    expect(result.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(oracle.paths);
  });

  it('matches dense raw-probability max-product under terminal monitor restriction', () => {
    const req = request();
    const oracle = denseOracle(req, new Set(['q1']));
    const result = decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...req, targetMonitorStates: ['q1'] });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('possible expected');
    expect(result.maximumJointPathProbability).toBeCloseTo(oracle.best, 14);
    expect(result.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(oracle.paths);
  });
});
