import { describe, expect, it } from 'vitest';
import {
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep } from '../src/hidden_state_multi_trajectory_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateParametersJointOneStep } from '../src/hidden_state_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateObservationKernelOneStep } from '../src/hidden_state_observation_kernel_reestimation';
import { reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories } from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import { conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates } from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  oneStateMonitorRecord,
  pairKey,
  resultInitialProbability,
  resultKernelProbability,
  resultTransitionProbability,
  standardKernel,
  standardRequest,
  stateIds,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireAi(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AI result');
  return result;
}

function compareAiWithJointRows(
  ai: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  other: {
    updatedInitialDistribution: Array<{ stateId: string; probability: number }> | null;
    transitionRows: Array<{ stateId: string; updatedRow: Array<{ toStateId: string; probability: number }> }> | null;
    observationKernelRows: Array<{ stateId: string; updatedRow: Array<{ symbol: string; probability: number }> }> | null;
  },
  states: string[],
  symbols: string[]
) {
  expect(other.updatedInitialDistribution).not.toBeNull();
  expect(other.transitionRows).not.toBeNull();
  expect(other.observationKernelRows).not.toBeNull();
  for (const stateId of states) {
    expect(resultInitialProbability(ai, stateId)).toBeCloseTo(other.updatedInitialDistribution!.find((entry) => entry.stateId === stateId)!.probability, 11);
    for (const transition of ai.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow) {
      const expected = other.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.toStateId === transition.toStateId);
      expect(expected).toBeDefined();
      expect(transition.probability).toBeCloseTo(expected!.probability, 11);
    }
    for (const symbol of symbols) {
      const expected = other.observationKernelRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.symbol === symbol);
      expect(expected).toBeDefined();
      expect(resultKernelProbability(ai, stateId, symbol)).toBeCloseTo(expected!.probability, 11);
    }
  }
}

