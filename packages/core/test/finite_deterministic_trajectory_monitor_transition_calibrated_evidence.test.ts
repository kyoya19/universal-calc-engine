import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResult,
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest,
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResult,
  TransitionCalibratedEvidenceLikelihoodEntry,
  analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates,
  finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResultToJson,
  finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResultToJson
} from '../src/finite_deterministic_trajectory_monitor_transition_calibrated_evidence';

type Analysis = Extract<FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResult, { ok: true }>;
type Conditioned = Extract<FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResult, { ok: true }>;

function requireAnalysis(result: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResult): Analysis {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(
  result: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResult
): Conditioned {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function declaredPairEvidence(
  stateIds: StateId[],
  rule: (fromStateId: StateId, toStateId: StateId) => number
): TransitionCalibratedEvidenceLikelihoodEntry[] {
  return stateIds.flatMap((fromStateId) =>
    stateIds.map((toStateId) => ({ fromStateId, toStateId, likelihood: rule(fromStateId, toStateId) }))
  );
}

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const result = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) {
      result.add(`${state.id}\u0000${state.id}`);
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from === state.id && Number(transition.probability) > 0) {
        result.add(`${transition.from}\u0000${transition.to}`);
      }
    }
  }
  return [...result].sort().map((key) => key.split('\u0000') as [StateId, StateId]);
}

function monitorRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, fromStateId: StateId, toStateId: StateId, step: number) => string
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

function baseRequest(horizon = 2): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest {
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
    transitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, (_, step) =>
      declaredPairEvidence(stateIds, (fromStateId, toStateId) => {
        if (step === 0) {
          if (fromStateId === 'a' && toStateId === 'a') return 0.4;
          if (fromStateId === 'a' && toStateId === 'b') return 0.9;
          if (fromStateId === 'b' && toStateId === 'a') return 0.2;
          return 0.7;
        }
        if (fromStateId === 'a' && toStateId === 'a') return 0.75;
        if (fromStateId === 'a' && toStateId === 'b') return 0.25;
        if (fromStateId === 'b' && toStateId === 'a') return 0.6;
        return 0.95;
      })
    )
  };
}

