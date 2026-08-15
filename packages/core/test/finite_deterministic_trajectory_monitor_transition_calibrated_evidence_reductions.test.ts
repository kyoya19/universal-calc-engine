import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import { conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods } from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';
import {
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_calibrated_evidence';
import {
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_transition_calibrated_evidence';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';
import { analyzeFiniteAdditiveTrajectoryFunctionalDistribution } from '../src/finite_additive_trajectory_functional';
import { analyzeFiniteHorizonFirstPassage } from '../src/first_passage';

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

const stateIds = ['a', 'b'] as const;
const pairs = [['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']] as const;

function destinationOnly(
  rows: Array<Array<{ stateId: StateId; likelihood: number }>>
): Array<Array<{ fromStateId: StateId; toStateId: StateId; likelihood: number }>> {
  return rows.slice(1).map((row) => pairs.map(([fromStateId, toStateId]) => ({
    fromStateId,
    toStateId,
    likelihood: row.find((entry) => entry.stateId === toStateId)!.likelihood
  })));
}

function toAd(
  ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest
): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest {
  return {
    initialDistribution: ac.initialDistribution,
    horizon: ac.horizon,
    monitorStates: ac.monitorStates,
    initialMonitorStateByHiddenState: ac.initialMonitorStateByHiddenState,
    monitorTransitionByStep: ac.monitorTransitionByStep,
    initialEvidenceLikelihoods: ac.evidenceLikelihoods[0]!,
    transitionEvidenceLikelihoodsByStep: destinationOnly(ac.evidenceLikelihoods)
  };
}

function stateMass(distribution: Array<{ stateId: StateId; probability: number }>, stateId: StateId): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function baseAc(): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const monitorStates = ['q0', 'q1'];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.65 }, { stateId: 'b', probability: 0.35 }],
    horizon: 2,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: Array.from({ length: 2 }, () => monitorStates.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId: q,
      fromStateId,
      toStateId,
      nextMonitorStateId: q === 'q1' || toStateId === 'b' ? 'q1' : 'q0'
    })))),
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.45 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.95 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.25 }]
    ]
  };
}

