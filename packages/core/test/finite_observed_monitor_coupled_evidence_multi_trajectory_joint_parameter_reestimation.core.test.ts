import { describe, expect, it } from 'vitest';
import {
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import { DefinitionModel, StateId } from '../src/model';
import {
  cartesianPairs,
  completeBatchOracle,
  effectivePairs,
  oneStateMonitorRecord,
  pairKey,
  resultInitialProbability,
  resultKernelProbability,
  resultTransitionProbability,
  standardRequest,
  stateIds,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function qMemoryModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
    transitions: [
      { from: 'a', to: 'c', probability: 1 },
      { from: 'b', to: 'c', probability: 1 },
      { from: 'c', to: 'd', probability: 1 },
      { from: 'd', to: 'd', probability: 1 }
    ]
  };
}

function qMemoryRecord(model: DefinitionModel, qAScore: number, qBScore: number): FiniteObservedMonitorCoupledEvidenceReestimationRecord {
  const qs = ['qA', 'qB'];
  const monitorPairs = effectivePairs(model);
  const evidencePairs = cartesianPairs(model);
  const monitorLayer = qs.flatMap((monitorStateId) =>
    monitorPairs.map(([fromStateId, toStateId]) => ({ monitorStateId, fromStateId, toStateId, nextMonitorStateId: monitorStateId }))
  );
  const evidenceLayer = (step: number) => qs.flatMap((monitorStateId) =>
    evidencePairs.map(([fromStateId, toStateId]) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      likelihood:
        step === 2 && fromStateId === 'c' && toStateId === 'd'
          ? monitorStateId === 'qA' ? qAScore : qBScore
          : 1
    }))
  );
  return {
    recordId: 'q-memory',
    horizon: 2,
    observations: ['x', 'x', 'x'],
    monitorStates: qs,
    initialMonitorStateByHiddenState: stateIds(model).map((stateId) => ({
      stateId,
      monitorStateId: stateId === 'b' ? 'qB' : 'qA'
    })),
    monitorTransitionByStep: [monitorLayer, monitorLayer.map((entry) => ({ ...entry }))],
    initialEvidenceLikelihoods: stateIds(model).map((stateId) => ({ stateId, likelihood: 1 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: [evidenceLayer(1), evidenceLayer(2)]
  };
}

function qMemoryRequest(qAScore: number, qBScore: number): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest {
  const model = qMemoryModel();
  const kernel = stateIds(model).flatMap((stateId) => [
    { stateId, symbol: 'x', probability: 0.5 },
    { stateId, symbol: 'y', probability: 0.5 }
  ]);
  const neutralSecond = oneStateMonitorRecord(model, ['y'], { recordId: 'neutral-y' });
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.5 },
      { stateId: 'b', probability: 0.5 },
      { stateId: 'c', probability: 0 },
      { stateId: 'd', probability: 0 }
    ],
    alphabet: ['x', 'y'],
    kernel,
    evidenceRecords: [qMemoryRecord(model, qAScore, qBScore), neutralSecond]
  };
}

