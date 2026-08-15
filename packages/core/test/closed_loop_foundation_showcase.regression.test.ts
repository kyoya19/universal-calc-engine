import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  analyzeFiniteHorizonFirstPassage,
  analyzeFiniteMarkovLongRunBehavior,
  classifyFiniteModelFamilyIdentifiability,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue,
  inferFiniteHiddenObservationCandidates,
  propagateFiniteHorizonStateDistribution,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories,
  selectFiniteAmbiguityPreservingRobustActions
} from '../src/index';

const fixture = JSON.parse(
  readFileSync(
    new URL('../../../examples/showcase/closed-loop-foundation/fixture.json', import.meta.url),
    'utf8'
  )
) as any;

const expected = JSON.parse(
  readFileSync(
    new URL('../../../examples/showcase/closed-loop-foundation/expected-result.json', import.meta.url),
    'utf8'
  )
) as any;

function learnedModelFromAj(initialModel: any, finalTheta: any): any {
  return {
    startState: initialModel.startState,
    states: initialModel.states.map((state: any) => ({ ...state })),
    transitions: finalTheta.transitionRows.flatMap((row: any) =>
      row.terminal
        ? []
        : row.row.map((entry: any) => ({
            from: row.stateId,
            to: entry.toStateId,
            probability: entry.probability
          }))
    )
  };
}

function actionExpectedReward(
  distribution: Array<{ stateId: string; probability: number }>,
  stateRewards: Record<string, number>
): number {
  return distribution.reduce(
    (sum, entry) => sum + entry.probability * (stateRewards[entry.stateId] ?? 0),
    0
  );
}

