import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteMapHiddenTrajectoryDecodingRequest,
  decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates,
  finiteMapHiddenTrajectoryDecodingResultToJson,
  finiteMapHiddenTrajectoryConditionedDecodingResultToJson
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_map_hidden_trajectory_decoding';
import { conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates } from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const pairs = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) {
      pairs.add(`${state.id}\u0000${state.id}`);
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from === state.id && Number(transition.probability) > 0) {
        pairs.add(`${transition.from}\u0000${transition.to}`);
      }
    }
  }
  return [...pairs].sort().map((key) => key.split('\u0000') as [StateId, StateId]);
}

function monitorRows(model: DefinitionModel, horizon: number, monitorStates: string[], rule: (q: string, from: StateId, to: StateId) => string) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, () => monitorStates.flatMap((monitorStateId) => pairs.map(([fromStateId, toStateId]) => ({ monitorStateId, fromStateId, toStateId, nextMonitorStateId: rule(monitorStateId, fromStateId, toStateId) }))));
}

function coupledRows(stateIds: StateId[], monitorStates: string[], rule: (q: string, from: StateId, to: StateId) => number) {
  return monitorStates.flatMap((monitorStateId) => stateIds.flatMap((fromStateId) => stateIds.map((toStateId) => ({ monitorStateId, fromStateId, toStateId, likelihood: rule(monitorStateId, fromStateId, toStateId) }))));
}

function oneMonitorRequest(model: DefinitionModel, initial: Array<{ stateId: StateId; probability: number }>, horizon = 1): FiniteMapHiddenTrajectoryDecodingRequest {
  const stateIds = model.states.map((state) => state.id);
  return {
    initialDistribution: initial,
    horizon,
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'q' })),
    monitorTransitionByStep: monitorRows(model, horizon, ['q'], () => 'q'),
    initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, () => coupledRows(stateIds, ['q'], () => 1)),
    mapScoreTolerance: 1e-12,
    maxReturnedMapTrajectories: 100
  };
}

