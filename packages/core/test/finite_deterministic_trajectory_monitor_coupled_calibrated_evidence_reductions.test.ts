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
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';
import { analyzeFiniteAdditiveTrajectoryFunctionalDistribution } from '../src/finite_additive_trajectory_functional';
import { analyzeFiniteHorizonFirstPassage } from '../src/first_passage';
import { propagateFiniteHorizonStateDistribution } from '../src/state_distribution';

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

function toAeFromAd(
  ad: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  return {
    initialDistribution: ad.initialDistribution,
    horizon: ad.horizon,
    monitorStates: ad.monitorStates,
    initialMonitorStateByHiddenState: ad.initialMonitorStateByHiddenState,
    monitorTransitionByStep: ad.monitorTransitionByStep,
    initialEvidenceLikelihoods: ad.initialEvidenceLikelihoods,
    monitorCoupledTransitionEvidenceLikelihoodsByStep:
      ad.transitionEvidenceLikelihoodsByStep.map((row) =>
        ad.monitorStates.flatMap((monitorStateId) =>
          row.map((entry) => ({ monitorStateId, ...entry }))
        )
      )
  };
}

function destinationOnly(
  rows: Array<Array<{ stateId: StateId; likelihood: number }>>,
  monitorStates: string[]
) {
  return rows.slice(1).map((row) =>
    monitorStates.flatMap((monitorStateId) =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        likelihood: row.find((entry) => entry.stateId === toStateId)!.likelihood
      }))
    )
  );
}

function baseAc(): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const monitorStates = ['q0', 'q1'];
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.65 },
      { stateId: 'b', probability: 0.35 }
    ],
    horizon: 2,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: Array.from({ length: 2 }, () =>
      monitorStates.flatMap((q) =>
        pairs.map(([fromStateId, toStateId]) => ({
          monitorStateId: q,
          fromStateId,
          toStateId,
          nextMonitorStateId: q === 'q1' || toStateId === 'b' ? 'q1' : 'q0'
        }))
      )
    ),
    evidenceLikelihoods: [
      [
        { stateId: 'a', likelihood: 0.8 },
        { stateId: 'b', likelihood: 0.45 }
      ],
      [
        { stateId: 'a', likelihood: 0.3 },
        { stateId: 'b', likelihood: 0.95 }
      ],
      [
        { stateId: 'a', likelihood: 0.7 },
        { stateId: 'b', likelihood: 0.25 }
      ]
    ]
  };
}

function toAeFromAc(
  ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  return {
    initialDistribution: ac.initialDistribution,
    horizon: ac.horizon,
    monitorStates: ac.monitorStates,
    initialMonitorStateByHiddenState: ac.initialMonitorStateByHiddenState,
    monitorTransitionByStep: ac.monitorTransitionByStep,
    initialEvidenceLikelihoods: ac.evidenceLikelihoods[0]!,
    monitorCoupledTransitionEvidenceLikelihoodsByStep: destinationOnly(
      ac.evidenceLikelihoods,
      ac.monitorStates
    )
  };
}

function stateMass(
  distribution: Array<{ stateId: StateId; probability: number }>,
  stateId: StateId
): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

