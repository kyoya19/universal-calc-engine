import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteMapHiddenTrajectoryDecodingRequest,
  decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_map_hidden_trajectory_decoding';

type Enumerated = { hidden: StateId[]; monitor: string[]; mass: number };

function key(q: string, from: StateId, to: StateId) {
  return `${q}\u0000${from}\u0000${to}`;
}

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const out = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) out.add(`${state.id}\u0000${state.id}`);
    else for (const edge of model.transitions) if (edge.from === state.id && Number(edge.probability) > 0) out.add(`${edge.from}\u0000${edge.to}`);
  }
  return [...out].sort().map((entry) => entry.split('\u0000') as [StateId, StateId]);
}

function requestFor(model: DefinitionModel): FiniteMapHiddenTrajectoryDecodingRequest {
  const states = model.states.map((state) => state.id);
  const qs = ['clean', 'seen_b'];
  const pairs = effectivePairs(model);
  const horizon = 2;
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }],
    horizon,
    monitorStates: qs,
    initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'clean' }, { stateId: 'b', monitorStateId: 'seen_b' }],
    monitorTransitionByStep: Array.from({ length: horizon }, () => qs.flatMap((monitorStateId) => pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      nextMonitorStateId: monitorStateId === 'seen_b' || toStateId === 'b' ? 'seen_b' : 'clean'
    })))),
    initialEvidenceLikelihoods: [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.6 }],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, (_, step) => qs.flatMap((monitorStateId) => states.flatMap((fromStateId) => states.map((toStateId) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      likelihood: step === 0
        ? (fromStateId === 'a' && toStateId === 'a' ? 0.9 : fromStateId === 'a' && toStateId === 'b' ? 0.45 : fromStateId === 'b' && toStateId === 'a' ? 0.7 : 0.55)
        : (monitorStateId === 'seen_b' ? 0.8 : toStateId === 'a' ? 0.65 : 0.35)
    }))))),
    mapScoreTolerance: 1e-12,
    maxReturnedMapTrajectories: 100
  };
}

function enumerateConcrete(model: DefinitionModel, request: FiniteMapHiddenTrajectoryDecodingRequest, target?: Set<string>) {
  const init = new Map(request.initialDistribution.map((entry) => [entry.stateId, entry.probability]));
  const initQ = new Map(request.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId]));
  const initEvidence = new Map(request.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood]));
  const monitorMaps = request.monitorTransitionByStep.map((row) => new Map(row.map((entry) => [key(entry.monitorStateId, entry.fromStateId, entry.toStateId), entry.nextMonitorStateId])));
  const evidenceMaps = request.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => new Map(row.map((entry) => [key(entry.monitorStateId, entry.fromStateId, entry.toStateId), entry.likelihood])));
  const terminal = new Set(model.states.filter((state) => state.terminal === true).map((state) => state.id));
  const concrete: Enumerated[] = [];
  const walk = (step: number, stateId: StateId, q: string, hidden: StateId[], monitors: string[], mass: number) => {
    if (step === request.horizon) {
      if (target === undefined || target.has(q)) concrete.push({ hidden, monitor: monitors, mass });
      return;
    }
    const edges = terminal.has(stateId)
      ? [{ from: stateId, to: stateId, probability: 1 }]
      : model.transitions.filter((edge) => edge.from === stateId && Number(edge.probability) > 0).map((edge) => ({ ...edge, probability: Number(edge.probability) }));
    for (const edge of edges) {
      const likelihood = evidenceMaps[step]!.get(key(q, edge.from, edge.to)) ?? 0;
      const nextQ = monitorMaps[step]!.get(key(q, edge.from, edge.to));
      if (likelihood <= 0 || nextQ === undefined) continue;
      walk(step + 1, edge.to, nextQ, [...hidden, edge.to], [...monitors, nextQ], mass * edge.probability * likelihood);
    }
  };
  for (const state of model.states) {
    const probability = init.get(state.id) ?? 0;
    const likelihood = initEvidence.get(state.id) ?? 0;
    const q = initQ.get(state.id);
    if (probability > 0 && likelihood > 0 && q !== undefined) walk(0, state.id, q, [state.id], [q], probability * likelihood);
  }

  const aggregated = new Map<string, Enumerated>();
  for (const entry of concrete) {
    const id = entry.hidden.join('\u0000');
    const current = aggregated.get(id);
    if (current === undefined) aggregated.set(id, { ...entry });
    else current.mass += entry.mass;
  }
  const paths = [...aggregated.values()].sort((a, b) => a.hidden.join('\u0000').localeCompare(b.hidden.join('\u0000')));
  const denominator = paths.reduce((sum, entry) => sum + entry.mass, 0);
  const best = Math.max(...paths.map((entry) => entry.mass));
  const maps = paths.filter((entry) => Math.abs(entry.mass - best) <= 1e-14);
  return { paths, denominator, best, maps };
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

describe('Candidate AF independent complete concrete-transition path oracle', () => {
  it('matches independently enumerated hidden-trajectory MAP after parallel-edge aggregation', () => {
    const request = requestFor(model);
    const oracle = enumerateConcrete(model, request);
    const result = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('AF fixture must be possible');
    expect(result.mapTrajectories!.map((entry) => entry.hiddenStateIds)).toEqual(oracle.maps.map((entry) => entry.hidden));
    expect(result.maximumJointPathProbability).toBeCloseTo(oracle.best, 14);
    expect(result.maximumPosteriorPathProbability).toBeCloseTo(oracle.best / oracle.denominator, 14);
  });

  it('matches independent enumeration after terminal-monitor target restriction', () => {
    const request = requestFor(model);
    const oracle = enumerateConcrete(model, request, new Set(['seen_b']));
    const result = decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['seen_b'] });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('conditioned AF fixture must be possible');
    expect(result.mapTrajectories!.map((entry) => entry.hiddenStateIds)).toEqual(oracle.maps.map((entry) => entry.hidden));
    expect(result.maximumJointPathProbability).toBeCloseTo(oracle.best, 14);
    expect(result.maximumPosteriorPathProbability).toBeCloseTo(oracle.best / oracle.denominator, 14);
  });

  it('keeps concrete parallel-edge identity outside the returned decoded object', () => {
    const request = requestFor(model);
    const result = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('AF fixture must be possible');
    expect(result.diagnostics.parallelTransitionIdentityUsed).toBe(false);
    for (const entry of result.mapTrajectories!) {
      expect(Object.keys(entry).sort()).toEqual(['hiddenStateIds', 'jointProbability', 'jointProbabilityUnderflowed', 'logJointProbability', 'logPosteriorProbability', 'monitorStateIds', 'posteriorProbability', 'posteriorProbabilityUnderflowed'].sort());
    }
  });
});
