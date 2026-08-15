import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteAdditiveTrajectoryFunctionalRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution,
  conditionFiniteAdditiveTrajectoryFunctionalOnExactValue
} from '../src/finite_additive_trajectory_functional';
import { conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods } from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';

const baseModel: DefinitionModel = {
  startState: 'a', states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.25 }, { from: 'b', to: 'b', probability: 0.75 }
  ]
};

function request(): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest {
  const row = [
    { fromStateId: 'a', toStateId: 'a', valueTicks: -1 }, { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: 0 }, { fromStateId: 'b', toStateId: 'b', valueTicks: 3 }
  ];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }],
    horizon: 2,
    initialValueByState: [{ stateId: 'a', valueTicks: 1 }, { stateId: 'b', valueTicks: -2 }],
    transitionValueByStep: [row.map((entry) => ({ ...entry })), row.map((entry) => ({ ...entry }))],
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.4 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.9 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }]
    ]
  };
}

function stateP(distribution: Array<{ stateId: StateId; probability: number }>, stateId: StateId): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}
function pairP(distribution: Array<{ fromStateId: StateId; toStateId: StateId; probability: number }>, from: StateId, to: StateId): number {
  return distribution.find((entry) => entry.fromStateId === from && entry.toStateId === to)?.probability ?? 0;
}

