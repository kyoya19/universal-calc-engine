import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec } from '../src/model';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult,
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue,
  finiteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResultToJson,
  finiteAdditiveTrajectoryFunctionalCalibratedEvidenceResultToJson
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';

type Analysis = Extract<FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult, { ok: true }>;
type Conditioned = Extract<FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult, { ok: true }>;
type Path = { states: StateId[]; probability: number; evidence: number; aggregate: number };

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.55 }, { from: 'a', to: 'b', probability: 0.45 },
    { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }
  ]
};

function baseRequest(horizon = 2): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest {
  const row = [
    { fromStateId: 'a', toStateId: 'a', valueTicks: 0 }, { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: -1 }, { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
  ];
  const evidence = [
    [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.3 }],
    [{ stateId: 'a', likelihood: 0.4 }, { stateId: 'b', likelihood: 0.9 }],
    [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }]
  ];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }],
    horizon,
    initialValueByState: [{ stateId: 'a', valueTicks: 1 }, { stateId: 'b', valueTicks: 3 }],
    transitionValueByStep: Array.from({ length: horizon }, () => row.map((entry) => ({ ...entry }))),
    evidenceLikelihoods: evidence.slice(0, horizon + 1).map((entries) => entries.map((entry) => ({ ...entry })))
  };
}

