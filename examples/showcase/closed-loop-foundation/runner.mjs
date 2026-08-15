import { readFile } from 'node:fs/promises';

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
} from '../../../dist/index.js';

const NUMERIC_TOLERANCE = 1e-10;

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
}

function requireOk(result, label) {
  if (result === null || typeof result !== 'object' || result.ok !== true) {
    const detail = result?.failure?.message ?? result?.failure?.code ?? 'unknown failure';
    throw new Error(`${label} failed: ${detail}`);
  }
  return result;
}

function requirePossible(result, label) {
  requireOk(result, label);
  if (result.possible === false) {
    throw new Error(`${label} reported a mathematically impossible event/dataset`);
  }
  return result;
}

function learnedModelFromAj(initialModel, finalTheta) {
  return {
    startState: initialModel.startState,
    states: initialModel.states.map((state) => ({ ...state })),
    transitions: finalTheta.transitionRows.flatMap((row) =>
      row.terminal
        ? []
        : row.row.map((entry) => ({
            from: row.stateId,
            to: entry.toStateId,
            probability: entry.probability
          }))
    )
  };
}

function externalBaseDocument(model) {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    model
  };
}

function expectedReward(finalDistribution, stateRewards) {
  return finalDistribution.reduce(
    (sum, entry) => sum + entry.probability * (stateRewards[entry.stateId] ?? 0),
    0
  );
}

