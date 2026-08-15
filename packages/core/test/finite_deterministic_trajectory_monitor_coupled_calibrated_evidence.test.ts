import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  MonitorCoupledCalibratedEvidenceLikelihoodEntry,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates,
  finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResultToJson,
  finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResultToJson
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

function requireAnalysis(
  result: ReturnType<typeof analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(
  result: ReturnType<typeof conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

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

function monitorRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId, step: number) => string
) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, (_, index) =>
    monitorStates.flatMap((monitorStateId) =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        nextMonitorStateId: rule(monitorStateId, fromStateId, toStateId, index + 1)
      }))
    )
  );
}

function coupledRows(
  stateIds: StateId[],
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId) => number
): MonitorCoupledCalibratedEvidenceLikelihoodEntry[] {
  return monitorStates.flatMap((monitorStateId) =>
    stateIds.flatMap((fromStateId) =>
      stateIds.map((toStateId) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        likelihood: rule(monitorStateId, fromStateId, toStateId)
      }))
    )
  );
}

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

function baseRequest(horizon = 2): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  const monitorStates = ['clean', 'saw_b'];
  const stateIds = ['a', 'b'];
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
      model,
      horizon,
      monitorStates,
      (q, _from, to) => (q === 'saw_b' || to === 'b' ? 'saw_b' : 'clean')
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.3 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
      { length: horizon },
      (_, step) =>
        coupledRows(stateIds, monitorStates, (q, from, to) => {
          if (step === 0) {
            if (q === 'clean' && from === 'a' && to === 'b') return 0.9;
            if (q === 'saw_b' && from === 'b' && to === 'a') return 0.15;
            return q === 'clean' ? 0.55 : 0.7;
          }
          if (q === 'clean' && from === 'a' && to === 'a') return 0.8;
          if (q === 'saw_b' && from === 'a' && to === 'b') return 0.2;
          return q === 'clean' ? 0.45 : 0.9;
        })
    )
  };
}