describe('Candidate AD reductions to qualified capabilities', () => {
  it('reduces to Candidate AC when pair evidence depends only on destination', () => {
    const acRequest = baseAc();
    const adRequest = toAd(acRequest);
    const ac = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, acRequest);
    const ad = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, adRequest);
    expect(ac.ok && ad.ok).toBe(true);
    if (!ac.ok || !ad.ok) throw new Error('analysis failed');
    expect(ad.evidenceProbability).toBeCloseTo(ac.evidenceProbability!, 14);
    expect(ad.logEvidenceProbability).toBeCloseTo(ac.logEvidenceProbability!, 14);
    for (let step = 0; step <= acRequest.horizon; step += 1) {
      for (const atom of ac.trajectory[step]!.jointHiddenMonitorDistribution ?? []) {
        const actual = ad.trajectory[step]!.jointHiddenMonitorDistribution?.find((entry) =>
          entry.stateId === atom.stateId && entry.monitorStateId === atom.monitorStateId
        )?.probability ?? 0;
        expect(actual).toBeCloseTo(atom.probability!, 13);
      }
    }
    const acCondition = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...acRequest, targetMonitorStates: ['q1'] }
    );
    const adCondition = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...adRequest, targetMonitorStates: ['q1'] }
    );
    expect(acCondition.ok && adCondition.ok).toBe(true);
    if (!acCondition.ok || !adCondition.ok) throw new Error('conditioning failed');
    expect(adCondition.jointEventProbability).toBeCloseTo(acCondition.jointEventProbability!, 14);
    for (let step = 0; step <= acRequest.horizon; step += 1) {
      for (const stateId of stateIds) {
        expect(stateMass(adCondition.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(acCondition.smoothingSteps![step]!.hiddenStateDistribution, stateId),
          12
        );
      }
    }
    for (let step = 0; step < acRequest.horizon; step += 1) {
      for (const actual of adCondition.pairwiseSteps![step]!.pairwiseDistribution) {
        const expected = acCondition.pairwiseSteps![step]!.pairwiseDistribution.find((entry) =>
          entry.fromStateId === actual.fromStateId && entry.toStateId === actual.toStateId
        )!;
        expect(actual.probability).toBeCloseTo(expected.probability, 12);
      }
    }
  });

  it('reduces to Candidate Z with a one-state monitor and destination-only evidence', () => {
    const initialDistribution = [{ stateId: 'a', probability: 0.65 }, { stateId: 'b', probability: 0.35 }];
    const evidenceLikelihoods = [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.45 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.95 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.25 }]
    ];
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, { initialDistribution, evidenceLikelihoods });
    expect(z.ok).toBe(true);
    if (!z.ok) throw new Error(z.failure.message);
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon: 2,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: Array.from({ length: 2 }, () => pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: 'q', fromStateId, toStateId, nextMonitorStateId: 'q'
      }))),
      evidenceLikelihoods
    };
    const adRequest = toAd(ac);
    const ad = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...adRequest, targetMonitorStates: ['q'] }
    );
    expect(ad.ok).toBe(true);
    if (!ad.ok) throw new Error(ad.failure.message);
    expect(ad.evidenceProbability).toBeCloseTo(z.combinedEvidenceProbability!, 14);
    expect(ad.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    for (let step = 0; step <= 2; step += 1) {
      for (const stateId of stateIds) {
        expect(stateMass(ad.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(z.smoothingSteps![step]!.smoothedDistribution, stateId),
          12
        );
      }
    }
  });

  it('preserves the Candidate AB additive-monitor compiler under destination-only evidence', () => {
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
    const increment = (from: string, to: string): number =>
      ab.transitionValueByStep[0]!.find((entry) => entry.fromStateId === from && entry.toStateId === to)!.valueTicks;
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution: ab.initialDistribution,
      horizon: 1,
      monitorStates: q,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: '0' }, { stateId: 'b', monitorStateId: '1' }],
      monitorTransitionByStep: [q.flatMap((monitorStateId) => pairs.map(([fromStateId, toStateId]) => {
        const next = Number(monitorStateId) + increment(fromStateId, toStateId);
        return { monitorStateId, fromStateId, toStateId, nextMonitorStateId: next <= 2 ? String(next) : monitorStateId };
      }))],
      evidenceLikelihoods: ab.evidenceLikelihoods
    };
    const abAnalysis = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, ab);
    const adAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, toAd(ac));
    expect(abAnalysis.ok && adAnalysis.ok).toBe(true);
    if (!abAnalysis.ok || !adAnalysis.ok) throw new Error('analysis failed');
    expect(adAnalysis.evidenceProbability).toBeCloseTo(abAnalysis.evidenceProbability!, 14);
    for (const atom of abAnalysis.jointEvidenceAggregateDistribution!) {
      const compiled = adAnalysis.jointEvidenceMonitorDistribution!.find((entry) => entry.monitorStateId === String(atom.valueTicks))!;
      expect(compiled.jointProbability).toBeCloseTo(atom.jointProbability!, 14);
      expect(compiled.conditionalProbability).toBeCloseTo(atom.conditionalProbability!, 14);
    }
  });

  it('preserves Candidate AA when the additive compiler uses all-one evidence', () => {
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
      evidenceLikelihoods: Array.from({ length: 2 }, () => stateIds.map((stateId) => ({ stateId, likelihood: 1 })))
    };
    const ad = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, toAd(ac));
    expect(ad.ok).toBe(true);
    if (!ad.ok) throw new Error(ad.failure.message);
    expect(ad.evidenceProbability).toBeCloseTo(1, 14);
    for (const atom of aa.finalAggregateDistribution) {
      const actual = ad.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === String(atom.valueTicks))!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 14);
    }
  });

  it('preserves the Candidate B finite first-passage monitor compiler', () => {
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
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () => stateIds.map((stateId) => ({ stateId, likelihood: 1 })))
    };
    const ad = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, toAd(ac));
    expect(ad.ok).toBe(true);
    if (!ad.ok) throw new Error(ad.failure.message);
    for (let step = 0; step <= horizon; step += 1) {
      const actual = ad.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === `hit_${step}`)?.probability ?? 0;
      expect(actual).toBeCloseTo(firstPassage.steps[step]!.firstHitProbability, 14);
    }
    const notHit = ad.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === 'not_hit')?.probability ?? 0;
    expect(notHit).toBeCloseTo(firstPassage.notHitProbabilityByHorizon, 14);
  });
});