describe('ORF Closed-Loop Foundation Showcase regression', () => {
  it('passes Candidate AJ finalTheta directly through A/B/J/AA/AB with bounded non-convergence visible', () => {
    const aj = reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
      fixture.primary.initialModel,
      fixture.primary.ajRequest
    );
    expect(aj.ok).toBe(true);
    if (!aj.ok) return;

    expect(aj.possible).toBe(true);
    expect(aj.converged).toBe(false);
    expect(aj.stopReason).toBe('MAX_ITERATIONS_REACHED');
    expect(aj.acceptedIterations).toBe(2);
    expect(aj.iterationTrace).toHaveLength(2);
    expect(aj.iterationTrace[0]?.logLikelihoodDelta).toBeGreaterThan(0);
    expect(aj.iterationTrace[1]?.logLikelihoodDelta).toBeGreaterThan(0);

    const learnedModel = learnedModelFromAj(fixture.primary.initialModel, aj.finalTheta);
    const learnedAtoA = learnedModel.transitions.find(
      (transition: any) => transition.from === 'a' && transition.to === 'a'
    )?.probability;
    expect(learnedAtoA).toBe(aj.finalTheta.transitionRows[0]?.row[0]?.probability);
    expect(learnedAtoA).not.toBe(fixture.primary.initialModel.transitions[0].probability);

    const initialDistribution = aj.finalTheta.initialDistribution.map((entry) => ({ ...entry }));
    const downstream = fixture.primary.downstream;

    const stateDistribution = propagateFiniteHorizonStateDistribution(learnedModel, {
      initialDistribution,
      horizon: downstream.horizon
    });
    expect(stateDistribution.ok).toBe(true);
    if (!stateDistribution.ok) return;
    expect(stateDistribution.finalDistribution[0]?.probability).toBeCloseTo(
      expected.primary.kiyotan.stateDistribution.finalDistribution[0].probability,
      10
    );
    expect(stateDistribution.finalDistribution[1]?.probability).toBeCloseTo(
      expected.primary.kiyotan.stateDistribution.finalDistribution[1].probability,
      10
    );

    const firstPassage = analyzeFiniteHorizonFirstPassage(learnedModel, {
      initialDistribution,
      targetStates: downstream.firstPassageTargetStates,
      horizon: downstream.horizon
    });
    expect(firstPassage.ok).toBe(true);
    if (!firstPassage.ok) return;
    expect(firstPassage.hitProbabilityByHorizon).toBeCloseTo(
      expected.primary.kiyotan.firstPassage.hitProbabilityByHorizon,
      10
    );

    const longRun = analyzeFiniteMarkovLongRunBehavior(learnedModel, { initialDistribution });
    expect(longRun.ok).toBe(true);
    if (!longRun.ok) return;
    expect(longRun.globalStationaryDistribution.unique).toBe(true);
    expect(longRun.globalStationaryDistribution.distribution?.[1]?.probability).toBeCloseTo(
      expected.primary.kiyotan.longRun.globalStationaryDistribution[1].probability,
      10
    );

    const additiveRequest = {
      initialDistribution,
      horizon: downstream.horizon,
      initialValueByState: downstream.additiveInitialValueByState,
      transitionValueByStep: downstream.additiveTransitionValueByStep
    };
    const additive = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(
      learnedModel,
      additiveRequest
    );
    expect(additive.ok).toBe(true);
    if (!additive.ok) return;
    expect(additive.finalAggregateDistribution.map((atom) => atom.valueTicks)).toEqual([0, 1, 2, 3]);
    expect(additive.finalAggregateDistribution[2]?.probability).toBeCloseTo(
      expected.primary.kiyotan.additiveOutcome.finalAggregateDistribution[2].probability,
      10
    );

    const evidenceRequest = {
      ...additiveRequest,
      evidenceLikelihoods: downstream.calibratedEvidenceLikelihoods
    };
    const evidenceAdditive = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(
      learnedModel,
      evidenceRequest
    );
    expect(evidenceAdditive.ok).toBe(true);
    if (!evidenceAdditive.ok || !evidenceAdditive.possible) return;
    expect(evidenceAdditive.evidenceProbability).toBeCloseTo(
      expected.primary.kiyotan.evidenceConditionedAdditiveOutcome.evidenceProbability,
      10
    );
    expect(evidenceAdditive.finalEvidenceConditionedAggregateDistribution?.[2]?.probability).toBeCloseTo(
      expected.primary.kiyotan.evidenceConditionedAdditiveOutcome.finalAggregateDistributionGivenEvidence[2].probability,
      10
    );

    const conditioned = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(
      learnedModel,
      {
        ...evidenceRequest,
        targetValueTicks: downstream.targetValueTicks
      }
    );
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok || !conditioned.possible) return;
    expect(conditioned.targetConditionalProbabilityGivenEvidence).toBeCloseTo(
      expected.primary.kiyotan.evidenceConditionedAdditiveOutcome.targetConditionalProbabilityGivenEvidence,
      10
    );
  });

  it('preserves the unresolved candidate set through per-candidate Kiyotan values and Candidate M maximin', () => {
    const inference = inferFiniteHiddenObservationCandidates({
      candidates: fixture.secondary.candidates.map((candidate: any) => ({
        candidateId: candidate.candidateId,
        model: candidate.model,
        initialDistribution: fixture.secondary.initialDistribution,
        alphabet: fixture.secondary.alphabet,
        kernel: fixture.secondary.kernel
      })),
      observations: fixture.secondary.observations
    });
    expect(inference.ok).toBe(true);
    if (!inference.ok) return;
    expect(inference.classification).toBe('tied_maximum_likelihood');
    expect(inference.selectedCandidateIds).toEqual(['candidate-high', 'candidate-low']);

    const ambiguity = classifyFiniteModelFamilyIdentifiability({
      candidates: fixture.secondary.candidates.map((candidate: any) => ({
        candidateId: candidate.candidateId,
        document: {
          schemaVersion: 1,
          modelKind: 'base',
          model: candidate.model
        }
      })),
      probes: fixture.secondary.identifiabilityProbes,
      comparisonTolerance: 1e-12
    } as any);
    expect(ambiguity.ok).toBe(true);
    if (!ambiguity.ok) return;
    expect(ambiguity.familyClassification).toBe('fully_unresolved_within_tolerance');
    expect(
      ambiguity.candidates.every(
        (candidate) => candidate.classification === 'ambiguous_under_observation_design'
      )
    ).toBe(true);

    const predictions = inference.selectedCandidateIds.map((candidateId) => {
      const candidate = fixture.secondary.candidates.find(
        (entry: any) => entry.candidateId === candidateId
      );
      const result = propagateFiniteHorizonStateDistribution(candidate.model, {
        initialDistribution: fixture.secondary.initialDistribution,
        horizon: fixture.secondary.predictionHorizon
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`Candidate A secondary prediction failed: ${candidateId}`);
      return {
        candidateId,
        finalDistribution: result.finalDistribution,
        actionValues: fixture.secondary.actions.map((action: any) => ({
          actionId: action.actionId,
          expectedReward: actionExpectedReward(result.finalDistribution, action.stateRewards)
        }))
      };
    });

    expect(predictions[0]?.finalDistribution[1]?.probability).toBeCloseTo(0.8, 12);
    expect(predictions[1]?.finalDistribution[1]?.probability).toBeCloseTo(0.2, 12);

    const robust = selectFiniteAmbiguityPreservingRobustActions({
      candidates: inference.selectedCandidateIds.map((candidateId) => ({ candidateId })),
      actions: fixture.secondary.actions.map((action: any) => ({ actionId: action.actionId })),
      values: predictions.flatMap((candidate) =>
        candidate.actionValues.map((action: any) => ({
          candidateId: candidate.candidateId,
          actionId: action.actionId,
          expectedReward: action.expectedReward
        }))
      )
    });
    expect(robust.ok).toBe(true);
    if (!robust.ok) return;
    expect(robust.classification).toBe('unique_maximin_action');
    expect(robust.selectedActionIds).toEqual(['safe']);
    expect(robust.bestRobustExpectedReward).toBe(4);
    expect(inference.selectedCandidateIds).toEqual(['candidate-high', 'candidate-low']);
  });
});
