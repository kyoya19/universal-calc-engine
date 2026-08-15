import { describe, expect, it } from 'vitest';
import { reestimateFiniteHiddenStateParametersJointOneStep } from '../src/hidden_state_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep } from '../src/hidden_state_multi_trajectory_joint_parameter_reestimation';
import {
  reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories
} from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import {
  initialDistribution,
  resultInitialProbability,
  resultTransitionProbability,
  standardHmmRecord,
  stateIds,
  twoStateModel
} from './finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation.test_helpers';

const alphabet = ['red', 'blue'];
const kernel = [
  { stateId: 'a', symbol: 'red', probability: 0.87 },
  { stateId: 'a', symbol: 'blue', probability: 0.13 },
  { stateId: 'b', symbol: 'red', probability: 0.22 },
  { stateId: 'b', symbol: 'blue', probability: 0.78 }
];

function requireAh(result: ReturnType<typeof reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error(result.ok ? 'expected possible AH result' : result.failure.message);
  return result;
}

function vRequest(observations: string[]) {
  return {
    initialDistribution: initialDistribution(),
    alphabet: [...alphabet],
    kernel: kernel.map((entry) => ({ ...entry })),
    observations
  };
}

function ahRequest(trajectories: string[][]) {
  const model = twoStateModel();
  return {
    initialDistribution: initialDistribution(),
    evidenceRecords: trajectories.map((trajectory, index) => standardHmmRecord(model, trajectory, kernel, `r${index + 1}`))
  };
}

function vInitial(result: Extract<ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStep>, { ok: true }>, stateId: string): number {
  return result.updatedInitialDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function vTransition(result: Extract<ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStep>, { ok: true }>, stateId: string, toStateId: string): number {
  return result.transitionRows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? 0;
}

function wInitial(result: Extract<ReturnType<typeof reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep>, { ok: true }>, stateId: string): number {
  return result.updatedInitialDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function wTransition(result: Extract<ReturnType<typeof reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep>, { ok: true }>, stateId: string, toStateId: string): number {
  return result.transitionRows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? 0;
}

describe('Candidate AH reductions and invariances', () => {
  it('K=1 standard-HMM compilation matches Candidate V initial and transition update blocks', () => {
    const observations = ['red', 'blue', 'blue', 'red'];
    const ah = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest([observations])));
    const v = reestimateFiniteHiddenStateParametersJointOneStep(twoStateModel(), vRequest(observations));
    expect(v.ok).toBe(true);
    if (!v.ok || !v.possible) throw new Error(v.ok ? 'expected possible V result' : v.failure.message);
    for (const stateId of stateIds(twoStateModel())) {
      expect(resultInitialProbability(ah, stateId)).toBeCloseTo(vInitial(v, stateId), 11);
      for (const toStateId of stateIds(twoStateModel())) {
        expect(resultTransitionProbability(ah, stateId, toStateId)).toBeCloseTo(vTransition(v, stateId, toStateId), 11);
      }
    }
    expect(ah.diagnostics.observationKernelUpdated).toBe(false);
  });

  it('multi-record standard-HMM compilation matches Candidate W initial and transition update blocks', () => {
    const trajectories = [
      ['red', 'blue', 'red', 'blue'],
      ['blue', 'blue', 'red'],
      ['red', 'red', 'blue', 'red']
    ];
    const ah = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest(trajectories)));
    const w = reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(twoStateModel(), {
      initialDistribution: initialDistribution(),
      alphabet: [...alphabet],
      kernel: kernel.map((entry) => ({ ...entry })),
      trajectories
    });
    expect(w.ok).toBe(true);
    if (!w.ok || !w.possible) throw new Error(w.ok ? 'expected possible W result' : w.failure.message);
    for (const stateId of stateIds(twoStateModel())) {
      expect(resultInitialProbability(ah, stateId)).toBeCloseTo(wInitial(w, stateId), 11);
      for (const toStateId of stateIds(twoStateModel())) {
        expect(resultTransitionProbability(ah, stateId, toStateId)).toBeCloseTo(wTransition(w, stateId, toStateId), 11);
      }
    }
    expect(ah.diagnostics.observationKernelUpdated).toBe(false);
  });

  it('is invariant to independent record permutation', () => {
    const trajectories = [['red', 'blue', 'red'], ['blue', 'red'], ['red', 'red', 'blue']];
    const a = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest(trajectories)));
    const b = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest([trajectories[2]!, trajectories[0]!, trajectories[1]!])));
    for (const stateId of stateIds(twoStateModel())) {
      expect(resultInitialProbability(a, stateId)).toBeCloseTo(resultInitialProbability(b, stateId), 12);
      for (const toStateId of stateIds(twoStateModel())) expect(resultTransitionProbability(a, stateId, toStateId)).toBeCloseTo(resultTransitionProbability(b, stateId, toStateId), 12);
    }
    expect(a.currentTotalLogLikelihood).toBeCloseTo(b.currentTotalLogLikelihood!, 12);
    expect(a.updatedTotalLogLikelihood).toBeCloseTo(b.updatedTotalLogLikelihood!, 12);
  });

  it('is invariant to equal full-dataset replication', () => {
    const trajectories = [['red', 'blue', 'red'], ['blue', 'red', 'blue']];
    const a = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest(trajectories)));
    const b = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), ahRequest([...trajectories, ...trajectories])));
    for (const stateId of stateIds(twoStateModel())) {
      expect(resultInitialProbability(a, stateId)).toBeCloseTo(resultInitialProbability(b, stateId), 12);
      for (const toStateId of stateIds(twoStateModel())) expect(resultTransitionProbability(a, stateId, toStateId)).toBeCloseTo(resultTransitionProbability(b, stateId, toStateId), 12);
    }
    expect(b.currentTotalLogLikelihood).toBeCloseTo(2 * a.currentTotalLogLikelihood!, 11);
    expect(b.updatedTotalLogLikelihood).toBeCloseTo(2 * a.updatedTotalLogLikelihood!, 11);
  });

  it('preserves the M-step when one complete evidence layer is legally scaled by a common factor', () => {
    const base = ahRequest([['red', 'blue', 'red']]);
    const scaled = structuredClone(base);
    for (const entry of scaled.evidenceRecords[0]!.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]!) entry.likelihood *= 0.5;
    const a = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), base));
    const b = requireAh(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), scaled));
    for (const stateId of stateIds(twoStateModel())) {
      expect(resultInitialProbability(a, stateId)).toBeCloseTo(resultInitialProbability(b, stateId), 12);
      for (const toStateId of stateIds(twoStateModel())) expect(resultTransitionProbability(a, stateId, toStateId)).toBeCloseTo(resultTransitionProbability(b, stateId, toStateId), 12);
    }
    expect(b.currentTotalLogLikelihood! - a.currentTotalLogLikelihood!).toBeCloseTo(Math.log(0.5), 11);
    expect(b.updatedTotalLogLikelihood! - a.updatedTotalLogLikelihood!).toBeCloseTo(Math.log(0.5), 11);
  });
});