describe('Candidate AE reductions to already-qualified capabilities', () => {
  it('reduces exactly to Candidate AD when c_t(q,i,j)=m_t(i,j)', () => {
    const ac = baseAc();
    const ad: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: ac.initialDistribution,
      horizon: ac.horizon,
      monitorStates: ac.monitorStates,
      initialMonitorStateByHiddenState: ac.initialMonitorStateByHiddenState,
      monitorTransitionByStep: ac.monitorTransitionByStep,
      initialEvidenceLikelihoods: ac.evidenceLikelihoods[0]!,
      transitionEvidenceLikelihoodsByStep: ac.evidenceLikelihoods.slice(1).map((row) =>
        pairs.map(([fromStateId, toStateId]) => ({
          fromStateId,
          toStateId,
          likelihood:
            row.find((entry) => entry.stateId === toStateId)!.likelihood *
            (fromStateId === 'a' ? 1 : 0.8)
        }))
      )
    };
    const ae = toAeFromAd(ad);
    const adAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, ad);
    const aeAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, ae);
    expect(adAnalysis.ok && aeAnalysis.ok).toBe(true);
    if (!adAnalysis.ok || !aeAnalysis.ok) throw new Error('analysis failed');
    expect(aeAnalysis.evidenceProbability).toBeCloseTo(adAnalysis.evidenceProbability!, 14);
    expect(aeAnalysis.trajectory).toEqual(adAnalysis.trajectory);
    expect(aeAnalysis.jointEvidenceMonitorDistribution).toEqual(adAnalysis.jointEvidenceMonitorDistribution);

    const adCondition = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...ad, targetMonitorStates: ['q1'] }
    );
    const aeCondition = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...ae, targetMonitorStates: ['q1'] }
    );
    expect(adCondition.ok && aeCondition.ok).toBe(true);
    if (!adCondition.ok || !aeCondition.ok) throw new Error('conditioning failed');
    expect(aeCondition.jointEventProbability).toBeCloseTo(adCondition.jointEventProbability!, 14);
    expect(aeCondition.smoothingSteps).toEqual(adCondition.smoothingSteps);
    expect(aeCondition.pairwiseSteps).toEqual(adCondition.pairwiseSteps);
    expect(aeCondition.expectedTransitionCounts).toEqual(adCondition.expectedTransitionCounts);
  });

  it('reduces to Candidate AC and Candidate Z under destination-only evidence', () => {
    const ac = baseAc();
    const ae = toAeFromAc(ac);
    const acAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, ac);
    const aeAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, ae);
    expect(acAnalysis.ok && aeAnalysis.ok).toBe(true);
    if (!acAnalysis.ok || !aeAnalysis.ok) throw new Error('analysis failed');
    expect(aeAnalysis.evidenceProbability).toBeCloseTo(acAnalysis.evidenceProbability!, 14);
    for (let step = 0; step <= ac.horizon; step += 1) {
      for (const atom of acAnalysis.trajectory[step]!.jointHiddenMonitorDistribution ?? []) {
        const actual = aeAnalysis.trajectory[step]!.jointHiddenMonitorDistribution?.find(
          (entry) => entry.stateId === atom.stateId && entry.monitorStateId === atom.monitorStateId
        )?.probability ?? 0;
        expect(actual).toBeCloseTo(atom.probability!, 13);
      }
    }

    const evidenceLikelihoods = ac.evidenceLikelihoods;
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, {
      initialDistribution: ac.initialDistribution,
      evidenceLikelihoods
    });
    expect(z.ok).toBe(true);
    if (!z.ok) throw new Error(z.failure.message);
    const oneMonitorAc: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      ...ac,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: Array.from({ length: ac.horizon }, () =>
        pairs.map(([fromStateId, toStateId]) => ({
          monitorStateId: 'q',
          fromStateId,
          toStateId,
          nextMonitorStateId: 'q'
        }))
      )
    };
    const oneMonitorAe = toAeFromAc(oneMonitorAc);
    const conditioned = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...oneMonitorAe, targetMonitorStates: ['q'] }
    );
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    expect(conditioned.evidenceProbability).toBeCloseTo(z.combinedEvidenceProbability!, 14);
    for (let step = 0; step <= ac.horizon; step += 1) {
      for (const stateId of stateIds) {
        expect(stateMass(conditioned.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(z.smoothingSteps![step]!.smoothedDistribution, stateId),
          12
        );
      }
    }
  });

  it('preserves Candidate AB under the finite-support additive monitor compiler', () => {
    const ab: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'b', probability: 0.3 }
      ],
      horizon: 1,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 'b', valueTicks: 1 }
      ],
      transitionValueByStep: [[
        { fromStateId: 'a', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'a', toStateId: 'b', valueTicks: 1 },
        { fromStateId: 'b', toStateId: 'a', valueTicks: 0 },
        { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
      ]],
      evidenceLikelihoods: [
        [
          { stateId: 'a', likelihood: 0.9 },
          { stateId: 'b', likelihood: 0.5 }
        ],
        [
          { stateId: 'a', likelihood: 0.4 },
          { stateId: 'b', likelihood: 0.8 }
        ]
      ]
    };
    const q = ['0', '1', '2'];
    const increment = (from: string, to: string): number =>
      ab.transitionValueByStep[0]!.find(
        (entry) => entry.fromStateId === from && entry.toStateId === to
      )!.valueTicks;
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution: ab.initialDistribution,
      horizon: 1,
      monitorStates: q,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: '0' },
        { stateId: 'b', monitorStateId: '1' }
      ],
      monitorTransitionByStep: [
        q.flatMap((monitorStateId) =>
          pairs.map(([fromStateId, toStateId]) => {
            const next = Number(monitorStateId) + increment(fromStateId, toStateId);
            return {
              monitorStateId,
              fromStateId,
              toStateId,
              nextMonitorStateId: next <= 2 ? String(next) : monitorStateId
            };
          })
        )
      ],
      evidenceLikelihoods: ab.evidenceLikelihoods
    };
    const abAnalysis = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, ab);
    const aeAnalysis = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      toAeFromAc(ac)
    );
    expect(abAnalysis.ok && aeAnalysis.ok).toBe(true);
    if (!abAnalysis.ok || !aeAnalysis.ok) throw new Error('analysis failed');
    expect(aeAnalysis.evidenceProbability).toBeCloseTo(abAnalysis.evidenceProbability!, 14);
    for (const atom of abAnalysis.jointEvidenceAggregateDistribution!) {
      const compiled = aeAnalysis.jointEvidenceMonitorDistribution!.find(
        (entry) => entry.monitorStateId === String(atom.valueTicks)
      )!;
      expect(compiled.jointProbability).toBeCloseTo(atom.jointProbability!, 14);
      expect(compiled.conditionalProbability).toBeCloseTo(atom.conditionalProbability!, 14);
    }
  });

  it('preserves Candidate AA with the additive compiler and all-one evidence', () => {
    const initialDistribution = [
      { stateId: 'a', probability: 0.5 },
      { stateId: 'b', probability: 0.5 }
    ];
    const aaRequest = {
      initialDistribution,
      horizon: 1,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 'b', valueTicks: 1 }
      ],
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
    const allOneEvidence = [
      stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
      stateIds.map((stateId) => ({ stateId, likelihood: 1 }))
    ];
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon: 1,
      monitorStates: q,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: '0' },
        { stateId: 'b', monitorStateId: '1' }
      ],
      monitorTransitionByStep: [
        q.flatMap((monitorStateId) =>
          pairs.map(([fromStateId, toStateId]) => {
            const inc = aaRequest.transitionValueByStep[0]!.find(
              (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
            )!.valueTicks;
            const next = Number(monitorStateId) + inc;
            return {
              monitorStateId,
              fromStateId,
              toStateId,
              nextMonitorStateId: next <= 2 ? String(next) : monitorStateId
            };
          })
        )
      ],
      evidenceLikelihoods: allOneEvidence
    };
    const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      toAeFromAc(ac)
    );
    expect(ae.ok).toBe(true);
    if (!ae.ok) throw new Error(ae.failure.message);
    expect(ae.evidenceProbability).toBeCloseTo(1, 14);
    for (const atom of aa.finalAggregateDistribution) {
      const actual = ae.finalEvidenceConditionedMonitorDistribution!.find(
        (entry) => entry.monitorStateId === String(atom.valueTicks)
      )!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 14);
    }
  });

  it('preserves Candidate B first-passage compilation and Candidate A all-one hidden-state propagation', () => {
    const initialDistribution = [
      { stateId: 'a', probability: 0.8 },
      { stateId: 'b', probability: 0.2 }
    ];
    const horizon = 2;
    const firstPassage = analyzeFiniteHorizonFirstPassage(model, {
      initialDistribution,
      targetStates: ['b'],
      horizon
    });
    expect(firstPassage.ok).toBe(true);
    if (!firstPassage.ok) throw new Error(firstPassage.failure.message);

    const monitorStates = ['not_hit', 'hit_0', 'hit_1', 'hit_2'];
    const ac: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon,
      monitorStates,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'not_hit' },
        { stateId: 'b', monitorStateId: 'hit_0' }
      ],
      monitorTransitionByStep: Array.from({ length: horizon }, (_, index) =>
        monitorStates.flatMap((monitorStateId) =>
          pairs.map(([fromStateId, toStateId]) => ({
            monitorStateId,
            fromStateId,
            toStateId,
            nextMonitorStateId:
              monitorStateId === 'not_hit' && toStateId === 'b'
                ? `hit_${index + 1}`
                : monitorStateId
          }))
        )
      ),
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () =>
        stateIds.map((stateId) => ({ stateId, likelihood: 1 }))
      )
    };
    const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      toAeFromAc(ac)
    );
    expect(ae.ok).toBe(true);
    if (!ae.ok) throw new Error(ae.failure.message);
    const firstPassageByStep = new Map(
      firstPassage.firstPassageDistribution.map((entry) => [entry.step, entry.probability] as const)
    );
    expect(
      ae.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === 'hit_0')
        ?.probability ?? 0
    ).toBeCloseTo(firstPassageByStep.get(0) ?? 0, 14);
    expect(
      ae.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === 'hit_1')
        ?.probability ?? 0
    ).toBeCloseTo(firstPassageByStep.get(1) ?? 0, 14);
    expect(
      ae.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === 'hit_2')
        ?.probability ?? 0
    ).toBeCloseTo(firstPassageByStep.get(2) ?? 0, 14);

    const state = propagateFiniteHorizonStateDistribution(model, {
      initialDistribution,
      horizon
    });
    expect(state.ok).toBe(true);
    if (!state.ok) throw new Error(state.failure.message);
    const oneStateMonitorAc: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution,
      horizon,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: Array.from({ length: horizon }, () =>
        pairs.map(([fromStateId, toStateId]) => ({
          monitorStateId: 'q',
          fromStateId,
          toStateId,
          nextMonitorStateId: 'q'
        }))
      ),
      evidenceLikelihoods: Array.from({ length: horizon + 1 }, () =>
        stateIds.map((stateId) => ({ stateId, likelihood: 1 }))
      )
    };
    const conditioned = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...toAeFromAc(oneStateMonitorAc), targetMonitorStates: ['q'] }
    );
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    for (let step = 0; step <= horizon; step += 1) {
      for (const stateId of stateIds) {
        expect(stateMass(conditioned.smoothingSteps![step]!.hiddenStateDistribution, stateId)).toBeCloseTo(
          stateMass(state.trajectory[step]!.distribution, stateId),
          13
        );
      }
    }
  });
});