function compareExpected(actual, expected, path = '$') {
  if (typeof expected === 'number') {
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      throw new Error(`${path}: expected finite number, got ${String(actual)}`);
    }
    const scale = Math.max(1, Math.abs(expected), Math.abs(actual));
    if (Math.abs(actual - expected) > NUMERIC_TOLERANCE * scale) {
      throw new Error(`${path}: ${actual} differs from independently expected ${expected}`);
    }
    return;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      throw new Error(`${path}: array shape mismatch`);
    }
    expected.forEach((entry, index) => compareExpected(actual[index], entry, `${path}[${index}]`));
    return;
  }

  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      throw new Error(`${path}: object shape mismatch`);
    }
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`${path}: object keys mismatch`);
    }
    for (const key of expectedKeys) {
      compareExpected(actual[key], expected[key], `${path}.${key}`);
    }
    return;
  }

  if (actual !== expected) {
    throw new Error(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export async function runClosedLoopFoundationShowcase() {
  const fixture = await readJson('./fixture.json');

  const aj = requirePossible(
    reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
      fixture.primary.initialModel,
      fixture.primary.ajRequest
    ),
    'Candidate AJ'
  );

  const learnedModel = learnedModelFromAj(fixture.primary.initialModel, aj.finalTheta);
  const learnedInitialDistribution = aj.finalTheta.initialDistribution.map((entry) => ({ ...entry }));
  const downstream = fixture.primary.downstream;

  const stateDistribution = requireOk(
    propagateFiniteHorizonStateDistribution(learnedModel, {
      initialDistribution: learnedInitialDistribution,
      horizon: downstream.horizon
    }),
    'Candidate A'
  );

  const firstPassage = requireOk(
    analyzeFiniteHorizonFirstPassage(learnedModel, {
      initialDistribution: learnedInitialDistribution,
      targetStates: downstream.firstPassageTargetStates,
      horizon: downstream.horizon
    }),
    'Candidate B'
  );

  const longRun = requireOk(
    analyzeFiniteMarkovLongRunBehavior(learnedModel, {
      initialDistribution: learnedInitialDistribution
    }),
    'Candidate J'
  );

  const additiveRequest = {
    initialDistribution: learnedInitialDistribution,
    horizon: downstream.horizon,
    initialValueByState: downstream.additiveInitialValueByState,
    transitionValueByStep: downstream.additiveTransitionValueByStep
  };

  const additive = requirePossible(
    analyzeFiniteAdditiveTrajectoryFunctionalDistribution(learnedModel, additiveRequest),
    'Candidate AA'
  );

  const evidenceAdditiveRequest = {
    ...additiveRequest,
    evidenceLikelihoods: downstream.calibratedEvidenceLikelihoods
  };

  const evidenceAdditive = requirePossible(
    analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(
      learnedModel,
      evidenceAdditiveRequest
    ),
    'Candidate AB analysis'
  );

  const evidenceAdditiveConditioning = requirePossible(
    conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(
      learnedModel,
      {
        ...evidenceAdditiveRequest,
        targetValueTicks: downstream.targetValueTicks
      }
    ),
    'Candidate AB conditioning'
  );

  const inference = requireOk(
    inferFiniteHiddenObservationCandidates({
      candidates: fixture.secondary.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        model: candidate.model,
        initialDistribution: fixture.secondary.initialDistribution,
        alphabet: fixture.secondary.alphabet,
        kernel: fixture.secondary.kernel
      })),
      observations: fixture.secondary.observations
    }),
    'finite candidate inference'
  );

  const ambiguity = requireOk(
    classifyFiniteModelFamilyIdentifiability({
      candidates: fixture.secondary.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        document: externalBaseDocument(candidate.model)
      })),
      probes: fixture.secondary.identifiabilityProbes,
      comparisonTolerance: 1e-12
    }),
    'Candidate D'
  );

  const ambiguityByCandidate = new Map(
    ambiguity.candidates.map((candidate) => [candidate.candidateId, candidate])
  );
  const unresolvedCandidateIds = inference.selectedCandidateIds
    .filter((candidateId) =>
      ambiguityByCandidate.get(candidateId)?.classification === 'ambiguous_under_observation_design'
    )
    .sort();

  const candidateById = new Map(
    fixture.secondary.candidates.map((candidate) => [candidate.candidateId, candidate])
  );
  const perCandidateKiyotanValues = unresolvedCandidateIds.map((candidateId) => {
    const candidate = candidateById.get(candidateId);
    if (candidate === undefined) {
      throw new Error(`Secondary candidate disappeared: ${candidateId}`);
    }
    const prediction = requireOk(
      propagateFiniteHorizonStateDistribution(candidate.model, {
        initialDistribution: fixture.secondary.initialDistribution,
        horizon: fixture.secondary.predictionHorizon
      }),
      `Candidate A secondary prediction ${candidateId}`
    );
    const actionExpectedRewards = fixture.secondary.actions
      .map((action) => ({
        actionId: action.actionId,
        expectedReward: expectedReward(prediction.finalDistribution, action.stateRewards)
      }))
      .sort((left, right) => left.actionId.localeCompare(right.actionId));
    return {
      candidateId,
      finalDistribution: prediction.finalDistribution,
      actionExpectedRewards
    };
  });

  const robustDecision = requireOk(
    selectFiniteAmbiguityPreservingRobustActions({
      candidates: unresolvedCandidateIds.map((candidateId) => ({ candidateId })),
      actions: fixture.secondary.actions.map((action) => ({ actionId: action.actionId })),
      values: perCandidateKiyotanValues.flatMap((candidate) =>
        candidate.actionExpectedRewards.map((action) => ({
          candidateId: candidate.candidateId,
          actionId: action.actionId,
          expectedReward: action.expectedReward
        }))
      )
    }),
    'Candidate M'
  );

  const record = fixture.primary.ajRequest.evidenceRecords[0];
  if (record === undefined) throw new Error('Primary evidence record is missing');

  return {
    schemaVersion: 1,
    showcaseId: 'ORF-CLOSED-LOOP-FOUNDATION-SHOWCASE-v1',
    fixtureId: fixture.fixtureId,
    analyticalBaseline: fixture.analyticalBaseline,
    primary: {
      input: {
        recordId: record.recordId,
        observations: record.observations,
        initialCalibratedEvidence: record.initialEvidenceLikelihoods,
        monitorCoupledTransitionCalibratedEvidence:
          record.monitorCoupledTransitionEvidenceLikelihoodsByStep,
        downstreamCalibratedEvidence: downstream.calibratedEvidenceLikelihoods
      },
      seikatan: {
        possible: aj.possible,
        converged: aj.converged,
        stopReason: aj.stopReason,
        acceptedIterations: aj.acceptedIterations,
        likelihoodTrace: aj.iterationTrace.map((trace) => ({
          iteration: trace.iteration,
          currentTotalLogLikelihood: trace.currentTotalLogLikelihood,
          updatedTotalLogLikelihood: trace.updatedTotalLogLikelihood,
          logLikelihoodDelta: trace.logLikelihoodDelta,
          maxParameterDelta: trace.maxParameterDelta
        })),
        finalTheta: aj.finalTheta
      },
      kiyotan: {
        stateDistribution: {
          horizon: stateDistribution.horizon,
          finalDistribution: stateDistribution.finalDistribution
        },
        firstPassage: {
          targetStates: firstPassage.targetStates,
          horizon: firstPassage.horizon,
          hitProbabilityByHorizon: firstPassage.hitProbabilityByHorizon,
          notHitProbabilityByHorizon: firstPassage.notHitProbabilityByHorizon,
          steps: firstPassage.steps.map((step) => ({
            step: step.step,
            firstHitProbability: step.firstHitProbability,
            cumulativeHitProbability: step.cumulativeHitProbability,
            notYetHitProbability: step.notYetHitProbability
          }))
        },
        longRun: {
          uniqueGlobalStationary: longRun.globalStationaryDistribution.unique,
          globalStationaryDistribution: longRun.globalStationaryDistribution.distribution,
          cesaroLongRunOccupancy: longRun.cesaroLongRunOccupancy
        },
        additiveOutcome: {
          horizon: additive.horizon,
          finalAggregateDistribution: additive.finalAggregateDistribution.map((atom) => ({
            valueTicks: atom.valueTicks,
            probability: atom.probability
          }))
        },
        evidenceConditionedAdditiveOutcome: {
          evidenceProbability: evidenceAdditive.evidenceProbability,
          finalAggregateDistributionGivenEvidence:
            evidenceAdditive.finalEvidenceConditionedAggregateDistribution.map((atom) => ({
              valueTicks: atom.valueTicks,
              probability: atom.probability
            })),
          targetValueTicks: evidenceAdditiveConditioning.targetValueTicks,
          targetConditionalProbabilityGivenEvidence:
            evidenceAdditiveConditioning.targetConditionalProbabilityGivenEvidence
        }
      },
      closedLoop: {
        downstreamThetaSource: 'candidate_aj.finalTheta',
        hiddenTruthSubstitutionUsed: false,
        status: aj.converged
          ? 'CONVERGED_ESTIMATE_USED'
          : 'BOUNDED_NON_CONVERGED_ESTIMATE_USED_WITH_EXPLICIT_STATUS'
      }
    },
    secondary: {
      finiteCandidateInference: {
        classification: inference.classification,
        selectedCandidateIds: inference.selectedCandidateIds,
        evaluations: inference.evaluations.map((evaluation) => ({
          candidateId: evaluation.candidateId,
          possible: evaluation.possible,
          logLikelihood: evaluation.logLikelihood,
          maximumLikelihood: evaluation.maximumLikelihood
        }))
      },
      ambiguityClassification: {
        familyClassification: ambiguity.familyClassification,
        candidates: ambiguity.candidates
      },
      unresolvedCandidateIds,
      perCandidateKiyotanValues,
      robustDecision: {
        classification: robustDecision.classification,
        selectedActionIds: robustDecision.selectedActionIds,
        bestRobustExpectedReward: robustDecision.bestRobustExpectedReward,
        evaluations: robustDecision.evaluations.map((evaluation) => ({
          actionId: evaluation.actionId,
          robustExpectedReward: evaluation.robustExpectedReward,
          worstCaseCandidateIds: evaluation.worstCaseCandidateIds,
          maximinOptimal: evaluation.maximinOptimal
        }))
      },
      claimSeparation: {
        parameterRecovery: 'unresolved',
        predictiveRecovery: 'candidate_dependent',
        ambiguityPreservation: 'preserved',
        decisionRobustness: 'unique_maximin_over_supplied_pure_actions'
      },
      candidateAveragingUsed: false,
      inventedTruthUsed: false
    },
    claimBoundary: {
      scope: 'exact within declared finite explicit probabilistic models and qualified contracts',
      bayesianInferenceUsed: false,
      causalInferenceUsed: false,
      globalOptimumClaimed: false,
      guaranteedTruthRecoveryClaimed: false,
      guaranteedConvergenceClaimed: false,
      literalUniversalityClaimed: false
    }
  };
}

const result = await runClosedLoopFoundationShowcase();

if (process.argv.includes('--verify')) {
  const expected = await readJson('./expected-result.json');
  compareExpected(result, expected);
}

console.log(JSON.stringify(result, null, 2));