function requireMap(result: ReturnType<typeof decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireConditioned(result: ReturnType<typeof decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

describe('Candidate AF ambiguity-preserving MAP hidden-trajectory decoding', () => {
  it('distinguishes trajectory-level MAP from per-time marginal modes', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.875 },
        { from: 'a', to: 'b', probability: 0.125 },
        { from: 'b', to: 'a', probability: 17 / 30 },
        { from: 'b', to: 'b', probability: 13 / 30 }
      ]
    };
    const request = oneMonitorRequest(model, [
      { stateId: 'a', probability: 0.4 },
      { stateId: 'b', probability: 0.6 }
    ]);
    const decoded = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(decoded.possible).toBe(true);
    expect(decoded.mapUnique).toBe(true);
    expect(decoded.mapTrajectories![0]!.hiddenStateIds).toEqual(['a', 'a']);
    expect(decoded.maximumJointPathProbability).toBeCloseTo(0.35, 14);

    const ae = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['q'] });
    expect(ae.ok).toBe(true);
    if (!ae.ok || !ae.possible) throw new Error('AE denominator fixture must be possible');
    const mode0 = [...ae.smoothingSteps![0]!.hiddenStateDistribution].sort((x, y) => y.probability - x.probability)[0]!.stateId;
    const mode1 = [...ae.smoothingSteps![1]!.hiddenStateDistribution].sort((x, y) => y.probability - x.probability)[0]!.stateId;
    expect([mode0, mode1]).toEqual(['b', 'a']);
    expect([mode0, mode1]).not.toEqual(decoded.mapTrajectories![0]!.hiddenStateIds);
  });

  it('preserves every exact co-MAP trajectory in canonical order', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [{ from: 'a', to: 'a', probability: 1 }, { from: 'b', to: 'b', probability: 1 }] };
    const request = oneMonitorRequest(model, [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }], 0);
    const decoded = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(decoded.mapUnique).toBe(false);
    expect(decoded.returnedMapTrajectoryCount).toBe(2);
    expect(decoded.mapTrajectories!.map((entry) => entry.hiddenStateIds)).toEqual([['a'], ['b']]);
  });

  it('does not promote a strict near-tie outside mapScoreTolerance', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [] };
    const request = oneMonitorRequest(model, [{ stateId: 'a', probability: 0.500001 }, { stateId: 'b', probability: 0.499999 }], 0);
    request.mapScoreTolerance = 1e-8;
    const decoded = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(decoded.mapUnique).toBe(true);
    expect(decoded.mapTrajectories![0]!.hiddenStateIds).toEqual(['a']);
  });

  it('supports terminal-monitor restriction and all-target neutrality', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [] };
    const request: FiniteMapHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(model, [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }], 0),
      monitorStates: ['qa', 'qb'],
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'qa' }, { stateId: 'b', monitorStateId: 'qb' }]
    };
    const all = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    const allTarget = requireConditioned(decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['qa', 'qb'] }));
    const restricted = requireConditioned(decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['qb'] }));
    expect(allTarget.mapTrajectories!.map((x) => x.hiddenStateIds)).toEqual(all.mapTrajectories!.map((x) => x.hiddenStateIds));
    expect(restricted.mapTrajectories![0]!.hiddenStateIds).toEqual(['b']);
  });

  it('separates evidence, monitor-event and joint-event impossibility without fabricating a MAP path', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }], transitions: [] };
    const evidence = oneMonitorRequest(model, [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }], 0);
    evidence.initialEvidenceLikelihoods = [{ stateId: 'a', likelihood: 0 }, { stateId: 'b', likelihood: 0 }];
    const impossibleE = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, evidence));
    expect(impossibleE.impossibility).toBe('evidence');
    expect(impossibleE.mapTrajectories).toBeNull();

    const base: FiniteMapHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(model, [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }], 0),
      monitorStates: ['qa', 'qb'],
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'qa' }, { stateId: 'b', monitorStateId: 'qb' }]
    };
    const empty = requireConditioned(decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...base, targetMonitorStates: [] }));
    expect(empty.impossibility).toBe('monitor_event');
    expect(empty.mapTrajectories).toBeNull();

    base.initialEvidenceLikelihoods = [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 0 }];
    const joint = requireConditioned(decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...base, targetMonitorStates: ['qb'] }));
    expect(joint.impossibility).toBe('joint');
    expect(joint.mapTrajectories).toBeNull();
  });

  it('preserves positive best-path identity under direct Float64 underflow', () => {
    const model: DefinitionModel = { startState: 's', states: [{ id: 's' }], transitions: [{ from: 's', to: 's', probability: 1 }] };
    const horizon = 400;
    const request = oneMonitorRequest(model, [{ stateId: 's', probability: 1 }], horizon);
    request.initialEvidenceLikelihoods = [{ stateId: 's', likelihood: 0.1 }];
    request.monitorCoupledTransitionEvidenceLikelihoodsByStep = Array.from({ length: horizon }, () => [{ monitorStateId: 'q', fromStateId: 's', toStateId: 's', likelihood: 0.1 }]);
    const decoded = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(decoded.possible).toBe(true);
    expect(decoded.maximumJointPathProbability).toBeNull();
    expect(decoded.maximumLogJointPathProbability).toBeCloseTo((horizon + 1) * Math.log(0.1), 8);
    expect(decoded.mapTrajectories![0]!.jointProbabilityUnderflowed).toBe(true);
    expect(decoded.maximumPosteriorPathProbability).toBeCloseTo(1, 14);
  });

  it('hard-fails invalid MAP options and an oversized co-MAP set rather than truncating it', () => {
    const model: DefinitionModel = { startState: 'a', states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], transitions: [] };
    const invalid = oneMonitorRequest(model, [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }, { stateId: 'c', probability: 0 }], 0);
    invalid.mapScoreTolerance = -1;
    const bad = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, invalid);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.failure.code).toBe('invalid_map_score_tolerance');

    const tied = oneMonitorRequest(model, [{ stateId: 'a', probability: 1 / 3 }, { stateId: 'b', probability: 1 / 3 }, { stateId: 'c', probability: 1 / 3 }], 0);
    tied.maxReturnedMapTrajectories = 2;
    const guarded = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, tied);
    expect(guarded.ok).toBe(false);
    if (!guarded.ok) expect(guarded.failure.code).toBe('map_tie_set_limit_exceeded');
  });

  it('uses checked deterministic serializers and rejects forged non-finite values', () => {
    const model: DefinitionModel = { startState: 's', states: [{ id: 's' }], transitions: [] };
    const request = oneMonitorRequest(model, [{ stateId: 's', probability: 1 }], 0);
    const decoded = requireMap(decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(model, request));
    expect(finiteMapHiddenTrajectoryDecodingResultToJson(decoded)).toBe(JSON.stringify(decoded));
    const conditioned = requireConditioned(decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['q'] }));
    expect(finiteMapHiddenTrajectoryConditionedDecodingResultToJson(conditioned)).toBe(JSON.stringify(conditioned));
    const forged = structuredClone(decoded) as typeof decoded;
    forged.maximumLogJointPathProbability = Number.POSITIVE_INFINITY;
    expect(() => finiteMapHiddenTrajectoryDecodingResultToJson(forged)).toThrow(/non-finite/);
  });
});
