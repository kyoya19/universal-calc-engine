import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult,
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult,
  analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates,
  finiteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResultToJson,
  finiteDeterministicTrajectoryMonitorCalibratedEvidenceResultToJson
} from '../src/finite_deterministic_trajectory_monitor_calibrated_evidence';

type Analysis = Extract<FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult, { ok: true }>;
type Conditioned = Extract<FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult, { ok: true }>;

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.55 },
    { from: 'a', to: 'b', probability: 0.45 },
    { from: 'b', to: 'a', probability: 0.3 },
    { from: 'b', to: 'b', probability: 0.7 }
  ]
};

function requireAnalysis(result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult): Analysis {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult): Conditioned {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function monitorRows(
  horizon: number,
  states: string[],
  rule: (monitorStateId: string, from: string, to: string, step: number) => string
) {
  const pairs = [
    ['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']
  ] as const;
  return Array.from({ length: horizon }, (_, index) => states.flatMap((monitorStateId) =>
    pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      nextMonitorStateId: rule(monitorStateId, fromStateId, toStateId, index + 1)
    }))
  ));
}

function baseRequest(horizon = 2): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const monitorStates = ['clean', 'saw_b'];
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    horizon,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'clean' },
      { stateId: 'b', monitorStateId: 'saw_b' }
    ],
    monitorTransitionByStep: monitorRows(
      horizon,
      monitorStates,
      (q, _from, to) => q === 'saw_b' || to === 'b' ? 'saw_b' : 'clean'
    ),
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.3 }],
      [{ stateId: 'a', likelihood: 0.4 }, { stateId: 'b', likelihood: 0.9 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }]
    ].slice(0, horizon + 1)
  };
}

function monitorProbability(analysis: Analysis, monitorStateId: string): number {
  return analysis.finalEvidenceConditionedMonitorDistribution?.find((entry) => entry.monitorStateId === monitorStateId)?.probability ?? 0;
}

describe('Candidate AC finite deterministic trajectory monitor', () => {
  it('tracks a finite-memory path property and conditions on its terminal monitor state', () => {
    const analysis = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, baseRequest()));
    expect(analysis.possible).toBe(true);
    expect(analysis.diagnostics.monitorDeterministic).toBe(true);
    expect(monitorProbability(analysis, 'saw_b')).toBeGreaterThan(0);
    expect(monitorProbability(analysis, 'clean')).toBeGreaterThan(0);

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: ['clean'] }
      )
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.smoothingSteps).toHaveLength(3);
    expect(conditioned.pairwiseSteps).toHaveLength(2);
    expect(conditioned.expectedTransitionCounts?.reduce((sum, entry) => sum + entry.expectedCount, 0)).toBeCloseTo(2, 12);
    expect(conditioned.smoothingSteps?.[2]?.monitorStateDistribution.find((entry) => entry.monitorStateId === 'clean')?.probability).toBeCloseTo(1, 14);
  });

  it('does not leak future evidence or future monitor layers into earlier prefix results', () => {
    const first = baseRequest();
    const second = baseRequest();
    second.evidenceLikelihoods[2] = [{ stateId: 'a', likelihood: 0.01 }, { stateId: 'b', likelihood: 1 }];
    second.monitorTransitionByStep[1] = second.monitorTransitionByStep[1]!.map((entry) => ({
      ...entry,
      nextMonitorStateId: entry.monitorStateId
    }));
    const a = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, first));
    const b = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, second));
    expect(b.trajectory[0]).toEqual(a.trajectory[0]);
    expect(b.trajectory[1]).toEqual(a.trajectory[1]);
    expect(b.finalEvidenceConditionedMonitorDistribution).not.toEqual(a.finalEvidenceConditionedMonitorDistribution);
  });

  it('treats an empty target set as analytical monitor-event impossibility', () => {
    const result = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: [] }
      )
    );
    expect(result.ok).toBe(true);
    expect(result.possible).toBe(false);
    expect(result.evidencePossible).toBe(true);
    expect(result.monitorEventPossible).toBe(false);
    expect(result.impossibility).toBe('monitor_event');
  });

  it('distinguishes evidence impossibility and joint impossibility', () => {
    const horizonZero = baseRequest(0);
    horizonZero.evidenceLikelihoods = [[{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 0 }]];
    const joint = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...horizonZero, targetMonitorStates: ['saw_b'] }
      )
    );
    expect(joint.monitorEventPossible).toBe(true);
    expect(joint.evidencePossible).toBe(true);
    expect(joint.jointPossible).toBe(false);
    expect(joint.impossibility).toBe('joint');

    const impossible = baseRequest(0);
    impossible.evidenceLikelihoods = [[{ stateId: 'a', likelihood: 0 }, { stateId: 'b', likelihood: 0 }]];
    const evidence = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...impossible, targetMonitorStates: ['clean'] }
      )
    );
    expect(evidence.impossibility).toBe('evidence');
  });

  it('preserves positive evidence and target-event log mass under direct Float64 underflow', () => {
    const oneState: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const horizon = 400;
    const request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      horizon,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: [{ stateId: 's', monitorStateId: 'q' }],
      monitorTransitionByStep: Array.from({ length: horizon }, () => [{
        monitorStateId: 'q', fromStateId: 's', toStateId: 's', nextMonitorStateId: 'q'
      }]),
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () => [{ stateId: 's', likelihood: 0.1 }])
    };
    const analysis = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(oneState, request));
    expect(analysis.possible).toBe(true);
    expect(analysis.evidenceProbability).toBeNull();
    expect(analysis.logEvidenceProbability).toBeCloseTo((horizon + 1) * Math.log(0.1), 9);
    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        oneState,
        { ...request, targetMonitorStates: ['q'] }
      )
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.jointEventProbability).toBeNull();
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect(conditioned.diagnostics.jointEventProbabilityUnderflowed).toBe(true);
  });

  it('canonicalizes request ordering and enforces deterministic monitor completeness/resource guards', () => {
    const ordered = baseRequest();
    const reversed: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      ...ordered,
      initialDistribution: [...ordered.initialDistribution].reverse(),
      monitorStates: [...ordered.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...ordered.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: ordered.monitorTransitionByStep.map((row) => [...row].reverse()),
      evidenceLikelihoods: ordered.evidenceLikelihoods.map((row) => [...row].reverse())
    };
    const a = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, ordered));
    const b = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, reversed));
    expect(b).toEqual(a);

    const incomplete = baseRequest();
    incomplete.monitorTransitionByStep[0] = incomplete.monitorTransitionByStep[0]!.slice(1);
    const missing = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, incomplete);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.code).toBe('missing_deterministic_trajectory_monitor_transition_entry');

    const guarded = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, baseRequest(), { maxMonitorStates: 1 });
    expect(guarded.ok).toBe(false);
    if (!guarded.ok) expect(guarded.failure.code).toBe('deterministic_trajectory_monitor_resource_limit_exceeded');
  });

  it('uses checked deterministic serialization and rejects forged non-finite values', () => {
    const analysis = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, baseRequest()));
    expect(finiteDeterministicTrajectoryMonitorCalibratedEvidenceResultToJson(analysis)).toBe(JSON.stringify(analysis));
    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: ['saw_b'] }
      )
    );
    expect(finiteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResultToJson(conditioned)).toBe(JSON.stringify(conditioned));
    const forged = structuredClone(analysis) as Analysis;
    forged.diagnostics.probabilityTolerance = Number.POSITIVE_INFINITY;
    expect(() => finiteDeterministicTrajectoryMonitorCalibratedEvidenceResultToJson(forged)).toThrow(/non-finite/);
  });
});
