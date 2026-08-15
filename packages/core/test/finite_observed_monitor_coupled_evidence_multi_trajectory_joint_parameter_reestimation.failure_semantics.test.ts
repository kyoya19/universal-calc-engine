import { describe, expect, it } from 'vitest';
import {
  finiteHiddenStateObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResultToJson,
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  oneStateMonitorRecord,
  standardRequest,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function expectFailure(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>, code: string) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected Candidate AI hard failure');
  expect(result.failure.code).toBe(code);
}

describe('Candidate AI failure and boundary semantics', () => {
  it('rejects empty record collections and invalid record-resource guards without approximation', () => {
    const model = twoStateModel();
    const request = standardRequest();
    expectFailure(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: [] }),
      'empty_evidence_record_collection'
    );
    expectFailure(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, maxEvidenceRecords: 1 }),
      'candidate_ai_resource_limit_exceeded'
    );
  });

  it('rejects observation/horizon disagreement and unknown categorical observation symbols', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const mismatch = { ...request.evidenceRecords[0]!, observations: ['x'] };
    expectFailure(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: [mismatch] }),
      'observation_horizon_mismatch'
    );
    const unknown = oneStateMonitorRecord(model, ['unknown'], { recordId: 'unknown' });
    expectFailure(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: [unknown] }),
      'candidate_c_observation_failure'
    );
  });

  it('rejects duplicate record identifiers', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const duplicated = request.evidenceRecords.map((record) => ({ ...record, recordId: 'same' }));
    expectFailure(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: duplicated }),
      'duplicate_record_identifier'
    );
  });

  it('represents mathematically impossible combined evidence as analytical success without fabricating an update', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const impossible = {
      ...request.evidenceRecords[0]!,
      initialEvidenceLikelihoods: request.evidenceRecords[0]!.initialEvidenceLikelihoods.map((entry) => ({ ...entry, likelihood: 0 }))
    };
    const result = reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, { ...request, evidenceRecords: [impossible] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.possible).toBe(false);
    expect(result.updatedInitialDistribution).toBeNull();
    expect(result.transitionRows).toBeNull();
    expect(result.observationKernelRows).toBeNull();
    expect(result.currentTotalLogLikelihood).toBeNull();
    expect(result.updatedTotalLogLikelihood).toBeNull();
  });

  it('retains zero-information transition and observation rows exactly', () => {
    const model = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const request = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 'b', probability: 0 }
      ],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 1 },
        { stateId: 'a', symbol: 'y', probability: 0 },
        { stateId: 'b', symbol: 'x', probability: 0 },
        { stateId: 'b', symbol: 'y', probability: 1 }
      ],
      evidenceRecords: [oneStateMonitorRecord(model, ['x', 'x'])]
    };
    const result = reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('Expected possible zero-information fixture');
    const bTransition = result.transitionRows!.find((row) => row.stateId === 'b')!;
    const bEmission = result.observationKernelRows!.find((row) => row.stateId === 'b')!;
    expect(bTransition.status).toBe('retained_zero_expected_departure');
    expect(bTransition.updatedRow).toEqual(bTransition.currentRow);
    expect(bEmission.status).toBe('retained_zero_expected_occupancy');
    expect(bEmission.updatedRow).toEqual(bEmission.currentRow);
  });

  it('checked deterministic serialization rejects forged non-finite analytical values', () => {
    const forged = {
      ok: true,
      possible: true,
      evidenceRecordCount: 1,
      impossibleRecordIndex: null,
      impossibleRecordId: null,
      observationAlphabet: ['x'],
      currentInitialDistribution: [{ stateId: 'a', probability: Number.NaN }]
    } as never;
    expect(() => finiteHiddenStateObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResultToJson(forged)).toThrow(/non-finite/i);
  });
});