describe('Candidate AI reductions to qualified A-through-AH semantics', () => {
  it('reduces exactly to Candidate W when every external evidence factor is one and all monitor states are targeted', () => {
    const model = twoStateModel();
    const trajectories = [['x', 'y', 'x'], ['y', 'x']];
    const records = trajectories.map((observations, index) => oneStateMonitorRecord(model, observations, { recordId: `r${index}` }));
    const request = standardRequest(records);
    const ai = requireAi(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const w = reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model, {
      initialDistribution: request.initialDistribution,
      alphabet: request.alphabet,
      kernel: request.kernel,
      trajectories
    });
    expect(w.ok).toBe(true);
    if (!w.ok || !w.possible) throw new Error('Expected possible Candidate W result');
    compareAiWithJointRows(ai, w, stateIds(model), request.alphabet);
    expect(ai.currentTotalLogLikelihood).toBeCloseTo(w.originalTotalLogLikelihood!, 11);
    expect(ai.updatedTotalLogLikelihood).toBeCloseTo(w.updatedTotalLogLikelihood!, 11);
  });

  it('reduces exactly to Candidate V for K=1 under neutral external evidence', () => {
    const model = twoStateModel();
    const observations = ['x', 'y', 'x'];
    const record = oneStateMonitorRecord(model, observations);
    const request = standardRequest([record]);
    const ai = requireAi(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const v = reestimateFiniteHiddenStateParametersJointOneStep(model, {
      initialDistribution: request.initialDistribution,
      alphabet: request.alphabet,
      kernel: request.kernel,
      observations
    });
    expect(v.ok).toBe(true);
    if (!v.ok || !v.possible) throw new Error('Expected possible Candidate V result');
    compareAiWithJointRows(ai, v, stateIds(model), request.alphabet);
  });

  it('reduces its B block to Candidate T when the one-state pi/A blocks are analytically inert', () => {
    const model = { startState: 's', states: [{ id: 's' }], transitions: [{ from: 's', to: 's', probability: 1 }] };
    const observations = ['x', 'y', 'x', 'x'];
    const request = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 's', symbol: 'x', probability: 0.5 },
        { stateId: 's', symbol: 'y', probability: 0.5 }
      ],
      evidenceRecords: [oneStateMonitorRecord(model, observations)]
    };
    const ai = requireAi(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const t = reestimateFiniteHiddenStateObservationKernelOneStep(model, {
      initialDistribution: request.initialDistribution,
      alphabet: request.alphabet,
      kernel: request.kernel,
      observations
    });
    expect(t.ok).toBe(true);
    if (!t.ok || !t.possible || t.rows === null) throw new Error('Expected possible Candidate T result');
    const tRow = t.rows.find((row) => row.stateId === 's')!;
    expect(resultInitialProbability(ai, 's')).toBe(1);
    expect(resultTransitionProbability(ai, 's', 's')).toBe(1);
    for (const symbol of request.alphabet) {
      expect(resultKernelProbability(ai, 's', symbol)).toBeCloseTo(tRow.updatedRow.find((entry) => entry.symbol === symbol)!.probability, 14);
    }
  });

  it('matches Candidate AH posterior and pi/A update when current B factors are folded into the AE-class evidence likelihoods', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const ai = requireAi(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const b = (stateId: string, symbol: string) => request.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)!.probability;
    const foldedRecords = request.evidenceRecords.map((record) => ({
      ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
      horizon: record.horizon,
      monitorStates: record.monitorStates,
      initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState,
      monitorTransitionByStep: record.monitorTransitionByStep,
      initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({
        ...entry,
        likelihood: entry.likelihood * b(entry.stateId, record.observations[0]!)
      })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer, layerIndex) =>
        layer.map((entry) => ({
          ...entry,
          likelihood: entry.likelihood * b(entry.toStateId, record.observations[layerIndex + 1]!)
        }))
      ),
      ...(record.targetMonitorStates === undefined ? {} : { targetMonitorStates: record.targetMonitorStates })
    }));
    const ah = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, {
      initialDistribution: request.initialDistribution,
      evidenceRecords: foldedRecords
    });
    expect(ah.ok).toBe(true);
    if (!ah.ok || !ah.possible) throw new Error('Expected possible Candidate AH folded-evidence result');
    for (const stateId of stateIds(model)) {
      expect(resultInitialProbability(ai, stateId)).toBeCloseTo(ah.updatedInitialDistribution!.find((entry) => entry.stateId === stateId)!.probability, 12);
      for (const edge of ai.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow) {
        expect(edge.probability).toBeCloseTo(ah.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.toStateId === edge.toStateId)!.probability, 12);
      }
    }
  });

  it('reduces normalized posterior statistics to Candidate AE when B is hidden-state independent within every observation layer', () => {
    const model = twoStateModel();
    const record = standardRequest().evidenceRecords[0]!;
    const kernel = [
      { stateId: 'a', symbol: 'x', probability: 0.6 },
      { stateId: 'a', symbol: 'y', probability: 0.4 },
      { stateId: 'b', symbol: 'x', probability: 0.6 },
      { stateId: 'b', symbol: 'y', probability: 0.4 }
    ];
    const request = { ...standardRequest([record]), kernel };
    const ai = requireAi(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const ae = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(model, {
      initialDistribution: request.initialDistribution,
      horizon: record.horizon,
      monitorStates: record.monitorStates,
      initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState,
      monitorTransitionByStep: record.monitorTransitionByStep,
      initialEvidenceLikelihoods: record.initialEvidenceLikelihoods,
      monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep,
      targetMonitorStates: record.targetMonitorStates ?? record.monitorStates
    });
    expect(ae.ok).toBe(true);
    if (!ae.ok || !ae.possible) throw new Error('Expected possible Candidate AE result');
    const captured = ai.recordESteps[0]!;
    for (const expected of ae.smoothingSteps![0]!.hiddenStateDistribution) {
      expect(captured.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === expected.stateId)!.probability).toBeCloseTo(expected.probability, 12);
    }
    for (const expected of ae.expectedTransitionCounts!) {
      expect(captured.expectedTransitionCounts!.find((entry) => entry.fromStateId === expected.fromStateId && entry.toStateId === expected.toStateId)!.expectedCount).toBeCloseTo(expected.expectedCount, 12);
    }
  });
});