describe('Candidate AB exact reductions and cross-cutting semantics', () => {
  it('reduces to Candidate AA under all-one calibrated evidence', () => {
    const abRequest = request();
    abRequest.evidenceLikelihoods = abRequest.evidenceLikelihoods.map(() => [
      { stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }
    ]);
    const aaRequest: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: abRequest.initialDistribution, horizon: abRequest.horizon,
      initialValueByState: abRequest.initialValueByState, transitionValueByStep: abRequest.transitionValueByStep
    };
    const aa = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(baseModel, aaRequest);
    const ab = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(baseModel, abRequest);
    expect(aa.ok && ab.ok).toBe(true);
    if (!aa.ok || !ab.ok) throw new Error('analysis failed');
    expect(ab.evidenceProbability).toBeCloseTo(1, 14);
    expect(ab.finalEvidenceConditionedAggregateDistribution!.map((entry) => entry.valueTicks)).toEqual(
      aa.finalAggregateDistribution.map((entry) => entry.valueTicks)
    );
    for (const atom of aa.finalAggregateDistribution) {
      const actual = ab.finalEvidenceConditionedAggregateDistribution!.find((entry) => entry.valueTicks === atom.valueTicks)!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 13);
    }
    const target = aa.finalAggregateDistribution[1]!.valueTicks;
    const ca = conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(baseModel, { ...aaRequest, targetValueTicks: target });
    const cb = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(baseModel, { ...abRequest, targetValueTicks: target });
    expect(ca.ok && cb.ok).toBe(true);
    if (!ca.ok || !cb.ok) throw new Error('conditioning failed');
    for (let step = 0; step <= abRequest.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateP(cb.smoothingSteps![step]!.smoothedDistribution, stateId))
          .toBeCloseTo(stateP(ca.smoothingSteps![step]!.smoothedDistribution, stateId), 13);
      }
    }
  });

  it('reduces to Candidate Z under a zero functional', () => {
    const abRequest = request();
    abRequest.initialValueByState = abRequest.initialValueByState.map((entry) => ({ ...entry, valueTicks: 0 }));
    abRequest.transitionValueByStep = abRequest.transitionValueByStep.map((row) => row.map((entry) => ({ ...entry, valueTicks: 0 })));
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(baseModel, {
      initialDistribution: abRequest.initialDistribution,
      evidenceLikelihoods: abRequest.evidenceLikelihoods
    });
    const ab = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(baseModel, abRequest);
    expect(z.ok && ab.ok).toBe(true);
    if (!z.ok || !ab.ok) throw new Error('analysis failed');
    expect(z.possible && ab.possible).toBe(true);
    expect(ab.finalEvidenceConditionedAggregateDistribution).toHaveLength(1);
    expect(ab.finalEvidenceConditionedAggregateDistribution![0]!.valueTicks).toBe(0);
    expect(ab.evidenceProbability).toBeCloseTo(z.combinedEvidenceProbability!, 13);
    for (let step = 0; step <= abRequest.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        const actual = ab.trajectory[step]!.jointStateValueDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
        const expected = z.filteringSteps[step]!.filteredDistribution!.find((entry) => entry.stateId === stateId)!.probability;
        expect(actual).toBeCloseTo(expected, 13);
      }
    }
    const conditioned = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(baseModel, { ...abRequest, targetValueTicks: 0 });
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    for (let step = 0; step <= abRequest.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateP(conditioned.smoothingSteps![step]!.smoothedDistribution, stateId))
          .toBeCloseTo(stateP(z.smoothingSteps![step]!.smoothedDistribution, stateId), 13);
      }
    }
  });

  it('reconstructs Candidate Z full smoothing and pairwise posteriors by mixing exact aggregate targets', () => {
    const abRequest = request();
    const analysis = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(baseModel, abRequest);
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(baseModel, {
      initialDistribution: abRequest.initialDistribution,
      evidenceLikelihoods: abRequest.evidenceLikelihoods
    });
    expect(analysis.ok && z.ok).toBe(true);
    if (!analysis.ok || !z.ok || !analysis.possible || !z.possible) throw new Error('analysis impossible');
    for (let step = 0; step <= abRequest.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        let mixture = 0;
        for (const atom of analysis.finalEvidenceConditionedAggregateDistribution!) {
          const c = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(baseModel, {
            ...abRequest, targetValueTicks: atom.valueTicks
          });
          if (!c.ok || !c.possible) throw new Error('target conditioning failed');
          mixture += atom.probability! * stateP(c.smoothingSteps![step]!.smoothedDistribution, stateId);
        }
        expect(mixture).toBeCloseTo(stateP(z.smoothingSteps![step]!.smoothedDistribution, stateId), 12);
      }
    }
    for (let step = 0; step < abRequest.horizon; step += 1) {
      for (const from of ['a', 'b']) for (const to of ['a', 'b']) {
        let mixture = 0;
        for (const atom of analysis.finalEvidenceConditionedAggregateDistribution!) {
          const c = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(baseModel, {
            ...abRequest, targetValueTicks: atom.valueTicks
          });
          if (!c.ok || !c.possible) throw new Error('target conditioning failed');
          mixture += atom.probability! * pairP(c.pairwiseSteps![step]!.pairwiseDistribution, from, to);
        }
        expect(mixture).toBeCloseTo(pairP(z.pairwiseSteps![step]!.pairwiseDistribution, from, to), 12);
      }
    }
  });

  it('is invariant to parallel-transition split/merge and preserves terminal self-retention increments', () => {
    const split: DefinitionModel = {
      startState: 'a', states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.2 }, { from: 'a', to: 'b', probability: 0.3 }
      ]
    };
    const merged: DefinitionModel = {
      startState: 'a', states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'a', probability: 0.5 }, { from: 'a', to: 'b', probability: 0.5 }]
    };
    const req: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }], horizon: 3,
      initialValueByState: [{ stateId: 'a', valueTicks: 0 }, { stateId: 'b', valueTicks: 0 }],
      transitionValueByStep: Array.from({ length: 3 }, () => [
        { fromStateId: 'a', toStateId: 'a', valueTicks: 1 },
        { fromStateId: 'a', toStateId: 'b', valueTicks: 5 },
        { fromStateId: 'b', toStateId: 'b', valueTicks: 2 }
      ]),
      evidenceLikelihoods: Array.from({ length: 4 }, () => [
        { stateId: 'a', likelihood: 0.6 }, { stateId: 'b', likelihood: 0.9 }
      ])
    };
    const a = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(split, req);
    const b = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(merged, req);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(a.finalEvidenceConditionedAggregateDistribution!.map((entry) => entry.valueTicks))
      .toEqual(b.finalEvidenceConditionedAggregateDistribution!.map((entry) => entry.valueTicks));
    for (const atom of a.finalEvidenceConditionedAggregateDistribution!) {
      expect(b.finalEvidenceConditionedAggregateDistribution!.find((entry) => entry.valueTicks === atom.valueTicks)!.probability)
        .toBeCloseTo(atom.probability!, 13);
    }
    expect(a.finalEvidenceConditionedAggregateDistribution!.some((entry) => entry.valueTicks === 9)).toBe(true);
  });
});