describe('Candidate AD transition-calibrated trajectory monitor', () => {
  it('distinguishes source-sensitive evidence for the same destination state', () => {
    const sourceSensitive: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }, { id: 'c', terminal: true }],
      transitions: [
        { from: 'a', to: 'c', probability: 1 },
        { from: 'b', to: 'c', probability: 1 }
      ]
    };
    const stateIds = ['a', 'b', 'c'];
    const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 },
        { stateId: 'c', probability: 0 }
      ],
      horizon: 1,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: monitorRows(sourceSensitive, 1, ['q'], () => 'q'),
      initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
      transitionEvidenceLikelihoodsByStep: [
        declaredPairEvidence(stateIds, (fromStateId, toStateId) => {
          if (fromStateId === 'a' && toStateId === 'c') return 0.9;
          if (fromStateId === 'b' && toStateId === 'c') return 0.1;
          return 1;
        })
      ]
    };
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(sourceSensitive, request)
    );
    expect(analysis.evidenceProbability).toBeCloseTo(0.5, 14);

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        sourceSensitive,
        { ...request, targetMonitorStates: ['q'] }
      )
    );
    expect(
      conditioned.smoothingSteps?.[0]?.hiddenStateDistribution.find((entry) => entry.stateId === 'a')?.probability
    ).toBeCloseTo(0.9, 14);
    expect(
      conditioned.smoothingSteps?.[0]?.hiddenStateDistribution.find((entry) => entry.stateId === 'b')?.probability
    ).toBeCloseTo(0.1, 14);
  });

  it('does not leak future transition evidence or future monitor layers into earlier prefixes', () => {
    const first = baseRequest();
    const second = baseRequest();
    second.transitionEvidenceLikelihoodsByStep[1] = second.transitionEvidenceLikelihoodsByStep[1]!.map((entry) => ({
      ...entry,
      likelihood: entry.fromStateId === 'a' && entry.toStateId === 'b' ? 0.01 : 1
    }));
    second.monitorTransitionByStep[1] = second.monitorTransitionByStep[1]!.map((entry) => ({
      ...entry,
      nextMonitorStateId: entry.monitorStateId
    }));
    const a = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, first)
    );
    const b = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, second)
    );
    expect(b.trajectory[0]).toEqual(a.trajectory[0]);
    expect(b.trajectory[1]).toEqual(a.trajectory[1]);
    expect(b.finalEvidenceConditionedMonitorDistribution).not.toEqual(
      a.finalEvidenceConditionedMonitorDistribution
    );
  });

  it('separates monitor-event, evidence and joint impossibility', () => {
    const empty = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: [] }
      )
    );
    expect(empty.possible).toBe(false);
    expect(empty.impossibility).toBe('monitor_event');

    const zero = baseRequest(0);
    zero.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0 },
      { stateId: 'b', likelihood: 0 }
    ];
    const evidence = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...zero, targetMonitorStates: ['clean'] }
      )
    );
    expect(evidence.impossibility).toBe('evidence');

    const jointRequest = baseRequest(0);
    jointRequest.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 1 },
      { stateId: 'b', likelihood: 0 }
    ];
    const joint = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...jointRequest, targetMonitorStates: ['saw_b'] }
      )
    );
    expect(joint.evidencePossible).toBe(true);
    expect(joint.monitorEventPossible).toBe(true);
    expect(joint.jointPossible).toBe(false);
    expect(joint.impossibility).toBe('joint');
  });

  it('preserves positive evidence and joint mass under direct Float64 underflow', () => {
    const oneState: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const horizon = 400;
    const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      horizon,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: [{ stateId: 's', monitorStateId: 'q' }],
      monitorTransitionByStep: Array.from({ length: horizon }, () => [
        { monitorStateId: 'q', fromStateId: 's', toStateId: 's', nextMonitorStateId: 'q' }
      ]),
      initialEvidenceLikelihoods: [{ stateId: 's', likelihood: 0.1 }],
      transitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, () => [
        { fromStateId: 's', toStateId: 's', likelihood: 0.1 }
      ])
    };
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(oneState, request)
    );
    expect(analysis.possible).toBe(true);
    expect(analysis.evidenceProbability).toBeNull();
    expect(analysis.logEvidenceProbability).toBeCloseTo((horizon + 1) * Math.log(0.1), 9);
    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        oneState,
        { ...request, targetMonitorStates: ['q'] }
      )
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.jointEventProbability).toBeNull();
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect(conditioned.diagnostics.jointEventProbabilityUnderflowed).toBe(true);
  });

  it('requires every declared ordered pair, including zero-model-mass pairs, and rejects invalid likelihoods', () => {
    const incomplete = baseRequest();
    incomplete.transitionEvidenceLikelihoodsByStep[0] =
      incomplete.transitionEvidenceLikelihoodsByStep[0]!.slice(1);
    const missing = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(
      model,
      incomplete
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.code).toBe('missing_transition_calibrated_evidence_pair');

    const invalid = baseRequest();
    invalid.transitionEvidenceLikelihoodsByStep[0]![0] = {
      ...invalid.transitionEvidenceLikelihoodsByStep[0]![0]!,
      likelihood: 1.1
    };
    const bad = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(
      model,
      invalid
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.failure.code).toBe('invalid_transition_calibrated_evidence_likelihood');
  });

  it('canonicalizes request ordering and enforces the resource guard', () => {
    const ordered = baseRequest();
    const reversed: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...ordered,
      initialDistribution: [...ordered.initialDistribution].reverse(),
      monitorStates: [...ordered.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...ordered.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: ordered.monitorTransitionByStep.map((row) => [...row].reverse()),
      initialEvidenceLikelihoods: [...ordered.initialEvidenceLikelihoods].reverse(),
      transitionEvidenceLikelihoodsByStep: ordered.transitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    const a = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, ordered)
    );
    const b = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, reversed)
    );
    expect(b).toEqual(a);

    const guarded = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(
      model,
      baseRequest(),
      { maxMonitorStates: 1 }
    );
    expect(guarded.ok).toBe(false);
    if (!guarded.ok) expect(guarded.failure.code).toBe('candidate_ad_resource_limit_exceeded');
  });

  it('uses checked deterministic serialization and rejects forged non-finite values', () => {
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, baseRequest())
    );
    expect(
      finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResultToJson(analysis)
    ).toBe(JSON.stringify(analysis));

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...baseRequest(), targetMonitorStates: ['saw_b'] }
      )
    );
    expect(
      finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResultToJson(conditioned)
    ).toBe(JSON.stringify(conditioned));

    const forged = structuredClone(analysis) as Analysis;
    forged.diagnostics.probabilityTolerance = Number.POSITIVE_INFINITY;
    expect(() =>
      finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResultToJson(forged)
    ).toThrow(/non-finite/);
  });
});