import { describe, expect, it } from 'vitest';
import {
  FiniteAmbiguityPreservingRobustDecisionRequest,
  FiniteAmbiguityPreservingRobustDecisionResult,
  finiteAmbiguityPreservingRobustDecisionResultToJson,
  selectFiniteAmbiguityPreservingRobustActions
} from '../src/ambiguity_preserving_robust_decision';

function matrixRequest(
  candidateIds: string[],
  actionValues: Record<string, Record<string, number>>
): FiniteAmbiguityPreservingRobustDecisionRequest {
  return {
    candidates: candidateIds.map((candidateId) => ({ candidateId })),
    actions: Object.keys(actionValues).map((actionId) => ({ actionId })),
    values: Object.entries(actionValues).flatMap(([actionId, byCandidate]) =>
      Object.entries(byCandidate).map(([candidateId, expectedReward]) => ({
        candidateId,
        actionId,
        expectedReward
      }))
    )
  };
}

function requireSuccess(result: FiniteAmbiguityPreservingRobustDecisionResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function oracleByOrderStatistics(request: FiniteAmbiguityPreservingRobustDecisionRequest) {
  const actionIds = request.actions.map((entry) => entry.actionId).sort();
  const minima = actionIds.map((actionId) => {
    const rewards = request.values
      .filter((entry) => entry.actionId === actionId)
      .map((entry) => ({ candidateId: entry.candidateId, expectedReward: entry.expectedReward }))
      .sort((left, right) =>
        left.expectedReward === right.expectedReward
          ? left.candidateId.localeCompare(right.candidateId)
          : left.expectedReward - right.expectedReward
      );
    const first = rewards[0];
    if (first === undefined) throw new Error(`oracle missing action ${actionId}`);
    return {
      actionId,
      robustExpectedReward: first.expectedReward,
      worstCaseCandidateIds: rewards
        .filter((entry) => entry.expectedReward === first.expectedReward)
        .map((entry) => entry.candidateId)
        .sort()
    };
  });
  const best = [...minima].sort((left, right) =>
    left.robustExpectedReward === right.robustExpectedReward
      ? left.actionId.localeCompare(right.actionId)
      : right.robustExpectedReward - left.robustExpectedReward
  )[0];
  if (best === undefined) throw new Error('oracle missing best action');
  return {
    bestRobustExpectedReward: best.robustExpectedReward,
    selectedActionIds: minima
      .filter((entry) => entry.robustExpectedReward === best.robustExpectedReward)
      .map((entry) => entry.actionId)
      .sort(),
    minima
  };
}

const baseline = matrixRequest(['A', 'B', 'C'], {
  safe: { A: 6, B: 6, C: 6 },
  risky: { A: 12, B: 4, C: 9 },
  balanced: { A: 8, B: 7, C: 7.5 }
});

describe('Candidate M finite ambiguity-preserving robust decision', () => {
  it('selects the pure-action maximin solution against an independent order-statistic oracle', () => {
    const oracle = oracleByOrderStatistics(baseline);
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    expect(oracle.bestRobustExpectedReward).toBe(7);
    expect(oracle.selectedActionIds).toEqual(['balanced']);
    expect(result.bestRobustExpectedReward).toBe(oracle.bestRobustExpectedReward);
    expect(result.selectedActionIds).toEqual(oracle.selectedActionIds);
    expect(result.classification).toBe('unique_maximin_action');
    expect(result.evaluations.find((entry) => entry.actionId === 'balanced')?.worstCaseCandidateIds)
      .toEqual(['B']);
  });

  it('preserves complete action and worst-case-candidate ties', () => {
    const request = matrixRequest(['A', 'B', 'C'], {
      alpha: { A: 5, B: 5, C: 8 },
      beta: { A: 9, B: 5, C: 5 },
      weak: { A: 4, B: 100, C: 100 }
    });
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(request));
    expect(result.classification).toBe('tied_maximin_action');
    expect(result.selectedActionIds).toEqual(['alpha', 'beta']);
    expect(result.evaluations.find((entry) => entry.actionId === 'alpha')?.worstCaseCandidateIds)
      .toEqual(['A', 'B']);
    expect(result.evaluations.find((entry) => entry.actionId === 'beta')?.worstCaseCandidateIds)
      .toEqual(['B', 'C']);
  });

  it('handles an all-negative reward matrix without inventing a zero baseline', () => {
    const request = matrixRequest(['bad', 'worse'], {
      left: { bad: -3, worse: -9 },
      right: { bad: -5, worse: -6 }
    });
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(request));
    expect(result.bestRobustExpectedReward).toBe(-6);
    expect(result.selectedActionIds).toEqual(['right']);
  });

  it('reduces exactly to ordinary maximum expected reward for one candidate', () => {
    const request = matrixRequest(['only'], {
      low: { only: 2 },
      high: { only: 9 },
      tiedHigh: { only: 9 }
    });
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(request));
    expect(result.bestRobustExpectedReward).toBe(9);
    expect(result.selectedActionIds).toEqual(['high', 'tiedHigh']);
    for (const evaluation of result.evaluations) {
      expect(evaluation.worstCaseCandidateIds).toEqual(['only']);
    }
  });

  it('is invariant to candidate, action, and matrix-entry order', () => {
    const baselineResult = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    const permuted: FiniteAmbiguityPreservingRobustDecisionRequest = {
      candidates: [...baseline.candidates].reverse(),
      actions: [baseline.actions[2]!, baseline.actions[0]!, baseline.actions[1]!],
      values: [...baseline.values].reverse()
    };
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(permuted));
    expect(result).toEqual(baselineResult);
  });

  it('is invariant to a common additive reward translation except for translated values', () => {
    const shift = 123.5;
    const translated: FiniteAmbiguityPreservingRobustDecisionRequest = {
      ...baseline,
      values: baseline.values.map((entry) => ({ ...entry, expectedReward: entry.expectedReward + shift }))
    };
    const original = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(translated));
    expect(result.selectedActionIds).toEqual(original.selectedActionIds);
    expect(result.bestRobustExpectedReward).toBe(original.bestRobustExpectedReward + shift);
    for (const evaluation of original.evaluations) {
      const translatedEvaluation = result.evaluations.find((entry) => entry.actionId === evaluation.actionId);
      expect(translatedEvaluation?.robustExpectedReward).toBe(evaluation.robustExpectedReward + shift);
    }
  });

  it('is invariant to positive reward scaling when tolerance is scaled with it', () => {
    const factor = 7;
    const scaled: FiniteAmbiguityPreservingRobustDecisionRequest = {
      ...baseline,
      values: baseline.values.map((entry) => ({ ...entry, expectedReward: entry.expectedReward * factor }))
    };
    const original = requireSuccess(
      selectFiniteAmbiguityPreservingRobustActions(baseline, { actionValueTolerance: 1e-10 })
    );
    const result = requireSuccess(
      selectFiniteAmbiguityPreservingRobustActions(scaled, { actionValueTolerance: 7e-10 })
    );
    expect(result.selectedActionIds).toEqual(original.selectedActionIds);
    expect(result.bestRobustExpectedReward).toBe(original.bestRobustExpectedReward * factor);
  });

  it('keeps robust values and selected actions unchanged when a candidate profile is duplicated under a new ID', () => {
    const duplicated: FiniteAmbiguityPreservingRobustDecisionRequest = {
      candidates: [...baseline.candidates, { candidateId: 'B-copy' }],
      actions: baseline.actions,
      values: [
        ...baseline.values,
        ...baseline.values
          .filter((entry) => entry.candidateId === 'B')
          .map((entry) => ({ ...entry, candidateId: 'B-copy' }))
      ]
    };
    const original = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(duplicated));
    expect(result.selectedActionIds).toEqual(original.selectedActionIds);
    expect(result.bestRobustExpectedReward).toBe(original.bestRobustExpectedReward);
    expect(result.evaluations.map((entry) => [entry.actionId, entry.robustExpectedReward])).toEqual(
      original.evaluations.map((entry) => [entry.actionId, entry.robustExpectedReward])
    );
  });

  it('does not let a strictly dominated action remove the existing optimum', () => {
    const withDominated = matrixRequest(['A', 'B', 'C'], {
      safe: { A: 6, B: 6, C: 6 },
      risky: { A: 12, B: 4, C: 9 },
      balanced: { A: 8, B: 7, C: 7.5 },
      dominated: { A: 1, B: 2, C: 3 }
    });
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(withDominated));
    expect(result.selectedActionIds).toEqual(['balanced']);
    expect(result.evaluations.find((entry) => entry.actionId === 'dominated')?.maximinOptimal).toBe(false);
  });

  it('uses tolerance for complete action and worst-candidate ties without changing raw robust values', () => {
    const request = matrixRequest(['A', 'B'], {
      first: { A: 10, B: 5 },
      second: { A: 5 + 5e-10, B: 20 }
    });
    const result = requireSuccess(
      selectFiniteAmbiguityPreservingRobustActions(request, { actionValueTolerance: 1e-9 })
    );
    expect(result.selectedActionIds).toEqual(['first', 'second']);
    expect(result.bestRobustExpectedReward).toBe(5 + 5e-10);
    expect(result.evaluations.find((entry) => entry.actionId === 'first')?.robustExpectedReward).toBe(5);
  });

  it('fails explicitly for malformed candidate/action sets and incomplete or duplicate matrix cells', () => {
    expect(selectFiniteAmbiguityPreservingRobustActions({ candidates: [], actions: [{ actionId: 'x' }], values: [] }))
      .toMatchObject({ ok: false, failure: { code: 'invalid_candidate_set' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }, { candidateId: 'A' }],
      actions: [{ actionId: 'x' }],
      values: []
    })).toMatchObject({ ok: false, failure: { code: 'duplicate_candidate_id' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }],
      actions: [{ actionId: 'x' }, { actionId: 'x' }],
      values: []
    })).toMatchObject({ ok: false, failure: { code: 'duplicate_action_id' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }, { candidateId: 'B' }],
      actions: [{ actionId: 'x' }],
      values: [{ candidateId: 'A', actionId: 'x', expectedReward: 1 }]
    })).toMatchObject({ ok: false, failure: { code: 'missing_matrix_entry' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }],
      actions: [{ actionId: 'x' }],
      values: [
        { candidateId: 'A', actionId: 'x', expectedReward: 1 },
        { candidateId: 'A', actionId: 'x', expectedReward: 2 }
      ]
    })).toMatchObject({ ok: false, failure: { code: 'duplicate_matrix_entry' } });
  });

  it('fails explicitly for unknown IDs, non-finite rewards, invalid tolerance, and matrix resource limits', () => {
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }],
      actions: [{ actionId: 'x' }],
      values: [{ candidateId: 'unknown', actionId: 'x', expectedReward: 1 }]
    })).toMatchObject({ ok: false, failure: { code: 'unknown_candidate_id' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }],
      actions: [{ actionId: 'x' }],
      values: [{ candidateId: 'A', actionId: 'unknown', expectedReward: 1 }]
    })).toMatchObject({ ok: false, failure: { code: 'unknown_action_id' } });
    expect(selectFiniteAmbiguityPreservingRobustActions({
      candidates: [{ candidateId: 'A' }],
      actions: [{ actionId: 'x' }],
      values: [{ candidateId: 'A', actionId: 'x', expectedReward: Number.POSITIVE_INFINITY }]
    })).toMatchObject({ ok: false, failure: { code: 'non_finite_expected_reward' } });
    expect(selectFiniteAmbiguityPreservingRobustActions(baseline, { actionValueTolerance: 0 }))
      .toMatchObject({ ok: false, failure: { code: 'invalid_options' } });
    expect(selectFiniteAmbiguityPreservingRobustActions(baseline, { maxMatrixEntries: 2 }))
      .toMatchObject({ ok: false, failure: { code: 'matrix_entry_count_exceeds_limit' } });
  });

  it('reports diagnostics that preserve ambiguity and reject Bayesian or dynamic-policy reinterpretation', () => {
    const result = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    expect(result.diagnostics).toMatchObject({
      method: 'finite_candidate_ambiguity_maximin_expected_reward',
      objective: 'maximum_worst_case_expected_reward',
      candidatePriorUsed: false,
      candidatePosteriorUsed: false,
      candidateLikelihoodWeightingUsed: false,
      equalCandidateProbabilityAssumed: false,
      minimaxRegretUsed: false,
      cvarUsed: false,
      mixedActionUsed: false,
      stateTransitionOptimizationUsed: false,
      learningWhileActingUsed: false,
      ambiguityPreserved: true
    });
  });

  it('uses checked deterministic JSON serialization and rejects forged non-finite output', () => {
    const result = selectFiniteAmbiguityPreservingRobustActions(baseline);
    const json = finiteAmbiguityPreservingRobustDecisionResultToJson(result);
    expect(JSON.parse(json)).toEqual(result);
    const forged = requireSuccess(selectFiniteAmbiguityPreservingRobustActions(baseline));
    forged.bestRobustExpectedReward = Number.NaN;
    expect(() => finiteAmbiguityPreservingRobustDecisionResultToJson(forged)).toThrow(/non-finite/);
  });
});