function requireAnalysis(result: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult): Analysis {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(result: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult): Conditioned {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function increment(request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest, step: number, from: StateId, to: StateId): number {
  return request.transitionValueByStep[step - 1]!.find((entry) => entry.fromStateId === from && entry.toStateId === to)!.valueTicks;
}

function evidence(request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest, step: number, stateId: StateId): number {
  return request.evidenceLikelihoods[step]!.find((entry) => entry.stateId === stateId)!.likelihood;
}

function enumerate(request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest): Path[] {
  const result: Path[] = [];
  const initialValue = new Map(request.initialValueByState.map((entry) => [entry.stateId, entry.valueTicks] as const));
  const visit = (states: StateId[], probability: number, ev: number, aggregate: number, step: number): void => {
    if (step > request.horizon) { result.push({ states, probability, evidence: ev, aggregate }); return; }
    const from = states[states.length - 1]!;
    for (const transition of model.transitions.filter((entry) => entry.from === from)) {
      const probabilityStep = evaluateProbabilitySpec(transition.probability);
      visit(
        [...states, transition.to],
        probability * probabilityStep,
        ev * evidence(request, step, transition.to),
        aggregate + increment(request, step, from, transition.to),
        step + 1
      );
    }
  };
  for (const initial of request.initialDistribution) {
    visit([initial.stateId], initial.probability, evidence(request, 0, initial.stateId), initialValue.get(initial.stateId)!, 1);
  }
  return result;
}

function stateProbability(distribution: Array<{ stateId: StateId; probability: number }>, stateId: StateId): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

describe('Candidate AB calibrated-evidence additive trajectory functional', () => {
  it('matches independent complete-path enumeration for P(E), P(E,G), P(G|E) and combined smoothing', () => {
    const request = baseRequest();
    const paths = enumerate(request);
    const evidenceTotal = paths.reduce((sum, path) => sum + path.probability * path.evidence, 0);
    const joint = new Map<number, number>();
    for (const path of paths) joint.set(path.aggregate, (joint.get(path.aggregate) ?? 0) + path.probability * path.evidence);
    const analysis = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, request));
    expect(analysis.evidenceProbability).toBeCloseTo(evidenceTotal, 14);
    for (const [valueTicks, mass] of joint) {
      const atom = analysis.jointEvidenceAggregateDistribution!.find((entry) => entry.valueTicks === valueTicks)!;
      expect(atom.jointProbability).toBeCloseTo(mass, 14);
      expect(atom.conditionalProbability).toBeCloseTo(mass / evidenceTotal, 14);
    }
    const target = [...joint.keys()].sort((a, b) => a - b)[2]!;
    const selected = paths.filter((path) => path.aggregate === target);
    const selectedTotal = selected.reduce((sum, path) => sum + path.probability * path.evidence, 0);
    const conditioned = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...request, targetValueTicks: target }));
    expect(conditioned.jointEventProbability).toBeCloseTo(selectedTotal, 14);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        const expected = selected.filter((path) => path.states[step] === stateId)
          .reduce((sum, path) => sum + path.probability * path.evidence, 0) / selectedTotal;
        expect(stateProbability(conditioned.smoothingSteps![step]!.smoothedDistribution, stateId)).toBeCloseTo(expected, 13);
      }
    }
  });

  it('does not leak future evidence into earlier prefix-conditioned state/value results', () => {
    const first = baseRequest();
    const second = baseRequest();
    second.evidenceLikelihoods[2] = [{ stateId: 'a', likelihood: 0.01 }, { stateId: 'b', likelihood: 1 }];
    const a = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, first));
    const b = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, second));
    expect(b.trajectory[0]).toEqual(a.trajectory[0]);
    expect(b.trajectory[1]).toEqual(a.trajectory[1]);
    expect(b.finalEvidenceConditionedAggregateDistribution).not.toEqual(a.finalEvidenceConditionedAggregateDistribution);
  });

  it('preserves absolute calibrated evidence scale and rejects naive independence', () => {
    const first = baseRequest(0);
    first.initialDistribution = [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }];
    first.initialValueByState = [{ stateId: 'a', valueTicks: 0 }, { stateId: 'b', valueTicks: 1 }];
    first.evidenceLikelihoods = [[{ stateId: 'a', likelihood: 0.2 }, { stateId: 'b', likelihood: 0.6 }]];
    const scaled = { ...first, evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.1 }, { stateId: 'b', likelihood: 0.3 }]] };
    const a = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, first));
    const b = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, scaled));
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability! * 0.5, 15);
    expect(b.finalEvidenceConditionedAggregateDistribution).toEqual(a.finalEvidenceConditionedAggregateDistribution);
    const atom = a.jointEvidenceAggregateDistribution!.find((entry) => entry.valueTicks === 1)!;
    expect(atom.jointProbability).not.toBeCloseTo(a.evidenceProbability! * 0.5, 10);
  });

  it('distinguishes evidence, aggregate and joint impossibility', () => {
    const request = baseRequest(0);
    request.initialValueByState = [{ stateId: 'a', valueTicks: 0 }, { stateId: 'b', valueTicks: 1 }];
    request.evidenceLikelihoods = [[{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 0 }]];
    const joint = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...request, targetValueTicks: 1 }));
    expect(joint.impossibility).toBe('joint');
    expect(joint.evidencePossible).toBe(true);
    expect(joint.aggregatePossible).toBe(true);
    const aggregate = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...request, targetValueTicks: 99 }));
    expect(aggregate.impossibility).toBe('aggregate');
    const impossibleEvidence = { ...request, evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0 }, { stateId: 'b', likelihood: 0 }]] };
    const ev = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...impossibleEvidence, targetValueTicks: 0 }));
    expect(ev.impossibility).toBe('evidence');
  });

  it('preserves positive evidence/joint mass when direct Float64 probability underflows', () => {
    const oneState: DefinitionModel = { startState: 's', states: [{ id: 's' }], transitions: [{ from: 's', to: 's', probability: 1 }] };
    const horizon = 400;
    const request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }], horizon,
      initialValueByState: [{ stateId: 's', valueTicks: 0 }],
      transitionValueByStep: Array.from({ length: horizon }, () => [{ fromStateId: 's', toStateId: 's', valueTicks: 0 }]),
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () => [{ stateId: 's', likelihood: 0.1 }])
    };
    const analysis = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(oneState, request));
    expect(analysis.possible).toBe(true);
    expect(analysis.evidenceProbability).toBeNull();
    expect(analysis.logEvidenceProbability).toBeCloseTo((horizon + 1) * Math.log(0.1), 10);
    const conditioned = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(oneState, { ...request, targetValueTicks: 0 }));
    expect(conditioned.possible).toBe(true);
    expect(conditioned.jointEventProbability).toBeNull();
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
  });

  it('enforces evidence time alignment/range and checked serialization', () => {
    const mismatch = baseRequest();
    mismatch.evidenceLikelihoods.pop();
    const badLength = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, mismatch);
    expect(badLength.ok).toBe(false);
    if (!badLength.ok) expect(badLength.failure.code).toBe('additive_calibrated_evidence_length_mismatch');
    const invalid = baseRequest();
    invalid.evidenceLikelihoods[0]![0]!.likelihood = 1.1;
    const badLikelihood = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, invalid);
    expect(badLikelihood.ok).toBe(false);
    if (!badLikelihood.ok) expect(badLikelihood.failure.code).toBe('invalid_additive_calibrated_evidence_likelihood');
    const analysis = requireAnalysis(analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, baseRequest()));
    expect(JSON.parse(finiteAdditiveTrajectoryFunctionalCalibratedEvidenceResultToJson(analysis))).toEqual(analysis);
    const target = analysis.finalEvidenceConditionedAggregateDistribution![0]!.valueTicks;
    const conditioned = requireCondition(conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...baseRequest(), targetValueTicks: target }));
    expect(JSON.parse(finiteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResultToJson(conditioned))).toEqual(conditioned);
  });
});
