import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  initialDistribution,
  oneStateMonitorRecord,
  parallelModel,
  resultInitialProbability,
  resultKernelProbability,
  resultTransitionProbability,
  standardKernel,
  standardRequest,
  terminalModel,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AI result');
  return result;
}

function compareAggregate(
  left: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  right: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  states = ['a', 'b'],
  symbols = ['x', 'y']
) {
  for (const stateId of states) {
    expect(resultInitialProbability(left, stateId)).toBeCloseTo(resultInitialProbability(right, stateId), 11);
    for (const edge of left.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow) {
      expect(edge.probability).toBeCloseTo(resultTransitionProbability(right, stateId, edge.toStateId), 11);
    }
    for (const symbol of symbols) expect(resultKernelProbability(left, stateId, symbol)).toBeCloseTo(resultKernelProbability(right, stateId, symbol), 11);
  }
  expect(left.currentTotalLogLikelihood).toBeCloseTo(right.currentTotalLogLikelihood!, 11);
  expect(left.updatedTotalLogLikelihood).toBeCloseTo(right.updatedTotalLogLikelihood!, 11);
}

function renameRecord(record: FiniteObservedMonitorCoupledEvidenceReestimationRecord) {
  const state = (value: string) => value === 'a' ? 'u' : value === 'b' ? 'v' : value;
  const symbol = (value: string) => value === 'x' ? 'm' : value === 'y' ? 'n' : value;
  const monitor = (value: string) => value === 'q' ? 'r' : value;
  return {
    ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
    horizon: record.horizon,
    observations: record.observations.map(symbol),
    monitorStates: record.monitorStates.map(monitor),
    initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState.map((entry) => ({
      stateId: state(entry.stateId), monitorStateId: monitor(entry.monitorStateId)
    })),
    monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => layer.map((entry) => ({
      monitorStateId: monitor(entry.monitorStateId),
      fromStateId: state(entry.fromStateId),
      toStateId: state(entry.toStateId),
      nextMonitorStateId: monitor(entry.nextMonitorStateId)
    }))),
    initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ stateId: state(entry.stateId), likelihood: entry.likelihood })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) => layer.map((entry) => ({
      monitorStateId: monitor(entry.monitorStateId),
      fromStateId: state(entry.fromStateId),
      toStateId: state(entry.toStateId),
      likelihood: entry.likelihood
    }))),
    ...(record.targetMonitorStates === undefined ? {} : { targetMonitorStates: record.targetMonitorStates.map(monitor) })
  };
}

