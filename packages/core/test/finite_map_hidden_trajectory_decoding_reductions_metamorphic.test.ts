import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteMapHiddenTrajectoryDecodingRequest,
  decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_map_hidden_trajectory_decoding';
import { analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence } from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const set = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) set.add(`${state.id}\u0000${state.id}`);
    else for (const edge of model.transitions) if (edge.from === state.id && Number(edge.probability) > 0) set.add(`${edge.from}\u0000${edge.to}`);
  }
  return [...set].sort().map((x) => x.split('\u0000') as [StateId, StateId]);
}

function makeRequest(
  model: DefinitionModel,
  initial: Array<{ stateId: StateId; probability: number }>,
  horizon: number,
  initialEvidence: Record<string, number> = {},
  destinationEvidence?: Array<Record<string, number>>
): FiniteMapHiddenTrajectoryDecodingRequest {
  const states = model.states.map((x) => x.id);
  const pairs = effectivePairs(model);
  return {
    initialDistribution: initial,
    horizon,
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: states.map((stateId) => ({ stateId, monitorStateId: 'q' })),
    monitorTransitionByStep: Array.from({ length: horizon }, () => pairs.map(([fromStateId, toStateId]) => ({ monitorStateId: 'q', fromStateId, toStateId, nextMonitorStateId: 'q' }))),
    initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: initialEvidence[stateId] ?? 1 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, (_, step) => states.flatMap((fromStateId) => states.map((toStateId) => ({
      monitorStateId: 'q', fromStateId, toStateId, likelihood: destinationEvidence?.[step]?.[toStateId] ?? 1
    })))),
    mapScoreTolerance: 1e-12,
    maxReturnedMapTrajectories: 100
  };
}

function requireMap(result: ReturnType<typeof decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('possible MAP expected');
  return result;
}

