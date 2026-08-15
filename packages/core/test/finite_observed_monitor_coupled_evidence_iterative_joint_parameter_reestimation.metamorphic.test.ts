import { describe, expect, it } from 'vitest';
import {
  FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import { DefinitionModel, StateId } from '../src/model';
import {
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  parallelModel,
  standardRequest,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function parameterMap(result: ReturnType<typeof requireSuccess>) {
  const initial = new Map(result.finalTheta.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const));
  const transitions = new Map<string, number>();
  for (const row of result.finalTheta.transitionRows) {
    if (row.terminal) continue;
    for (const entry of row.row) transitions.set(`${row.stateId}->${entry.toStateId}`, entry.probability);
  }
  const kernel = new Map(result.finalTheta.observationKernel.map((entry) => [`${entry.stateId}|${entry.symbol}`, entry.probability] as const));
  return { initial, transitions, kernel };
}

function renameFixture(
  model: DefinitionModel,
  request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest,
  stateRename: Record<string, string>,
  symbolRename: Record<string, string>,
  monitorRename: Record<string, string>
): { model: DefinitionModel; request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest } {
  const state = (value: string): string => stateRename[value] ?? value;
  const symbol = (value: string): string => symbolRename[value] ?? value;
  const monitor = (value: string): string => monitorRename[value] ?? value;
  return {
    model: {
      ...model,
      startState: state(model.startState),
      states: model.states.map((entry) => ({ ...entry, id: state(entry.id) })),
      transitions: model.transitions.map((entry) => ({ ...entry, from: state(entry.from), to: state(entry.to) }))
    },
    request: {
      ...request,
      initialDistribution: request.initialDistribution.map((entry) => ({ ...entry, stateId: state(entry.stateId) })),
      alphabet: request.alphabet.map(symbol),
      kernel: request.kernel.map((entry) => ({ ...entry, stateId: state(entry.stateId), symbol: symbol(entry.symbol) })),
      evidenceRecords: request.evidenceRecords.map((record) => ({
        ...record,
        observations: record.observations.map(symbol),
        monitorStates: record.monitorStates.map(monitor),
        initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState.map((entry) => ({
          ...entry,
          stateId: state(entry.stateId),
          monitorStateId: monitor(entry.monitorStateId)
        })),
        monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => layer.map((entry) => ({
          ...entry,
          monitorStateId: monitor(entry.monitorStateId),
          fromStateId: state(entry.fromStateId),
          toStateId: state(entry.toStateId),
          nextMonitorStateId: monitor(entry.nextMonitorStateId)
        }))),
        initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ ...entry, stateId: state(entry.stateId) })),
        monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) =>
          layer.map((entry) => ({
            ...entry,
            monitorStateId: monitor(entry.monitorStateId),
            fromStateId: state(entry.fromStateId),
            toStateId: state(entry.toStateId)
          }))
        ),
        ...(record.targetMonitorStates === undefined ? {} : { targetMonitorStates: record.targetMonitorStates.map(monitor) })
      }))
    }
  };
}

function baseRequest(): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest {
  const base = standardRequest();
  return iterativeRequest({
    ...base,
    maxIterations: 3,
    parameterConvergenceTolerance: 0,
    logLikelihoodConvergenceTolerance: 0
  });
}