describe('Candidate AI core observed plus monitor-coupled evidence qualification', () => {
  it('matches independent complete concrete-transition path enumeration for G, Nbar, M, simultaneous pi/A/B update, and both likelihoods', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const oracle = completeBatchOracle(model, request);
    expect(oracle.possible).toBe(true);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(result.possible).toBe(true);
    for (const stateId of stateIds(model)) {
      expect(resultInitialProbability(result, stateId)).toBeCloseTo(oracle.updatedInitial!.get(stateId) ?? 0, 11);
      for (const toStateId of oracle.updatedRows!.get(stateId)?.keys() ?? []) {
        expect(resultTransitionProbability(result, stateId, toStateId)).toBeCloseTo(oracle.updatedRows!.get(stateId)!.get(toStateId) ?? 0, 11);
      }
      for (const symbol of request.alphabet) {
        expect(resultKernelProbability(result, stateId, symbol)).toBeCloseTo(oracle.updatedKernel!.get(stateId)!.get(symbol) ?? 0, 11);
      }
    }
    expect(result.currentTotalLogLikelihood).toBeCloseTo(oracle.currentTotalLogLikelihood!, 11);
    expect(result.updatedTotalLogLikelihood).toBeCloseTo(oracle.updatedTotalLogLikelihood!, 11);
    expect(result.likelihoodDelta).toBeCloseTo(oracle.updatedTotalLogLikelihood! - oracle.currentTotalLogLikelihood!, 11);
    expect(result.diagnostics.allRecordEStepsUseSameCurrentModel).toBe(true);
    expect(result.diagnostics.allRecordEStepsFrozenBeforeMstep).toBe(true);
    expect(result.diagnostics.jointSimultaneousApplication).toBe(true);
    expect(result.diagnostics.observationKernelUpdated).toBe(true);
    expect(result.diagnostics.calibratedEvidenceKernelUpdated).toBe(false);
  });

  it('uses the deterministic monitor state to let 0.9 versus 0.1 external evidence change posterior emission counts and the B M-step', () => {
    const model = qMemoryModel();
    const weighted = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, qMemoryRequest(0.9, 0.1)));
    const neutral = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, qMemoryRequest(1, 1)));
    expect(weighted.possible).toBe(true);
    expect(neutral.possible).toBe(true);
    const weightedA = weighted.recordESteps[0]!.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === 'a')!.probability;
    const neutralA = neutral.recordESteps[0]!.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === 'a')!.probability;
    expect(weightedA).toBeGreaterThan(neutralA + 0.3);
    expect(resultKernelProbability(weighted, 'a', 'x')).toBeGreaterThan(resultKernelProbability(neutral, 'a', 'x') + 0.1);
    expect(weighted.diagnostics.separateExternalCalibratedEvidenceUsed).toBe(true);
    expect(weighted.diagnostics.externalEvidenceMutationUsed).toBe(false);
  });

  it('does not invent cross-record transitions by concatenating independent records', () => {
    const model = twoStateModel();
    const records = [
      oneStateMonitorRecord(model, ['x', 'y'], { recordId: 'r1' }),
      oneStateMonitorRecord(model, ['y', 'x'], { recordId: 'r2' })
    ];
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, standardRequest(records)));
    expect(result.possible).toBe(true);
    const learnedDeparture = result.transitionRows!.filter((row) => !row.terminal).reduce((sum, row) => sum + row.expectedDepartureMass, 0);
    expect(learnedDeparture).toBeCloseTo(2, 11);
    expect(learnedDeparture).not.toBeCloseTo(3, 11);
    expect(result.diagnostics.trajectoryConcatenationUsed).toBe(false);
    expect(result.diagnostics.sequentialRecordUpdatesUsed).toBe(false);
  });

  it('does not mutate external evidence or deterministic monitor inputs during the simultaneous M-step', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const before = JSON.stringify(request.evidenceRecords);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(result.possible).toBe(true);
    expect(JSON.stringify(request.evidenceRecords)).toBe(before);
    expect(result.diagnostics.calibratedEvidenceKernelUpdated).toBe(false);
    expect(result.diagnostics.monitorTransitionUpdated).toBe(false);
    expect(result.diagnostics.externalEvidenceMutationUsed).toBe(false);
  });

  it('treats omitted targetMonitorStates exactly like targeting every declared monitor state', () => {
    const model = twoStateModel();
    const base = standardRequest().evidenceRecords[0]!;
    const omitted = { ...base };
    delete omitted.targetMonitorStates;
    const explicit = { ...base, targetMonitorStates: [...base.monitorStates] };
    const a = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, standardRequest([omitted])));
    const b = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, standardRequest([explicit])));
    expect(a).toEqual(b);
  });
});
