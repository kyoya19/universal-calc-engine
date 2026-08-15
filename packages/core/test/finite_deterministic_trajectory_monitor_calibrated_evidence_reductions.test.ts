import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods
} from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';
import {
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution
} from '../src/finite_additive_trajectory_functional';
import { analyzeFiniteHorizonFirstPassage } from '../src/first_passage';
import {
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_calibrated_evidence';

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 },
    { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.25 },
    { from: 'b', to: 'b', probability: 0.75 }
  ]
};

const pairs = [['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']] as const;

function oneStateMonitor(
  initialDistribution: Array<{ stateId: StateId; probability: number }>,
  evidenceLikelihoods: Array<Array<{ stateId: StateId; likelihood: number }>>
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const horizon = evidenceLikelihoods.length - 1;
  return {
    initialDistribution,
    horizon,
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q' }, { stateId: 'b', monitorStateId: 'q' }],
    monitorTransitionByStep: Array.from({ length: horizon }, () => pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId: 'q', fromStateId, toStateId, nextMonitorStateId: 'q'
    }))),
    evidenceLikelihoods
  };
}

function stateMass(distribution: Array<{ stateId: StateId; probability: number }>, stateId: StateId): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

describe('Candidate AC reductions to already-qualified capabilities', () => {
  it('reduces exactly to Candidate Z with a one-state monitor', () => {
    const initialDistribution = [{ stateId: 'a', probability: 0.65 }, { stateId: 'b', probability: 0.35 }];
    const evidenceLikelihoods = [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.45 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.95 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.25 }]
    ];
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, { initialDistribution, evidenceLikelihoods });
    expect(z.ok).toBe(true);
    if (!z.ok) throw new Error(z.failure.message);
    const acRequest = oneStateMonitor(initialDistribution, evidenceLikelihoods);
    const ac = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, acRequest);
    expect(ac.ok).toBe(true);
    if (!ac.ok) throw new Error(ac.failure.message);
    expect(ac.evidenceProbability).toBeCloseTo(z.combinedEvidenceProbability!, 14);
    expect(ac.logEvidenceProbability).toBeCloseTo(z.logLikelihood!, 14);
    for (let step = 0; step < evidenceLikelihoods.length; step += 1) {
      for (const stateId of ['a', 'b']) {
        const actual = ac.trajectory[step]!.jointHiddenMonitorDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
        const expected = z.filteringSteps[step]!.filteredDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
        expect(actual).toBeCloseTo(expected, 13);
      }
    }
    const conditioned = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...acRequest, targetMonitorStates: ['q'] }
    );
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    for (let step = 0; step < evidenceLikelihoods.length; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateMass(conditioned.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(z.smoothingSteps![step]!.smoothedDistribution, stateId),
          12
        );
      }
    }
    for (let step = 0; step < evidenceLikelihoods.length - 1; step += 1) {
      for (const actual of conditioned.pairwiseSteps![step]!.pairwiseDistribution) {
        const expected = z.pairwiseSteps![step]!.pairwiseDistribution.find((entry) =>
          entry.fromStateId === actual.fromStateId && entry.toStateId === actual.toStateId
        )!;
        expect(actual.probability).toBeCloseTo(expected.probability, 12);
      }
    }
  });

  it('compiles a finite Candidate AB additive support into monitor states', () => {
    const ab: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }],
      horizon: 1,
      initialValueByState: [{ stateId: 'a', valueTicks: 0 }, { stateId: 'b', valueTicks: 1 }],
      transitionValueByStep: [[
        { fromStateId: 'a', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'a', toStateId: 'b', valueTicks: 1 },
        { fromStateId: 'b', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
      ]],
      evidenceLikelihoods: [
        [{ stateId: 'a', likelihood: 0.9 }, { stateId: 'b', likelihood: 0.5 }],
        [{ stateId: 'a', likelihood: 0.4 }, { stateId: 'b', likelihood: 0.8 }]
      ]
    };
    const q = ['0', '1', '2'];
    const increment = (from: string, to: string): number => ab.transitionValueByStep[0]!.find((entry) => entry.fromStateId === from && entry.toStateId === to)!.valueTicks;
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution: ab.initialDistribution,
      horizon: ab.horizon,
      monitorStates: q,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: '0' }, { stateId: 'b', monitorStateId: '1' }],
      monitorTransitionByStep: [q.flatMap((monitorStateId) => pairs.map(([fromStateId, toStateId]) => {
        const next = Number(monitorStateId) + increment(fromStateId, toStateId);
        return {
          monitorStateId,
          fromStateId,
          toStateId,
          nextMonitorStateId: next >= 0 && next <= 2 ? String(next) : monitorStateId
        };
      }))],
      evidenceLikelihoods: ab.evidenceLikelihoods
    };
    const abAnalysis = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, ab);
    const acAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, ac);
    expect(abAnalysis.ok).toBe(true);
    expect(acAnalysis.ok).toBe(true);
    if (!abAnalysis.ok || !acAnalysis.ok) throw new Error('analysis failed');
    expect(acAnalysis.evidenceProbability).toBeCloseTo(abAnalysis.evidenceProbability!, 14);
    for (const atom of abAnalysis.jointEvidenceAggregateDistribution!) {
      const compiled = acAnalysis.jointEvidenceMonitorDistribution!.find((entry) => entry.monitorStateId === String(atom.valueTicks))!;
      expect(compiled.jointProbability).toBeCloseTo(atom.jointProbability!, 14);
      expect(compiled.conditionalProbability).toBeCloseTo(atom.conditionalProbability!, 14);
    }
    const abConditioned = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...ab, targetValueTicks: 1 });
    const acConditioned = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...ac, targetMonitorStates: ['1'] });
    expect(abConditioned.ok).toBe(true);
    expect(acConditioned.ok).toBe(true);
    if (!abConditioned.ok || !acConditioned.ok) throw new Error('conditioning failed');
    expect(acConditioned.jointEventProbability).toBeCloseTo(abConditioned.jointEventProbability!, 14);
    for (let step = 0; step <= 1; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateMass(acConditioned.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(abConditioned.smoothingSteps![step]!.smoothedDistribution, stateId),
          12
        );
      }
    }
  });

  it('reduces the additive compiler to Candidate AA when all evidence likelihoods are one', () => {
    const initialDistribution = [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }];
    const aaRequest = {
      initialDistribution,
      horizon: 1,
      initialValueByState: [{ stateId: 'a', valueTicks: 0 }, { stateId: 'b', valueTicks: 1 }],
      transitionValueByStep: [[
        { fromStateId: 'a', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'a', toStateId: 'b', valueTicks: 1 },
        { fromStateId: 'b', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
      ]]
    };
    const aa = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, aaRequest);
    expect(aa.ok).toBe(true);
    if (!aa.ok) throw new Error(aa.failure.message);
    const q = ['0', '1', '2'];
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon: 1,
      monitorStates: q,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: '0' }, { stateId: 'b', monitorStateId: '1' }],
      monitorTransitionByStep: [q.flatMap((monitorStateId) => pairs.map(([fromStateId, toStateId]) => {
        const inc = aaRequest.transitionValueByStep[0]!.find((entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId)!.valueTicks;
        const next = Number(monitorStateId) + inc;
        return { monitorStateId, fromStateId, toStateId, nextMonitorStateId: next <= 2 ? String(next) : monitorStateId };
      }))],
      evidenceLikelihoods: Array.from({ length: 2 }, () => [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }])
    };
    const compiled = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, ac);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) throw new Error(compiled.failure.message);
    expect(compiled.evidenceProbability).toBeCloseTo(1, 14);
    for (const atom of aa.finalAggregateDistribution) {
      const actual = compiled.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === String(atom.valueTicks))!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 14);
    }
  });

  it('compiles Candidate B finite first-passage time into terminal monitor states', () => {
    const initialDistribution = [{ stateId: 'a', probability: 0.8 }, { stateId: 'b', probability: 0.2 }];
    const horizon = 2;
    const firstPassage = analyzeFiniteHorizonFirstPassage(model, { initialDistribution, targetStates: ['b'], horizon });
    expect(firstPassage.ok).toBe(true);
    if (!firstPassage.ok) throw new Error(firstPassage.failure.message);
    const monitorStates = ['not_hit', 'hit_0', 'hit_1', 'hit_2'];
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon,
      monitorStates,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'not_hit' }, { stateId: 'b', monitorStateId: 'hit_0' }],
      monitorTransitionByStep: Array.from({ length: horizon }, (_, index) => monitorStates.flatMap((monitorStateId) =>
        pairs.map(([fromStateId, toStateId]) => ({
          monitorStateId,
          fromStateId,
          toStateId,
          nextMonitorStateId: monitorStateId === 'not_hit' && toStateId === 'b' ? `hit_${index + 1}` : monitorStateId
        }))
      )),
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () => [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }])
    };
    const compiled = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, ac);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) throw new Error(compiled.failure.message);
    for (let step = 0; step <= horizon; step += 1) {
      const actual = compiled.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === `hit_${step}`)?.probability ?? 0;
      expect(actual).toBeCloseTo(firstPassage.steps[step]!.firstHitProbability, 14);
    }
    const notHit = compiled.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === 'not_hit')?.probability ?? 0;
    expect(notHit).toBeCloseTo(firstPassage.notHitProbabilityByHorizon, 14);
  });
});
