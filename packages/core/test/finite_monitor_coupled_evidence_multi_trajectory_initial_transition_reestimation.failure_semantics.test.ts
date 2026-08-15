import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  finiteHiddenStateMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResultToJson,
  reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories
} from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import {
  effectivePairs,
  initialDistribution,
  oneStateMonitorRecord,
  pairKey,
  twoStateModel
} from './finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation.test_helpers';

function ordinaryRecord(recordId?: string) {
  const model = twoStateModel();
  return oneStateMonitorRecord(model, {
    ...(recordId === undefined ? {} : { recordId }),
    initialLikelihoods: { a: 0.8, b: 0.3 },
    stepLikelihoods: [Object.fromEntries(effectivePairs(model).map(([from, to]) => [pairKey(from, to), from === to ? 0.7 : 0.45]))]
  });
}

describe('Candidate AH failure, impossibility, underflow and serialization semantics', () => {
  it('returns analytical possible=false for an impossible record without fabricating an update', () => {
    const model = twoStateModel();
    const impossible = oneStateMonitorRecord(model, {
      initialLikelihoods: { a: 0, b: 0 },
      stepLikelihoods: []
    });
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, {
      initialDistribution: initialDistribution(),
      evidenceRecords: [impossible]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.possible).toBe(false);
    expect(result.impossibleRecordIndex).toBe(0);
    expect(result.updatedInitialDistribution).toBeNull();
    expect(result.transitionRows).toBeNull();
    expect(result.updatedTotalLogLikelihood).toBeNull();
  });

  it('keeps mathematically positive direct-probability underflow distinct from impossibility', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const pairs = effectivePairs(model);
    const tiny = Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), 1e-3]));
    const record = oneStateMonitorRecord(model, {
      initialLikelihoods: { s: 1e-3 },
      stepLikelihoods: Array.from({ length: 200 }, () => ({ ...tiny }))
    });
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      evidenceRecords: [record]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.possible).toBe(true);
    expect(result.recordESteps[0]!.eventProbability).toBeNull();
    expect(result.recordESteps[0]!.logEventProbability).not.toBeNull();
    expect(Number.isFinite(result.recordESteps[0]!.logEventProbability!)).toBe(true);
    expect(result.recordESteps[0]!.eventProbabilityUnderflowed).toBe(true);
    expect(result.diagnostics.anyCurrentEventProbabilityUnderflowed).toBe(true);
  });

  it('fails rather than truncating when the finite evidence-record guard is exceeded', () => {
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), {
      initialDistribution: initialDistribution(),
      evidenceRecords: [ordinaryRecord('r1'), ordinaryRecord('r2')],
      maxEvidenceRecords: 1
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected resource failure');
    expect(result.failure.code).toBe('candidate_ah_resource_limit_exceeded');
  });

  it('rejects duplicate record identifiers and non-finite tolerances as hard malformed-input failures', () => {
    const duplicate = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), {
      initialDistribution: initialDistribution(),
      evidenceRecords: [ordinaryRecord('same'), ordinaryRecord('same')]
    });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('expected duplicate identifier failure');
    expect(duplicate.failure.code).toBe('duplicate_record_identifier');

    const nonFinite = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), {
      initialDistribution: initialDistribution(),
      evidenceRecords: [ordinaryRecord()],
      likelihoodTolerance: Number.NaN
    });
    expect(nonFinite.ok).toBe(false);
    if (nonFinite.ok) throw new Error('expected tolerance failure');
    expect(nonFinite.failure.code).toBe('invalid_reestimation_tolerance');
  });

  it('serializes deterministically and rejects non-finite analytical values', () => {
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(twoStateModel(), {
      initialDistribution: initialDistribution(),
      evidenceRecords: [ordinaryRecord()]
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    const first = finiteHiddenStateMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResultToJson(result);
    const second = finiteHiddenStateMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResultToJson(structuredClone(result));
    expect(first).toBe(second);
    const corrupted = structuredClone(result) as typeof result & { currentTotalLogLikelihood: number };
    corrupted.currentTotalLogLikelihood = Number.POSITIVE_INFINITY;
    expect(() => finiteHiddenStateMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResultToJson(corrupted)).toThrow(/non-finite/i);
  });
});