describe('Candidate AF reductions and authority metamorphics', () => {
  it('reduces with one-state monitor and all-one evidence to the most-probable finite Markov path', () => {
    const model: DefinitionModel = {
      startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [
        { from: 'a', to: 'a', probability: 0.7 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.2 }, { from: 'b', to: 'b', probability: 0.8 }
      ]
    };
    const request = makeRequest(model, [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }], 2);
    const result = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(result.mapTrajectories![0]!.hiddenStateIds).toEqual(['a', 'a', 'a']);
    expect(result.maximumJointPathProbability).toBeCloseTo(0.6 * 0.7 * 0.7, 14);
  });

  it('reduces destination-only evidence to standard finite HMM/Viterbi scoring', () => {
    const model: DefinitionModel = {
      startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [
        { from: 'a', to: 'a', probability: 0.7 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.4 }, { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const request = makeRequest(
      model,
      [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }],
      1,
      { a: 0.9, b: 0.2 },
      [{ a: 0.3, b: 0.8 }]
    );
    const result = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(result.mapTrajectories![0]!.hiddenStateIds).toEqual(['a', 'b']);
    expect(result.maximumJointPathProbability).toBeCloseTo(0.6 * 0.9 * 0.3 * 0.8, 14);
  });

  it('uses the qualified Candidate AE sum-product evidence mass as posterior normalization denominator', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.4 }, { from: 'b', to: 'a', probability: 0.25 }, { from: 'b', to: 'b', probability: 0.75 }] };
    const request = makeRequest(model, [{ stateId: 'a', probability: 0.55 }, { stateId: 'b', probability: 0.45 }], 1, { a: 0.8, b: 0.6 }, [{ a: 0.7, b: 0.5 }]);
    const result = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, request);
    expect(ae.ok).toBe(true);
    if (!ae.ok || !ae.possible || ae.evidenceProbability === null) throw new Error('AE denominator expected');
    expect(result.maximumPosteriorPathProbability).toBeCloseTo(result.maximumJointPathProbability! / ae.evidenceProbability, 14);
  });

  it('preserves MAP identity and posterior mass under a legal common evidence-layer scale while scaling absolute best-path mass', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.4 }, { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }] };
    const request = makeRequest(model, [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }], 1, {}, [{ a: 0.8, b: 0.5 }]);
    const scaled = structuredClone(request);
    scaled.monitorCoupledTransitionEvidenceLikelihoodsByStep[0] = scaled.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]!.map((entry) => ({ ...entry, likelihood: entry.likelihood * 0.5 }));
    const a = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    const b = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, scaled));
    expect(b.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(a.mapTrajectories!.map((x) => x.hiddenStateIds));
    expect(b.maximumJointPathProbability).toBeCloseTo(a.maximumJointPathProbability! * 0.5, 14);
    expect(b.maximumPosteriorPathProbability).toBeCloseTo(a.maximumPosteriorPathProbability!, 14);
  });

  it('is invariant to request entry ordering', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.4 }, { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }] };
    const request = makeRequest(model, [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }], 2);
    const reversed: FiniteMapHiddenTrajectoryDecodingRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      monitorStates: [...request.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...request.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: request.monitorTransitionByStep.map((row) => [...row].reverse()),
      initialEvidenceLikelihoods: [...request.initialEvidenceLikelihoods].reverse(),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: request.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    const a = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    const b = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, reversed));
    expect(b).toEqual(a);
  });

  it('is invariant to hidden-state relabeling after mapping labels back', () => {
    const base: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.8 }, { from: 'a', to: 'b', probability: 0.2 }, { from: 'b', to: 'a', probability: 0.1 }, { from: 'b', to: 'b', probability: 0.9 }] };
    const renamed: DefinitionModel = { startState: 'z', states: [{ id: 'z' }, { id: 'y' }], transitions: [{ from: 'z', to: 'z', probability: 0.8 }, { from: 'z', to: 'y', probability: 0.2 }, { from: 'y', to: 'z', probability: 0.1 }, { from: 'y', to: 'y', probability: 0.9 }] };
    const a = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(base, makeRequest(base, [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }], 2)));
    const b = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(renamed, makeRequest(renamed, [{ stateId: 'z', probability: 0.7 }, { stateId: 'y', probability: 0.3 }], 2)));
    expect(b.mapTrajectories![0]!.hiddenStateIds.map((x) => x === 'z' ? 'a' : 'b')).toEqual(a.mapTrajectories![0]!.hiddenStateIds);
    expect(b.maximumJointPathProbability).toBeCloseTo(a.maximumJointPathProbability!, 14);
  });

  it('is invariant to monitor-state relabeling', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.7 }, { from: 'a', to: 'b', probability: 0.3 }, { from: 'b', to: 'a', probability: 0.2 }, { from: 'b', to: 'b', probability: 0.8 }] };
    const base = makeRequest(model, [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }], 1);
    const relabeled: FiniteMapHiddenTrajectoryDecodingRequest = {
      ...base,
      monitorStates: ['renamed'],
      initialMonitorStateByHiddenState: base.initialMonitorStateByHiddenState.map((x) => ({ ...x, monitorStateId: 'renamed' })),
      monitorTransitionByStep: base.monitorTransitionByStep.map((row) => row.map((x) => ({ ...x, monitorStateId: 'renamed', nextMonitorStateId: 'renamed' }))),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: base.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => row.map((x) => ({ ...x, monitorStateId: 'renamed' })))
    };
    const a = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, base));
    const b = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, relabeled));
    expect(b.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(a.mapTrajectories!.map((x) => x.hiddenStateIds));
    expect(b.maximumJointPathProbability).toBeCloseTo(a.maximumJointPathProbability!, 14);
  });

  it('is invariant to parallel-transition split/merge preserving hidden-pair mass', () => {
    const merged: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.4 }, { from: 'a', to: 'b', probability: 0.6 }, { from: 'b', to: 'b', probability: 1 }] };
    const split: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 0.4 }, { from: 'a', to: 'b', probability: 0.2 }, { from: 'a', to: 'b', probability: 0.4 }, { from: 'b', to: 'b', probability: 1 }] };
    const init = [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }];
    const a = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(merged, makeRequest(merged, init, 1)));
    const b = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(split, makeRequest(split, init, 1)));
    expect(b.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(a.mapTrajectories!.map((x) => x.hiddenStateIds));
    expect(b.maximumJointPathProbability).toBeCloseTo(a.maximumJointPathProbability!, 14);
  });

  it('applies terminal implicit self-retention evidence and monitor update to MAP scoring', () => {
    const model: DefinitionModel = { startState: 's', states: [{ id: 's' }, { id: 't', terminal: true }], transitions: [{ from: 's', to: 't', probability: 1 }] };
    const states = ['s', 't'];
    const request: FiniteMapHiddenTrajectoryDecodingRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }, { stateId: 't', probability: 0 }],
      horizon: 2,
      monitorStates: ['q0', 'q1'],
      initialMonitorStateByHiddenState: [{ stateId: 's', monitorStateId: 'q0' }, { stateId: 't', monitorStateId: 'q1' }],
      monitorTransitionByStep: [
        [{ monitorStateId: 'q0', fromStateId: 's', toStateId: 't', nextMonitorStateId: 'q0' }, { monitorStateId: 'q1', fromStateId: 's', toStateId: 't', nextMonitorStateId: 'q1' }, { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }, { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }],
        [{ monitorStateId: 'q0', fromStateId: 's', toStateId: 't', nextMonitorStateId: 'q0' }, { monitorStateId: 'q1', fromStateId: 's', toStateId: 't', nextMonitorStateId: 'q1' }, { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }, { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }]
      ],
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: [0, 1].map((step) => ['q0', 'q1'].flatMap((q) => states.flatMap((fromStateId) => states.map((toStateId) => ({ monitorStateId: q, fromStateId, toStateId, likelihood: step === 0 && fromStateId === 's' && toStateId === 't' ? 0.8 : step === 1 && q === 'q0' && fromStateId === 't' && toStateId === 't' ? 0.4 : 1 }))))),
      mapScoreTolerance: 1e-12,
      maxReturnedMapTrajectories: 10
    };
    const result = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(result.mapTrajectories![0]!.hiddenStateIds).toEqual(['s', 't', 't']);
    expect(result.mapTrajectories![0]!.monitorStateIds).toEqual(['q0', 'q0', 'q1']);
    expect(result.maximumJointPathProbability).toBeCloseTo(0.8 * 0.4, 14);
  });
});