describe('Candidate AI metamorphic qualification', () => {
  it('is invariant to record permutation', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const left = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const right = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: [...request.evidenceRecords].reverse() }));
    compareAggregate(left, right);
  });

  it('is invariant to equal positive integer replication of the full dataset while sufficient counts and log likelihood scale', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const base = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const replicated = request.evidenceRecords.flatMap((record, copy) => [0, 1].map((suffix) => ({
      ...record,
      recordId: `${record.recordId ?? copy}-${suffix}`
    })));
    const doubled = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: replicated }));
    for (const stateId of ['a', 'b']) {
      expect(resultInitialProbability(doubled, stateId)).toBeCloseTo(resultInitialProbability(base, stateId), 11);
      for (const edge of base.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow) {
        expect(resultTransitionProbability(doubled, stateId, edge.toStateId)).toBeCloseTo(edge.probability, 11);
      }
      for (const symbol of ['x', 'y']) expect(resultKernelProbability(doubled, stateId, symbol)).toBeCloseTo(resultKernelProbability(base, stateId, symbol), 11);
      expect(doubled.aggregatedPosteriorInitialCounts!.find((entry) => entry.stateId === stateId)!.expectedCount).toBeCloseTo(2 * base.aggregatedPosteriorInitialCounts!.find((entry) => entry.stateId === stateId)!.expectedCount, 11);
    }
    expect(doubled.currentTotalLogLikelihood).toBeCloseTo(2 * base.currentTotalLogLikelihood!, 11);
  });

  it('is invariant to caller ordering of initial, alphabet, kernel, monitor/evidence rows, and target-state lists', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const reorderedRecords = request.evidenceRecords.map((record) => ({
      ...record,
      monitorStates: [...record.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...record.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => [...layer].reverse()),
      initialEvidenceLikelihoods: [...record.initialEvidenceLikelihoods].reverse(),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) => [...layer].reverse()),
      ...(record.targetMonitorStates === undefined ? {} : { targetMonitorStates: [...record.targetMonitorStates].reverse() })
    }));
    const base = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const reordered = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      alphabet: [...request.alphabet].reverse(),
      kernel: [...request.kernel].reverse(),
      evidenceRecords: reorderedRecords
    }));
    compareAggregate(base, reordered);
  });

  it('is invariant to equivalent parallel concrete-transition split/merge representations', () => {
    const merged = twoStateModel();
    const split = parallelModel();
    const observations = [['x', 'y', 'x'], ['y', 'x']];
    const mergedRequest = standardRequest(observations.map((sequence, index) => oneStateMonitorRecord(merged, sequence, { recordId: `r${index}` })));
    const splitRequest = standardRequest(observations.map((sequence, index) => oneStateMonitorRecord(split, sequence, { recordId: `r${index}` })));
    const a = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(merged, mergedRequest));
    const b = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(split, splitRequest));
    compareAggregate(a, b);
    expect(b.diagnostics.parallelTransitionWithinPairRatioPreserved).toBe(true);
  });

  it('keeps terminal implicit self-retention structural while still permitting terminal-state emission learning', () => {
    const model = terminalModel();
    const request = {
      initialDistribution: [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'z', probability: 0.3 }
      ],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.75 },
        { stateId: 'a', symbol: 'y', probability: 0.25 },
        { stateId: 'z', symbol: 'x', probability: 0.2 },
        { stateId: 'z', symbol: 'y', probability: 0.8 }
      ],
      evidenceRecords: [oneStateMonitorRecord(model, ['x', 'y', 'y'])]
    };
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const terminalRow = result.transitionRows!.find((row) => row.stateId === 'z')!;
    expect(terminalRow.status).toBe('structural_terminal_self_retention');
    expect(terminalRow.updatedRow).toEqual([{ toStateId: 'z', probability: 1 }]);
    expect(terminalRow.expectedDepartureMass).toBe(0);
    expect(result.observationKernelRows!.find((row) => row.stateId === 'z')!.expectedOccupancy).toBeGreaterThan(0);
    expect(result.diagnostics.terminalRowsLearned).toBe(false);
  });

  it('keeps positive-probability direct underflow distinct from mathematical impossibility', () => {
    const model: DefinitionModel = { startState: 's', states: [{ id: 's' }], transitions: [{ from: 's', to: 's', probability: 1 }] };
    const horizon = 12;
    const observations = Array.from({ length: horizon + 1 }, () => 'x');
    const tiny = 1e-20;
    const record = oneStateMonitorRecord(model, observations, {
      stepLikelihoods: Array.from({ length: horizon }, () => ({ [pairKey('s', 's')]: tiny }))
    });
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 's', symbol: 'x', probability: tiny },
        { stateId: 's', symbol: 'y', probability: 1 - tiny }
      ],
      evidenceRecords: [record]
    }));
    expect(result.recordESteps[0]!.possible).toBe(true);
    expect(result.recordESteps[0]!.eventProbability).toBeNull();
    expect(result.recordESteps[0]!.logEventProbability).not.toBeNull();
    expect(Number.isFinite(result.recordESteps[0]!.logEventProbability!)).toBe(true);
    expect(result.diagnostics.anyCurrentEventProbabilityUnderflowed).toBe(true);
  });

  it('is invariant under simultaneous bijective hidden-state, monitor-state, and observation-symbol relabeling', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const original = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const renamedModel: DefinitionModel = {
      startState: 'u',
      states: [{ id: 'u' }, { id: 'v' }],
      transitions: model.transitions.map((entry) => ({
        ...entry,
        from: entry.from === 'a' ? 'u' : 'v',
        to: entry.to === 'a' ? 'u' : 'v'
      }))
    };
    const renamed = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(renamedModel, {
      initialDistribution: initialDistribution().map((entry) => ({ stateId: entry.stateId === 'a' ? 'u' : 'v', probability: entry.probability })),
      alphabet: ['m', 'n'],
      kernel: standardKernel().map((entry) => ({
        stateId: entry.stateId === 'a' ? 'u' : 'v',
        symbol: entry.symbol === 'x' ? 'm' : 'n',
        probability: entry.probability
      })),
      evidenceRecords: request.evidenceRecords.map(renameRecord)
    }));
    for (const [oldState, newState] of [['a', 'u'], ['b', 'v']] as const) {
      expect(resultInitialProbability(renamed, newState)).toBeCloseTo(resultInitialProbability(original, oldState), 11);
      for (const [oldSymbol, newSymbol] of [['x', 'm'], ['y', 'n']] as const) {
        expect(resultKernelProbability(renamed, newState, newSymbol)).toBeCloseTo(resultKernelProbability(original, oldState, oldSymbol), 11);
      }
    }
    expect(renamed.currentTotalLogLikelihood).toBeCloseTo(original.currentTotalLogLikelihood!, 11);
    expect(renamed.updatedTotalLogLikelihood).toBeCloseTo(original.updatedTotalLogLikelihood!, 11);
  });
});