describe('Candidate AE monitor-coupled calibrated evidence', () => {
  it('distinguishes the same hidden pair using finite prior monitor history', () => {
    const witness: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd', terminal: true }],
      transitions: [
        { from: 'a', to: 'c', probability: 1 },
        { from: 'b', to: 'c', probability: 1 },
        { from: 'c', to: 'd', probability: 1 }
      ]
    };
    const stateIds = ['a', 'b', 'c', 'd'];
    const monitorStates = ['q_a', 'q_b'];
    const request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: stateIds.map((stateId) => ({
        stateId,
        probability: stateId === 'a' || stateId === 'b' ? 0.5 : 0
      })),
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: stateIds.map((stateId) => ({
        stateId,
        monitorStateId: stateId === 'b' ? 'q_b' : 'q_a'
      })),
      monitorTransitionByStep: monitorRows(witness, 2, monitorStates, (q) => q),
      initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: [
        coupledRows(stateIds, monitorStates, () => 1),
        coupledRows(stateIds, monitorStates, (q, from, to) => {
          if (from === 'c' && to === 'd') return q === 'q_a' ? 0.9 : 0.1;
          return 1;
        })
      ]
    };

    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(witness, request)
    );
    expect(analysis.evidenceProbability).toBeCloseTo(0.5, 14);

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        witness,
        { ...request, targetMonitorStates: monitorStates }
      )
    );
    const initial = conditioned.smoothingSteps![0]!.hiddenStateDistribution;
    expect(initial.find((entry) => entry.stateId === 'a')!.probability).toBeCloseTo(0.9, 14);
    expect(initial.find((entry) => entry.stateId === 'b')!.probability).toBeCloseTo(0.1, 14);
  });

  it('does not leak future coupled evidence or future monitor layers into earlier prefixes', () => {
    const first = baseRequest();
    const second = baseRequest();
    second.monitorCoupledTransitionEvidenceLikelihoodsByStep[1] =
      second.monitorCoupledTransitionEvidenceLikelihoodsByStep[1]!.map((entry) => ({
        ...entry,
        likelihood:
          entry.monitorStateId === 'saw_b' && entry.fromStateId === 'a' && entry.toStateId === 'b'
            ? 0.01
            : 1
      }));
    second.monitorTransitionByStep[1] = second.monitorTransitionByStep[1]!.map((entry) => ({
      ...entry,
      nextMonitorStateId: entry.monitorStateId
    }));

    const a = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, first)
    );
    const b = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, second)
    );
    expect(b.trajectory[0]).toEqual(a.trajectory[0]);
    expect(b.trajectory[1]).toEqual(a.trajectory[1]);
    expect(b.finalEvidenceConditionedMonitorDistribution).not.toEqual(
      a.finalEvidenceConditionedMonitorDistribution
    );
  });

  it('separates evidence, monitor-event and joint-event impossibility', () => {
    const empty = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: [] }
      )
    );
    expect(empty.impossibility).toBe('monitor_event');

    const evidenceRequest = baseRequest(0);
    evidenceRequest.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0 },
      { stateId: 'b', likelihood: 0 }
    ];
    const evidence = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...evidenceRequest, targetMonitorStates: ['clean'] }
      )
    );
    expect(evidence.impossibility).toBe('evidence');

    const jointRequest = baseRequest(0);
    jointRequest.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 1 },
      { stateId: 'b', likelihood: 0 }
    ];
    const joint = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...jointRequest, targetMonitorStates: ['saw_b'] }
      )
    );
    expect(joint.evidencePossible).toBe(true);
    expect(joint.monitorEventPossible).toBe(true);
    expect(joint.jointPossible).toBe(false);
    expect(joint.impossibility).toBe('joint');
  });

  it('preserves mathematically positive evidence and joint mass under Float64 underflow', () => {
    const oneState: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const horizon = 400;
    const request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      horizon,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: [{ stateId: 's', monitorStateId: 'q' }],
      monitorTransitionByStep: Array.from({ length: horizon }, () => [
        { monitorStateId: 'q', fromStateId: 's', toStateId: 's', nextMonitorStateId: 'q' }
      ]),
      initialEvidenceLikelihoods: [{ stateId: 's', likelihood: 0.1 }],
      monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, () => [
        { monitorStateId: 'q', fromStateId: 's', toStateId: 's', likelihood: 0.1 }
      ])
    };
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(oneState, request)
    );
    expect(analysis.possible).toBe(true);
    expect(analysis.evidenceProbability).toBeNull();
    expect(analysis.logEvidenceProbability).toBeCloseTo((horizon + 1) * Math.log(0.1), 9);

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        oneState,
        { ...request, targetMonitorStates: ['q'] }
      )
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.jointEventProbability).toBeNull();
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect(conditioned.diagnostics.jointEventProbabilityUnderflowed).toBe(true);
  });

  it('requires every q-by-ordered-pair row and rejects invalid likelihoods', () => {
    const incomplete = baseRequest();
    incomplete.monitorCoupledTransitionEvidenceLikelihoodsByStep[0] =
      incomplete.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]!.slice(1);
    const missing = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      incomplete
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.failure.code).toBe('missing_monitor_coupled_calibrated_evidence_entry');
    }

    const invalid = baseRequest();
    invalid.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]![0] = {
      ...invalid.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]![0]!,
      likelihood: 1.1
    };
    const bad = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      invalid
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.failure.code).toBe('invalid_monitor_coupled_calibrated_evidence_likelihood');
    }
  });

  it('canonicalizes request ordering and enforces finite resource guards without fallback', () => {
    const ordered = baseRequest();
    const reversed: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      ...ordered,
      initialDistribution: [...ordered.initialDistribution].reverse(),
      monitorStates: [...ordered.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...ordered.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: ordered.monitorTransitionByStep.map((row) => [...row].reverse()),
      initialEvidenceLikelihoods: [...ordered.initialEvidenceLikelihoods].reverse(),
      monitorCoupledTransitionEvidenceLikelihoodsByStep:
        ordered.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    const a = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, ordered)
    );
    const b = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, reversed)
    );
    expect(b).toEqual(a);

    const guarded = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      baseRequest(),
      { maxMonitorCoupledEvidenceEntries: 1 }
    );
    expect(guarded.ok).toBe(false);
    if (!guarded.ok) expect(guarded.failure.code).toBe('candidate_ae_resource_limit_exceeded');
  });

  it('uses checked deterministic serialization and rejects forged non-finite values', () => {
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, baseRequest())
    );
    expect(
      finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResultToJson(analysis)
    ).toBe(JSON.stringify(analysis));

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: ['saw_b'] }
      )
    );
    expect(
      finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResultToJson(conditioned)
    ).toBe(JSON.stringify(conditioned));

    const forged = structuredClone(analysis);
    forged.diagnostics.probabilityTolerance = Number.POSITIVE_INFINITY;
    expect(() =>
      finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResultToJson(forged)
    ).toThrow(/non-finite/);
  });
});