describe('Candidate AJ iterative structural metamorphic qualification', () => {
  it('is invariant under bijective hidden-state relabeling', () => {
    const model = twoStateModel();
    const request = baseRequest();
    const baseline = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const renamed = renameFixture(model, request, { a: 'u', b: 'v' }, {}, {});
    const actual = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(renamed.model, renamed.request));
    const a = parameterMap(baseline);
    const b = parameterMap(actual);
    expect(b.initial.get('u')).toBeCloseTo(a.initial.get('a')!, 10);
    expect(b.initial.get('v')).toBeCloseTo(a.initial.get('b')!, 10);
    for (const [from, renamedFrom] of [['a', 'u'], ['b', 'v']] as const) {
      for (const [to, renamedTo] of [['a', 'u'], ['b', 'v']] as const) {
        expect(b.transitions.get(`${renamedFrom}->${renamedTo}`)).toBeCloseTo(a.transitions.get(`${from}->${to}`)!, 10);
      }
    }
    for (const [stateId, renamedStateId] of [['a', 'u'], ['b', 'v']] as const) {
      for (const symbol of ['x', 'y']) {
        expect(b.kernel.get(`${renamedStateId}|${symbol}`)).toBeCloseTo(a.kernel.get(`${stateId}|${symbol}`)!, 10);
      }
    }
  });

  it('is invariant under bijective monitor-state and observation-symbol relabeling', () => {
    const model = twoStateModel();
    const request = baseRequest();
    const baseline = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const renamed = renameFixture(model, request, {}, { x: 'm', y: 'n' }, { q: 'r' });
    const actual = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(renamed.model, renamed.request));
    const a = parameterMap(baseline);
    const b = parameterMap(actual);
    for (const stateId of ['a', 'b']) {
      expect(b.initial.get(stateId)).toBeCloseTo(a.initial.get(stateId)!, 10);
      for (const toStateId of ['a', 'b']) {
        expect(b.transitions.get(`${stateId}->${toStateId}`)).toBeCloseTo(a.transitions.get(`${stateId}->${toStateId}`)!, 10);
      }
      expect(b.kernel.get(`${stateId}|m`)).toBeCloseTo(a.kernel.get(`${stateId}|x`)!, 10);
      expect(b.kernel.get(`${stateId}|n`)).toBeCloseTo(a.kernel.get(`${stateId}|y`)!, 10);
    }
    expect(actual.stopReason).toBe(baseline.stopReason);
  });

  it('preserves aggregate parameter trajectory under parallel-transition split/merge representation', () => {
    const request = baseRequest();
    const unsplit = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(twoStateModel(), request)
    );
    const split = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(parallelModel(), request)
    );
    const a = parameterMap(unsplit);
    const b = parameterMap(split);
    expect(split.stopReason).toBe(unsplit.stopReason);
    for (const stateId of ['a', 'b']) {
      expect(b.initial.get(stateId)).toBeCloseTo(a.initial.get(stateId)!, 10);
      for (const toStateId of ['a', 'b']) {
        expect(b.transitions.get(`${stateId}->${toStateId}`)).toBeCloseTo(a.transitions.get(`${stateId}->${toStateId}`)!, 10);
      }
      for (const symbol of ['x', 'y']) {
        expect(b.kernel.get(`${stateId}|${symbol}`)).toBeCloseTo(a.kernel.get(`${stateId}|${symbol}`)!, 10);
      }
    }
    for (let index = 0; index < unsplit.iterationTrace.length; index += 1) {
      expect(split.iterationTrace[index]!.maxParameterDelta).toBeCloseTo(unsplit.iterationTrace[index]!.maxParameterDelta, 10);
    }
  });

  it('is invariant to representational request ordering', () => {
    const model = twoStateModel();
    const request = baseRequest();
    const reordered: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      alphabet: [...request.alphabet].reverse(),
      kernel: [...request.kernel].reverse(),
      evidenceRecords: request.evidenceRecords.map((record) => ({
        ...record,
        monitorStates: [...record.monitorStates].reverse(),
        initialMonitorStateByHiddenState: [...record.initialMonitorStateByHiddenState].reverse(),
        monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => [...layer].reverse()),
        initialEvidenceLikelihoods: [...record.initialEvidenceLikelihoods].reverse(),
        monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) => [...layer].reverse()),
        ...(record.targetMonitorStates === undefined ? {} : { targetMonitorStates: [...record.targetMonitorStates].reverse() })
      }))
    };
    const a = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const b = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, reordered));
    expect(a.stopReason).toBe(b.stopReason);
    const left = parameterMap(a);
    const right = parameterMap(b);
    for (const [key, value] of left.initial) expect(right.initial.get(key)).toBeCloseTo(value, 10);
    for (const [key, value] of left.transitions) expect(right.transitions.get(key)).toBeCloseTo(value, 10);
    for (const [key, value] of left.kernel) expect(right.kernel.get(key)).toBeCloseTo(value, 10);
  });
});
